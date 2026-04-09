# Rooms Routes - Extracted from server.py
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from jose import jwt
import os

router = APIRouter(prefix="/rooms", tags=["rooms"])

# Dependencies - will be injected from server.py
db = None
SECRET_KEY = None
ALGORITHM = "HS256"
security = HTTPBearer()
get_current_user = None
User = None
RoomFull = None
RoomCreate = None

def init_rooms_router(database, secret_key, auth_func, user_model, room_full_model, room_create_model):
    """Initialize router with dependencies from server.py"""
    global db, SECRET_KEY, get_current_user, User, RoomFull, RoomCreate
    db = database
    SECRET_KEY = secret_key
    get_current_user = auth_func
    User = user_model
    RoomFull = room_full_model
    RoomCreate = room_create_model

# Models
class RoomTitleUpdate(BaseModel):
    title: str

class RoomImageUpdate(BaseModel):
    image: str

# Routes
@router.get("")
async def get_rooms(category: Optional[str] = None, authorization: Optional[str] = Header(None)):
    """Get all rooms with participant counts"""
    query = {}
    if category and category != "الكل":
        query["category"] = category
    
    rooms = await db.rooms.find(query, {"_id": 0}).to_list(100)
    
    if not rooms:
        return []
    
    # Get current user's favorite rooms if authenticated
    user_favorites = []
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.split(" ")[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user = await db.users.find_one({"id": user_id})
                if user:
                    user_favorites = user.get("favorite_rooms", [])
        except:
            pass
    
    # Get all room IDs
    room_ids = [r["id"] for r in rooms]
    
    # Batch count participants
    pipeline = [
        {"$match": {"room_id": {"$in": room_ids}}},
        {"$group": {"_id": "$room_id", "count": {"$sum": 1}}}
    ]
    counts_cursor = db.room_participants.aggregate(pipeline)
    counts_list = await counts_cursor.to_list(100)
    counts_map = {c["_id"]: c["count"] for c in counts_list}
    
    # Batch count members
    member_pipeline = [
        {"$match": {"room_id": {"$in": room_ids}}},
        {"$group": {"_id": "$room_id", "count": {"$sum": 1}}}
    ]
    member_counts_cursor = db.room_members.aggregate(member_pipeline)
    member_counts_list = await member_counts_cursor.to_list(100)
    member_counts_map = {c["_id"]: c["count"] for c in member_counts_list}
    
    # Add counts and favorite status
    result = []
    for room in rooms:
        room["participant_count"] = counts_map.get(room["id"], 0)
        room["member_count"] = member_counts_map.get(room["id"], 0) + 1
        if "room_type" not in room:
            room["room_type"] = "all"
        
        room_data = RoomFull(**room).model_dump()
        room_data["is_favorite"] = room["id"] in user_favorites
        result.append(room_data)
    
    return result

@router.post("/{room_id}/favorite")
async def toggle_favorite_room(room_id: str, current_user = Depends(lambda: get_current_user)):
    """Toggle favorite status for a room"""
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    favorite_rooms = user.get("favorite_rooms", [])
    
    if room_id in favorite_rooms:
        await db.users.update_one(
            {"id": current_user.id},
            {"$pull": {"favorite_rooms": room_id}}
        )
        return {"message": "تمت إزالة الغرفة من المفضلة", "is_favorite": False}
    else:
        await db.users.update_one(
            {"id": current_user.id},
            {"$addToSet": {"favorite_rooms": room_id}}
        )
        return {"message": "تمت إضافة الغرفة للمفضلة", "is_favorite": True}

@router.get("/favorites")
async def get_favorite_rooms(current_user = Depends(lambda: get_current_user)):
    """Get user's favorite rooms"""
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        return []
    
    favorite_ids = user.get("favorite_rooms", [])
    if not favorite_ids:
        return []
    
    rooms = await db.rooms.find({"id": {"$in": favorite_ids}}, {"_id": 0}).to_list(100)
    
    for room in rooms:
        count = await db.room_participants.count_documents({"room_id": room["id"]})
        room["participant_count"] = count
        room["is_favorite"] = True
    
    return rooms

@router.post("/create")
async def create_room(room_data: RoomCreate, current_user = Depends(lambda: get_current_user)):
    """Create a new room"""
    from uuid import uuid4
    
    room_id = str(uuid4())[:8]
    new_room = {
        "id": room_id,
        "title": room_data.title,
        "description": room_data.description or "",
        "category": room_data.category or "عام",
        "image": room_data.image or f"https://ui-avatars.com/api/?name={room_data.title}&background=A3E635&color=0F172A&size=200",
        "owner_id": current_user.id,
        "is_closed": False,
        "room_type": room_data.room_type or "all",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.rooms.insert_one(new_room)
    
    created_room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    return RoomFull(**created_room)

@router.get("/{room_id}")
async def get_room(room_id: str):
    """Get room details"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    count = await db.room_participants.count_documents({"room_id": room_id})
    room["participant_count"] = count
    
    return RoomFull(**room)

@router.post("/{room_id}/end")
async def end_room(room_id: str, current_user = Depends(lambda: get_current_user)):
    """End/close a room"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room.get("owner_id") != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك بإنهاء هذه الغرفة")
    
    await db.rooms.update_one({"id": room_id}, {"$set": {"is_closed": True}})
    await db.room_participants.delete_many({"room_id": room_id})
    
    return {"message": "تم إنهاء الغرفة بنجاح"}

@router.put("/{room_id}/title")
async def update_room_title(room_id: str, data: RoomTitleUpdate, current_user = Depends(lambda: get_current_user)):
    """Update room title"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room.get("owner_id") != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك بتعديل هذه الغرفة")
    
    await db.rooms.update_one({"id": room_id}, {"$set": {"title": data.title}})
    
    updated = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    return {"message": "تم تحديث عنوان الغرفة", "room": updated}

@router.put("/{room_id}/image")
async def update_room_image(room_id: str, data: RoomImageUpdate, current_user = Depends(lambda: get_current_user)):
    """Update room image"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room.get("owner_id") != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك بتعديل هذه الغرفة")
    
    await db.rooms.update_one({"id": room_id}, {"$set": {"image": data.image}})
    
    return {"message": "تم تحديث صورة الغرفة"}
