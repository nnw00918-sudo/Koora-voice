"""
Push Notifications Routes
Web Push Notifications using VAPID
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timezone
from jose import jwt, JWTError
import aiohttp
import os
import json

from config import db, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/push", tags=["Push Notifications"])
security = HTTPBearer()

# VAPID keys from environment
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@kooravoice.com")


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # {p256dh: str, auth: str}


class PushMessage(BaseModel):
    title: str
    body: str
    icon: str = "/logo192.png"
    badge: str = "/logo192.png"
    tag: str = "koora-voice"
    url: str = "/"


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


@router.get("/vapid-key")
async def get_vapid_public_key():
    """Get the VAPID public key for client subscription"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="Push notifications not configured")
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe_to_push(
    subscription: PushSubscription,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Subscribe a user to push notifications"""
    user_id = get_user_id_from_token(credentials)
    
    # Check if subscription already exists for this user
    existing = await db.push_subscriptions.find_one({
        "user_id": user_id,
        "endpoint": subscription.endpoint
    })
    
    if existing:
        # Update existing subscription
        await db.push_subscriptions.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "keys": subscription.keys,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Subscription updated", "subscribed": True}
    
    # Create new subscription
    await db.push_subscriptions.insert_one({
        "user_id": user_id,
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Subscribed to push notifications", "subscribed": True}


@router.delete("/unsubscribe")
async def unsubscribe_from_push(
    subscription: PushSubscription,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Unsubscribe from push notifications"""
    user_id = get_user_id_from_token(credentials)
    
    result = await db.push_subscriptions.delete_one({
        "user_id": user_id,
        "endpoint": subscription.endpoint
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"message": "Unsubscribed from push notifications", "subscribed": False}


@router.get("/status")
async def get_push_status(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Check if user has active push subscription"""
    user_id = get_user_id_from_token(credentials)
    
    count = await db.push_subscriptions.count_documents({"user_id": user_id})
    
    return {
        "subscribed": count > 0,
        "subscription_count": count
    }


async def send_push_notification(user_id: str, title: str, body: str, url: str = "/", data: dict = None):
    """Send push notification to a user (helper function for other routes)"""
    try:
        from webpush import WebPush, WebPushSubscription
        
        if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
            return False
        
        # Get user's subscriptions
        subscriptions = await db.push_subscriptions.find({"user_id": user_id}).to_list(10)
        
        if not subscriptions:
            return False
        
        # Initialize WebPush
        wp = WebPush(
            public_key=VAPID_PUBLIC_KEY,
            private_key=VAPID_PRIVATE_KEY,
            subscriber=VAPID_SUBJECT
        )
        
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/logo192.png",
            "badge": "/logo192.png",
            "tag": "koora-voice",
            "url": url,
            "data": data or {}
        })
        
        success_count = 0
        for sub in subscriptions:
            try:
                subscription = WebPushSubscription(
                    endpoint=sub["endpoint"],
                    keys={
                        "p256dh": sub["keys"]["p256dh"],
                        "auth": sub["keys"]["auth"]
                    }
                )
                
                message = wp.get(message=payload, subscription=subscription)
                
                async with aiohttp.ClientSession() as session:
                    response = await session.post(
                        url=str(subscription.endpoint),
                        data=message.encrypted,
                        headers=dict(message.headers)
                    )
                    
                    if response.status in [200, 201]:
                        success_count += 1
                    elif response.status in [404, 410]:
                        # Subscription expired, remove it
                        await db.push_subscriptions.delete_one({"_id": sub["_id"]})
                        
            except Exception as e:
                print(f"Push notification error for subscription: {e}")
                continue
        
        return success_count > 0
        
    except ImportError:
        print("webpush not installed")
        return False
    except Exception as e:
        print(f"Push notification error: {e}")
        return False


# Test endpoint (for development)
@router.post("/test")
async def test_push_notification(
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send a test push notification to current user"""
    user_id = get_user_id_from_token(credentials)
    
    # Send in background
    background_tasks.add_task(
        send_push_notification,
        user_id,
        "اختبار الإشعارات 🔔",
        "هذا إشعار تجريبي من صوت الكورة!",
        "/"
    )
    
    return {"message": "Test notification queued"}
