from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from db import db, get_current_user
from booking_number import next_booking_number, format_booking_ref

router = APIRouter()

BOOKING_STAGES = ["held", "payment_pending", "payment_received", "confirmed", "ticketed"]
STAGE_LABELS = {
    "held": "Hold",
    "payment_pending": "Payment Pending",
    "payment_received": "Payment Received",
    "confirmed": "Confirmed",
    "ticketed": "Ticketed",
    "completed": "Completed",
    "cancelled": "Cancelled",
}


def _trip_end_date(booking: dict):
    """Best-effort trip end date: leaving_on + total_nights (fallback: leaving_on itself).
    Returns a `date` or None."""
    leaving = booking.get("leaving_on") or ""
    if not leaving:
        return None
    try:
        d = datetime.fromisoformat(leaving.split("T")[0].replace("Z", "")).date()
    except Exception:
        return None
    nights = booking.get("total_nights") or booking.get("nights") or 0
    try:
        nights = int(nights or 0)
    except Exception:
        nights = 0
    if nights > 0:
        from datetime import timedelta
        d = d + timedelta(days=nights)
    return d


def _derive_completed(booking: dict) -> dict:
    """If the booking has been ticketed AND the trip end date has passed, flip
    status to `completed` in the returned dict (non-destructive). Terminal
    states like `cancelled` / `completed` are left untouched."""
    if not booking:
        return booking
    status = booking.get("status")
    if status in ("completed", "cancelled"):
        return booking
    if status != "ticketed":
        return booking
    end = _trip_end_date(booking)
    if end is None:
        return booking
    if end < datetime.now(timezone.utc).date():
        booking["status"] = "completed"
        if not booking.get("completed_at"):
            booking["completed_at"] = datetime.now(timezone.utc).isoformat()
    return booking


class TravelerInfo(BaseModel):
    title: str = ""
    first_name: str = Field(default="", alias="firstName")
    last_name: str = Field(default="", alias="lastName")
    dob_day: str = Field(default="", alias="dobDay")
    dob_month: str = Field(default="", alias="dobMonth")
    dob_year: str = Field(default="", alias="dobYear")
    bed_preference: str = Field(default="", alias="bedPreference")
    room_index: int = Field(default=0, alias="roomIndex")
    traveler_type: str = Field(default="adult", alias="type")

    class Config:
        populate_by_name = True


class ContactInfo(BaseModel):
    email: str = ""
    phone: str = ""
    city: str = ""
    client_profile: str = Field(default="", alias="clientProfile")
    agent_reference: str = Field(default="", alias="agentReference")

    class Config:
        populate_by_name = True


class BookingCreate(BaseModel):
    proposal_id: str
    travelers: List[Dict[str, Any]] = []
    contact_info: Dict[str, Any] = Field(default_factory=dict, alias="contactInfo")
    special_occasion: str = Field(default="none", alias="specialOccasion")
    payment_option: str = Field(default="full", alias="paymentOption")
    confirmation_time: Optional[str] = Field(default=None, alias="confirmationTime")
    attachments: List[str] = []
    payment_method: Optional[str] = None
    payment_amount: Optional[float] = None
    order_id: Optional[str] = None

    class Config:
        populate_by_name = True


@router.post("/bookings")
async def create_booking(booking: BookingCreate, current_user: dict = Depends(get_current_user)):
    # Verify proposal exists
    proposal = await db.proposals.find_one({"id": booking.proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    user_id = current_user.get("id") or current_user.get("email")
    now_iso = datetime.now(timezone.utc).isoformat()

    # If a held booking already exists for this proposal, reuse its id so MyBookings
    # row simply flips from "Hold" to "Under Process" / "Payment Received".
    existing_held = await db.held_bookings.find_one({"proposal_id": booking.proposal_id}, {"_id": 0})
    booking_id = existing_held["id"] if existing_held else str(uuid.uuid4())

    # Reuse the existing booking_number if the held booking already had one,
    # otherwise allocate a new sequential one.
    booking_number = (existing_held or {}).get("booking_number")
    if not booking_number:
        existing_booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0, "booking_number": 1})
        booking_number = (existing_booking or {}).get("booking_number") or await next_booking_number()

    payment_fields = {
        "payment_method": booking.payment_method,
        "payment_amount": booking.payment_amount,
        "order_id": booking.order_id,
        "payment_option": booking.payment_option,
        "confirmation_time": booking.confirmation_time,
        "travelers": booking.travelers,
        "contact_info": booking.contact_info,
        "special_occasion": booking.special_occasion,
    }

    # Status is "payment_received" until supplier confirms
    new_status = "payment_received"

    booking_doc = {
        "id": booking_id,
        "booking_number": booking_number,
        "booking_ref": format_booking_ref(booking_number),
        "proposal_id": booking.proposal_id,
        "user_id": user_id,
        "created_by": user_id,
        "booked_by_name": current_user.get("name") or current_user.get("full_name", ""),
        "proposal_name": proposal.get("proposal_name", ""),
        "customer_name": proposal.get("customer_name", ""),
        "customer_email": proposal.get("customer_email", ""),
        "cities": proposal.get("cities", []),
        "leaving_on": proposal.get("leaving_on", ""),
        "nights": proposal.get("nights", 0),
        "rooms": proposal.get("rooms", 1),
        "adults": proposal.get("adults", 1),
        "total_price": proposal.get("total_price", 0),
        "type": "Package",
        "status": new_status,
        "supplier_status": (existing_held or {}).get("supplier_status", "pending"),
        "held_at": (existing_held or {}).get("held_at") or now_iso,
        "created_at": (existing_held or {}).get("created_at") or now_iso,
        "paid_at": now_iso,
        **payment_fields,
    }

    # Upsert into both collections so MyBookings, Supplier & Admin views all reflect the paid booking
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": booking_doc},
        upsert=True,
    )
    await db.held_bookings.update_one(
        {"id": booking_id},
        {"$set": booking_doc},
        upsert=True,
    )

    # Update proposal status + stamp booking refs so ProposalView can render the locked sidebar
    await db.proposals.update_one(
        {"id": booking.proposal_id},
        {"$set": {
            "status": "booked",
            "booking_id": booking_id,
            "booking_number": booking_number,
            "booking_ref": format_booking_ref(booking_number),
        }}
    )

    return {
        "id": booking_id,
        "booking_number": booking_number,
        "booking_ref": format_booking_ref(booking_number),
        "status": new_status,
        "confirmation_time": booking.confirmation_time,
        "message": "Booking confirmed successfully"
    }


@router.get("/bookings")
async def list_bookings(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("email")
    # Admins see ALL bookings so they can manage / delete from MyBookings
    query = {} if current_user.get("role") == "admin" else {"user_id": user_id}
    bookings = await db.bookings.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return [_derive_completed(b) for b in bookings]


@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _derive_completed(booking)


@router.get("/held-bookings")
async def get_held_bookings(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("user_id")
    # Admins see ALL bookings so they can manage / delete from MyBookings
    query = {} if current_user.get("role") == "admin" else {"created_by": user_id}
    bookings = await db.held_bookings.find(
        query,
        {"_id": 0}
    ).sort("held_at", -1).to_list(200)
    return [_derive_completed(b) for b in bookings]


@router.get("/held-bookings/{booking_id}")
async def get_held_booking_detail(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.held_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Enrich with full proposal data
    proposal = None
    if booking.get("proposal_id"):
        proposal = await db.proposals.find_one({"id": booking["proposal_id"]}, {"_id": 0})

    # Get terms
    terms = await db.terms_policies.find({}, {"_id": 0}).to_list(20)

    # Get assigned expert
    expert = None
    if proposal and proposal.get("assigned_expert_id"):
        expert = await db.destination_experts.find_one({"id": proposal["assigned_expert_id"]}, {"_id": 0})

    # Get user info
    user = await db.users.find_one(
        {"id": booking.get("created_by")},
        {"_id": 0, "password": 0}
    )

    return {
        "booking": booking,
        "proposal": proposal,
        "terms": terms,
        "expert": expert,
        "user": user,
    }


@router.put("/bookings/{booking_id}/travelers")
async def update_booking_travelers(booking_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    booking = await db.held_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # After payment is received, only admins can edit traveler details to prevent
    # accidental changes to confirmed bookings.
    paid_statuses = ("payment_received", "paid", "confirmed", "completed")
    if booking.get("status") in paid_statuses and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Traveler details are locked after payment. Please contact an administrator to edit."
        )

    travelers = body.get("travelers", [])
    await db.held_bookings.update_one(
        {"id": booking_id},
        {"$set": {"travelers": travelers, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Travelers updated successfully"}



class StatusUpdateRequest(BaseModel):
    note: str = ""


@router.put("/bookings/{booking_id}/status/advance")
async def advance_booking_status(booking_id: str, body: StatusUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Only admin/staff can update booking status")

    booking = await db.held_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    current_status = booking.get("status", "held")
    if current_status not in BOOKING_STAGES:
        current_status = "held"

    current_idx = BOOKING_STAGES.index(current_status)
    if current_idx >= len(BOOKING_STAGES) - 1:
        raise HTTPException(status_code=400, detail="Booking is already at final stage (Ticketed)")

    next_status = BOOKING_STAGES[current_idx + 1]
    now = datetime.now(timezone.utc).isoformat()

    history_entry = {
        "from_status": current_status,
        "to_status": next_status,
        "changed_by": current_user.get("email", "system"),
        "changed_by_name": current_user.get("full_name", "System"),
        "note": body.note,
        "timestamp": now,
    }

    await db.held_bookings.update_one(
        {"id": booking_id},
        {
            "$set": {"status": next_status, "updated_at": now},
            "$push": {"status_history": history_entry},
        }
    )

    # Create notification for the booking owner
    from routes.notifications import create_notification
    owner_id = booking.get("created_by")
    if owner_id:
        await create_notification(
            user_id=owner_id,
            title=f"Booking {STAGE_LABELS.get(next_status, next_status)}",
            message=f"Your booking has been updated to '{STAGE_LABELS.get(next_status, next_status)}'. {body.note}".strip(),
            booking_id=booking_id,
            notif_type="status_change",
        )

    # Send email notification
    try:
        from routes.email_service import send_booking_status_email
        await send_booking_status_email(booking_id, next_status, body.note)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Email send failed: {e}")

    return {
        "message": f"Status advanced to {next_status}",
        "new_status": next_status,
        "status_history": (booking.get("status_history") or []) + [history_entry],
    }


@router.get("/bookings/admin/all")
async def admin_list_all_bookings(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Admin/Staff only")

    bookings = await db.held_bookings.find(
        {},
        {"_id": 0}
    ).sort("held_at", -1).to_list(200)
    return bookings


@router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Admin-only: remove a booking from both `held_bookings` and `bookings` collections."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete bookings")

    held = await db.held_bookings.find_one({"id": booking_id}, {"_id": 0})
    main = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not held and not main:
        raise HTTPException(status_code=404, detail="Booking not found")

    held_res = await db.held_bookings.delete_one({"id": booking_id})
    main_res = await db.bookings.delete_one({"id": booking_id})

    # Cascade: clean up dependent records
    await db.trip_change_requests.delete_many({"booking_id": booking_id})
    await db.notifications.delete_many({"booking_id": booking_id})

    return {
        "success": True,
        "deleted_from_held_bookings": held_res.deleted_count,
        "deleted_from_bookings": main_res.deleted_count,
    }



# ---------------------------------------------------------------------------
# Cancel-Request flow
# ---------------------------------------------------------------------------
# Two-step: agent submits a cancel request (requires a reason and travel date
# must still be in the future). Admin / operational team approves or rejects.
# On approval the booking flips to `cancelled`.


class CancelRequestBody(BaseModel):
    reason: str


class CancelReviewBody(BaseModel):
    note: str = ""


def _parse_iso_date(s: str):
    """Best-effort parse of ISO-ish date strings (YYYY-MM-DD or full ISO). Returns a date or None."""
    if not s:
        return None
    try:
        # Strip trailing Z / timezone parts and keep the first 10 chars for date-only parse
        return datetime.fromisoformat(s.split("T")[0].replace("Z", "")).date()
    except Exception:
        return None


async def _load_booking_any(booking_id: str):
    """Fetch a booking from either collection (held_bookings preferred for full record)."""
    held = await db.held_bookings.find_one({"id": booking_id}, {"_id": 0})
    main = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return held or main, held, main


async def _apply_update_to_both(booking_id: str, update_set: dict):
    """Mirror the same $set into both held_bookings + bookings collections."""
    if not update_set:
        return
    await db.held_bookings.update_one({"id": booking_id}, {"$set": update_set})
    await db.bookings.update_one({"id": booking_id}, {"$set": update_set})


def _can_review_cancellations(user: dict) -> bool:
    return user.get("role") in ("admin", "staff", "supplier")


@router.post("/bookings/{booking_id}/cancel-request")
async def submit_cancel_request(
    booking_id: str,
    body: CancelRequestBody,
    current_user: dict = Depends(get_current_user),
):
    reason = (body.reason or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="A reason is required when requesting cancellation.")

    booking, _held, _main = await _load_booking_any(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only the booking owner (or admin) can submit a cancel request
    owner_id = booking.get("created_by") or booking.get("user_id")
    requester_id = current_user.get("id") or current_user.get("email")
    is_admin = current_user.get("role") == "admin"
    if owner_id and requester_id and owner_id != requester_id and not is_admin:
        raise HTTPException(status_code=403, detail="Only the booking owner or an admin can request cancellation.")

    if booking.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled.")
    if booking.get("cancellation_status") == "requested":
        raise HTTPException(status_code=400, detail="A cancellation request is already pending for this booking.")

    # Travel date guard — only before departure
    travel_date = _parse_iso_date(booking.get("leaving_on", ""))
    if travel_date and travel_date <= datetime.now(timezone.utc).date():
        raise HTTPException(status_code=400, detail="Cancellation cannot be requested after the travel date.")

    now_iso = datetime.now(timezone.utc).isoformat()
    update_set = {
        "cancellation_status": "requested",
        "cancellation_reason": reason,
        "cancellation_requested_at": now_iso,
        "cancellation_requested_by": requester_id,
        "cancellation_requested_by_name": current_user.get("name") or current_user.get("full_name") or current_user.get("email", ""),
        "updated_at": now_iso,
    }
    await _apply_update_to_both(booking_id, update_set)

    # Notify all admins (and original requester gets a self-confirmation too)
    from routes.notifications import create_notification
    try:
        admin_users = await db.users.find({"role": {"$in": ["admin", "staff"]}}, {"_id": 0, "id": 1, "email": 1}).to_list(100)
        ref = booking.get("booking_ref") or f"TBM-{str(booking.get('booking_number', '')).zfill(6)}"
        requester_name = update_set["cancellation_requested_by_name"] or "An agent"
        for admin in admin_users:
            admin_uid = admin.get("id") or admin.get("email")
            if not admin_uid or admin_uid == requester_id:
                continue
            await create_notification(
                user_id=admin_uid,
                title=f"Cancellation Requested — {ref}",
                message=f"{requester_name} requested to cancel this booking. Reason: {reason}",
                booking_id=booking_id,
                notif_type="cancel_request_new",
            )
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Failed to notify admins about cancel request")

    return {
        "success": True,
        "booking_id": booking_id,
        "cancellation_status": "requested",
        "cancellation_reason": reason,
        "cancellation_requested_at": now_iso,
    }


@router.post("/bookings/{booking_id}/cancel-request/approve")
async def approve_cancel_request(
    booking_id: str,
    body: CancelReviewBody,
    current_user: dict = Depends(get_current_user),
):
    if not _can_review_cancellations(current_user):
        raise HTTPException(status_code=403, detail="Only admin / operational team can approve cancellations.")

    booking, _held, _main = await _load_booking_any(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("cancellation_status") != "requested":
        raise HTTPException(status_code=400, detail="No pending cancellation request on this booking.")

    now_iso = datetime.now(timezone.utc).isoformat()
    reviewer_id = current_user.get("id") or current_user.get("email")
    reviewer_name = current_user.get("name") or current_user.get("full_name") or current_user.get("email", "")

    update_set = {
        "status": "cancelled",
        "cancellation_status": "approved",
        "cancelled_at": now_iso,
        "cancellation_reviewed_at": now_iso,
        "cancellation_reviewed_by": reviewer_id,
        "cancellation_reviewed_by_name": reviewer_name,
        "cancellation_review_note": (body.note or "").strip(),
        "updated_at": now_iso,
    }
    await _apply_update_to_both(booking_id, update_set)

    # Also reflect cancellation on the linked proposal
    if booking.get("proposal_id"):
        await db.proposals.update_one(
            {"id": booking["proposal_id"]},
            {"$set": {"status": "cancelled"}},
        )

    # Notify the original requester
    from routes.notifications import create_notification
    requester_uid = booking.get("cancellation_requested_by") or booking.get("created_by") or booking.get("user_id")
    if requester_uid:
        ref = booking.get("booking_ref") or f"TBM-{str(booking.get('booking_number', '')).zfill(6)}"
        msg = f"Your cancellation request for {ref} has been approved. The booking is now cancelled."
        if update_set["cancellation_review_note"]:
            msg += f" Note: {update_set['cancellation_review_note']}"
        await create_notification(
            user_id=requester_uid,
            title=f"Cancellation Approved — {ref}",
            message=msg,
            booking_id=booking_id,
            notif_type="cancel_request_approved",
        )

    return {"success": True, "booking_id": booking_id, "status": "cancelled", "cancellation_status": "approved"}


@router.post("/bookings/{booking_id}/cancel-request/reject")
async def reject_cancel_request(
    booking_id: str,
    body: CancelReviewBody,
    current_user: dict = Depends(get_current_user),
):
    if not _can_review_cancellations(current_user):
        raise HTTPException(status_code=403, detail="Only admin / operational team can reject cancellations.")

    booking, _held, _main = await _load_booking_any(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("cancellation_status") != "requested":
        raise HTTPException(status_code=400, detail="No pending cancellation request on this booking.")

    now_iso = datetime.now(timezone.utc).isoformat()
    reviewer_id = current_user.get("id") or current_user.get("email")
    reviewer_name = current_user.get("name") or current_user.get("full_name") or current_user.get("email", "")

    update_set = {
        "cancellation_status": "rejected",
        "cancellation_reviewed_at": now_iso,
        "cancellation_reviewed_by": reviewer_id,
        "cancellation_reviewed_by_name": reviewer_name,
        "cancellation_review_note": (body.note or "").strip(),
        "updated_at": now_iso,
    }
    await _apply_update_to_both(booking_id, update_set)

    # Notify the original requester
    from routes.notifications import create_notification
    requester_uid = booking.get("cancellation_requested_by") or booking.get("created_by") or booking.get("user_id")
    if requester_uid:
        ref = booking.get("booking_ref") or f"TBM-{str(booking.get('booking_number', '')).zfill(6)}"
        msg = f"Your cancellation request for {ref} was rejected."
        if update_set["cancellation_review_note"]:
            msg += f" Reason: {update_set['cancellation_review_note']}"
        await create_notification(
            user_id=requester_uid,
            title=f"Cancellation Rejected — {ref}",
            message=msg,
            booking_id=booking_id,
            notif_type="cancel_request_rejected",
        )

    return {"success": True, "booking_id": booking_id, "cancellation_status": "rejected"}
