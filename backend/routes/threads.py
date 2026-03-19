from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from jose import jwt, JWTError
import time

router = APIRouter(prefix="/threads", tags=["threads"])
security = HTTPBearer()

# These will be imported from main server
db = None
SECRET_KEY = None
ALGORITHM = None
ws_manager = None
create_notification = None

def init_threads_router(_db, _secret_key, _algorithm, _ws_manager, _create_notification):
    global db, SECRET_KEY, ALGORITHM, ws_manager, create_notification
    db = _db
    SECRET_KEY = _secret_key
    ALGORITHM = _algorithm
    ws_manager = _ws_manager
    create_notification = _create_notification

class ThreadCreate(BaseModel):
    content: str = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    twitter_url: Optional[str] = None

class ReplyCreate(BaseModel):
    content: str

@router.get("")
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
    
    if tab == "following":
        following_ids = current_user.get("following", [])
        query = {"author_id": {"$in": following_ids}}
    else:
        query = {}
    
    threads_cursor = db.threads.find(query).sort("created_at", -1).limit(50)
    threads = await threads_cursor.to_list(length=50)
    
    user_likes = await db.thread_likes.find({"user_id": user_id}).to_list(length=1000)
    liked_thread_ids = {like["thread_id"] for like in user_likes}
    
    user_reposts = await db.thread_reposts.find({"user_id": user_id}).to_list(length=1000)
    reposted_thread_ids = {repost["thread_id"] for repost in user_reposts}
    
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
                "reposted": thread["id"] in reposted_thread_ids,
                "created_at": thread["created_at"]
            })
    
    return {"threads": result}

@router.post("")
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
    await db.users.update_one({"id": user_id}, {"$inc": {"xp": 5}})
    
    return {"message": "Thread created", "thread_id": thread_id}

@router.post("/{thread_id}/like")
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
    
    existing_like = await db.thread_likes.find_one({"thread_id": thread_id, "user_id": user_id})
    
    if existing_like:
        await db.thread_likes.delete_one({"_id": existing_like["_id"]})
        await db.threads.update_one({"id": thread_id}, {"$inc": {"likes_count": -1}})
        return {"liked": False}
    else:
        await db.thread_likes.insert_one({
            "thread_id": thread_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.threads.update_one({"id": thread_id}, {"$inc": {"likes_count": 1}})
        
        if thread["author_id"] != user_id and create_notification:
            await create_notification(
                user_id=thread["author_id"],
                notif_type="like",
                from_user_id=user_id,
                thread_id=thread_id
            )
        
        return {"liked": True}

@router.post("/{thread_id}/reply")
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
    await db.threads.update_one({"id": thread_id}, {"$inc": {"replies_count": 1}})
    await db.users.update_one({"id": user_id}, {"$inc": {"xp": 2}})
    
    if thread["author_id"] != user_id and create_notification:
        await create_notification(
            user_id=thread["author_id"],
            notif_type="reply",
            from_user_id=user_id,
            thread_id=thread_id,
            message=reply_data.content.strip()[:50]
        )
    
    return {"message": "Reply added", "reply_id": reply_id}

@router.get("/{thread_id}/replies")
async def get_thread_replies(
    thread_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get replies for a thread"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
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

@router.post("/{thread_id}/repost")
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
    
    existing_repost = await db.thread_reposts.find_one({"thread_id": thread_id, "user_id": user_id})
    
    if existing_repost:
        await db.thread_reposts.delete_one({"_id": existing_repost["_id"]})
        await db.threads.update_one({"id": thread_id}, {"$inc": {"reposts_count": -1}})
        return {"reposted": False}
    else:
        await db.thread_reposts.insert_one({
            "thread_id": thread_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.threads.update_one({"id": thread_id}, {"$inc": {"reposts_count": 1}})
        return {"reposted": True}

@router.delete("/{thread_id}")
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
    
    user = await db.users.find_one({"id": user_id})
    if thread["author_id"] != user_id and user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.threads.delete_one({"id": thread_id})
    await db.thread_likes.delete_many({"thread_id": thread_id})
    
    return {"message": "Thread deleted"}
