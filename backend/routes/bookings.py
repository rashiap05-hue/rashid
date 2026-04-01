from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from db import db, get_current_user

router = APIRouter()


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
