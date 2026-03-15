from fastapi import APIRouter, HTTPException, Depends, Request
from db import db, get_current_user, logger
from typing import Optional
from datetime import datetime, timezone
import uuid

settings_router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_INSURANCE = {
    "country": "Default",
    "price_per_person": 50,
    "currency": "AED",
    "min_coverage": 50000,
    "max_age": 60,
    "description": "Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs"
}

@settings_router.get("/insurance")
async def get_insurance_settings(country: Optional[str] = None):
    if country:
        entry = await db.insurance_prices.find_one({"country": country}, {"_id": 0})
        if entry:
            return entry
        default = await db.insurance_prices.find_one({"country": "Default"}, {"_id": 0})
        return default or DEFAULT_INSURANCE
    entries = []
    async for doc in db.insurance_prices.find({}, {"_id": 0}).sort("country", 1):
        entries.append(doc)
    if not entries:
        seed = {**DEFAULT_INSURANCE, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()}
        await db.insurance_prices.insert_one(seed)
        entries = [{k: v for k, v in seed.items() if k != "_id"}]
    return {"insurance_prices": entries}

@settings_router.post("/insurance")
async def create_insurance_price(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    country = data.get("country", "").strip()
    if not country:
        raise HTTPException(status_code=400, detail="Country is required")
    existing = await db.insurance_prices.find_one({"country": country})
    if existing:
        raise HTTPException(status_code=400, detail=f"Insurance price for '{country}' already exists")
    entry = {
        "id": str(uuid.uuid4()),
        "country": country,
        "price_per_person": data.get("price_per_person", 50),
        "currency": data.get("currency", "AED"),
        "min_coverage": data.get("min_coverage", 50000),
        "max_age": data.get("max_age", 60),
        "description": data.get("description", "Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.insurance_prices.insert_one(entry)
    entry.pop("_id", None)
    return entry

@settings_router.put("/insurance/{entry_id}")
async def update_insurance_price(entry_id: str, request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    update_fields = {
        "price_per_person": data.get("price_per_person", 50),
        "currency": data.get("currency", "AED"),
        "min_coverage": data.get("min_coverage", 50000),
        "max_age": data.get("max_age", 60),
        "description": data.get("description", ""),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    new_country = data.get("country", "").strip()
    if new_country:
        existing = await db.insurance_prices.find_one({"country": new_country, "id": {"$ne": entry_id}})
        if existing:
            raise HTTPException(status_code=400, detail=f"Insurance price for '{new_country}' already exists")
        update_fields["country"] = new_country
    result = await db.insurance_prices.update_one({"id": entry_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Insurance price entry not found")
    updated = await db.insurance_prices.find_one({"id": entry_id}, {"_id": 0})
    return updated

@settings_router.delete("/insurance/{entry_id}")
async def delete_insurance_price(entry_id: str, user: dict = Depends(get_current_user)):
    entry = await db.insurance_prices.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Insurance price entry not found")
    if entry.get("country") == "Default":
        raise HTTPException(status_code=400, detail="Cannot delete the Default pricing entry")
    await db.insurance_prices.delete_one({"id": entry_id})
    return {"message": "Insurance price entry deleted"}
