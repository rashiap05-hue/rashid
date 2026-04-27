"""Trip Change Requests — agent submits a change request against a booking.
Stored in `db.trip_change_requests` and surfaced to the advisor / supplier portal.
Status values: open | under_process | closed | rejected
"""
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List

from db import db, get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

CHANGE_REQUEST_FEE_AED = 100.0
ALLOWED_STATUSES = {"open", "under_process", "closed", "rejected"}


class ChangeRequestCreate(BaseModel):
    for_scope: str = Field(default="Complete Trip", alias="for")
    type: str
    description: str

    model_config = {"populate_by_name": True}


def _user_label(user: dict) -> str:
    return user.get("full_name") or user.get("name") or user.get("email") or "User"


def _normalise_status(s: Optional[str]) -> str:
    if not s:
        return "open"
    s = str(s).lower()
    if s == "pending":
        return "open"
    if s in ("in_progress", "in-progress", "inprogress"):
        return "under_process"
    if s in ("resolved",):
        return "closed"
    return s if s in ALLOWED_STATUSES else "open"


def _serialise(record: dict) -> dict:
    record.pop("_id", None)
    record["status"] = _normalise_status(record.get("status"))
    record.setdefault("replies", [])
    return record


@router.post("/bookings/{booking_id}/change-requests")
async def create_change_request(
    booking_id: str,
    payload: ChangeRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    booking = (
        await db.held_bookings.find_one({"id": booking_id}, {"_id": 0})
        or await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if not payload.type or not payload.type.strip():
        raise HTTPException(status_code=400, detail="Type is required")
    if not payload.description or not payload.description.strip():
        raise HTTPException(status_code=400, detail="Description is required")

    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "proposal_id": booking.get("proposal_id"),
        "for_scope": payload.for_scope,
        "type": payload.type.strip(),
        "description": payload.description.strip(),
        "service_fee": CHANGE_REQUEST_FEE_AED,
        "status": "open",
        "requested_by": current_user.get("id"),
        "requested_by_email": current_user.get("email"),
        "requested_by_name": _user_label(current_user),
        "requested_by_role": current_user.get("role", "agent"),
        "created_at": now,
        "updated_at": now,
        "resolved_at": None,
        "replies": [],
    }
    await db.trip_change_requests.insert_one(record)

    # Notify advisor / admin via in-app notification (best-effort)
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_role": "admin",
            "title": "New Trip Change Request",
            "body": f"{record['type']} — {record['for_scope']} (Booking {booking_id[:8]})",
            "link": f"/admin/bookings/{booking_id}",
            "read": False,
            "created_at": now,
        })
    except Exception as e:  # pragma: no cover
        logger.warning(f"Failed to write notification for change request: {e}")

    return {"success": True, "change_request": _serialise(record)}


@router.get("/bookings/{booking_id}/change-requests")
async def list_change_requests(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    items = (
        await db.trip_change_requests.find(
            {"booking_id": booking_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    )
    items = [_serialise(it) for it in items]
    return {"success": True, "change_requests": items}


@router.get("/change-requests/{request_id}")
async def get_change_request(request_id: str, current_user: dict = Depends(get_current_user)):
    record = await db.trip_change_requests.find_one({"id": request_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Change request not found")
    return {"success": True, "change_request": _serialise(record)}


class ChangeRequestStatusUpdate(BaseModel):
    status: Optional[str] = None  # open | under_process | closed | rejected
    advisor_note: Optional[str] = None


@router.patch("/change-requests/{request_id}")
async def update_change_request(
    request_id: str,
    payload: ChangeRequestStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    record = await db.trip_change_requests.find_one({"id": request_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Change request not found")

    update: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.status is not None:
        new_status = _normalise_status(payload.status)
        if new_status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}")
        update["status"] = new_status
        if new_status in ("closed", "rejected"):
            update["resolved_at"] = update["updated_at"]
    if payload.advisor_note is not None:
        update["advisor_note"] = payload.advisor_note

    await db.trip_change_requests.update_one({"id": request_id}, {"$set": update})
    refreshed = await db.trip_change_requests.find_one({"id": request_id}, {"_id": 0})
    return {"success": True, "change_request": _serialise(refreshed)}


class ReplyCreate(BaseModel):
    text: str


@router.post("/change-requests/{request_id}/replies")
async def add_reply(
    request_id: str,
    payload: ReplyCreate,
    current_user: dict = Depends(get_current_user),
):
    record = await db.trip_change_requests.find_one({"id": request_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Change request not found")

    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Reply text is required")

    reply = {
        "id": str(uuid.uuid4()),
        "text": text,
        "sender_id": current_user.get("id"),
        "sender_email": current_user.get("email"),
        "sender_name": _user_label(current_user),
        "sender_role": current_user.get("role", "agent"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.trip_change_requests.update_one(
        {"id": request_id},
        {"$push": {"replies": reply}, "$set": {"updated_at": reply["created_at"]}},
    )
    refreshed = await db.trip_change_requests.find_one({"id": request_id}, {"_id": 0})
    return {"success": True, "change_request": _serialise(refreshed), "reply": reply}
