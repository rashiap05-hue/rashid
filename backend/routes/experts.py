from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from db import db, get_current_user
import uuid
from datetime import datetime, timezone
from pathlib import Path

experts_router = APIRouter(prefix="/experts", tags=["Experts"])

UPLOADS_DIR = Path("/app/backend/uploads/experts")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@experts_router.get("")
async def get_experts():
    experts = await db.destination_experts.find({}, {"_id": 0}).to_list(100)
    return experts


@experts_router.get("/{expert_id}")
async def get_expert(expert_id: str):
    expert = await db.destination_experts.find_one({"id": expert_id}, {"_id": 0})
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    return expert


@experts_router.post("")
async def create_expert(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    location: str = Form(""),
    photo: UploadFile = File(None),
):
    expert_id = str(uuid.uuid4())
    photo_url = ""
    if photo and photo.filename:
        ext = photo.filename.rsplit(".", 1)[-1] if "." in photo.filename else "jpg"
        fname = f"{expert_id}.{ext}"
        fpath = UPLOADS_DIR / fname
        content = await photo.read()
        fpath.write_bytes(content)
        photo_url = f"/api/static/experts/{fname}"

    doc = {
        "id": expert_id,
        "name": name,
        "email": email,
        "phone": phone,
        "location": location,
        "photo": photo_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.destination_experts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@experts_router.put("/{expert_id}")
async def update_expert(
    expert_id: str,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    location: str = Form(""),
    photo: UploadFile = File(None),
):
    update = {"name": name, "email": email, "phone": phone, "location": location}
    if photo and photo.filename:
        ext = photo.filename.rsplit(".", 1)[-1] if "." in photo.filename else "jpg"
        fname = f"{expert_id}.{ext}"
        fpath = UPLOADS_DIR / fname
        content = await photo.read()
        fpath.write_bytes(content)
        update["photo"] = f"/api/static/experts/{fname}"

    result = await db.destination_experts.update_one({"id": expert_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expert not found")
    return {"success": True}


@experts_router.delete("/{expert_id}")
async def delete_expert(expert_id: str):
    result = await db.destination_experts.delete_one({"id": expert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expert not found")
    return {"success": True}


# Assign expert to proposal
@experts_router.post("/assign/{proposal_id}")
async def assign_expert_to_proposal(proposal_id: str, body: dict):
    expert_id = body.get("expert_id")
    if not expert_id:
        raise HTTPException(status_code=400, detail="expert_id is required")
    expert = await db.destination_experts.find_one({"id": expert_id}, {"_id": 0})
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    result = await db.proposals.update_one(
        {"id": proposal_id},
        {"$set": {"assigned_expert_id": expert_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True, "expert": expert}
