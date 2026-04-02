"""
Badges and Levels System for Koora Voice
نظام الشارات والمستويات
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/badges", tags=["badges"])

# ============================================
# شارات النظام
# ============================================

BADGES = {
    # شارات الفرق
    "team_alahli": {"id": "team_alahli", "name": "الأهلي", "name_en": "Al Ahli", "icon": "🟢", "category": "team", "description": "مشجع الأهلي"},
    "team_alhilal": {"id": "team_alhilal", "name": "الهلال", "name_en": "Al Hilal", "icon": "🔵", "category": "team", "description": "مشجع الهلال"},
    "team_alnassr": {"id": "team_alnassr", "name": "النصر", "name_en": "Al Nassr", "icon": "🟡", "category": "team", "description": "مشجع النصر"},
    "team_alittihad": {"id": "team_alittihad", "name": "الاتحاد", "name_en": "Al Ittihad", "icon": "⚫", "category": "team", "description": "مشجع الاتحاد"},
    "team_realmadrid": {"id": "team_realmadrid", "name": "ريال مدريد", "name_en": "Real Madrid", "icon": "⚪", "category": "team", "description": "مشجع ريال مدريد"},
    "team_barcelona": {"id": "team_barcelona", "name": "برشلونة", "name_en": "Barcelona", "icon": "🔴🔵", "category": "team", "description": "مشجع برشلونة"},
    "team_liverpool": {"id": "team_liverpool", "name": "ليفربول", "name_en": "Liverpool", "icon": "🔴", "category": "team", "description": "مشجع ليفربول"},
    "team_mancity": {"id": "team_mancity", "name": "مانشستر سيتي", "name_en": "Man City", "icon": "🩵", "category": "team", "description": "مشجع مانشستر سيتي"},
    
    # شارات المستوى
    "level_bronze": {"id": "level_bronze", "name": "برونزي", "name_en": "Bronze", "icon": "🥉", "category": "level", "description": "المستوى البرونزي", "min_level": 1},
    "level_silver": {"id": "level_silver", "name": "فضي", "name_en": "Silver", "icon": "🥈", "category": "level", "description": "المستوى الفضي", "min_level": 10},
    "level_gold": {"id": "level_gold", "name": "ذهبي", "name_en": "Gold", "icon": "🥇", "category": "level", "description": "المستوى الذهبي", "min_level": 25},
    "level_platinum": {"id": "level_platinum", "name": "بلاتيني", "name_en": "Platinum", "icon": "💎", "category": "level", "description": "المستوى البلاتيني", "min_level": 50},
    "level_diamond": {"id": "level_diamond", "name": "ماسي", "name_en": "Diamond", "icon": "💠", "category": "level", "description": "المستوى الماسي", "min_level": 100},
    
    # شارات الإنجازات
    "first_message": {"id": "first_message", "name": "أول رسالة", "name_en": "First Message", "icon": "💬", "category": "achievement", "description": "أرسل أول رسالة"},
    "messages_100": {"id": "messages_100", "name": "متحدث نشط", "name_en": "Active Chatter", "icon": "🗣️", "category": "achievement", "description": "أرسل 100 رسالة"},
    "messages_1000": {"id": "messages_1000", "name": "محترف الدردشة", "name_en": "Chat Pro", "icon": "🎤", "category": "achievement", "description": "أرسل 1000 رسالة"},
    "hours_10": {"id": "hours_10", "name": "متصل دائم", "name_en": "Always Online", "icon": "⏰", "category": "achievement", "description": "قضى 10 ساعات في الغرف"},
    "hours_100": {"id": "hours_100", "name": "ساكن الديوانية", "name_en": "Diwaniya Resident", "icon": "🏠", "category": "achievement", "description": "قضى 100 ساعة في الغرف"},
    "gifts_sent_10": {"id": "gifts_sent_10", "name": "كريم", "name_en": "Generous", "icon": "🎁", "category": "achievement", "description": "أرسل 10 هدايا"},
    "gifts_sent_100": {"id": "gifts_sent_100", "name": "سخي جداً", "name_en": "Very Generous", "icon": "💝", "category": "achievement", "description": "أرسل 100 هدية"},
    "gifts_received_10": {"id": "gifts_received_10", "name": "محبوب", "name_en": "Beloved", "icon": "🌟", "category": "achievement", "description": "استلم 10 هدايا"},
    "gifts_received_100": {"id": "gifts_received_100", "name": "نجم الغرفة", "name_en": "Room Star", "icon": "⭐", "category": "achievement", "description": "استلم 100 هدية"},
    "week_streak": {"id": "week_streak", "name": "أسبوع متواصل", "name_en": "Week Streak", "icon": "🔥", "category": "achievement", "description": "تواجد 7 أيام متواصلة"},
    "month_streak": {"id": "month_streak", "name": "شهر متواصل", "name_en": "Month Streak", "icon": "🏆", "category": "achievement", "description": "تواجد 30 يوم متواصل"},
    "early_adopter": {"id": "early_adopter", "name": "من الأوائل", "name_en": "Early Adopter", "icon": "🚀", "category": "achievement", "description": "انضم في الأيام الأولى"},
    "room_creator": {"id": "room_creator", "name": "منشئ غرف", "name_en": "Room Creator", "icon": "🏗️", "category": "achievement", "description": "أنشأ غرفة"},
    "popular_room": {"id": "popular_room", "name": "غرفة شعبية", "name_en": "Popular Room", "icon": "🎉", "category": "achievement", "description": "غرفته وصلت 50 متصل"},
}

# ============================================
# حساب المستوى والنقاط
# ============================================

def calculate_xp_for_level(level: int) -> int:
    """حساب النقاط المطلوبة للوصول لمستوى معين"""
    if level <= 1:
        return 0
    # صيغة بسيطة: كل مستوى يحتاج 100 × المستوى
    return int(100 * level * (level - 1) / 2)

def calculate_level_from_xp(xp: int) -> int:
    """حساب المستوى من النقاط"""
    level = 1
    while calculate_xp_for_level(level + 1) <= xp:
        level += 1
    return level

def get_level_progress(xp: int, level: int) -> dict:
    """حساب تقدم المستوى الحالي"""
    current_level_xp = calculate_xp_for_level(level)
    next_level_xp = calculate_xp_for_level(level + 1)
    progress_xp = max(0, xp - current_level_xp)
    needed_xp = next_level_xp - current_level_xp
    percentage = min(100, max(0, int((progress_xp / needed_xp) * 100))) if needed_xp > 0 else 100
    
    return {
        "current_xp": xp,
        "level": level,
        "progress_xp": progress_xp,
        "needed_xp": needed_xp,
        "percentage": percentage,
        "next_level_xp": next_level_xp
    }

# ============================================
# مصادر النقاط
# ============================================

XP_SOURCES = {
    "message_sent": 2,           # إرسال رسالة
    "message_received_reply": 5, # رسالته حصلت على رد
    "room_minute": 1,            # دقيقة في الغرفة
    "gift_sent": 10,             # إرسال هدية
    "gift_received": 5,          # استلام هدية
    "reaction_sent": 1,          # إرسال تفاعل
    "poll_voted": 3,             # التصويت في استطلاع
    "poll_created": 15,          # إنشاء استطلاع
    "room_created": 50,          # إنشاء غرفة
    "daily_login": 20,           # تسجيل دخول يومي
    "invite_accepted": 25,       # صديق قبل الدعوة
}

# Pydantic Models
class BadgeAssign(BaseModel):
    badge_id: str

class TeamBadgeSelect(BaseModel):
    team_badge_id: str

class XPEvent(BaseModel):
    event_type: str
    amount: Optional[int] = None

# ============================================
# API Endpoints
# ============================================

def get_badges_router(db, get_current_user):
    """Create badges router with database dependency"""
    
    @router.get("/all")
    async def get_all_badges():
        """الحصول على جميع الشارات المتاحة"""
        badges_by_category = {
            "team": [],
            "level": [],
            "achievement": []
        }
        
        for badge_id, badge in BADGES.items():
            category = badge.get("category", "achievement")
            badges_by_category[category].append(badge)
        
        return {
            "badges": badges_by_category,
            "total": len(BADGES)
        }
    
    @router.get("/user/{user_id}")
    async def get_user_badges(user_id: str):
        """الحصول على شارات مستخدم معين"""
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "badges": 1, "level": 1, "xp": 1, "selected_team_badge": 1})
        if not user:
            raise HTTPException(status_code=404, detail="المستخدم غير موجود")
        
        user_badges = user.get("badges", [])
        level = user.get("level", 1)
        xp = user.get("xp", 0)
        selected_team = user.get("selected_team_badge")
        
        # Get full badge info
        badges_info = []
        for badge_id in user_badges:
            if badge_id in BADGES:
                badges_info.append(BADGES[badge_id])
        
        # Get level badge
        level_badge = None
        for bid, badge in BADGES.items():
            if badge.get("category") == "level" and badge.get("min_level", 999) <= level:
                if not level_badge or badge.get("min_level", 0) > level_badge.get("min_level", 0):
                    level_badge = badge
        
        return {
            "badges": badges_info,
            "level_badge": level_badge,
            "selected_team_badge": BADGES.get(selected_team) if selected_team else None,
            "level_progress": get_level_progress(xp, level)
        }
    
    @router.post("/select-team")
    async def select_team_badge(data: TeamBadgeSelect, current_user = Depends(get_current_user)):
        """اختيار شارة الفريق المفضل"""
        badge = BADGES.get(data.team_badge_id)
        if not badge or badge.get("category") != "team":
            raise HTTPException(status_code=400, detail="شارة الفريق غير صحيحة")
        
        # Add badge if not already owned
        await db.users.update_one(
            {"id": current_user.id},
            {
                "$addToSet": {"badges": data.team_badge_id},
                "$set": {"selected_team_badge": data.team_badge_id}
            }
        )
        
        return {
            "message": f"تم اختيار فريق {badge['name']}",
            "badge": badge
        }
    
    @router.post("/award/{user_id}")
    async def award_badge(user_id: str, data: BadgeAssign, current_user = Depends(get_current_user)):
        """منح شارة لمستخدم (للأدمن فقط)"""
        if current_user.role not in ["owner", "admin"]:
            raise HTTPException(status_code=403, detail="صلاحية غير كافية")
        
        badge = BADGES.get(data.badge_id)
        if not badge:
            raise HTTPException(status_code=400, detail="شارة غير موجودة")
        
        await db.users.update_one(
            {"id": user_id},
            {"$addToSet": {"badges": data.badge_id}}
        )
        
        return {"message": f"تم منح شارة {badge['name']}", "badge": badge}
    
    @router.post("/add-xp")
    async def add_xp_event(data: XPEvent, current_user = Depends(get_current_user)):
        """إضافة نقاط XP (يستخدم من الخادم)"""
        xp_amount = data.amount or XP_SOURCES.get(data.event_type, 0)
        if xp_amount <= 0:
            return {"message": "لا توجد نقاط لإضافتها"}
        
        # Get current user data
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "xp": 1, "level": 1, "badges": 1})
        current_xp = user.get("xp", 0)
        current_level = user.get("level", 1)
        current_badges = user.get("badges", [])
        
        # Add XP
        new_xp = current_xp + xp_amount
        new_level = calculate_level_from_xp(new_xp)
        
        # Check for new level badges
        new_badges = []
        for badge_id, badge in BADGES.items():
            if badge.get("category") == "level":
                min_level = badge.get("min_level", 999)
                if min_level <= new_level and badge_id not in current_badges:
                    new_badges.append(badge_id)
        
        # Update user
        update_data = {"xp": new_xp, "level": new_level}
        if new_badges:
            await db.users.update_one(
                {"id": current_user.id},
                {
                    "$set": update_data,
                    "$addToSet": {"badges": {"$each": new_badges}}
                }
            )
        else:
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": update_data}
            )
        
        level_up = new_level > current_level
        
        return {
            "xp_added": xp_amount,
            "total_xp": new_xp,
            "level": new_level,
            "level_up": level_up,
            "new_badges": [BADGES[b] for b in new_badges] if new_badges else [],
            "progress": get_level_progress(new_xp, new_level)
        }
    
    @router.get("/leaderboard")
    async def get_leaderboard(limit: int = 20):
        """الحصول على قائمة المتصدرين"""
        users = await db.users.find(
            {"is_banned": {"$ne": True}},
            {"_id": 0, "id": 1, "username": 1, "name": 1, "avatar": 1, "level": 1, "xp": 1, "badges": 1, "selected_team_badge": 1}
        ).sort("xp", -1).limit(limit).to_list(length=limit)
        
        leaderboard = []
        for i, user in enumerate(users):
            level_badge = None
            for bid, badge in BADGES.items():
                if badge.get("category") == "level" and badge.get("min_level", 999) <= user.get("level", 1):
                    if not level_badge or badge.get("min_level", 0) > level_badge.get("min_level", 0):
                        level_badge = badge
            
            team_badge = BADGES.get(user.get("selected_team_badge")) if user.get("selected_team_badge") else None
            
            leaderboard.append({
                "rank": i + 1,
                "id": user["id"],
                "username": user.get("username", ""),
                "name": user.get("name", ""),
                "avatar": user.get("avatar"),
                "level": user.get("level", 1),
                "xp": user.get("xp", 0),
                "level_badge": level_badge,
                "team_badge": team_badge,
                "badges_count": len(user.get("badges", []))
            })
        
        return {"leaderboard": leaderboard}
    
    @router.get("/stats/{user_id}")
    async def get_user_stats(user_id: str):
        """الحصول على إحصائيات المستخدم"""
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="المستخدم غير موجود")
        
        # Get message count
        messages_count = await db.room_messages.count_documents({"user_id": user_id})
        
        # Get gifts sent/received
        gifts_sent = await db.gift_history.count_documents({"sender_id": user_id})
        gifts_received = await db.gift_history.count_documents({"receiver_id": user_id})
        
        # Get rooms created
        rooms_created = await db.rooms.count_documents({"owner_id": user_id})
        
        # Get time in rooms (approximate from activity)
        activity_docs = await db.user_activity.find({"user_id": user_id}).to_list(length=1000)
        total_minutes = sum(doc.get("minutes", 0) for doc in activity_docs)
        
        return {
            "user_id": user_id,
            "level": user.get("level", 1),
            "xp": user.get("xp", 0),
            "progress": get_level_progress(user.get("xp", 0), user.get("level", 1)),
            "stats": {
                "messages_sent": messages_count,
                "gifts_sent": gifts_sent,
                "gifts_received": gifts_received,
                "rooms_created": rooms_created,
                "total_minutes": total_minutes,
                "total_hours": round(total_minutes / 60, 1)
            },
            "badges_count": len(user.get("badges", [])),
            "joined_at": user.get("created_at")
        }
    
    return router
