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

class RoomCreate(BaseModel):
    title: str
    description: str
    category: str
    image: str

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
    
    # Get user with bio and name
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "name": user_doc.get("name", ""),
        "avatar": current_user.avatar,
        "bio": user_doc.get("bio", ""),
        "role": current_user.role,
        "coins": current_user.coins,
        "level": current_user.level,
        "xp": current_user.xp,
        "followers_count": followers_count,
        "following_count": following_count
    }

class ProfileUpdate(BaseModel):
    name: Optional[str] = None  # Display name
    username: Optional[str] = None  # Handle/account
    bio: Optional[str] = None
    avatar: Optional[str] = None

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
        "owner_id": current_user.id,
        "owner_name": current_user.username,
        "owner_avatar": current_user.avatar,
        "is_live": True,
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

@api_router.post("/rooms/{room_id}/seat/invite/{user_id}")
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
    return {"message": "غادرت الغرفة"}

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
            embed_url = f"https://www.youtube-nocookie.com/embed/live_stream?channel={channel_id}&autoplay=1&mute=1&modestbranding=1&rel=0&vq=hd1080&playsinline=1"
    
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
            embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}?autoplay=1&mute=1&modestbranding=1&rel=0&vq=hd1080&playsinline=1"
    
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
            embed_url = f"https://www.youtube-nocookie.com/embed/live_stream?channel={channel_id}&autoplay=1&mute=1&modestbranding=1&rel=0&vq=hd1080&playsinline=1"
    
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
            embed_url = f"https://www.youtube-nocookie.com/embed/{video_id}?autoplay=1&mute=1&modestbranding=1&rel=0&vq=hd1080&playsinline=1"
    
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


# ==================== MATCHES & FOOTBALL API ====================

# API Football configuration
API_FOOTBALL_KEY = os.environ.get('API_FOOTBALL_KEY', '')
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"

# Football leagues data
FOOTBALL_LEAGUES = [
    {"id": 307, "name": "دوري روشن السعودي", "country": "Saudi Arabia", "logo": "https://media.api-sports.io/football/leagues/307.png", "flag": "🇸🇦"},
    {"id": 39, "name": "الدوري الإنجليزي", "country": "England", "logo": "https://media.api-sports.io/football/leagues/39.png", "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
    {"id": 140, "name": "الدوري الإسباني", "country": "Spain", "logo": "https://media.api-sports.io/football/leagues/140.png", "flag": "🇪🇸"},
    {"id": 135, "name": "الدوري الإيطالي", "country": "Italy", "logo": "https://media.api-sports.io/football/leagues/135.png", "flag": "🇮🇹"},
    {"id": 78, "name": "الدوري الألماني", "country": "Germany", "logo": "https://media.api-sports.io/football/leagues/78.png", "flag": "🇩🇪"},
    {"id": 61, "name": "الدوري الفرنسي", "country": "France", "logo": "https://media.api-sports.io/football/leagues/61.png", "flag": "🇫🇷"},
    {"id": 2, "name": "دوري أبطال أوروبا", "country": "Europe", "logo": "https://media.api-sports.io/football/leagues/2.png", "flag": "🇪🇺"},
]

LEAGUE_NAME_MAP = {league["id"]: league for league in FOOTBALL_LEAGUES}

async def fetch_from_api_football(endpoint: str, params: dict = None):
    """Fetch data from API-Football"""
    if not API_FOOTBALL_KEY:
        return None
    
    headers = {"x-apisports-key": API_FOOTBALL_KEY}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_FOOTBALL_BASE_URL}/{endpoint}",
                params=params,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", [])
        except Exception as e:
            logger.error(f"API Football error: {e}")
            return None

def format_match(fixture: dict) -> dict:
    """Format API response to our match format"""
    league_id = fixture.get("league", {}).get("id")
    league_info = LEAGUE_NAME_MAP.get(league_id, {
        "id": league_id,
        "name": fixture.get("league", {}).get("name", ""),
        "logo": fixture.get("league", {}).get("logo", ""),
        "flag": fixture.get("league", {}).get("flag", "")
    })
    
    status_map = {
        "NS": "SCHEDULED",
        "1H": "LIVE",
        "HT": "LIVE",
        "2H": "LIVE",
        "ET": "LIVE",
        "P": "LIVE",
        "FT": "FINISHED",
        "AET": "FINISHED",
        "PEN": "FINISHED",
        "PST": "POSTPONED",
        "CANC": "CANCELLED",
        "ABD": "ABANDONED",
        "TBD": "SCHEDULED",
    }
    
    raw_status = fixture.get("fixture", {}).get("status", {}).get("short", "NS")
    
    return {
        "id": str(fixture.get("fixture", {}).get("id", "")),
        "league": league_info,
        "home_team": {
            "name": fixture.get("teams", {}).get("home", {}).get("name", ""),
            "logo": fixture.get("teams", {}).get("home", {}).get("logo", ""),
            "score": fixture.get("goals", {}).get("home")
        },
        "away_team": {
            "name": fixture.get("teams", {}).get("away", {}).get("name", ""),
            "logo": fixture.get("teams", {}).get("away", {}).get("logo", ""),
            "score": fixture.get("goals", {}).get("away")
        },
        "status": status_map.get(raw_status, "SCHEDULED"),
        "minute": fixture.get("fixture", {}).get("status", {}).get("elapsed"),
        "date": fixture.get("fixture", {}).get("date", ""),
        "venue": fixture.get("fixture", {}).get("venue", {}).get("name", "")
    }

# Sample realistic match data (fallback when API is not available)
def get_sample_matches():
    now = datetime.now(timezone.utc)
    return [
        # Live matches
        {
            "id": "match_1",
            "league": FOOTBALL_LEAGUES[0],
            "home_team": {"name": "الهلال", "logo": "https://media.api-sports.io/football/teams/2932.png", "score": 2},
            "away_team": {"name": "النصر", "logo": "https://media.api-sports.io/football/teams/2939.png", "score": 1},
            "status": "LIVE",
            "minute": 67,
            "date": now.isoformat(),
            "venue": "استاد الملك فهد الدولي"
        },
        {
            "id": "match_2",
            "league": FOOTBALL_LEAGUES[1],
            "home_team": {"name": "مانشستر سيتي", "logo": "https://media.api-sports.io/football/teams/50.png", "score": 3},
            "away_team": {"name": "ليفربول", "logo": "https://media.api-sports.io/football/teams/40.png", "score": 2},
            "status": "LIVE",
            "minute": 82,
            "date": now.isoformat(),
            "venue": "الاتحاد"
        },
        {
            "id": "match_3",
            "league": FOOTBALL_LEAGUES[2],
            "home_team": {"name": "ريال مدريد", "logo": "https://media.api-sports.io/football/teams/541.png", "score": 1},
            "away_team": {"name": "برشلونة", "logo": "https://media.api-sports.io/football/teams/529.png", "score": 1},
            "status": "LIVE",
            "minute": 45,
            "date": now.isoformat(),
            "venue": "سانتياغو برنابيو"
        },
        # Upcoming matches
        {
            "id": "match_4",
            "league": FOOTBALL_LEAGUES[0],
            "home_team": {"name": "الاتحاد", "logo": "https://media.api-sports.io/football/teams/2944.png", "score": None},
            "away_team": {"name": "الأهلي", "logo": "https://media.api-sports.io/football/teams/2934.png", "score": None},
            "status": "SCHEDULED",
            "minute": None,
            "date": (now + timedelta(hours=3)).isoformat(),
            "venue": "استاد الجوهرة"
        },
        {
            "id": "match_5",
            "league": FOOTBALL_LEAGUES[1],
            "home_team": {"name": "أرسنال", "logo": "https://media.api-sports.io/football/teams/42.png", "score": None},
            "away_team": {"name": "تشيلسي", "logo": "https://media.api-sports.io/football/teams/49.png", "score": None},
            "status": "SCHEDULED",
            "minute": None,
            "date": (now + timedelta(hours=5)).isoformat(),
            "venue": "الإمارات"
        },
        {
            "id": "match_6",
            "league": FOOTBALL_LEAGUES[3],
            "home_team": {"name": "يوفنتوس", "logo": "https://media.api-sports.io/football/teams/496.png", "score": None},
            "away_team": {"name": "ميلان", "logo": "https://media.api-sports.io/football/teams/489.png", "score": None},
            "status": "SCHEDULED",
            "minute": None,
            "date": (now + timedelta(days=1)).isoformat(),
            "venue": "أليانز ستاديوم"
        },
        # Finished matches
        {
            "id": "match_7",
            "league": FOOTBALL_LEAGUES[0],
            "home_team": {"name": "الشباب", "logo": "https://media.api-sports.io/football/teams/2936.png", "score": 2},
            "away_team": {"name": "الفتح", "logo": "https://media.api-sports.io/football/teams/2946.png", "score": 0},
            "status": "FINISHED",
            "minute": 90,
            "date": (now - timedelta(hours=3)).isoformat(),
            "venue": "استاد الأمير فيصل"
        },
        {
            "id": "match_8",
            "league": FOOTBALL_LEAGUES[4],
            "home_team": {"name": "بايرن ميونخ", "logo": "https://media.api-sports.io/football/teams/157.png", "score": 4},
            "away_team": {"name": "دورتموند", "logo": "https://media.api-sports.io/football/teams/165.png", "score": 1},
            "status": "FINISHED",
            "minute": 90,
            "date": (now - timedelta(hours=5)).isoformat(),
            "venue": "أليانز أرينا"
        },
    ]

def get_sample_standings(league_id: int):
    standings = {
        307: [  # Saudi Pro League
            {"rank": 1, "team": "الهلال", "logo": "https://media.api-sports.io/football/teams/2932.png", "points": 45, "played": 18, "won": 14, "draw": 3, "lost": 1, "gf": 42, "ga": 12, "gd": 30},
            {"rank": 2, "team": "النصر", "logo": "https://media.api-sports.io/football/teams/2939.png", "points": 42, "played": 18, "won": 13, "draw": 3, "lost": 2, "gf": 48, "ga": 18, "gd": 30},
            {"rank": 3, "team": "الاتحاد", "logo": "https://media.api-sports.io/football/teams/2944.png", "points": 38, "played": 18, "won": 11, "draw": 5, "lost": 2, "gf": 35, "ga": 15, "gd": 20},
            {"rank": 4, "team": "الأهلي", "logo": "https://media.api-sports.io/football/teams/2934.png", "points": 35, "played": 18, "won": 10, "draw": 5, "lost": 3, "gf": 32, "ga": 18, "gd": 14},
            {"rank": 5, "team": "الشباب", "logo": "https://media.api-sports.io/football/teams/2936.png", "points": 30, "played": 18, "won": 9, "draw": 3, "lost": 6, "gf": 28, "ga": 22, "gd": 6},
        ],
        39: [  # Premier League
            {"rank": 1, "team": "ليفربول", "logo": "https://media.api-sports.io/football/teams/40.png", "points": 47, "played": 18, "won": 15, "draw": 2, "lost": 1, "gf": 45, "ga": 15, "gd": 30},
            {"rank": 2, "team": "أرسنال", "logo": "https://media.api-sports.io/football/teams/42.png", "points": 40, "played": 18, "won": 12, "draw": 4, "lost": 2, "gf": 38, "ga": 16, "gd": 22},
            {"rank": 3, "team": "مانشستر سيتي", "logo": "https://media.api-sports.io/football/teams/50.png", "points": 38, "played": 18, "won": 11, "draw": 5, "lost": 2, "gf": 42, "ga": 22, "gd": 20},
            {"rank": 4, "team": "تشيلسي", "logo": "https://media.api-sports.io/football/teams/49.png", "points": 35, "played": 18, "won": 10, "draw": 5, "lost": 3, "gf": 35, "ga": 20, "gd": 15},
            {"rank": 5, "team": "مانشستر يونايتد", "logo": "https://media.api-sports.io/football/teams/33.png", "points": 28, "played": 18, "won": 8, "draw": 4, "lost": 6, "gf": 28, "ga": 25, "gd": 3},
        ],
        140: [  # La Liga
            {"rank": 1, "team": "ريال مدريد", "logo": "https://media.api-sports.io/football/teams/541.png", "points": 43, "played": 18, "won": 13, "draw": 4, "lost": 1, "gf": 40, "ga": 14, "gd": 26},
            {"rank": 2, "team": "برشلونة", "logo": "https://media.api-sports.io/football/teams/529.png", "points": 41, "played": 18, "won": 13, "draw": 2, "lost": 3, "gf": 48, "ga": 20, "gd": 28},
            {"rank": 3, "team": "أتلتيكو مدريد", "logo": "https://media.api-sports.io/football/teams/530.png", "points": 38, "played": 18, "won": 11, "draw": 5, "lost": 2, "gf": 32, "ga": 12, "gd": 20},
        ],
    }
    return standings.get(league_id, [])

def get_sample_top_scorers(league_id: int):
    scorers = {
        307: [
            {"rank": 1, "player": "كريستيانو رونالدو", "team": "النصر", "logo": "https://media.api-sports.io/football/players/874.png", "goals": 18, "assists": 5},
            {"rank": 2, "player": "ألكسندر ميتروفيتش", "team": "الهلال", "logo": "https://media.api-sports.io/football/players/1100.png", "goals": 15, "assists": 3},
            {"rank": 3, "player": "مالكوم", "team": "الهلال", "logo": "https://media.api-sports.io/football/players/2295.png", "goals": 12, "assists": 8},
        ],
        39: [
            {"rank": 1, "player": "محمد صلاح", "team": "ليفربول", "logo": "https://media.api-sports.io/football/players/306.png", "goals": 17, "assists": 10},
            {"rank": 2, "player": "إيرلينج هالاند", "team": "مانشستر سيتي", "logo": "https://media.api-sports.io/football/players/1100.png", "goals": 16, "assists": 4},
            {"rank": 3, "player": "كول بالمر", "team": "تشيلسي", "logo": "https://media.api-sports.io/football/players/2295.png", "goals": 14, "assists": 6},
        ],
        140: [
            {"rank": 1, "player": "روبرت ليفاندوفسكي", "team": "برشلونة", "logo": "https://media.api-sports.io/football/players/521.png", "goals": 15, "assists": 4},
            {"rank": 2, "player": "كيليان مبابي", "team": "ريال مدريد", "logo": "https://media.api-sports.io/football/players/278.png", "goals": 13, "assists": 5},
            {"rank": 3, "player": "فينيسيوس جونيور", "team": "ريال مدريد", "logo": "https://media.api-sports.io/football/players/2295.png", "goals": 11, "assists": 8},
        ],
    }
    return scorers.get(league_id, [])

@api_router.get("/football/leagues")
async def get_football_leagues():
    """Get all available football leagues"""
    return {"leagues": FOOTBALL_LEAGUES}

@api_router.get("/football/fixtures/date/{date}")
async def get_fixtures_by_date(date: str):
    """Get all fixtures for a specific date (YYYY-MM-DD)"""
    all_fixtures = []
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        for league in FOOTBALL_LEAGUES:
            fixtures = await fetch_from_api_football("fixtures", {
                "league": league["id"],
                "date": date,
                "season": CURRENT_SEASON
            })
            
            if fixtures:
                for fixture in fixtures:
                    all_fixtures.append(format_match(fixture))
    
    # If no fixtures from API, return empty
    if not all_fixtures:
        # Fallback to sample data only for today
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if date == today:
            all_fixtures = get_sample_matches()
            all_fixtures = [m for m in all_fixtures if m["status"] in ["LIVE", "SCHEDULED"]]
    
    # Sort by time
    all_fixtures.sort(key=lambda x: x.get("date", ""))
    
    # Group by league
    grouped = {}
    for match in all_fixtures:
        league_name = match.get("league", {}).get("name", "Other")
        if league_name not in grouped:
            grouped[league_name] = []
        grouped[league_name].append(match)
    
    return {"fixtures": grouped, "total": len(all_fixtures), "date": date}

@api_router.get("/football/fixtures/upcoming")
async def get_upcoming_fixtures(days: int = 7):
    """Get all upcoming fixtures for the next X days"""
    all_fixtures = []
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        for league in FOOTBALL_LEAGUES:
            fixtures = await fetch_from_api_football("fixtures", {
                "league": league["id"],
                "next": 15,
                "season": CURRENT_SEASON
            })
            
            if fixtures:
                for fixture in fixtures:
                    all_fixtures.append(format_match(fixture))
    
    # Sort by date
    all_fixtures.sort(key=lambda x: x.get("date", ""))
    
    # Group by date
    grouped = {}
    for match in all_fixtures:
        date_str = match.get("date", "")[:10]  # Get YYYY-MM-DD
        if date_str not in grouped:
            grouped[date_str] = []
        grouped[date_str].append(match)
    
    return {"fixtures": grouped, "total": len(all_fixtures)}

@api_router.get("/football/fixtures/today")
async def get_today_fixtures():
    """Get all fixtures for today"""
    all_fixtures = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        for league in FOOTBALL_LEAGUES:
            fixtures = await fetch_from_api_football("fixtures", {
                "league": league["id"],
                "date": today,
                "season": CURRENT_SEASON
            })
            
            if fixtures:
                for fixture in fixtures:
                    all_fixtures.append(format_match(fixture))
    
    # Sort by time
    all_fixtures.sort(key=lambda x: x.get("date", ""))
    
    # Group by league
    grouped = {}
    for match in all_fixtures:
        league_name = match.get("league", {}).get("name", "Other")
        if league_name not in grouped:
            grouped[league_name] = []
        grouped[league_name].append(match)
    
    return {"fixtures": grouped, "total": len(all_fixtures), "date": today}

@api_router.get("/football/matches")
async def get_football_matches(league_id: Optional[int] = None, status: Optional[str] = None):
    """Get football matches with optional filtering - uses real API"""
    all_matches = []
    
    # Get today's date for fixtures
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Current season 2025-2026
    CURRENT_SEASON = 2025
    
    # Fetch from API for each league
    if API_FOOTBALL_KEY:
        leagues_to_fetch = [league_id] if league_id else [l["id"] for l in FOOTBALL_LEAGUES]
        
        for lid in leagues_to_fetch:
            # Fetch today's fixtures
            fixtures = await fetch_from_api_football("fixtures", {
                "league": lid,
                "date": today,
                "season": CURRENT_SEASON
            })
            
            if fixtures:
                for fixture in fixtures:
                    all_matches.append(format_match(fixture))
        
        # If no matches today, get upcoming matches
        if not all_matches:
            for lid in leagues_to_fetch:
                fixtures = await fetch_from_api_football("fixtures", {
                    "league": lid,
                    "next": 10,
                    "season": CURRENT_SEASON
                })
                
                if fixtures:
                    for fixture in fixtures:
                        all_matches.append(format_match(fixture))
    
    # Fallback to sample data if API fails or no key
    if not all_matches:
        all_matches = get_sample_matches()
        if league_id:
            all_matches = [m for m in all_matches if m["league"]["id"] == league_id]
    
    # Filter by status if specified
    if status:
        all_matches = [m for m in all_matches if m["status"] == status.upper()]
    
    return {"matches": all_matches}

@api_router.get("/football/live")
async def get_live_matches():
    """Get only live matches from real API"""
    if API_FOOTBALL_KEY:
        fixtures = await fetch_from_api_football("fixtures", {"live": "all"})
        
        if fixtures:
            # Filter only our supported leagues
            supported_league_ids = [l["id"] for l in FOOTBALL_LEAGUES]
            live_matches = [
                format_match(f) for f in fixtures 
                if f.get("league", {}).get("id") in supported_league_ids
            ]
            return {"matches": live_matches, "count": len(live_matches)}
    
    # Fallback to sample data
    matches = get_sample_matches()
    live = [m for m in matches if m["status"] == "LIVE"]
    return {"matches": live, "count": len(live)}

@api_router.get("/football/standings/{league_id}")
async def get_league_standings(league_id: int):
    """Get league standings/table from real API"""
    league = next((l for l in FOOTBALL_LEAGUES if l["id"] == league_id), None)
    
    # Current season 2025-2026
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        standings_data = await fetch_from_api_football("standings", {
            "league": league_id,
            "season": CURRENT_SEASON
        })
        
        if standings_data and len(standings_data) > 0:
            league_standings = standings_data[0].get("league", {}).get("standings", [[]])[0]
            
            formatted_standings = []
            for team in league_standings:
                formatted_standings.append({
                    "rank": team.get("rank"),
                    "team": team.get("team", {}).get("name", ""),
                    "logo": team.get("team", {}).get("logo", ""),
                    "points": team.get("points", 0),
                    "played": team.get("all", {}).get("played", 0),
                    "won": team.get("all", {}).get("win", 0),
                    "draw": team.get("all", {}).get("draw", 0),
                    "lost": team.get("all", {}).get("lose", 0),
                    "gf": team.get("all", {}).get("goals", {}).get("for", 0),
                    "ga": team.get("all", {}).get("goals", {}).get("against", 0),
                    "gd": team.get("goalsDiff", 0)
                })
            
            return {"league": league, "standings": formatted_standings}
    
    # Fallback to sample data
    standings = get_sample_standings(league_id)
    return {"league": league, "standings": standings}

@api_router.get("/football/scorers/{league_id}")
async def get_top_scorers(league_id: int):
    """Get top scorers for a league from real API"""
    league = next((l for l in FOOTBALL_LEAGUES if l["id"] == league_id), None)
    
    # Current season 2025-2026
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        scorers_data = await fetch_from_api_football("players/topscorers", {
            "league": league_id,
            "season": CURRENT_SEASON
        })
        
        if scorers_data:
            formatted_scorers = []
            for i, player in enumerate(scorers_data[:10], 1):
                stats = player.get("statistics", [{}])[0]
                formatted_scorers.append({
                    "rank": i,
                    "player": player.get("player", {}).get("name", ""),
                    "team": stats.get("team", {}).get("name", ""),
                    "logo": player.get("player", {}).get("photo", ""),
                    "goals": stats.get("goals", {}).get("total", 0) or 0,
                    "assists": stats.get("goals", {}).get("assists", 0) or 0
                })
            
            return {"league": league, "scorers": formatted_scorers}
    
    # Fallback to sample data
    scorers = get_sample_top_scorers(league_id)
    return {"league": league, "scorers": scorers}

@api_router.get("/football/assists/{league_id}")
async def get_top_assists(league_id: int):
    """Get top assist providers for a league from real API"""
    league = next((l for l in FOOTBALL_LEAGUES if l["id"] == league_id), None)
    
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        assists_data = await fetch_from_api_football("players/topassists", {
            "league": league_id,
            "season": CURRENT_SEASON
        })
        
        if assists_data:
            formatted_assists = []
            for i, player in enumerate(assists_data[:10], 1):
                stats = player.get("statistics", [{}])[0]
                formatted_assists.append({
                    "rank": i,
                    "player": player.get("player", {}).get("name", ""),
                    "team": stats.get("team", {}).get("name", ""),
                    "logo": player.get("player", {}).get("photo", ""),
                    "assists": stats.get("goals", {}).get("assists", 0) or 0,
                    "goals": stats.get("goals", {}).get("total", 0) or 0
                })
            
            return {"league": league, "assists": formatted_assists}
    
    # Fallback to sample data
    sample_assists = [
        {"rank": 1, "player": "كيفين دي بروين", "team": "مانشستر سيتي", "logo": "", "assists": 12, "goals": 5},
        {"rank": 2, "player": "برونو فيرنانديز", "team": "مانشستر يونايتد", "logo": "", "assists": 10, "goals": 8},
        {"rank": 3, "player": "محمد صلاح", "team": "ليفربول", "logo": "", "assists": 10, "goals": 18},
    ]
    return {"league": league, "assists": sample_assists}

@api_router.get("/football/league/{league_id}/fixtures")
async def get_league_fixtures(league_id: int):
    """Get all fixtures for a specific league"""
    league = next((l for l in FOOTBALL_LEAGUES if l["id"] == league_id), None)
    
    CURRENT_SEASON = 2025
    all_fixtures = []
    
    if API_FOOTBALL_KEY:
        # Get next 20 fixtures
        fixtures = await fetch_from_api_football("fixtures", {
            "league": league_id,
            "season": CURRENT_SEASON,
            "next": 20
        })
        
        if fixtures:
            for fixture in fixtures:
                all_fixtures.append(format_match(fixture))
        
        # Get last 10 fixtures
        last_fixtures = await fetch_from_api_football("fixtures", {
            "league": league_id,
            "season": CURRENT_SEASON,
            "last": 10
        })
        
        if last_fixtures:
            for fixture in last_fixtures:
                all_fixtures.append(format_match(fixture))
    
    # Sort by date
    all_fixtures.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {"league": league, "fixtures": all_fixtures}

# Include the API router - must be at the end after all routes are defined
app.include_router(api_router)

