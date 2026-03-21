from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import db
from datetime import datetime, timezone, timedelta
import uuid

supplier_router = APIRouter(prefix="/supplier", tags=["Supplier"])


class BookingCreate(BaseModel):
    transfer_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_date: str
    pickup_time: str
    passengers: int = 1
    notes: Optional[str] = None


@supplier_router.get("/dashboard")
async def get_supplier_dashboard(supplier_name: str):
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(100)
    transfer_ids = [t["id"] for t in transfers]
    bookings = await db.bookings.find({"transfer_id": {"$in": transfer_ids}}, {"_id": 0}).to_list(500)

    total_transfers = len(transfers)
    total_bookings = len(bookings)
    pending_bookings = len([b for b in bookings if b.get("status") == "pending"])
    confirmed_bookings = len([b for b in bookings if b.get("status") == "confirmed"])
    completed_bookings = len([b for b in bookings if b.get("status") == "completed"])
    total_earnings = sum(b.get("supplier_earnings", 0) for b in bookings if b.get("status") in ["confirmed", "completed"])
    pending_earnings = sum(b.get("supplier_earnings", 0) for b in bookings if b.get("status") == "pending")

    return {
        "success": True,
        "stats": {
            "total_transfers": total_transfers,
            "total_bookings": total_bookings,
            "pending_bookings": pending_bookings,
            "confirmed_bookings": confirmed_bookings,
            "completed_bookings": completed_bookings,
            "total_earnings": total_earnings,
            "pending_earnings": pending_earnings
        },
        "transfers": transfers,
        "recent_bookings": bookings[:20]
    }


@supplier_router.get("/transfers")
async def get_supplier_transfers(supplier_name: str):
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(100)
    return {"success": True, "transfers": transfers}


@supplier_router.put("/transfers/{transfer_id}")
async def update_supplier_transfer(transfer_id: str, supplier_name: str, transfer_data: dict):
    existing = await db.transfers.find_one({"id": transfer_id, "supplier_name": supplier_name})
    if not existing:
        raise HTTPException(status_code=404, detail="Transfer not found or not owned by supplier")
    allowed_fields = ["is_available", "pickup_times", "description", "duration", "confirmation_time"]
    update_data = {k: v for k, v in transfer_data.items() if k in allowed_fields}
    if update_data:
        await db.transfers.update_one({"id": transfer_id}, {"$set": update_data})
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    return {"success": True, "transfer": updated}


@supplier_router.get("/bookings")
async def get_supplier_bookings(supplier_name: str, status: Optional[str] = None):
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"id": 1, "_id": 0}).to_list(100)
    transfer_ids = [t["id"] for t in transfers]
    query = {"transfer_id": {"$in": transfer_ids}}
    if status:
        query["status"] = status
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    transfer_map = {t["id"]: t for t in await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(100)}
    for booking in bookings:
        booking["transfer"] = transfer_map.get(booking["transfer_id"], {})
    return {"success": True, "bookings": bookings}


@supplier_router.post("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, supplier_name: str, status: str):
    if status not in ["confirmed", "rejected", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    transfer = await db.transfers.find_one({"id": booking["transfer_id"], "supplier_name": supplier_name})
    if not transfer:
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "message": f"Booking status updated to {status}"}


@supplier_router.get("/earnings")
async def get_supplier_earnings(supplier_name: str, period: str = "all"):
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(100)
    transfer_ids = [t["id"] for t in transfers]
    bookings = await db.bookings.find({
        "transfer_id": {"$in": transfer_ids},
        "status": {"$in": ["confirmed", "completed"]}
    }, {"_id": 0}).to_list(1000)

    earnings_by_transfer = {}
    for booking in bookings:
        tid = booking["transfer_id"]
        if tid not in earnings_by_transfer:
            earnings_by_transfer[tid] = {"count": 0, "total": 0}
        earnings_by_transfer[tid]["count"] += 1
        earnings_by_transfer[tid]["total"] += booking.get("supplier_earnings", 0)

    transfer_map = {t["id"]: t for t in transfers}
    earnings_report = []
    for tid, data in earnings_by_transfer.items():
        transfer = transfer_map.get(tid, {})
        earnings_report.append({
            "transfer_id": tid,
            "transfer_title": transfer.get("title", "Unknown"),
            "booking_count": data["count"],
            "total_earnings": data["total"]
        })

    total_earnings = sum(e["total_earnings"] for e in earnings_report)
    total_bookings = sum(e["booking_count"] for e in earnings_report)

    return {
        "success": True,
        "summary": {
            "total_earnings": total_earnings,
            "total_bookings": total_bookings,
            "transfer_count": len(earnings_report)
        },
        "by_transfer": earnings_report
    }


@supplier_router.post("/bookings/create-sample")
async def create_sample_bookings(supplier_name: str):
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(10)
    if not transfers:
        return {"success": False, "message": "No transfers found for supplier"}

    sample_bookings = []
    statuses = ["pending", "confirmed", "completed", "pending", "confirmed"]

    for i, transfer in enumerate(transfers[:5]):
        pickup_times = transfer.get("pickup_times")
        pickup_time = "09:00"
        if isinstance(pickup_times, list) and len(pickup_times) > 0:
            pickup_time = pickup_times[0]

        booking = {
            "id": str(uuid.uuid4()),
            "transfer_id": str(transfer["id"]),
            "customer_name": f"Test Customer {i+1}",
            "customer_email": f"customer{i+1}@test.com",
            "customer_phone": f"+971 50 123 456{i}",
            "pickup_date": (datetime.now(timezone.utc) + timedelta(days=i+1)).strftime("%Y-%m-%d"),
            "pickup_time": str(pickup_time),
            "passengers": (i % 4) + 1,
            "status": statuses[i % len(statuses)],
            "supplier_earnings": float(transfer.get("supplier_cost", 50)),
            "total_price": float(transfer.get("price", 100)),
            "notes": f"Test booking for {transfer.get('title', 'transfer')}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        sample_bookings.append(booking)

    if sample_bookings:
        await db.bookings.insert_many(sample_bookings)

    response_bookings = [{k: v for k, v in b.items() if k != "_id"} for b in sample_bookings]
    return {"success": True, "created": len(response_bookings), "bookings": response_bookings}
