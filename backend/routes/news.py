"""
News Management Routes - الأخبار المحلية
رتبة الإخباري (news_editor) يمكنها إدارة الأخبار
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List
from uuid import uuid4
import os
import logging

router = APIRouter(prefix="/news", tags=["News"])
logger = logging.getLogger(__name__)

# Models
class NewsCreate(BaseModel):
    title: str
    content: str
    category: str = "عام"  # عام, انتقالات, نتائج, تصريحات
    image_url: Optional[str] = None
    is_ticker: bool = True  # يظهر في شريط الأخبار
    is_featured: bool = False  # خبر مميز

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_ticker: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

# Dependency to get database
def get_db():
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    return client[os.environ['DB_NAME']]

# Auth dependency
async def get_current_user_from_token(authorization: str = Header(None)):
    """Extract user from token"""
    from jose import jwt, JWTError
    SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "koraverse_secret_key_change_in_production")
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="غير مصرح")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="رمز غير صالح")
        
        db = get_db()
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")

def can_manage_news(user_role: str) -> bool:
    """Check if user can manage news"""
    return user_role in ["news_editor", "admin", "owner"]


# ==================== NEWS CRUD ====================

@router.get("/")
async def get_all_news(
    category: Optional[str] = None,
    ticker_only: bool = False,
    featured_only: bool = False,
    limit: int = 50
):
    """Get all active news - public endpoint"""
    db = get_db()
    
    query = {"is_active": True}
    if category:
        query["category"] = category
    if ticker_only:
        query["is_ticker"] = True
    if featured_only:
        query["is_featured"] = True
    
    news = await db.local_news.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    return {"news": news, "total": len(news)}


@router.get("/ticker")
async def get_news_ticker():
    """Get news for ticker display - formatted for frontend"""
    db = get_db()
    
    # Get local ticker news
    local_news = await db.local_news.find(
        {"is_active": True, "is_ticker": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    # Format for ticker
    ticker_items = []
    category_icons = {
        "عام": "📰",
        "انتقالات": "🔄",
        "نتائج": "⚽",
        "تصريحات": "🎙️",
        "عاجل": "🔴"
    }
    
    category_types = {
        "عام": "news",
        "انتقالات": "transfer",
        "نتائج": "result",
        "تصريحات": "coach",
        "عاجل": "live"
    }
    
    for item in local_news:
        ticker_items.append({
            "type": category_types.get(item.get("category", "عام"), "news"),
            "icon": category_icons.get(item.get("category", "عام"), "📰"),
            "text": item.get("title", ""),
            "content": item.get("content", ""),
            "priority": 1 if item.get("is_featured") else 2,
            "id": item.get("id"),
            "is_local": True
        })
    
    return {"news": ticker_items, "total": len(ticker_items)}


@router.get("/admin")
async def get_all_news_admin(user: dict = Depends(get_current_user_from_token)):
    """Get all news for admin (including inactive) - requires news_editor role"""
    db = get_db()
    
    if not can_manage_news(user.get("role", "user")):
        raise HTTPException(status_code=403, detail="صلاحيات الإخباري مطلوبة")
    
    news = await db.local_news.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"news": news, "total": len(news)}


@router.post("")
async def create_news(news_data: NewsCreate, user: dict = Depends(get_current_user_from_token)):
    """Create new news item - requires news_editor role"""
    db = get_db()
    
    if not can_manage_news(user.get("role", "user")):
        raise HTTPException(status_code=403, detail="صلاحيات الإخباري مطلوبة")
    
    news_id = str(uuid4())[:8]
    
    news_doc = {
        "id": news_id,
        "title": news_data.title.strip(),
        "content": news_data.content.strip(),
        "category": news_data.category,
        "image_url": news_data.image_url,
        "is_ticker": news_data.is_ticker,
        "is_featured": news_data.is_featured,
        "is_active": True,
        "author_id": user.get("id"),
        "author_name": user.get("username"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.local_news.insert_one(news_doc)
    
    # Remove _id for response
    news_doc.pop("_id", None)
    
    return {"message": "تم إضافة الخبر بنجاح", "news": news_doc}


@router.put("/{news_id}")
async def update_news(news_id: str, news_data: NewsUpdate, user: dict = Depends(get_current_user_from_token)):
    """Update news item - requires news_editor role"""
    db = get_db()
    
    if not can_manage_news(user.get("role", "user")):
        raise HTTPException(status_code=403, detail="صلاحيات الإخباري مطلوبة")
    
    # Check if news exists
    existing = await db.local_news.find_one({"id": news_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    
    # Build update document
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if news_data.title is not None:
        update_doc["title"] = news_data.title.strip()
    if news_data.content is not None:
        update_doc["content"] = news_data.content.strip()
    if news_data.category is not None:
        update_doc["category"] = news_data.category
    if news_data.image_url is not None:
        update_doc["image_url"] = news_data.image_url
    if news_data.is_ticker is not None:
        update_doc["is_ticker"] = news_data.is_ticker
    if news_data.is_featured is not None:
        update_doc["is_featured"] = news_data.is_featured
    if news_data.is_active is not None:
        update_doc["is_active"] = news_data.is_active
    
    await db.local_news.update_one(
        {"id": news_id},
        {"$set": update_doc}
    )
    
    # Get updated news
    updated = await db.local_news.find_one({"id": news_id}, {"_id": 0})
    
    return {"message": "تم تحديث الخبر بنجاح", "news": updated}


@router.delete("/{news_id}")
async def delete_news(news_id: str, user: dict = Depends(get_current_user_from_token)):
    """Delete news item - requires news_editor role"""
    db = get_db()
    
    if not can_manage_news(user.get("role", "user")):
        raise HTTPException(status_code=403, detail="صلاحيات الإخباري مطلوبة")
    
    result = await db.local_news.delete_one({"id": news_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    
    return {"message": "تم حذف الخبر بنجاح"}


@router.post("/{news_id}/toggle")
async def toggle_news_active(news_id: str, user: dict = Depends(get_current_user_from_token)):
    """Toggle news active status - requires news_editor role"""
    db = get_db()
    
    if not can_manage_news(user.get("role", "user")):
        raise HTTPException(status_code=403, detail="صلاحيات الإخباري مطلوبة")
    
    # Get current status
    news = await db.local_news.find_one({"id": news_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    
    new_status = not news.get("is_active", True)
    
    await db.local_news.update_one(
        {"id": news_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    status_text = "مفعّل" if new_status else "معطّل"
    return {"message": f"تم تغيير حالة الخبر إلى {status_text}", "is_active": new_status}
