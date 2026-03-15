from fastapi import APIRouter, HTTPException, Depends, Query
from db import db, get_current_user, logger
from models.schemas import ActivityCreate
from datetime import datetime, timezone
import uuid

activities_router = APIRouter(prefix="/activities", tags=["Activities"])

@activities_router.get("")
async def get_activities(city: str = None, category: str = None, search: str = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    activities = await db.activities.find(query, {"_id": 0}).to_list(500)
    return {"success": True, "activities": activities}

@activities_router.post("")
async def create_activity(activity: ActivityCreate, user: dict = Depends(get_current_user)):
    activity_doc = activity.dict()
    activity_doc["id"] = str(uuid.uuid4())
    activity_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.activities.insert_one(activity_doc)
    activity_doc.pop("_id", None)
    return {"success": True, "activity": activity_doc}

@activities_router.get("/{activity_id}")
async def get_activity(activity_id: str):
    activity = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity

@activities_router.put("/{activity_id}")
async def update_activity(activity_id: str, activity: ActivityCreate, user: dict = Depends(get_current_user)):
    activity_data = activity.dict()
    activity_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.activities.update_one({"id": activity_id}, {"$set": activity_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    updated = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    return {"success": True, "activity": updated}

@activities_router.delete("/{activity_id}")
async def delete_activity(activity_id: str, user: dict = Depends(get_current_user)):
    result = await db.activities.delete_one({"id": activity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True}
