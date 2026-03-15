from fastapi import APIRouter, HTTPException, Depends, Query
from db import db, get_current_user, logger
from models.schemas import TransferCreate
from datetime import datetime, timezone
import uuid

transfers_router = APIRouter(prefix="/transfers", tags=["Transfers"])

@transfers_router.get("")
async def get_transfers(city: str = None, direction: str = None, search: str = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if direction:
        query["transfer_direction"] = direction
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    transfers = await db.transfers.find(query, {"_id": 0}).to_list(500)
    return {"success": True, "transfers": transfers}

@transfers_router.post("")
async def create_transfer(transfer: TransferCreate, user: dict = Depends(get_current_user)):
    transfer_doc = transfer.dict()
    transfer_doc["id"] = str(uuid.uuid4())
    transfer_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.transfers.insert_one(transfer_doc)
    transfer_doc.pop("_id", None)
    return {"success": True, "transfer": transfer_doc}

@transfers_router.get("/{transfer_id}")
async def get_transfer(transfer_id: str):
    transfer = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return transfer

@transfers_router.put("/{transfer_id}")
async def update_transfer(transfer_id: str, transfer: TransferCreate, user: dict = Depends(get_current_user)):
    transfer_data = transfer.dict()
    transfer_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.transfers.update_one({"id": transfer_id}, {"$set": transfer_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    return {"success": True, "transfer": updated}

@transfers_router.delete("/{transfer_id}")
async def delete_transfer(transfer_id: str, user: dict = Depends(get_current_user)):
    result = await db.transfers.delete_one({"id": transfer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return {"success": True}
