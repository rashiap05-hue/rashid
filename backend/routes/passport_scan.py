from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from dotenv import load_dotenv
import base64
import json
import os
import uuid

load_dotenv()

from db import get_current_user

router = APIRouter()

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

SCAN_PROMPT = """Analyze this passport/ID document image and extract the following fields. Return ONLY a valid JSON object with these exact keys. If a field is not readable, use an empty string.

{
  "title": "Mr/Mrs/Ms/Miss/Master (infer from gender marker or name if visible)",
  "firstName": "First/Given name",
  "lastName": "Surname/Family name",
  "dobDay": "Day of birth as number (e.g. 9)",
  "dobMonth": "Month of birth as number (e.g. 12 for December)",
  "dobYear": "Year of birth (e.g. 1983)",
  "passportNumber": "Passport/document number",
  "issueDay": "Day of issue as number",
  "issueMonth": "Month of issue as number",
  "issueYear": "Year of issue",
  "expiryDay": "Day of expiry as number",
  "expiryMonth": "Month of expiry as number",
  "expiryYear": "Year of expiry",
  "nationality": "Full country name (e.g. India, United Arab Emirates)"
}

IMPORTANT: Return ONLY the JSON object, no markdown, no explanation, no code fences."""


@router.post("/scan-passport")
async def scan_passport(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    mime = file.content_type or "image/jpeg"
    if mime not in ("image/jpeg", "image/png", "image/webp", "application/pdf"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use JPG, PNG, WEBP, or PDF.")

    b64 = base64.b64encode(content).decode("utf-8")

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"passport-scan-{uuid.uuid4()}",
            system_message="You are an expert document OCR system that extracts data from passport and ID images. Return only valid JSON."
        ).with_model("gemini", "gemini-2.5-flash")

        image_content = ImageContent(image_base64=b64)

        user_message = UserMessage(
            text=SCAN_PROMPT,
            file_contents=[image_content]
        )

        response = await chat.send_message(user_message)

        # Parse JSON from response
        text = response.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        if text.startswith("json"):
            text = text[4:].strip()

        parsed = json.loads(text)
        return {"success": True, "data": parsed}

    except json.JSONDecodeError:
        return {"success": False, "error": "Could not parse passport data. Please try a clearer image.", "raw": text[:200] if 'text' in dir() else ""}
    except Exception as e:
        return {"success": False, "error": str(e)}
