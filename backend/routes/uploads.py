"""
Upload Routes - Avatar, Images, Media
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from fastapi.responses import FileResponse
import uuid
import os

from config import db, AVATARS_DIR, UPLOADS_DIR, THREAD_MEDIA_DIR
from models.schemas import User
from services.auth import get_current_user

router = APIRouter(tags=["Uploads"])


@router.post("/upload/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="يجب رفع صورة فقط")
    
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الملف كبير جداً (الحد الأقصى 5MB)")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = AVATARS_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    avatar_url = f"/api/static/avatars/{filename}"
    await db.users.update_one({"id": current_user.id}, {"$set": {"avatar": avatar_url}})
    
    return {"avatar_url": avatar_url}


@router.post("/upload/thread-media")
async def upload_thread_media(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    allowed_image_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    allowed_video_types = ["video/mp4", "video/webm", "video/quicktime"]
    
    if file.content_type not in allowed_image_types + allowed_video_types:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم")
    
    contents = await file.read()
    
    is_video = file.content_type in allowed_video_types
    max_size = 50 * 1024 * 1024 if is_video else 10 * 1024 * 1024
    
    if len(contents) > max_size:
        size_limit = "50MB" if is_video else "10MB"
        raise HTTPException(status_code=400, detail=f"حجم الملف كبير جداً (الحد الأقصى {size_limit})")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else ("mp4" if is_video else "jpg")
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = THREAD_MEDIA_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    media_url = f"/api/static/thread_media/{filename}"
    media_type = "video" if is_video else "image"
    
    return {"media_url": media_url, "media_type": media_type}


@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="يجب رفع صورة فقط")
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الملف كبير جداً (الحد الأقصى 10MB)")
    
    UPLOADS_DIR.mkdir(exist_ok=True)
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    image_url = f"/api/uploads/{filename}"
    
    return {"image_url": image_url}


@router.get("/uploads/{filename}")
async def get_upload(filename: str):
    filepath = UPLOADS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return FileResponse(filepath)
