"""
Notifications Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone
from jose import jwt, JWTError

from config import db, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/notifications", tags=["Notifications"])
security = HTTPBearer()


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
async def get_notifications(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user notifications"""
    user_id = get_user_id_from_token(credentials)
    
    notifications_cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(50)
    notifications = await notifications_cursor.to_list(length=50)
    
    result = []
    for notif in notifications:
        notif_data = {
            "id": notif.get("id", str(notif.get("_id", ""))),
            "type": notif["type"],
            "title": notif.get("title", ""),
            "message": notif.get("message", ""),
            "from_user": notif.get("from_user"),
            "thread_id": notif.get("thread_id"),
            "data": notif.get("data", {}),
            "read": notif.get("read", notif.get("is_read", False)),
            "created_at": notif["created_at"]
        }
        result.append(notif_data)
    
    # Get unread count
    unread_count = await db.notifications.count_documents({
        "user_id": user_id, 
        "$or": [{"read": False}, {"is_read": False}]
    })
    
    return {"notifications": result, "unread_count": unread_count}


@router.post("/read")
async def mark_notifications_read(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Mark all notifications as read"""
    user_id = get_user_id_from_token(credentials)
    
    await db.notifications.update_many(
        {"user_id": user_id, "$or": [{"read": False}, {"is_read": False}]},
        {"$set": {"read": True, "is_read": True}}
    )
    
    return {"message": "Notifications marked as read"}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark single notification as read"""
    user_id = get_user_id_from_token(credentials)
    
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user_id},
        {"$set": {"read": True}}
    )
    
    return {"message": "Notification marked as read"}
