# Messages Routes - Extracted from server.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

router = APIRouter(tags=["messages"])

# Dependencies
db = None
get_current_user = None

def init_messages_router(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func

# Models
class MessageCreate(BaseModel):
    content: str
    reply_to_id: Optional[str] = None
    reply_to_content: Optional[str] = None
    reply_to_username: Optional[str] = None

class ImageMessageCreate(BaseModel):
    image_url: str

class Message(BaseModel):
    id: str
    room_id: str
    user_id: str
    username: str
    avatar: str
    content: str
    image_url: Optional[str] = None
    reply_to_id: Optional[str] = None
    reply_to_content: Optional[str] = None
    reply_to_username: Optional[str] = None
    is_vip: bool = False
    timestamp: str
    
    class Config:
        extra = "ignore"

# Routes
@router.get("/rooms/{room_id}/messages")
async def get_room_messages(room_id: str, limit: int = 50):
    """Get messages for a room"""
    messages = await db.room_messages.find(
        {"room_id": room_id}, 
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return list(reversed(messages))

@router.post("/rooms/{room_id}/messages")
async def send_message(room_id: str, msg: MessageCreate, current_user = Depends(lambda: get_current_user)):
    """Send a message to a room"""
    from uuid import uuid4
    
    # Check if user is VIP
    user = await db.users.find_one({"id": current_user.id})
    is_vip = user.get("is_vip", False) or user.get("role") == "owner"
    
    message = {
        "id": str(uuid4()),
        "room_id": room_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "content": msg.content,
        "reply_to_id": msg.reply_to_id,
        "reply_to_content": msg.reply_to_content,
        "reply_to_username": msg.reply_to_username,
        "is_vip": is_vip,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.room_messages.insert_one(message)
    
    # Return without _id
    result = {k: v for k, v in message.items() if k != "_id"}
    return Message(**result)

@router.post("/rooms/{room_id}/messages/image")
async def send_image_message(room_id: str, data: ImageMessageCreate, current_user = Depends(lambda: get_current_user)):
    """Send an image message (VIP only)"""
    from uuid import uuid4
    
    # Check VIP status
    user = await db.users.find_one({"id": current_user.id})
    is_vip = user.get("is_vip", False) or user.get("role") == "owner"
    
    if not is_vip:
        raise HTTPException(status_code=403, detail="إرسال الصور متاح لأعضاء VIP فقط")
    
    message = {
        "id": str(uuid4()),
        "room_id": room_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "content": "",
        "image_url": data.image_url,
        "is_vip": True,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.room_messages.insert_one(message)
    
    return Message(**{k: v for k, v in message.items() if k != "_id"})

@router.delete("/rooms/{room_id}/messages/{message_id}")
async def delete_message(room_id: str, message_id: str, current_user = Depends(lambda: get_current_user)):
    """Delete a message"""
    message = await db.room_messages.find_one({"id": message_id, "room_id": room_id})
    
    if not message:
        raise HTTPException(status_code=404, detail="الرسالة غير موجودة")
    
    # Check permission
    if message["user_id"] != current_user.id and current_user.role not in ["admin", "owner"]:
        room = await db.rooms.find_one({"id": room_id})
        if not room or room.get("owner_id") != current_user.id:
            raise HTTPException(status_code=403, detail="غير مصرح لك بحذف هذه الرسالة")
    
    await db.room_messages.delete_one({"id": message_id})
    
    return {"message": "تم حذف الرسالة"}

@router.delete("/rooms/{room_id}/messages/clear")
async def clear_room_messages(room_id: str, current_user = Depends(lambda: get_current_user)):
    """Clear all messages in a room (owner/admin only)"""
    room = await db.rooms.find_one({"id": room_id})
    
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room.get("owner_id") != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك بمسح الرسائل")
    
    await db.room_messages.delete_many({"room_id": room_id})
    
    return {"message": "تم مسح جميع الرسائل"}
