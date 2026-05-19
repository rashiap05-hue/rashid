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

import base64
import html as html_lib
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from weasyprint import HTML

from db import db, get_current_user
from routes.pdf_generator import resolve_image

logger = logging.getLogger(__name__)

router = APIRouter(tags=["group-tours"])

# Travo brand logo — embedded as base64 data URL so WeasyPrint renders it offline.
_LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "travo_logo.png")
try:
    with open(_LOGO_PATH, "rb") as _lf:
        _LOGO_DATA_URL = "data:image/png;base64," + base64.b64encode(_lf.read()).decode("ascii")
except Exception as _e:  # pragma: no cover
    logger.warning("Travo logo not loaded from %s: %s", _LOGO_PATH, _e)
    _LOGO_DATA_URL = ""


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


class ActivityRef(BaseModel):
    """Lightweight reference to an activity, denormalised for quick display."""
    id: str
    name: str = ""
    image: str = ""               # primary thumbnail URL (denormalised from the activity catalog)
    sub: str = ""                 # display sub-line e.g. "Almaty · Kazakhstan · 5 hrs"
    duration: str = ""            # raw duration e.g. "5 hrs" (when available)


class ItineraryDay(BaseModel):
    day: int = 1
    title: str = ""
    desc: str = ""
    meals: List[str] = Field(default_factory=list)   # subset of ["B", "L", "D"]
    hotel_note: str = ""
    activity_id: Optional[str] = None                # legacy single-activity (mirrored from activities[0])
    activity_name: Optional[str] = None              # legacy denormalised name
    activities: List[ActivityRef] = Field(default_factory=list)  # up to 5 linked activities per day
    transfer_id: Optional[str] = None                # optional reference to /transfers catalog
    transfer_label: Optional[str] = None             # denormalized e.g. "Airport → Hotel (Sedan)"
    date: Optional[str] = None                       # ISO date "YYYY-MM-DD" (optional manual override)
    images: List[str] = Field(default_factory=list)  # up to 5 images; index 0 = primary


class HotelRow(BaseModel):
    name: str = ""
    stars: int = 3
    nights: int = 1
    room_type: str = "Standard Room"
    meal_plan: str = "Bed & Breakfast"
    image: str = ""                                  # legacy single-image field (kept in sync with images[0])
    images: List[str] = Field(default_factory=list)  # up to 5 images; index 0 = primary
    hotel_id: Optional[str] = None                   # optional reference to /hotels catalog
    check_in_time: str = ""                          # blank → frontend defaults to "3:00 PM"
    check_out_time: str = ""                         # blank → frontend defaults to "12:00 PM"
    check_in_date: str = ""                          # ISO YYYY-MM-DD; blank → derived from itinerary
    check_out_date: str = ""                         # ISO YYYY-MM-DD; blank → derived from itinerary


class TransferRow(BaseModel):
    transfer_id: Optional[str] = None                # optional reference to /transfers catalog
    label: str = ""                                  # display label e.g. "Airport → Hotel (Sedan)"
    from_location: str = ""
    to_location: str = ""
    vehicle_type: str = ""
    note: str = ""


class FlightSegment(BaseModel):
    """One flight leg shown in the Group Tour Flights tab.

    Mirrors the structured card layout from the brochure (airline + flight #,
    departure timestamp + airport/terminal, duration, arrival timestamp +
    airport, fare class / baggage / meals / cabin).
    """
    airline: str = ""               # "Air Arabia"
    airline_logo: str = ""          # optional URL; falls back to a generic plane icon
    flight_number: str = ""         # "G9-253"
    from_city: str = ""             # "Sharjah"
    from_airport: str = ""          # "Sharjah Airport"
    from_code: str = ""             # "SHJ"
    from_terminal: str = ""         # "1" or "" — appended as "Term…"
    to_city: str = ""               # "Almaty"
    to_airport: str = ""            # "Almaty Airport"
    to_code: str = ""               # "ALA"
    to_terminal: str = ""
    departure_date: str = ""        # ISO "YYYY-MM-DD"
    departure_time: str = ""        # "20:45" (24h) — frontend formats to AM/PM
    arrival_date: str = ""          # ISO "YYYY-MM-DD"
    arrival_time: str = ""          # "02:30"
    duration: str = ""              # "3h 10m"
    fare: str = "Basic"
    baggage: str = "20 kg"
    meals: str = "At Extra Cost"
    cabin: str = "Economy"


class GroupTourPackageBase(BaseModel):
    title: str
    destination: str
    subtitle: str = ""
    nights: int = 4
    date_range: str = ""
    stars: int = 3
    pricing: PricingTiers = Field(default_factory=PricingTiers)
    tax_pct: float = 0.0
    target_margin_pct: float = 25.0  # used to compute "Suggested Display Price" hints
    image: str = ""                                  # legacy single-image (kept in sync with images[0])
    images: List[str] = Field(default_factory=list)  # up to 5 cover images; index 0 = primary
    gradient: str = "linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)"
    active: bool = True

    # Booking-card settings (control the public "Book your trip" form)
    departure_cities: List[str] = Field(default_factory=list)  # allowed "Leaving From" options; empty → default list
    travel_window_start: Optional[str] = None  # ISO "YYYY-MM-DD" — min date for the picker
    travel_window_end: Optional[str] = None    # ISO "YYYY-MM-DD" — max date for the picker

    # Rich itinerary content (editable from Admin → Group Tours)
    intro_paragraph: str = ""
    highlights: List[str] = Field(default_factory=list)
    itinerary: List[ItineraryDay] = Field(default_factory=list)
    hotels: List[HotelRow] = Field(default_factory=list)
    transfers: List[TransferRow] = Field(default_factory=list)
    inclusions: Dict[str, List[str]] = Field(default_factory=dict)
    exclusions: List[str] = Field(default_factory=list)
    what_to_expect: List[str] = Field(default_factory=list)
    terms_and_conditions: str = ""   # rich-text HTML shown on the public "Terms" tab
    flights: List[FlightSegment] = Field(default_factory=list)  # structured cards on Flights tab
    insurance: Optional[Dict[str, Any]] = Field(
        default_factory=lambda: {"included": False, "country": "", "custom_price_per_person": None, "description": ""}
    )


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
    target_margin_pct: Optional[float] = None
    image: Optional[str] = None
    images: Optional[List[str]] = None
    gradient: Optional[str] = None
    active: Optional[bool] = None
    intro_paragraph: Optional[str] = None
    highlights: Optional[List[str]] = None
    itinerary: Optional[List[ItineraryDay]] = None
    hotels: Optional[List[HotelRow]] = None
    transfers: Optional[List[TransferRow]] = None
    inclusions: Optional[Dict[str, List[str]]] = None
    exclusions: Optional[List[str]] = None
    what_to_expect: Optional[List[str]] = None
    terms_and_conditions: Optional[str] = None
    departure_cities: Optional[List[str]] = None
    travel_window_start: Optional[str] = None
    travel_window_end: Optional[str] = None
    flights: Optional[List[FlightSegment]] = None
    insurance: Optional[Dict[str, Any]] = None


class GroupTourPackageResponse(GroupTourPackageBase):
    id: str
    # Legacy alias for the public Group Tours page — derived from
    # pricing.twin_double.display_price so existing UI keeps working.
    price_per_adult: float = 0.0
    # Resolved per-traveller travel insurance cost (AED). 0 when not bundled.
    # The frontend rolls this into the displayed prices and shows an
    # "Inclusive of travel insurance" pill when > 0.
    insurance_per_pax: float = 0.0
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


def _default_rich_content(destination: str, nights: int, image: str) -> dict:
    """Generate sensible default content for a Group Tour package so that
    newly created/seeded packages are never blank. Ops can later override any
    section from the Admin editor."""
    dest = destination or "your destination"
    return {
        "intro_paragraph": f"This trip by Travo Tours is a handpicked experience featuring {dest}. Enjoy panoramic landscapes, cultural landmarks, and comfortable stays in boutique hotels.",
        "highlights": [
            f"Discover the Top Attractions of {dest} with a Licensed Tour Guide",
            "Dive into Local Culture — Traditional Food, Arts & Architecture",
            "Enjoy Comfortable Stays at 3–5 Star Hotels with Daily Breakfast",
            "Seamless Private Arrival & Departure Airport Transfers",
            "Scenic Day Tours Including Local Landmarks and Hidden Gems",
            "Shopping & Leisure Time at the Most Famous Bazaars & Malls",
        ],
        "itinerary": [
            {"day": 1, "title": f"Arrival in {dest}", "desc": f"On arrival at {dest} International Airport, our representative will welcome you and transfer you to the hotel for check-in. Relax and spend the evening at leisure. Enjoy dinner at your leisure before retiring for the night.", "meals": ["D"], "hotel_note": "Check-in to the hotel"},
            {"day": 2, "title": f"Full Day {dest} City Tour", "desc": f"After breakfast, embark on a guided {dest} city tour covering the Old City, cultural landmarks, religious monuments and viewpoints with panoramic city vistas. Enjoy lunch at a traditional restaurant before heading back to the hotel.", "meals": ["B", "L"], "hotel_note": f"Overnight stay at hotel in {dest}"},
            {"day": 3, "title": "Day Trip to Mountains & Countryside", "desc": f"Full-day excursion to the countryside. Visit UNESCO-listed heritage sites, natural reservoirs, tea gardens and enjoy cable-car rides with stunning mountain views. Return to {dest} for a relaxed evening.", "meals": ["B", "L"], "hotel_note": f"Overnight stay at hotel in {dest}"},
            {"day": 4, "title": "Shopping & Leisure Day", "desc": "Morning is at leisure for personal activities. In the afternoon, a guided shopping tour at the most popular malls, handicraft streets and bazaars. Evening dinner at a traditional restaurant with live music & cultural performance.", "meals": ["B", "D"], "hotel_note": f"Overnight stay at hotel in {dest}"},
            *([{"day": 5, "title": f"Optional Tour - {dest} Night Experience", "desc": "Optional evening tour including rooftop city viewpoints, night cruise and dinner at a signature local restaurant. Overnight back at hotel.", "meals": ["B"], "hotel_note": f"Overnight stay at hotel in {dest}"}] if nights >= 5 else []),
            {"day": nights + 1, "title": f"Departure from {dest}", "desc": f"After breakfast at the hotel, check-out at the scheduled time. Our representative will transfer you to {dest} International Airport for your return flight home.", "meals": ["B"], "hotel_note": ""},
        ],
        "hotels": [
            {"name": f"Park Inn by Radisson {dest} or similar", "stars": 4, "nights": nights, "room_type": "Standard Twin Room", "meal_plan": "Bed & Breakfast", "image": image or ""},
        ],
        "inclusions": {
            "Accommodation": [
                f"{nights} nights' accommodation at selected hotels",
                "Daily buffet breakfast at the hotel",
                "Check-in from 14:00 hrs & Check-out until 12:00 hrs",
            ],
            "Transfers": [
                "Private airport pick-up on arrival",
                "Private airport drop-off on departure",
                "All inter-city transfers by A/C private vehicle",
            ],
            "Sightseeing": [
                f"Full Day {dest} City Tour with guide",
                "Day trip with entrance fees as per itinerary",
                "Professional English-speaking tour guide",
            ],
            "Miscellaneous": [
                "All applicable taxes and service charges",
                "Tourist tax included in hotel rate",
            ],
        },
        "exclusions": [
            "International airfare (Tickets can be booked separately)",
            "Visa fees and travel insurance",
            "Lunches and dinners unless specified",
            "Any optional tours, personal expenses, tips and gratuities",
        ],
        "what_to_expect": [
            f"Travelers will be met by our airport representative at the arrival terminal of {dest}'s International Airport. Please allow some time after immigration before proceeding to the airport meet & greet point. Our representative will carry a Travo Tours name sign for easy identification.",
            "Timings for arrival and departure will be confirmed by our local partner. Travelers are requested to check the itinerary carefully and revert to us with any concerns within 48 hours of receiving the document.",
            "All hotels are subject to availability at the time of booking. In the event a specific hotel is unavailable, we will book a similar category hotel. You will be notified of any change prior to booking confirmation.",
            "Please note that during special events, festivals or local holidays some attractions may be closed. Your guide will offer suitable alternative activities if such a situation arises during your trip.",
        ],
    }


def _migrate_legacy(pkg: dict) -> dict:
    """Ensure a package doc has a `pricing` block.

    Older docs only had a flat `price_per_adult` + `child_age_rules` array —
    upgrade them in-memory so the rest of the code paths can rely on
    `pricing` always being present.
    """
    if isinstance(pkg.get("pricing"), dict) and pkg["pricing"]:
        # Pricing already migrated — now make sure rich content fields exist
        if not pkg.get("highlights") and not pkg.get("itinerary"):
            defaults = _default_rich_content(pkg.get("destination") or pkg.get("title", ""), int(pkg.get("nights") or 4), pkg.get("image") or "")
            for k, v in defaults.items():
                pkg.setdefault(k, v)
        return pkg
    legacy_price = float(pkg.get("price_per_adult") or 0)
    pkg["pricing"] = {
        "single_sharing": {"supplier_cost": 0.0, "display_price": round(legacy_price * 1.30, 2)},
        "twin_double":    {"supplier_cost": 0.0, "display_price": legacy_price},
        "triple":         {"supplier_cost": 0.0, "display_price": round(legacy_price * 0.95, 2)},
        "child_no_bed":   {"supplier_cost": 0.0, "display_price": round(legacy_price * 0.75, 2)},
        "infant":         {"supplier_cost": 0.0, "display_price": 0.0},
    }
    # Also backfill rich content for fully-legacy docs
    defaults = _default_rich_content(pkg.get("destination") or pkg.get("title", ""), int(pkg.get("nights") or 4), pkg.get("image") or "")
    for k, v in defaults.items():
        pkg.setdefault(k, v)
    return pkg


def _sync_image_fields(pkg: dict) -> None:
    """Keep the legacy `image: str` field in sync with `images: List[str]` across
    the top-level package, every hotel row, and every itinerary day.

    Rules:
    - If `images` is a non-empty list, set `image = images[0]`.
    - If `images` is empty/missing but `image` is set, backfill `images = [image]`.
    - Otherwise leave both empty.
    This runs on both writes (before insert/update) and reads (after fetch) so
    old docs without `images` automatically surface as a 1-image list to the UI.
    """
    def _sync_one(obj: dict) -> None:
        imgs = obj.get("images")
        if isinstance(imgs, list):
            imgs = [str(x).strip() for x in imgs if x and str(x).strip()]
        else:
            imgs = []
        legacy = (obj.get("image") or "").strip()
        if imgs:
            obj["images"] = imgs[:5]  # enforce max 5
            obj["image"] = obj["images"][0]
        elif legacy:
            obj["images"] = [legacy]
            obj["image"] = legacy
        else:
            obj["images"] = []
            obj["image"] = ""

    _sync_one(pkg)
    for h in (pkg.get("hotels") or []):
        if isinstance(h, dict):
            _sync_one(h)
    for d in (pkg.get("itinerary") or []):
        if isinstance(d, dict):
            imgs = d.get("images")
            if isinstance(imgs, list):
                imgs = [str(x).strip() for x in imgs if x and str(x).strip()][:5]
            else:
                imgs = []
            d["images"] = imgs

            # Sync activities[] <-> legacy single activity_id/activity_name (max 5)
            acts = d.get("activities")
            if isinstance(acts, list):
                cleaned = []
                for a in acts:
                    if isinstance(a, dict) and a.get("id"):
                        cleaned.append({
                            "id": str(a["id"]),
                            "name": str(a.get("name") or ""),
                            "image": str(a.get("image") or ""),
                            "sub": str(a.get("sub") or ""),
                            "duration": str(a.get("duration") or ""),
                        })
                acts = cleaned[:5]
            else:
                acts = []
            legacy_id = d.get("activity_id")
            legacy_name = d.get("activity_name") or ""
            if acts:
                d["activities"] = acts
                d["activity_id"] = acts[0]["id"]
                d["activity_name"] = acts[0]["name"] or legacy_name
            elif legacy_id:
                d["activities"] = [{"id": str(legacy_id), "name": legacy_name, "image": "", "sub": "", "duration": ""}]
            else:
                d["activities"] = []


def _project_for_response(pkg: dict) -> dict:
    """Add the legacy `price_per_adult` derived field for the public response."""
    _migrate_legacy(pkg)
    _sync_image_fields(pkg)
    pkg["price_per_adult"] = float(pkg["pricing"].get("twin_double", {}).get("display_price") or 0)
    pkg.pop("child_age_rules", None)  # no longer surfaced
    return pkg


async def _enrich_itinerary_activities(pkg: dict) -> None:
    """Look up each itinerary day's activity ids in the `activities` collection
    and inject a short preview (`sub`) + `duration` so the public detail page can
    render rich inline activity cards (matching the brochure PDF layout).

    Mutates `pkg` in place. Activities not found in the catalog keep whatever
    fields the admin saved (name/image only). Safe no-op when no activities.
    """
    days = pkg.get("itinerary") or []
    ids = {a.get("id") for d in days for a in (d.get("activities") or []) if a and a.get("id")}
    if not ids:
        return
    cursor = db.activities.find(
        {"id": {"$in": list(ids)}},
        {"_id": 0, "id": 1, "description": 1, "duration": 1, "images": 1},
    )
    catalog: Dict[str, dict] = {a["id"]: a async for a in cursor}
    for d in days:
        for a in (d.get("activities") or []):
            if not a or not a.get("id"):
                continue
            cat = catalog.get(a["id"])
            if not cat:
                continue
            # Always replace `sub` with the catalog description preview — much
            # more informative than the legacy location/duration string.
            desc = (cat.get("description") or "").strip()
            if desc:
                a["sub"] = desc[:200] + ("…" if len(desc) > 200 else "")
            if not a.get("duration") and cat.get("duration"):
                a["duration"] = cat["duration"]
            if not a.get("image") and cat.get("images"):
                a["image"] = cat["images"][0] if cat["images"] else ""


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
        async for doc in db.group_tour_packages.find({"pricing": {"$exists": False}}, {"_id": 0, "id": 1, "price_per_adult": 1, "destination": 1, "nights": 1, "image": 1}):
            legacy = float(doc.get("price_per_adult") or 0)
            rich = _default_rich_content(doc.get("destination") or "", int(doc.get("nights") or 4), doc.get("image") or "")
            await db.group_tour_packages.update_one(
                {"id": doc["id"]},
                {"$set": {
                    "pricing": {
                        "single_sharing": {"supplier_cost": 0.0, "display_price": round(legacy * 1.30, 2)},
                        "twin_double":    {"supplier_cost": 0.0, "display_price": legacy},
                        "triple":         {"supplier_cost": 0.0, "display_price": round(legacy * 0.95, 2)},
                        "child_no_bed":   {"supplier_cost": 0.0, "display_price": round(legacy * 0.75, 2)},
                        "infant":         {"supplier_cost": 0.0, "display_price": 0.0},
                    },
                    "updated_at": _now(),
                    **rich,
                }, "$unset": {"child_age_rules": "", "price_per_adult": ""}},
            )
        # Second pass: packages that have pricing but still missing rich content
        async for doc in db.group_tour_packages.find(
            {"$or": [{"itinerary": {"$exists": False}}, {"itinerary": {"$size": 0}}]},
            {"_id": 0, "id": 1, "destination": 1, "nights": 1, "image": 1},
        ):
            rich = _default_rich_content(doc.get("destination") or "", int(doc.get("nights") or 4), doc.get("image") or "")
            await db.group_tour_packages.update_one({"id": doc["id"]}, {"$set": {**rich, "updated_at": _now()}})
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

    raw_seed = [
        {"id": "baku-eid",    "title": "Baku Eid Break",    "destination": "Baku",
         "subtitle": "Baku 4 nights",    "nights": 4, "date_range": "24-31 May", "stars": 3,
         "pricing": _tiers(3293.0), "tax_pct": 0.0,
         "image": "https://images.unsplash.com/photo-1601823984263-b87b59798b70?w=800&q=80&auto=format&fit=crop",
         "gradient": "linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)"},
        {"id": "tbilisi-eid", "title": "Tbilisi Eid Break", "destination": "Tbilisi",
         "subtitle": "Tbilisi 4 nights", "nights": 4, "date_range": "24-31 May", "stars": 5,
         "pricing": _tiers(3544.0), "tax_pct": 0.0,
         "image": "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80&auto=format&fit=crop",
         "gradient": "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)"},
        {"id": "almaty-eid",  "title": "Almaty Eid Break",  "destination": "Almaty",
         "subtitle": "Almaty 5 nights",  "nights": 5, "date_range": "24-31 May", "stars": 4,
         "pricing": _tiers(3738.0), "tax_pct": 0.0,
         "image": "https://images.unsplash.com/photo-1588615419957-3f1bfe5f29d7?w=800&q=80&auto=format&fit=crop",
         "gradient": "linear-gradient(135deg, #10b981 0%, #065f46 100%)"},
        {"id": "armenia-eid", "title": "Armenia Eid Break", "destination": "Yerevan",
         "subtitle": "Yerevan 4 nights", "nights": 4, "date_range": "24-31 May", "stars": 3,
         "pricing": _tiers(3766.0), "tax_pct": 0.0,
         "image": "https://images.unsplash.com/photo-1615460549969-36fa19521a4f?w=800&q=80&auto=format&fit=crop",
         "gradient": "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)"},
    ]
    seed = []
    for doc in raw_seed:
        rich = _default_rich_content(doc["destination"], doc["nights"], doc.get("image") or "")
        seed.append({**doc, **rich, "active": True, "created_at": now, "updated_at": now})
    await db.group_tour_packages.insert_many(seed)


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------
@router.get("/group-tours", response_model=List[GroupTourPackageResponse])
async def list_group_tours(include_inactive: bool = False):
    """
    By default returns only packages marked `active=True` (used by the public
    Group Tours listing page).
    Pass `?include_inactive=true` to fetch *all* packages — used by the admin
    dashboard so ops can see and re-enable packages that were accidentally
    deactivated (otherwise a hidden package would disappear from the admin list
    too and become unreachable via the UI).
    """
    await _seed_defaults_if_empty()
    query = {} if include_inactive else {"active": True}
    docs = await db.group_tour_packages.find(query, {"_id": 0}).to_list(500)
    projected = [_project_for_response(d) for d in docs]
    # Enrich activity sub-text/duration/image from the activities catalog so
    # the public detail page (which uses the deal object straight from the
    # listing) renders the brochure-style rich activity cards.
    for p in projected:
        await _enrich_itinerary_activities(p)
        p["insurance_per_pax"] = await _resolve_insurance_per_pax(p)
    return projected


@router.get("/group-tours/{pkg_id}", response_model=GroupTourPackageResponse)
async def get_group_tour(pkg_id: str):
    await _seed_defaults_if_empty()
    doc = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Package not found")
    projected = _project_for_response(doc)
    await _enrich_itinerary_activities(projected)
    projected["insurance_per_pax"] = await _resolve_insurance_per_pax(projected)
    return projected


@router.post("/group-tours/{pkg_id}/quote", response_model=QuoteResponse)
async def quote_group_tour(pkg_id: str, req: QuoteRequest):
    pkg = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    _migrate_legacy(pkg)
    return _compute_quote(pkg, req)


def _compute_quote(pkg: dict, req: "QuoteRequest") -> "QuoteResponse":
    """Shared quote computation used by both /quote and /save-as-proposal."""
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
    _sync_image_fields(doc)
    await db.group_tour_packages.insert_one(doc)
    doc.pop("_id", None)
    projected = _project_for_response(doc)
    projected["insurance_per_pax"] = await _resolve_insurance_per_pax(projected)
    return projected


@router.put("/group-tours/{pkg_id}", response_model=GroupTourPackageResponse)
async def update_group_tour(pkg_id: str, body: GroupTourPackageUpdate, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    existing = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Package not found")
    update = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    update["updated_at"] = _now()
    # If images/image/hotels/itinerary are being updated, mirror legacy fields
    # (single image[0] → image, activities[0] → activity_id/name).
    if any(k in update for k in ("image", "images", "hotels", "itinerary")):
        merged = {**existing, **update}
        _sync_image_fields(merged)
        for k in ("image", "images", "hotels", "itinerary"):
            if k in update:
                update[k] = merged[k]
    await db.group_tour_packages.update_one({"id": pkg_id}, {"$set": update})
    fresh = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    projected = _project_for_response(fresh)
    projected["insurance_per_pax"] = await _resolve_insurance_per_pax(projected)
    return projected


@router.delete("/group-tours/{pkg_id}")
async def delete_group_tour(pkg_id: str, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    res = await db.group_tour_packages.delete_one({"id": pkg_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"success": True, "deleted": pkg_id}



# ---------------------------------------------------------------------------
# Save as Proposal (convert group tour → proposal doc + book flow)
# ---------------------------------------------------------------------------
class SaveAsProposalRequest(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    leaving_from: str = "Dubai"
    leaving_on: str  # ISO YYYY-MM-DD
    nationality: str = "United Arab Emirates"
    rooms: List[QuoteRoom]
    # Optional Save-Proposal extras (match TripBuilder's SaveProposalModal payload)
    proposal_name: Optional[str] = None
    expected_booking_date: Optional[str] = None
    flights_booked: Optional[bool] = None
    markup_value: float = 0.0
    markup_type: str = "percentage"   # 'percentage' | 'fixed'
    discount_amount: float = 0.0


@router.post("/group-tours/{pkg_id}/save-as-proposal")
async def save_group_tour_as_proposal(
    pkg_id: str,
    body: SaveAsProposalRequest,
    current_user: dict = Depends(get_current_user),
):
    """Convert a group tour package (+ its live quote) into a proposal doc.

    The returned proposal is the same shape as a normal proposal so the public
    BookingConfirmation + MyLeads + ProposalView pages can render it without
    any group-tour-specific branches.
    """
    pkg = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    _migrate_legacy(pkg)

    # 1) Compute the quote using the same helper as /quote
    quote = _compute_quote(pkg, QuoteRequest(rooms=body.rooms))

    # 2) Build city stops + selected_hotels from the package snapshot
    destination = pkg.get("destination") or pkg.get("title") or ""
    nights = int(pkg.get("nights") or 0)
    cities = [{"name": destination, "nights": nights}]

    selected_hotels = {}
    pkg_hotels = pkg.get("hotels") or []
    for idx, h in enumerate(pkg_hotels):
        key = f"{destination}_{idx}"
        selected_hotels[key] = {
            "id": h.get("hotel_id") or f"gt_hotel_{idx}",
            "name": h.get("name", ""),
            "star_rating": int(h.get("stars") or 3),
            "nights": int(h.get("nights") or nights),
            "room_type": h.get("room_type") or "Standard Room",
            "meal_plan": h.get("meal_plan") or "Bed & Breakfast",
            "images": (h.get("images") or ([h.get("image")] if h.get("image") else [])),
            "image": h.get("image") or "",
            "city": destination,
            # Admin-configured stay window — overrides ProposalView's computed
            # check-in/check-out times when present.
            "check_in_time": h.get("check_in_time") or "",
            "check_out_time": h.get("check_out_time") or "",
            "check_in_date": h.get("check_in_date") or "",
            "check_out_date": h.get("check_out_date") or "",
        }

    # 3) Build selected_activities from itinerary days. Use the day's index
    # (1..N) as the key suffix instead of `day` so packages with duplicate or
    # non-sequential day numbers in the source data still map cleanly.
    # Also enrich each activity with full catalog data (transfer_type,
    # inclusions, pickup info, meals_included, etc.) so the saved proposal +
    # PDF + Trip Itinerary page render the same way as a normal proposal.
    selected_activities = {}
    activity_ids = set()
    for d in pkg.get("itinerary") or []:
        for a in d.get("activities") or []:
            if a and a.get("id"):
                activity_ids.add(a["id"])
    catalog_acts: dict = {}
    if activity_ids:
        cur = db.activities.find(
            {"id": {"$in": list(activity_ids)}},
            {"_id": 0},
        )
        catalog_acts = {a["id"]: a async for a in cur}

    for idx, d in enumerate(pkg.get("itinerary") or [], start=1):
        acts = d.get("activities") or []
        if not acts:
            continue
        dkey = f"{destination}_{idx}"
        out = []
        for i, a in enumerate(acts):
            if not a:
                continue
            full = catalog_acts.get(a.get("id")) or {}
            merged = {
                # Pull rich fields from the catalog so Private/SIC, inclusions,
                # pickup info, meals etc. render correctly in the saved proposal.
                **full,
                # Always prefer the package's snapshot id/name/image/duration
                # over catalog values when they were customised on the package.
                "id": a.get("id") or f"gt_act_{i}",
                "name": a.get("name", "") or full.get("name", ""),
                "image": a.get("image", "") or full.get("image", "") or (full.get("images") or [None])[0],
                "duration": a.get("duration", "") or full.get("duration", ""),
            }
            out.append(merged)
        selected_activities[dkey] = out

    # 4) Map structured flights[] → arrival/departure_flight_info shape that
    # ProposalView expects (camelCase fields). First flight = outbound, last
    # flight = return. Skipped silently if no flights configured.
    arrival_flight_info = None
    departure_flight_info = None
    pkg_flights = pkg.get("flights") or []
    if pkg_flights:
        def _to_pv(f: dict) -> dict:
            term = (f.get("from_terminal") or "").strip()
            from_air = f.get("from_airport") or ""
            from_code = f.get("from_code") or ""
            dep = f"{from_air} ({from_code})" if from_code else from_air
            to_air = f.get("to_airport") or ""
            to_code = f.get("to_code") or ""
            arr = f"{to_air} ({to_code})" if to_code else to_air
            return {
                "airline": f.get("airline", ""),
                "airlineLogo": f.get("airline_logo", ""),
                "flightNumber": f.get("flight_number", ""),
                "flightDate": f.get("departure_date", ""),
                "flightTime": f.get("departure_time", ""),
                "arrivalTime": f.get("arrival_time", ""),
                "arrivalDate": f.get("arrival_date", ""),
                "duration": f.get("duration", ""),
                "departureAirport": dep.strip(),
                "arrivalAirport": arr.strip(),
                "terminal": term,
                "fare": f.get("fare", "Basic"),
                "baggage": f.get("baggage", ""),
                "meals": f.get("meals", ""),
                "cabin": f.get("cabin", "Economy"),
            }
        arrival_flight_info = _to_pv(pkg_flights[0])
        if len(pkg_flights) > 1:
            departure_flight_info = _to_pv(pkg_flights[-1])

    # 5) Resolve arrival / departure transfers from the first / last itinerary
    # day's `transfer_id`. Looked up against the /transfers catalog so the saved
    # proposal carries the same shape ProposalView expects (id, title, from/to,
    # max_bags, notes, vehicle_type, image).
    arrival_transfer = None
    departure_transfer = None
    itin_days = pkg.get("itinerary") or []
    transfer_ids = []
    if itin_days:
        first_id = (itin_days[0] or {}).get("transfer_id")
        if first_id:
            transfer_ids.append(("arrival", first_id, (itin_days[0] or {}).get("transfer_label", "")))
        if len(itin_days) > 1:
            last_id = (itin_days[-1] or {}).get("transfer_id")
            if last_id:
                transfer_ids.append(("departure", last_id, (itin_days[-1] or {}).get("transfer_label", "")))
    if transfer_ids:
        ids_only = list({tid for _, tid, _ in transfer_ids})
        cursor = db.transfers.find(
            {"id": {"$in": ids_only}},
            {"_id": 0, "id": 1, "title": 1, "from_location": 1, "to_location": 1,
             "vehicle_type": 1, "max_bags": 1, "notes": 1, "images": 1, "image": 1},
        )
        catalog = {t["id"]: t async for t in cursor}
        for kind, tid, label_override in transfer_ids:
            t = catalog.get(tid)
            if not t:
                continue
            obj = {
                "id": t["id"],
                "title": label_override or t.get("title", ""),
                "from_location": t.get("from_location", ""),
                "to_location": t.get("to_location", ""),
                "vehicle_type": t.get("vehicle_type", ""),
                "max_bags": t.get("max_bags"),
                "notes": t.get("notes", ""),
                "image": (t.get("images") or [None])[0] or t.get("image", ""),
            }
            if kind == "arrival":
                arrival_transfer = obj
            else:
                departure_transfer = obj

    # 4) Apply optional markup + discount to the base quote total
    base_total = float(quote.total)
    markup_amount = 0.0
    if body.markup_value and body.markup_value > 0:
        if (body.markup_type or "percentage").lower() == "fixed":
            markup_amount = float(body.markup_value)
        else:
            markup_amount = round(base_total * float(body.markup_value) / 100.0, 2)
    # Discount is capped at the markup (mirrors TripBuilder's SaveProposalModal help text).
    discount = min(float(body.discount_amount or 0), markup_amount) if markup_amount else 0.0
    final_total = round(base_total + markup_amount - discount, 2)

    # 5) Assemble proposal doc (matches models.schemas.ProposalResponse)
    proposal_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    room_data = [r.dict() for r in (body.rooms or [])]
    total_pax = quote.adults + quote.children + quote.infants

    doc = {
        "id": proposal_id,
        "user_id": current_user.get("id") if current_user else None,
        "leaving_from": body.leaving_from,
        "leaving_from_code": None,
        "nationality": body.nationality,
        "leaving_on": body.leaving_on,
        "star_rating": str(pkg.get("stars") or 3),
        "add_transfers": True,
        "room_data": room_data,
        "cities": cities,
        "status": "pending",
        "total_price": final_total,
        "created_at": now_iso,
        "selected_hotels": selected_hotels,
        "selected_activities": selected_activities,
        "pricing_breakdown": {
            "total": final_total,
            "subtotal": float(quote.subtotal),
            "lines": [ln.dict() for ln in quote.lines],
            "markup_amount": markup_amount,
            "discount_amount": discount,
            "base_total": base_total,
        },
        "total_pax": total_pax,
        "total_nights": nights,
        "start_date": body.leaving_on,
        "customer_name": body.customer_name,
        "customer_email": body.customer_email or "",
        "customer_phone": body.customer_phone or "",
        "proposal_name": (body.proposal_name or pkg.get("title") or "Group Tour"),
        "expected_booking_date": body.expected_booking_date or None,
        "flights_booked": body.flights_booked,
        "arrival_flight_info": arrival_flight_info,
        "departure_flight_info": departure_flight_info,
        "arrival_transfer": arrival_transfer,
        "departure_transfer": departure_transfer,
        # Full structured flight cards — group-tour proposals only.
        # ProposalView renders the rich FlightsBlock when this array is set.
        "flights": pkg_flights,
        "markup_value": float(body.markup_value or 0),
        "markup_type": body.markup_type or "percentage",
        "markup_land": markup_amount,
        "discount_amount": discount,
        # Back-reference so we know this proposal was spawned from a group tour.
        "group_tour_id": pkg_id,
        "group_tour_title": pkg.get("title") or "",
        # Snapshot of the admin-configured per-day dates so the saved proposal
        # + PDF render the EXACT dates entered in the editor (instead of
        # naively re-deriving from start_date + day index, which would
        # silently override the package's true departure dates).
        "group_tour_day_dates": [
            {"day": int(d.get("day") or i + 1), "date": (d.get("date") or "")}
            for i, d in enumerate(pkg.get("itinerary") or [])
            if (d or {}).get("date")
        ],
    }

    await db.proposals.insert_one(doc)
    doc.pop("_id", None)
    return doc




# ---------------------------------------------------------------------------
# Brochure PDF (WeasyPrint)
# ---------------------------------------------------------------------------
_MEAL_LABELS = {"B": "Breakfast", "L": "Lunch", "D": "Dinner"}


def _esc(v) -> str:
    """HTML-escape, safely handle None."""
    return html_lib.escape(str(v or ""), quote=True)


def _star_html(n: int) -> str:
    n = max(0, min(5, int(n or 0)))
    return "★" * n + "<span style='color:#cbd5e1;'>" + ("★" * (5 - n)) + "</span>"


async def _resolve_insurance_per_pax(pkg: dict) -> float:
    """Compute the per-traveller insurance cost in AED for a package.

    Returns 0 when insurance is not toggled on. Resolution chain:
    explicit `custom_price_per_person` → country tier → "Default" tier → 50.0.
    """
    ins = pkg.get("insurance") or {}
    if not ins.get("included"):
        return 0.0
    custom = ins.get("custom_price_per_person")
    if custom is not None and custom != "":
        try:
            return float(custom)
        except (TypeError, ValueError):
            pass
    country = (ins.get("country") or pkg.get("destination") or "").strip()
    if country:
        doc = await db.insurance_prices.find_one({"country": country}, {"_id": 0})
        if doc and doc.get("price_per_person") is not None:
            return float(doc["price_per_person"])
    default = await db.insurance_prices.find_one({"country": "Default"}, {"_id": 0})
    if default and default.get("price_per_person") is not None:
        return float(default["price_per_person"])
    return 50.0



def _build_brochure_html(pkg: dict, branding: dict | None = None) -> str:
    branding = branding or {}
    title = pkg.get("title") or pkg.get("destination") or "Holiday Package"
    dest = pkg.get("destination") or ""
    subtitle = pkg.get("subtitle") or ""
    nights = int(pkg.get("nights") or 0)
    days = nights + 1 if nights else 0
    date_range = pkg.get("date_range") or ""
    stars = int(pkg.get("stars") or 0)

    hero_img = resolve_image((pkg.get("images") or [None])[0] or pkg.get("image") or "")
    # Additional cover images (beyond the hero) — rendered as a 3-up gallery
    # under the cover hero so customers see a richer first impression.
    extra_cover_imgs = []
    for raw in (pkg.get("images") or [])[1:]:
        ru = resolve_image(raw)
        if ru:
            extra_cover_imgs.append(ru)
    extra_cover_imgs = extra_cover_imgs[:3]
    cover_gallery_html = ""
    if extra_cover_imgs:
        cover_gallery_html = "<div class='cover-gallery'>" + "".join(
            f"<div class='cover-thumb' style=\"background-image:url('{_esc(u)}')\"></div>"
            for u in extra_cover_imgs
        ) + "</div>"
    pricing = pkg.get("pricing") or {}
    twin = (pricing.get("twin_double") or {})
    insurance_per_pax = float(pkg.get("_insurance_per_pax") or 0)
    insurance_included = bool((pkg.get("insurance") or {}).get("included")) and insurance_per_pax > 0
    starting_price = float(twin.get("display_price") or pkg.get("price_per_adult") or 0) + insurance_per_pax

    window = ""
    if pkg.get("travel_window_start") or pkg.get("travel_window_end"):
        window = f"{_esc(pkg.get('travel_window_start') or '—')} to {_esc(pkg.get('travel_window_end') or '—')}"

    departure_cities = pkg.get("departure_cities") or []
    dep_cities_html = ", ".join(_esc(c) for c in departure_cities) if departure_cities else "Any city on request"

    # --- Highlights ---
    highlights = pkg.get("highlights") or []
    highlights_html = "".join(f"<li>{_esc(h)}</li>" for h in highlights) or "<li>Curated by Travo travel experts</li>"

    # --- Itinerary ---
    def _fmt_flight_date(iso: str) -> str:
        """Format ISO YYYY-MM-DD as 'Wed, 27 May 2026'. Used by both itinerary
        day cards and the Flights section."""
        if not iso:
            return ""
        try:
            from datetime import datetime as _dt
            d = _dt.strptime(iso[:10], "%Y-%m-%d")
            return d.strftime("%a, %d %b %Y")
        except Exception:
            return iso

    itinerary = pkg.get("itinerary") or []
    itin_rows = []
    for d in itinerary:
        meals = [_MEAL_LABELS.get(m, m) for m in (d.get("meals") or [])]
        meal_pills = "".join(
            f"<span class='pill pill-meal'>{_esc(m)}</span>" for m in meals
        )
        activities = d.get("activities") or []
        act_html = ""
        if activities:
            act_html = "<div class='day-acts'>" + "".join(
                f"<span class='pill pill-act'>{_esc(a.get('name') or '')}</span>" for a in activities if a
            ) + "</div>"
        transfer_html = ""
        if d.get("transfer_label"):
            transfer_html = f"<div class='day-transfer'>🚗 {_esc(d['transfer_label'])}</div>"
        hotel_note = d.get("hotel_note") or ""
        desc = d.get("desc") or ""
        # `desc` may already be rich HTML from the RichTextEditor — render as-is but strip scripts.
        safe_desc = desc.replace("<script", "&lt;script").replace("</script", "&lt;/script")
        date_tag = ""
        if d.get("date"):
            # Format as "Wed, 27 May 2026" rather than raw ISO "2026-05-27"
            date_tag = f"<span class='day-date'>{_esc(_fmt_flight_date(d['date']))}</span>"

        # Day-wise images: hero banner (primary) + strip of up to 4 thumbnails.
        # Falls back to the first activity image, then the cover hero, so the
        # brochure never prints a flat blank day card even when the admin
        # hasn't uploaded explicit per-day photos yet.
        day_imgs_raw = [i for i in (d.get("images") or []) if i]
        if not day_imgs_raw:
            for a in activities:
                if a and a.get("image"):
                    day_imgs_raw = [a["image"]]
                    break
        day_imgs = [resolve_image(i) for i in day_imgs_raw if resolve_image(i)]
        hero_url = day_imgs[0] if day_imgs else hero_img
        hero_block = (
            f"<div class='day-hero' style=\"background-image:url('{_esc(hero_url)}')\"></div>"
            if hero_url else ""
        )
        thumb_strip = ""
        if len(day_imgs) > 1:
            thumb_strip = "<div class='day-thumbs'>" + "".join(
                f"<div class='day-thumb' style=\"background-image:url('{_esc(t)}')\"></div>"
                for t in day_imgs[1:5]
            ) + "</div>"

        itin_rows.append(f"""
          <div class='day-card'>
            {hero_block}
            <div class='day-head'>
              <div class='day-num'>Day {int(d.get('day') or 0)}</div>
              <div class='day-title'>{_esc(d.get('title') or '')} {date_tag}</div>
            </div>
            <div class='day-body'>{safe_desc}</div>
            {thumb_strip}
            {act_html}
            {transfer_html}
            <div class='day-foot'>
              {meal_pills}
              {f"<span class='pill pill-hotel'>🏨 {_esc(hotel_note)}</span>" if hotel_note else ""}
            </div>
          </div>
        """)
    itinerary_html = "\n".join(itin_rows) or "<p class='muted'>Itinerary will be shared upon booking.</p>"

    # --- Flights section (cards mirroring the public Flights tab layout) ---
    def _fmt_time12(t24: str) -> str:
        if not t24:
            return ""
        m = re.match(r"^(\d{1,2}):(\d{2})", t24)
        if not m:
            return t24
        hh = int(m.group(1))
        mm = m.group(2)
        ap = "PM" if hh >= 12 else "AM"
        hh = hh % 12 or 12
        return f"{hh:02d}:{mm} {ap}"

    # Built-in catalog so popular MENA carriers auto-render their logo even
    # when the admin didn't upload one. Logos are served from local
    # /api/static/airlines/<slug>.png so WeasyPrint embeds them inline
    # without an external network round-trip. Match keys are case-insensitive
    # against the airline name OR the IATA prefix on the flight number.
    _AIRLINE_LOGOS = {
        "flydubai":       "/api/static/airlines/flydubai.png",
        "emirates":       "/api/static/airlines/emirates.png",
        "air arabia":     "/api/static/airlines/air-arabia.png",
        "etihad airways": "/api/static/airlines/etihad.png",
        "etihad":         "/api/static/airlines/etihad.png",
        "qatar airways":  "/api/static/airlines/qatar-airways.png",
        "flyone":         "/api/static/airlines/flyone.png",
        "saudia":         "/api/static/airlines/saudia.png",
        "wizz air":       "/api/static/airlines/wizz-air.png",
        "salam air":      "/api/static/airlines/salam-air.png",
        "oman air":       "/api/static/airlines/oman-air.png",
        "gulf air":       "/api/static/airlines/gulf-air.png",
        "indigo":         "/api/static/airlines/indigo.png",
        "air india":      "/api/static/airlines/air-india.png",
    }
    _IATA_PREFIX = {
        "FZ": "flydubai", "EK": "emirates", "G9": "air arabia", "EY": "etihad airways",
        "QR": "qatar airways", "5F": "flyone", "SV": "saudia", "W6": "wizz air",
        "OV": "salam air", "WY": "oman air", "GF": "gulf air", "6E": "indigo", "AI": "air india",
    }

    def _resolve_airline_logo(f: dict) -> str:
        if (f.get("airline_logo") or "").strip():
            return resolve_image(f["airline_logo"].strip())
        name = (f.get("airline") or "").strip().lower()
        if name in _AIRLINE_LOGOS:
            return resolve_image(_AIRLINE_LOGOS[name])
        # Try IATA prefix on the flight number ("FZ 713" → "FZ")
        fn = (f.get("flight_number") or "").strip().upper()
        m_pref = re.match(r"^([A-Z0-9]{2,3})", fn)
        if m_pref:
            mapped = _IATA_PREFIX.get(m_pref.group(1))
            if mapped:
                return resolve_image(_AIRLINE_LOGOS.get(mapped, ""))
        return ""

    flights_list = pkg.get("flights") or []
    flight_cards = []
    for idx, f in enumerate(flights_list):
        if not f:
            continue
        from_airport_full = (
            f"{f.get('from_airport','')}"
            + (f" ({f.get('from_code','')})" if f.get('from_code') else "")
            + (f" , Terminal {f.get('from_terminal')}" if f.get('from_terminal') else "")
        ).strip(" ,")
        to_airport_full = (
            f"{f.get('to_airport','')}"
            + (f" ({f.get('to_code','')})" if f.get('to_code') else "")
            + (f" , Terminal {f.get('to_terminal')}" if f.get('to_terminal') else "")
        ).strip(" ,")
        next_day = (
            f.get("departure_date") and f.get("arrival_date")
            and f.get("arrival_date") > f.get("departure_date")
        )
        logo_url = _resolve_airline_logo(f)
        airline_block = (
            f"<img src='{_esc(logo_url)}' alt='{_esc(f.get('airline',''))}' class='fl-airline-logo'/>"
            if logo_url else "<span class='fl-airline-dot'>✈</span>"
        )
        next_day_sup = '<sup class="fl-nextday">+1</sup>' if next_day else ''
        dep_time = _fmt_time12(f.get('departure_time', ''))
        arr_time = _fmt_time12(f.get('arrival_time', ''))
        dep_date = _fmt_flight_date(f.get('departure_date', ''))
        arr_date = _fmt_flight_date(f.get('arrival_date', ''))
        duration = f.get('duration') or '—'
        flight_cards.append(f"""
          <div class='fl-card'>
            <div class='fl-route'>
              <span class='fl-route-icon'>✈</span>
              <span class='fl-route-text'>{_esc(f.get('from_city') or 'From')} to {_esc(f.get('to_city') or 'To')}</span>
              <span class='fl-route-date'>{_esc(dep_date)}</span>
            </div>
            <div class='fl-airline'>
              {airline_block}
              <span class='fl-airline-name'>{_esc(f.get('airline','Airline'))}</span>
              <span class='fl-flight-no'>{_esc(f.get('flight_number',''))}</span>
            </div>
            <table class='fl-tbl'>
              <tr class='fl-tbl-row'>
                <td class='fl-time'>{_esc(dep_time)}</td>
                <td class='fl-airport'>{_esc(from_airport_full or '—')}</td>
                <td class='fl-date'>{_esc(dep_date)}</td>
                <td class='fl-meta-k'>Fare</td>
                <td class='fl-meta-v'>{_esc(f.get('fare') or 'Basic')}</td>
              </tr>
              <tr class='fl-tbl-row'>
                <td class='fl-spacer'></td>
                <td class='fl-dur'>{_esc(duration)}</td>
                <td class='fl-spacer'></td>
                <td class='fl-meta-k'><span class='fl-meta-icon'>🧳</span> Baggage</td>
                <td class='fl-meta-v'>{_esc(f.get('baggage') or '20 kg')}</td>
              </tr>
              <tr class='fl-tbl-row'>
                <td class='fl-spacer'></td>
                <td class='fl-spacer'></td>
                <td class='fl-spacer'></td>
                <td class='fl-meta-k'><span class='fl-meta-icon'>🍴</span> Meals</td>
                <td class='fl-meta-v'>{_esc(f.get('meals') or 'At Extra Cost')}</td>
              </tr>
              <tr class='fl-tbl-row'>
                <td class='fl-time'>{_esc(arr_time)}{next_day_sup}</td>
                <td class='fl-airport'>{_esc(to_airport_full or '—')}</td>
                <td class='fl-date'>{_esc(arr_date)}</td>
                <td class='fl-meta-k'>Cabin</td>
                <td class='fl-meta-v'>{_esc(f.get('cabin') or 'Economy')}</td>
              </tr>
            </table>
          </div>
        """)
    flights_section_html = ""
    if flight_cards:
        flights_section_html = (
            "<div class='section page-break'><h2>✈ Flights</h2>"
            + "\n".join(flight_cards)
            + "</div>"
        )

    # --- Hotels ---
    hotels = pkg.get("hotels") or []
    hotel_rows = []
    for h in hotels:
        hotel_img = resolve_image((h.get("images") or [None])[0] or h.get("image") or hero_img)
        hotel_rows.append(f"""
          <div class='hotel-card'>
            <div class='hotel-img' style="background-image:url('{_esc(hotel_img)}')"></div>
            <div class='hotel-body'>
              <div class='hotel-name'>{_esc(h.get('name') or '')}</div>
              <div class='hotel-meta'>
                <span>{_star_html(h.get('stars'))}</span>
                <span>{int(h.get('nights') or 0)} Night{'s' if int(h.get('nights') or 0) != 1 else ''}</span>
                <span>{_esc(h.get('room_type') or 'Standard Room')}</span>
                <span>{_esc(h.get('meal_plan') or 'Bed & Breakfast')}</span>
              </div>
            </div>
          </div>
        """)
    hotels_html = "\n".join(hotel_rows) or "<p class='muted'>Accommodation will be confirmed upon booking.</p>"

    # --- Inclusions / Exclusions ---
    inclusions_dict = pkg.get("inclusions") or {}
    inc_sections = []

    # Travel Insurance inclusion (always renders first when toggled on).
    # The description is resolved in the route handler (async) and passed
    # in via pkg["_insurance_description_resolved"].
    insurance = pkg.get("insurance") or {}
    if insurance.get("included"):
        ins_desc = (
            (insurance.get("description") or "").strip()
            or (pkg.get("_insurance_description_resolved") or "").strip()
            or "Travel Insurance with min $50,000 coverage — Only for Age Below 60 Yrs"
        )
        inc_sections.append(
            f"<div class='inc-cat'><h4>Travel Insurance</h4><ul><li>{_esc(ins_desc)}</li></ul></div>"
        )

    for cat, items in inclusions_dict.items():
        lis = "".join(f"<li>{_esc(x)}</li>" for x in (items or []) if x)
        if lis:
            inc_sections.append(f"<div class='inc-cat'><h4>{_esc(cat)}</h4><ul>{lis}</ul></div>")
    inclusions_html = "\n".join(inc_sections) or "<p class='muted'>Details available on request.</p>"

    exclusions = pkg.get("exclusions") or []
    exc_html = "".join(f"<li>{_esc(e)}</li>" for e in exclusions if e)
    exc_html = f"<ul>{exc_html}</ul>" if exc_html else "<p class='muted'>None specified.</p>"

    # --- Pricing table ---
    tier_labels = [
        ("single_sharing", "Adult — Single sharing"),
        ("twin_double",    "Adult — Twin / Double"),
        ("triple",         "Adult — Triple"),
        ("child_no_bed",   "Child 2–5 yrs (No bed)"),
        ("infant",         "Infant 0–2 yrs"),
    ]
    price_rows = "".join(
        f"<tr><td>{_esc(label)}</td><td class='r'>AED {float((pricing.get(k) or {}).get('display_price') or 0) + insurance_per_pax:,.0f}</td></tr>"
        for k, label in tier_labels
    )
    insurance_note_html = (
        f"<p style='font-size:10px;color:#0f2a4a;margin:2mm 0 0;'><b>Inclusive of travel insurance</b> — AED {insurance_per_pax:,.0f} per traveller already added to all prices above.</p>"
        if insurance_included else ""
    )

    # --- Terms & Conditions (rich HTML from admin) ---
    terms_html = pkg.get("terms_and_conditions") or ""
    terms_block = f"<div class='terms-body'>{terms_html}</div>" if terms_html.strip() else "<p class='muted'>Standard terms apply.</p>"

    # --- Branding (white-label) — optional logo + footer line ---
    brand_logo = (branding or {}).get("logo_data_url") or ""
    brand_company = (branding or {}).get("company_name") or ""
    brand_email = (branding or {}).get("footer_email") or ""
    brand_phone = (branding or {}).get("footer_phone") or ""
    brand_website = (branding or {}).get("footer_website") or ""

    cover_logo_block = (
        f"<div class='cover-logo-wrap'><img src='{brand_logo}' class='brand-logo' alt='Logo' /></div>"
        if brand_logo else ""
    )
    footer_bits = [b for b in (brand_company, brand_email, brand_phone, brand_website) if b]
    footer_line_html = (
        f"<div class='brand-footer'>{' · '.join(_esc(b) for b in footer_bits)}</div>"
        if footer_bits else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{_esc(title)} — Brochure</title>
<style>
  @page {{ size: A4; margin: 14mm 12mm; @bottom-center {{ content: "Page " counter(page) " of " counter(pages); font-size: 9px; color:#64748b; }} }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #1e293b; margin: 0; line-height: 1.45; }}
  h1,h2,h3,h4 {{ margin: 0; color: #0f2a4a; }}
  .muted {{ color: #94a3b8; font-style: italic; }}
  .cover {{ page-break-after: always; position: relative; height: 270mm; border-radius: 10px; overflow: hidden; background:#0f2a4a; }}
  .cover-hero {{ position: absolute; inset: 0; background-size: cover; background-position: center; }}
  .cover-overlay {{ position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,25,55,0.15) 0%, rgba(10,25,55,0.75) 70%, rgba(10,25,55,0.95) 100%); }}
  .cover-inner {{ position: absolute; inset: 0; padding: 18mm 14mm; display: flex; flex-direction: column; justify-content: space-between; color: white; }}
  .brand-logo {{ max-height: 60px; max-width: 220px; background:#ffffffdd; padding:6px 10px; border-radius:6px; }}
  .brand-text {{ font-weight:900; font-size: 22px; letter-spacing: 2px; color:white; }}
  .cover-logo-wrap {{ display: flex; }}
  .brand-footer {{ margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; text-align: center; }}
  .cover-title {{ font-family: Georgia, 'Times New Roman', serif; font-size: 44px; font-weight: 900; line-height: 1.05; color: white; margin-bottom: 6mm; }}
  .cover-sub {{ font-size: 16px; opacity: 0.95; margin-bottom: 10mm; }}
  .cover-meta {{ display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; opacity: 0.95; }}
  .cover-meta .chip {{ background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.3); padding: 5px 12px; border-radius: 999px; }}
  .cover-price {{ margin-top: 10mm; display:flex; align-items:baseline; gap: 10px; }}
  .cover-price .from {{ font-size: 12px; opacity: 0.8; }}
  .cover-price .val  {{ font-size: 28px; font-weight: 900; }}
  .cover-gallery {{ display: flex; gap: 4mm; margin-top: 8mm; }}
  .cover-thumb {{ flex: 1; height: 28mm; background-size: cover; background-position: center; border-radius: 6px; border: 2px solid rgba(255,255,255,0.4); }}
  .section {{ padding: 4mm 0 6mm; }}
  .section h2 {{ font-size: 18px; margin-bottom: 4mm; border-bottom: 3px solid #0F2A4A; padding-bottom: 3mm; display:flex; align-items:center; gap:6px; }}
  .section h2::before {{ content: ''; width: 4px; height: 18px; background:#EF4444; display:inline-block; margin-right: 6px; }}
  ul {{ margin: 0 0 4px 16px; padding: 0; }}
  li {{ margin: 2px 0; }}
  .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }}
  .day-card {{ border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 0 4mm; margin-bottom: 4mm; page-break-inside: avoid; overflow: hidden; }}
  .day-hero {{ width: 100%; height: 22mm; background-size: cover; background-position: center; background-color: #e2e8f0; }}
  .day-thumbs {{ display: flex; gap: 3mm; margin: 3mm 5mm 0; flex-wrap: wrap; }}
  .day-thumb {{ width: 22mm; height: 16mm; background-size: cover; background-position: center; background-color: #e2e8f0; border-radius: 4px; }}
  .day-head {{ display:flex; align-items: baseline; gap: 8px; margin: 4mm 5mm 2mm; }}
  .day-num  {{ background: #0F2A4A; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; }}
  .day-title {{ font-weight: 800; color:#0f2a4a; font-size: 13px; }}
  .day-date {{ font-size:10px; color:#64748b; font-weight: 600; margin-left: 4px; }}
  .day-body {{ font-size: 11px; color: #334155; padding: 0 5mm; }}
  .day-body p {{ margin: 2px 0; }}
  .day-acts, .day-transfer {{ margin-top: 2mm; padding: 0 5mm; font-size: 10.5px; color:#0f2a4a; }}
  .day-foot {{ margin: 3mm 5mm 0; display: flex; flex-wrap: wrap; gap: 4px; }}

  /* Flight cards — mirrors the public Flights tab */
  .fl-card {{ border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 5mm; page-break-inside: avoid; background: white; }}
  .fl-route {{ background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 3mm 5mm; }}
  .fl-route-icon {{ color: #475569; font-size: 12px; margin-right: 4px; }}
  .fl-route-text {{ font-weight: 800; color: #0f2a4a; font-size: 13px; }}
  .fl-route-date {{ margin-left: 4mm; color: #64748b; font-size: 11px; font-weight: 500; }}
  .fl-airline {{ padding: 3mm 5mm; border-bottom: 1px solid #e2e8f0; }}
  .fl-airline-logo {{ height: 22px; width: auto; max-width: 110px; vertical-align: middle; margin-right: 8px; border-radius: 3px; }}
  .fl-airline-dot {{ display: inline-block; width: 18px; height: 18px; border-radius: 4px; background: #fff1f2; color: #f43f5e; text-align: center; line-height: 18px; font-size: 11px; vertical-align: middle; margin-right: 6px; }}
  .fl-airline-name {{ font-weight: 800; color: #0f2a4a; font-size: 12px; vertical-align: middle; margin-right: 12px; }}
  .fl-flight-no {{ font-weight: 800; color: #1f2937; font-size: 12px; vertical-align: middle; }}
  .fl-tbl {{ width: 100%; border-collapse: collapse; font-size: 10.5px; padding: 3mm 5mm; }}
  .fl-tbl-row td {{ padding: 1.6mm 4mm 1.6mm 0; vertical-align: middle; }}
  .fl-time {{ font-weight: 800; color: #0f2a4a; white-space: nowrap; width: 18mm; padding-left: 5mm !important; }}
  .fl-airport {{ color: #475569; padding-left: 4mm !important; border-left: 1px solid #e2e8f0; }}
  .fl-dur {{ color: #0f2a4a; font-weight: 800; padding-left: 4mm !important; border-left: 1px solid #e2e8f0; }}
  .fl-spacer {{ padding-left: 4mm !important; border-left: 1px solid #e2e8f0; }}
  .fl-date {{ color: #64748b; white-space: nowrap; width: 26mm; }}
  .fl-meta-k {{ color: #64748b; white-space: nowrap; padding-left: 5mm !important; border-left: 1px solid #e2e8f0; width: 22mm; }}
  .fl-meta-v {{ font-weight: 800; color: #0f2a4a; white-space: nowrap; padding-right: 5mm !important; }}
  .fl-meta-icon {{ font-size: 9.5px; }}
  .fl-nextday {{ color: #f43f5e; font-size: 8px; font-weight: 800; vertical-align: super; margin-left: 1px; }}
  .pill {{ display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 700; }}
  .pill-meal {{ background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }}
  .pill-hotel {{ background:#fef3c7; color:#92400e; border:1px solid #fcd34d; }}
  .pill-act {{ background:#e0f2fe; color:#075985; border:1px solid #7dd3fc; }}
  .hotel-card {{ display:flex; gap: 10px; border: 1px solid #e2e8f0; border-radius:8px; padding:3mm 4mm; margin-bottom: 3mm; align-items: center; page-break-inside: avoid; }}
  .hotel-img  {{ width: 38mm; height: 28mm; background-size: cover; background-position: center; background-color:#e2e8f0; border-radius:6px; flex-shrink: 0; }}
  .hotel-body {{ flex: 1; }}
  .hotel-name {{ font-weight: 800; font-size: 13px; color:#0f2a4a; margin-bottom: 2px; }}
  .hotel-meta {{ display: flex; gap: 10px; font-size: 10.5px; color:#475569; flex-wrap: wrap; }}
  .inc-cat {{ margin-bottom: 3mm; }}
  .inc-cat h4 {{ font-size: 12px; color:#0F2A4A; border-left: 3px solid #EF4444; padding-left: 6px; margin-bottom: 2mm; }}
  table.price {{ width: 100%; border-collapse: collapse; margin-top: 2mm; font-size: 11px; }}
  table.price thead th {{ background:#0F2A4A; color: white; padding: 4mm; text-align: left; font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; }}
  table.price tbody td {{ padding: 3mm 4mm; border-bottom: 1px solid #e2e8f0; }}
  table.price tbody tr:nth-child(even) td {{ background:#f8fafc; }}
  table.price td.r {{ text-align: right; font-weight: 700; color:#0F2A4A; font-family: 'Helvetica', sans-serif; }}
  .info-row {{ display: flex; gap: 14px; font-size: 10.5px; color:#475569; margin-top: 2mm; margin-bottom: 4mm; flex-wrap: wrap; }}
  .info-row .kv {{ border:1px solid #e2e8f0; padding: 3px 8px; border-radius: 6px; background:#f8fafc; }}
  .info-row .kv b {{ color:#0f2a4a; }}
  .terms-body {{ font-size: 10.5px; color:#475569; line-height: 1.55; }}
  .terms-body h1, .terms-body h2, .terms-body h3, .terms-body h4 {{ font-size: 12px; margin-top:4mm; margin-bottom:2mm; color:#0f2a4a; }}
  .terms-body ul {{ margin-left: 18px; }}
  .page-break {{ page-break-before: always; }}
</style></head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-hero" style="background-image:url('{_esc(hero_img)}');"></div>
  <div class="cover-overlay"></div>
  <div class="cover-inner">
    <div>{cover_logo_block}</div>
    <div>
      <div class="cover-title">{_esc(title)}</div>
      <div class="cover-sub">{_esc(subtitle or f'{nights} nights · {days} days in {dest}')}</div>
      <div class="cover-meta">
        {f'<span class="chip">📍 {_esc(dest)}</span>' if dest else ''}
        {f'<span class="chip">📅 {_esc(date_range)}</span>' if date_range else ''}
        <span class="chip">🌙 {nights} Nights · {days} Days</span>
        {f'<span class="chip">{_star_html(stars)}</span>' if stars else ''}
        {'<span class="chip" style="background:rgba(16,185,129,0.25);border-color:rgba(16,185,129,0.55);">🛡️ Inclusive of travel insurance</span>' if insurance_included else ''}
      </div>
      <div class="cover-price">
        <span class="from">Starting from</span>
        <span class="val">AED {starting_price:,.0f}</span>
        <span class="from">per adult · Twin / Double</span>
      </div>
      {cover_gallery_html}
    </div>
  </div>
</div>

<!-- AT A GLANCE -->
<div class="section">
  <h2>At a glance</h2>
  <div class="info-row">
    <span class="kv"><b>Destination:</b> {_esc(dest or '—')}</span>
    <span class="kv"><b>Nights:</b> {nights}</span>
    <span class="kv"><b>Departure Cities:</b> {dep_cities_html}</span>
    {f'<span class="kv"><b>Travel Window:</b> {window}</span>' if window else ''}
  </div>
  <div>
    <h3 style="font-size:13px;margin-bottom:2mm;">Trip Highlights</h3>
    <ul>{highlights_html}</ul>
  </div>
</div>

{flights_section_html}

<!-- HOTELS -->
<div class="section{' page-break' if not flights_section_html else ''}">
  <h2>Hotels</h2>
  {hotels_html}
</div>

<!-- ITINERARY -->
<div class="section page-break">
  <h2>Day-wise Itinerary</h2>
  {itinerary_html}
</div>

<!-- INCLUSIONS + WHAT'S EXCLUDED -->
<div class="section">
  <h2>Inclusions</h2>
  {inclusions_html}
  <div style="margin-top:6mm;">
    <h2>What's Excluded</h2>
    {exc_html}
  </div>
</div>

<!-- PRICING -->
<div class="section">
  <h2>Pricing (per person · AED)</h2>
  <table class="price">
    <thead><tr><th>Occupancy</th><th class="r">Rate</th></tr></thead>
    <tbody>{price_rows}</tbody>
  </table>
  {insurance_note_html}
  <p class="muted" style="margin-top:3mm;">Prices are indicative and subject to availability at the time of booking.</p>
</div>

<!-- TERMS -->
<div class="section page-break">
  <h2>Terms &amp; Conditions</h2>
  {terms_block}
  {footer_line_html}
</div>

</body></html>
"""


@router.get("/group-tours/{pkg_id}/brochure-pdf")
async def download_group_tour_brochure(pkg_id: str):
    """Generate + stream a WeasyPrint brochure PDF for the given package."""
    pkg = await db.group_tour_packages.find_one({"id": pkg_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    _migrate_legacy(pkg)
    # Fetch tenant-wide white-label branding (logo + footer email/phone/website)
    from routes.settings import get_pdf_branding
    branding = await get_pdf_branding()

    # Resolve the per-traveller insurance cost (rolled into displayed prices) and
    # the brochure description before the sync builder runs.
    pkg["_insurance_per_pax"] = await _resolve_insurance_per_pax(pkg)
    insurance = pkg.get("insurance") or {}
    if insurance.get("included") and not (insurance.get("description") or "").strip():
        ins_country = (insurance.get("country") or pkg.get("destination") or "").strip()
        ins_doc = None
        if ins_country:
            ins_doc = await db.insurance_prices.find_one({"country": ins_country}, {"_id": 0})
        if not ins_doc:
            ins_doc = await db.insurance_prices.find_one({"country": "Default"}, {"_id": 0})
        if ins_doc:
            pkg["_insurance_description_resolved"] = ins_doc.get("description", "")

    try:
        html = _build_brochure_html(pkg, branding=branding)
        pdf_bytes = HTML(string=html).write_pdf()
    except Exception as e:
        logger.exception("brochure PDF generation failed for %s: %s", pkg_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to generate brochure: {e}")
    filename = f"Brochure_{(pkg.get('title') or pkg_id).replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
