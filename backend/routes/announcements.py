"""
Announcements API - إعلانات للغرف المحددة
Owner only - المالك فقط يرسل الإعلانات
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from jose import jwt, JWTError
import uuid
import os

router = APIRouter(prefix="/announcements", tags=["announcements"])
security = HTTPBearer()

# Will be set by main server
db = None
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "koraverse_2026_secret_key_change_in_production")
ALGORITHM = "HS256"

def init_router(database, auth_func=None):
    global db
    db = database

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class AnnouncementCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    room_ids: List[str] = Field(..., min_items=1)
    
class AnnouncementUpdate(BaseModel):
    text: Optional[str] = None
    is_active: Optional[bool] = None

# ==================== CREATE ANNOUNCEMENT ====================
@router.post("")
async def create_announcement(data: AnnouncementCreate, current_user: dict = Depends(get_current_user)):
    """إنشاء إعلان جديد - المالك فقط"""
    
    # Only owner can create announcements
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="فقط المالك يمكنه إرسال الإعلانات")
    
    # Verify all rooms exist
    room_names = []
    for room_id in data.room_ids:
        room = await db.rooms.find_one({"id": room_id})
        if not room:
            raise HTTPException(status_code=404, detail=f"الغرفة {room_id} غير موجودة")
        room_names.append(room.get("title", "غرفة"))
    
    announcement_id = str(uuid.uuid4())[:8]
    
    announcement = {
        "id": announcement_id,
        "text": data.text,
        "room_ids": data.room_ids,
        "room_names": room_names,
        "created_by": current_user["id"],
        "created_by_name": current_user.get("username", "المالك"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.announcements.insert_one(announcement)
    
    return {
        "message": f"تم إرسال الإعلان إلى {len(data.room_ids)} غرفة",
        "announcement": {
            "id": announcement_id,
            "text": data.text,
            "room_ids": data.room_ids,
            "room_names": room_names
        }
    }

# ==================== GET ALL ANNOUNCEMENTS (Admin) ====================
@router.get("")
async def get_all_announcements(current_user: dict = Depends(get_current_user)):
    """الحصول على جميع الإعلانات - المالك فقط"""
    
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    announcements = await db.announcements.find(
        {}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"announcements": announcements}

# ==================== GET ALL ROOMS (for selection) ====================
@router.get("/rooms")
async def get_all_rooms_for_selection(current_user: dict = Depends(get_current_user)):
    """الحصول على جميع الغرف للاختيار - المالك فقط"""
    
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    rooms = await db.rooms.find(
        {}, 
        {"_id": 0, "id": 1, "title": 1, "room_type": 1, "image": 1}
    ).to_list(100)
    
    return {"rooms": rooms}

# ==================== GET ANNOUNCEMENTS FOR ROOM ====================
@router.get("/room/{room_id}")
async def get_room_announcements(room_id: str):
    """الحصول على الإعلانات النشطة لغرفة محددة"""
    
    announcements = await db.announcements.find(
        {
            "room_ids": room_id,
            "is_active": True
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    return {"announcements": announcements}

# ==================== UPDATE ANNOUNCEMENT ====================
@router.put("/{announcement_id}")
async def update_announcement(
    announcement_id: str, 
    data: AnnouncementUpdate,
    current_user: dict = Depends(get_current_user)
):
    """تحديث إعلان - المالك فقط"""
    
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    announcement = await db.announcements.find_one({"id": announcement_id})
    if not announcement:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    
    update_data = {}
    if data.text is not None:
        update_data["text"] = data.text
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    if update_data:
        await db.announcements.update_one(
            {"id": announcement_id},
            {"$set": update_data}
        )
    
    return {"message": "تم تحديث الإعلان"}

# ==================== DELETE ANNOUNCEMENT ====================
@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """حذف إعلان - المالك فقط"""
    
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    result = await db.announcements.delete_one({"id": announcement_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    
    return {"message": "تم حذف الإعلان"}

# ==================== TOGGLE ANNOUNCEMENT ====================
@router.post("/{announcement_id}/toggle")
async def toggle_announcement(
    announcement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """تفعيل/تعطيل إعلان - المالك فقط"""
    
    if current_user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    announcement = await db.announcements.find_one({"id": announcement_id})
    if not announcement:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    
    new_status = not announcement.get("is_active", True)
    
    await db.announcements.update_one(
        {"id": announcement_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {
        "message": "تم تفعيل الإعلان" if new_status else "تم تعطيل الإعلان",
        "is_active": new_status
    }
