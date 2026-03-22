"""
User Routes - Profile, Follow, etc.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from config import db
from models.schemas import User
from services.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=User)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("", response_model=List[User])
async def get_all_users(current_user: User = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [User(**u) for u in users]


@router.post("/{user_id}/follow")
async def follow_user(user_id: str, current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكنك متابعة نفسك")
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    existing_follow = await db.follows.find_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })
    
    if existing_follow:
        raise HTTPException(status_code=400, detail="أنت تتابع هذا المستخدم بالفعل")
    
    follow_doc = {
        "id": str(uuid.uuid4())[:8],
        "follower_id": current_user.id,
        "following_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.follows.insert_one(follow_doc)
    
    notification = {
        "id": str(uuid.uuid4())[:8],
        "user_id": user_id,
        "type": "follow",
        "title": "متابع جديد",
        "message": f"{current_user.username} بدأ بمتابعتك",
        "data": {
            "follower_id": current_user.id,
            "follower_username": current_user.username,
            "follower_avatar": current_user.avatar
        },
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "تمت المتابعة بنجاح"}


@router.delete("/{user_id}/follow")
async def unfollow_user(user_id: str, current_user: User = Depends(get_current_user)):
    result = await db.follows.delete_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="أنت لا تتابع هذا المستخدم")
    
    return {"message": "تم إلغاء المتابعة"}


@router.get("/{user_id}/followers")
async def get_followers(user_id: str, current_user: User = Depends(get_current_user)):
    follows = await db.follows.find({"following_id": user_id}, {"_id": 0}).to_list(1000)
    
    followers = []
    for follow in follows:
        user = await db.users.find_one({"id": follow["follower_id"]}, {"_id": 0, "password": 0})
        if user:
            is_following = await db.follows.find_one({
                "follower_id": current_user.id,
                "following_id": user["id"]
            })
            followers.append({
                **user,
                "is_following": is_following is not None,
                "followed_at": follow["created_at"]
            })
    
    return followers


@router.get("/{user_id}/following")
async def get_following(user_id: str, current_user: User = Depends(get_current_user)):
    follows = await db.follows.find({"follower_id": user_id}, {"_id": 0}).to_list(1000)
    
    following = []
    for follow in follows:
        user = await db.users.find_one({"id": follow["following_id"]}, {"_id": 0, "password": 0})
        if user:
            is_following = await db.follows.find_one({
                "follower_id": current_user.id,
                "following_id": user["id"]
            })
            following.append({
                **user,
                "is_following": is_following is not None,
                "followed_at": follow["created_at"]
            })
    
    return following


@router.get("/{user_id}/profile")
async def get_user_profile(user_id: str, current_user: User = Depends(get_current_user)):
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
        "is_self": current_user.id == user_id
    }
