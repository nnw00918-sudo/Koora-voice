# Threads Routes - Extracted from server.py
from fastapi import APIRouter, HTTPException, Depends, File, Form, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from jose import jwt, JWTError
from pathlib import Path
import os

router = APIRouter(prefix="/threads", tags=["threads"])

# Injected dependencies
db = None
SECRET_KEY = None
ALGORITHM = "HS256"
get_current_user = None
create_notification = None

def init_threads_router(database, secret_key, auth_func, notif_func):
    global db, SECRET_KEY, get_current_user, create_notification
    db = database
    SECRET_KEY = secret_key
    get_current_user = auth_func
    create_notification = notif_func

# Models
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

class ReplyCreate(BaseModel):
    content: str

@router.get("")
async def get_threads(
    page: int = 1,
    limit: int = 20,
    user_id: Optional[str] = None,
    current_user = Depends(lambda: get_current_user)
):
    skip = (page - 1) * limit
    
    query = {"is_reply": {"$ne": True}}
    if user_id:
        query["author_id"] = user_id
    
    threads_cursor = db.threads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    threads = await threads_cursor.to_list(limit)
    
    if not threads:
        return {"threads": [], "has_more": False}
    
    author_ids = list(set(t["author_id"] for t in threads))
    thread_ids = [t["id"] for t in threads]
    
    users_cursor = db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "password": 0})
    users_list = await users_cursor.to_list(len(author_ids))
    users_map = {u["id"]: u for u in users_list}
    
    user_likes = await db.thread_likes.find({
        "user_id": current_user.id,
        "thread_id": {"$in": thread_ids}
    }, {"_id": 0}).to_list(len(thread_ids))
    liked_ids = {like["thread_id"] for like in user_likes}
    
    result = []
    for thread in threads:
        author = users_map.get(thread["author_id"], {})
        result.append({
            "id": thread["id"],
            "content": thread.get("content", ""),
            "media_url": thread.get("media_url"),
            "media_type": thread.get("media_type"),
            "twitter_url": thread.get("twitter_url"),
            "author": {
                "id": author.get("id"),
                "username": author.get("username"),
                "name": author.get("name", author.get("username")),
                "avatar": author.get("avatar"),
                "role": author.get("role", "user")
            },
            "likes_count": thread.get("likes_count", 0),
            "replies_count": thread.get("replies_count", 0),
            "reposts_count": thread.get("reposts_count", 0),
            "liked": thread["id"] in liked_ids,
            "created_at": thread.get("created_at")
        })
    
    return {"threads": result, "has_more": len(threads) == limit}

@router.post("")
async def create_thread(
    thread_data: ThreadCreate,
    current_user = Depends(lambda: get_current_user)
):
    from uuid import uuid4
    
    if not thread_data.content.strip() and not thread_data.media_url and not thread_data.twitter_url:
        raise HTTPException(status_code=400, detail="المحتوى مطلوب")
    
    thread_id = str(uuid4())[:12]
    
    thread_doc = {
        "id": thread_id,
        "content": thread_data.content.strip()[:500],
        "author_id": current_user.id,
        "media_url": thread_data.media_url,
        "media_type": thread_data.media_type,
        "twitter_url": thread_data.twitter_url,
        "likes_count": 0,
        "replies_count": 0,
        "reposts_count": 0,
        "is_reply": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.threads.insert_one(thread_doc)
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$inc": {"xp": 10}}
    )
    
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    return {
        "id": thread_id,
        "content": thread_doc["content"],
        "media_url": thread_doc.get("media_url"),
        "media_type": thread_doc.get("media_type"),
        "twitter_url": thread_doc.get("twitter_url"),
        "author": {
            "id": user["id"],
            "username": user["username"],
            "name": user.get("name", user["username"]),
            "avatar": user.get("avatar"),
            "role": user.get("role", "user")
        },
        "likes_count": 0,
        "replies_count": 0,
        "reposts_count": 0,
        "liked": False,
        "created_at": thread_doc["created_at"]
    }

@router.get("/{thread_id}")
async def get_thread(thread_id: str, current_user = Depends(lambda: get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    
    author = await db.users.find_one({"id": thread["author_id"]}, {"_id": 0, "password": 0})
    
    liked = await db.thread_likes.find_one({
        "user_id": current_user.id,
        "thread_id": thread_id
    })
    
    return {
        "id": thread["id"],
        "content": thread.get("content", ""),
        "media_url": thread.get("media_url"),
        "media_type": thread.get("media_type"),
        "twitter_url": thread.get("twitter_url"),
        "author": {
            "id": author["id"] if author else None,
            "username": author["username"] if author else "deleted",
            "name": author.get("name", author.get("username")) if author else "deleted",
            "avatar": author.get("avatar") if author else None,
            "role": author.get("role", "user") if author else "user"
        },
        "likes_count": thread.get("likes_count", 0),
        "replies_count": thread.get("replies_count", 0),
        "reposts_count": thread.get("reposts_count", 0),
        "liked": liked is not None,
        "created_at": thread.get("created_at")
    }

@router.post("/{thread_id}/like")
async def like_thread(thread_id: str, current_user = Depends(lambda: get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    
    existing = await db.thread_likes.find_one({
        "user_id": current_user.id,
        "thread_id": thread_id
    })
    
    if existing:
        await db.thread_likes.delete_one({
            "user_id": current_user.id,
            "thread_id": thread_id
        })
        await db.threads.update_one(
            {"id": thread_id},
            {"$inc": {"likes_count": -1}}
        )
        return {"liked": False, "likes_count": max(0, thread.get("likes_count", 1) - 1)}
    else:
        from uuid import uuid4
        await db.thread_likes.insert_one({
            "id": str(uuid4())[:8],
            "user_id": current_user.id,
            "thread_id": thread_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.threads.update_one(
            {"id": thread_id},
            {"$inc": {"likes_count": 1}}
        )
        
        if create_notification and thread["author_id"] != current_user.id:
            await create_notification(
                user_id=thread["author_id"],
                notif_type="like",
                from_user_id=current_user.id,
                thread_id=thread_id
            )
        
        return {"liked": True, "likes_count": thread.get("likes_count", 0) + 1}

@router.post("/{thread_id}/reply")
async def reply_to_thread(thread_id: str, reply_data: ReplyCreate, current_user = Depends(lambda: get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    
    if not reply_data.content.strip():
        raise HTTPException(status_code=400, detail="الرد مطلوب")
    
    from uuid import uuid4
    reply_id = str(uuid4())[:12]
    
    reply_doc = {
        "id": reply_id,
        "thread_id": thread_id,
        "content": reply_data.content.strip()[:500],
        "author_id": current_user.id,
        "is_reply": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.thread_replies.insert_one(reply_doc)
    
    await db.threads.update_one(
        {"id": thread_id},
        {"$inc": {"replies_count": 1}}
    )
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$inc": {"xp": 5}}
    )
    
    if create_notification and thread["author_id"] != current_user.id:
        await create_notification(
            user_id=thread["author_id"],
            notif_type="reply",
            from_user_id=current_user.id,
            thread_id=thread_id,
            message=reply_data.content[:100]
        )
    
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    return {
        "id": reply_id,
        "thread_id": thread_id,
        "content": reply_doc["content"],
        "author": {
            "id": user["id"],
            "username": user["username"],
            "name": user.get("name", user["username"]),
            "avatar": user.get("avatar"),
            "role": user.get("role", "user")
        },
        "created_at": reply_doc["created_at"]
    }

@router.get("/{thread_id}/replies")
async def get_thread_replies(thread_id: str, current_user = Depends(lambda: get_current_user)):
    replies_cursor = db.thread_replies.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1)
    replies = await replies_cursor.to_list(100)
    
    if not replies:
        return {"replies": []}
    
    author_ids = list(set(r["author_id"] for r in replies))
    users_cursor = db.users.find({"id": {"$in": author_ids}}, {"_id": 0, "password": 0})
    users_list = await users_cursor.to_list(len(author_ids))
    users_map = {u["id"]: u for u in users_list}
    
    result = []
    for reply in replies:
        author = users_map.get(reply["author_id"], {})
        result.append({
            "id": reply["id"],
            "thread_id": thread_id,
            "content": reply.get("content", ""),
            "author": {
                "id": author.get("id"),
                "username": author.get("username", "deleted"),
                "name": author.get("name", author.get("username", "deleted")),
                "avatar": author.get("avatar"),
                "role": author.get("role", "user")
            },
            "created_at": reply.get("created_at")
        })
    
    return {"replies": result}

@router.delete("/{thread_id}/replies/{reply_id}")
async def delete_reply(thread_id: str, reply_id: str, current_user = Depends(lambda: get_current_user)):
    reply = await db.thread_replies.find_one({"id": reply_id, "thread_id": thread_id}, {"_id": 0})
    if not reply:
        raise HTTPException(status_code=404, detail="الرد غير موجود")
    
    if reply["author_id"] != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك بحذف هذا الرد")
    
    await db.thread_replies.delete_one({"id": reply_id})
    await db.threads.update_one(
        {"id": thread_id},
        {"$inc": {"replies_count": -1}}
    )
    
    return {"message": "تم حذف الرد"}

@router.post("/{thread_id}/repost")
async def repost_thread(thread_id: str, current_user = Depends(lambda: get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    
    existing = await db.reposts.find_one({
        "user_id": current_user.id,
        "thread_id": thread_id
    })
    
    if existing:
        await db.reposts.delete_one({
            "user_id": current_user.id,
            "thread_id": thread_id
        })
        await db.threads.update_one(
            {"id": thread_id},
            {"$inc": {"reposts_count": -1}}
        )
        return {"reposted": False, "reposts_count": max(0, thread.get("reposts_count", 1) - 1)}
    else:
        from uuid import uuid4
        await db.reposts.insert_one({
            "id": str(uuid4())[:8],
            "user_id": current_user.id,
            "thread_id": thread_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.threads.update_one(
            {"id": thread_id},
            {"$inc": {"reposts_count": 1}}
        )
        return {"reposted": True, "reposts_count": thread.get("reposts_count", 0) + 1}

@router.delete("/{thread_id}")
async def delete_thread(thread_id: str, current_user = Depends(lambda: get_current_user)):
    thread = await db.threads.find_one({"id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    
    if thread["author_id"] != current_user.id and current_user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك بحذف هذا المنشور")
    
    await db.threads.delete_one({"id": thread_id})
    await db.thread_likes.delete_many({"thread_id": thread_id})
    await db.thread_replies.delete_many({"thread_id": thread_id})
    await db.reposts.delete_many({"thread_id": thread_id})
    
    return {"message": "تم حذف المنشور"}
