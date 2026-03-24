"""
Stories Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
import time

from config import db, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/stories", tags=["Stories"])
security = HTTPBearer()


def get_user_id_from_token(credentials: HTTPAuthorizationCredentials):
    """Extract user_id from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("")
async def get_stories(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get stories from users the current user follows + own stories"""
    user_id = get_user_id_from_token(credentials)
    
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


@router.post("")
async def create_story(
    media_url: str = Form(...),
    media_type: str = Form("image"),
    caption: str = Form(""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new story"""
    user_id = get_user_id_from_token(credentials)
    
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


@router.post("/{story_id}/view")
async def view_story(story_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Mark a story as viewed"""
    user_id = get_user_id_from_token(credentials)
    
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


@router.delete("/{story_id}")
async def delete_story(story_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a story"""
    user_id = get_user_id_from_token(credentials)
    
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.stories.delete_one({"id": story_id})
    await db.story_views.delete_many({"story_id": story_id})
    
    return {"message": "Story deleted"}


@router.get("/{story_id}/viewers")
async def get_story_viewers(story_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get list of users who viewed a story (only for story owner)"""
    user_id = get_user_id_from_token(credentials)
    
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


@router.post("/{story_id}/react")
async def react_to_story(
    story_id: str,
    reaction: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """React to a story (emoji)"""
    user_id = get_user_id_from_token(credentials)
    
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


@router.post("/{story_id}/reply")
async def reply_to_story(
    story_id: str,
    content: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reply to a story (private message)"""
    user_id = get_user_id_from_token(credentials)
    
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


@router.get("/{story_id}/replies")
async def get_story_replies(story_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get replies for a story (only story owner can see)"""
    user_id = get_user_id_from_token(credentials)
    
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


@router.get("/{story_id}/reactions")
async def get_story_reactions(story_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get reactions for a story"""
    user_id = get_user_id_from_token(credentials)
    
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
