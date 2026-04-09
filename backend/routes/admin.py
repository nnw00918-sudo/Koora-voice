# Admin Routes - Extracted from server.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["admin"])

# Dependencies
db = None
get_admin_user = None
get_owner_user = None

def init_admin_router(database, admin_func, owner_func):
    global db, get_admin_user, get_owner_user
    db = database
    get_admin_user = admin_func
    get_owner_user = owner_func

# Models
class RoomCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = "عام"
    image: Optional[str] = None
    room_type: Optional[str] = "all"

class RoomUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    image: Optional[str] = None
    is_closed: Optional[bool] = None

class BroadcastMessage(BaseModel):
    message: str

class RoleUpdate(BaseModel):
    role: str

# Routes
@router.post("/rooms", dependencies=[Depends(lambda: get_admin_user)])
async def admin_create_room(room: RoomCreate):
    """Admin: Create a new room"""
    from uuid import uuid4
    room_id = str(uuid4())[:8]
    new_room = room.model_dump()
    new_room["id"] = room_id
    new_room["is_closed"] = False
    new_room["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.rooms.insert_one(new_room)
    
    created_room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    return {"message": "تم إنشاء الغرفة بنجاح", "room": created_room}

@router.put("/rooms/{room_id}", dependencies=[Depends(lambda: get_admin_user)])
async def admin_update_room(room_id: str, updates: RoomUpdate):
    """Admin: Update room"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    update_data = updates.model_dump(exclude_none=True)
    await db.rooms.update_one({"id": room_id}, {"$set": update_data})
    
    updated_room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    return {"message": "تم تحديث الغرفة بنجاح", "room": updated_room}

@router.delete("/rooms/{room_id}", dependencies=[Depends(lambda: get_admin_user)])
async def admin_delete_room(room_id: str):
    """Admin: Delete a room"""
    result = await db.rooms.delete_one({"id": room_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Clean up related data
    await db.room_participants.delete_many({"room_id": room_id})
    await db.room_messages.delete_many({"room_id": room_id})
    await db.room_members.delete_many({"room_id": room_id})
    
    return {"message": "تم حذف الغرفة بنجاح"}

@router.post("/users/{user_id}/ban", dependencies=[Depends(lambda: get_admin_user)])
async def ban_user(user_id: str):
    """Admin: Ban a user"""
    await db.users.update_one({"id": user_id}, {"$set": {"is_banned": True}})
    return {"message": "تم حظر المستخدم"}

@router.post("/users/{user_id}/unban", dependencies=[Depends(lambda: get_admin_user)])
async def unban_user(user_id: str):
    """Admin: Unban a user"""
    await db.users.update_one({"id": user_id}, {"$set": {"is_banned": False}})
    return {"message": "تم رفع الحظر عن المستخدم"}

@router.post("/users/{user_id}/role", dependencies=[Depends(lambda: get_owner_user)])
async def change_user_role(user_id: str, data: RoleUpdate):
    """Owner: Change user role"""
    valid_roles = ["user", "vip", "moderator", "admin"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail="صلاحية غير صالحة")
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": data.role}})
    return {"message": f"تم تغيير صلاحية المستخدم إلى {data.role}"}

@router.get("/stats", dependencies=[Depends(lambda: get_admin_user)])
async def get_admin_stats():
    """Admin: Get system statistics"""
    total_users = await db.users.count_documents({})
    total_rooms = await db.rooms.count_documents({})
    active_rooms = await db.rooms.count_documents({"is_closed": False})
    total_messages = await db.room_messages.count_documents({})
    vip_users = await db.users.count_documents({"is_vip": True})
    
    return {
        "total_users": total_users,
        "total_rooms": total_rooms,
        "active_rooms": active_rooms,
        "total_messages": total_messages,
        "vip_users": vip_users
    }

@router.post("/broadcast", dependencies=[Depends(lambda: get_admin_user)])
async def broadcast_message(broadcast: BroadcastMessage):
    """Admin: Broadcast message to all rooms"""
    from uuid import uuid4
    message_id = str(uuid4())
    
    rooms = await db.rooms.find({}, {"_id": 0, "id": 1}).to_list(100)
    
    for room in rooms:
        message_doc = {
            "id": f"{message_id}_{room['id']}",
            "room_id": room["id"],
            "user_id": "system",
            "username": "الإدارة",
            "avatar": "https://ui-avatars.com/api/?name=Admin&background=EF4444&color=fff&bold=true",
            "content": f"📢 إعلان: {broadcast.message}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.room_messages.insert_one(message_doc)
    
    return {"message": "تم إرسال الإعلان لجميع الغرف"}
