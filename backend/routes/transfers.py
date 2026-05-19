from fastapi import APIRouter, HTTPException, Query, Body
from db import db
from models.schemas import TransferCreate
from datetime import datetime, timezone
import uuid

transfers_router = APIRouter(prefix="/transfers", tags=["Transfers"])


@transfers_router.get("")
async def get_transfers(
    city: str = Query("", description="Filter by city"),
    search: str = Query("", description="Search term"),
    limit: int = Query(100, ge=1, le=500)
):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"title": search_regex},
            {"from_location": search_regex},
            {"to_location": search_regex}
        ]
    transfers = await db.transfers.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"success": True, "transfers": transfers}


@transfers_router.get("/inter-city/search")
async def search_inter_city_transfers(from_city: str, to_city: str):
    """Find inter-hotel transfers between two cities.

    City names are matched permissively to tolerate common transliteration
    variants (e.g. "Tsaghkadzor" / "Tsakhkadzor" / "Tsagkhadzor" all match).
    The transfer's `from_location`, `city`, `from_city`, `to_location`,
    `to_city`, `destination`, and `title` fields are all considered so the
    catalog admin can fill in whichever fields they prefer.

    `transfer_direction` is also matched permissively — `inter-hotel`,
    `inter-city`, `intercity`, `city-to-city`, blank/unset, or anything that
    is **not** the arrival/departure shuttle directions all qualify.
    """
    import re

    def core(name: str) -> str:
        # Remove the letters that flip in common transliterations (g / k / h)
        # and any non-alphabetic chars — so "Tsaghkadzor" and "Tsagkhadzor"
        # both reduce to "tsadzor".
        s = (name or "").lower()
        return "".join(c for c in s if c.isalpha() and c not in "gkh")

    from_core = core(from_city)
    to_core = core(to_city)

    # Accept either the canonical "inter-hotel" direction OR any direction
    # value that clearly isn't airport arrival/departure. Also accept
    # missing/blank direction so older catalog entries still surface.
    def _is_inter_direction(d: str) -> bool:
        dl = (d or "").strip().lower()
        if not dl:
            return True  # blank → assume inter-city
        if dl in ("arrival", "departure", "airport-pickup", "airport-drop", "airport-arrival", "airport-departure"):
            return False
        return True  # inter-hotel, inter-city, intercity, city-to-city, transfer, etc.

    candidates = await db.transfers.find({}, {"_id": 0}).to_list(500)

    matches = []
    for t in candidates:
        if not _is_inter_direction(t.get("transfer_direction")):
            continue
        # Wider haystack — pull every field that might name a city
        from_hay = " ".join(filter(None, [
            t.get("from_location"), t.get("from_city"), t.get("city"), t.get("title"),
        ]))
        to_hay = " ".join(filter(None, [
            t.get("to_location"), t.get("to_city"), t.get("destination"), t.get("title"),
        ]))
        # Per-haystack core comparison: a candidate matches if its from-side
        # contains the from_core AND its to-side contains the to_core.
        if from_core and from_core in core(from_hay) and to_core and to_core in core(to_hay):
            matches.append(t)
            continue
        # Fallback: fuzzy regex on the original strings (case-insensitive)
        try:
            if (re.search(re.escape(from_city), from_hay, re.I)
                    and re.search(re.escape(to_city), to_hay, re.I)):
                matches.append(t)
        except re.error:
            pass

    return {"success": True, "transfers": matches, "from_city": from_city, "to_city": to_city}


@transfers_router.get("/{transfer_id}")
async def get_transfer(transfer_id: str):
    transfer = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return {"success": True, "transfer": transfer}


@transfers_router.post("")
async def create_transfer(transfer: TransferCreate):
    transfer_id = str(uuid.uuid4())
    doc = {"id": transfer_id, **transfer.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.transfers.insert_one(doc)
    return {"success": True, "id": transfer_id}


@transfers_router.put("/{transfer_id}")
async def update_transfer(transfer_id: str, transfer: TransferCreate):
    result = await db.transfers.update_one({"id": transfer_id}, {"$set": transfer.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return {"success": True}


@transfers_router.patch("/{transfer_id}")
async def partial_update_transfer(transfer_id: str, update_data: dict = Body(...)):
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update_data.items() if v is not None}
    result = await db.transfers.update_one({"id": transfer_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    return {"success": True, "transfer": updated}


@transfers_router.delete("/{transfer_id}")
async def delete_transfer(transfer_id: str):
    result = await db.transfers.delete_one({"id": transfer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return {"success": True}
