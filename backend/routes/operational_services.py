"""Operational dashboard — per-service (hotel/transfer/activity/flight) confirm & reject.

Lets the operations team mark each service line item independently with its own
confirmation number, instead of flipping the whole booking's supplier_status at once.

Storage:
  Each booking carries a `service_confirmations` map:
    booking.service_confirmations["hotel:Bangkok_0"] = {
      status, confirmation_number, confirmed_by, confirmed_by_id, confirmed_at, op_note, reject_reason
    }
  This is keyed by `<service_type>:<service_key>` so two bookings sharing the
  same proposal stay independent.

After each confirm/reject we roll up booking.supplier_status:
  - all known services confirmed → "confirmed"
  - any pending → "pending"
  - all non-confirmed are rejected → "rejected"
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Literal, List, Tuple
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel

from db import db, get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

ServiceType = Literal["hotel", "transfer", "activity", "flight"]
ALLOWED_TYPES = {"hotel", "transfer", "activity", "flight"}


class ServiceConfirmRequest(BaseModel):
    booking_id: str
    service_type: ServiceType
    service_key: str
    confirmation_number: str
    note: Optional[str] = ""
    # Structured fields surfaced on the Trip Itinerary page (mainly for transfer/activity)
    driver_name: Optional[str] = ""
    driver_phone: Optional[str] = ""
    vehicle_plate: Optional[str] = ""
    pickup_time: Optional[str] = ""


class ServiceRejectRequest(BaseModel):
    booking_id: str
    service_type: ServiceType
    service_key: str
    reason: str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate(service_type: str, service_key: str):
    if service_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported service_type: {service_type}")
    if not service_key:
        raise HTTPException(status_code=400, detail="service_key is required")


def _all_service_refs(proposal: dict) -> List[Tuple[str, str]]:
    """Return list of (service_type, service_key) for every line item on the proposal.
    These are the services we'll roll up the booking status against.
    """
    refs: List[Tuple[str, str]] = []
    cities = proposal.get("cities") or []
    sh = proposal.get("selected_hotels") or {}
    for idx, c in enumerate(cities):
        cname = c.get("name") if isinstance(c, dict) else c
        key = f"{cname}_{idx}"
        h = sh.get(key) or sh.get(cname)
        if h and isinstance(h, dict) and h.get("name"):
            refs.append(("hotel", key))

    a = proposal.get("arrival_transfer") or {}
    if a.get("title") or a.get("name"):
        refs.append(("transfer", "arrival"))
    for k, t in (proposal.get("inter_city_transfers") or {}).items():
        if isinstance(t, dict) and (t.get("title") or t.get("name")):
            refs.append(("transfer", f"inter:{k}"))
    dep = proposal.get("departure_transfer") or {}
    if dep.get("title") or dep.get("name"):
        refs.append(("transfer", "departure"))

    for dk, val in (proposal.get("selected_activities") or {}).items():
        items = val if isinstance(val, list) else [val]
        for i, ai in enumerate(items):
            if isinstance(ai, dict) and (ai.get("name") or ai.get("title")):
                refs.append(("activity", f"{dk}#{i}" if isinstance(val, list) else dk))

    for i, f in enumerate(proposal.get("flights") or []):
        if isinstance(f, dict) and (f.get("airline") or f.get("flight_number")):
            refs.append(("flight", str(i)))
    af = proposal.get("arrival_flight_info") or {}
    if af.get("airline") or af.get("flight_no"):
        refs.append(("flight", "arrival"))
    df = proposal.get("departure_flight_info") or {}
    if df.get("airline") or df.get("flight_no"):
        refs.append(("flight", "departure"))

    return refs


async def _rollup_booking_status(booking_id: str):
    """Roll up booking.supplier_status based on per-service confirmations.

    Reads service_confirmations from BOTH `db.bookings` and `db.held_bookings`
    and merges them (with `db.bookings` winning on conflicts) so an accidental
    out-of-sync state between the two collections does not keep the booking
    stuck on `pending` when operations have actually confirmed everything.
    """
    b_main = await db.bookings.find_one({"id": booking_id}, {"_id": 0}) or {}
    b_held = await db.held_bookings.find_one({"id": booking_id}, {"_id": 0}) or {}
    booking = b_main or b_held
    if not booking:
        return
    proposal = await db.proposals.find_one({"id": booking.get("proposal_id")}, {"_id": 0}) or {}
    refs = _all_service_refs(proposal)
    if not refs:
        return

    # Merge service_confirmations from both collections — union keys, and when
    # a key exists in both prefer the entry from `db.bookings` (the live
    # operational view). Then re-persist the merged map to BOTH collections so
    # future reads are consistent.
    sc_held = b_held.get("service_confirmations") or {}
    sc_main = b_main.get("service_confirmations") or {}
    sc = {**sc_held, **sc_main}

    statuses = [(sc.get(f"{t}:{k}") or {}).get("status", "pending") for t, k in refs]

    if all(s == "confirmed" for s in statuses):
        new_status = "confirmed"
    elif any(s == "pending" for s in statuses):
        new_status = "pending"
    elif all(s in ("rejected", "confirmed") for s in statuses):
        new_status = "rejected"
    else:
        new_status = "pending"

    fields = {"supplier_status": new_status, "service_confirmations": sc}
    if new_status == "confirmed":
        fields["supplier_confirmed_at"] = _now()
    await db.bookings.update_one({"id": booking_id}, {"$set": fields})
    await db.held_bookings.update_one({"id": booking_id}, {"$set": fields})


async def _get_booking(booking_id: str) -> dict:
    booking = (
        await db.held_bookings.find_one({"id": booking_id}, {"_id": 0})
        or await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("/operational/service-confirm")
async def confirm_service(
    payload: ServiceConfirmRequest = Body(...),
    current_user: dict = Depends(get_current_user),
):
    _validate(payload.service_type, payload.service_key)
    if not payload.confirmation_number.strip():
        raise HTTPException(status_code=400, detail="Confirmation number is required to confirm a service")

    booking = await _get_booking(payload.booking_id)
    map_key = f"{payload.service_type}:{payload.service_key}"
    entry = {
        "service_type": payload.service_type,
        "service_key": payload.service_key,
        "status": "confirmed",
        "confirmation_number": payload.confirmation_number.strip(),
        "confirmed_by": current_user.get("full_name") or current_user.get("name") or current_user.get("email"),
        "confirmed_by_id": current_user.get("id"),
        "confirmed_at": _now(),
        "op_note": payload.note or "",
        "reject_reason": "",
        # Structured driver/vehicle fields (mainly used by transfer/activity rows)
        "driver_name": (payload.driver_name or "").strip(),
        "driver_phone": (payload.driver_phone or "").strip(),
        "vehicle_plate": (payload.vehicle_plate or "").strip(),
        "pickup_time": (payload.pickup_time or "").strip(),
    }

    # Update on both collections (held_bookings = source of truth, bookings = supplier view)
    update = {f"service_confirmations.{map_key}": entry}
    await db.bookings.update_one({"id": payload.booking_id}, {"$set": update})
    await db.held_bookings.update_one({"id": payload.booking_id}, {"$set": update})

    await _rollup_booking_status(payload.booking_id)

    # Notify the agent who owns the booking
    agent_id = booking.get("user_id")
    if agent_id and agent_id != current_user.get("id"):
        try:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": agent_id,
                "type": "service_confirmed",
                "title": f"{payload.service_type.capitalize()} confirmed by operations",
                "message": f"Confirmation #{payload.confirmation_number.strip()}{(' — ' + payload.note) if payload.note else ''}",
                "booking_id": payload.booking_id,
                "read": False,
                "created_at": _now(),
            })
        except Exception as e:  # pragma: no cover
            logger.warning(f"Failed to write service-confirmed notification: {e}")

    return {"success": True, "confirmation_number": payload.confirmation_number.strip(), "service_confirmation": entry}


@router.post("/operational/service-reject")
async def reject_service(
    payload: ServiceRejectRequest = Body(...),
    current_user: dict = Depends(get_current_user),
):
    _validate(payload.service_type, payload.service_key)
    if not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Reason is required to reject a service")

    booking = await _get_booking(payload.booking_id)
    map_key = f"{payload.service_type}:{payload.service_key}"
    entry = {
        "service_type": payload.service_type,
        "service_key": payload.service_key,
        "status": "rejected",
        "reject_reason": payload.reason.strip(),
        "rejected_by": current_user.get("full_name") or current_user.get("email"),
        "rejected_by_id": current_user.get("id"),
        "rejected_at": _now(),
    }
    update = {f"service_confirmations.{map_key}": entry}
    await db.bookings.update_one({"id": payload.booking_id}, {"$set": update})
    await db.held_bookings.update_one({"id": payload.booking_id}, {"$set": update})

    await _rollup_booking_status(payload.booking_id)

    agent_id = booking.get("user_id")
    if agent_id and agent_id != current_user.get("id"):
        try:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": agent_id,
                "type": "service_rejected",
                "title": f"{payload.service_type.capitalize()} rejected by operations",
                "message": payload.reason.strip(),
                "booking_id": payload.booking_id,
                "read": False,
                "created_at": _now(),
            })
        except Exception as e:  # pragma: no cover
            logger.warning(f"Failed to write service-rejected notification: {e}")

    return {"success": True, "service_confirmation": entry}
