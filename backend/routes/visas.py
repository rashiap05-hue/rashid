from fastapi import APIRouter, HTTPException, Query, Body
from db import db
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
import uuid


class VisaCreate(BaseModel):
    country: str
    visa_type: str = "Tourist Visa"
    entry_type: str = "Tourist / Single Entry / Sticker Visa"
    required: bool = True
    processing_time: str = ""
    validity: str = ""
    max_stay: str = ""
    price: float = 0
    currency: str = "AED"
    documents_required: List[str] = []
    notes: str = ""
    available: bool = True


visa_router = APIRouter(prefix="/visas", tags=["Visas"])


@visa_router.get("")
async def get_visas(
    country: str = Query("", description="Filter by country"),
    search: str = Query("", description="Search term"),
    limit: int = Query(100, ge=1, le=500)
):
    query = {}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"country": search_regex},
            {"visa_type": search_regex},
            {"entry_type": search_regex},
            {"notes": search_regex}
        ]
    visas = await db.visas.find(query, {"_id": 0}).sort("country", 1).limit(limit).to_list(limit)
    return {"success": True, "visas": visas}


@visa_router.get("/{visa_id}")
async def get_visa(visa_id: str):
    visa = await db.visas.find_one({"id": visa_id}, {"_id": 0})
    if not visa:
        raise HTTPException(status_code=404, detail="Visa not found")
    return {"success": True, "visa": visa}


@visa_router.post("")
async def create_visa(visa: VisaCreate):
    visa_id = str(uuid.uuid4())
    doc = {
        "id": visa_id,
        **visa.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.visas.insert_one(doc)
    return {"success": True, "id": visa_id}


@visa_router.put("/{visa_id}")
async def update_visa(visa_id: str, visa: VisaCreate):
    update_data = visa.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.visas.update_one({"id": visa_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visa not found")
    return {"success": True}


@visa_router.patch("/{visa_id}")
async def partial_update_visa(visa_id: str, update_data: dict = Body(...)):
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update_data.items() if v is not None}
    result = await db.visas.update_one({"id": visa_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visa not found")
    updated = await db.visas.find_one({"id": visa_id}, {"_id": 0})
    return {"success": True, "visa": updated}


@visa_router.delete("/{visa_id}")
async def delete_visa(visa_id: str):
    result = await db.visas.delete_one({"id": visa_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visa not found")
    return {"success": True}
