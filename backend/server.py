from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, Form, UploadFile, WebSocket, WebSocketDisconnect, Header, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from agora_token_builder import RtcTokenBuilder
import time
import json
import httpx
import functools

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create static directories
STATIC_DIR = ROOT_DIR / "static"
AVATARS_DIR = STATIC_DIR / "avatars"
STATIC_DIR.mkdir(exist_ok=True)
AVATARS_DIR.mkdir(exist_ok=True)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Simple in-memory cache for API responses
_cache = {}
_cache_ttl = {}

def cache_response(ttl_seconds: int = 30):
    """Simple cache decorator for API responses"""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            now = time.time()
            
            if cache_key in _cache and _cache_ttl.get(cache_key, 0) > now:
                return _cache[cache_key]
            
            result = await func(*args, **kwargs)
            _cache[cache_key] = result
            _cache_ttl[cache_key] = now + ttl_seconds
            return result
        return wrapper
    return decorator

app = FastAPI()

# Add GZip compression for faster responses
app.add_middleware(GZipMiddleware, minimum_size=500)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.room_connections: Dict[str, set] = {}  # room_id -> set of user_ids
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        # Remove from all rooms
        for room_id in list(self.room_connections.keys()):
            if user_id in self.room_connections[room_id]:
                self.room_connections[room_id].discard(user_id)
    
    def join_room(self, room_id: str, user_id: str):
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        self.room_connections[room_id].add(user_id)
    
    def leave_room(self, room_id: str, user_id: str):
        if room_id in self.room_connections:
            self.room_connections[room_id].discard(user_id)
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception:
                pass
    
    async def broadcast_to_users(self, message: dict, user_ids: List[str]):
        for user_id in user_ids:
            if user_id in self.active_connections:
                try:
                    await self.active_connections[user_id].send_json(message)
                except Exception:
                    pass
    
    async def broadcast_to_room(self, message: dict, room_id: str, exclude_user: str = None):
        if room_id in self.room_connections:
            for user_id in self.room_connections[room_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_json(message)
                    except Exception:
                        pass

ws_manager = ConnectionManager()

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "koraverse_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
AGORA_APP_ID = os.environ.get("AGORA_APP_ID", "")
AGORA_APP_CERTIFICATE = os.environ.get("AGORA_APP_CERTIFICATE", "")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

GIFTS = [
    {"id": "rose", "name": "وردة", "icon": "🌹", "coins": 10},
    {"id": "heart", "name": "قلب", "icon": "❤️", "coins": 50},
    {"id": "trophy", "name": "كأس", "icon": "🏆", "coins": 100},
    {"id": "football", "name": "كرة", "icon": "⚽", "coins": 150},
    {"id": "star", "name": "نجمة", "icon": "⭐", "coins": 200},
    {"id": "crown", "name": "تاج", "icon": "👑", "coins": 500},
]

CATEGORIES = ["رياضة", "ترفيه", "تكنولوجيا", "ثقافة", "أخبار", "ألعاب"]

# Owner emails - only these accounts have full control
OWNER_EMAILS = ["naifliver@gmail.com", "naifliver97@gmail.com"]

# Role hierarchy: owner > admin > news_editor > mod > user
# owner: all permissions (create/close rooms, promote users)
# admin: kick, mute, invite to stage, approve mic requests
# news_editor: can manage news (create, edit, delete)
# mod: approve mic requests, can go on stage without request
ROLE_HIERARCHY = ["user", "mod", "news_editor", "admin", "owner"]

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: str
    name: Optional[str] = None  # Display name

class UserLogin(BaseModel):
    identifier: str  # Can be email or username
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    name: Optional[str] = None  # Display name
    avatar: Optional[str] = None
    bio: Optional[str] = None
    frame_color: Optional[str] = "lime"  # Profile frame color
    created_at: str
    role: str = "user"
    is_banned: bool = False
    banned_rooms: List[str] = []
    coins: int = 1000
    level: int = 1
    xp: int = 0
    badges: List[str] = []

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    room_id: str
    user_id: str
    username: str
    avatar: Optional[str] = None
    content: str = ""
    image_url: Optional[str] = None
    timestamp: str
    reply_to_id: Optional[str] = None
    reply_to_username: Optional[str] = None
    reply_to_content: Optional[str] = None

class MessageCreate(BaseModel):
    content: str
    reply_to_id: Optional[str] = None
    reply_to_username: Optional[str] = None
    reply_to_content: Optional[str] = None

# Thread Models
class ThreadCreate(BaseModel):
    content: str = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # 'image' or 'video'
    twitter_url: Optional[str] = None

class ThreadResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    twitter_url: Optional[str] = None
    author: dict
    likes_count: int = 0
    replies_count: int = 0
    reposts_count: int = 0
    liked: bool = False
    created_at: str

class RoomParticipant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    username: str
    avatar: Optional[str] = None
    is_speaking: bool = False
    joined_at: str
    seat_number: Optional[int] = None
    room_role: str = "listener"
    can_speak: bool = False
    is_muted: bool = False
    last_active: Optional[str] = None
    agora_uid: Optional[int] = None  # Agora UID for video matching

class SeatRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str
    room_id: str
    user_id: str
    username: str
    avatar: Optional[str] = None
    status: str = "pending"
    created_at: str

class SeatInvite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invite_id: str
    room_id: str
    user_id: str
    username: str
    avatar: Optional[str] = None
    invited_by: str
    invited_by_name: str
    status: str = "pending"
    created_at: str

class Room(BaseModel):
    id: str
    name: str
    name_en: str
    description: str
    image: str
    participants_count: int = 0

class RoomFull(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    category: str
    image: str
    owner_id: str
    owner_name: str
    owner_avatar: Optional[str] = None
    is_live: bool = True
    is_closed: bool = False
    total_seats: int = 12
    participant_count: int = 0
    member_count: int = 0
    created_at: str
    stream_url: Optional[str] = None
    stream_active: bool = False
    chat_background: Optional[str] = None
    room_type: str = "all"  # "all" or "diwaniya"

class RoomCreate(BaseModel):
    title: str
    description: str
    category: str
    image: str
    room_type: str = "all"  # "all" or "diwaniya"

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: User = Depends(get_current_user)):
    """Only owner can access admin functions"""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user

async def get_owner_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user

def has_permission(user_role: str, required_roles: list) -> bool:
    """Check if user has required permission based on role hierarchy"""
    return user_role in required_roles

def can_manage_stage(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can approve mic requests and manage stage"""
    # System owner can manage ALL rooms
    if user_role == "owner":
        return True
    # Room owner can manage their room
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return user_role in ["admin", "mod"]

def can_kick_mute(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can kick and mute users"""
    # System owner can control ALL rooms
    if user_role == "owner":
        return True
    # Room owner can control their room
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return user_role in ["admin"]

def can_manage_rooms(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can create/close rooms"""
    # System owner can manage ALL rooms
    if user_role == "owner":
        return True
    # Room owner can manage their room
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return False

def can_promote_users(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can promote other users"""
    # System owner can promote in ALL rooms
    if user_role == "owner":
        return True
    # Room owner can promote in their room
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return False

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل بالفعل")
    
    existing_username = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")
    
    from uuid import uuid4
    user_id = str(uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    # Determine role based on email
    if user_data.email in OWNER_EMAILS:
        user_role = "owner"
    else:
        user_role = "user"
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "username": user_data.username,
        "password": hashed_password,
        "avatar": f"https://ui-avatars.com/api/?name={user_data.username}&background=A3E635&color=0F172A&bold=true",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "role": user_role,
        "is_banned": False,
        "banned_rooms": [],
        "favorite_rooms": [],  # User's favorite rooms
        "coins": 1000,
        "level": 1,
        "xp": 0,
        "badges": [],
        "followers": [],
        "following": []
    }
    
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token(data={"sub": user_id})
    user = User(**{k: v for k, v in user_doc.items() if k != "password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Check if identifier is email or username
    identifier = user_data.identifier.strip().lower()
    
    # Try to find user by email or username
    user = await db.users.find_one(
        {"$or": [
            {"email": identifier},
            {"username": identifier}
        ]},
        {"_id": 0}
    )
    
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="اسم المستخدم/البريد الإلكتروني أو كلمة المرور غير صحيحة")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(**{k: v for k, v in user.items() if k != "password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

# ==================== FORGOT PASSWORD ====================
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Request password reset - sends a 6-digit code"""
    email = data.email.strip().lower()
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        # Don't reveal if email exists - return success anyway
        return {"message": "إذا كان البريد مسجلاً، سيتم إرسال رمز التحقق"}
    
    # Generate 6-digit code
    import random
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store reset code with expiry (15 minutes)
    await db.password_resets.delete_many({"email": email})  # Remove old codes
    await db.password_resets.insert_one({
        "email": email,
        "code": reset_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    })
    
    # In production, send email here. For now, we'll return the code (for testing)
    # TODO: Integrate email service
    print(f"Password reset code for {email}: {reset_code}")
    
    return {
        "message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        "code_hint": reset_code  # Remove this in production!
    }

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using the code"""
    email = data.email.strip().lower()
    
    # Find valid reset code
    reset_record = await db.password_resets.find_one({
        "email": email,
        "code": data.code
    }, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")
    
    # Check if code expired
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_many({"email": email})
        raise HTTPException(status_code=400, detail="انتهت صلاحية رمز التحقق")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    
    # Update password
    hashed_password = pwd_context.hash(data.new_password)
    await db.users.update_one(
        {"email": email},
        {"$set": {"password": hashed_password}}
    )
    
    # Delete used reset code
    await db.password_resets.delete_many({"email": email})
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info including updated role"""
    # Get follower/following counts
    followers_count = await db.follows.count_documents({"following_id": current_user.id})
    following_count = await db.follows.count_documents({"follower_id": current_user.id})
    
    # Get rooms joined count (rooms where user participated)
    rooms_joined = await db.room_participants.count_documents({"user_id": current_user.id})
    
    # Get rooms created count
    rooms_created = await db.rooms.count_documents({"owner_id": current_user.id})
    
    # Get user with bio and name
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    # Calculate badges earned
    badges_earned = []
    # متحدث - always earned
    badges_earned.append("speaker")
    # مالك غرفة - if user created at least one room
    if rooms_created > 0:
        badges_earned.append("room_owner")
    # محبوب - if user has 10+ followers
    if followers_count >= 10:
        badges_earned.append("popular")
    # نجم - if user has 100+ coins
    if current_user.coins >= 100:
        badges_earned.append("star")
    # موثق - if user has 50+ followers and 5+ rooms joined
    if followers_count >= 50 and rooms_joined >= 5:
        badges_earned.append("verified")
    # أسطورة - if user has 100+ followers, 1000+ coins, and 20+ rooms
    if followers_count >= 100 and current_user.coins >= 1000 and rooms_joined >= 20:
        badges_earned.append("legend")
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "name": user_doc.get("name", ""),
        "avatar": current_user.avatar,
        "bio": user_doc.get("bio", ""),
        "frame_color": user_doc.get("frame_color", "lime"),
        "role": current_user.role,
        "coins": current_user.coins,
        "level": current_user.level,
        "xp": current_user.xp,
        "followers_count": followers_count,
        "following_count": following_count,
        "rooms_joined": rooms_joined,
        "rooms_created": rooms_created,
        "badges_earned": badges_earned
    }

class ProfileUpdate(BaseModel):
    name: Optional[str] = None  # Display name
    username: Optional[str] = None  # Handle/account
    bio: Optional[str] = None
    avatar: Optional[str] = None
    frame_color: Optional[str] = None  # Profile frame color

@api_router.put("/auth/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile"""
    update_doc = {}
    
    if profile_data.name is not None:
        update_doc["name"] = profile_data.name.strip()[:50]  # Limit name to 50 chars
    
    if profile_data.username and profile_data.username.strip():
        # Remove spaces and special characters from username
        clean_username = ''.join(c for c in profile_data.username if c.isalnum() or c == '_').lower()
        if len(clean_username) < 3:
            raise HTTPException(status_code=400, detail="اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
        # Check if username is already taken
        existing = await db.users.find_one({
            "username": clean_username,
            "id": {"$ne": current_user.id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")
        update_doc["username"] = clean_username
    
    if profile_data.bio is not None:
        update_doc["bio"] = profile_data.bio[:160]  # Limit bio to 160 chars
    
    if profile_data.avatar and profile_data.avatar.strip():
        update_doc["avatar"] = profile_data.avatar.strip()
    
    # Validate and update frame color
    valid_colors = ["lime", "cyan", "purple", "amber", "rose", "rainbow"]
    if profile_data.frame_color and profile_data.frame_color in valid_colors:
        update_doc["frame_color"] = profile_data.frame_color
    
    if update_doc:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_doc}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    return {"message": "تم تحديث الملف الشخصي", "user": updated_user}

# Password change model
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/auth/password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    """Change user password"""
    # Get user with password
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Verify current password
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    
    # Validate new password
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل")
    
    # Hash and save new password
    new_hashed_password = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password": new_hashed_password}}
    )
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}

# ==================== FOLLOW SYSTEM ====================

@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Follow a user"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكنك متابعة نفسك")
    
    # Check if user exists
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Check if already following
    existing = await db.follows.find_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="أنت تتابع هذا المستخدم بالفعل")
    
    # Create follow relationship
    from uuid import uuid4
    follow_doc = {
        "id": str(uuid4())[:8],
        "follower_id": current_user.id,
        "following_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.follows.insert_one(follow_doc)
    
    # Create notification for the followed user
    await create_notification(
        user_id=user_id,
        notif_type="follow",
        from_user_id=current_user.id
    )
    
    return {"message": f"تمت متابعة {target_user['username']}"}

@api_router.delete("/users/{user_id}/follow")
async def unfollow_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Unfollow a user"""
    result = await db.follows.delete_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="أنت لا تتابع هذا المستخدم")
    
    return {"message": "تم إلغاء المتابعة"}

@api_router.get("/users/{user_id}/followers")
async def get_followers(user_id: str, current_user: User = Depends(get_current_user)):
    """Get list of followers for a user - Optimized"""
    follows = await db.follows.find({"following_id": user_id}, {"_id": 0}).to_list(1000)
    
    if not follows:
        return {"followers": [], "count": 0}
    
    # Get all follower IDs
    follower_ids = [f["follower_id"] for f in follows]
    
    # Batch fetch all users in one query
    users_cursor = db.users.find({"id": {"$in": follower_ids}}, {"_id": 0, "password": 0})
    users_list = await users_cursor.to_list(1000)
    users_map = {u["id"]: u for u in users_list}
    
    # Batch fetch current user's follows in one query
    current_follows = await db.follows.find({
        "follower_id": current_user.id,
        "following_id": {"$in": follower_ids}
    }, {"_id": 0}).to_list(1000)
    following_set = {f["following_id"] for f in current_follows}
    
    # Build response
    followers = []
    for follower_id in follower_ids:
        if follower_id in users_map:
            user = users_map[follower_id].copy()
            user["is_following"] = follower_id in following_set
            followers.append(user)
    
    return {"followers": followers, "count": len(followers)}

@api_router.get("/users/{user_id}/following")
async def get_following(user_id: str, current_user: User = Depends(get_current_user)):
    """Get list of users that a user follows - Optimized"""
    follows = await db.follows.find({"follower_id": user_id}, {"_id": 0}).to_list(1000)
    
    if not follows:
        return {"following": [], "count": 0}
    
    # Get all following IDs
    following_ids = [f["following_id"] for f in follows]
    
    # Batch fetch all users in one query
    users_cursor = db.users.find({"id": {"$in": following_ids}}, {"_id": 0, "password": 0})
    users_list = await users_cursor.to_list(1000)
    users_map = {u["id"]: u for u in users_list}
    
    # Batch fetch current user's follows in one query
    current_follows = await db.follows.find({
        "follower_id": current_user.id,
        "following_id": {"$in": following_ids}
    }, {"_id": 0}).to_list(1000)
    following_set = {f["following_id"] for f in current_follows}
    
    # Build response
    following = []
    for fid in following_ids:
        if fid in users_map:
            user = users_map[fid].copy()
            user["is_following"] = fid in following_set
            following.append(user)
    
    return {"following": following, "count": len(following)}

@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str, current_user: User = Depends(get_current_user)):
    """Get another user's profile"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Get follower/following counts
    followers_count = await db.follows.count_documents({"following_id": user_id})
    following_count = await db.follows.count_documents({"follower_id": user_id})
    
    # Check if current user follows this user
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

class ImageUpload(BaseModel):
    image_data: str  # Base64 encoded image

@api_router.post("/upload/avatar")
async def upload_avatar(data: ImageUpload, current_user: User = Depends(get_current_user)):
    """Upload avatar image (base64)"""
    import base64
    import os
    from uuid import uuid4
    
    try:
        # Parse base64 data
        if ',' in data.image_data:
            header, image_data = data.image_data.split(',', 1)
        else:
            image_data = data.image_data
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        
        # Check file size (max 2MB)
        if len(image_bytes) > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="حجم الصورة كبير جداً (الحد الأقصى 2MB)")
        
        # Save to static folder
        static_dir = Path(__file__).parent / "static" / "avatars"
        static_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"{current_user.id}_{uuid4().hex[:8]}.jpg"
        filepath = static_dir / filename
        
        with open(filepath, 'wb') as f:
            f.write(image_bytes)
        
        # Generate URL
        avatar_url = f"{os.environ.get('BACKEND_URL', '')}/api/static/avatars/{filename}"
        
        # Update user avatar
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"avatar": avatar_url}}
        )
        
        return {"avatar_url": avatar_url, "message": "تم رفع الصورة بنجاح"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"فشل رفع الصورة: {str(e)}")

@api_router.post("/upload/thread-media")
async def upload_thread_media(
    file: UploadFile = File(...),
    type: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload media for threads (images/videos)"""
    import os
    from uuid import uuid4
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate file type
    allowed_image_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    allowed_video_types = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    
    content_type = file.content_type
    
    if type == 'image' and content_type not in allowed_image_types:
        raise HTTPException(status_code=400, detail="نوع الصورة غير مدعوم")
    
    if type == 'video' and content_type not in allowed_video_types:
        raise HTTPException(status_code=400, detail="نوع الفيديو غير مدعوم")
    
    # Read file content
    file_content = await file.read()
    
    # Check file size
    max_size = 50 * 1024 * 1024 if type == 'video' else 10 * 1024 * 1024
    if len(file_content) > max_size:
        raise HTTPException(status_code=400, detail="حجم الملف كبير جداً")
    
    # Create directory
    media_dir = Path(__file__).parent / "static" / "thread_media"
    media_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else ('jpg' if type == 'image' else 'mp4')
    filename = f"{user_id}_{uuid4().hex[:12]}.{ext}"
    filepath = media_dir / filename
    
    # Save file
    with open(filepath, 'wb') as f:
        f.write(file_content)
    
    # Generate URL
    media_url = f"{os.environ.get('BACKEND_URL', '')}/api/static/thread_media/{filename}"
    
    return {"url": media_url, "type": type}

@api_router.get("/rooms")
async def get_rooms(category: Optional[str] = None, authorization: Optional[str] = Header(None)):
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
    
    # Batch count participants using aggregation
    pipeline = [
        {"$match": {"room_id": {"$in": room_ids}}},
        {"$group": {"_id": "$room_id", "count": {"$sum": 1}}}
    ]
    counts_cursor = db.room_participants.aggregate(pipeline)
    counts_list = await counts_cursor.to_list(100)
    counts_map = {c["_id"]: c["count"] for c in counts_list}
    
    # Batch count members using aggregation
    member_pipeline = [
        {"$match": {"room_id": {"$in": room_ids}}},
        {"$group": {"_id": "$room_id", "count": {"$sum": 1}}}
    ]
    member_counts_cursor = db.room_members.aggregate(member_pipeline)
    member_counts_list = await member_counts_cursor.to_list(100)
    member_counts_map = {c["_id"]: c["count"] for c in member_counts_list}
    
    # Add counts and favorite status to each room
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

# ==================== ROOM FAVORITES ====================
@api_router.post("/rooms/{room_id}/favorite")
async def toggle_favorite_room(room_id: str, current_user: User = Depends(get_current_user)):
    """Toggle favorite status for a room"""
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    favorite_rooms = user.get("favorite_rooms", [])
    
    if room_id in favorite_rooms:
        # Remove from favorites
        await db.users.update_one(
            {"id": current_user.id},
            {"$pull": {"favorite_rooms": room_id}}
        )
        return {"message": "تمت إزالة الغرفة من المفضلة", "is_favorite": False}
    else:
        # Add to favorites
        await db.users.update_one(
            {"id": current_user.id},
            {"$addToSet": {"favorite_rooms": room_id}}
        )
        return {"message": "تمت إضافة الغرفة للمفضلة", "is_favorite": True}

@api_router.get("/rooms/favorites")
async def get_favorite_rooms(current_user: User = Depends(get_current_user)):
    """Get user's favorite rooms"""
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    favorite_room_ids = user.get("favorite_rooms", [])
    
    if not favorite_room_ids:
        return []
    
    # Fetch rooms
    rooms = await db.rooms.find({"id": {"$in": favorite_room_ids}}, {"_id": 0}).to_list(100)
    
    # Add participant counts
    for room in rooms:
        count = await db.room_participants.count_documents({"room_id": room["id"]})
        room["participant_count"] = count
        room["member_count"] = 1
        if "room_type" not in room:
            room["room_type"] = "all"
    
    return [RoomFull(**r) for r in rooms]

@api_router.post("/rooms/create", response_model=RoomFull)
async def create_room(room_data: RoomCreate, current_user: User = Depends(get_current_user)):
    # Only system owner can create rooms
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="فقط الأونر يمكنه إنشاء الغرف")
    
    from uuid import uuid4
    room_id = str(uuid4())[:8]
    
    room_doc = {
        "id": room_id,
        "title": room_data.title,
        "description": room_data.description,
        "category": room_data.category,
        "image": room_data.image,
        "room_type": room_data.room_type,  # "all" or "diwaniya"
        "owner_id": current_user.id,
        "owner_name": current_user.username,
        "owner_avatar": current_user.avatar,
        "is_live": room_data.room_type == "diwaniya",  # Diwaniya rooms are always live
        "is_closed": False,
        "total_seats": 12,
        "participant_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.rooms.insert_one(room_doc)
    
    return RoomFull(**room_doc)

@api_router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}

@api_router.post("/rooms/{room_id}/end")
async def end_room(room_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room["owner_id"] != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة يمكنه إنهاءها")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"is_live": False, "is_closed": True}}
    )
    
    await db.room_participants.delete_many({"room_id": room_id})
    
    return {"message": "تم إنهاء الغرفة"}

class RoomImageUpdate(BaseModel):
    image: str

class RoomTitleUpdate(BaseModel):
    title: str

@api_router.put("/rooms/{room_id}/title")
async def update_room_title(room_id: str, data: RoomTitleUpdate, current_user: User = Depends(get_current_user)):
    """Update room title - Owner only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Only room owner can change title
    if room["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة يمكنه تغيير اسم الغرفة")
    
    # Validate title
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="اسم الغرفة لا يمكن أن يكون فارغاً")
    if len(title) > 100:
        raise HTTPException(status_code=400, detail="اسم الغرفة طويل جداً (الحد الأقصى 100 حرف)")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"title": title}}
    )
    
    return {"message": "تم تحديث اسم الغرفة", "title": title}

@api_router.put("/rooms/{room_id}/image")
async def update_room_image(room_id: str, data: RoomImageUpdate, current_user: User = Depends(get_current_user)):
    """Update room cover image - Owner only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Only room owner or system owner can change image
    if room["owner_id"] != current_user.id and current_user.role != "owner":
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة يمكنه تغيير الصورة")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"image": data.image}}
    )
    
    return {"message": "تم تحديث صورة الغرفة", "image": data.image}

@api_router.put("/rooms/{room_id}/chat-background")
async def update_room_chat_background(room_id: str, data: dict, current_user: User = Depends(get_current_user)):
    """Update room chat background image - Owner only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Only room owner or system owner can change background
    if room["owner_id"] != current_user.id and current_user.role != "owner":
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة يمكنه تغيير الخلفية")
    
    background_url = data.get("background_url", "")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"chat_background": background_url}}
    )
    
    # Broadcast background change to all users in room via WebSocket
    participants = room.get("participants", [])
    participant_ids = [p.get("user_id") for p in participants if p.get("user_id")]
    
    if participant_ids:
        await ws_manager.broadcast_to_users({
            "type": "chat_background_update",
            "room_id": room_id,
            "background_url": background_url
        }, participant_ids)
    
    return {"message": "تم تحديث خلفية الدردشة", "chat_background": background_url}


import os
import base64
import uuid
from pathlib import Path

# Create uploads directory
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload an image file and return URL"""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم. استخدم JPG, PNG, GIF أو WebP")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        contents = await file.read()
        
        # Check file size (max 5MB)
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="حجم الملف كبير جداً. الحد الأقصى 5MB")
        
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Return the URL to access the image
        image_url = f"/api/uploads/{unique_filename}"
        return {"message": "تم رفع الصورة بنجاح", "url": image_url, "filename": unique_filename}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل رفع الصورة: {str(e)}")

@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files"""
    from fastapi.responses import FileResponse
    
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    
    return FileResponse(file_path)




@api_router.post("/rooms/{room_id}/close-and-kick")
async def close_room_and_kick_all(room_id: str, current_user: User = Depends(get_current_user)):
    """Close room and kick all users - Owner only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room["owner_id"] != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="صلاحيات المالك مطلوبة")
    
    # Close the room
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"is_live": False, "is_closed": True}}
    )
    
    # Get participant count before kicking
    participant_count = await db.room_participants.count_documents({"room_id": room_id})
    
    # Kick all participants
    await db.room_participants.delete_many({"room_id": room_id})
    
    # Clear seat requests and invites
    await db.seat_requests.delete_many({"room_id": room_id})
    await db.seat_invites.delete_many({"room_id": room_id})
    
    return {"message": f"تم إغلاق الغرفة وطرد {participant_count} مشارك"}

@api_router.get("/rooms/{room_id}", response_model=RoomFull)
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    count = await db.room_participants.count_documents({"room_id": room_id})
    room["participant_count"] = count
    
    # Get member count
    member_count = await db.room_members.count_documents({"room_id": room_id})
    room["member_count"] = member_count
    
    return RoomFull(**room)

# ============ Room Membership System ============

@api_router.post("/rooms/{room_id}/membership/join")
async def join_room_membership(room_id: str, current_user: User = Depends(get_current_user)):
    """Join a room as a member (subscribe to the room)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check if already a member
    existing = await db.room_members.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="أنت عضو في هذه الغرفة بالفعل")
    
    # Add as member
    member_doc = {
        "room_id": room_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "role": "member"  # member, admin, mod
    }
    await db.room_members.insert_one(member_doc)
    
    # Update member count
    member_count = await db.room_members.count_documents({"room_id": room_id})
    
    return {"message": "تم الانضمام للغرفة بنجاح", "member_count": member_count}

@api_router.post("/rooms/{room_id}/membership/leave")
async def leave_room_membership(room_id: str, current_user: User = Depends(get_current_user)):
    """Leave a room membership"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Room owner cannot leave
    if room["owner_id"] == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكن لصاحب الغرفة مغادرة العضوية")
    
    result = await db.room_members.delete_one({
        "room_id": room_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="أنت لست عضواً في هذه الغرفة")
    
    return {"message": "تم إلغاء العضوية بنجاح"}

@api_router.get("/rooms/{room_id}/membership/check")
async def check_room_membership(room_id: str, current_user: User = Depends(get_current_user)):
    """Check if user is a member of the room"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Room owner is always a member
    if room["owner_id"] == current_user.id:
        return {"is_member": True, "role": "owner"}
    
    member = await db.room_members.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    if member:
        return {"is_member": True, "role": member.get("role", "member")}
    
    return {"is_member": False, "role": None}

@api_router.get("/rooms/{room_id}/members")
async def get_room_members(room_id: str, current_user: User = Depends(get_current_user)):
    """Get list of room members with their roles (supports multiple roles)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    members = await db.room_members.find({"room_id": room_id}, {"_id": 0}).to_list(1000)
    
    # Fetch room roles for all members
    room_roles_cursor = await db.room_roles.find({"room_id": room_id}, {"_id": 0}).to_list(1000)
    roles_map = {}
    for rr in room_roles_cursor:
        user_roles = rr.get("roles", [])
        if not user_roles and rr.get("role"):
            user_roles = [rr.get("role")]
        roles_map[rr["user_id"]] = user_roles
    
    # Add roles to members
    for member in members:
        member_id = member.get("user_id")
        member["roles"] = roles_map.get(member_id, [])
    
    # Add room owner to the list
    owner = await db.users.find_one({"id": room["owner_id"]}, {"_id": 0, "password": 0})
    if owner:
        owner_member = {
            "room_id": room_id,
            "user_id": owner["id"],
            "username": owner["username"],
            "avatar": owner.get("avatar"),
            "role": "owner",
            "roles": ["owner"]
        }
        members.insert(0, owner_member)
    
    return {"members": members, "count": len(members)}

# ============ End Room Membership System ============

class JoinWithPinRequest(BaseModel):
    pin: Optional[str] = None

@api_router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, join_data: JoinWithPinRequest = None, current_user: User = Depends(get_current_user)):
    """Join a room session (enter the room) - requires membership"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check if user is system owner (has full access)
    is_system_owner = current_user.role == "owner"
    
    # Check if room is closed
    if room.get("is_closed", False):
        # Only system owner can enter without PIN
        if not is_system_owner:
            # Check PIN
            provided_pin = join_data.pin if join_data else None
            room_pin = room.get("close_pin")
            
            if not provided_pin:
                raise HTTPException(status_code=403, detail="الغرفة مغلقة - يرجى إدخال الرمز السري")
            
            if provided_pin != room_pin:
                raise HTTPException(status_code=403, detail="الرمز السري غير صحيح")
    
    # Check if user is owner or member (for open rooms)
    is_room_owner = room["owner_id"] == current_user.id
    is_member = await db.room_members.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not is_room_owner and not is_system_owner and not is_member:
        raise HTTPException(status_code=403, detail="يجب أن تكون عضواً في الغرفة للدخول")
    
    existing = await db.room_participants.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    now = datetime.now(timezone.utc).isoformat()
    
    if not existing:
        participant_doc = {
            "room_id": room_id,
            "user_id": current_user.id,
            "username": current_user.username,
            "avatar": current_user.avatar,
            "is_speaking": False,
            "joined_at": now,
            "seat_number": None,
            "room_role": "listener",
            "can_speak": False,
            "last_active": now
        }
        await db.room_participants.insert_one(participant_doc)
    else:
        # Update last_active if already in room
        await db.room_participants.update_one(
            {"room_id": room_id, "user_id": current_user.id},
            {"$set": {"last_active": now}}
        )
    
    # Generate Agora token for this room
    agora_token = None
    agora_uid = None
    if AGORA_APP_ID and AGORA_APP_CERTIFICATE:
        try:
            import random
            agora_uid = random.randint(1, 2147483647)
            privilege_expired_ts = int(time.time()) + 3600 * 24  # 24 hours
            agora_token = RtcTokenBuilder.buildTokenWithUid(
                appId=AGORA_APP_ID,
                appCertificate=AGORA_APP_CERTIFICATE,
                channelName=room_id,
                uid=agora_uid,
                role=1,  # Publisher role
                privilegeExpiredTs=privilege_expired_ts
            )
        except Exception as e:
            print(f"Agora token generation error: {e}")
    
    return {
        "message": "دخلت الغرفة بنجاح",
        "room_id": room_id,
        "agora_token": agora_token,
        "agora_uid": agora_uid,
        "agora_app_id": AGORA_APP_ID if agora_token else None,
        "channel": room_id
    }

# Update Agora UID for video matching
class UpdateAgoraUid(BaseModel):
    agora_uid: int

@api_router.put("/rooms/{room_id}/agora-uid")
async def update_agora_uid(room_id: str, data: UpdateAgoraUid, current_user: User = Depends(get_current_user)):
    await db.room_participants.update_one(
        {"room_id": room_id, "user_id": current_user.id},
        {"$set": {"agora_uid": data.agora_uid}}
    )
    return {"message": "تم تحديث معرف Agora"}

@api_router.post("/rooms/{room_id}/seat/request")
async def request_seat(room_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    participant = await db.room_participants.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not participant:
        raise HTTPException(status_code=404, detail="يجب الانضمام للغرفة أولاً")
    
    if participant.get("seat_number") is not None:
        raise HTTPException(status_code=400, detail="أنت بالفعل على المنصة")
    
    existing_request = await db.seat_requests.find_one({
        "room_id": room_id,
        "user_id": current_user.id,
        "status": "pending"
    }, {"_id": 0})
    
    if existing_request:
        raise HTTPException(status_code=400, detail="لديك طلب قيد الانتظار بالفعل")
    
    from uuid import uuid4
    request_id = str(uuid4())
    
    request_doc = {
        "request_id": request_id,
        "room_id": room_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.seat_requests.insert_one(request_doc)
    
    return {"message": "تم إرسال طلبك، بانتظار موافقة المشرف", "request_id": request_id}

@api_router.get("/rooms/{room_id}/seat/requests")
async def get_seat_requests(room_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if not can_manage_stage(current_user.role, current_user.id, room.get("owner_id")):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    requests = await db.seat_requests.find({
        "room_id": room_id,
        "status": "pending"
    }, {"_id": 0}).sort("created_at", 1).to_list(50)
    
    return {"requests": [SeatRequest(**r) for r in requests]}

@api_router.get("/rooms/{room_id}/seat/my-request")
async def get_my_seat_request(room_id: str, current_user: User = Depends(get_current_user)):
    """Check current user's seat request status"""
    request = await db.seat_requests.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0}, sort=[("created_at", -1)])
    
    if not request:
        return {"has_pending": False, "status": None}
    
    return {
        "has_pending": request.get("status") == "pending",
        "status": request.get("status")
    }

@api_router.post("/rooms/{room_id}/seat/approve/{user_id}")
async def approve_seat_request(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    room_role = current_user_room_role.get("role") if current_user_room_role else None
    is_room_leader = room_role == "leader"
    is_room_admin = room_role == "admin"
    is_room_mod = room_role == "mod"
    
    # All staff can approve (owner, leader, admin, mod)
    can_approve = is_room_owner or is_system_owner or is_room_leader or is_room_admin or is_room_mod
    if not can_approve:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    # Get target user's room role
    target_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    target_role = target_room_role.get("role", "member") if target_room_role else "member"
    
    # Admin can only approve members (not leaders, other admins or mods)
    if is_room_admin and not is_room_owner and not is_system_owner and not is_room_leader:
        if target_role in ["leader", "admin", "mod"]:
            raise HTTPException(status_code=403, detail="الأدمن يمكنه فقط إصعاد الأعضاء العاديين للمنصة")
    
    # Mod can only approve members
    if is_room_mod and not is_room_owner and not is_system_owner and not is_room_leader and not is_room_admin:
        if target_role != "member":
            raise HTTPException(status_code=403, detail="المود يمكنه فقط إصعاد الأعضاء العاديين للمنصة")
    
    request = await db.seat_requests.find_one({
        "room_id": room_id,
        "user_id": user_id,
        "status": "pending"
    }, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    occupied_seats = await db.room_participants.find({
        "room_id": room_id,
        "seat_number": {"$ne": None}
    }, {"_id": 0, "seat_number": 1}).to_list(room["total_seats"])
    
    occupied_numbers = [p["seat_number"] for p in occupied_seats]
    available_seat = None
    
    for i in range(1, room["total_seats"] + 1):
        if i not in occupied_numbers:
            available_seat = i
            break
    
    if available_seat is None:
        raise HTTPException(status_code=400, detail="المنصة ممتلئة")
    
    await db.room_participants.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {
            "seat_number": available_seat,
            "room_role": "speaker",
            "can_speak": True
        }}
    )
    
    await db.seat_requests.update_one(
        {"request_id": request["request_id"]},
        {"$set": {"status": "approved"}}
    )
    
    return {"message": "تمت الموافقة على الطلب", "seat_number": available_seat}

@api_router.post("/rooms/{room_id}/seat/reject/{user_id}")
async def reject_seat_request(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    room_role = current_user_room_role.get("role") if current_user_room_role else None
    is_room_leader = room_role == "leader"
    is_room_admin = room_role == "admin"
    is_room_mod = room_role == "mod"
    
    # All staff can reject (owner, leader, admin, mod)
    can_reject = is_room_owner or is_system_owner or is_room_leader or is_room_admin or is_room_mod
    if not can_reject:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    result = await db.seat_requests.update_one(
        {"room_id": room_id, "user_id": user_id, "status": "pending"},
        {"$set": {"status": "rejected"}}
    )
    
    if result.modified_count > 0:
        return {"message": "تم رفض الطلب"}
    raise HTTPException(status_code=404, detail="الطلب غير موجود")

@api_router.post("/rooms/{room_id}/kick/{user_id}")
async def kick_user_from_room_by_admin(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Kick user from room - Owner, Leader, or Admin"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    is_room_admin = current_user_room_role and current_user_room_role.get("role") == "admin"
    is_room_leader = current_user_room_role and current_user_room_role.get("role") == "leader"
    
    if not is_room_owner and not is_room_leader and not is_room_admin and not is_system_owner:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    # Get target user's room role
    target_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    target_role = target_room_role.get("role", "member") if target_room_role else "member"
    
    # Check if target is owner - no one can kick owner
    if room.get("owner_id") == user_id:
        raise HTTPException(status_code=403, detail="لا يمكن طرد مالك الغرفة")
    
    # Leader restrictions
    if is_room_leader and not is_room_owner and not is_system_owner:
        # Leader cannot kick another leader
        if target_role == "leader":
            raise HTTPException(status_code=403, detail="لا يمكن طرد رئيس الغرفة")
    
    # Admin restrictions
    if is_room_admin and not is_room_owner and not is_room_leader and not is_system_owner:
        # Admin cannot kick leader
        if target_role == "leader":
            raise HTTPException(status_code=403, detail="الأدمن لا يمكنه طرد رئيس الغرفة")
        # Admin cannot kick another admin
        if target_role == "admin":
            raise HTTPException(status_code=403, detail="الأدمن لا يمكنه طرد أدمن آخر")
    
    result = await db.room_participants.delete_one({
        "room_id": room_id,
        "user_id": user_id
    })
    
    if result.deleted_count > 0:
        return {"message": "تم طرد العضو من الغرفة"}
    raise HTTPException(status_code=404, detail="العضو غير موجود في الغرفة")

@api_router.post("/rooms/{room_id}/mute/{user_id}")
async def mute_user(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Mute user in room - Owner, Leader, Admin, or Mod"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    current_role = current_user_room_role.get("role", "member") if current_user_room_role else "member"
    is_room_leader = current_role == "leader"
    is_room_admin = current_role == "admin"
    is_room_mod = current_role == "mod"
    
    # Check permissions - Owner, Leader, Admin, Mod can mute
    if not is_room_owner and not is_room_leader and not is_room_admin and not is_room_mod and not is_system_owner:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    # Cannot mute owner
    if room.get("owner_id") == user_id:
        raise HTTPException(status_code=403, detail="لا يمكن كتم مالك الغرفة")
    
    # Get target user's room role
    target_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    target_role = target_room_role.get("role", "member") if target_room_role else "member"
    
    # Mod restrictions - can only mute members
    if is_room_mod and not is_room_owner and not is_room_leader and not is_room_admin and not is_system_owner:
        if target_role in ["leader", "admin", "mod"]:
            raise HTTPException(status_code=403, detail="المود لا يمكنه كتم شخص برتبة أعلى أو مساوية")
    
    # Admin restrictions - cannot mute leader or admin
    if is_room_admin and not is_room_owner and not is_room_leader and not is_system_owner:
        if target_role in ["leader", "admin"]:
            raise HTTPException(status_code=403, detail="الأدمن لا يمكنه كتم رئيس الغرفة أو أدمن آخر")
    
    # Leader restrictions - cannot mute another leader
    if is_room_leader and not is_room_owner and not is_system_owner:
        if target_role == "leader":
            raise HTTPException(status_code=403, detail="لا يمكن كتم رئيس الغرفة")
    
    result = await db.room_participants.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"is_muted": True, "can_speak": False}}
    )
    
    if result.modified_count > 0:
        return {"message": "تم كتم العضو"}
    raise HTTPException(status_code=404, detail="العضو غير موجود")

@api_router.post("/rooms/{room_id}/unmute/{user_id}")
async def unmute_user(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Unmute user in room - Owner, Leader, Admin, or Mod"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    current_role = current_user_room_role.get("role", "member") if current_user_room_role else "member"
    is_room_leader = current_role == "leader"
    is_room_admin = current_role == "admin"
    is_room_mod = current_role == "mod"
    
    # Check permissions - Owner, Leader, Admin, Mod can unmute
    if not is_room_owner and not is_room_leader and not is_room_admin and not is_room_mod and not is_system_owner:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    participant = await db.room_participants.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not participant:
        raise HTTPException(status_code=404, detail="العضو غير موجود")
    
    can_speak = participant.get("seat_number") is not None
    
    result = await db.room_participants.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"is_muted": False, "can_speak": can_speak}}
    )
    
    if result.modified_count > 0:
        return {"message": "تم إلغاء كتم العضو"}
    raise HTTPException(status_code=404, detail="العضو غير موجود")

@api_router.post("/rooms/{room_id}/remove-from-stage/{user_id}")
async def remove_from_stage(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Remove a user from stage (Room Owner, Leader, or Admin only)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    is_room_admin = current_user_room_role and current_user_room_role.get("role") == "admin"
    is_room_leader = current_user_room_role and current_user_room_role.get("role") == "leader"
    
    if not is_room_owner and not is_room_leader and not is_room_admin and not is_system_owner:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    # Get target user's room role
    target_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    target_role = target_room_role.get("role", "member") if target_room_role else "member"
    
    # Check if target is owner
    if room.get("owner_id") == user_id:
        raise HTTPException(status_code=403, detail="لا يمكن إنزال مالك الغرفة من المنصة")
    
    # Leader cannot remove another leader from stage - only owner can
    if is_room_leader and not is_room_owner and not is_system_owner:
        if target_role == "leader":
            raise HTTPException(status_code=403, detail="لا يمكن إنزال رئيس الغرفة من المنصة")
    
    # Admin cannot remove leader or another admin from stage - only owner/leader can
    if is_room_admin and not is_room_owner and not is_room_leader and not is_system_owner:
        if target_role == "leader":
            raise HTTPException(status_code=403, detail="لا يمكن إنزال رئيس الغرفة من المنصة")
        if target_role == "admin":
            raise HTTPException(status_code=403, detail="الأدمن لا يمكنه إنزال أدمن آخر من المنصة")
    
    participant = await db.room_participants.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not participant:
        raise HTTPException(status_code=404, detail="العضو غير موجود")
    
    if participant.get("seat_number") is None:
        raise HTTPException(status_code=400, detail="العضو ليس على المنصة")
    
    result = await db.room_participants.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {
            "seat_number": None,
            "room_role": "listener",
            "can_speak": False,
            "is_speaking": False,
            "is_muted": False
        }}
    )
    
    if result.modified_count > 0:
        return {"message": "تم إنزال العضو من المنصة"}
    raise HTTPException(status_code=404, detail="العضو غير موجود")

# Quick promote from room (Owner only)
class QuickPromote(BaseModel):
    role: str

@api_router.post("/rooms/{room_id}/promote/{user_id}")
async def quick_promote_user(room_id: str, user_id: str, promote_data: QuickPromote, current_user: User = Depends(get_current_user)):
    """Owner can promote users directly from room"""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="صلاحيات Owner مطلوبة للترقية")
    
    if promote_data.role not in ["user", "mod", "news_editor", "admin"]:
        raise HTTPException(status_code=400, detail="صلاحية غير صحيحة. الخيارات: user, mod, news_editor, admin")
    
    # Check if user exists
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Cannot change owner role
    if target_user.get("email") in OWNER_EMAILS:
        raise HTTPException(status_code=403, detail="لا يمكن تغيير صلاحية الأونر")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": promote_data.role}}
    )
    
    if result.modified_count > 0:
        role_names = {"user": "مستخدم", "mod": "مود", "news_editor": "إخباري", "admin": "أدمن"}
        return {"message": f"تمت ترقية {target_user['username']} إلى {role_names.get(promote_data.role, promote_data.role)}"}
    
    return {"message": "لم يتم التغيير - الصلاحية نفسها"}


# ==================== INVITE TO STAGE ====================

@api_router.post("/rooms/{room_id}/invite-stage/{user_id}")
async def invite_user_to_stage(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Invite a user to join the stage (mic) - Owner, Leader, or Admin only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    is_room_admin = current_user_room_role and current_user_room_role.get("role") == "admin"
    is_room_leader = current_user_room_role and current_user_room_role.get("role") == "leader"
    
    if not is_room_owner and not is_room_leader and not is_room_admin and not is_system_owner:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية لدعوة المستخدمين للمايك")
    
    # Check if target user is in the room
    participant = await db.room_participants.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not participant:
        raise HTTPException(status_code=404, detail="المستخدم ليس في الغرفة")
    
    if participant.get("seat_number") is not None:
        raise HTTPException(status_code=400, detail="المستخدم بالفعل على المايك")
    
    # Find available seat
    all_participants = await db.room_participants.find({
        "room_id": room_id,
        "seat_number": {"$ne": None}
    }, {"_id": 0, "seat_number": 1}).to_list(100)
    
    taken_seats = [p.get("seat_number") for p in all_participants if p.get("seat_number") is not None]
    available_seat = None
    for i in range(100):  # Allow up to 100 speakers
        if i not in taken_seats:
            available_seat = i
            break
    
    if available_seat is None:
        raise HTTPException(status_code=400, detail="لا توجد مقاعد متاحة")
    
    # Add user to stage
    await db.room_participants.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {
            "seat_number": available_seat,
            "room_role": "speaker",
            "can_speak": True,
            "is_muted": False
        }}
    )
    
    # Get target user info
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1})
    username = target_user.get("username", "المستخدم") if target_user else "المستخدم"
    
    return {"message": f"تم رفع {username} للمايك", "seat_number": available_seat}


@api_router.post("/rooms/{room_id}/kick-stage/{user_id}")
async def kick_user_from_stage(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Kick a user from the stage (same as remove-from-stage) - Owner, Leader, or Admin only"""
    # Use the existing remove_from_stage logic
    return await remove_from_stage(room_id, user_id, current_user)


# ==================== ROOM-SPECIFIC ROLES ====================
# رتب خاصة بكل غرفة - نظام رتب متعددة
# المستخدم يمكن أن يكون له عدة رتب في نفس الوقت (مثل: admin + news_reporter)

class RoomRoleUpdate(BaseModel):
    role: str  # admin, mod, member, news_reporter

class RoomRolesUpdate(BaseModel):
    roles: List[str]  # قائمة الرتب

# الرتب الرئيسية (واحدة فقط): leader, admin, mod, member
# الرتب الإضافية (يمكن إضافتها مع الرئيسية): news_reporter
PRIMARY_ROLES = ["leader", "admin", "mod", "member"]
ADDON_ROLES = ["news_reporter"]
ALL_ROOM_ROLES = PRIMARY_ROLES + ADDON_ROLES

@api_router.post("/rooms/{room_id}/roles/{user_id}")
async def set_user_room_role(room_id: str, user_id: str, data: RoomRoleUpdate, current_user: User = Depends(get_current_user)):
    """Set user's role in a room (used by UserRolesModal) - POST version"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check permissions - only room owner or admin can change roles
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    is_room_admin = current_user_room_role and current_user_room_role.get("role") == "admin"
    is_room_leader = current_user_room_role and current_user_room_role.get("role") == "leader"
    
    # Check permissions - owner, leader, or admin can change roles
    if not is_room_owner and not is_room_leader and not is_room_admin and not is_system_owner:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية تغيير الرتب")
    
    # Validate role
    if data.role not in ["leader", "admin", "mod", "news_reporter", "member"]:
        raise HTTPException(status_code=400, detail="رتبة غير صحيحة. الخيارات: leader, admin, mod, news_reporter, member")
    
    # Cannot change owner's role
    if room.get("owner_id") == user_id:
        raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة مالك الغرفة")
    
    # Get target user's current role
    target_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    target_current_role = target_room_role.get("role", "member") if target_room_role else "member"
    
    # Only owner can set leader role
    if data.role == "leader" and not is_room_owner and not is_system_owner:
        raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه تعيين رئيس الغرفة")
    
    # Leader restrictions (if not owner)
    if is_room_leader and not is_room_owner and not is_system_owner:
        # Leader cannot promote to leader
        if data.role == "leader":
            raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه تعيين رئيس الغرفة")
        
        # Leader cannot change another leader's role
        if target_current_role == "leader":
            raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة رئيس الغرفة")
    
    # Admin restrictions (if not owner and not leader)
    if is_room_admin and not is_room_owner and not is_room_leader and not is_system_owner:
        # Admin cannot promote to leader
        if data.role == "leader":
            raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه تعيين رئيس الغرفة")
        
        # Admin cannot promote to admin - only owner/leader can
        if data.role == "admin":
            raise HTTPException(status_code=403, detail="فقط مالك الغرفة أو رئيس الغرفة يمكنه ترقية لأدمن")
        
        # Admin cannot change leader's role
        if target_current_role == "leader":
            raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة رئيس الغرفة")
        
        # Admin cannot change another admin's role
        if target_current_role == "admin":
            raise HTTPException(status_code=403, detail="الأدمن لا يمكنه تغيير رتبة أدمن آخر")
    
    # If setting to member, delete the role entry
    if data.role == "member":
        await db.room_roles.delete_one({"room_id": room_id, "user_id": user_id})
    else:
        # Upsert room role
        await db.room_roles.update_one(
            {"room_id": room_id, "user_id": user_id},
            {"$set": {
                "room_id": room_id,
                "user_id": user_id,
                "role": data.role,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.id
            }},
            upsert=True
        )
    
    role_names = {"leader": "رئيس الغرفة", "admin": "أدمن", "mod": "مود", "news_reporter": "إخباري", "member": "عضو"}
    
    # Get target user info
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1})
    username = target_user.get("username", user_id) if target_user else user_id
    
    return {
        "message": f"تم تغيير رتبة {username} إلى {role_names.get(data.role, data.role)}",
        "role": data.role
    }

@api_router.get("/rooms/{room_id}/user-role/{user_id}")
async def get_user_room_role(room_id: str, user_id: str):
    """Get user's roles in a specific room (supports multiple roles)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check if user is owner
    if room.get("owner_id") == user_id:
        return {"role": "owner", "roles": ["owner"], "can_join_stage_direct": True}
    
    # Check room_roles collection
    room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if room_role:
        # Support both old format (role) and new format (roles)
        roles = room_role.get("roles", [])
        if not roles and room_role.get("role"):
            roles = [room_role.get("role")]
        
        # Get primary role for backward compatibility
        primary_role = "member"
        for r in ["leader", "admin", "mod"]:
            if r in roles:
                primary_role = r
                break
        
        can_join_direct = any(r in roles for r in ["leader", "admin", "mod"])
        return {"role": primary_role, "roles": roles, "can_join_stage_direct": can_join_direct}
    
    return {"role": "member", "roles": [], "can_join_stage_direct": False}

@api_router.post("/rooms/{room_id}/roles/{user_id}/add")
async def add_role_to_user(room_id: str, user_id: str, data: RoomRoleUpdate, current_user: User = Depends(get_current_user)):
    """Add a role to user (supports multiple roles like admin + news_reporter)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    if not is_room_owner and not is_system_owner:
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة يمكنه إضافة الرتب")
    
    if room.get("owner_id") == user_id:
        raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة مالك الغرفة")
    
    if data.role not in ALL_ROOM_ROLES:
        raise HTTPException(status_code=400, detail=f"رتبة غير صحيحة. الخيارات: {', '.join(ALL_ROOM_ROLES)}")
    
    # Get current roles
    existing = await db.room_roles.find_one({"room_id": room_id, "user_id": user_id}, {"_id": 0})
    current_roles = existing.get("roles", []) if existing else []
    if not current_roles and existing and existing.get("role"):
        current_roles = [existing.get("role")]
    
    # If adding a primary role, replace existing primary role
    if data.role in PRIMARY_ROLES:
        current_roles = [r for r in current_roles if r not in PRIMARY_ROLES]
    
    # Add the new role if not already present
    if data.role not in current_roles:
        current_roles.append(data.role)
    
    # Update in database
    await db.room_roles.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {
            "room_id": room_id,
            "user_id": user_id,
            "roles": current_roles,
            "role": current_roles[0] if current_roles else "member",  # Keep backward compat
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user.id
        }},
        upsert=True
    )
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1})
    username = target_user.get("username", user_id) if target_user else user_id
    
    role_names = {"leader": "رئيس الغرفة", "admin": "أدمن", "mod": "مود", "news_reporter": "إخباري", "member": "عضو"}
    
    return {
        "message": f"تم إضافة رتبة {role_names.get(data.role, data.role)} لـ {username}",
        "roles": current_roles
    }

@api_router.post("/rooms/{room_id}/roles/{user_id}/remove")
async def remove_role_from_user(room_id: str, user_id: str, data: RoomRoleUpdate, current_user: User = Depends(get_current_user)):
    """Remove a role from user"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    if not is_room_owner and not is_system_owner:
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة يمكنه إزالة الرتب")
    
    if room.get("owner_id") == user_id:
        raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة مالك الغرفة")
    
    # Get current roles
    existing = await db.room_roles.find_one({"room_id": room_id, "user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المستخدم ليس لديه رتب")
    
    current_roles = existing.get("roles", [])
    if not current_roles and existing.get("role"):
        current_roles = [existing.get("role")]
    
    # Remove the role
    if data.role in current_roles:
        current_roles.remove(data.role)
    
    # If no roles left, delete the entry or set to member
    if not current_roles:
        await db.room_roles.delete_one({"room_id": room_id, "user_id": user_id})
    else:
        await db.room_roles.update_one(
            {"room_id": room_id, "user_id": user_id},
            {"$set": {
                "roles": current_roles,
                "role": current_roles[0] if current_roles else "member",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1})
    username = target_user.get("username", user_id) if target_user else user_id
    
    role_names = {"leader": "رئيس الغرفة", "admin": "أدمن", "mod": "مود", "news_reporter": "إخباري", "member": "عضو"}
    
    return {
        "message": f"تم إزالة رتبة {role_names.get(data.role, data.role)} من {username}",
        "roles": current_roles
    }

@api_router.put("/rooms/{room_id}/user-role/{user_id}")
async def update_user_room_role(room_id: str, user_id: str, data: RoomRoleUpdate, current_user: User = Depends(get_current_user)):
    """Update user's role in a room (Owner/Admin only)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check permissions - only room owner or admin can change roles
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    is_room_admin = current_user_room_role and current_user_room_role.get("role") == "admin"
    is_room_leader = current_user_room_role and current_user_room_role.get("role") == "leader"
    
    # Check permissions - owner, leader, or admin can change roles
    if not is_room_owner and not is_room_leader and not is_room_admin and not is_system_owner:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية تغيير الرتب")
    
    # Validate role
    if data.role not in ["leader", "admin", "mod", "news_reporter", "member"]:
        raise HTTPException(status_code=400, detail="رتبة غير صحيحة. الخيارات: leader, admin, mod, news_reporter, member")
    
    # Cannot change owner's role
    if room.get("owner_id") == user_id:
        raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة مالك الغرفة")
    
    # Get target user's current role
    target_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    target_current_role = target_room_role.get("role", "member") if target_room_role else "member"
    
    # Only owner can set leader role
    if data.role == "leader" and not is_room_owner and not is_system_owner:
        raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه تعيين رئيس الغرفة")
    
    # Leader restrictions (if not owner)
    if is_room_leader and not is_room_owner and not is_system_owner:
        # Leader cannot promote to leader
        if data.role == "leader":
            raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه تعيين رئيس الغرفة")
        
        # Leader cannot change another leader's role
        if target_current_role == "leader":
            raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة رئيس الغرفة")
    
    # Admin restrictions (if not owner and not leader)
    if is_room_admin and not is_room_owner and not is_room_leader and not is_system_owner:
        # Admin cannot promote to leader
        if data.role == "leader":
            raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه تعيين رئيس الغرفة")
        
        # Admin cannot promote to admin - only owner/leader can
        if data.role == "admin":
            raise HTTPException(status_code=403, detail="فقط مالك الغرفة أو رئيس الغرفة يمكنه ترقية لأدمن")
        
        # Admin cannot change leader's role
        if target_current_role == "leader":
            raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة رئيس الغرفة")
        
        # Admin cannot change another admin's role
        if target_current_role == "admin":
            raise HTTPException(status_code=403, detail="الأدمن لا يمكنه تغيير رتبة أدمن آخر")
    
    # Upsert room role
    await db.room_roles.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {
            "room_id": room_id,
            "user_id": user_id,
            "role": data.role,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user.id
        }},
        upsert=True
    )
    
    role_names = {"leader": "رئيس الغرفة", "admin": "أدمن", "mod": "مود", "news_reporter": "إخباري", "member": "عضو"}
    
    # Get target user info
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1})
    username = target_user.get("username", user_id) if target_user else user_id
    
    return {
        "message": f"تم تغيير رتبة {username} إلى {role_names.get(data.role, data.role)}",
        "role": data.role
    }

@api_router.delete("/rooms/{room_id}/user-role/{user_id}")
async def remove_user_room_role(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Remove user's special role in room (demote to member)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    if not is_room_owner and current_user.role != "owner":
        raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه إزالة الرتب")
    
    await db.room_roles.delete_one({
        "room_id": room_id,
        "user_id": user_id
    })
    
    return {"message": "تم إزالة الرتبة"}

@api_router.get("/rooms/{room_id}/roles")
async def get_all_room_roles(room_id: str):
    """Get all users with special roles in a room (supports multiple roles)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    roles = await db.room_roles.find({"room_id": room_id}, {"_id": 0}).to_list(100)
    
    # Add owner info
    owner_info = {
        "user_id": room.get("owner_id"),
        "role": "owner",
        "roles": ["owner"],
        "is_owner": True
    }
    
    # Get user details for each role and normalize roles field
    for role_entry in roles:
        user = await db.users.find_one({"id": role_entry.get("user_id")}, {"_id": 0, "username": 1, "avatar": 1, "name": 1})
        if user:
            role_entry["username"] = user.get("username")
            role_entry["avatar"] = user.get("avatar")
            role_entry["name"] = user.get("name")
        
        # Ensure roles is always an array
        if "roles" not in role_entry:
            role_entry["roles"] = [role_entry.get("role", "member")] if role_entry.get("role") else []
    
    # Get owner details
    owner = await db.users.find_one({"id": room.get("owner_id")}, {"_id": 0, "username": 1, "avatar": 1, "name": 1})
    if owner:
        owner_info["username"] = owner.get("username")
        owner_info["avatar"] = owner.get("avatar")
        owner_info["name"] = owner.get("name")
    
    return {
        "owner": owner_info,
        "roles": roles
    }



async def invite_to_seat(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    if not can_kick_mute(current_user.role):
        raise HTTPException(status_code=403, detail="صلاحيات Owner/Admin مطلوبة")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    participant = await db.room_participants.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if not participant:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود في الغرفة")
    
    if participant.get("seat_number") is not None:
        raise HTTPException(status_code=400, detail="المستخدم بالفعل على المنصة")
    
    existing_invite = await db.seat_invites.find_one({
        "room_id": room_id,
        "user_id": user_id,
        "status": "pending"
    }, {"_id": 0})
    
    if existing_invite:
        raise HTTPException(status_code=400, detail="يوجد دعوة قيد الانتظار بالفعل")
    
    from uuid import uuid4
    invite_id = str(uuid4())
    
    invite_doc = {
        "invite_id": invite_id,
        "room_id": room_id,
        "user_id": user_id,
        "username": participant["username"],
        "avatar": participant["avatar"],
        "invited_by": current_user.id,
        "invited_by_name": current_user.username,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.seat_invites.insert_one(invite_doc)
    
    return {"message": f"تم إرسال دعوة إلى {participant['username']}", "invite_id": invite_id}

@api_router.get("/rooms/{room_id}/seat/invites/me")
async def get_my_invites(room_id: str, current_user: User = Depends(get_current_user)):
    invites = await db.seat_invites.find({
        "room_id": room_id,
        "user_id": current_user.id,
        "status": "pending"
    }, {"_id": 0}).to_list(10)
    
    return {"invites": [SeatInvite(**i) for i in invites]}

@api_router.post("/rooms/{room_id}/seat/invites/{invite_id}/accept")
async def accept_invite(room_id: str, invite_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    invite = await db.seat_invites.find_one({
        "invite_id": invite_id,
        "room_id": room_id,
        "user_id": current_user.id,
        "status": "pending"
    }, {"_id": 0})
    
    if not invite:
        raise HTTPException(status_code=404, detail="الدعوة غير موجودة")
    
    occupied_seats = await db.room_participants.find({
        "room_id": room_id,
        "seat_number": {"$ne": None}
    }, {"_id": 0, "seat_number": 1}).to_list(room["total_seats"])
    
    occupied_numbers = [p["seat_number"] for p in occupied_seats]
    available_seat = None
    
    for i in range(1, room["total_seats"] + 1):
        if i not in occupied_numbers:
            available_seat = i
            break
    
    if available_seat is None:
        raise HTTPException(status_code=400, detail="المنصة ممتلئة")
    
    await db.room_participants.update_one(
        {"room_id": room_id, "user_id": current_user.id},
        {"$set": {
            "seat_number": available_seat,
            "room_role": "speaker",
            "can_speak": True
        }}
    )
    
    await db.seat_invites.update_one(
        {"invite_id": invite_id},
        {"$set": {"status": "accepted"}}
    )
    
    return {"message": "قبلت الدعوة وصعدت للمنصة", "seat_number": available_seat}

@api_router.post("/rooms/{room_id}/seat/invites/{invite_id}/reject")
async def reject_invite(room_id: str, invite_id: str, current_user: User = Depends(get_current_user)):
    result = await db.seat_invites.update_one(
        {
            "invite_id": invite_id,
            "room_id": room_id,
            "user_id": current_user.id,
            "status": "pending"
        },
        {"$set": {"status": "rejected"}}
    )
    
    if result.modified_count > 0:
        return {"message": "رفضت الدعوة"}
    raise HTTPException(status_code=404, detail="الدعوة غير موجودة")

@api_router.post("/rooms/{room_id}/seat/leave")
async def leave_seat(room_id: str, current_user: User = Depends(get_current_user)):
    result = await db.room_participants.update_one(
        {"room_id": room_id, "user_id": current_user.id},
        {"$set": {
            "seat_number": None,
            "room_role": "listener",
            "can_speak": False,
            "is_speaking": False
        }}
    )
    
    if result.modified_count > 0:
        return {"message": "نزلت من المنصة"}
    raise HTTPException(status_code=404, detail="لست على المنصة")

@api_router.post("/rooms/{room_id}/seat/join-direct")
async def join_seat_direct(room_id: str, current_user: User = Depends(get_current_user)):
    """Allow mod/admin/leader/owner to join stage directly without request"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check if user is room owner
    is_room_owner = room.get("owner_id") == current_user.id
    
    # Check user's room-specific role
    room_role_doc = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    room_role = room_role_doc.get("role") if room_role_doc else None
    
    # Allow: Room Owner, Leader, Admin, Mod (room-level) OR global owner/admin/mod
    can_join_direct = (
        is_room_owner or
        room_role in ["leader", "admin", "mod"] or
        current_user.role in ["owner", "admin", "mod"]
    )
    
    if not can_join_direct:
        raise HTTPException(status_code=403, detail="صلاحيات Mod/Admin/رئيس الغرفة/المالك مطلوبة للصعود المباشر")
    
    participant = await db.room_participants.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not participant:
        raise HTTPException(status_code=404, detail="يجب الانضمام للغرفة أولاً")
    
    if participant.get("seat_number") is not None:
        raise HTTPException(status_code=400, detail="أنت بالفعل على المنصة")
    
    occupied_seats = await db.room_participants.find({
        "room_id": room_id,
        "seat_number": {"$ne": None}
    }, {"_id": 0, "seat_number": 1}).to_list(room["total_seats"])
    
    occupied_numbers = [p["seat_number"] for p in occupied_seats]
    available_seat = None
    
    for i in range(1, room["total_seats"] + 1):
        if i not in occupied_numbers:
            available_seat = i
            break
    
    if available_seat is None:
        raise HTTPException(status_code=400, detail="المنصة ممتلئة")
    
    await db.room_participants.update_one(
        {"room_id": room_id, "user_id": current_user.id},
        {"$set": {
            "seat_number": available_seat,
            "room_role": "speaker",
            "can_speak": True
        }}
    )
    
    return {"message": "صعدت للمنصة مباشرة", "seat_number": available_seat}

@api_router.get("/rooms/{room_id}/seats")
async def get_room_seats(room_id: str):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    speakers = await db.room_participants.find({
        "room_id": room_id,
        "seat_number": {"$ne": None}
    }, {"_id": 0}).to_list(room["total_seats"])
    
    seats = []
    for i in range(1, room["total_seats"] + 1):
        speaker = next((s for s in speakers if s.get("seat_number") == i), None)
        if speaker:
            seats.append({
                "seat_number": i,
                "user": RoomParticipant(**speaker).model_dump(),
                "occupied": True
            })
        else:
            seats.append({
                "seat_number": i,
                "user": None,
                "occupied": False
            })
    
    return {"seats": seats, "total_seats": room["total_seats"]}

class SendGift(BaseModel):
    gift_id: str
    recipient_id: str

@api_router.post("/rooms/{room_id}/gift")
async def send_gift(room_id: str, gift_data: SendGift, current_user: User = Depends(get_current_user)):
    gift = next((g for g in GIFTS if g["id"] == gift_data.gift_id), None)
    if not gift:
        raise HTTPException(status_code=404, detail="الهدية غير موجودة")
    
    sender = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if sender["coins"] < gift["coins"]:
        raise HTTPException(status_code=400, detail="رصيدك غير كافٍ")
    
    recipient = await db.users.find_one({"id": gift_data.recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$inc": {"coins": -gift["coins"]}}
    )
    
    await db.users.update_one(
        {"id": gift_data.recipient_id},
        {"$inc": {"coins": gift["coins"], "xp": gift["coins"] // 10}}
    )
    
    from uuid import uuid4
    gift_message = {
        "id": str(uuid4()),
        "room_id": room_id,
        "user_id": "system",
        "username": "النظام",
        "avatar": "https://ui-avatars.com/api/?name=Gift&background=FFD700&color=fff",
        "content": f"{current_user.username} أرسل {gift['icon']} {gift['name']} إلى {recipient['username']}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(gift_message)
    
    return {"message": "تم إرسال الهدية بنجاح", "remaining_coins": sender["coins"] - gift["coins"]}

@api_router.get("/gifts")
async def get_gifts():
    return {"gifts": GIFTS}

@api_router.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, current_user: User = Depends(get_current_user)):
    await db.room_participants.delete_one({
        "room_id": room_id,
        "user_id": current_user.id
    })
    
    # Check if room is now empty - if so, delete all messages (like Snapchat)
    remaining_participants = await db.room_participants.count_documents({"room_id": room_id})
    if remaining_participants == 0:
        # Delete all messages when room becomes empty
        await db.messages.delete_many({"room_id": room_id})
        logger.info(f"Room {room_id} is empty - cleared all messages")
    
    return {"message": "غادرت الغرفة"}

@api_router.delete("/rooms/{room_id}/messages/clear")
async def clear_room_messages(room_id: str, current_user: User = Depends(get_current_user)):
    """Clear all messages in a room (for ephemeral chat like Snapchat)"""
    # Verify user has permission (room owner or admin)
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room.get("owner_id") != current_user.id and current_user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك بمسح الرسائل")
    
    result = await db.messages.delete_many({"room_id": room_id})
    return {"message": "تم مسح جميع الرسائل", "deleted_count": result.deleted_count}

@api_router.post("/rooms/{room_id}/heartbeat")
async def room_heartbeat(room_id: str, current_user: User = Depends(get_current_user)):
    """Update user's last active time - call every few seconds"""
    now = datetime.now(timezone.utc).isoformat()
    await db.room_participants.update_one(
        {"room_id": room_id, "user_id": current_user.id},
        {"$set": {"last_active": now}}
    )
    
    # Clean inactive participants (no heartbeat for 30 seconds)
    thirty_seconds_ago = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
    await db.room_participants.delete_many({
        "room_id": room_id,
        "last_active": {"$lt": thirty_seconds_ago}
    })
    
    return {"status": "ok"}

@api_router.get("/rooms/{room_id}/participants", response_model=List[RoomParticipant])
async def get_room_participants(room_id: str):
    # Clean inactive participants first (no heartbeat for 30 seconds)
    thirty_seconds_ago = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
    await db.room_participants.delete_many({
        "room_id": room_id,
        "last_active": {"$lt": thirty_seconds_ago, "$ne": None}
    })
    
    participants = await db.room_participants.find({"room_id": room_id}, {"_id": 0}).to_list(100)
    
    # Get room owner
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0, "owner_id": 1})
    owner_id = room.get("owner_id") if room else None
    
    # Add room_role to each participant
    for p in participants:
        user_id = p.get("user_id")
        if user_id == owner_id:
            p["room_role"] = "owner"
        else:
            # Check room_roles collection
            room_role = await db.room_roles.find_one({
                "room_id": room_id,
                "user_id": user_id
            }, {"_id": 0, "role": 1})
            p["room_role"] = room_role.get("role", "member") if room_role else "member"
    
    return [RoomParticipant(**p) for p in participants]

@api_router.post("/rooms/{room_id}/messages", response_model=Message)
async def send_message(room_id: str, message_data: MessageCreate, current_user: User = Depends(get_current_user)):
    from uuid import uuid4
    message_id = str(uuid4())
    
    message_doc = {
        "id": message_id,
        "room_id": room_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "content": message_data.content,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Add reply info if present
    if message_data.reply_to_id:
        message_doc["reply_to_id"] = message_data.reply_to_id
        message_doc["reply_to_username"] = message_data.reply_to_username
        message_doc["reply_to_content"] = message_data.reply_to_content
    
    await db.messages.insert_one(message_doc)
    return Message(**message_doc)

# Image message endpoint - Admin/Owner/Room Owner only
@api_router.post("/rooms/{room_id}/messages/image")
async def send_image_message(
    room_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    import base64
    from uuid import uuid4
    
    # Check permissions: owner, admin, or room owner/admin
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_app_owner = current_user.role == "owner"
    is_app_admin = current_user.role == "admin"
    is_room_owner = room.get("owner_id") == current_user.id
    
    # Check room role
    room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    })
    is_room_admin = room_role and room_role.get("role") in ["admin", "mod"]
    
    if not (is_app_owner or is_app_admin or is_room_owner or is_room_admin):
        raise HTTPException(status_code=403, detail="غير مصرح لك بإرسال الصور")
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="الملف ليس صورة")
    
    # Read and validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الصورة كبير جداً (الحد 5MB)")
    
    # Save image to static folder
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    image_filename = f"chat_{room_id}_{uuid4().hex[:8]}.{file_ext}"
    image_path = STATIC_DIR / "chat_images"
    image_path.mkdir(exist_ok=True)
    
    with open(image_path / image_filename, "wb") as f:
        f.write(content)
    
    # Create image URL
    image_url = f"/api/static/chat_images/{image_filename}"
    
    # Create message
    message_id = str(uuid4())
    message_doc = {
        "id": message_id,
        "room_id": room_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "content": "",
        "image_url": image_url,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message_doc)
    
    return {
        "id": message_id,
        "room_id": room_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "content": "",
        "image_url": image_url,
        "timestamp": message_doc["timestamp"]
    }

@api_router.get("/rooms/{room_id}/messages", response_model=List[Message])
async def get_room_messages(room_id: str, limit: int = 50):
    messages = await db.messages.find(
        {"room_id": room_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    messages.reverse()
    return [Message(**m) for m in messages]


@api_router.delete("/rooms/{room_id}/messages/{message_id}")
async def delete_room_message(
    room_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a message from room chat - only sender, room owner, or admins can delete"""
    # Find the message - check both collections (room_messages for WebSocket, messages for HTTP)
    message = await db.room_messages.find_one({"id": message_id, "room_id": room_id})
    message_collection = "room_messages"
    
    if not message:
        # Try the messages collection (older messages stored via HTTP endpoint)
        message = await db.messages.find_one({"id": message_id, "room_id": room_id})
        message_collection = "messages"
    
    if not message:
        raise HTTPException(status_code=404, detail="الرسالة غير موجودة")
    
    # Get room info to check ownership
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check permissions: sender, room owner, app owner, or room admin/leader
    # Handle both user_id (room_messages) and sender_id (messages) fields
    message_sender_id = message.get("user_id") or message.get("sender_id")
    is_message_sender = message_sender_id == current_user.id
    is_room_owner = room.get("owner_id") == current_user.id
    is_app_owner = current_user.role == "owner"
    
    # Check room roles
    room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    })
    is_room_admin = room_role and any(r in room_role.get("roles", []) for r in ["admin", "leader"])
    
    if not (is_message_sender or is_room_owner or is_app_owner or is_room_admin):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية حذف هذه الرسالة")
    
    # Delete the message from the correct collection
    if message_collection == "room_messages":
        await db.room_messages.delete_one({"id": message_id, "room_id": room_id})
    else:
        await db.messages.delete_one({"id": message_id, "room_id": room_id})
    
    # Broadcast deletion to all users in room via WebSocket
    delete_broadcast = {
        "type": "message_deleted",
        "room_id": room_id,
        "message_id": message_id
    }
    await ws_manager.broadcast_to_room(delete_broadcast, room_id)
    
    return {"message": "تم حذف الرسالة", "message_id": message_id}


# ============ REACTIONS SYSTEM ============

class ReactionCreate(BaseModel):
    reaction: str  # emoji like ⚽🔥👏❤️


@api_router.post("/rooms/{room_id}/reactions")
async def send_reaction(
    room_id: str,
    reaction_data: ReactionCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a floating reaction in the room"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    reaction_doc = {
        "id": str(int(time.time() * 1000)),
        "room_id": room_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "reaction": reaction_data.reaction,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Copy for insertion to avoid _id mutation
    doc_to_insert = reaction_doc.copy()
    await db.room_reactions.insert_one(doc_to_insert)
    
    # Auto-delete after 5 seconds (reactions are temporary)
    # In production, use a background task or TTL index
    
    return {"message": "تم إرسال التفاعل", "reaction": reaction_doc}


@api_router.get("/rooms/{room_id}/reactions")
async def get_room_reactions(room_id: str, since: str = None):
    """Get recent reactions (last 10 seconds)"""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=10)
    query = {"room_id": room_id, "created_at": {"$gte": cutoff.isoformat()}}
    
    if since:
        query["created_at"]["$gt"] = since
    
    reactions = await db.room_reactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"reactions": reactions}


# ============ POLLS SYSTEM ============

class PollCreate(BaseModel):
    question: str
    options: List[str]  # List of options
    duration_minutes: int = 5  # How long the poll is active


@api_router.post("/rooms/{room_id}/polls")
async def create_poll(
    room_id: str,
    poll_data: PollCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a poll in the room (owner/admin only)"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check if user is owner or admin
    if room.get("owner_id") != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه إنشاء استطلاع")
    
    # Close any existing active poll
    await db.room_polls.update_many(
        {"room_id": room_id, "is_active": True},
        {"$set": {"is_active": False}}
    )
    
    poll_id = str(int(time.time() * 1000))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=poll_data.duration_minutes)
    
    poll_doc = {
        "id": poll_id,
        "room_id": room_id,
        "creator_id": current_user.id,
        "creator_name": current_user.username,
        "question": poll_data.question,
        "options": [{"id": str(i), "text": opt, "votes": 0} for i, opt in enumerate(poll_data.options)],
        "voters": [],  # List of user_ids who voted
        "total_votes": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat()
    }
    
    await db.room_polls.insert_one(poll_doc)
    poll_doc.pop("_id", None)
    
    return {"message": "تم إنشاء الاستطلاع", "poll": poll_doc}


class VoteCreate(BaseModel):
    option_id: str


@api_router.post("/rooms/{room_id}/polls/{poll_id}/vote")
async def vote_on_poll(
    room_id: str,
    poll_id: str,
    vote_data: VoteCreate,
    current_user: User = Depends(get_current_user)
):
    """Vote on a poll"""
    poll = await db.room_polls.find_one({"id": poll_id, "room_id": room_id})
    if not poll:
        raise HTTPException(status_code=404, detail="الاستطلاع غير موجود")
    
    if not poll.get("is_active"):
        raise HTTPException(status_code=400, detail="الاستطلاع منتهي")
    
    # Check if already voted
    if current_user.id in poll.get("voters", []):
        raise HTTPException(status_code=400, detail="لقد صوتت بالفعل")
    
    # Check if poll expired
    expires_at = datetime.fromisoformat(poll["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        await db.room_polls.update_one({"id": poll_id}, {"$set": {"is_active": False}})
        raise HTTPException(status_code=400, detail="انتهى وقت الاستطلاع")
    
    # Update vote count
    await db.room_polls.update_one(
        {"id": poll_id, "options.id": vote_data.option_id},
        {
            "$inc": {"options.$.votes": 1, "total_votes": 1},
            "$push": {"voters": current_user.id}
        }
    )
    
    # Get updated poll
    updated_poll = await db.room_polls.find_one({"id": poll_id}, {"_id": 0})
    
    return {"message": "تم التصويت", "poll": updated_poll}


@api_router.get("/rooms/{room_id}/polls/active")
async def get_active_poll(room_id: str):
    """Get the current active poll in the room"""
    poll = await db.room_polls.find_one(
        {"room_id": room_id, "is_active": True},
        {"_id": 0}
    )
    
    if poll:
        # Check if expired
        expires_at = datetime.fromisoformat(poll["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            await db.room_polls.update_one({"id": poll["id"]}, {"$set": {"is_active": False}})
            poll["is_active"] = False
    
    return {"poll": poll}


@api_router.delete("/rooms/{room_id}/polls/{poll_id}")
async def close_poll(
    room_id: str,
    poll_id: str,
    current_user: User = Depends(get_current_user)
):
    """Close a poll early"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room.get("owner_id") != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.room_polls.update_one({"id": poll_id}, {"$set": {"is_active": False}})
    
    return {"message": "تم إغلاق الاستطلاع"}


# ============ WATCH PARTY SYSTEM ============

class WatchPartyChannel(BaseModel):
    id: int
    url: str
    name: str = ""

class WatchPartyCreate(BaseModel):
    video_url: str  # YouTube or other video URL
    title: str = ""
    channels: list = []  # List of channels


@api_router.post("/rooms/{room_id}/watch-party")
async def start_watch_party(
    room_id: str,
    party_data: WatchPartyCreate,
    current_user: User = Depends(get_current_user)
):
    """Start a watch party with channels"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room.get("owner_id") != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه بدء Watch Party")
    
    # Prepare channels - ensure we have 5 channels
    channels = party_data.channels if party_data.channels else []
    if not channels:
        channels = [{"id": 1, "url": party_data.video_url, "name": "قناة 1"}]
    
    watch_party = {
        "id": str(int(time.time() * 1000)),
        "room_id": room_id,
        "video_url": party_data.video_url,
        "title": party_data.title,
        "channels": channels,
        "active_channel": 1,
        "host_id": current_user.id,
        "host_name": current_user.username,
        "is_playing": True,
        "current_time": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "last_sync": datetime.now(timezone.utc).isoformat()
    }
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"watch_party": watch_party}}
    )
    
    return {"message": "تم بدء Watch Party", "watch_party": watch_party}


# Change channel endpoint
@api_router.put("/rooms/{room_id}/watch-party/channel/{channel_id}")
async def change_watch_party_channel(
    room_id: str,
    channel_id: int,
    current_user: User = Depends(get_current_user)
):
    """Change active channel"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    watch_party = room.get("watch_party")
    if not watch_party:
        raise HTTPException(status_code=404, detail="لا يوجد Watch Party نشط")
    
    # Only host or owner can change channel
    if watch_party.get("host_id") != current_user.id and room.get("owner_id") != current_user.id:
        raise HTTPException(status_code=403, detail="فقط المضيف يمكنه تغيير القناة")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"watch_party.active_channel": channel_id}}
    )
    
    return {"message": "تم تغيير القناة", "active_channel": channel_id}


class WatchPartySync(BaseModel):
    current_time: float
    is_playing: bool = True


@api_router.put("/rooms/{room_id}/watch-party/sync")
async def sync_watch_party(
    room_id: str,
    sync_data: WatchPartySync,
    current_user: User = Depends(get_current_user)
):
    """Sync watch party playback state (host only)"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    watch_party = room.get("watch_party")
    if not watch_party:
        raise HTTPException(status_code=404, detail="لا يوجد Watch Party نشط")
    
    if watch_party.get("host_id") != current_user.id and room.get("owner_id") != current_user.id:
        raise HTTPException(status_code=403, detail="فقط المضيف يمكنه التحكم")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {
            "watch_party.current_time": sync_data.current_time,
            "watch_party.is_playing": sync_data.is_playing,
            "watch_party.last_sync": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "تم المزامنة", "current_time": sync_data.current_time, "is_playing": sync_data.is_playing}


@api_router.get("/rooms/{room_id}/watch-party")
async def get_watch_party(room_id: str):
    """Get current watch party state"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0, "watch_party": 1})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    return {"watch_party": room.get("watch_party")}


@api_router.delete("/rooms/{room_id}/watch-party")
async def end_watch_party(
    room_id: str,
    current_user: User = Depends(get_current_user)
):
    """End the watch party"""
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if room.get("owner_id") != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.rooms.update_one({"id": room_id}, {"$unset": {"watch_party": ""}})
    
    return {"message": "تم إنهاء Watch Party"}


@api_router.get("/users/me", response_model=User)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكنك متابعة نفسك")
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$addToSet": {"following": user_id}}
    )
    await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"followers": current_user.id}}
    )
    
    return {"message": "تمت المتابعة بنجاح"}

@api_router.delete("/users/{user_id}/follow")
async def unfollow_user(user_id: str, current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user.id},
        {"$pull": {"following": user_id}}
    )
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"followers": current_user.id}}
    )
    
    return {"message": "تم إلغاء المتابعة"}

@api_router.get("/users", response_model=List[User])
async def get_users(limit: int = 20):
    users = await db.users.find({}, {"_id": 0, "password": 0}).limit(limit).to_list(limit)
    return [User(**u) for u in users]

class RoomCreate(BaseModel):
    id: str
    name: str
    name_en: str
    description: str
    image: str

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    is_closed: Optional[bool] = None

class UserRoleUpdate(BaseModel):
    role: str

class BroadcastMessage(BaseModel):
    message: str

@api_router.post("/admin/rooms", dependencies=[Depends(get_admin_user)])
async def create_room(room: RoomCreate):
    new_room = room.model_dump()
    new_room["is_closed"] = False
    ROOMS.append(new_room)
    return {"message": "تم إنشاء الغرفة بنجاح", "room": new_room}

@api_router.put("/admin/rooms/{room_id}", dependencies=[Depends(get_admin_user)])
async def update_room(room_id: str, updates: RoomUpdate):
    for i, room in enumerate(ROOMS):
        if room["id"] == room_id:
            update_data = updates.model_dump(exclude_none=True)
            ROOMS[i].update(update_data)
            return {"message": "تم تحديث الغرفة بنجاح", "room": ROOMS[i]}
    raise HTTPException(status_code=404, detail="الغرفة غير موجودة")

@api_router.post("/admin/rooms/{room_id}/toggle")
async def toggle_room(room_id: str, current_user: User = Depends(get_current_user)):
    """Toggle room open/closed status - Room Owner or System Owner"""
    import random
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # System owner can toggle any room, room owner can toggle their room
    if current_user.role != "owner" and room["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    new_status = not room.get("is_closed", False)
    
    # Generate PIN when closing, remove when opening
    update_data = {"is_closed": new_status}
    if new_status:
        # Generate 4-digit PIN
        pin = str(random.randint(1000, 9999))
        update_data["close_pin"] = pin
        
        # Kick all participants when closing (except system owner)
        await db.room_participants.delete_many({"room_id": room_id})
    else:
        update_data["close_pin"] = None
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": update_data}
    )
    
    status = "مغلقة" if new_status else "مفتوحة"
    response = {"message": f"الغرفة الآن {status}", "is_closed": new_status}
    
    # Return PIN only when closing
    if new_status:
        response["pin"] = update_data["close_pin"]
    
    return response


class StreamRequest(BaseModel):
    url: str
    slot: int = 1  # 1-5

class StreamSlotsUpdate(BaseModel):
    slots: dict  # {"1": "url1", "2": "url2", ...}

@api_router.post("/rooms/{room_id}/stream/start")
async def start_stream(room_id: str, stream_data: StreamRequest, current_user: User = Depends(get_current_user)):
    """Start a live stream in the room - System Owner only"""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="فقط الأونر يمكنه تشغيل البث")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Convert YouTube/Twitch URLs to embed format
    stream_url = stream_data.url.strip()
    embed_url = stream_url
    
    # YouTube Channel - live stream
    if "youtube.com/@" in stream_url or "youtube.com/channel/" in stream_url or "youtube.com/c/" in stream_url:
        channel_id = ""
        if "youtube.com/@" in stream_url:
            channel_id = stream_url.split("@")[1].split("/")[0].split("?")[0]
        elif "youtube.com/channel/" in stream_url:
            channel_id = stream_url.split("/channel/")[1].split("/")[0].split("?")[0]
        elif "youtube.com/c/" in stream_url:
            channel_id = stream_url.split("/c/")[1].split("/")[0].split("?")[0]
        if channel_id:
            embed_url = f"https://www.youtube.com/embed/live_stream?channel={channel_id}&autoplay=1"
    
    # YouTube Video URL conversion (including live streams)
    elif "youtube.com/watch" in stream_url or "youtu.be" in stream_url or "youtube.com/live" in stream_url:
        video_id = ""
        if "youtube.com/watch" in stream_url:
            video_id = stream_url.split("v=")[1].split("&")[0] if "v=" in stream_url else ""
        elif "youtube.com/live" in stream_url:
            video_id = stream_url.split("/live/")[1].split("?")[0] if "/live/" in stream_url else ""
        else:
            video_id = stream_url.split("/")[-1].split("?")[0]
        if video_id:
            embed_url = f"https://www.youtube.com/embed/{video_id}?autoplay=1&mute=0&playsinline=1"
    
    # Twitch URL conversion
    elif "twitch.tv" in stream_url:
        channel = stream_url.split("twitch.tv/")[1].split("/")[0] if "twitch.tv/" in stream_url else ""
        if channel:
            embed_url = f"https://player.twitch.tv/?channel={channel}&parent={os.environ.get('FRONTEND_DOMAIN', 'pitch-chat.preview.emergentagent.com')}"
    
    # Dailymotion support
    elif "dailymotion.com" in stream_url:
        if "/video/" in stream_url:
            video_id = stream_url.split("/video/")[1].split("?")[0]
            embed_url = f"https://www.dailymotion.com/embed/video/{video_id}?autoplay=1&quality=1080&ui-logo=0"
        elif "/live/" in stream_url:
            video_id = stream_url.split("/live/")[1].split("?")[0]
            embed_url = f"https://www.dailymotion.com/embed/video/{video_id}?autoplay=1&quality=1080&ui-logo=0"
    
    # Facebook Video support
    elif "facebook.com" in stream_url and "/videos/" in stream_url:
        embed_url = f"https://www.facebook.com/plugins/video.php?href={stream_url}&autoplay=true"
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"stream_url": embed_url, "stream_active": True, "active_slot": stream_data.slot}}
    )
    
    return {"message": "تم بدء البث", "stream_url": embed_url, "slot": stream_data.slot}

@api_router.post("/rooms/{room_id}/stream/slots")
async def update_stream_slots(room_id: str, slots_data: StreamSlotsUpdate, current_user: User = Depends(get_current_user)):
    """Update saved stream slots - System Owner only"""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="فقط الأونر يمكنه تعديل الروابط")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"stream_slots": slots_data.slots}}
    )
    
    return {"message": "تم حفظ الروابط", "slots": slots_data.slots}

@api_router.post("/rooms/{room_id}/stream/play/{slot}")
async def play_stream_slot(room_id: str, slot: int, current_user: User = Depends(get_current_user)):
    """Play a saved stream slot - Anyone can switch channels when stream is active"""
    if slot < 1 or slot > 5:
        raise HTTPException(status_code=400, detail="رقم الرابط يجب أن يكون من 1 إلى 5")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check if stream is active (only switch if already streaming, unless owner)
    if not room.get("stream_active", False) and current_user.role != "owner":
        raise HTTPException(status_code=403, detail="البث غير مفعل")
    
    stream_slots = room.get("stream_slots", {})
    stream_url = stream_slots.get(str(slot), "")
    
    if not stream_url:
        raise HTTPException(status_code=400, detail="هذا الرابط فارغ")
    
    # Convert to embed URL
    embed_url = stream_url
    
    # YouTube Channel - live stream
    if "youtube.com/@" in stream_url or "youtube.com/channel/" in stream_url or "youtube.com/c/" in stream_url:
        channel_id = ""
        if "youtube.com/@" in stream_url:
            channel_id = stream_url.split("@")[1].split("/")[0].split("?")[0]
        elif "youtube.com/channel/" in stream_url:
            channel_id = stream_url.split("/channel/")[1].split("/")[0].split("?")[0]
        elif "youtube.com/c/" in stream_url:
            channel_id = stream_url.split("/c/")[1].split("/")[0].split("?")[0]
        if channel_id:
            embed_url = f"https://www.youtube.com/embed/live_stream?channel={channel_id}&autoplay=1"
    
    # YouTube Video
    elif "youtube.com/watch" in stream_url or "youtu.be" in stream_url or "youtube.com/live" in stream_url:
        video_id = ""
        if "youtube.com/watch" in stream_url:
            video_id = stream_url.split("v=")[1].split("&")[0] if "v=" in stream_url else ""
        elif "youtube.com/live" in stream_url:
            video_id = stream_url.split("/live/")[1].split("?")[0] if "/live/" in stream_url else ""
        else:
            video_id = stream_url.split("/")[-1].split("?")[0]
        if video_id:
            embed_url = f"https://www.youtube.com/embed/{video_id}?autoplay=1"
    
    # Twitch
    elif "twitch.tv" in stream_url:
        channel = stream_url.split("twitch.tv/")[1].split("/")[0] if "twitch.tv/" in stream_url else ""
        if channel:
            embed_url = f"https://player.twitch.tv/?channel={channel}&parent=pitch-chat.preview.emergentagent.com"
    # Dailymotion support
    elif "dailymotion.com" in stream_url:
        if "/video/" in stream_url:
            video_id = stream_url.split("/video/")[1].split("?")[0]
            embed_url = f"https://www.dailymotion.com/embed/video/{video_id}?autoplay=1&quality=1080&ui-logo=0"
        elif "/live/" in stream_url:
            video_id = stream_url.split("/live/")[1].split("?")[0]
            embed_url = f"https://www.dailymotion.com/embed/video/{video_id}?autoplay=1&quality=1080&ui-logo=0"
    # Facebook Video support
    elif "facebook.com" in stream_url and "/videos/" in stream_url:
        embed_url = f"https://www.facebook.com/plugins/video.php?href={stream_url}&autoplay=true"
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"stream_url": embed_url, "stream_active": True, "active_slot": slot}}
    )
    
    return {"message": "تم تشغيل البث", "stream_url": embed_url, "slot": slot}

@api_router.post("/rooms/{room_id}/stream/stop")
async def stop_stream(room_id: str, current_user: User = Depends(get_current_user)):
    """Stop the live stream - System Owner only"""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="فقط الأونر يمكنه إيقاف البث")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"stream_url": None, "stream_active": False}}
    )
    
    return {"message": "تم إيقاف البث"}

@api_router.get("/rooms/{room_id}/stream")
async def get_stream(room_id: str):
    """Get current stream status"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    return {
        "stream_active": room.get("stream_active", False),
        "stream_url": room.get("stream_url"),
        "stream_slots": room.get("stream_slots", {}),
        "active_slot": room.get("active_slot")
    }


# ============== Room News (أخبار الغرفة/الدوانية) ==============

class RoomNewsCreate(BaseModel):
    text: str
    category: str = "عام"  # عام, نتائج, انتقالات, تصريحات, عاجل

@api_router.get("/rooms/{room_id}/news")
async def get_room_news(room_id: str):
    """Get news for a specific room"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Get room news
    news = await db.room_news.find(
        {"room_id": room_id, "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    return {"news": news}

@api_router.post("/rooms/{room_id}/news")
async def add_room_news(room_id: str, data: RoomNewsCreate, current_user: User = Depends(get_current_user)):
    """Add news to room - Owner or Room News Reporter only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    # Check if user is room news reporter (supports multiple roles)
    room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    # Check both old format (role) and new format (roles)
    user_roles = room_role.get("roles", []) if room_role else []
    if not user_roles and room_role and room_role.get("role"):
        user_roles = [room_role.get("role")]
    is_room_news_reporter = "news_reporter" in user_roles
    
    if not is_room_owner and not is_system_owner and not is_room_news_reporter:
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة أو الإخباري يمكنه إضافة أخبار")
    
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="نص الخبر مطلوب")
    
    category_icons = {
        "عام": "📰",
        "انتقالات": "🔄",
        "نتائج": "⚽",
        "تصريحات": "🎙️",
        "عاجل": "🔴"
    }
    
    news_item = {
        "id": str(uuid.uuid4())[:8],
        "room_id": room_id,
        "text": data.text.strip(),
        "category": data.category,
        "icon": category_icons.get(data.category, "📰"),
        "author_id": current_user.id,
        "author_name": current_user.username,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.room_news.insert_one(news_item)
    
    # Send push notifications to room participants
    try:
        from routes.push import send_push_notification
        import asyncio
        
        # Get all participants in the room
        participants = await db.room_participants.find(
            {"room_id": room_id},
            {"_id": 0, "user_id": 1}
        ).to_list(100)
        
        room_title = room.get("title", "الغرفة")
        news_text = data.text.strip()[:50] + "..." if len(data.text.strip()) > 50 else data.text.strip()
        
        for participant in participants:
            participant_id = participant.get("user_id")
            # Don't notify the author
            if participant_id and participant_id != current_user.id:
                asyncio.create_task(send_push_notification(
                    participant_id,
                    f"📰 خبر جديد في {room_title}",
                    f"{category_icons.get(data.category, '📰')} {news_text}",
                    f"/room/{room_id}"
                ))
    except Exception as e:
        # Don't fail the request if notifications fail
        print(f"Error sending room news notifications: {e}")
    
    return {"message": "تم إضافة الخبر", "news": {k: v for k, v in news_item.items() if k != "_id"}}

@api_router.delete("/rooms/{room_id}/news/{news_id}")
async def delete_room_news(room_id: str, news_id: str, current_user: User = Depends(get_current_user)):
    """Delete room news - Owner or author only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    news = await db.room_news.find_one({"id": news_id, "room_id": room_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    is_author = news.get("author_id") == current_user.id
    
    if not is_room_owner and not is_system_owner and not is_author:
        raise HTTPException(status_code=403, detail="لا يمكنك حذف هذا الخبر")
    
    await db.room_news.delete_one({"id": news_id})
    
    return {"message": "تم حذف الخبر"}

@api_router.put("/rooms/{room_id}/news/{news_id}")
async def update_room_news(room_id: str, news_id: str, data: RoomNewsCreate, current_user: User = Depends(get_current_user)):
    """Update room news - Owner, author, or news_reporter"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    news = await db.room_news.find_one({"id": news_id, "room_id": room_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    is_author = news.get("author_id") == current_user.id
    
    # Check if user is room news reporter
    room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    user_roles = room_role.get("roles", []) if room_role else []
    if not user_roles and room_role and room_role.get("role"):
        user_roles = [room_role.get("role")]
    is_news_reporter = "news_reporter" in user_roles
    
    if not is_room_owner and not is_system_owner and not is_author and not is_news_reporter:
        raise HTTPException(status_code=403, detail="لا يمكنك تعديل هذا الخبر")
    
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="نص الخبر مطلوب")
    
    category_icons = {
        "عام": "📰",
        "انتقالات": "🔄",
        "نتائج": "⚽",
        "تصريحات": "🎙️",
        "عاجل": "🔴"
    }
    
    update_data = {
        "text": data.text.strip(),
        "category": data.category,
        "icon": category_icons.get(data.category, "📰"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.room_news.update_one(
        {"id": news_id},
        {"$set": update_data}
    )
    
    return {"message": "تم تعديل الخبر", "news": {**news, **update_data}}

@api_router.post("/rooms/{room_id}/news-reporter/{user_id}")
async def set_room_news_reporter(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Set user as room news reporter - Owner only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    if not is_room_owner and not is_system_owner:
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة يمكنه تعيين الإخباري")
    
    # Get target user
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # Update or create room role
    await db.room_roles.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"role": "news_reporter", "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": f"تم تعيين {target_user.get('username')} كإخباري للغرفة"}

@api_router.delete("/rooms/{room_id}/news-reporter/{user_id}")
async def remove_room_news_reporter(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    """Remove user from room news reporter - Owner only"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    is_room_owner = room.get("owner_id") == current_user.id
    is_system_owner = current_user.role == "owner"
    
    if not is_room_owner and not is_system_owner:
        raise HTTPException(status_code=403, detail="فقط صاحب الغرفة يمكنه إزالة الإخباري")
    
    # Remove news_reporter role (set to member)
    await db.room_roles.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"role": "member"}}
    )
    
    return {"message": "تم إزالة الإخباري"}


# ============== Screen Sharing / Mirror ==============

class ScreenShareData(BaseModel):
    peer_id: str  # WebRTC peer ID for the screen share

@api_router.post("/rooms/{room_id}/screen-share/start")
async def start_screen_share(room_id: str, data: ScreenShareData, current_user: User = Depends(get_current_user)):
    """Start sharing screen in a room"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check if user is participant
    participant = await db.room_participants.find_one({"room_id": room_id, "user_id": current_user.id})
    if not participant:
        raise HTTPException(status_code=403, detail="يجب أن تكون في الغرفة")
    
    # Add screen share to room's active shares
    share_data = {
        "user_id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar,
        "peer_id": data.peer_id,
        "started_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.rooms.update_one(
        {"id": room_id},
        {"$push": {"screen_shares": share_data}}
    )
    
    return {"message": "تم بدء مشاركة الشاشة", "share": share_data}

@api_router.post("/rooms/{room_id}/screen-share/stop")
async def stop_screen_share(room_id: str, current_user: User = Depends(get_current_user)):
    """Stop sharing screen"""
    await db.rooms.update_one(
        {"id": room_id},
        {"$pull": {"screen_shares": {"user_id": current_user.id}}}
    )
    return {"message": "تم إيقاف مشاركة الشاشة"}

@api_router.get("/rooms/{room_id}/screen-shares")
async def get_screen_shares(room_id: str):
    """Get all active screen shares in room"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    return {"screen_shares": room.get("screen_shares", [])}




@api_router.delete("/admin/rooms/{room_id}")
async def delete_room(room_id: str, current_user: User = Depends(get_current_user)):
    """Delete a room completely - Room Owner or System Owner"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # System owner can delete any room, room owner can delete their room
    if current_user.role != "owner" and room["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    # Delete room and all related data
    await db.rooms.delete_one({"id": room_id})
    await db.room_participants.delete_many({"room_id": room_id})
    await db.messages.delete_many({"room_id": room_id})
    await db.seat_requests.delete_many({"room_id": room_id})
    await db.seat_invites.delete_many({"room_id": room_id})
    
    return {"message": "تم حذف الغرفة بنجاح"}

@api_router.post("/admin/users/{user_id}/kick/{room_id}", dependencies=[Depends(get_admin_user)])
async def kick_user_from_room(user_id: str, room_id: str):
    result = await db.room_participants.delete_one({"room_id": room_id, "user_id": user_id})
    if result.deleted_count > 0:
        return {"message": "تم طرد المستخدم من الغرفة"}
    raise HTTPException(status_code=404, detail="المستخدم غير موجود في الغرفة")

@api_router.post("/admin/users/{user_id}/ban", dependencies=[Depends(get_admin_user)])
async def ban_user(user_id: str):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_banned": True}}
    )
    if result.modified_count > 0:
        await db.room_participants.delete_many({"user_id": user_id})
        return {"message": "تم حظر المستخدم"}
    raise HTTPException(status_code=404, detail="المستخدم غير موجود")

@api_router.post("/admin/users/{user_id}/unban", dependencies=[Depends(get_admin_user)])
async def unban_user(user_id: str):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_banned": False, "banned_rooms": []}}
    )
    if result.modified_count > 0:
        return {"message": "تم إلغاء حظر المستخدم"}
    raise HTTPException(status_code=404, detail="المستخدم غير موجود")

@api_router.post("/admin/users/{user_id}/role", dependencies=[Depends(get_owner_user)])
async def update_user_role(user_id: str, role_data: UserRoleUpdate):
    if role_data.role not in ["user", "mod", "news_editor", "admin"]:
        raise HTTPException(status_code=400, detail="صلاحية غير صحيحة. الخيارات: user, mod, news_editor, admin")
    
    # Cannot change owner role
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    if target_user.get("email") in OWNER_EMAILS:
        raise HTTPException(status_code=403, detail="لا يمكن تغيير صلاحية الأونر")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role_data.role}}
    )
    if result.modified_count > 0:
        role_names = {"user": "مستخدم", "mod": "مود", "news_editor": "إخباري", "admin": "أدمن"}
        return {"message": f"تم تحديث الصلاحية إلى {role_names.get(role_data.role, role_data.role)}"}
    raise HTTPException(status_code=404, detail="المستخدم غير موجود")

@api_router.get("/admin/stats", dependencies=[Depends(get_admin_user)])
async def get_admin_stats():
    total_users = await db.users.count_documents({})
    total_messages = await db.messages.count_documents({})
    active_users = await db.room_participants.count_documents({})
    
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    
    room_stats = []
    for room in rooms:
        count = await db.room_participants.count_documents({"room_id": room["id"]})
        room_stats.append({
            "room_id": room["id"],
            "room_name": room.get("title", room.get("name", "غرفة")),
            "active_users": count,
            "is_closed": room.get("is_closed", False)
        })
    
    return {
        "total_users": total_users,
        "total_messages": total_messages,
        "active_users_now": active_users,
        "rooms": room_stats,
        "total_rooms": len(rooms)
    }

@api_router.post("/admin/broadcast", dependencies=[Depends(get_admin_user)])
async def broadcast_message(broadcast: BroadcastMessage):
    from uuid import uuid4
    message_id = str(uuid4())
    
    for room in ROOMS:
        message_doc = {
            "id": f"{message_id}_{room['id']}",
            "room_id": room["id"],
            "user_id": "system",
            "username": "الإدارة",
            "avatar": "https://ui-avatars.com/api/?name=Admin&background=EF4444&color=fff&bold=true",
            "content": f"📢 إعلان: {broadcast.message}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.messages.insert_one(message_doc)
    
    return {"message": "تم إرسال الإعلان لجميع الغرف"}

class AgoraTokenRequest(BaseModel):
    channel_name: str
    uid: int

class AgoraTokenResponse(BaseModel):
    token: str
    app_id: str
    channel: str
    uid: int

@api_router.post("/agora/token", response_model=AgoraTokenResponse)
async def generate_agora_token(request: AgoraTokenRequest, current_user: User = Depends(get_current_user)):
    try:
        expiration_time_in_seconds = 3600
        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + expiration_time_in_seconds
        
        token = RtcTokenBuilder.buildTokenWithUid(
            appId=AGORA_APP_ID,
            appCertificate=AGORA_APP_CERTIFICATE,
            channelName=request.channel_name,
            uid=request.uid,
            role=1,
            privilegeExpiredTs=privilege_expired_ts
        )
        
        return AgoraTokenResponse(
            token=token,
            app_id=AGORA_APP_ID,
            channel=request.channel_name,
            uid=request.uid
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل توليد Token: {str(e)}")

# Audio Quality Monitoring and Drop Detection
class AudioQualityReport(BaseModel):
    room_id: str
    user_id: str
    quality_score: int  # 0-5 (0=unknown, 1=excellent, 2=good, 3=poor, 4=bad, 5=vbad)
    network_quality: int  # 0-5
    packet_loss: float  # percentage
    jitter: float  # ms
    rtt: float  # round-trip time in ms
    audio_drops: int  # count of detected drops
    timestamp: str

class AudioDropEvent(BaseModel):
    room_id: str
    user_id: str
    drop_duration_ms: int
    reason: str  # "network", "device", "unknown"
    recovered: bool

@api_router.post("/agora/audio-quality")
async def report_audio_quality(report: AudioQualityReport, current_user: User = Depends(get_current_user)):
    """Report audio quality metrics for monitoring"""
    try:
        quality_doc = {
            "id": f"aq_{report.room_id}_{report.user_id}_{int(time.time())}",
            "room_id": report.room_id,
            "user_id": report.user_id,
            "reporter_id": current_user.id,
            "quality_score": report.quality_score,
            "network_quality": report.network_quality,
            "packet_loss": report.packet_loss,
            "jitter": report.jitter,
            "rtt": report.rtt,
            "audio_drops": report.audio_drops,
            "timestamp": report.timestamp,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.audio_quality_reports.insert_one(quality_doc)
        
        # Alert if quality is poor
        if report.quality_score >= 4 or report.packet_loss > 10:
            # Broadcast warning to room
            warning_msg = {
                "type": "audio_quality_warning",
                "room_id": report.room_id,
                "user_id": report.user_id,
                "quality": "poor" if report.quality_score == 3 else "bad",
                "packet_loss": report.packet_loss
            }
            await ws_manager.broadcast_to_room(warning_msg, report.room_id)
        
        return {"status": "recorded", "quality_level": report.quality_score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل تسجيل جودة الصوت: {str(e)}")

@api_router.post("/agora/audio-drop")
async def report_audio_drop(event: AudioDropEvent, current_user: User = Depends(get_current_user)):
    """Report audio drop event for analysis"""
    try:
        drop_doc = {
            "id": f"drop_{event.room_id}_{event.user_id}_{int(time.time())}",
            "room_id": event.room_id,
            "user_id": event.user_id,
            "reporter_id": current_user.id,
            "drop_duration_ms": event.drop_duration_ms,
            "reason": event.reason,
            "recovered": event.recovered,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.audio_drop_events.insert_one(drop_doc)
        
        # Notify room about significant drops
        if event.drop_duration_ms > 3000:  # More than 3 seconds
            drop_msg = {
                "type": "audio_drop_detected",
                "room_id": event.room_id,
                "user_id": event.user_id,
                "duration_ms": event.drop_duration_ms,
                "recovered": event.recovered
            }
            await ws_manager.broadcast_to_room(drop_msg, event.room_id)
        
        return {"status": "recorded", "drop_id": drop_doc["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل تسجيل انقطاع الصوت: {str(e)}")

@api_router.get("/agora/room/{room_id}/quality-stats")
async def get_room_audio_quality_stats(room_id: str, current_user: User = Depends(get_current_user)):
    """Get audio quality statistics for a room"""
    try:
        # Get recent quality reports (last hour)
        one_hour_ago = datetime.now(timezone.utc).isoformat()
        
        reports = await db.audio_quality_reports.find(
            {"room_id": room_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(100).to_list(100)
        
        drops = await db.audio_drop_events.find(
            {"room_id": room_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(50).to_list(50)
        
        if not reports:
            return {
                "room_id": room_id,
                "avg_quality": None,
                "avg_packet_loss": None,
                "total_drops": 0,
                "status": "no_data"
            }
        
        avg_quality = sum(r["quality_score"] for r in reports) / len(reports)
        avg_packet_loss = sum(r["packet_loss"] for r in reports) / len(reports)
        total_drops = len(drops)
        
        return {
            "room_id": room_id,
            "avg_quality": round(avg_quality, 2),
            "avg_packet_loss": round(avg_packet_loss, 2),
            "total_drops": total_drops,
            "recent_reports_count": len(reports),
            "status": "excellent" if avg_quality <= 2 else "good" if avg_quality <= 3 else "poor"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل جلب إحصائيات الجودة: {str(e)}")

# ==================== THREADS ENDPOINTS ====================

@api_router.get("/threads")
async def get_threads(
    tab: str = "forYou",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get threads feed"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    current_user = await db.users.find_one({"id": user_id})
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get threads based on tab
    if tab == "following":
        # Get threads from users the current user follows
        following_ids = current_user.get("following", [])
        query = {"author_id": {"$in": following_ids}}
    else:
        # For "forYou" tab, get all threads
        query = {}
    
    threads_cursor = db.threads.find(query).sort("created_at", -1).limit(50)
    threads = await threads_cursor.to_list(length=50)
    
    if not threads:
        return {"threads": []}
    
    # Get user likes to mark liked threads
    user_likes = await db.thread_likes.find({"user_id": user_id}).to_list(length=1000)
    liked_thread_ids = {like["thread_id"] for like in user_likes}
    
    # Get user reposts to mark reposted threads
    user_reposts = await db.thread_reposts.find({"user_id": user_id}).to_list(length=1000)
    reposted_thread_ids = {repost["thread_id"] for repost in user_reposts}
    
    # Batch fetch all authors in one query
    author_ids = list(set(thread["author_id"] for thread in threads))
    authors_cursor = db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "password": 0})
    authors_list = await authors_cursor.to_list(length=100)
    authors_map = {a["id"]: a for a in authors_list}
    
    result = []
    for thread in threads:
        # Get author info from map
        author = authors_map.get(thread["author_id"])
        if author:
            result.append({
                "id": thread["id"],
                "content": thread.get("content", ""),
                "media_url": thread.get("media_url"),
                "media_type": thread.get("media_type"),
                "twitter_url": thread.get("twitter_url"),
                "author": {
                    "id": author["id"],
                    "username": author["username"],
                    "name": author.get("name", author["username"]),
                    "avatar": author.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={author['username']}")
                },
                "likes_count": thread.get("likes_count", 0),
                "replies_count": thread.get("replies_count", 0),
                "reposts_count": thread.get("reposts_count", 0),
                "liked": thread["id"] in liked_thread_ids,
                "reposted": thread["id"] in reposted_thread_ids,
                "created_at": thread["created_at"]
            })
    
    return {"threads": result}

@api_router.post("/threads")
async def create_thread(
    thread_data: ThreadCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new thread"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # At least content, media, or twitter_url is required
    if not thread_data.content.strip() and not thread_data.media_url and not thread_data.twitter_url:
        raise HTTPException(status_code=400, detail="Content, media, or twitter link required")
    
    if thread_data.content and len(thread_data.content) > 500:
        raise HTTPException(status_code=400, detail="Content too long")
    
    thread_id = str(int(time.time() * 1000))
    new_thread = {
        "id": thread_id,
        "author_id": user_id,
        "content": thread_data.content.strip() if thread_data.content else "",
        "media_url": thread_data.media_url,
        "media_type": thread_data.media_type,
        "twitter_url": thread_data.twitter_url,
        "likes_count": 0,
        "replies_count": 0,
        "reposts_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.threads.insert_one(new_thread)
    
    # Add XP for posting
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"xp": 5}}
    )
    
    # Check for @mentions and create notifications
    if thread_data.content:
        import re
        mentions = re.findall(r'@(\w+)', thread_data.content)
        for username in set(mentions):  # Use set to avoid duplicate notifications
            mentioned_user = await db.users.find_one({"username": username})
            if mentioned_user and mentioned_user["id"] != user_id:
                await create_notification(
                    user_id=mentioned_user["id"],
                    notif_type="mention",
                    from_user_id=user_id,
                    thread_id=thread_id,
                    message=thread_data.content.strip()[:50]
                )
    
    return {"message": "Thread created", "thread_id": thread_id}


@api_router.get("/threads/{thread_id}")
async def get_thread(
    thread_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a single thread by ID"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        thread = await db.threads.find_one({"id": thread_id})
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Get author info
        author = await db.users.find_one({"id": thread.get("author_id")}, {"_id": 0, "password": 0})
        
        # Check if user liked this thread
        liked = await db.likes.find_one({"user_id": user_id, "thread_id": thread_id}) is not None
        
        # Check if user reposted this thread
        reposted = await db.reposts.find_one({"user_id": user_id, "thread_id": thread_id}) is not None
        
        return {
            "id": thread.get("id"),
            "content": thread.get("content"),
            "author": author,
            "media_url": thread.get("media_url"),
            "media_type": thread.get("media_type"),
            "twitter_url": thread.get("twitter_url"),
            "likes_count": thread.get("likes_count", 0),
            "reposts_count": thread.get("reposts_count", 0),
            "replies_count": thread.get("replies_count", 0),
            "liked": liked,
            "reposted": reposted,
            "created_at": thread.get("created_at")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/threads/{thread_id}/like")
async def like_thread(
    thread_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Like or unlike a thread"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    thread = await db.threads.find_one({"id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check if already liked
    existing_like = await db.thread_likes.find_one({
        "thread_id": thread_id,
        "user_id": user_id
    })
    
    if existing_like:
        # Unlike
        await db.thread_likes.delete_one({"_id": existing_like["_id"]})
        await db.threads.update_one(
            {"id": thread_id},
            {"$inc": {"likes_count": -1}}
        )
        return {"liked": False}
    else:
        # Like
        await db.thread_likes.insert_one({
            "thread_id": thread_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.threads.update_one(
            {"id": thread_id},
            {"$inc": {"likes_count": 1}}
        )
        
        # Create notification for thread author (if not self-like)
        if thread["author_id"] != user_id:
            await create_notification(
                user_id=thread["author_id"],
                notif_type="like",
                from_user_id=user_id,
                thread_id=thread_id
            )
        
        return {"liked": True}

class ReplyCreate(BaseModel):
    content: str

@api_router.post("/threads/{thread_id}/reply")
async def reply_to_thread(
    thread_id: str,
    reply_data: ReplyCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reply to a thread"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    thread = await db.threads.find_one({"id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if not reply_data.content.strip():
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    
    reply_id = str(int(time.time() * 1000))
    new_reply = {
        "id": reply_id,
        "parent_thread_id": thread_id,
        "author_id": user_id,
        "content": reply_data.content.strip(),
        "likes_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.thread_replies.insert_one(new_reply)
    
    # Update thread replies count
    await db.threads.update_one(
        {"id": thread_id},
        {"$inc": {"replies_count": 1}}
    )
    
    # Add XP for replying
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"xp": 2}}
    )
    
    # Create notification for thread author (if not self-reply)
    if thread["author_id"] != user_id:
        await create_notification(
            user_id=thread["author_id"],
            notif_type="reply",
            from_user_id=user_id,
            thread_id=thread_id,
            message=reply_data.content.strip()[:50]
        )
    
    # Check for @mentions in reply and create notifications
    import re
    mentions = re.findall(r'@(\w+)', reply_data.content)
    for username in set(mentions):
        mentioned_user = await db.users.find_one({"username": username})
        # Don't notify if mentioning yourself or the thread author (already notified)
        if mentioned_user and mentioned_user["id"] != user_id and mentioned_user["id"] != thread["author_id"]:
            await create_notification(
                user_id=mentioned_user["id"],
                notif_type="mention",
                from_user_id=user_id,
                thread_id=thread_id,
                message=reply_data.content.strip()[:50]
            )
    
    return {"message": "Reply added", "reply_id": reply_id}

@api_router.get("/threads/{thread_id}/replies")
async def get_thread_replies(
    thread_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get replies for a thread"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get the original thread to get author info
    original_thread = await db.threads.find_one({"id": thread_id})
    original_author = None
    if original_thread:
        original_author = await db.users.find_one({"id": original_thread["author_id"]})
    
    replies_cursor = db.thread_replies.find({"parent_thread_id": thread_id}).sort("created_at", 1).limit(100)
    replies = await replies_cursor.to_list(length=100)
    
    result = []
    for reply in replies:
        author = await db.users.find_one({"id": reply["author_id"]})
        if author:
            result.append({
                "id": reply["id"],
                "content": reply["content"],
                "author": {
                    "id": author["id"],
                    "username": author["username"],
                    "name": author.get("name", author["username"]),
                    "avatar": author.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={author['username']}")
                },
                "replying_to": {
                    "id": original_author["id"] if original_author else "",
                    "username": original_author["username"] if original_author else ""
                } if original_author else None,
                "likes_count": reply.get("likes_count", 0),
                "created_at": reply["created_at"]
            })
    
    return {"replies": result}

@api_router.delete("/replies/{reply_id}")
async def delete_reply(
    reply_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a reply"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    reply = await db.thread_replies.find_one({"id": reply_id})
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    if reply["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get parent thread to decrement replies count
    thread_id = reply.get("parent_thread_id")
    
    await db.thread_replies.delete_one({"id": reply_id})
    
    # Decrement replies count on parent thread
    if thread_id:
        await db.threads.update_one({"id": thread_id}, {"$inc": {"replies_count": -1}})
    
    return {"message": "Reply deleted"}

@api_router.post("/threads/{thread_id}/repost")
async def repost_thread(
    thread_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Repost a thread"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    thread = await db.threads.find_one({"id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check if already reposted
    existing_repost = await db.thread_reposts.find_one({
        "thread_id": thread_id,
        "user_id": user_id
    })
    
    if existing_repost:
        # Un-repost
        await db.thread_reposts.delete_one({"_id": existing_repost["_id"]})
        await db.threads.update_one(
            {"id": thread_id},
            {"$inc": {"reposts_count": -1}}
        )
        return {"reposted": False}
    else:
        # Repost
        await db.thread_reposts.insert_one({
            "thread_id": thread_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.threads.update_one(
            {"id": thread_id},
            {"$inc": {"reposts_count": 1}}
        )
        return {"reposted": True}

@api_router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a thread"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    thread = await db.threads.find_one({"id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check if user owns the thread or is admin/owner
    user = await db.users.find_one({"id": user_id})
    if thread["author_id"] != user_id and user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.threads.delete_one({"id": thread_id})
    await db.thread_likes.delete_many({"thread_id": thread_id})
    
    return {"message": "Thread deleted"}

# ==================== USER PROFILE THREADS ====================

@api_router.get("/users/{user_id}/threads")
async def get_user_threads(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get threads posted by a user"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        current_user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get threads by this user
    threads_cursor = db.threads.find({"author_id": user_id}).sort("created_at", -1).limit(50)
    threads = await threads_cursor.to_list(length=50)
    
    # Get user likes
    user_likes = await db.thread_likes.find({"user_id": current_user_id}).to_list(length=1000)
    liked_thread_ids = {like["thread_id"] for like in user_likes}
    
    result = []
    for thread in threads:
        author = await db.users.find_one({"id": thread["author_id"]})
        if author:
            result.append({
                "id": thread["id"],
                "content": thread.get("content", ""),
                "media_url": thread.get("media_url"),
                "media_type": thread.get("media_type"),
                "twitter_url": thread.get("twitter_url"),
                "author": {
                    "id": author["id"],
                    "username": author["username"],
                    "name": author.get("name", author["username"]),
                    "avatar": author.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={author['username']}")
                },
                "likes_count": thread.get("likes_count", 0),
                "replies_count": thread.get("replies_count", 0),
                "reposts_count": thread.get("reposts_count", 0),
                "liked": thread["id"] in liked_thread_ids,
                "created_at": thread["created_at"]
            })
    
    return {"threads": result}

@api_router.get("/users/{user_id}/liked-threads")
async def get_user_liked_threads(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get threads liked by a user"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        current_user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get likes by this user
    likes_cursor = db.thread_likes.find({"user_id": user_id}).sort("created_at", -1).limit(50)
    likes = await likes_cursor.to_list(length=50)
    liked_thread_ids = [like["thread_id"] for like in likes]
    
    # Get current user likes for marking
    current_user_likes = await db.thread_likes.find({"user_id": current_user_id}).to_list(length=1000)
    current_liked_ids = {like["thread_id"] for like in current_user_likes}
    
    result = []
    for thread_id in liked_thread_ids:
        thread = await db.threads.find_one({"id": thread_id})
        if thread:
            author = await db.users.find_one({"id": thread["author_id"]})
            if author:
                result.append({
                    "id": thread["id"],
                    "content": thread.get("content", ""),
                    "media_url": thread.get("media_url"),
                    "media_type": thread.get("media_type"),
                    "twitter_url": thread.get("twitter_url"),
                    "author": {
                        "id": author["id"],
                        "username": author["username"],
                        "name": author.get("name", author["username"]),
                        "avatar": author.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={author['username']}")
                    },
                    "likes_count": thread.get("likes_count", 0),
                    "replies_count": thread.get("replies_count", 0),
                    "reposts_count": thread.get("reposts_count", 0),
                    "liked": thread["id"] in current_liked_ids,
                    "created_at": thread["created_at"]
                })
    
    return {"threads": result}

@api_router.get("/users/{user_id}/replies")
async def get_user_replies(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get replies by a user"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        current_user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get replies by this user (threads that are replies to other threads)
    replies_cursor = db.thread_replies.find({"author_id": user_id}).sort("created_at", -1).limit(50)
    replies = await replies_cursor.to_list(length=50)
    
    result = []
    for reply in replies:
        author = await db.users.find_one({"id": reply["author_id"]})
        if author:
            # Get the original thread to show who the reply was to
            parent_thread = await db.threads.find_one({"id": reply.get("parent_thread_id")})
            thread_author = None
            thread_content = None
            if parent_thread:
                thread_content = parent_thread.get("content", "")[:100]  # First 100 chars
                thread_author_data = await db.users.find_one({"id": parent_thread.get("author_id")})
                if thread_author_data:
                    thread_author = {
                        "id": thread_author_data["id"],
                        "username": thread_author_data["username"],
                        "name": thread_author_data.get("name", thread_author_data["username"])
                    }
            
            result.append({
                "id": reply.get("id", str(reply.get("_id", ""))),
                "content": reply.get("content", ""),
                "parent_thread_id": reply.get("parent_thread_id"),
                "author": {
                    "id": author["id"],
                    "username": author["username"],
                    "name": author.get("name", author["username"]),
                    "avatar": author.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={author['username']}")
                },
                "thread_author": thread_author,
                "thread_content": thread_content,
                "likes_count": reply.get("likes_count", 0),
                "created_at": reply.get("created_at", "")
            })
    
    return {"replies": result}

@api_router.get("/users/{user_id}/reposts")
async def get_user_reposts(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get reposts by a user"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        current_user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get reposts by this user
    reposts_cursor = db.thread_reposts.find({"user_id": user_id}).sort("created_at", -1).limit(50)
    reposts = await reposts_cursor.to_list(length=50)
    reposted_thread_ids = [repost["thread_id"] for repost in reposts]
    
    # Get current user likes
    current_user_likes = await db.thread_likes.find({"user_id": current_user_id}).to_list(length=1000)
    current_liked_ids = {like["thread_id"] for like in current_user_likes}
    
    result = []
    for thread_id in reposted_thread_ids:
        thread = await db.threads.find_one({"id": thread_id})
        if thread:
            author = await db.users.find_one({"id": thread["author_id"]})
            if author:
                result.append({
                    "id": thread["id"],
                    "content": thread.get("content", ""),
                    "media_url": thread.get("media_url"),
                    "media_type": thread.get("media_type"),
                    "twitter_url": thread.get("twitter_url"),
                    "author": {
                        "id": author["id"],
                        "username": author["username"],
                        "name": author.get("name", author["username"]),
                        "avatar": author.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={author['username']}")
                    },
                    "likes_count": thread.get("likes_count", 0),
                    "replies_count": thread.get("replies_count", 0),
                    "reposts_count": thread.get("reposts_count", 0),
                    "liked": thread["id"] in current_liked_ids,
                    "created_at": thread["created_at"],
                    "is_repost": True
                })
    
    return {"threads": result}

# ==================== SEARCH & USERS ====================

@api_router.get("/users/search")
async def search_users(
    q: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Search users by username or name"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        current_user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not q or len(q) < 1:
        return {"users": []}
    
    # Search by username or name (case insensitive)
    users_cursor = db.users.find({
        "$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ],
        "id": {"$ne": current_user_id}  # Exclude current user
    }).limit(20)
    
    users = await users_cursor.to_list(length=20)
    
    # Check if current user follows each user
    current_user = await db.users.find_one({"id": current_user_id})
    following_ids = current_user.get("following", []) if current_user else []
    
    result = []
    for user in users:
        result.append({
            "id": user["id"],
            "username": user["username"],
            "name": user.get("name", user["username"]),
            "avatar": user.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={user['username']}"),
            "bio": user.get("bio", ""),
            "is_following": user["id"] in following_ids
        })
    
    return {"users": result}

@api_router.get("/users/{user_id}/profile")
async def get_user_profile(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get another user's profile"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        current_user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if current user follows this user
    current_user = await db.users.find_one({"id": current_user_id})
    is_following = user_id in (current_user.get("following", []) if current_user else [])
    
    # Get follower/following counts
    followers_count = len(user.get("followers", []))
    following_count = len(user.get("following", []))
    
    return {
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user.get("name", user["username"]),
            "avatar": user.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={user['username']}"),
            "bio": user.get("bio", ""),
            "level": user.get("level", 1),
            "xp": user.get("xp", 0),
            "coins": user.get("coins", 0),
            "role": user.get("role", "user"),
            "followers_count": followers_count,
            "following_count": following_count,
            "is_following": is_following
        }
    }

# ==================== USER SETTINGS ====================

class UserSettings(BaseModel):
    privacy: Optional[dict] = None
    security: Optional[dict] = None
    notifications: Optional[dict] = None
    display: Optional[dict] = None

@api_router.get("/users/settings")
async def get_user_settings(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user settings"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    settings = await db.user_settings.find_one({"user_id": user_id})
    
    if not settings:
        # Return default settings
        default_settings = {
            "privacy": {
                "privateAccount": False,
                "showOnlineStatus": True,
                "showLastSeen": True,
                "allowMessages": "everyone",
                "allowComments": "everyone",
                "allowMentions": True,
                "hideFromSearch": False,
            },
            "security": {
                "twoFactorEnabled": False,
                "loginAlerts": True,
            },
            "notifications": {
                "pushEnabled": True,
                "emailEnabled": True,
                "messages": True,
                "likes": True,
                "comments": True,
                "follows": True,
                "mentions": True,
                "roomInvites": True,
                "liveNotifications": True,
                "matchReminders": True,
                "soundEnabled": True,
                "vibrationEnabled": True,
            },
            "display": {
                "darkMode": True,
                "autoPlayVideos": True,
                "dataServerMode": False,
                "fontSize": "medium",
            }
        }
        return default_settings
    
    return {
        "privacy": settings.get("privacy", {}),
        "security": settings.get("security", {}),
        "notifications": settings.get("notifications", {}),
        "display": settings.get("display", {})
    }

@api_router.put("/users/settings")
async def update_user_settings(
    settings_data: UserSettings,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update user settings"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    update_data = {"user_id": user_id, "updated_at": datetime.now(timezone.utc)}
    
    if settings_data.privacy:
        update_data["privacy"] = settings_data.privacy
    if settings_data.security:
        update_data["security"] = settings_data.security
    if settings_data.notifications:
        update_data["notifications"] = settings_data.notifications
    if settings_data.display:
        update_data["display"] = settings_data.display
    
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True, "message": "Settings updated"}

@api_router.get("/users/blocked")
async def get_blocked_users(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get list of blocked users"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    blocked_ids = user.get("blocked", []) if user else []
    
    blocked_users = []
    for blocked_id in blocked_ids:
        blocked_user = await db.users.find_one({"id": blocked_id})
        if blocked_user:
            blocked_users.append({
                "id": blocked_user["id"],
                "username": blocked_user["username"],
                "name": blocked_user.get("name", blocked_user["username"]),
                "avatar": blocked_user.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={blocked_user['username']}")
            })
    
    return {"blocked": blocked_users}

@api_router.post("/users/{target_user_id}/block")
async def block_user(
    target_user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Block a user"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Add to blocked list
    await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"blocked": target_user_id}}
    )
    
    # Remove from followers/following
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"followers": target_user_id, "following": target_user_id}}
    )
    await db.users.update_one(
        {"id": target_user_id},
        {"$pull": {"followers": user_id, "following": user_id}}
    )
    
    return {"success": True, "message": "User blocked"}

@api_router.delete("/users/{target_user_id}/block")
async def unblock_user(
    target_user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Unblock a user"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.users.update_one(
        {"id": user_id},
        {"$pull": {"blocked": target_user_id}}
    )
    
    return {"success": True, "message": "User unblocked"}

# ==================== DIRECT MESSAGES ====================

class MessageSend(BaseModel):
    content: str

# ==================== CONVERSATIONS (moved to routes/conversations.py) ====================
# Note: mark_messages_read stays here because it uses ws_manager

@api_router.post("/conversations/{conversation_id}/read")
async def mark_messages_read(
    conversation_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark all messages in conversation as read"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is participant
    convo = await db.conversations.find_one({"id": conversation_id})
    if not convo or user_id not in convo.get("participants", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Mark messages as read
    result = await db.direct_messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": user_id}, "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify the other participant via WebSocket
    for p_id in convo.get("participants", []):
        if p_id != user_id:
            await ws_manager.send_personal_message({
                "type": "messages_read",
                "conversation_id": conversation_id,
                "read_by": user_id
            }, p_id)
    
    return {"marked_read": result.modified_count}

# ==================== NOTIFICATIONS (moved to routes/notifications.py) ====================

# ==================== STORIES (moved to routes/stories.py) ====================

# Helper function to create notification
async def create_notification(user_id: str, notif_type: str, from_user_id: str, thread_id: str = None, message: str = None):
    """Create a notification and send via WebSocket + Push if user is online"""
    from_user = await db.users.find_one({"id": from_user_id})
    if not from_user:
        return
    
    notif_id = str(int(time.time() * 1000))
    notification = {
        "id": notif_id,
        "user_id": user_id,
        "type": notif_type,
        "from_user": {
            "id": from_user["id"],
            "username": from_user["username"],
            "name": from_user.get("name", from_user["username"]),
            "avatar": from_user.get("avatar")
        },
        "thread_id": thread_id,
        "message": message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    
    # Send via WebSocket if user is online
    await ws_manager.send_personal_message({
        "type": "notification",
        "notification": {
            "id": notif_id,
            "type": notif_type,
            "from_user": notification["from_user"],
            "thread_id": thread_id,
            "message": message,
            "created_at": notification["created_at"]
        }
    }, user_id)
    
    # Send Push Notification
    try:
        from routes.push import send_push_notification
        
        from_name = from_user.get("name", from_user["username"])
        
        # Build notification title and body based on type
        if notif_type == "reply":
            title = f"💬 رد جديد من {from_name}"
            body = message[:80] if message else "رد على منشورك"
            url = f"/threads/{thread_id}" if thread_id else "/"
        elif notif_type == "mention":
            title = f"📢 {from_name} أشار إليك"
            body = message[:80] if message else "تمت الإشارة إليك في منشور"
            url = f"/threads/{thread_id}" if thread_id else "/"
        elif notif_type == "like":
            title = f"❤️ {from_name} أعجب بمنشورك"
            body = message[:80] if message else "أعجب بمنشورك"
            url = f"/threads/{thread_id}" if thread_id else "/"
        elif notif_type == "follow":
            title = f"👤 متابع جديد"
            body = f"{from_name} بدأ متابعتك"
            url = f"/profile/{from_user['id']}"
        elif notif_type == "message":
            title = f"✉️ رسالة من {from_name}"
            body = message[:80] if message else "رسالة جديدة"
            url = "/messages"
        else:
            title = "🔔 إشعار جديد"
            body = message[:80] if message else "لديك إشعار جديد"
            url = "/"
        
        # Fire and forget - don't await to avoid blocking
        import asyncio
        asyncio.create_task(send_push_notification(user_id, title, body, url))
        
    except Exception as e:
        print(f"Push notification trigger error: {e}")

# Mount static files for avatars
app.mount("/api/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time messaging"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        await websocket.close(code=4001)
        return
    
    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                conversation_id = data.get("conversation_id")
                content = data.get("content", "").strip()
                
                if not content or not conversation_id:
                    continue
                
                # Get conversation to find recipient
                conversation = await db.conversations.find_one({"id": conversation_id})
                if not conversation:
                    continue
                
                # Find the other participant
                other_user_id = None
                for p_id in conversation.get("participants", []):
                    if p_id != user_id:
                        other_user_id = p_id
                        break
                
                # Save message to database
                message_id = str(int(time.time() * 1000))
                new_message = {
                    "id": message_id,
                    "conversation_id": conversation_id,
                    "sender_id": user_id,
                    "content": content,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "read": False
                }
                await db.messages.insert_one(new_message)
                
                # Update conversation
                await db.conversations.update_one(
                    {"id": conversation_id},
                    {"$set": {
                        "last_message": content,
                        "last_message_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Get sender info
                sender = await db.users.find_one({"id": user_id})
                
                # Prepare message for broadcast
                message_data = {
                    "type": "new_message",
                    "message": {
                        "id": message_id,
                        "conversation_id": conversation_id,
                        "sender_id": user_id,
                        "sender": {
                            "id": sender["id"],
                            "username": sender["username"],
                            "name": sender.get("name", sender["username"]),
                            "avatar": sender.get("avatar")
                        } if sender else None,
                        "content": content,
                        "created_at": new_message["created_at"]
                    }
                }
                
                # Send to both sender and recipient
                await ws_manager.send_personal_message(message_data, user_id)
                if other_user_id:
                    await ws_manager.send_personal_message(message_data, other_user_id)
            
            elif data.get("type") == "typing":
                conversation_id = data.get("conversation_id")
                conversation = await db.conversations.find_one({"id": conversation_id})
                if conversation:
                    for p_id in conversation.get("participants", []):
                        if p_id != user_id:
                            await ws_manager.send_personal_message({
                                "type": "typing",
                                "conversation_id": conversation_id,
                                "user_id": user_id
                            }, p_id)
            
            # Room WebSocket events
            elif data.get("type") == "join_room":
                room_id = data.get("room_id")
                if room_id:
                    ws_manager.join_room(room_id, user_id)
                    await ws_manager.send_personal_message({"type": "room_joined", "room_id": room_id}, user_id)
            
            elif data.get("type") == "leave_room":
                room_id = data.get("room_id")
                if room_id:
                    ws_manager.leave_room(room_id, user_id)
            
            elif data.get("type") == "room_message":
                room_id = data.get("room_id")
                content = data.get("content", "").strip()
                
                # Reply info
                reply_to_id = data.get("reply_to_id")
                reply_to_username = data.get("reply_to_username")
                reply_to_content = data.get("reply_to_content")
                
                if not content or not room_id:
                    continue
                
                # Verify room exists
                room = await db.rooms.find_one({"id": room_id})
                if not room:
                    continue
                
                # Get sender info
                sender = await db.users.find_one({"id": user_id})
                if not sender:
                    continue
                
                # Save message to room_messages collection
                message_id = str(int(time.time() * 1000))
                new_message = {
                    "id": message_id,
                    "room_id": room_id,
                    "user_id": user_id,
                    "username": sender.get("username"),
                    "avatar": sender.get("avatar") or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}",
                    "content": content,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Add reply info if present
                if reply_to_id:
                    new_message["reply_to_id"] = reply_to_id
                    new_message["reply_to_username"] = reply_to_username
                    new_message["reply_to_content"] = reply_to_content
                
                await db.room_messages.insert_one(new_message)
                
                # Award XP for sending message
                try:
                    await db.users.update_one(
                        {"id": user_id},
                        {"$inc": {"xp": 2}}  # +2 XP per message
                    )
                except Exception as xp_err:
                    logger.error(f"Failed to award XP: {xp_err}")
                
                # Prepare broadcast message
                broadcast_data = {
                    "type": "room_message",
                    "room_id": room_id,
                    "message": {
                        "id": message_id,
                        "user_id": user_id,
                        "username": sender.get("username"),
                        "avatar": sender.get("avatar") or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}",
                        "content": content,
                        "created_at": new_message["created_at"],
                        "reply_to_id": reply_to_id,
                        "reply_to_username": reply_to_username,
                        "reply_to_content": reply_to_content
                    }
                }
                
                # Broadcast to all users in the room
                await ws_manager.broadcast_to_room(broadcast_data, room_id)
                            
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(user_id)


# Football routes moved to routes/football.py

# Include modular routers
from routes.football import router as football_router
from routes.notifications import router as notifications_router
from routes.stories import router as stories_router
from routes.conversations import router as conversations_router
from routes.push import router as push_router
from routes.news import router as news_router
from routes.announcements import router as announcements_router, init_router as init_announcements
from routes.badges import get_badges_router
from routes.payments import get_payments_router

# Initialize announcements router with db and auth
init_announcements(db, get_current_user)

# Initialize badges router
badges_router = get_badges_router(db, get_current_user)

# Initialize payments router
payments_router = get_payments_router(db, get_current_user)

api_router.include_router(football_router)
api_router.include_router(notifications_router)
api_router.include_router(stories_router)
api_router.include_router(conversations_router)
api_router.include_router(push_router)
api_router.include_router(news_router)
api_router.include_router(announcements_router)
api_router.include_router(badges_router)
api_router.include_router(payments_router)

# Include the API router - must be at the end after all routes are defined
app.include_router(api_router)

