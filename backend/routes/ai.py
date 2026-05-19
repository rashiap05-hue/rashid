from fastapi import APIRouter, HTTPException
from db import db, EMERGENT_LLM_KEY, logger
from models.schemas import ChatMessage, TripRecommendationRequest, ItineraryRequest
from emergentintegrations.llm.chat import LlmChat, UserMessage
from datetime import datetime, timezone
import uuid
import json
import re

ai_router = APIRouter(prefix="/ai", tags=["AI Features"])


@ai_router.post("/chat")
async def ai_chat(message: ChatMessage):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")

    session_id = message.session_id or str(uuid.uuid4())

    # Conversation history is persisted via the `await db.chat_history.insert_one(...)`
    # call below and the `LlmChat` API replays it via `session_id` — so we
    # don't need to pre-fetch and pass it explicitly here.

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message="""You are Travo AI, an intelligent travel assistant for Travo DMC B2B Travel Platform. 
You help travel agents with:
- Travel recommendations and destination information
- Package suggestions based on preferences
- Answering questions about hotels, flights, and activities
- Providing local insights and travel tips
Be professional, helpful, and knowledgeable about global destinations."""
    ).with_model("gemini", "gemini-3-flash-preview")

    user_msg = UserMessage(text=message.message)
    response = await chat.send_message(user_msg)

    await db.chat_history.insert_one({
        "session_id": session_id,
        "role": "user",
        "content": message.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.chat_history.insert_one({
        "session_id": session_id,
        "role": "assistant",
        "content": response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"success": True, "response": response, "session_id": session_id}


@ai_router.post("/recommendations")
async def get_recommendations(request: TripRecommendationRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message="""You are a travel recommendation expert. Provide detailed, personalized travel recommendations.
Format your response as JSON with this structure:
{
  "destinations": [
    {
      "name": "City, Country",
      "description": "Brief description",
      "highlights": ["highlight1", "highlight2"],
      "best_time": "Best time to visit",
      "estimated_budget": "Budget range"
    }
  ],
  "tips": ["tip1", "tip2"]
}"""
    ).with_model("gemini", "gemini-3-flash-preview")

    prompt = f"""Based on these preferences, suggest travel destinations:
Preferences: {request.preferences}
Budget: {request.budget or 'Flexible'}
Duration: {request.duration or 'Any'}
Travelers: {request.travelers or 2}

Provide 3-5 destination recommendations."""

    user_msg = UserMessage(text=prompt)
    response = await chat.send_message(user_msg)

    return {"success": True, "recommendations": response}


@ai_router.post("/itinerary")
async def generate_itinerary(request: ItineraryRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")

    city_names = [c.name for c in request.cities]
    activities = await db.activities.find({"city": {"$in": city_names}}, {"_id": 0, "id": 1, "name": 1, "city": 1, "duration": 1, "description": 1}).to_list(200)
    # NOTE: transfers context is intentionally not included in the prompt
    # right now — the model picks transfers per-day from the catalog after
    # the itinerary is finalised. Re-enable here when we surface transfer
    # suggestions inside the AI itinerary response itself.

    activities_context = ""
    for city_name in city_names:
        city_acts = [a for a in activities if a.get("city") == city_name]
        if city_acts:
            activities_context += f"\nAvailable activities in {city_name}:\n"
            for a in city_acts:
                activities_context += f"  - {a['name']} (ID: {a['id']}, Duration: {a.get('duration', 'Half Day')}): {a.get('description', '')[:100]}\n"

    cities_info = "\n".join([f"- {c.name}: {c.nights} nights" for c in request.cities])

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message="""You are a professional travel itinerary planner for a DMC (Destination Management Company).
You MUST respond with ONLY valid JSON, no markdown, no code blocks, no extra text.
The JSON must follow this exact structure:
{
  "days": [
    {
      "day": 1,
      "city": "City Name",
      "title": "Arrival & City Exploration",
      "activities": [
        {
          "activity_id": "use_actual_id_if_available_or_null",
          "name": "Activity Name",
          "time": "09:00 AM",
          "duration": "3 hours",
          "description": "Brief description of what to do"
        }
      ],
      "meals": [
        {"type": "Breakfast", "suggestion": "Hotel breakfast or local cafe"},
        {"type": "Lunch", "suggestion": "Local restaurant recommendation"},
        {"type": "Dinner", "suggestion": "Restaurant or area recommendation"}
      ],
      "transfers": [
        {"type": "arrival", "description": "Airport to Hotel transfer"}
      ],
      "tips": "Any day-specific travel tips"
    }
  ],
  "general_tips": ["tip1", "tip2"]
}"""
    ).with_model("gemini", "gemini-3-flash-preview")

    prompt = f"""Create a detailed day-by-day travel itinerary for:

Cities & Duration:
{cities_info}

Number of travelers: {request.travelers}
Interests: {request.interests or 'General sightseeing, culture, food, local experiences'}

{activities_context}

IMPORTANT RULES:
1. Match activity_id from available activities when possible, set null for suggested activities not in the list
2. Day 1 should include arrival activities
3. The last day should include departure/checkout activities
4. Include 2-4 activities per full day
5. Include meals for each day (breakfast, lunch, dinner)
6. Include transfer suggestions for arrival and departure days
7. Be specific with time slots
8. Total days = total nights + 1 (include departure day)

Respond with ONLY the JSON object, no markdown formatting."""

    user_msg = UserMessage(text=prompt)
    response = await chat.send_message(user_msg)

    try:
        cleaned = response.strip()
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
        parsed = json.loads(cleaned)
        return {"success": True, "itinerary": parsed, "raw": None}
    except (json.JSONDecodeError, Exception):
        return {"success": True, "itinerary": None, "raw": response}


@ai_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    history = await db.chat_history.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return {"success": True, "history": history}
