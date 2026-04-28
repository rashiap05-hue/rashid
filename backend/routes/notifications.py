from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid

from db import db, get_current_user

router = APIRouter()


@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    notifications = await db.notifications.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications


@router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {"count": count}


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.get("id")},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.put("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user.get("id"), "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}


async def create_notification(user_id: str, title: str, message: str, booking_id: str = None, notif_type: str = "status_change", change_request_id: str = None):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "booking_id": booking_id,
        "change_request_id": change_request_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)
    return doc
