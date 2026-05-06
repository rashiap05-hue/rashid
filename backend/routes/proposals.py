from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
from db import db, get_current_user, get_optional_user
from models.schemas import ProposalCreate, ProposalResponse
from booking_number import next_booking_number, format_booking_ref
from typing import List
from datetime import datetime, timezone, timedelta
import uuid

proposals_router = APIRouter(prefix="/proposals", tags=["Proposals"])


@proposals_router.post("", response_model=ProposalResponse)
async def create_proposal(proposal: ProposalCreate, user: dict = Depends(get_optional_user)):
    proposal_id = str(uuid.uuid4())

    if proposal.total_price:
        total_price = proposal.total_price
    else:
        total_nights = sum(c.nights for c in proposal.cities)
        base_price = 500 * total_nights
        room_count = len(proposal.room_data)
        total_price = base_price * room_count

    doc = {
        "id": proposal_id,
        "user_id": user["id"] if user else None,
        "leaving_from": proposal.leaving_from,
        "leaving_from_code": proposal.leaving_from_code,
        "nationality": proposal.nationality,
        "leaving_on": proposal.leaving_on,
        "star_rating": proposal.star_rating,
        "add_transfers": proposal.add_transfers,
        "room_data": [r.model_dump() for r in proposal.room_data],
        "cities": [c.model_dump() for c in proposal.cities],
        "status": proposal.status or "pending",
        "total_price": total_price,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "selected_flight": proposal.selected_flight,
        "arrival_flight_info": proposal.arrival_flight_info,
        "departure_flight_info": proposal.departure_flight_info,
        "selected_hotels": proposal.selected_hotels,
        "selected_activities": proposal.selected_activities,
        "selected_extras": proposal.selected_extras,
        "inter_city_transfers": proposal.inter_city_transfers,
        "arrival_transfer": proposal.arrival_transfer,
        "departure_transfer": proposal.departure_transfer,
        "pricing_breakdown": proposal.pricing_breakdown,
        "vehicle_type": proposal.vehicle_type,
        "vehicle_label": proposal.vehicle_label,
        "total_pax": proposal.total_pax,
        "itinerary": proposal.itinerary,
        "total_nights": proposal.total_nights,
        "start_date": proposal.start_date,
        "customer_name": proposal.customer_name,
        "customer_email": proposal.customer_email,
        "customer_phone": proposal.customer_phone,
        "proposal_name": proposal.proposal_name,
        "expected_booking_date": proposal.expected_booking_date,
        "flights_booked": proposal.flights_booked,
        "markup_value": proposal.markup_value,
        "markup_type": proposal.markup_type,
        "discount_amount": proposal.discount_amount,
        "travel_insurance": proposal.travel_insurance,
        "travel_insurance_price": proposal.travel_insurance_price
    }
    await db.proposals.insert_one(doc)
    return ProposalResponse(**doc)


@proposals_router.get("", response_model=List[ProposalResponse])
async def get_proposals(user: dict = Depends(get_optional_user)):
    # Hide proposals that have already been held / booked / paid — once a
    # booking_id is stamped onto the proposal it lives in My Bookings instead
    # of the Proposals dashboard. Same for proposals whose status has moved
    # past the quote phase.
    query: dict = {
        "$and": [
            {"$or": [{"booking_id": {"$exists": False}}, {"booking_id": None}, {"booking_id": ""}]},
            {"$or": [
                {"status": {"$exists": False}},
                {"status": None},
                {"status": {"$nin": ["held", "booked", "confirmed", "payment_received", "cancelled"]}},
            ]},
        ]
    }
    if user:
        query["user_id"] = user["id"]
    proposals = await db.proposals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ProposalResponse(**p) for p in proposals]


@proposals_router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: str):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Always refresh the `meals_included` flag on each saved activity from the master `activities` collection
    # — pricing/duration stay frozen, but meal flags reflect current activity configuration.
    sel_acts = proposal.get("selected_activities") or {}
    if sel_acts:
        # Collect all activity ids in one batch for an efficient single query
        ids = set()
        for v in sel_acts.values():
            for a in (v if isinstance(v, list) else [v]):
                if a and a.get("id"):
                    ids.add(a["id"])
        meals_by_id = {}
        if ids:
            async for doc in db.activities.find({"id": {"$in": list(ids)}}, {"_id": 0, "id": 1, "meals_included": 1, "useful_information": 1}):
                meals_by_id[doc["id"]] = {
                    "meals_included": doc.get("meals_included") or {},
                    "useful_information": doc.get("useful_information") or [],
                }
        # Apply to the snapshot
        for k, v in sel_acts.items():
            items = v if isinstance(v, list) else [v]
            for a in items:
                if a and a.get("id") and a["id"] in meals_by_id:
                    enr = meals_by_id[a["id"]]
                    a["meals_included"] = enr["meals_included"]
                    if enr["useful_information"]:
                        a["useful_information"] = enr["useful_information"]
            sel_acts[k] = items if isinstance(v, list) else (items[0] if items else v)
        proposal["selected_activities"] = sel_acts

    return ProposalResponse(**proposal)


@proposals_router.put("/{proposal_id}")
async def update_proposal(proposal_id: str, proposal: ProposalCreate):
    update_data = proposal.model_dump(exclude_unset=True)
    result = await db.proposals.update_one({"id": proposal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}


@proposals_router.patch("/{proposal_id}")
async def partial_update_proposal(proposal_id: str, update_data: dict = Body(...)):
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update_data.items() if v is not None}

    result = await db.proposals.update_one({"id": proposal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")

    updated = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    return {"success": True, "proposal": updated}


@proposals_router.put("/{proposal_id}/status")
async def update_proposal_status(proposal_id: str, status: str):
    result = await db.proposals.update_one({"id": proposal_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}


@proposals_router.post("/{proposal_id}/accept")
async def accept_proposal(proposal_id: str):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    hold_until = now + timedelta(minutes=30)
    result = await db.proposals.update_one(
        {"id": proposal_id},
        {"$set": {
            "status": "accepted",
            "accepted_at": now.isoformat(),
            "hold_until": hold_until.isoformat(),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {
        "success": True,
        "accepted_at": now.isoformat(),
        "hold_until": hold_until.isoformat(),
    }


@proposals_router.post("/{proposal_id}/hold")
async def hold_proposal(proposal_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone
    hold_until_date = body.get("hold_until_date")
    if not hold_until_date:
        raise HTTPException(status_code=400, detail="hold_until_date is required")

    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    now = datetime.now(timezone.utc)
    user_id = current_user.get("id") or current_user.get("user_id", "")

    # Optional traveler/contact data carried over from BookingConfirmation page
    travelers = body.get("travelers") or []
    contact_info = body.get("contact_info") or body.get("contactInfo") or {}
    special_occasion = body.get("special_occasion") or body.get("specialOccasion") or "none"

    # Fallback: if no traveler info was filled, seed the first traveler with proposal's customer_name
    # so the Traveler Details section on BookingDetail is not completely blank.
    def _is_blank(t):
        return not (t.get("firstName") or t.get("lastName") or t.get("passportNumber"))

    if not travelers or all(_is_blank(t) for t in travelers):
        customer_name = (proposal.get("customer_name") or "").strip()
        if customer_name:
            parts = customer_name.split(" ", 1)
            first = parts[0]
            last = parts[1] if len(parts) > 1 else ""
            seed = {
                "title": "Mr",
                "firstName": first,
                "lastName": last,
                "dobDay": "", "dobMonth": "", "dobYear": "",
                "passportNumber": "",
                "expiryDay": "", "expiryMonth": "", "expiryYear": "",
                "nationality": "",
            }
            travelers = [seed] + (travelers[1:] if len(travelers) > 1 else [])

    # Update proposal status to held (we'll stamp the booking_id/ref after booking is created)
    await db.proposals.update_one(
        {"id": proposal_id},
        {"$set": {
            "status": "held",
            "held_at": now.isoformat(),
            "hold_until_date": hold_until_date,
        }}
    )

    # Create a booking record
    booking_id = str(uuid.uuid4())
    booking_number = await next_booking_number()
    booking_ref = format_booking_ref(booking_number)
    booking = {
        "id": booking_id,
        "booking_number": booking_number,
        "booking_ref": booking_ref,
        "proposal_id": proposal_id,
        "proposal_name": proposal.get("proposal_name", ""),
        "customer_name": proposal.get("customer_name", ""),
        "customer_email": proposal.get("customer_email", ""),
        "cities": proposal.get("cities", []),
        "leaving_on": proposal.get("leaving_on", ""),
        "nights": proposal.get("nights", 0),
        "rooms": proposal.get("rooms", 1),
        "adults": proposal.get("adults", 1),
        "total_price": proposal.get("total_price", 0),
        "status": "held",
        "hold_until_date": hold_until_date,
        "held_at": now.isoformat(),
        "created_at": now.isoformat(),
        "created_by": user_id,
        "user_id": user_id,
        "booked_by_name": current_user.get("name") or current_user.get("full_name", ""),
        "type": "Package",
        "travelers": travelers,
        "contact_info": contact_info,
        "special_occasion": special_occasion,
        "supplier_status": "pending",
    }
    await db.held_bookings.insert_one(booking)
    booking.pop("_id", None)

    # Also insert into db.bookings so Supplier Dashboard and Admin supplier booking management see it
    bookings_doc = {k: v for k, v in booking.items() if k != "_id"}
    await db.bookings.insert_one(bookings_doc)
    bookings_doc.pop("_id", None)

    # Stamp the booking identifiers back onto the proposal so ProposalView can
    # render the locked "<TBM-ref> - BOOKING DETAILS" sidebar without a round-trip.
    await db.proposals.update_one(
        {"id": proposal_id},
        {"$set": {
            "booking_id": booking_id,
            "booking_number": booking_number,
            "booking_ref": booking_ref,
        }}
    )

    return {"success": True, "booking": booking}


@proposals_router.delete("/{proposal_id}")
async def delete_proposal(proposal_id: str, user: dict = Depends(get_current_user)):
    result = await db.proposals.delete_one({"id": proposal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}



# ─── Proposal Versioning ───

@proposals_router.post("/{proposal_id}/versions")
async def save_proposal_version(proposal_id: str, body: dict = Body(...), user: dict = Depends(get_optional_user)):
    """Save current proposal state as a named version snapshot"""
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Get next version number
    last_version = await db.proposal_versions.find_one(
        {"proposal_id": proposal_id}, {"_id": 0}, sort=[("version_number", -1)]
    )
    next_version = (last_version["version_number"] + 1) if last_version else 1

    version_doc = {
        "id": str(uuid.uuid4()),
        "proposal_id": proposal_id,
        "version_number": next_version,
        "version_note": body.get("version_note", ""),
        "snapshot": {k: v for k, v in proposal.items() if k != "_id"},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"] if user else None,
        "created_by_name": user.get("full_name", "") if user else ""
    }
    await db.proposal_versions.insert_one(version_doc)
    version_doc.pop("_id", None)
    return version_doc


@proposals_router.get("/{proposal_id}/versions")
async def get_proposal_versions(proposal_id: str):
    """Get all saved versions for a proposal"""
    versions = await db.proposal_versions.find(
        {"proposal_id": proposal_id}, {"_id": 0}
    ).sort("version_number", -1).to_list(100)
    return {"versions": versions}


@proposals_router.post("/{proposal_id}/versions/{version_id}/restore")
async def restore_version_as_new(proposal_id: str, version_id: str, user: dict = Depends(get_optional_user)):
    """Create a new proposal from a saved version snapshot"""
    version = await db.proposal_versions.find_one(
        {"id": version_id, "proposal_id": proposal_id}, {"_id": 0}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    snapshot = version.get("snapshot", {})
    new_id = str(uuid.uuid4())

    # Create new proposal from the snapshot
    new_doc = {**snapshot}
    new_doc["id"] = new_id
    new_doc["user_id"] = user["id"] if user else snapshot.get("user_id")
    new_doc["status"] = "pending"
    new_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    new_doc["proposal_name"] = f"{snapshot.get('proposal_name', 'Proposal')} (Restored v{version['version_number']})"
    new_doc.pop("_id", None)

    await db.proposals.insert_one(new_doc)
    new_doc.pop("_id", None)
    return {"success": True, "new_proposal_id": new_id, "proposal": new_doc}


