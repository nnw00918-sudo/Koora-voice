from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    avatar: Optional[str] = None
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
    
    # Get user with bio
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
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
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None

@api_router.put("/auth/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile"""
    update_doc = {}
    
    if profile_data.username and profile_data.username.strip():
        # Check if username is already taken
        existing = await db.users.find_one({
            "username": profile_data.username,
            "id": {"$ne": current_user.id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")
        update_doc["username"] = profile_data.username.strip()
    
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
