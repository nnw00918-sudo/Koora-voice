"""
Authentication Utilities
"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timezone, timedelta

from config import db, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, OWNER_EMAILS
from models.schemas import User

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
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


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def get_owner_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user


def has_permission(user_role: str, required_roles: list) -> bool:
    """Check if user has required permission based on role hierarchy"""
    return user_role in required_roles


def can_manage_stage(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can approve mic requests and manage stage"""
    if user_role == "owner":
        return True
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return user_role in ["admin", "mod"]


def can_kick_mute(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can kick and mute users"""
    if user_role == "owner":
        return True
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return user_role in ["admin"]


def can_manage_rooms(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can create/close rooms"""
    if user_role == "owner":
        return True
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return False


def can_promote_users(user_role: str, user_id: str = None, room_owner_id: str = None) -> bool:
    """Check if user can promote other users"""
    if user_role == "owner":
        return True
    if user_id and room_owner_id and user_id == room_owner_id:
        return True
    return False
