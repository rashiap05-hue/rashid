from fastapi import APIRouter, HTTPException, Body
from typing import Optional
from db import db
from models.schemas import ActivityCreate
from datetime import datetime, timezone
import uuid

activities_router = APIRouter(prefix="/activities", tags=["Activities"])


@activities_router.get("")
async def get_activities(city: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    activities = await db.activities.find(query, {"_id": 0}).to_list(length=100)
    return {"success": True, "activities": activities}


@activities_router.get("/{activity_id}")
async def get_activity(activity_id: str):
    activity = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True, "activity": activity}


@activities_router.post("")
async def create_activity(activity: ActivityCreate):
    activity_dict = activity.dict()
    activity_dict["id"] = str(uuid.uuid4())
    activity_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.activities.insert_one(activity_dict)
    return {"success": True, "id": activity_dict["id"], "activity": {k: v for k, v in activity_dict.items() if k != "_id"}}


@activities_router.put("/{activity_id}")
async def update_activity(activity_id: str, activity: ActivityCreate):
    activity_dict = activity.dict()
    activity_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.activities.update_one({"id": activity_id}, {"$set": activity_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True, "activity": activity_dict}


@activities_router.patch("/{activity_id}")
async def partial_update_activity(activity_id: str, update_data: dict = Body(...)):
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update_data.items() if v is not None}
    result = await db.activities.update_one({"id": activity_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    updated = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    return {"success": True, "activity": updated}


@activities_router.delete("/{activity_id}")
async def delete_activity(activity_id: str):
    result = await db.activities.delete_one({"id": activity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True}
