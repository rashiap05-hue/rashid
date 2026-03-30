from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from dotenv import load_dotenv
import base64
import json
import re
import os
import uuid
import logging

load_dotenv()

from db import get_current_user

router = APIRouter()
logger = logging.getLogger("passport_scan")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

SCAN_PROMPT = """Analyze this passport/ID document image and extract the following fields. Return ONLY a valid JSON object with these exact keys. If a field is not readable, use an empty string.

{
  "title": "Mr or Mrs or Ms or Miss or Master based on gender/name",
  "firstName": "First/Given name",
  "lastName": "Surname/Family name",
  "dobDay": "Day of birth as number",
  "dobMonth": "Month of birth as number 1-12",
  "dobYear": "4 digit year of birth",
  "passportNumber": "Passport or document number",
  "issueDay": "Day of issue as number",
  "issueMonth": "Month of issue as number 1-12",
  "issueYear": "4 digit year of issue",
  "expiryDay": "Day of expiry as number",
  "expiryMonth": "Month of expiry as number 1-12",
  "expiryYear": "4 digit year of expiry",
  "nationality": "Full country name"
}

Return ONLY the JSON object. No markdown, no explanation, no code fences, no extra text."""


def extract_json_from_text(text):
    """Try multiple approaches to extract JSON from AI response."""
    if not text:
        return None

    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown code fences
    cleaned = re.sub(r'^```(?:json)?\s*\n?', '', text)
    cleaned = re.sub(r'\n?```\s*$', '', cleaned)
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Find JSON object in text using regex
    match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Last resort: find anything between first { and last }
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace:last_brace + 1])
        except json.JSONDecodeError:
            pass

    return None


@router.post("/scan-passport")
async def scan_passport(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    mime = file.content_type or "image/jpeg"
    # Accept common image types
    allowed = ("image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf", "application/octet-stream")
    if not any(mime.startswith(a.split('/')[0]) for a in allowed) and mime not in allowed:
        logger.warning(f"Rejected mime type: {mime}")
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime}")

    b64 = base64.b64encode(content).decode("utf-8")
    logger.info(f"Scanning passport: {file.filename}, size={len(content)}, mime={mime}")

    raw_response = ""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"passport-scan-{uuid.uuid4()}",
            system_message="You are an expert document OCR system. Extract data from passport and ID images. Always return valid JSON only."
        ).with_model("gemini", "gemini-2.5-flash")

        image_content = ImageContent(image_base64=b64)

        user_message = UserMessage(
            text=SCAN_PROMPT,
            file_contents=[image_content]
        )

        response = await chat.send_message(user_message)

        # Handle both string and object responses
        if hasattr(response, 'text'):
            raw_response = response.text
        elif hasattr(response, 'content'):
            raw_response = response.content
        elif isinstance(response, str):
            raw_response = response
        else:
            raw_response = str(response)

        logger.info(f"AI raw response (first 300 chars): {raw_response[:300]}")

        parsed = extract_json_from_text(raw_response)

        if parsed and isinstance(parsed, dict):
            # Ensure all expected keys exist and normalize values
            expected_keys = ["title", "firstName", "lastName", "dobDay", "dobMonth", "dobYear",
                           "passportNumber", "issueDay", "issueMonth", "issueYear",
                           "expiryDay", "expiryMonth", "expiryYear", "nationality"]
            # Fields that should be plain numbers (strip leading zeros)
            numeric_fields = ["dobDay", "dobMonth", "dobYear", "issueDay", "issueMonth", 
                            "issueYear", "expiryDay", "expiryMonth", "expiryYear"]
            for key in expected_keys:
                if key not in parsed:
                    parsed[key] = ""
                elif parsed[key] is None:
                    parsed[key] = ""
                else:
                    val = str(parsed[key]).strip()
                    if key in numeric_fields and val:
                        try:
                            val = str(int(val))
                        except ValueError:
                            pass
                    parsed[key] = val

            logger.info(f"Scan success: {parsed.get('firstName', '')} {parsed.get('lastName', '')}")
            return {"success": True, "data": parsed}
        else:
            logger.warning(f"Could not parse JSON from response: {raw_response[:500]}")
            return {"success": False, "error": "Could not parse passport data from image. Please try a clearer photo.", "raw": raw_response[:300]}

    except Exception as e:
        logger.error(f"Passport scan error: {str(e)}, raw_response: {raw_response[:200]}")
        return {"success": False, "error": f"Scan failed: {str(e)}"}
