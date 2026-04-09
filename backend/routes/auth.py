# Auth Routes - Extracted from server.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import os

router = APIRouter(prefix="/auth", tags=["auth"])

# These will be injected from server.py
db = None
SECRET_KEY = None
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
OWNER_EMAILS = []
pwd_context = None
security = HTTPBearer()

def init_auth_router(database, secret_key, owner_emails, password_context):
    global db, SECRET_KEY, OWNER_EMAILS, pwd_context
    db = database
    SECRET_KEY = secret_key
    OWNER_EMAILS = owner_emails
    pwd_context = password_context

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    identifier: str
    password: str

class User(BaseModel):
    id: str
    email: str
    username: str
    name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    frame_color: Optional[str] = "lime"
    created_at: str
    role: str = "user"
    is_banned: bool = False
    banned_rooms: List[str] = []
    coins: int = 1000
    level: int = 1
    xp: int = 0
    badges: List[str] = []
    is_vip: bool = False
    vip_until: Optional[str] = None
    
    class Config:
        extra = "ignore"

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    frame_color: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

# Routes
@router.post("/register", response_model=Token)
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
    
    user_role = "owner" if user_data.email in OWNER_EMAILS else "user"
    
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
        "favorite_rooms": [],
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

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    identifier = user_data.identifier.strip().lower()
    
    user = await db.users.find_one(
        {"$or": [{"email": identifier}, {"username": identifier}]},
        {"_id": 0}
    )
    
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="اسم المستخدم/البريد الإلكتروني أو كلمة المرور غير صحيحة")
    
    is_vip = user.get("is_vip", False)
    
    if user.get("role") == "owner":
        is_vip = True
        user["is_vip"] = True
        user["vip_until"] = "2099-12-31T23:59:59Z"
    elif is_vip and user.get("vip_until"):
        try:
            vip_until = datetime.fromisoformat(user["vip_until"].replace('Z', '+00:00'))
            if vip_until < datetime.now(timezone.utc):
                is_vip = False
                user["is_vip"] = False
        except:
            pass
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(**{k: v for k, v in user.items() if k != "password"})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    email = data.email.strip().lower()
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        return {"message": "إذا كان البريد مسجلاً، سيتم إرسال رمز التحقق"}
    
    import random
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    await db.password_resets.delete_many({"email": email})
    await db.password_resets.insert_one({
        "email": email,
        "code": reset_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    })
    
    print(f"Password reset code for {email}: {reset_code}")
    
    return {
        "message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        "code_hint": reset_code
    }

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    email = data.email.strip().lower()
    
    reset_record = await db.password_resets.find_one({
        "email": email,
        "code": data.code
    }, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")
    
    expires_at = datetime.fromisoformat(reset_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_many({"email": email})
        raise HTTPException(status_code=400, detail="انتهت صلاحية رمز التحقق")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    
    hashed_password = pwd_context.hash(data.new_password)
    await db.users.update_one(
        {"email": email},
        {"$set": {"password": hashed_password}}
    )
    
    await db.password_resets.delete_many({"email": email})
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    followers_count = await db.follows.count_documents({"following_id": current_user.id})
    following_count = await db.follows.count_documents({"follower_id": current_user.id})
    rooms_joined = await db.room_participants.count_documents({"user_id": current_user.id})
    rooms_created = await db.rooms.count_documents({"owner_id": current_user.id})
    
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    badges_earned = ["speaker"]
    if rooms_created > 0:
        badges_earned.append("room_owner")
    if followers_count >= 10:
        badges_earned.append("popular")
    if current_user.coins >= 100:
        badges_earned.append("star")
    if followers_count >= 50 and rooms_joined >= 5:
        badges_earned.append("verified")
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
        "badges_earned": badges_earned,
        "is_vip": user_doc.get("is_vip", False),
        "vip_until": user_doc.get("vip_until")
    }

@router.put("/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    update_doc = {}
    
    if profile_data.name is not None:
        update_doc["name"] = profile_data.name.strip()[:50]
    
    if profile_data.username and profile_data.username.strip():
        clean_username = ''.join(c for c in profile_data.username if c.isalnum() or c == '_').lower()
        if len(clean_username) < 3:
            raise HTTPException(status_code=400, detail="اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
        existing = await db.users.find_one({
            "username": clean_username,
            "id": {"$ne": current_user.id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")
        update_doc["username"] = clean_username
    
    if profile_data.bio is not None:
        update_doc["bio"] = profile_data.bio[:160]
    
    if profile_data.avatar and profile_data.avatar.strip():
        update_doc["avatar"] = profile_data.avatar.strip()
    
    valid_colors = ["lime", "cyan", "purple", "amber", "rose", "rainbow"]
    if profile_data.frame_color and profile_data.frame_color in valid_colors:
        update_doc["frame_color"] = profile_data.frame_color
    
    if update_doc:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_doc}
        )
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    return {"message": "تم تحديث الملف الشخصي", "user": updated_user}

@router.put("/password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل")
    
    new_hashed_password = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password": new_hashed_password}}
    )
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}
