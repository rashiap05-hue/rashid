"""Group Tours (Eid Holiday Deals) — backend API.

Moves what was previously hardcoded in the React GroupTours pages into a managed
MongoDB collection so operations can update price, child-age multipliers, tax
percentage, title, destination, nights, date range, stars and cover image from
the Admin Dashboard.

Endpoints
---------
Public:
    GET /api/group-tours                 — list all active packages
    GET /api/group-tours/{id}            — detail
    POST /api/group-tours/{id}/quote     — server-side price calculation

Admin-only:
    POST /api/group-tours                — create a package
    PUT /api/group-tours/{id}            — update (merge) a package
    DELETE /api/group-tours/{id}         — delete a package
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
class ChildAgeRule(BaseModel):
    """Pricing rule for a child-age bracket.

    `min_age` / `max_age` are inclusive-exclusive integers (e.g. 2..12 means
    2 yrs up to and NOT including 12). Set `max_age=None` for the top bracket.
    """
    label: str                       # e.g. "<2 yrs", "2-11 yrs", "12+ yrs"
    min_age: int = 0
    max_age: Optional[int] = None
    multiplier: float = 1.0          # 0 = free, 0.75 = 75%, 1.0 = adult rate


DEFAULT_CHILD_RULES: List[ChildAgeRule] = [
    ChildAgeRule(label="<2 yrs", min_age=0, max_age=2, multiplier=0.0),
    ChildAgeRule(label="2-11 yrs", min_age=2, max_age=12, multiplier=0.75),
    ChildAgeRule(label="12+ yrs", min_age=12, max_age=None, multiplier=1.0),
]


class GroupTourPackageBase(BaseModel):
    title: str
    destination: str                 # e.g. "Baku", "Tbilisi"
    subtitle: str = ""               # e.g. "Baku 4 nights"
    nights: int = 4
    date_range: str = ""             # e.g. "24-31 May"
    stars: int = 3                   # 1..5
    price_per_adult: float = 0.0     # base AED rate per adult
    tax_pct: float = 5.0             # 0..100
    child_age_rules: List[ChildAgeRule] = Field(default_factory=lambda: [r.copy() for r in DEFAULT_CHILD_RULES])
    image: str = ""                  # https URL
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
    price_per_adult: Optional[float] = None
    tax_pct: Optional[float] = None
    child_age_rules: Optional[List[ChildAgeRule]] = None
    image: Optional[str] = None
    gradient: Optional[str] = None
    active: Optional[bool] = None


class GroupTourPackageResponse(GroupTourPackageBase):
    id: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class QuoteRoomChild(BaseModel):
    age: str                         # Matches one of the rule labels (e.g. "5+ yrs")


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


def _pick_rule(age_yrs: int, rules: List[ChildAgeRule]) -> ChildAgeRule:
    """Return the first rule whose [min_age, max_age) range contains age_yrs.
    Falls back to a 75% child multiplier if none match."""
    for r in rules:
        lo = r.min_age or 0
        hi = r.max_age if r.max_age is not None else 9999
        if lo <= age_yrs < hi:
            return r
    return ChildAgeRule(label=f"{age_yrs}+ yrs", min_age=age_yrs, max_age=None, multiplier=0.75)


async def _seed_defaults_if_empty() -> None:
    """Populate the collection with the 4 Eid deals the first time we boot."""
    existing = await db.group_tour_packages.count_documents({})
    if existing:
        return
    now = _now()
    seed = [
        {
            "id": "baku-eid", "title": "Baku Eid Break", "destination": "Baku",
            "subtitle": "Baku 4 nights", "nights": 4, "date_range": "24-31 May",
            "stars": 3, "price_per_adult": 3293.0, "tax_pct": 5.0,
            "image": "https://images.unsplash.com/photo-1601823984263-b87b59798b70?w=800&q=80&auto=format&fit=crop",
            "gradient": "linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)",
        },
        {
            "id": "tbilisi-eid", "title": "Tbilisi Eid Break", "destination": "Tbilisi",
            "subtitle": "Tbilisi 4 nights", "nights": 4, "date_range": "24-31 May",
            "stars": 5, "price_per_adult": 3544.0, "tax_pct": 5.0,
            "image": "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80&auto=format&fit=crop",
            "gradient": "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
        },
        {
            "id": "almaty-eid", "title": "Almaty Eid Break", "destination": "Almaty",
            "subtitle": "Almaty 5 nights", "nights": 5, "date_range": "24-31 May",
            "stars": 4, "price_per_adult": 3738.0, "tax_pct": 5.0,
            "image": "https://images.unsplash.com/photo-1588615419957-3f1bfe5f29d7?w=800&q=80&auto=format&fit=crop",
            "gradient": "linear-gradient(135deg, #10b981 0%, #065f46 100%)",
        },
        {
            "id": "armenia-eid", "title": "Armenia Eid Break", "destination": "Yerevan",
            "subtitle": "Yerevan 4 nights", "nights": 4, "date_range": "24-31 May",
            "stars": 3, "price_per_adult": 3766.0, "tax_pct": 5.0,
            "image": "https://images.unsplash.com/photo-1615460549969-36fa19521a4f?w=800&q=80&auto=format&fit=crop",
            "gradient": "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)",
        },
    ]
    for doc in seed:
        doc["child_age_rules"] = [r.dict() for r in DEFAULT_CHILD_RULES]
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
    return docs


@router.get("/group-tours/{pkg_id}", response_model=GroupTourPackageResponse)
async def get_group_tour(pkg_id: str):
    await _seed_defaults_if_empty()
    doc = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Package not found")
    return doc


@router.post("/group-tours/{pkg_id}/quote", response_model=QuoteResponse)
async def quote_group_tour(pkg_id: str, req: QuoteRequest):
    pkg = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    base = float(pkg.get("price_per_adult") or 0)
    tax_pct = float(pkg.get("tax_pct") or 0)
    raw_rules = pkg.get("child_age_rules") or [r.dict() for r in DEFAULT_CHILD_RULES]
    rules = [ChildAgeRule(**r) for r in raw_rules]

    total_adults = 0
    total_children = 0    # paid children (multiplier > 0 and < 1 is considered child; 1.0 rolls into adult; 0 rolls into infant)
    total_infants = 0
    adults_subtotal = 0.0
    child_subtotal = 0.0

    for room in (req.rooms or []):
        total_adults += max(0, int(room.adults or 0))
        adults_subtotal += max(0, int(room.adults or 0)) * base
        for ch in (room.children or []):
            age = _parse_age_years(ch.age)
            rule = _pick_rule(age, rules)
            m = float(rule.multiplier or 0)
            if m <= 0:
                total_infants += 1
            elif m >= 1:
                total_adults += 1
                adults_subtotal += base
            else:
                total_children += 1
                child_subtotal += base * m

    lines: List[QuoteLine] = []
    if total_adults:
        lines.append(QuoteLine(label=f"Adults × AED {int(base):,}", count=total_adults, unit_price=base, subtotal=round(adults_subtotal, 2)))
    if total_children:
        lines.append(QuoteLine(label="Children (2-11 yrs, 75% of adult)", count=total_children, unit_price=round(base * 0.75, 2), subtotal=round(child_subtotal, 2)))
    if total_infants:
        lines.append(QuoteLine(label="Infants (<2 yrs) — complimentary", count=total_infants, unit_price=0.0, subtotal=0.0))

    subtotal = adults_subtotal + child_subtotal
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
    return doc


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
    return fresh


@router.delete("/group-tours/{pkg_id}")
async def delete_group_tour(pkg_id: str, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    res = await db.group_tour_packages.delete_one({"id": pkg_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"success": True, "deleted": pkg_id}
