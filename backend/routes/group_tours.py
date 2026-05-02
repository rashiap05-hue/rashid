"""Group Tours (Eid Holiday Deals) — backend API.

Pricing model (May 2026):
- Each package now carries a structured `pricing` block with 5 tiers, every tier
  has both `supplier_cost` (B2B net rate, internal/accounting) and
  `display_price` (what the customer sees on the public Group Tours page):
    1. single_sharing        — Cost per adult on single sharing
    2. twin_double           — Cost per adult on twin / double sharing (default
                               headline rate)
    3. triple                — Cost per adult on triple sharing
    4. child_no_bed          — Cost per child 2-5 yrs without bed
    5. infant                — Cost per infant 0-2 yrs

The legacy `price_per_adult` + `child_age_rules` fields are retained as a
read-only computed projection (= `pricing.twin_double.display_price`) so the
public Group Tours card / detail page keeps working without a frontend migration.

Quote engine:
- Adult occupants in a room are billed at the matching occupancy tier
  (1 → single_sharing, 2 → twin_double, 3+ → triple).
- Children are billed by age band:  <2 → infant, 2-5 → child_no_bed, 6+ →
  twin_double rate (treated as additional adult — they require a bed).
- Tax (`tax_pct`) is applied on the gross subtotal.

Endpoints
---------
Public:
    GET  /api/group-tours                 — list all active packages
    GET  /api/group-tours/{id}            — detail
    POST /api/group-tours/{id}/quote      — server-side price calculation

Admin-only:
    POST   /api/group-tours               — create a package
    PUT    /api/group-tours/{id}          — update (merge) a package
    DELETE /api/group-tours/{id}          — delete a package
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from db import db, get_current_user

router = APIRouter(tags=["group-tours"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class PriceTier(BaseModel):
    """One price tier — supplier cost (B2B net) and the customer-facing display
    price (what the public Group Tours page shows)."""
    supplier_cost: float = 0.0
    display_price: float = 0.0


class PricingTiers(BaseModel):
    """Five fixed pricing tiers for a Group Tour package."""
    single_sharing: PriceTier = Field(default_factory=PriceTier)
    twin_double: PriceTier = Field(default_factory=PriceTier)
    triple: PriceTier = Field(default_factory=PriceTier)
    child_no_bed: PriceTier = Field(default_factory=PriceTier)
    infant: PriceTier = Field(default_factory=PriceTier)


class GroupTourPackageBase(BaseModel):
    title: str
    destination: str
    subtitle: str = ""
    nights: int = 4
    date_range: str = ""
    stars: int = 3
    pricing: PricingTiers = Field(default_factory=PricingTiers)
    tax_pct: float = 5.0
    image: str = ""
    gradient: str = "linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)"
    active: bool = True


class GroupTourPackageCreate(GroupTourPackageBase):
    pass


class GroupTourPackageUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    subtitle: Optional[str] = None
    nights: Optional[int] = None
    date_range: Optional[str] = None
    stars: Optional[int] = None
    pricing: Optional[PricingTiers] = None
    tax_pct: Optional[float] = None
    image: Optional[str] = None
    gradient: Optional[str] = None
    active: Optional[bool] = None


class GroupTourPackageResponse(GroupTourPackageBase):
    id: str
    # Legacy alias for the public Group Tours page — derived from
    # pricing.twin_double.display_price so existing UI keeps working.
    price_per_adult: float = 0.0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class QuoteRoomChild(BaseModel):
    age: str  # UI label like "<2 yrs", "5+ yrs", "12+ yrs"


class QuoteRoom(BaseModel):
    adults: int = 1
    children: List[QuoteRoomChild] = Field(default_factory=list)


class QuoteRequest(BaseModel):
    rooms: List[QuoteRoom]
    departure_date: Optional[str] = None
    leaving_from: Optional[str] = None


class QuoteLine(BaseModel):
    label: str
    count: int
    unit_price: float
    subtotal: float


class QuoteResponse(BaseModel):
    rooms: int
    adults: int
    children: int
    infants: int
    lines: List[QuoteLine]
    subtotal: float
    tax_pct: float
    tax_amount: float
    total: float


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_admin(user: dict) -> bool:
    return user and user.get("role") in ("admin", "staff")


def _parse_age_years(label: str) -> int:
    """Map a UI label like "<2 yrs" or "7+ yrs" to an integer age in years."""
    if not label:
        return 0
    s = str(label).strip()
    if s.startswith("<"):
        digits = "".join(ch for ch in s[1:] if ch.isdigit())
        return max(0, int(digits or 0) - 1)  # "<2 yrs" => treat as age 1
    digits = "".join(ch for ch in s if ch.isdigit())
    return int(digits) if digits else 0


def _migrate_legacy(pkg: dict) -> dict:
    """Ensure a package doc has a `pricing` block.

    Older docs only had a flat `price_per_adult` + `child_age_rules` array —
    upgrade them in-memory so the rest of the code paths can rely on
    `pricing` always being present.
    """
    if isinstance(pkg.get("pricing"), dict) and pkg["pricing"]:
        return pkg
    legacy_price = float(pkg.get("price_per_adult") or 0)
    pkg["pricing"] = {
        "single_sharing": {"supplier_cost": 0.0, "display_price": round(legacy_price * 1.30, 2)},
        "twin_double":    {"supplier_cost": 0.0, "display_price": legacy_price},
        "triple":         {"supplier_cost": 0.0, "display_price": round(legacy_price * 0.95, 2)},
        "child_no_bed":   {"supplier_cost": 0.0, "display_price": round(legacy_price * 0.75, 2)},
        "infant":         {"supplier_cost": 0.0, "display_price": 0.0},
    }
    return pkg


def _project_for_response(pkg: dict) -> dict:
    """Add the legacy `price_per_adult` derived field for the public response."""
    _migrate_legacy(pkg)
    pkg["price_per_adult"] = float(pkg["pricing"].get("twin_double", {}).get("display_price") or 0)
    pkg.pop("child_age_rules", None)  # no longer surfaced
    return pkg


def _adult_tier(pricing: dict, adults_in_room: int) -> dict:
    """Pick the right per-adult tier based on room occupancy."""
    if adults_in_room <= 1:
        return pricing.get("single_sharing", {}) or {}
    if adults_in_room == 2:
        return pricing.get("twin_double", {}) or {}
    return pricing.get("triple", {}) or {}


async def _seed_defaults_if_empty() -> None:
    """Populate the collection with the 4 Eid deals the first time we boot."""
    existing = await db.group_tour_packages.count_documents({})
    if existing:
        # Backfill any legacy doc that's missing the new pricing block.
        async for doc in db.group_tour_packages.find({"pricing": {"$exists": False}}, {"_id": 0, "id": 1, "price_per_adult": 1}):
            legacy = float(doc.get("price_per_adult") or 0)
            await db.group_tour_packages.update_one(
                {"id": doc["id"]},
                {"$set": {"pricing": {
                    "single_sharing": {"supplier_cost": 0.0, "display_price": round(legacy * 1.30, 2)},
                    "twin_double":    {"supplier_cost": 0.0, "display_price": legacy},
                    "triple":         {"supplier_cost": 0.0, "display_price": round(legacy * 0.95, 2)},
                    "child_no_bed":   {"supplier_cost": 0.0, "display_price": round(legacy * 0.75, 2)},
                    "infant":         {"supplier_cost": 0.0, "display_price": 0.0},
                }, "updated_at": _now()}, "$unset": {"child_age_rules": "", "price_per_adult": ""}},
            )
        return
    now = _now()

    def _tiers(twin: float) -> dict:
        return {
            "single_sharing": {"supplier_cost": round(twin * 1.10, 2), "display_price": round(twin * 1.30, 2)},
            "twin_double":    {"supplier_cost": round(twin * 0.85, 2), "display_price": twin},
            "triple":         {"supplier_cost": round(twin * 0.80, 2), "display_price": round(twin * 0.95, 2)},
            "child_no_bed":   {"supplier_cost": round(twin * 0.55, 2), "display_price": round(twin * 0.75, 2)},
            "infant":         {"supplier_cost": 0.0,                    "display_price": 0.0},
        }

    seed = [
        {"id": "baku-eid",    "title": "Baku Eid Break",    "destination": "Baku",
         "subtitle": "Baku 4 nights",    "nights": 4, "date_range": "24-31 May", "stars": 3,
         "pricing": _tiers(3293.0), "tax_pct": 5.0,
         "image": "https://images.unsplash.com/photo-1601823984263-b87b59798b70?w=800&q=80&auto=format&fit=crop",
         "gradient": "linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)"},
        {"id": "tbilisi-eid", "title": "Tbilisi Eid Break", "destination": "Tbilisi",
         "subtitle": "Tbilisi 4 nights", "nights": 4, "date_range": "24-31 May", "stars": 5,
         "pricing": _tiers(3544.0), "tax_pct": 5.0,
         "image": "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80&auto=format&fit=crop",
         "gradient": "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)"},
        {"id": "almaty-eid",  "title": "Almaty Eid Break",  "destination": "Almaty",
         "subtitle": "Almaty 5 nights",  "nights": 5, "date_range": "24-31 May", "stars": 4,
         "pricing": _tiers(3738.0), "tax_pct": 5.0,
         "image": "https://images.unsplash.com/photo-1588615419957-3f1bfe5f29d7?w=800&q=80&auto=format&fit=crop",
         "gradient": "linear-gradient(135deg, #10b981 0%, #065f46 100%)"},
        {"id": "armenia-eid", "title": "Armenia Eid Break", "destination": "Yerevan",
         "subtitle": "Yerevan 4 nights", "nights": 4, "date_range": "24-31 May", "stars": 3,
         "pricing": _tiers(3766.0), "tax_pct": 5.0,
         "image": "https://images.unsplash.com/photo-1615460549969-36fa19521a4f?w=800&q=80&auto=format&fit=crop",
         "gradient": "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)"},
    ]
    for doc in seed:
        doc["active"] = True
        doc["created_at"] = now
        doc["updated_at"] = now
    await db.group_tour_packages.insert_many(seed)


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------
@router.get("/group-tours", response_model=List[GroupTourPackageResponse])
async def list_group_tours():
    await _seed_defaults_if_empty()
    docs = await db.group_tour_packages.find({"active": True}, {"_id": 0}).to_list(500)
    return [_project_for_response(d) for d in docs]


@router.get("/group-tours/{pkg_id}", response_model=GroupTourPackageResponse)
async def get_group_tour(pkg_id: str):
    await _seed_defaults_if_empty()
    doc = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Package not found")
    return _project_for_response(doc)


@router.post("/group-tours/{pkg_id}/quote", response_model=QuoteResponse)
async def quote_group_tour(pkg_id: str, req: QuoteRequest):
    pkg = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    _migrate_legacy(pkg)

    pricing = pkg.get("pricing") or {}
    tax_pct = float(pkg.get("tax_pct") or 0)

    # Aggregations for the line-items table
    line_buckets = {
        "single_adults": {"label": "Adults — Single sharing", "count": 0, "subtotal": 0.0, "unit": 0.0},
        "twin_adults":   {"label": "Adults — Twin / Double sharing", "count": 0, "subtotal": 0.0, "unit": 0.0},
        "triple_adults": {"label": "Adults — Triple sharing", "count": 0, "subtotal": 0.0, "unit": 0.0},
        "child_no_bed":  {"label": "Children (2-5 yrs, no bed)", "count": 0, "subtotal": 0.0, "unit": 0.0},
        "infant":        {"label": "Infants (0-2 yrs)", "count": 0, "subtotal": 0.0, "unit": 0.0},
        "child_adult":   {"label": "Children (6+ yrs, with bed)", "count": 0, "subtotal": 0.0, "unit": 0.0},
    }
    total_adults = 0
    total_children = 0
    total_infants = 0

    for room in (req.rooms or []):
        adults = max(0, int(room.adults or 0))
        total_adults += adults
        tier = _adult_tier(pricing, adults if adults else 1)
        unit = float(tier.get("display_price") or 0)
        if adults:
            if adults == 1:
                bucket = line_buckets["single_adults"]
            elif adults == 2:
                bucket = line_buckets["twin_adults"]
            else:
                bucket = line_buckets["triple_adults"]
            bucket["count"] += adults
            bucket["subtotal"] += unit * adults
            bucket["unit"] = unit

        for ch in (room.children or []):
            age = _parse_age_years(ch.age)
            if age < 2:
                t = pricing.get("infant", {}) or {}
                u = float(t.get("display_price") or 0)
                line_buckets["infant"]["count"] += 1
                line_buckets["infant"]["subtotal"] += u
                line_buckets["infant"]["unit"] = u
                total_infants += 1
            elif age <= 5:
                t = pricing.get("child_no_bed", {}) or {}
                u = float(t.get("display_price") or 0)
                line_buckets["child_no_bed"]["count"] += 1
                line_buckets["child_no_bed"]["subtotal"] += u
                line_buckets["child_no_bed"]["unit"] = u
                total_children += 1
            else:
                # 6+ yrs needs a bed → twin/double rate (acts like another adult)
                t = pricing.get("twin_double", {}) or {}
                u = float(t.get("display_price") or 0)
                line_buckets["child_adult"]["count"] += 1
                line_buckets["child_adult"]["subtotal"] += u
                line_buckets["child_adult"]["unit"] = u
                total_children += 1

    lines: List[QuoteLine] = []
    for b in line_buckets.values():
        if b["count"] > 0:
            lines.append(QuoteLine(
                label=b["label"],
                count=b["count"],
                unit_price=round(b["unit"], 2),
                subtotal=round(b["subtotal"], 2),
            ))

    subtotal = sum(b["subtotal"] for b in line_buckets.values())
    tax_amount = round(subtotal * tax_pct / 100.0, 2)
    total = round(subtotal + tax_amount, 2)

    return QuoteResponse(
        rooms=len(req.rooms or []),
        adults=total_adults,
        children=total_children,
        infants=total_infants,
        lines=lines,
        subtotal=round(subtotal, 2),
        tax_pct=tax_pct,
        tax_amount=tax_amount,
        total=total,
    )


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------
@router.post("/group-tours", response_model=GroupTourPackageResponse)
async def create_group_tour(body: GroupTourPackageCreate, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    now = _now()
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now
    doc["updated_at"] = now
    await db.group_tour_packages.insert_one(doc)
    doc.pop("_id", None)
    return _project_for_response(doc)


@router.put("/group-tours/{pkg_id}", response_model=GroupTourPackageResponse)
async def update_group_tour(pkg_id: str, body: GroupTourPackageUpdate, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    existing = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Package not found")
    update = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    update["updated_at"] = _now()
    await db.group_tour_packages.update_one({"id": pkg_id}, {"$set": update})
    fresh = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    return _project_for_response(fresh)


@router.delete("/group-tours/{pkg_id}")
async def delete_group_tour(pkg_id: str, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    res = await db.group_tour_packages.delete_one({"id": pkg_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"success": True, "deleted": pkg_id}
