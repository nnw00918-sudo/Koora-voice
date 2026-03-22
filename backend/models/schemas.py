"""
Pydantic Models for the Application
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    identifier: str
    password: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    name: Optional[str] = None
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


class ThreadCreate(BaseModel):
    content: str = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
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
    room_type: str = "all"


class AgoraTokenResponse(BaseModel):
    token: str
    uid: int
    channel: str


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None


class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    participants: List[dict]
    last_message: Optional[dict] = None
    unread_count: int = 0
    updated_at: str


class PrivateMessageCreate(BaseModel):
    content: str


class PrivateMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    conversation_id: str
    sender_id: str
    sender_username: str
    sender_avatar: Optional[str] = None
    content: str
    read: bool = False
    created_at: str


class StoryCreate(BaseModel):
    media_url: str
    media_type: str = "image"
    caption: Optional[str] = None


class StoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    username: str
    avatar: Optional[str] = None
    media_url: str
    media_type: str
    caption: Optional[str] = None
    views_count: int = 0
    viewed: bool = False
    created_at: str
    expires_at: str


class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[dict] = None
    read: bool = False
    created_at: str
