from fastapi import APIRouter, HTTPException
from db import db
from models.schemas import UserUpdate
from datetime import datetime, timezone, timedelta

admin_router = APIRouter(prefix="/admin", tags=["Admin"])


@admin_router.get("/users")
async def get_all_users():
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    enriched_users = []
    for user in users:
        proposals = await db.proposals.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
        proposals_count = len(proposals)
        total_value = sum(p.get("total_price", 0) for p in proposals)
        enriched_users.append({
            **user,
            "role": user.get("role", "agent"),
            "status": user.get("status", "active"),
            "proposals_count": proposals_count,
            "total_bookings_value": total_value
        })
    return {"success": True, "users": enriched_users}


@admin_router.get("/users/{user_id}")
async def get_user_details(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    proposals = await db.proposals.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    payments = await db.payment_transactions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return {
        "success": True,
        "user": {**user, "role": user.get("role", "agent"), "status": user.get("status", "active")},
        "proposals": proposals,
        "payments": payments,
        "stats": {
            "proposals_count": len(proposals),
            "confirmed_count": len([p for p in proposals if p.get("status") == "confirmed"]),
            "pending_count": len([p for p in proposals if p.get("status") == "pending"]),
            "total_value": sum(p.get("total_price", 0) for p in proposals)
        }
    }


@admin_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "User updated successfully"}


@admin_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db.proposals.delete_many({"user_id": user_id})
    return {"success": True, "message": "User deleted successfully"}


@admin_router.get("/stats")
async def get_admin_stats():
    users_count = await db.users.count_documents({})
    proposals_count = await db.proposals.count_documents({})
    confirmed_count = await db.proposals.count_documents({"status": "confirmed"})
    pending_count = await db.proposals.count_documents({"status": "pending"})
    proposals = await db.proposals.find({"status": "confirmed"}, {"_id": 0, "total_price": 1}).to_list(10000)
    total_revenue = sum(p.get("total_price", 0) for p in proposals)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_users = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})
    return {
        "success": True,
        "stats": {
            "total_users": users_count,
            "total_proposals": proposals_count,
            "confirmed_proposals": confirmed_count,
            "pending_proposals": pending_count,
            "total_revenue": total_revenue,
            "recent_signups": recent_users
        }
    }


@admin_router.post("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str):
    if role not in ["admin", "agent", "manager", "supplier"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": f"User role updated to {role}"}


@admin_router.post("/users/{user_id}/status")
async def update_user_status(user_id: str, status: str):
    if status not in ["active", "suspended", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.users.update_one({"id": user_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": f"User status updated to {status}"}



import re as _re
from db import get_current_user
from fastapi import Depends


def _placeholder_hotel(city: str, nights: int) -> dict:
    return {
        "name": "Hotel TBC (restored from booking)",
        "stars": 4,
        "nights": nights,
        "city": city,
        "room_type": "Standard Room",
        "meal_plan": "Bed & Breakfast",
        "price_per_night": 0,
        "total_price": 0,
        "image": "",
        "_restored": True,
    }


def _placeholder_activity(name_hint: str) -> dict:
    return {
        "name": name_hint,
        "duration": "—",
        "image": "",
        "price": 0,
        "_restored": True,
    }


@admin_router.post("/bookings/{booking_ref}/restore-proposal")
async def restore_orphan_proposal(booking_ref: str, current_user: dict = Depends(get_current_user)):
    """Re-create a deleted proposal from a booking record so the booking can
    render hotels/transfers/tours again. Admin-only. Idempotent — refuses to
    overwrite an existing proposal.

    Reconstructs as much as possible (city structure, customer info,
    confirmation numbers, traveller list, total price) — hotel/activity NAMES
    become placeholders because they weren't denormalised onto the booking.
    """
    role = ((current_user or {}).get("role") or "").lower()
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Admin/staff access required")

    booking = await db.bookings.find_one({"booking_ref": booking_ref}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking {booking_ref} not found")

    proposal_id = booking.get("proposal_id")
    if not proposal_id:
        raise HTTPException(status_code=400, detail="Booking has no proposal_id reference")

    existing = await db.proposals.find_one({"id": proposal_id})
    if existing:
        return {"success": False, "message": "Proposal already exists, nothing to do", "proposal_id": proposal_id}

    cities = booking.get("cities") or []
    svc = booking.get("service_confirmations") or {}

    selected_hotels = {}
    for i, c in enumerate(cities):
        city_name = c.get("name") if isinstance(c, dict) else c
        nights = c.get("nights", 1) if isinstance(c, dict) else 1
        key = f"{city_name}_{i}"
        hotel = _placeholder_hotel(city_name, nights)
        conf = svc.get(f"hotel:{key}")
        if conf:
            hotel["confirmation_number"] = conf.get("confirmation_number")
            hotel["supplier_status"] = conf.get("status")
        selected_hotels[key] = hotel

    selected_activities = {}
    for k, conf in svc.items():
        m = _re.match(r"^activity:([^:#]+)(?:#(\d+))?$", k)
        if not m:
            continue
        city_idx = m.group(1)
        selected_activities.setdefault(city_idx, [])
        act = _placeholder_activity(f"Activity (restored) — conf {conf.get('confirmation_number', '')}")
        act["confirmation_number"] = conf.get("confirmation_number")
        act["supplier_status"] = conf.get("status")
        if conf.get("pickup_time"):
            act["pickup_time"] = conf["pickup_time"]
        if conf.get("driver_name"):
            act["driver_name"] = conf["driver_name"]
        selected_activities[city_idx].append(act)

    inter_city = {}
    for k, conf in svc.items():
        m = _re.match(r"^transfer:inter:(\d+)_(\d+)$", k)
        if not m:
            continue
        inter_city[f"{m.group(1)}_{m.group(2)}"] = {
            "name": "Inter-city Transfer (restored)",
            "type": "private",
            "price": 0,
            "confirmation_number": conf.get("confirmation_number"),
            "supplier_status": conf.get("status"),
            "driver_name": conf.get("driver_name") or "",
            "driver_phone": conf.get("driver_phone") or "",
            "vehicle_plate": conf.get("vehicle_plate") or "",
            "pickup_time": conf.get("pickup_time") or "",
            "_restored": True,
        }

    arr_conf = svc.get("transfer:arrival") or {}
    dep_conf = svc.get("transfer:departure") or {}
    arrival_transfer = {
        "name": "Arrival Transfer (restored)",
        "price": 0,
        "confirmation_number": arr_conf.get("confirmation_number"),
        "supplier_status": arr_conf.get("status") or "confirmed",
        "pickup_time": arr_conf.get("pickup_time") or "",
        "_restored": True,
    } if arr_conf else {}
    departure_transfer = {
        "name": "Departure Transfer (restored)",
        "price": 0,
        "confirmation_number": dep_conf.get("confirmation_number"),
        "supplier_status": dep_conf.get("status") or "confirmed",
        "_restored": True,
    } if dep_conf else {}

    arr_fl = svc.get("flight:arrival") or {}
    dep_fl = svc.get("flight:departure") or {}
    arrival_flight_info = {
        "airline": "TBC",
        "flightNumber": "TBC",
        "flightDate": booking.get("leaving_on"),
        "arrivalDate": booking.get("leaving_on"),
        "pnr": arr_fl.get("confirmation_number") or "",
        "_restored": True,
    } if arr_fl else {}
    departure_flight_info = {
        "airline": "TBC",
        "flightNumber": "TBC",
        "pnr": dep_fl.get("confirmation_number") or "",
        "_restored": True,
    } if dep_fl else {}

    now = datetime.now(timezone.utc).isoformat()
    proposal = {
        "id": proposal_id,
        "customer_name": booking.get("customer_name") or "Restored Customer",
        "customer_email": (booking.get("contact_info") or {}).get("email") or booking.get("customer_email") or "",
        "customer_phone": (booking.get("contact_info") or {}).get("phone") or "",
        "adults": booking.get("adults") or 1,
        "children": [],
        "rooms": [{"adults": booking.get("adults") or 1, "children": []}],
        "leaving_on": booking.get("leaving_on") or "",
        "return_on": "",
        "departure_city": (booking.get("contact_info") or {}).get("city") or "Dubai",
        "leaving_from": (booking.get("contact_info") or {}).get("city") or "Dubai",
        "nationality": (booking.get("contact_info") or {}).get("nationality") or "Indian",
        "star_rating": "4 Star",
        "add_transfers": True,
        "room_data": [{"room_type": "Twin/Double", "adults": booking.get("adults") or 2, "children": []}],
        "stayplan": "Twin Sharing",
        "cities": cities,
        "selected_hotels": selected_hotels,
        "selected_activities": selected_activities,
        "inter_city_transfers": inter_city,
        "arrival_transfer": arrival_transfer,
        "departure_transfer": departure_transfer,
        "arrival_flight_info": arrival_flight_info,
        "departure_flight_info": departure_flight_info,
        "total_price": booking.get("total_price") or 0,
        "markup_land": 0,
        "discount_amount": 0,
        "pricing_breakdown": {"total": booking.get("total_price") or 0},
        "status": "booked",
        "booking_id": booking.get("id"),
        "booking_ref": booking_ref,
        "created_by": booking.get("created_by"),
        "created_by_name": booking.get("booked_by_name") or "Restored",
        "created_at": booking.get("created_at") or now,
        "updated_at": now,
        "_restored_from_booking": booking_ref,
        "_restoration_note": (
            "Reconstructed from booking data after the original was deleted. "
            "Hotel and activity names are placeholders; confirmation numbers, "
            "traveller details, city structure, and pricing are accurate."
        ),
    }

    await db.proposals.insert_one(proposal)
    return {
        "success": True,
        "proposal_id": proposal_id,
        "booking_ref": booking_ref,
        "stats": {
            "cities": len(cities),
            "hotels": len(selected_hotels),
            "activities": sum(len(v) for v in selected_activities.values()),
            "inter_city_transfers": len(inter_city),
            "arrival_transfer": bool(arrival_transfer),
            "departure_transfer": bool(departure_transfer),
        },
    }
