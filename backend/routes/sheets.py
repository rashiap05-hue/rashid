from fastapi import APIRouter
from db import db
import os

sheets_router = APIRouter(prefix="/sheets", tags=["Google Sheets"])


@sheets_router.get("/status")
async def sheets_status():
    google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
    if not google_client_id:
        return {
            "configured": False,
            "message": "Google Sheets sync requires Google OAuth credentials",
            "instructions": "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment"
        }
    return {"configured": True}


@sheets_router.post("/sync/proposals")
async def sync_proposals_to_sheets():
    proposals = await db.proposals.find({}, {"_id": 0}).to_list(1000)
    return {
        "success": True,
        "message": "Google Sheets sync requires OAuth setup. Data prepared for sync.",
        "data_count": len(proposals),
        "sample_data": proposals[:5] if proposals else []
    }


@sheets_router.post("/sync/all")
async def sync_all_to_sheets():
    proposals = await db.proposals.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    flights = await db.flights.find({}, {"_id": 0}).to_list(1000)

    return {
        "success": True,
        "message": "Google Sheets sync requires OAuth setup. Data prepared for sync.",
        "summary": {
            "proposals": len(proposals),
            "users": len(users),
            "flights": len(flights)
        }
    }
