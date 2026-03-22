"""
Authentication Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import re

from config import db, OWNER_EMAILS
from models.schemas import UserRegister, UserLogin, User, Token, ProfileUpdate
from services.auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(user_data: UserRegister):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")
    
    existing_username = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم مسبقاً")
    
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    
    if not re.match(r'^[a-zA-Z0-9_]+$', user_data.username):
        raise HTTPException(status_code=400, detail="اسم المستخدم يجب أن يحتوي على حروف وأرقام فقط")
    
    user_id = str(uuid.uuid4())[:8]
    
    role = "owner" if user_data.email in OWNER_EMAILS else "user"
    
    new_user = {
        "id": user_id,
        "email": user_data.email,
        "username": user_data.username,
        "name": user_data.name or user_data.username,
        "password": get_password_hash(user_data.password),
        "avatar": None,
        "bio": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "role": role,
        "is_banned": False,
        "banned_rooms": [],
        "coins": 1000,
        "level": 1,
        "xp": 0,
        "badges": [],
        "followers": [],
        "following": []
    }
    
    await db.users.insert_one(new_user)
    del new_user["password"]
    new_user.pop("_id", None)
    
    token = create_access_token({"sub": user_id})
    return Token(access_token=token, token_type="bearer", user=User(**new_user))


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    if "@" in user_data.identifier:
        user = await db.users.find_one({"email": user_data.identifier})
    else:
        user = await db.users.find_one({"username": user_data.identifier})
    
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=400, detail="بيانات الدخول غير صحيحة")
    
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="تم حظر حسابك")
    
    followers = await db.follows.find({"following_id": user["id"]}, {"_id": 0}).to_list(1000)
    following = await db.follows.find({"follower_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "name": user.get("name"),
        "avatar": user.get("avatar"),
        "bio": user.get("bio"),
        "created_at": user["created_at"],
        "role": user.get("role", "user"),
        "is_banned": user.get("is_banned", False),
        "banned_rooms": user.get("banned_rooms", []),
        "coins": user.get("coins", 1000),
        "level": user.get("level", 1),
        "xp": user.get("xp", 0),
        "badges": user.get("badges", []),
        "followers_count": len(followers),
        "following_count": len(following)
    }
    
    token = create_access_token({"sub": user["id"]})
    return Token(access_token=token, token_type="bearer", user=User(**user_response))


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    followers = await db.follows.find({"following_id": current_user.id}, {"_id": 0}).to_list(1000)
    following = await db.follows.find({"follower_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    return {
        **current_user.model_dump(),
        "followers_count": len(followers),
        "following_count": len(following)
    }


@router.put("/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    update_data = {}
    
    if profile_data.username and profile_data.username != current_user.username:
        existing = await db.users.find_one({"username": profile_data.username}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم مسبقاً")
        if not re.match(r'^[a-zA-Z0-9_]+$', profile_data.username):
            raise HTTPException(status_code=400, detail="اسم المستخدم يجب أن يحتوي على حروف وأرقام فقط")
        update_data["username"] = profile_data.username
    
    if profile_data.name is not None:
        update_data["name"] = profile_data.name
    if profile_data.bio is not None:
        update_data["bio"] = profile_data.bio
    if profile_data.avatar is not None:
        update_data["avatar"] = profile_data.avatar
    
    if update_data:
        await db.users.update_one({"id": current_user.id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    return updated_user
