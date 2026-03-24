from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def broadcast_to_users(self, message: dict, user_ids: List[str]):
        for user_id in user_ids:
            if user_id in self.active_connections:
                await self.active_connections[user_id].send_json(message)

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

# Role hierarchy: owner > admin > mod > user
# owner: all permissions (create/close rooms, promote users)
# admin: kick, mute, invite to stage, approve mic requests
# mod: approve mic requests, can go on stage without request
ROLE_HIERARCHY = ["user", "mod", "admin", "owner"]

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
    content: str
    timestamp: str

class MessageCreate(BaseModel):
    content: str

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
    chat_background: Optional[str] = None  # Chat background image URL

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
    if current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
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

@api_router.get("/rooms", response_model=List[RoomFull])
async def get_rooms(category: Optional[str] = None):
    query = {}
    if category and category != "الكل":
        query["category"] = category
    
    rooms = await db.rooms.find(query, {"_id": 0}).to_list(100)
    
    if not rooms:
        return []
    
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
    
    # Add counts to each room
    for room in rooms:
        room["participant_count"] = counts_map.get(room["id"], 0)
        # Member count includes the owner (+1)
        room["member_count"] = member_counts_map.get(room["id"], 0) + 1
    
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
    """Get list of room members"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    members = await db.room_members.find({"room_id": room_id}, {"_id": 0}).to_list(1000)
    
    # Add room owner to the list
    owner = await db.users.find_one({"id": room["owner_id"]}, {"_id": 0, "password": 0})
    if owner:
        owner_member = {
            "room_id": room_id,
            "user_id": owner["id"],
            "username": owner["username"],
            "avatar": owner.get("avatar"),
            "role": "owner"
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
    
    return {"message": "دخلت الغرفة بنجاح"}

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
    
    if not can_manage_stage(current_user.role, current_user.id, room.get("owner_id")):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
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
    
    if not can_manage_stage(current_user.role, current_user.id, room.get("owner_id")):
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
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if not can_kick_mute(current_user.role, current_user.id, room.get("owner_id")):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    result = await db.room_participants.delete_one({
        "room_id": room_id,
        "user_id": user_id
    })
    
    if result.deleted_count > 0:
        return {"message": "تم طرد العضو من الغرفة"}
    raise HTTPException(status_code=404, detail="العضو غير موجود في الغرفة")

@api_router.post("/rooms/{room_id}/mute/{user_id}")
async def mute_user(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if not can_kick_mute(current_user.role, current_user.id, room.get("owner_id")):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
    result = await db.room_participants.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"is_muted": True, "can_speak": False}}
    )
    
    if result.modified_count > 0:
        return {"message": "تم كتم العضو"}
    raise HTTPException(status_code=404, detail="العضو غير موجود")

@api_router.post("/rooms/{room_id}/unmute/{user_id}")
async def unmute_user(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if not can_kick_mute(current_user.role, current_user.id, room.get("owner_id")):
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
    """Remove a user from stage (Room Owner or Admin only)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    if not can_kick_mute(current_user.role, current_user.id, room.get("owner_id")):
        raise HTTPException(status_code=403, detail="صلاحيات غير كافية")
    
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
    
    if promote_data.role not in ["user", "mod", "admin"]:
        raise HTTPException(status_code=400, detail="صلاحية غير صحيحة. الخيارات: user, mod, admin")
    
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
        role_names = {"user": "مستخدم", "mod": "مود", "admin": "أدمن"}
        return {"message": f"تمت ترقية {target_user['username']} إلى {role_names.get(promote_data.role, promote_data.role)}"}
    
    return {"message": "لم يتم التغيير - الصلاحية نفسها"}


# ==================== ROOM-SPECIFIC ROLES ====================
# رتب خاصة بكل غرفة (owner, admin, mod, member)

class RoomRoleUpdate(BaseModel):
    role: str  # admin, mod, member

@api_router.get("/rooms/{room_id}/user-role/{user_id}")
async def get_user_room_role(room_id: str, user_id: str):
    """Get user's role in a specific room"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check if user is owner
    if room.get("owner_id") == user_id:
        return {"role": "owner", "can_join_stage_direct": True}
    
    # Check room_roles collection
    room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": user_id
    }, {"_id": 0})
    
    if room_role:
        role = room_role.get("role", "member")
        can_join_direct = role in ["admin", "mod"]
        return {"role": role, "can_join_stage_direct": can_join_direct}
    
    return {"role": "member", "can_join_stage_direct": False}

@api_router.put("/rooms/{room_id}/user-role/{user_id}")
async def update_user_room_role(room_id: str, user_id: str, data: RoomRoleUpdate, current_user: User = Depends(get_current_user)):
    """Update user's role in a room (Owner/Admin only)"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    # Check permissions - only room owner or admin can change roles
    is_room_owner = room.get("owner_id") == current_user.id
    
    # Get current user's room role
    current_user_room_role = await db.room_roles.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    is_room_admin = current_user_room_role and current_user_room_role.get("role") == "admin"
    
    if not is_room_owner and not is_room_admin and current_user.role != "owner":
        raise HTTPException(status_code=403, detail="فقط مالك الغرفة أو الأدمن يمكنه تغيير الرتب")
    
    # Validate role
    if data.role not in ["admin", "mod", "member"]:
        raise HTTPException(status_code=400, detail="رتبة غير صحيحة. الخيارات: admin, mod, member")
    
    # Admin can only promote to mod (not admin)
    if is_room_admin and not is_room_owner and data.role == "admin":
        raise HTTPException(status_code=403, detail="فقط مالك الغرفة يمكنه ترقية لأدمن")
    
    # Cannot change owner's role
    if room.get("owner_id") == user_id:
        raise HTTPException(status_code=403, detail="لا يمكن تغيير رتبة مالك الغرفة")
    
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
    
    role_names = {"admin": "أدمن", "mod": "مود", "member": "عضو"}
    
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
    """Get all users with special roles in a room"""
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    roles = await db.room_roles.find({"room_id": room_id}, {"_id": 0}).to_list(100)
    
    # Add owner info
    owner_info = {
        "user_id": room.get("owner_id"),
        "role": "owner",
        "is_owner": True
    }
    
    # Get user details for each role
    for role_entry in roles:
        user = await db.users.find_one({"id": role_entry.get("user_id")}, {"_id": 0, "username": 1, "avatar": 1, "name": 1})
        if user:
            role_entry["username"] = user.get("username")
            role_entry["avatar"] = user.get("avatar")
            role_entry["name"] = user.get("name")
    
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
    """Allow mod/admin/owner to join stage directly without request"""
    if current_user.role not in ["mod", "admin", "owner"]:
        raise HTTPException(status_code=403, detail="صلاحيات Mod/Admin/Owner مطلوبة للصعود المباشر")
    
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
    
    await db.messages.insert_one(message_doc)
    return Message(**message_doc)

@api_router.get("/rooms/{room_id}/messages", response_model=List[Message])
async def get_room_messages(room_id: str, limit: int = 50):
    messages = await db.messages.find(
        {"room_id": room_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    messages.reverse()
    return [Message(**m) for m in messages]


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

@api_router.delete("/admin/rooms/{room_id}", dependencies=[Depends(get_admin_user)])
async def delete_room(room_id: str):
    for i, room in enumerate(ROOMS):
        if room["id"] == room_id:
            ROOMS.pop(i)
            await db.room_participants.delete_many({"room_id": room_id})
            await db.messages.delete_many({"room_id": room_id})
            return {"message": "تم حذف الغرفة بنجاح"}
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
    if role_data.role not in ["user", "mod", "admin"]:
        raise HTTPException(status_code=400, detail="صلاحية غير صحيحة. الخيارات: user, mod, admin")
    
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
        role_names = {"user": "مستخدم", "mod": "مود", "admin": "أدمن"}
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
    
    return {"message": "Thread created", "thread_id": thread_id}

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

@api_router.get("/conversations")
async def get_conversations(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all conversations for current user"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
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

@api_router.post("/conversations/{other_user_id}")
async def create_or_get_conversation(
    other_user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create or get existing conversation with another user"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
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

@api_router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get messages in a conversation"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
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

@api_router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    message_data: MessageSend,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send a message in a conversation"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
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

@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete/clear a conversation and all its messages"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Verify user is participant
    convo = await db.conversations.find_one({"id": conversation_id})
    if not convo or user_id not in convo.get("participants", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete all messages in the conversation
    messages_result = await db.direct_messages.delete_many({"conversation_id": conversation_id})
    
    # Delete the conversation itself
    await db.conversations.delete_one({"id": conversation_id})
    
    return {"deleted": True, "messages_deleted": messages_result.deleted_count}

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user notifications"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    notifications_cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(50)
    notifications = await notifications_cursor.to_list(length=50)
    
    result = []
    for notif in notifications:
        result.append({
            "id": notif["id"],
            "type": notif["type"],
            "message": notif.get("message", ""),
            "from_user": notif.get("from_user"),
            "thread_id": notif.get("thread_id"),
            "read": notif.get("read", False),
            "created_at": notif["created_at"]
        })
    
    # Get unread count
    unread_count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    
    return {"notifications": result, "unread_count": unread_count}

@api_router.post("/notifications/read")
async def mark_notifications_read(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark all notifications as read"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return {"message": "Notifications marked as read"}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark single notification as read"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user_id},
        {"$set": {"read": True}}
    )
    
    return {"message": "Notification marked as read"}

# ==================== STORIES ====================

@api_router.get("/stories")
async def get_stories(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get stories from users the current user follows + own stories"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    current_user = await db.users.find_one({"id": user_id})
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get following list + self
    following_ids = current_user.get("following", [])
    user_ids = [user_id] + following_ids
    
    # Stories expire after 24 hours
    cutoff_time = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    # Get all active stories
    stories_cursor = db.stories.find({
        "author_id": {"$in": user_ids},
        "created_at": {"$gt": cutoff_time}
    }).sort("created_at", -1)
    stories = await stories_cursor.to_list(length=500)
    
    # Get viewed stories by current user
    viewed_cursor = db.story_views.find({"user_id": user_id})
    viewed = await viewed_cursor.to_list(length=1000)
    viewed_story_ids = {v["story_id"] for v in viewed}
    
    # Group stories by user
    users_stories = {}
    for story in stories:
        author_id = story["author_id"]
        if author_id not in users_stories:
            author = await db.users.find_one({"id": author_id})
            if author:
                users_stories[author_id] = {
                    "user": {
                        "id": author["id"],
                        "username": author["username"],
                        "name": author.get("name", author["username"]),
                        "avatar": author.get("avatar", f"https://api.dicebear.com/7.x/avataaars/svg?seed={author['username']}")
                    },
                    "stories": [],
                    "has_unviewed": False,
                    "is_own": author_id == user_id
                }
        
        if author_id in users_stories:
            story_data = {
                "id": story["id"],
                "media_url": story["media_url"],
                "media_type": story.get("media_type", "image"),
                "caption": story.get("caption", ""),
                "created_at": story["created_at"],
                "views_count": story.get("views_count", 0),
                "viewed": story["id"] in viewed_story_ids
            }
            users_stories[author_id]["stories"].append(story_data)
            if not story_data["viewed"]:
                users_stories[author_id]["has_unviewed"] = True
    
    # Sort: own stories first, then unviewed, then viewed
    result = list(users_stories.values())
    result.sort(key=lambda x: (not x["is_own"], not x["has_unviewed"]))
    
    return {"stories": result}

@api_router.post("/stories")
async def create_story(
    media_url: str = Form(...),
    media_type: str = Form("image"),
    caption: str = Form(""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new story"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    story_id = str(int(time.time() * 1000))
    new_story = {
        "id": story_id,
        "author_id": user_id,
        "media_url": media_url,
        "media_type": media_type,
        "caption": caption.strip()[:200] if caption else "",
        "views_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stories.insert_one(new_story)
    
    # Add XP for creating story
    await db.users.update_one({"id": user_id}, {"$inc": {"xp": 3}})
    
    return {"message": "Story created", "story_id": story_id}

@api_router.post("/stories/{story_id}/view")
async def view_story(
    story_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark a story as viewed"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Don't count self views
    if story["author_id"] == user_id:
        return {"message": "Own story"}
    
    # Check if already viewed
    existing_view = await db.story_views.find_one({"story_id": story_id, "user_id": user_id})
    if existing_view:
        return {"message": "Already viewed"}
    
    # Add view
    await db.story_views.insert_one({
        "story_id": story_id,
        "user_id": user_id,
        "viewed_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Increment view count
    await db.stories.update_one({"id": story_id}, {"$inc": {"views_count": 1}})
    
    return {"message": "Story viewed"}

@api_router.delete("/stories/{story_id}")
async def delete_story(
    story_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a story"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.stories.delete_one({"id": story_id})
    await db.story_views.delete_many({"story_id": story_id})
    
    return {"message": "Story deleted"}

@api_router.get("/stories/{story_id}/viewers")
async def get_story_viewers(
    story_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get list of users who viewed a story (only for story owner)"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    views_cursor = db.story_views.find({"story_id": story_id}).sort("viewed_at", -1)
    views = await views_cursor.to_list(length=100)
    
    viewers = []
    for view in views:
        viewer = await db.users.find_one({"id": view["user_id"]})
        if viewer:
            viewers.append({
                "id": viewer["id"],
                "username": viewer["username"],
                "name": viewer.get("name", viewer["username"]),
                "avatar": viewer.get("avatar"),
                "viewed_at": view["viewed_at"]
            })
    
    return {"viewers": viewers, "total": len(viewers)}


# Story Reactions
@api_router.post("/stories/{story_id}/react")
async def react_to_story(
    story_id: str,
    reaction: str = Form(...),  # emoji reaction
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """React to a story (emoji)"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create reaction
    reaction_doc = {
        "id": str(int(time.time() * 1000)),
        "story_id": story_id,
        "user_id": user_id,
        "reaction": reaction,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.story_reactions.insert_one(reaction_doc)
    
    # Notify story owner
    if story["author_id"] != user_id:
        notification = {
            "id": str(int(time.time() * 1000) + 1),
            "user_id": story["author_id"],
            "type": "story_reaction",
            "title": "تفاعل على قصتك",
            "message": f"{user['username']} تفاعل على قصتك {reaction}",
            "data": {
                "story_id": story_id,
                "reactor_id": user_id,
                "reactor_username": user["username"],
                "reactor_avatar": user.get("avatar"),
                "reaction": reaction
            },
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {"message": "Reaction added", "reaction_id": reaction_doc["id"]}


@api_router.post("/stories/{story_id}/reply")
async def reply_to_story(
    story_id: str,
    content: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reply to a story (private message)"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create reply as a story reply (not direct message)
    reply_doc = {
        "id": str(int(time.time() * 1000)),
        "story_id": story_id,
        "user_id": user_id,
        "content": content.strip()[:500],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.story_replies.insert_one(reply_doc)
    
    # Update story replies count
    await db.stories.update_one({"id": story_id}, {"$inc": {"replies_count": 1}})
    
    # Notify story owner
    if story["author_id"] != user_id:
        notification = {
            "id": str(int(time.time() * 1000) + 1),
            "user_id": story["author_id"],
            "type": "story_reply",
            "title": "رد على قصتك",
            "message": f"{user['username']}: {content[:50]}...",
            "data": {
                "story_id": story_id,
                "reply_id": reply_doc["id"],
                "replier_id": user_id,
                "replier_username": user["username"],
                "replier_avatar": user.get("avatar"),
                "content": content[:100]
            },
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {"message": "Reply sent", "reply_id": reply_doc["id"]}


@api_router.get("/stories/{story_id}/replies")
async def get_story_replies(
    story_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get replies for a story (only story owner can see)"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Only story owner can see replies
    if story["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    replies_cursor = db.story_replies.find({"story_id": story_id}).sort("created_at", -1)
    replies = await replies_cursor.to_list(length=100)
    
    result = []
    for reply in replies:
        replier = await db.users.find_one({"id": reply["user_id"]}, {"_id": 0, "password": 0})
        if replier:
            result.append({
                "id": reply["id"],
                "content": reply["content"],
                "user": {
                    "id": replier["id"],
                    "username": replier["username"],
                    "name": replier.get("name", replier["username"]),
                    "avatar": replier.get("avatar")
                },
                "created_at": reply["created_at"]
            })
    
    return {"replies": result, "total": len(result)}


@api_router.get("/stories/{story_id}/reactions")
async def get_story_reactions(
    story_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get reactions for a story"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Only story owner can see detailed reactions
    if story["author_id"] != user_id:
        # For non-owners, just return count
        count = await db.story_reactions.count_documents({"story_id": story_id})
        return {"total": count, "reactions": []}
    
    reactions_cursor = db.story_reactions.find({"story_id": story_id}).sort("created_at", -1)
    reactions = await reactions_cursor.to_list(length=100)
    
    result = []
    for react in reactions:
        reactor = await db.users.find_one({"id": react["user_id"]}, {"_id": 0, "password": 0})
        if reactor:
            result.append({
                "id": react["id"],
                "reaction": react["reaction"],
                "user": {
                    "id": reactor["id"],
                    "username": reactor["username"],
                    "name": reactor.get("name", reactor["username"]),
                    "avatar": reactor.get("avatar")
                },
                "created_at": react["created_at"]
            })
    
    return {"reactions": result, "total": len(result)}


# Helper function to create notification
async def create_notification(user_id: str, notif_type: str, from_user_id: str, thread_id: str = None, message: str = None):
    """Create a notification and send via WebSocket if user is online"""
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
                            
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(user_id)


# Football routes moved to routes/football.py

# Include modular routers
from routes.football import router as football_router
api_router.include_router(football_router)

# Include the API router - must be at the end after all routes are defined
app.include_router(api_router)

