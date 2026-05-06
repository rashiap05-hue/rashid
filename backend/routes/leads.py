"""My Leads — lightweight CRM for tracking potential bookings.

A lead is a customer enquiry captured before/alongside a quote. Once a lead
is converted into a proposal/booking, it stays linked via `proposal_id` /
`booking_id` so the conversion analytics work.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from db import db, get_current_user

leads_router = APIRouter(prefix="/leads", tags=["Leads"])


# ----------------- Schemas -----------------

class LeadBase(BaseModel):
    customer_name: str
    customer_email: Optional[str] = ""
    customer_phone: Optional[str] = ""
    from_location: Optional[str] = ""           # origin city (e.g. Dubai)
    destinations: List[str] = []                # to-cities (e.g. ['Tokyo','Kyoto'])
    travel_date: Optional[str] = ""             # ISO YYYY-MM-DD
    proposal_name: Optional[str] = ""           # short headline (e.g. "Japan Alphine")
    trip_stage_note: Optional[str] = ""         # free-text agent note
    desk: Optional[str] = ""                    # team/desk label
    status: str = "open"                        # open | closed | converted
    follow_up_flag: bool = False                # manual follow-up marker


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    from_location: Optional[str] = None
    destinations: Optional[List[str]] = None
    travel_date: Optional[str] = None
    proposal_name: Optional[str] = None
    trip_stage_note: Optional[str] = None
    desk: Optional[str] = None
    status: Optional[str] = None
    follow_up_flag: Optional[bool] = None


class LeadResponse(LeadBase):
    id: str
    user_id: Optional[str] = None
    assigned_to_name: Optional[str] = ""
    proposal_id: Optional[str] = None
    booking_id: Optional[str] = None
    booking_ref: Optional[str] = None
    is_follow_up: bool = False                  # computed: 3-day rule OR flag
    days_to_travel: Optional[int] = None        # negative = past; null = no date
    created_at: str
    updated_at: Optional[str] = None
    last_action_at: Optional[str] = None


# ----------------- Helpers -----------------

def _compute_derived_fields(lead: dict) -> dict:
    """Compute is_follow_up + days_to_travel for a lead doc."""
    out = dict(lead)
    # days_to_travel
    days_to_travel = None
    td = (lead.get("travel_date") or "").strip()
    if td:
        try:
            d = datetime.strptime(td[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            days_to_travel = (d - now).days
        except (ValueError, TypeError):
            days_to_travel = None
    out["days_to_travel"] = days_to_travel

    # is_follow_up = manual flag OR (created > 3 days ago AND still open)
    is_fu = bool(lead.get("follow_up_flag"))
    if not is_fu and lead.get("status") == "open":
        ca = lead.get("created_at") or ""
        if ca:
            try:
                cdt = datetime.fromisoformat(ca.replace("Z", "+00:00"))
                age = datetime.now(timezone.utc) - cdt
                if age > timedelta(days=3):
                    is_fu = True
            except (ValueError, TypeError):
                pass
    out["is_follow_up"] = is_fu
    return out


# ----------------- Endpoints -----------------

@leads_router.post("", response_model=LeadResponse)
async def create_lead(payload: LeadCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "user_id": current_user.get("id"),
        "assigned_to_name": current_user.get("full_name") or "",
        "proposal_id": None,
        "booking_id": None,
        "booking_ref": None,
        "created_at": now,
        "updated_at": now,
        "last_action_at": now,
    })
    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    return LeadResponse(**_compute_derived_fields(doc))


@leads_router.get("", response_model=List[LeadResponse])
async def list_leads(
    current_user: dict = Depends(get_current_user),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    status: Optional[str] = Query(None),       # open | closed | converted | all
    desk: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tab: Optional[str] = Query(None),          # new | follow_up
):
    """Returns leads owned by current user (admins see all). Filters applied server-side."""
    q: dict = {}
    role = (current_user.get("role") or "agent").lower()
    if role not in ("admin", "staff"):
        q["user_id"] = current_user["id"]

    if status and status not in ("all", ""):
        q["status"] = status
    if desk and desk not in ("any", "all", ""):
        q["desk"] = desk
    if date_from or date_to:
        q["created_at"] = {}
        if date_from:
            q["created_at"]["$gte"] = date_from
        if date_to:
            # inclusive end-of-day
            q["created_at"]["$lte"] = date_to + "T23:59:59"
    if search:
        s = search.strip()
        if s:
            q["$or"] = [
                {"customer_name": {"$regex": s, "$options": "i"}},
                {"customer_email": {"$regex": s, "$options": "i"}},
                {"customer_phone": {"$regex": s, "$options": "i"}},
                {"proposal_name": {"$regex": s, "$options": "i"}},
            ]

    cursor = db.leads.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    leads = [_compute_derived_fields(d) for d in await cursor]

    # Tab filter (after derived fields are computed)
    if tab == "new":
        leads = [item for item in leads if item.get("status") == "open" and not item.get("is_follow_up")]
    elif tab == "follow_up":
        leads = [item for item in leads if item.get("is_follow_up")]

    return [LeadResponse(**item) for item in leads]


@leads_router.get("/stats")
async def leads_stats(current_user: dict = Depends(get_current_user)):
    """KPI snapshot: total / converted / conv_rate / last_txn_on."""
    q: dict = {}
    role = (current_user.get("role") or "agent").lower()
    if role not in ("admin", "staff"):
        q["user_id"] = current_user["id"]

    total = await db.leads.count_documents(q)
    converted = await db.leads.count_documents({**q, "status": "converted"})
    rate = round((converted / total) * 100) if total else 0

    last_txn_on: Optional[str] = None
    last_doc = await db.leads.find_one(
        {**q, "status": "converted"},
        {"_id": 0, "last_action_at": 1, "updated_at": 1},
        sort=[("last_action_at", -1)],
    )
    if last_doc:
        last_txn_on = last_doc.get("last_action_at") or last_doc.get("updated_at")

    # Tab counts
    open_q = {**q, "status": "open"}
    cursor = db.leads.find(open_q, {"_id": 0, "follow_up_flag": 1, "created_at": 1, "status": 1}).to_list(1000)
    open_leads = [_compute_derived_fields(d) for d in await cursor]
    new_count = sum(1 for item in open_leads if not item.get("is_follow_up"))
    follow_up_count = sum(1 for item in open_leads if item.get("is_follow_up"))

    return {
        "total": total,
        "converted": converted,
        "conv_rate": rate,
        "last_txn_on": last_txn_on,
        "new_count": new_count,
        "follow_up_count": follow_up_count,
    }


@leads_router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse(**_compute_derived_fields(lead))


@leads_router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, payload: LeadUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    now = datetime.now(timezone.utc).isoformat()
    update["updated_at"] = now
    update["last_action_at"] = now
    res = await db.leads.update_one({"id": lead_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return LeadResponse(**_compute_derived_fields(lead))


@leads_router.delete("/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.leads.delete_one({"id": lead_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}


@leads_router.post("/{lead_id}/convert")
async def convert_lead(
    lead_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """Mark a lead as converted, linking it to a proposal or booking."""
    proposal_id = body.get("proposal_id")
    booking_id = body.get("booking_id")
    booking_ref = body.get("booking_ref")
    now = datetime.now(timezone.utc).isoformat()
    res = await db.leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": "converted",
            "proposal_id": proposal_id,
            "booking_id": booking_id,
            "booking_ref": booking_ref,
            "updated_at": now,
            "last_action_at": now,
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}
