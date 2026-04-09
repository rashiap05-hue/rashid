from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from db import db, get_current_user

router = APIRouter()

BOOKING_STAGES = ["held", "payment_pending", "payment_received", "confirmed", "ticketed"]
STAGE_LABELS = {
    "held": "Hold",
    "payment_pending": "Payment Pending",
    "payment_received": "Payment Received",
    "confirmed": "Confirmed",
    "ticketed": "Ticketed",
}


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

    class Config:
        populate_by_name = True


@router.post("/bookings")
async def create_booking(booking: BookingCreate, current_user: dict = Depends(get_current_user)):
    # Verify proposal exists
    proposal = await db.proposals.find_one({"id": booking.proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    booking_doc = {
        "id": str(uuid.uuid4()),
        "proposal_id": booking.proposal_id,
        "user_id": current_user.get("id") or current_user.get("email"),
        "travelers": booking.travelers,
        "contact_info": booking.contact_info,
        "special_occasion": booking.special_occasion,
        "payment_option": booking.payment_option,
        "confirmation_time": booking.confirmation_time,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.bookings.insert_one(booking_doc)

    # Update proposal status
    await db.proposals.update_one(
        {"id": booking.proposal_id},
        {"$set": {"status": "booked", "booking_id": booking_doc["id"]}}
    )

    return {
        "id": booking_doc["id"],
        "status": "confirmed",
        "confirmation_time": booking_doc["confirmation_time"],
        "message": "Booking confirmed successfully"
    }


@router.get("/bookings")
async def list_bookings(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("email")
    bookings = await db.bookings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return bookings


@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/held-bookings")
async def get_held_bookings(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") or current_user.get("user_id")
    bookings = await db.held_bookings.find(
        {"created_by": user_id},
        {"_id": 0}
    ).sort("held_at", -1).to_list(100)
    return bookings


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
