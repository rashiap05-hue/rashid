from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import Optional
from db import db, get_current_user
from datetime import datetime, timezone
import uuid

supplier_router = APIRouter(prefix="/supplier", tags=["Supplier"])


# --- Supplier Booking Management ---

async def _get_supplier_relevant_bookings(current_user: dict, status_filter: Optional[str] = None):
    """Return bookings matched to this supplier's linked services. Admins see all bookings."""
    supplier_id = current_user.get("id")
    supplier_name = current_user.get("company_name", "") or ""
    is_admin = current_user.get("role") == "admin"

    # Find services linked to this supplier
    hotel_ids = [h["id"] async for h in db.hotels.find(
        {"$or": [{"supplier_id": supplier_id}, {"supplier_name": supplier_name}]}, {"id": 1, "_id": 0}
    )] if supplier_id or supplier_name else []
    transfer_ids = [t["id"] async for t in db.transfers.find(
        {"$or": [{"supplier_id": supplier_id}, {"supplier_name": supplier_name}]}, {"id": 1, "_id": 0}
    )] if supplier_id or supplier_name else []
    activity_ids = [a["id"] async for a in db.activities.find(
        {"$or": [{"supplier_id": supplier_id}, {"supplier_name": supplier_name}]}, {"id": 1, "_id": 0}
    )] if supplier_id or supplier_name else []

    all_bookings_raw = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

    supplier_bookings = []
    for booking in all_bookings_raw:
        pid = booking.get("proposal_id")
        if not pid:
            continue

        proposal = await db.proposals.find_one({"id": pid}, {"_id": 0})
        if not proposal:
            continue

        matched_services = []
        selected_hotels = proposal.get("selected_hotels", {}) or {}
        for key, hotel in selected_hotels.items():
            if hotel and hotel.get("id") in hotel_ids:
                matched_services.append({"type": "hotel", "name": hotel.get("name"), "id": hotel.get("id")})

        arr_transfer = proposal.get("arrival_transfer")
        if arr_transfer and arr_transfer.get("id") in transfer_ids:
            matched_services.append({"type": "transfer", "name": arr_transfer.get("title"), "id": arr_transfer.get("id"), "direction": "arrival"})

        dep_transfer = proposal.get("departure_transfer")
        if dep_transfer and dep_transfer.get("id") in transfer_ids:
            matched_services.append({"type": "transfer", "name": dep_transfer.get("title"), "id": dep_transfer.get("id"), "direction": "departure"})

        selected_activities = proposal.get("selected_activities", {}) or {}
        for key, acts in selected_activities.items():
            act_list = acts if isinstance(acts, list) else [acts]
            for act in act_list:
                if act and act.get("id") in activity_ids:
                    matched_services.append({"type": "activity", "name": act.get("name"), "id": act.get("id")})

        # Admins see every booking regardless of service matching; suppliers only see bookings with their services
        if not matched_services and not is_admin:
            continue

        supplier_status = booking.get("supplier_status", "pending")
        if status_filter and supplier_status != status_filter:
            continue

        booking["proposal"] = {
            "proposal_name": proposal.get("proposal_name"),
            "customer_name": proposal.get("customer_name"),
            "customer_email": proposal.get("customer_email"),
            "customer_phone": proposal.get("customer_phone"),
            "leaving_on": proposal.get("leaving_on"),
            "cities": proposal.get("cities", []),
            "total_price": proposal.get("total_price"),
            "room_data": proposal.get("room_data", []),
            "selected_hotels": selected_hotels,
            "arrival_transfer": arr_transfer,
            "departure_transfer": dep_transfer,
            "selected_activities": selected_activities,
        }
        booking["matched_services"] = matched_services
        booking["supplier_status"] = supplier_status
        supplier_bookings.append(booking)

    return supplier_bookings


@supplier_router.get("/bookings")
async def get_supplier_bookings(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all bookings routed to this supplier based on linked services."""
    supplier_bookings = await _get_supplier_relevant_bookings(current_user, status_filter=status)
    return {"success": True, "bookings": supplier_bookings}


@supplier_router.get("/bookings/all")
async def get_all_bookings_admin(current_user: dict = Depends(get_current_user)):
    """Admin endpoint: get all bookings with supplier status."""
    if current_user.get("role") not in ("admin", None):
        pass  # Allow all for now
    
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    for booking in bookings:
        pid = booking.get("proposal_id")
        if pid:
            proposal = await db.proposals.find_one({"id": pid}, {"_id": 0})
            if proposal:
                booking["proposal"] = {
                    "proposal_name": proposal.get("proposal_name"),
                    "customer_name": proposal.get("customer_name"),
                    "leaving_on": proposal.get("leaving_on"),
                    "cities": proposal.get("cities", []),
                    "total_price": proposal.get("total_price"),
                }
        booking.setdefault("supplier_status", "pending")
    
    return {"success": True, "bookings": bookings}


@supplier_router.post("/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, data: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    """Supplier confirms a booking. `confirmation_number` is required."""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    confirmation_number = (data.get("confirmation_number") or "").strip()
    if not confirmation_number:
        raise HTTPException(status_code=400, detail="Confirmation number is required to confirm a booking")

    note = data.get("note", "")
    now_iso = datetime.now(timezone.utc).isoformat()

    update_fields = {
        "supplier_status": "confirmed",
        "supplier_confirmed_by": current_user.get("full_name"),
        "supplier_confirmed_at": now_iso,
        "supplier_note": note,
        "supplier_confirmation_number": confirmation_number,
    }
    # Auto-advance the main booking status only when payment has been received.
    # Held bookings stay as "held" until the agent pays; supplier acknowledgment is captured in supplier_status.
    if booking.get("status") == "payment_received":
        update_fields["status"] = "confirmed"
        update_fields["confirmed_at"] = now_iso

    # Stamp the confirmation number onto the matched hotel(s) inside the proposal so
    # the operational dashboard's hotel rows display it.
    proposal_id = booking.get("proposal_id")
    if proposal_id:
        proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0, "selected_hotels": 1})
        selected_hotels = (proposal or {}).get("selected_hotels", {}) or {}
        if selected_hotels:
            updated = {}
            for k, h in selected_hotels.items():
                if isinstance(h, dict):
                    new_h = dict(h)
                    new_h["confirmation_code"] = confirmation_number
                    new_h["confirmation_status"] = "confirmed"
                    updated[k] = new_h
            if updated:
                await db.proposals.update_one(
                    {"id": proposal_id},
                    {"$set": {"selected_hotels": updated}},
                )

    await db.bookings.update_one({"id": booking_id}, {"$set": update_fields})
    # Keep held_bookings (used by MyBookings + BookingDetail) in sync
    await db.held_bookings.update_one({"id": booking_id}, {"$set": update_fields})
    
    # Create notification for the agent
    agent_id = booking.get("user_id")
    if agent_id:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": agent_id,
            "type": "booking_confirmed",
            "title": "Booking Confirmed by Supplier",
            "message": f"Confirmation #{confirmation_number}.{(' Note: ' + note) if note else ''}",
            "booking_id": booking_id,
            "read": False,
            "created_at": now_iso
        })
    
    return {"success": True, "message": "Booking confirmed", "confirmation_number": confirmation_number}


@supplier_router.post("/bookings/{booking_id}/reject")
async def reject_booking(booking_id: str, data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Supplier rejects a booking with a reason."""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    reason = data.get("reason", "No reason provided")
    now_iso = datetime.now(timezone.utc).isoformat()

    update_fields = {
        "supplier_status": "rejected",
        "supplier_rejected_by": current_user.get("full_name"),
        "supplier_rejected_at": now_iso,
        "supplier_rejection_reason": reason,
    }
    # If the booking had been paid, mark it cancelled so the agent sees the final outcome.
    if booking.get("status") == "payment_received":
        update_fields["status"] = "cancelled"
        update_fields["cancelled_at"] = now_iso

    await db.bookings.update_one({"id": booking_id}, {"$set": update_fields})
    await db.held_bookings.update_one({"id": booking_id}, {"$set": update_fields})
    
    # Create notification for the agent
    agent_id = booking.get("user_id")
    if agent_id:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": agent_id,
            "type": "booking_rejected",
            "title": "Booking Rejected by Supplier",
            "message": f"Your booking has been rejected. Reason: {reason}",
            "booking_id": booking_id,
            "read": False,
            "created_at": now_iso
        })
    
    return {"success": True, "message": "Booking rejected"}


# --- Supplier Dashboard Stats ---

@supplier_router.get("/dashboard")
async def get_supplier_dashboard(
    supplier_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    name = supplier_name or current_user.get("company_name", "")
    
    transfers = await db.transfers.find(
        {"$or": [{"supplier_name": name}, {"supplier_id": current_user.get("id")}]}, {"_id": 0}
    ).to_list(100)
    
    hotels = await db.hotels.find(
        {"$or": [{"supplier_name": name}, {"supplier_id": current_user.get("id")}]}, {"_id": 0}
    ).to_list(100)
    
    activities = await db.activities.find(
        {"$or": [{"supplier_name": name}, {"supplier_id": current_user.get("id")}]}, {"_id": 0}
    ).to_list(100)
    
    # Count stats consistent with /supplier/bookings (respects service matching + admin override)
    relevant = await _get_supplier_relevant_bookings(current_user)
    pending_count = sum(1 for b in relevant if b.get("supplier_status", "pending") == "pending")
    confirmed_count = sum(1 for b in relevant if b.get("supplier_status") == "confirmed")
    rejected_count = sum(1 for b in relevant if b.get("supplier_status") == "rejected")
    
    return {
        "success": True,
        "stats": {
            "total_services": len(transfers) + len(hotels) + len(activities),
            "total_transfers": len(transfers),
            "total_hotels": len(hotels),
            "total_activities": len(activities),
            "total_bookings": len(relevant),
            "pending_bookings": pending_count,
            "confirmed_bookings": confirmed_count,
            "rejected_bookings": rejected_count,
        },
        "transfers": transfers,
        "hotels": hotels,
        "activities": activities,
    }


# --- Supplier Transfers/Services Management ---

@supplier_router.get("/transfers")
async def get_supplier_transfers(supplier_name: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    name = supplier_name or current_user.get("company_name", "")
    transfers = await db.transfers.find(
        {"$or": [{"supplier_name": name}, {"supplier_id": current_user.get("id")}]}, {"_id": 0}
    ).to_list(100)
    return {"success": True, "transfers": transfers}


@supplier_router.put("/transfers/{transfer_id}")
async def update_supplier_transfer(transfer_id: str, transfer_data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    supplier_name = current_user.get("company_name", "")
    existing = await db.transfers.find_one({
        "id": transfer_id,
        "$or": [{"supplier_name": supplier_name}, {"supplier_id": current_user.get("id")}]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Transfer not found or not owned by supplier")
    
    allowed_fields = ["is_available", "pickup_times", "description", "duration", "confirmation_time"]
    update_data = {k: v for k, v in transfer_data.items() if k in allowed_fields}
    if update_data:
        await db.transfers.update_one({"id": transfer_id}, {"$set": update_data})
    
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    return {"success": True, "transfer": updated}


@supplier_router.get("/earnings")
async def get_supplier_earnings(current_user: dict = Depends(get_current_user)):
    supplier_name = current_user.get("company_name", "")
    transfers = await db.transfers.find(
        {"$or": [{"supplier_name": supplier_name}, {"supplier_id": current_user.get("id")}]}, {"_id": 0}
    ).to_list(100)
    transfer_ids = [t["id"] for t in transfers]
    
    bookings = await db.bookings.find({
        "transfer_id": {"$in": transfer_ids},
        "supplier_status": {"$in": ["confirmed", "completed"]}
    }, {"_id": 0}).to_list(1000)
    
    total_earnings = sum(b.get("supplier_earnings", 0) for b in bookings)
    
    return {
        "success": True,
        "summary": {
            "total_earnings": total_earnings,
            "total_bookings": len(bookings),
            "transfer_count": len(transfers)
        }
    }
