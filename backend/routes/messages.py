from fastapi import APIRouter, Body
from datetime import datetime, timezone
from db import db
import uuid

messages_router = APIRouter(prefix="/messages", tags=["Messages"])


@messages_router.post("/{proposal_id}")
async def send_message(proposal_id: str, data: dict = Body(...)):
    message = {
        "id": str(uuid.uuid4()),
        "proposal_id": proposal_id,
        "sender": data.get("sender", "customer"),
        "sender_name": data.get("sender_name", ""),
        "text": data.get("text", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message)
    message.pop("_id", None)
    return {"success": True, "message": message}


@messages_router.get("/{proposal_id}")
async def get_messages(proposal_id: str):
    messages = await db.messages.find(
        {"proposal_id": proposal_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return {"success": True, "messages": messages}
