from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.security import HTTPAuthorizationCredentials
from db import db, security, UPLOADS_DIR
from pathlib import Path
import uuid
import shutil
import os

uploads_router = APIRouter(prefix="/uploads", tags=["File Uploads"])

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv"}


@uploads_router.post("/hotel-image")
async def upload_hotel_image(
    file: UploadFile = File(...),
    hotel_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{hotel_id}_{unique_id}{file_ext}" if hotel_id else f"hotel_{unique_id}{file_ext}"
    file_path = UPLOADS_DIR / "hotels" / filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    image_url = f"/api/static/hotels/{filename}"
    return {"success": True, "url": image_url, "filename": filename}


@uploads_router.post("/room-image")
async def upload_room_image(
    file: UploadFile = File(...),
    room_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{room_id}_{unique_id}{file_ext}" if room_id else f"room_{unique_id}{file_ext}"
    file_path = UPLOADS_DIR / "rooms" / filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    image_url = f"/api/static/rooms/{filename}"
    return {"success": True, "url": image_url, "filename": filename}


@uploads_router.post("/activity-image")
async def upload_activity_image(
    file: UploadFile = File(...),
    activity_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{activity_id}_{unique_id}{file_ext}" if activity_id else f"activity_{unique_id}{file_ext}"
    file_path = UPLOADS_DIR / "activities" / filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    image_url = f"/api/static/activities/{filename}"
    return {"success": True, "url": image_url, "filename": filename}


@uploads_router.post("/activity-video")
async def upload_activity_video(
    file: UploadFile = File(...),
    activity_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid video type. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}")
    videos_dir = UPLOADS_DIR / "videos"
    videos_dir.mkdir(exist_ok=True)
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{activity_id}_{unique_id}{file_ext}" if activity_id else f"video_{unique_id}{file_ext}"
    file_path = videos_dir / filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")
    video_url = f"/api/static/videos/{filename}"
    return {"success": True, "url": video_url, "filename": filename}


@uploads_router.post("/transfer-video")
async def upload_transfer_video(
    file: UploadFile = File(...),
    transfer_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid video type. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}")
    videos_dir = UPLOADS_DIR / "videos"
    videos_dir.mkdir(exist_ok=True)
    unique_id = str(uuid.uuid4())[:8]
    filename = f"transfer_{transfer_id}_{unique_id}{file_ext}" if transfer_id else f"transfer_{unique_id}{file_ext}"
    file_path = videos_dir / filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")
    video_url = f"/api/static/videos/{filename}"
    return {"success": True, "url": video_url, "filename": filename}


@uploads_router.delete("/video")
async def delete_uploaded_video(
    filename: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    file_path = UPLOADS_DIR / "videos" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    try:
        os.remove(file_path)
        return {"success": True, "message": "Video deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")


@uploads_router.delete("/image")
async def delete_uploaded_image(
    filename: str = Query(...),
    image_type: str = Query(..., regex="^(hotels|rooms|activities)$"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    file_path = UPLOADS_DIR / image_type / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        os.remove(file_path)
        return {"success": True, "message": "Image deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")
