# Users Routes - Extracted from server.py
from fastapi import APIRouter, HTTPException, Depends, File, Form, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from jose import jwt, JWTError
from pathlib import Path
import os
import base64

router = APIRouter(prefix="/users", tags=["users"])

# These will be injected
db = None
SECRET_KEY = None
ALGORITHM = "HS256"
security = HTTPBearer()
get_current_user = None
create_notification = None

def init_users_router(database, secret_key, auth_func, notif_func):
    global db, SECRET_KEY, get_current_user, create_notification
    db = database
    SECRET_KEY = secret_key
    get_current_user = auth_func
    create_notification = notif_func

class ImageUpload(BaseModel):
    image_data: str

# Follow System
@router.post("/{user_id}/follow")
async def follow_user(user_id: str, current_user = Depends(lambda: get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكنك متابعة نفسك")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    existing = await db.follows.find_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="أنت تتابع هذا المستخدم بالفعل")
    
    from uuid import uuid4
    follow_doc = {
        "id": str(uuid4())[:8],
        "follower_id": current_user.id,
        "following_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.follows.insert_one(follow_doc)
    
    if create_notification:
        await create_notification(
            user_id=user_id,
            notif_type="follow",
            from_user_id=current_user.id
        )
    
    return {"message": f"تمت متابعة {target_user['username']}"}

@router.delete("/{user_id}/follow")
async def unfollow_user(user_id: str, current_user = Depends(lambda: get_current_user)):
    result = await db.follows.delete_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="أنت لا تتابع هذا المستخدم")
    
    return {"message": "تم إلغاء المتابعة"}

@router.get("/{user_id}/followers")
async def get_followers(user_id: str, current_user = Depends(lambda: get_current_user)):
    follows = await db.follows.find({"following_id": user_id}, {"_id": 0}).to_list(1000)
    
    if not follows:
        return {"followers": [], "count": 0}
    
    follower_ids = [f["follower_id"] for f in follows]
    
    users_cursor = db.users.find({"id": {"$in": follower_ids}}, {"_id": 0, "password": 0})
    users_list = await users_cursor.to_list(1000)
    users_map = {u["id"]: u for u in users_list}
    
    current_follows = await db.follows.find({
        "follower_id": current_user.id,
        "following_id": {"$in": follower_ids}
    }, {"_id": 0}).to_list(1000)
    following_set = {f["following_id"] for f in current_follows}
    
    followers = []
    for follower_id in follower_ids:
        if follower_id in users_map:
            user = users_map[follower_id].copy()
            user["is_following"] = follower_id in following_set
            followers.append(user)
    
    return {"followers": followers, "count": len(followers)}

@router.get("/{user_id}/following")
async def get_following(user_id: str, current_user = Depends(lambda: get_current_user)):
    follows = await db.follows.find({"follower_id": user_id}, {"_id": 0}).to_list(1000)
    
    if not follows:
        return {"following": [], "count": 0}
    
    following_ids = [f["following_id"] for f in follows]
    
    users_cursor = db.users.find({"id": {"$in": following_ids}}, {"_id": 0, "password": 0})
    users_list = await users_cursor.to_list(1000)
    users_map = {u["id"]: u for u in users_list}
    
    current_follows = await db.follows.find({
        "follower_id": current_user.id,
        "following_id": {"$in": following_ids}
    }, {"_id": 0}).to_list(1000)
    following_set = {f["following_id"] for f in current_follows}
    
    following = []
    for fid in following_ids:
        if fid in users_map:
            user = users_map[fid].copy()
            user["is_following"] = fid in following_set
            following.append(user)
    
    return {"following": following, "count": len(following)}

@router.get("/{user_id}/profile")
async def get_user_profile(user_id: str, current_user = Depends(lambda: get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    followers_count = await db.follows.count_documents({"following_id": user_id})
    following_count = await db.follows.count_documents({"follower_id": user_id})
    
    is_following = await db.follows.find_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })
    
    return {
        **user,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following is not None,
        "is_self": user_id == current_user.id
    }
