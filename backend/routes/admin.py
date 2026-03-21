from fastapi import APIRouter, HTTPException
from db import db
from models.schemas import UserUpdate
from datetime import datetime, timezone, timedelta

admin_router = APIRouter(prefix="/admin", tags=["Admin"])


@admin_router.get("/users")
async def get_all_users():
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    enriched_users = []
    for user in users:
        proposals = await db.proposals.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
        proposals_count = len(proposals)
        total_value = sum(p.get("total_price", 0) for p in proposals)
        enriched_users.append({
            **user,
            "role": user.get("role", "agent"),
            "status": user.get("status", "active"),
            "proposals_count": proposals_count,
            "total_bookings_value": total_value
        })
    return {"success": True, "users": enriched_users}


@admin_router.get("/users/{user_id}")
async def get_user_details(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    proposals = await db.proposals.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    payments = await db.payment_transactions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return {
        "success": True,
        "user": {**user, "role": user.get("role", "agent"), "status": user.get("status", "active")},
        "proposals": proposals,
        "payments": payments,
        "stats": {
            "proposals_count": len(proposals),
            "confirmed_count": len([p for p in proposals if p.get("status") == "confirmed"]),
            "pending_count": len([p for p in proposals if p.get("status") == "pending"]),
            "total_value": sum(p.get("total_price", 0) for p in proposals)
        }
    }


@admin_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "User updated successfully"}


@admin_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db.proposals.delete_many({"user_id": user_id})
    return {"success": True, "message": "User deleted successfully"}


@admin_router.get("/stats")
async def get_admin_stats():
    users_count = await db.users.count_documents({})
    proposals_count = await db.proposals.count_documents({})
    confirmed_count = await db.proposals.count_documents({"status": "confirmed"})
    pending_count = await db.proposals.count_documents({"status": "pending"})
    proposals = await db.proposals.find({"status": "confirmed"}, {"_id": 0, "total_price": 1}).to_list(10000)
    total_revenue = sum(p.get("total_price", 0) for p in proposals)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_users = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})
    return {
        "success": True,
        "stats": {
            "total_users": users_count,
            "total_proposals": proposals_count,
            "confirmed_proposals": confirmed_count,
            "pending_proposals": pending_count,
            "total_revenue": total_revenue,
            "recent_signups": recent_users
        }
    }


@admin_router.post("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str):
    if role not in ["admin", "agent", "manager", "supplier"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": f"User role updated to {role}"}


@admin_router.post("/users/{user_id}/status")
async def update_user_status(user_id: str, status: str):
    if status not in ["active", "suspended", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.users.update_one({"id": user_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": f"User status updated to {status}"}
