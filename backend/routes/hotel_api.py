"""External Hotel API connector.

Connects the platform to a third-party hotel provider so hotel inventory can
come from a live source in addition to the local catalog. Two providers are
supported:

* "ratehawk"  – Emerging Travel Group / RateHawk WorldOTA API v3
                (HTTP Basic auth; multicomplete -> region SERP search).
* "generic"   – any REST endpoint returning JSON (GET with query params).

When no provider is configured (or a request fails), the connector degrades
gracefully by returning an empty list so the rest of the system keeps working
off the local hotel catalog.

Environment variables
---------------------
Common:
  HOTEL_API_PROVIDER     "ratehawk" | "generic" (auto-detected from creds if unset).
  HOTEL_API_CURRENCY     Currency code applied to mapped rooms (default: "AED").

RateHawk (https://docs.emergingtravel.com):
  RATEHAWK_KEY_ID        API key id  (HTTP Basic username).
  RATEHAWK_API_KEY       API key     (HTTP Basic password).
  RATEHAWK_BASE_URL      Default "https://api.worldota.net/api/b2b/v3"
                         (use the sandbox host for testing).
  RATEHAWK_RESIDENCY     Guest residency ISO-2 code (default: "ae").
  RATEHAWK_DEFAULT_NIGHTS Stay length used for the dateless /hotels listing (default: 2).
  RATEHAWK_LEAD_DAYS     Days ahead for the default check-in (default: 30).

Generic:
  HOTEL_API_URL          Base URL of the provider's hotel search endpoint.
  HOTEL_API_KEY          API key / token.
  HOTEL_API_AUTH         "query" (default) | "bearer" | "header".
  HOTEL_API_KEY_PARAM    Query/header name for the key (default: "api_key").
  HOTEL_API_CITY_PARAM / HOTEL_API_COUNTRY_PARAM / HOTEL_API_SEARCH_PARAM
  HOTEL_API_RESULTS_PATH Dotted path to the hotels array in the response.
"""
import os
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter

from db import logger

hotel_api_router = APIRouter(tags=["Hotel API"])

RATEHAWK_DEFAULT_BASE = "https://api.worldota.net/api/b2b/v3"


# --------------------------------------------------------------------------- #
# Provider detection
# --------------------------------------------------------------------------- #
def _ratehawk_creds():
    return os.environ.get("RATEHAWK_KEY_ID"), os.environ.get("RATEHAWK_API_KEY")


def get_provider() -> Optional[str]:
    """Resolve the active hotel provider, or None when unconfigured."""
    explicit = (os.environ.get("HOTEL_API_PROVIDER") or "").strip().lower()
    kid, key = _ratehawk_creds()
    if explicit == "ratehawk" or (not explicit and kid and key):
        return "ratehawk" if (kid and key) else None
    if explicit == "generic" or (not explicit and os.environ.get("HOTEL_API_URL") and os.environ.get("HOTEL_API_KEY")):
        return "generic" if (os.environ.get("HOTEL_API_URL") and os.environ.get("HOTEL_API_KEY")) else None
    return None


def is_configured() -> bool:
    """True when an external hotel provider is configured via env vars."""
    return get_provider() is not None


# --------------------------------------------------------------------------- #
# Shared helpers
# --------------------------------------------------------------------------- #
def _first(item: dict, *keys, default=None):
    for k in keys:
        if isinstance(item, dict) and item.get(k) not in (None, ""):
            return item[k]
    return default


def _humanize(value) -> str:
    cleaned = str(value or "").replace("_", " ").replace("-", " ").strip()
    return " ".join(w.capitalize() for w in cleaned.split()) or "Hotel"


def _to_float(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# --------------------------------------------------------------------------- #
# RateHawk (Emerging Travel Group) provider
# --------------------------------------------------------------------------- #
def _ratehawk_rate_amount(rate: dict) -> float:
    """Per-stay price for a RateHawk rate (search currency `show_amount`)."""
    payment_types = (((rate or {}).get("payment_options") or {}).get("payment_types") or [])
    if payment_types:
        amt = _first(payment_types[0], "show_amount", "amount")
        price = _to_float(amt, default=None) if amt is not None else None
        if price is not None:
            return price
    daily = (rate or {}).get("daily_prices") or []
    try:
        return float(sum(float(x) for x in daily))
    except (TypeError, ValueError):
        return 0.0


def _map_ratehawk_hotel(h: dict, name_by_hid: dict, city: Optional[str], currency: str) -> dict:
    """Map a RateHawk SERP hotel (id/hid + rates) into the app hotel shape.

    SERP responses carry pricing but little static content, so the name is taken
    from the multicomplete suggestions when available (else humanized from the
    id). Full static content (stars/images/address) comes from RateHawk's hotel
    content dump in a production setup.
    """
    hid = h.get("hid")
    hid_str = h.get("id") or (str(hid) if hid else "hotel")
    name = name_by_hid.get(hid) or _humanize(hid_str)

    rooms = []
    for idx, rate in enumerate(h.get("rates") or []):
        price = _ratehawk_rate_amount(rate)
        rooms.append({
            "id": rate.get("match_hash") or f"rh-room-{idx}",
            "name": (rate.get("room_data_trans") or {}).get("main_name") or rate.get("room_name") or "Room",
            "type": "Standard",
            "bed_type": (rate.get("room_data_trans") or {}).get("bedding_type") or "",
            "view": "",
            "size": "",
            "price": price,
            "original_price": price,
            "currency": currency,
            "amenities": rate.get("amenities_data") or [],
            "refundable": True,
            "refundable_until": None,
            "meals": rate.get("meal") or "Room Only",
            "images": [],
        })

    return {
        "id": f"rh-{hid_str}",
        "name": name,
        "city": city or "",
        "country": "",
        "address": "",
        "description": "",
        "star_rating": 0,
        "rating_score": 0.0,
        "rating_text": "",
        "review_count": 0,
        "image": "",
        "images": [],
        "amenities": [],
        "rooms": rooms,
        "recommended": False,
        "source": "api",
        "provider": "ratehawk",
        "hid": hid,
    }


async def _fetch_ratehawk(city: Optional[str], country: Optional[str], search: Optional[str],
                          checkin: Optional[str] = None, checkout: Optional[str] = None,
                          adults: int = 2):
    import httpx

    kid, key = _ratehawk_creds()
    base = (os.environ.get("RATEHAWK_BASE_URL") or RATEHAWK_DEFAULT_BASE).rstrip("/")
    currency = os.environ.get("HOTEL_API_CURRENCY", "AED")
    residency = os.environ.get("RATEHAWK_RESIDENCY", "ae")
    language = "en"

    query = (search or city or country or "").strip()
    if not query:
        return []

    if not checkin:
        lead = int(os.environ.get("RATEHAWK_LEAD_DAYS", "30") or 30)
        checkin = (date.today() + timedelta(days=lead)).isoformat()
    if not checkout:
        nights = int(os.environ.get("RATEHAWK_DEFAULT_NIGHTS", "2") or 2)
        checkout = (date.fromisoformat(checkin) + timedelta(days=nights)).isoformat()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1) Resolve the city -> region_id (and gather hid -> name hints).
            mc = await client.post(f"{base}/search/multicomplete/",
                                   json={"query": query, "language": language},
                                   auth=(kid, key))
            if mc.status_code != 200:
                logger.warning("RateHawk multicomplete failed (status %s)", mc.status_code)
                return []
            mc_data = (mc.json() or {}).get("data") or {}
            mc_hotels = mc_data.get("hotels") or []
            mc_regions = mc_data.get("regions") or []
            name_by_hid = {h.get("hid"): h.get("name") for h in mc_hotels if h.get("hid")}

            region_id = None
            for r in mc_regions:
                if (r.get("type") or "").lower() in ("city", "multi_city_vicinity", "province_state"):
                    region_id = r.get("id")
                    break
            if region_id is None and mc_regions:
                region_id = mc_regions[0].get("id")
            if region_id is None and mc_hotels:
                region_id = mc_hotels[0].get("region_id")
            if region_id is None:
                return []

            # 2) Search rates by region for the requested stay.
            body = {
                "checkin": checkin,
                "checkout": checkout,
                "residency": residency,
                "language": language,
                "guests": [{"adults": int(adults), "children": []}],
                "region_id": int(region_id),
                "currency": currency,
            }
            sr = await client.post(f"{base}/search/serp/region/", json=body, auth=(kid, key))
            if sr.status_code != 200:
                logger.warning("RateHawk region search failed (status %s)", sr.status_code)
                return []
            sr_data = (sr.json() or {}).get("data") or {}
            hotels = sr_data.get("hotels") or []
            return [_map_ratehawk_hotel(h, name_by_hid, city or query, currency)
                    for h in hotels if isinstance(h, dict)]
    except Exception as e:  # noqa: BLE001 - degrade gracefully on any provider error
        logger.error("Error fetching RateHawk hotels: %s", str(e))
        return []


# --------------------------------------------------------------------------- #
# Generic REST provider
# --------------------------------------------------------------------------- #
def _dig(data, path):
    cur = data
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def _extract_results(payload):
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    configured_path = os.environ.get("HOTEL_API_RESULTS_PATH")
    candidates = [configured_path] if configured_path else ["hotels", "data", "results", "items"]
    for path in candidates:
        if not path:
            continue
        found = _dig(payload, path)
        if isinstance(found, list):
            return found
    return []


def _normalize_rooms(item: dict, currency: str):
    raw_rooms = _first(item, "rooms", "room_types", "roomTypes", "rates", default=[]) or []
    rooms = []
    for idx, r in enumerate(raw_rooms):
        if not isinstance(r, dict):
            continue
        price = _to_float(_first(r, "price", "rate", "amount", "total_price", "nightly_rate", default=0))
        rooms.append({
            "id": str(_first(r, "id", "room_id", "code", default=f"ext-room-{idx}")),
            "name": _first(r, "name", "room_name", "title", default="Standard Room"),
            "type": _first(r, "type", "category", default="Standard"),
            "bed_type": _first(r, "bed_type", "bedType", "beds", default=""),
            "view": _first(r, "view", "view_type", default=""),
            "size": str(_first(r, "size", "room_size", default="")),
            "price": price,
            "original_price": _to_float(_first(r, "original_price", "originalPrice", default=price), default=price),
            "currency": _first(r, "currency", default=currency),
            "amenities": _first(r, "amenities", default=[]) or [],
            "refundable": bool(_first(r, "refundable", default=True)),
            "refundable_until": _first(r, "refundable_until", default=None),
            "meals": _first(r, "meals", "meal_plan", "board", default="Room Only"),
            "images": _first(r, "images", default=[]) or [],
        })
    return rooms


def normalize_hotel(item: dict, currency: str) -> dict:
    images = _first(item, "images", "photos", "gallery", default=[]) or []
    if isinstance(images, str):
        images = [images]
    main_image = _first(item, "image", "thumbnail", "main_image", default=(images[0] if images else ""))
    try:
        star_rating = int(_first(item, "star_rating", "stars", "category", "rating", default=4))
    except (TypeError, ValueError):
        star_rating = 4
    rating_score = _to_float(_first(item, "rating_score", "review_score", "score", default=8.0), default=8.0)
    return {
        "id": f"ext-{_first(item, 'id', 'hotel_id', 'code', default='hotel')}",
        "name": _first(item, "name", "hotel_name", "title", default="Hotel"),
        "city": _first(item, "city", "city_name", default=""),
        "country": _first(item, "country", "country_name", default=""),
        "address": _first(item, "address", "location", default=""),
        "description": _first(item, "description", "summary", default=""),
        "star_rating": star_rating,
        "rating_score": rating_score,
        "rating_text": _first(item, "rating_text", default="Very Good"),
        "review_count": int(_first(item, "review_count", "reviews", default=0) or 0),
        "image": main_image,
        "images": images,
        "amenities": _first(item, "amenities", "facilities", default=[]) or [],
        "rooms": _normalize_rooms(item, currency),
        "recommended": bool(_first(item, "recommended", default=False)),
        "source": "api",
        "provider": "generic",
    }


async def _fetch_generic(city: Optional[str], country: Optional[str], search: Optional[str]):
    import httpx

    base_url = os.environ["HOTEL_API_URL"]
    api_key = os.environ["HOTEL_API_KEY"]
    auth_mode = (os.environ.get("HOTEL_API_AUTH") or "query").lower()
    key_param = os.environ.get("HOTEL_API_KEY_PARAM", "api_key")
    currency = os.environ.get("HOTEL_API_CURRENCY", "AED")

    params, headers = {}, {}
    if auth_mode == "bearer":
        headers["Authorization"] = f"Bearer {api_key}"
    elif auth_mode == "header":
        headers[key_param] = api_key
    else:
        params[key_param] = api_key

    if city:
        params[os.environ.get("HOTEL_API_CITY_PARAM", "city")] = city
    if country:
        params[os.environ.get("HOTEL_API_COUNTRY_PARAM", "country")] = country
    if search:
        params[os.environ.get("HOTEL_API_SEARCH_PARAM", "search")] = search

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(base_url, params=params, headers=headers)
        if response.status_code != 200:
            logger.warning("Hotel API request failed (status %s)", response.status_code)
            return []
        results = _extract_results(response.json())
        return [normalize_hotel(h, currency) for h in results if isinstance(h, dict)]
    except Exception as e:  # noqa: BLE001 - degrade gracefully on any provider error
        logger.error("Error fetching external hotels: %s", str(e))
        return []


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
async def fetch_external_hotels(city: Optional[str] = None, country: Optional[str] = None,
                                search: Optional[str] = None):
    """Query the configured external hotel provider. Returns a normalized list.

    Returns [] when the integration is not configured or the request fails, so
    callers can safely merge with the local catalog.
    """
    provider = get_provider()
    if provider == "ratehawk":
        return await _fetch_ratehawk(city, country, search)
    if provider == "generic":
        return await _fetch_generic(city, country, search)
    return []


@hotel_api_router.get("/hotels/api/status")
async def hotel_api_status():
    """Report whether an external hotel provider is connected/configured."""
    return {"success": True, "connected": is_configured(), "provider": get_provider()}


@hotel_api_router.get("/hotels/api/search")
async def search_external_hotels(city: Optional[str] = None, country: Optional[str] = None,
                                 search: Optional[str] = None):
    """Search hotels directly from the external provider (no local catalog)."""
    if not is_configured():
        return {"success": False, "connected": False, "provider": None,
                "error": "Hotel API not configured", "hotels": []}
    hotels = await fetch_external_hotels(city=city, country=country, search=search)
    return {"success": True, "connected": True, "provider": get_provider(),
            "source": "api", "hotels": hotels, "total": len(hotels)}
