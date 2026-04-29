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

    # Update proposal status
    await db.proposals.update_one(
        {"id": booking.proposal_id},
        {"$set": {"status": "booked", "booking_id": booking_id}}
    )

    return {
        "id": booking_id,
        "status": new_status,
        "confirmation_time": booking.confirmation_time,
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
