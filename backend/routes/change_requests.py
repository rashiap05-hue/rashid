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
from routes.notifications import create_notification

router = APIRouter()
logger = logging.getLogger(__name__)

CHANGE_REQUEST_FEE_AED = 100.0
ALLOWED_STATUSES = {"open", "under_process", "closed", "rejected"}


async def _short_ref(booking_id: str) -> str:
    """Return the TBM-branded booking ref. Falls back gracefully for legacy bookings."""
    if not booking_id:
        return ""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0, "booking_ref": 1, "booking_number": 1}) \
        or await db.held_bookings.find_one({"id": booking_id}, {"_id": 0, "booking_ref": 1, "booking_number": 1})
    if booking:
        if booking.get("booking_ref"):
            return booking["booking_ref"]
        if booking.get("booking_number") is not None:
            return f"TBM-{str(booking['booking_number']).zfill(6)}"
    # Legacy fallback
    digits = "".join(ch for ch in str(booking_id) if ch.isdigit())[:6] or "000000"
    return f"TBM-{digits.zfill(6)}"


async def _expert_user_ids(proposal_id: Optional[str]) -> List[str]:
    """Return user_ids that should receive advisor notifications for this proposal:
    every admin user + the user matching the assigned destination expert's email (if any).
    """
    user_ids: List[str] = []
    # All admin users
    async for u in db.users.find({"role": "admin"}, {"_id": 0, "id": 1}):
        if u.get("id"):
            user_ids.append(u["id"])
    # Assigned destination expert (if linked to a real user account by email)
    if proposal_id:
        proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0, "assigned_expert_id": 1})
        if proposal and proposal.get("assigned_expert_id"):
            expert = await db.destination_experts.find_one(
                {"id": proposal["assigned_expert_id"]}, {"_id": 0, "email": 1}
            )
            if expert and expert.get("email"):
                expert_user = await db.users.find_one(
                    {"email": expert["email"]}, {"_id": 0, "id": 1}
                )
                if expert_user and expert_user.get("id") and expert_user["id"] not in user_ids:
                    user_ids.append(expert_user["id"])
    return user_ids


async def _notify(user_ids: List[str], title: str, message: str, booking_id: Optional[str], notif_type: str, change_request_id: Optional[str] = None):
    for uid in user_ids:
        if not uid:
            continue
        try:
            await create_notification(
                user_id=uid,
                title=title,
                message=message,
                booking_id=booking_id,
                notif_type=notif_type,
                change_request_id=change_request_id,
            )
        except Exception as e:  # pragma: no cover
            logger.warning(f"Failed to write notification for {uid}: {e}")


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

    # Notify advisors (admins + assigned expert user)
    advisor_ids = await _expert_user_ids(booking.get("proposal_id"))
    # Don't notify the requester themselves
    advisor_ids = [uid for uid in advisor_ids if uid != current_user.get("id")]
    ref = await _short_ref(booking_id)
    await _notify(
        advisor_ids,
        title="New Trip Change Request",
        message=f"{record['type']} — {record['for_scope']} (Booking {ref}) by {record['requested_by_name']}",
        booking_id=booking_id,
        notif_type="change_request_new",
        change_request_id=record["id"],
    )

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
    new_status = None
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

    # Notify the OTHER party of the status change
    if new_status and new_status != _normalise_status(record.get("status")):
        ref = await _short_ref(record.get("booking_id", ""))
        actor_role = current_user.get("role", "agent")
        if actor_role in ("admin", "supplier"):
            # Advisor changed status → notify the original agent
            target_ids = [record.get("requested_by")] if record.get("requested_by") and record.get("requested_by") != current_user.get("id") else []
        else:
            # Agent changed status → notify advisors
            advisor_ids = await _expert_user_ids(record.get("proposal_id"))
            target_ids = [uid for uid in advisor_ids if uid != current_user.get("id")]
        status_label = {"open": "Open", "under_process": "Under Process", "closed": "Closed", "rejected": "Rejected"}.get(new_status, new_status)
        await _notify(
            target_ids,
            title=f"Trip Change Request {status_label}",
            message=f"{record.get('type')} — {record.get('for_scope')} (Booking {ref})",
            booking_id=record.get("booking_id"),
            notif_type="change_request_status",
            change_request_id=request_id,
        )

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

    # Notify the OTHER party of the new reply
    ref = await _short_ref(record.get("booking_id", ""))
    actor_role = current_user.get("role", "agent")
    if actor_role in ("admin", "supplier"):
        target_ids = [record.get("requested_by")] if record.get("requested_by") and record.get("requested_by") != current_user.get("id") else []
    else:
        advisor_ids = await _expert_user_ids(record.get("proposal_id"))
        target_ids = [uid for uid in advisor_ids if uid != current_user.get("id")]
    snippet = text[:80] + ("…" if len(text) > 80 else "")
    await _notify(
        target_ids,
        title=f"New reply from {reply['sender_name']}",
        message=f"{record.get('type')} (Booking {ref}): {snippet}",
        booking_id=record.get("booking_id"),
        notif_type="change_request_reply",
        change_request_id=request_id,
    )

    return {"success": True, "change_request": _serialise(refreshed), "reply": reply}
