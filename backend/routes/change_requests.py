"""Trip Change Requests — agent submits a change request against a booking.
Stored in `db.trip_change_requests` and surfaced to the advisor / supplier portal.
"""
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional

from db import db, get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

CHANGE_REQUEST_FEE_AED = 100.0


class ChangeRequestCreate(BaseModel):
    for_scope: str = Field(default="Complete Trip", alias="for")
    type: str
    description: str

    model_config = {"populate_by_name": True}


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

    record = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "proposal_id": booking.get("proposal_id"),
        "for_scope": payload.for_scope,
        "type": payload.type.strip(),
        "description": payload.description.strip(),
        "service_fee": CHANGE_REQUEST_FEE_AED,
        "status": "pending",
        "requested_by": current_user.get("id"),
        "requested_by_email": current_user.get("email"),
        "requested_by_name": current_user.get("full_name") or current_user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "advisor_note": None,
    }
    await db.trip_change_requests.insert_one(record)
    record.pop("_id", None)

    # Notify advisor / admin via in-app notification (best-effort)
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_role": "admin",
            "title": "New Trip Change Request",
            "body": f"{record['type']} — {record['for_scope']} (Booking {booking_id[:8]})",
            "link": f"/admin/bookings/{booking_id}",
            "read": False,
            "created_at": record["created_at"],
        })
    except Exception as e:  # pragma: no cover
        logger.warning(f"Failed to write notification for change request: {e}")

    return {"success": True, "change_request": record}


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
    return {"success": True, "change_requests": items}


class ChangeRequestStatusUpdate(BaseModel):
    status: str  # pending | in_progress | resolved | rejected
    advisor_note: Optional[str] = None


@router.patch("/change-requests/{request_id}")
async def update_change_request(
    request_id: str,
    payload: ChangeRequestStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("admin", "supplier"):
        raise HTTPException(status_code=403, detail="Only admins/suppliers can update change requests")

    update = {"status": payload.status}
    if payload.advisor_note is not None:
        update["advisor_note"] = payload.advisor_note
    if payload.status in ("resolved", "rejected"):
        update["resolved_at"] = datetime.now(timezone.utc).isoformat()

    res = await db.trip_change_requests.update_one({"id": request_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Change request not found")
    return {"success": True}
