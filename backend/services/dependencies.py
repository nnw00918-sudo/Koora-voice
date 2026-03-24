"""
Shared Dependencies for all routes
Contains authentication helpers, permission checks, and notification creation
"""
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone
from jose import jwt, JWTError
import time

from config import db, SECRET_KEY, ALGORITHM, ws_manager

security = HTTPBearer()


# ==================== AUTH HELPERS ====================

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


async def get_current_user_dict(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user as dictionary"""
    user_id = get_user_id_from_token(credentials)
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_admin_user_check(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Check if user is admin or owner"""
    user = await get_current_user_dict(credentials)
    if user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def get_owner_user_check(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Check if user is system owner"""
    user = await get_current_user_dict(credentials)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return user


# ==================== PERMISSION HELPERS ====================

def has_permission(user_role: str, required_roles: list) -> bool:
    """Check if user has required permission based on role hierarchy"""
    return user_role in required_roles


def can_manage_stage(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can approve mic requests and manage stage"""
    if user_role == "owner":
        return True
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return user_role in ["admin", "mod"]


def can_kick_mute(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can kick and mute users"""
    if user_role == "owner":
        return True
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return user_role in ["admin"]


# ==================== NOTIFICATION HELPER ====================

async def create_notification(user_id: str, notif_type: str, from_user_id: str, thread_id: str = None, message: str = None):
    """Create a notification and send via WebSocket if user is online"""
    from_user = await db.users.find_one({"id": from_user_id})
    if not from_user:
        return
    
    # Generate notification message based on type
    messages = {
        "follow": f"@{from_user['username']} بدأ بمتابعتك",
        "like": f"@{from_user['username']} أعجب بمنشورك",
        "comment": f"@{from_user['username']} علق على منشورك",
        "reply": f"@{from_user['username']} رد على تعليقك",
        "mention": f"@{from_user['username']} أشار إليك في منشور",
        "repost": f"@{from_user['username']} أعاد نشر منشورك",
        "gift": message or f"@{from_user['username']} أرسل لك هدية",
        "room_invite": f"@{from_user['username']} دعاك للانضمام لغرفة"
    }
    
    notif_message = messages.get(notif_type, f"إشعار من @{from_user['username']}")
    
    notification = {
        "id": str(int(time.time() * 1000)),
        "user_id": user_id,
        "type": notif_type,
        "message": notif_message,
        "from_user": {
            "id": from_user["id"],
            "username": from_user["username"],
            "avatar": from_user.get("avatar")
        },
        "thread_id": thread_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    
    # Send via WebSocket if user is online
    await ws_manager.send_personal_message({
        "type": "notification",
        "notification": {
            "id": notification["id"],
            "type": notif_type,
            "message": notif_message,
            "from_user": notification["from_user"],
            "thread_id": thread_id,
            "created_at": notification["created_at"]
        }
    }, user_id)
    
    return notification
