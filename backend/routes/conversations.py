"""
Conversations/Direct Messages Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timezone
from jose import jwt, JWTError
import time

from config import db, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/conversations", tags=["Conversations"])
security = HTTPBearer()


class MessageSend(BaseModel):
    content: str


def get_user_id_from_token(credentials: HTTPAuthorizationCredentials):
    """Extract user_id from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def get_conversations(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all conversations for current user"""
    user_id = get_user_id_from_token(credentials)
    
    # Get all conversations where user is a participant
    convos_cursor = db.conversations.find({
        "participants": user_id
    }).sort("updated_at", -1)
    
    convos = await convos_cursor.to_list(length=50)
    
    result = []
    for convo in convos:
        # Get the other participant
        other_id = [p for p in convo["participants"] if p != user_id][0]
        other_user = await db.users.find_one({"id": other_id})
        
        if other_user:
            # Get last message
            last_msg = await db.direct_messages.find_one(
                {"conversation_id": convo["id"]},
                sort=[("created_at", -1)]
            )
            
            # Count unread messages
            unread_count = await db.direct_messages.count_documents({
                "conversation_id": convo["id"],
                "sender_id": {"$ne": user_id},
                "read": False
            })
            
            result.append({
                "id": convo["id"],
                "user": {
                    "id": other_user["id"],
                    "username": other_user["username"],
                    "name": other_user.get("name", other_user["username"]),
                    "avatar": other_user.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={other_user['username']}")
                },
                "last_message": {
                    "content": last_msg.get("content", "") if last_msg else "",
                    "created_at": last_msg.get("created_at", "") if last_msg else "",
                    "is_mine": last_msg.get("sender_id") == user_id if last_msg else False
                } if last_msg else None,
                "unread_count": unread_count,
                "updated_at": convo.get("updated_at", "")
            })
    
    return {"conversations": result}


@router.post("/{other_user_id}")
async def create_or_get_conversation(
    other_user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create or get existing conversation with another user"""
    user_id = get_user_id_from_token(credentials)
    
    # Check if other user exists
    other_user = await db.users.find_one({"id": other_user_id})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if conversation already exists
    existing = await db.conversations.find_one({
        "participants": {"$all": [user_id, other_user_id]}
    })
    
    if existing:
        return {"conversation_id": existing["id"]}
    
    # Create new conversation
    convo_id = str(int(time.time() * 1000))
    await db.conversations.insert_one({
        "id": convo_id,
        "participants": [user_id, other_user_id],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"conversation_id": convo_id}


@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get messages in a conversation"""
    user_id = get_user_id_from_token(credentials)
    
    # Verify user is participant
    convo = await db.conversations.find_one({"id": conversation_id})
    if not convo or user_id not in convo.get("participants", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get messages
    messages_cursor = db.direct_messages.find({
        "conversation_id": conversation_id
    }).sort("created_at", 1).limit(100)
    
    messages = await messages_cursor.to_list(length=100)
    
    # Mark messages as read
    await db.direct_messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": user_id}, "read": False},
        {"$set": {"read": True}}
    )
    
    result = []
    for msg in messages:
        sender = await db.users.find_one({"id": msg["sender_id"]})
        result.append({
            "id": msg["id"],
            "content": msg["content"],
            "sender": {
                "id": sender["id"] if sender else msg["sender_id"],
                "username": sender["username"] if sender else "Unknown",
                "avatar": sender.get("avatar", "") if sender else ""
            },
            "is_mine": msg["sender_id"] == user_id,
            "created_at": msg["created_at"],
            "read": msg.get("read", False)
        })
    
    return {"messages": result}


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    message_data: MessageSend,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send a message in a conversation"""
    user_id = get_user_id_from_token(credentials)
    
    # Verify user is participant
    convo = await db.conversations.find_one({"id": conversation_id})
    if not convo or user_id not in convo.get("participants", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not message_data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    msg_id = str(int(time.time() * 1000))
    new_message = {
        "id": msg_id,
        "conversation_id": conversation_id,
        "sender_id": user_id,
        "content": message_data.content.strip(),
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.direct_messages.insert_one(new_message)
    
    # Update conversation timestamp
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message_id": msg_id, "created_at": new_message["created_at"]}


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete/clear a conversation and all its messages"""
    user_id = get_user_id_from_token(credentials)
    
    # Verify user is participant
    convo = await db.conversations.find_one({"id": conversation_id})
    if not convo or user_id not in convo.get("participants", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete all messages in the conversation
    messages_result = await db.direct_messages.delete_many({"conversation_id": conversation_id})
    
    # Delete the conversation itself
    await db.conversations.delete_one({"id": conversation_id})
    
    return {"deleted": True, "messages_deleted": messages_result.deleted_count}
