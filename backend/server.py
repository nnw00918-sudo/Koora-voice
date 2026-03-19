from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, Form, UploadFile
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
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from agora_token_builder import RtcTokenBuilder
import time

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
    email: EmailStr
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
    created_at: str

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

def can_manage_stage(user_role: str) -> bool:
    """Check if user can approve mic requests and manage stage"""
    return user_role in ["owner", "admin", "mod"]

def can_kick_mute(user_role: str) -> bool:
    """Check if user can kick and mute users"""
    return user_role in ["owner", "admin"]

def can_manage_rooms(user_role: str) -> bool:
    """Check if user can create/close rooms"""
    return user_role in ["owner"]

def can_promote_users(user_role: str) -> bool:
    """Check if user can promote other users"""
    return user_role in ["owner"]

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
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="البريد الإلكتروني أو كلمة المرور غير صحيحة")
    
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
    """Get list of followers for a user"""
    follows = await db.follows.find({"following_id": user_id}, {"_id": 0}).to_list(1000)
    
    followers = []
    for follow in follows:
        user = await db.users.find_one({"id": follow["follower_id"]}, {"_id": 0, "password": 0})
        if user:
            # Check if current user follows this follower
            is_following = await db.follows.find_one({
                "follower_id": current_user.id,
                "following_id": user["id"]
            })
            user["is_following"] = is_following is not None
            followers.append(user)
    
    return {"followers": followers, "count": len(followers)}

@api_router.get("/users/{user_id}/following")
async def get_following(user_id: str, current_user: User = Depends(get_current_user)):
    """Get list of users that a user follows"""
    follows = await db.follows.find({"follower_id": user_id}, {"_id": 0}).to_list(1000)
    
    following = []
    for follow in follows:
        user = await db.users.find_one({"id": follow["following_id"]}, {"_id": 0, "password": 0})
        if user:
            # Check if current user follows this user
            is_following = await db.follows.find_one({
                "follower_id": current_user.id,
                "following_id": user["id"]
            })
            user["is_following"] = is_following is not None
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
    
    for room in rooms:
        count = await db.room_participants.count_documents({"room_id": room["id"]})
        room["participant_count"] = count
    
    return [RoomFull(**r) for r in rooms]

@api_router.post("/rooms/create", response_model=RoomFull)
async def create_room(room_data: RoomCreate, current_user: User = Depends(get_current_user)):
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

@api_router.get("/rooms/{room_id}", response_model=RoomFull)
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    count = await db.room_participants.count_documents({"room_id": room_id})
    room["participant_count"] = count
    
    return RoomFull(**room)

@api_router.post("/rooms/{room_id}/join")
async def join_room(room_id: str, current_user: User = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    existing = await db.room_participants.find_one({
        "room_id": room_id,
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not existing:
        participant_doc = {
            "room_id": room_id,
            "user_id": current_user.id,
            "username": current_user.username,
            "avatar": current_user.avatar,
            "is_speaking": False,
            "joined_at": datetime.now(timezone.utc).isoformat(),
            "seat_number": None,
            "room_role": "listener",
            "can_speak": False
        }
        await db.room_participants.insert_one(participant_doc)
    
    return {"message": "انضممت للغرفة بنجاح"}

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
    if not can_manage_stage(current_user.role):
        raise HTTPException(status_code=403, detail="صلاحيات Owner/Admin/Mod مطلوبة")
    
    requests = await db.seat_requests.find({
        "room_id": room_id,
        "status": "pending"
    }, {"_id": 0}).sort("created_at", 1).to_list(50)
    
    return {"requests": [SeatRequest(**r) for r in requests]}

@api_router.post("/rooms/{room_id}/seat/approve/{user_id}")
async def approve_seat_request(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    if not can_manage_stage(current_user.role):
        raise HTTPException(status_code=403, detail="صلاحيات Owner/Admin/Mod مطلوبة")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
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
    if not can_manage_stage(current_user.role):
        raise HTTPException(status_code=403, detail="صلاحيات Owner/Admin/Mod مطلوبة")
    
    result = await db.seat_requests.update_one(
        {"room_id": room_id, "user_id": user_id, "status": "pending"},
        {"$set": {"status": "rejected"}}
    )
    
    if result.modified_count > 0:
        return {"message": "تم رفض الطلب"}
    raise HTTPException(status_code=404, detail="الطلب غير موجود")

@api_router.post("/rooms/{room_id}/kick/{user_id}")
async def kick_user_from_room_by_admin(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    if not can_kick_mute(current_user.role):
        raise HTTPException(status_code=403, detail="صلاحيات Owner/Admin مطلوبة")
    
    result = await db.room_participants.delete_one({
        "room_id": room_id,
        "user_id": user_id
    })
    
    if result.deleted_count > 0:
        return {"message": "تم طرد العضو من الغرفة"}
    raise HTTPException(status_code=404, detail="العضو غير موجود في الغرفة")

@api_router.post("/rooms/{room_id}/mute/{user_id}")
async def mute_user(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    if not can_kick_mute(current_user.role):
        raise HTTPException(status_code=403, detail="صلاحيات Owner/Admin مطلوبة")
    
    result = await db.room_participants.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {"is_muted": True, "can_speak": False}}
    )
    
    if result.modified_count > 0:
        return {"message": "تم كتم العضو"}
    raise HTTPException(status_code=404, detail="العضو غير موجود")

@api_router.post("/rooms/{room_id}/unmute/{user_id}")
async def unmute_user(room_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    if not can_kick_mute(current_user.role):
        raise HTTPException(status_code=403, detail="صلاحيات Owner/Admin مطلوبة")
    
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
    """Remove a user from stage (Owner/Admin only)"""
    if not can_kick_mute(current_user.role):
        raise HTTPException(status_code=403, detail="صلاحيات Owner/Admin مطلوبة")
    
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
    # حذف جميع رسائل الغرفة عند المغادرة
    await db.messages.delete_many({"room_id": room_id})
    return {"message": "غادرت الغرفة"}

@api_router.get("/rooms/{room_id}/participants", response_model=List[RoomParticipant])
async def get_room_participants(room_id: str):
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
    """Toggle room open/closed status - Owner only"""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="صلاحيات Owner مطلوبة لإغلاق/فتح الغرف")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
    new_status = not room.get("is_closed", False)
    await db.rooms.update_one(
        {"id": room_id},
        {"$set": {"is_closed": new_status}}
    )
    
    status = "مغلقة" if new_status else "مفتوحة"
    return {"message": f"الغرفة الآن {status}", "is_closed": new_status}

@api_router.delete("/admin/rooms/{room_id}")
async def delete_room(room_id: str, current_user: User = Depends(get_current_user)):
    """Delete a room completely - Owner only"""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="صلاحيات Owner مطلوبة لحذف الغرف")
    
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    
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
    
    # Get user likes to mark liked threads
    user_likes = await db.thread_likes.find({"user_id": user_id}).to_list(length=1000)
    liked_thread_ids = {like["thread_id"] for like in user_likes}
    
    result = []
    for thread in threads:
        # Get author info
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

app.include_router(api_router)

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
