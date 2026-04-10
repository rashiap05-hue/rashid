from fastapi import APIRouter, HTTPException, Query, Body
from db import db
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
import uuid


class SimCardCreate(BaseModel):
    country: str
    provider: str = ""
    plan_name: str = ""
    data_allowance: str = ""
    validity: str = ""
    calls_included: bool = False
    sms_included: bool = False
    price: float = 0
    currency: str = "AED"
    notes: str = ""
    available: bool = True


sim_cards_router = APIRouter(prefix="/sim-cards", tags=["SIM Cards"])


@sim_cards_router.get("")
async def get_sim_cards(
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
            {"provider": search_regex},
            {"plan_name": search_regex}
        ]
    sim_cards = await db.sim_cards.find(query, {"_id": 0}).sort("country", 1).limit(limit).to_list(limit)
    return {"success": True, "sim_cards": sim_cards}


@sim_cards_router.get("/{sim_id}")
async def get_sim_card(sim_id: str):
    sim = await db.sim_cards.find_one({"id": sim_id}, {"_id": 0})
    if not sim:
        raise HTTPException(status_code=404, detail="SIM card not found")
    return {"success": True, "sim_card": sim}


@sim_cards_router.post("")
async def create_sim_card(sim: SimCardCreate):
    sim_id = str(uuid.uuid4())
    doc = {"id": sim_id, **sim.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.sim_cards.insert_one(doc)
    return {"success": True, "id": sim_id}


@sim_cards_router.put("/{sim_id}")
async def update_sim_card(sim_id: str, sim: SimCardCreate):
    update_data = sim.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.sim_cards.update_one({"id": sim_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="SIM card not found")
    return {"success": True}


@sim_cards_router.patch("/{sim_id}")
async def partial_update_sim_card(sim_id: str, update_data: dict = Body(...)):
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update_data.items() if v is not None}
    result = await db.sim_cards.update_one({"id": sim_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="SIM card not found")
    updated = await db.sim_cards.find_one({"id": sim_id}, {"_id": 0})
    return {"success": True, "sim_card": updated}


@sim_cards_router.delete("/{sim_id}")
async def delete_sim_card(sim_id: str):
    result = await db.sim_cards.delete_one({"id": sim_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SIM card not found")
    return {"success": True}
