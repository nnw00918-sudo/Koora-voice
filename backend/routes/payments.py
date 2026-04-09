"""
Payment System for Koora Voice
نظام الدفع والعملات والهدايا والـ VIP
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os

router = APIRouter(prefix="/payments", tags=["payments"])

# ============================================
# تعريف العملات والباقات
# ============================================

COIN_PACKAGES = [
    {"id": "coins_100", "coins": 100, "price": 0.99, "price_display": "$0.99", "bonus": 0},
    {"id": "coins_550", "coins": 550, "price": 4.99, "price_display": "$4.99", "bonus": 50, "popular": True},
    {"id": "coins_1200", "coins": 1200, "price": 9.99, "price_display": "$9.99", "bonus": 200},
    {"id": "coins_3500", "coins": 3500, "price": 24.99, "price_display": "$24.99", "bonus": 500, "best_value": True},
]

VIP_PLANS = [
    {
        "id": "vip_monthly",
        "name": "VIP شهري",
        "name_en": "Monthly VIP",
        "price": 4.99,
        "price_display": "$4.99/شهر",
        "duration_days": 30,
        "features": [
            "شارة VIP ذهبية",
            "اسم بلون مميز",
            "أولوية في رفع اليد",
            "إطار مميز للصورة",
            "إرسال صور في الغرف",
            "رسائل ملونة ملفتة"
        ]
    },
    {
        "id": "vip_yearly",
        "name": "VIP سنوي",
        "name_en": "Yearly VIP",
        "price": 39.99,
        "price_display": "$39.99/سنة",
        "duration_days": 365,
        "discount": "33%",
        "features": [
            "جميع مميزات الشهري",
            "خصم 33%",
            "شارة VIP بلاتينية",
            "200 عملة مجانية شهرياً"
        ]
    }
]

# ============================================
# تعريف الهدايا الرياضية
# ============================================

GIFTS = [
    # هدايا بسيطة (1-10 عملات) - كرة القدم
    {"id": "football", "name": "كرة قدم", "name_en": "Football", "icon": "⚽", "price": 1, "animation": "bounce", "category": "football"},
    {"id": "goal", "name": "هدف", "name_en": "Goal", "icon": "🥅", "price": 5, "animation": "shake", "category": "football"},
    {"id": "whistle", "name": "صافرة", "name_en": "Whistle", "icon": "📣", "price": 10, "animation": "pulse", "category": "football"},
    
    # هدايا متوسطة (20-50 عملات) - كرة السلة
    {"id": "basketball", "name": "كرة سلة", "name_en": "Basketball", "icon": "🏀", "price": 20, "animation": "bounce", "category": "basketball"},
    {"id": "jersey", "name": "قميص", "name_en": "Jersey", "icon": "👕", "price": 30, "animation": "float", "category": "sports"},
    {"id": "sneakers", "name": "حذاء رياضي", "name_en": "Sneakers", "icon": "👟", "price": 50, "animation": "walk", "category": "sports"},
    
    # شعارات الأندية (100-300 عملات)
    {"id": "real_madrid", "name": "ريال مدريد", "name_en": "Real Madrid", "icon": "⚪", "price": 100, "animation": "glow", "category": "club"},
    {"id": "barcelona", "name": "برشلونة", "name_en": "Barcelona", "icon": "🔵🔴", "price": 100, "animation": "glow", "category": "club"},
    {"id": "al_hilal", "name": "الهلال", "name_en": "Al Hilal", "icon": "💙", "price": 100, "animation": "glow", "category": "club"},
    {"id": "al_nassr", "name": "النصر", "name_en": "Al Nassr", "icon": "💛", "price": 100, "animation": "glow", "category": "club"},
    {"id": "liverpool", "name": "ليفربول", "name_en": "Liverpool", "icon": "❤️", "price": 100, "animation": "glow", "category": "club"},
    {"id": "man_city", "name": "مان سيتي", "name_en": "Man City", "icon": "🩵", "price": 100, "animation": "glow", "category": "club"},
    
    # البطولات (200-500 عملات)
    {"id": "champions_league", "name": "دوري الأبطال", "name_en": "Champions League", "icon": "🏆", "price": 200, "animation": "sparkle", "category": "trophy"},
    {"id": "world_cup", "name": "كأس العالم", "name_en": "World Cup", "icon": "🏆", "price": 300, "animation": "royal", "category": "trophy"},
    {"id": "golden_boot", "name": "الحذاء الذهبي", "name_en": "Golden Boot", "icon": "👢", "price": 250, "animation": "glow", "category": "trophy"},
    {"id": "ballon_dor", "name": "الكرة الذهبية", "name_en": "Ballon d'Or", "icon": "🥇", "price": 500, "animation": "royal", "category": "trophy"},
    
    # اللاعبين الأسطوريين (500-2000 عملات)
    {"id": "goat", "name": "الأفضل", "name_en": "GOAT", "icon": "🐐", "price": 500, "animation": "legendary", "category": "player"},
    {"id": "number_10", "name": "رقم 10", "name_en": "Number 10", "icon": "🔟", "price": 700, "animation": "glow", "category": "player"},
    {"id": "hat_trick", "name": "هاتريك", "name_en": "Hat Trick", "icon": "🎩⚽⚽⚽", "price": 1000, "animation": "fireworks", "category": "achievement"},
    {"id": "stadium", "name": "ملعب", "name_en": "Stadium", "icon": "🏟️", "price": 1500, "animation": "grand", "category": "venue"},
    {"id": "legend", "name": "أسطورة", "name_en": "Legend", "icon": "👑⚽", "price": 2000, "animation": "legendary", "category": "player"},
]

# Pydantic Models
class CoinPurchase(BaseModel):
    package_id: str

class GiftSend(BaseModel):
    gift_id: str
    room_id: str  # إرسال الهدية للغرفة

class VIPSubscribe(BaseModel):
    plan_id: str

class WithdrawRequest(BaseModel):
    amount: int
    method: str  # paypal, bank_transfer

# ============================================
# API Endpoints
# ============================================

def get_payments_router(db, get_current_user, stripe_key: str = None):
    """Create payments router with database dependency"""
    
    import stripe
    stripe.api_key = stripe_key or os.environ.get('STRIPE_SECRET_KEY')
    
    # ----- العملات -----
    
    @router.get("/coins/packages")
    async def get_coin_packages():
        """الحصول على باقات العملات المتاحة"""
        return {"packages": COIN_PACKAGES}
    
    @router.get("/coins/balance")
    async def get_coin_balance(current_user = Depends(get_current_user)):
        """الحصول على رصيد العملات"""
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "coins": 1, "total_earned": 1, "role": 1})
        
        # Owner يحصل على رصيد غير محدود
        if user.get("role") == "owner":
            return {
                "coins": 999999,
                "total_earned": user.get("total_earned", 0),
                "is_owner": True
            }
        
        return {
            "coins": user.get("coins", 0),
            "total_earned": user.get("total_earned", 0),
            "is_owner": False
        }
    
    @router.post("/coins/purchase")
    async def purchase_coins(data: CoinPurchase, current_user = Depends(get_current_user)):
        """شراء عملات - إنشاء جلسة Stripe"""
        package = next((p for p in COIN_PACKAGES if p["id"] == data.package_id), None)
        if not package:
            raise HTTPException(status_code=400, detail="باقة غير موجودة")
        
        # Owner يحصل على العملات مجاناً
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "role": 1})
        if user.get("role") == "owner":
            coins = package["coins"] + package.get("bonus", 0)
            await db.users.update_one(
                {"id": current_user.id},
                {"$inc": {"coins": coins}}
            )
            await db.transactions.insert_one({
                "user_id": current_user.id,
                "type": "owner_free",
                "amount": coins,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {"message": f"تم إضافة {coins} عملة مجاناً (Owner)", "coins": coins, "free": True}
        
        try:
            # إنشاء جلسة Stripe Checkout
            frontend_url = os.environ.get('FRONTEND_URL', 'https://pitch-chat.preview.emergentagent.com')
            
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'{package["coins"]} عملة',
                            'description': f'باقة {package["coins"]} عملة لصوت الكورة',
                        },
                        'unit_amount': int(package["price"] * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f'{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{frontend_url}/payment/cancel',
                metadata={
                    'user_id': current_user.id,
                    'package_id': package["id"],
                    'coins': str(package["coins"] + package.get("bonus", 0)),
                    'type': 'coins'
                }
            )
            
            return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"خطأ في إنشاء جلسة الدفع: {str(e)}")
    
    @router.post("/coins/webhook")
    async def stripe_webhook(request_body: dict):
        """Stripe Webhook لمعالجة الدفع"""
        # This would be called by Stripe
        event_type = request_body.get("type")
        
        if event_type == "checkout.session.completed":
            session = request_body.get("data", {}).get("object", {})
            metadata = session.get("metadata", {})
            
            user_id = metadata.get("user_id")
            payment_type = metadata.get("type")
            
            if payment_type == "coins":
                coins = int(metadata.get("coins", 0))
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"coins": coins}}
                )
                
                # سجل المعاملة
                await db.transactions.insert_one({
                    "user_id": user_id,
                    "type": "purchase",
                    "amount": coins,
                    "session_id": session.get("id"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            elif payment_type == "vip":
                days = int(metadata.get("duration_days", 30))
                plan_id = metadata.get("plan_id")
                
                # تحديث حالة VIP
                vip_until = datetime.now(timezone.utc) + timedelta(days=days)
                await db.users.update_one(
                    {"id": user_id},
                    {
                        "$set": {
                            "is_vip": True,
                            "vip_until": vip_until.isoformat(),
                            "vip_plan": plan_id
                        }
                    }
                )
                
                # إضافة شارة VIP
                await db.users.update_one(
                    {"id": user_id},
                    {"$addToSet": {"badges": "vip_member"}}
                )
        
        return {"received": True}
    
    # تأكيد الدفع يدوياً (للتطوير)
    @router.post("/coins/confirm-purchase")
    async def confirm_purchase(session_id: str, current_user = Depends(get_current_user)):
        """تأكيد الدفع بعد نجاح Stripe"""
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            
            if session.payment_status == "paid":
                metadata = session.metadata
                
                if metadata.get("type") == "coins":
                    coins = int(metadata.get("coins", 0))
                    
                    # تحقق أن هذه الجلسة لم تُستخدم من قبل
                    existing = await db.transactions.find_one({"session_id": session_id})
                    if existing:
                        return {"message": "تم إضافة العملات مسبقاً", "coins": coins}
                    
                    # إضافة العملات
                    await db.users.update_one(
                        {"id": current_user.id},
                        {"$inc": {"coins": coins}}
                    )
                    
                    # سجل المعاملة
                    await db.transactions.insert_one({
                        "user_id": current_user.id,
                        "type": "purchase",
                        "amount": coins,
                        "session_id": session_id,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    
                    return {"message": "تم إضافة العملات بنجاح", "coins": coins}
                
                elif metadata.get("type") == "vip":
                    days = int(metadata.get("duration_days", 30))
                    plan_id = metadata.get("plan_id")
                    
                    # تحقق من عدم الاستخدام المسبق
                    existing = await db.transactions.find_one({"session_id": session_id})
                    if existing:
                        return {"message": "تم تفعيل VIP مسبقاً"}
                    
                    vip_until = datetime.now(timezone.utc) + timedelta(days=days)
                    await db.users.update_one(
                        {"id": current_user.id},
                        {
                            "$set": {
                                "is_vip": True,
                                "vip_until": vip_until.isoformat(),
                                "vip_plan": plan_id
                            },
                            "$addToSet": {"badges": "vip_member"}
                        }
                    )
                    
                    await db.transactions.insert_one({
                        "user_id": current_user.id,
                        "type": "vip_subscription",
                        "plan_id": plan_id,
                        "session_id": session_id,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    
                    return {"message": "تم تفعيل VIP بنجاح", "vip_until": vip_until.isoformat()}
            
            raise HTTPException(status_code=400, detail="الدفع لم يكتمل")
        
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # ----- الهدايا -----
    
    @router.get("/gifts")
    async def get_gifts():
        """الحصول على قائمة الهدايا"""
        return {"gifts": GIFTS}
    
    @router.post("/gifts/send")
    async def send_gift(data: GiftSend, current_user = Depends(get_current_user)):
        """إرسال هدية للغرفة - الأرباح تذهب للـ Owner فقط"""
        gift = next((g for g in GIFTS if g["id"] == data.gift_id), None)
        if not gift:
            raise HTTPException(status_code=400, detail="هدية غير موجودة")
        
        # جلب معلومات الغرفة
        room = await db.rooms.find_one({"id": data.room_id})
        if not room:
            raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
        
        # تحقق من المرسل
        sender = await db.users.find_one({"id": current_user.id})
        is_owner = sender.get("role") == "owner"
        
        # Owner لا يحتاج رصيد
        if not is_owner and sender.get("coins", 0) < gift["price"]:
            raise HTTPException(status_code=400, detail="رصيد غير كافٍ")
        
        # خصم من المرسل (إلا إذا كان Owner)
        if not is_owner:
            await db.users.update_one(
                {"id": current_user.id},
                {"$inc": {"coins": -gift["price"]}}
            )
        
        # إضافة كل العملات للـ Owner فقط (100% من قيمة الهدية)
        # جلب الـ Owner
        app_owner = await db.users.find_one({"role": "owner"})
        if app_owner and app_owner["id"] != current_user.id:
            await db.users.update_one(
                {"id": app_owner["id"]},
                {"$inc": {"coins": gift["price"], "total_earned": gift["price"]}}
            )
        
        # سجل الهدية
        gift_record = {
            "sender_id": current_user.id,
            "sender_username": current_user.username,
            "room_id": data.room_id,
            "owner_earned": gift["price"],
            "gift_id": gift["id"],
            "gift_name": gift["name"],
            "gift_icon": gift["icon"],
            "price": gift["price"],
            "free_gift": is_owner,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.gift_history.insert_one(gift_record)
        
        # إضافة XP للمرسل
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"xp": 10}}
        )
        
        # جلب الرصيد المحدث
        updated_sender = await db.users.find_one({"id": current_user.id})
        
        return {
            "message": f"تم إرسال {gift['name']} للغرفة",
            "gift": gift,
            "animation": gift["animation"],
            "remaining_coins": updated_sender.get("coins", 0),
            "sender_username": current_user.username
        }
    
    @router.get("/gifts/history")
    async def get_gift_history(current_user = Depends(get_current_user)):
        """سجل الهدايا المرسلة والمستلمة"""
        sent = await db.gift_history.find(
            {"sender_id": current_user.id}
        ).sort("created_at", -1).limit(50).to_list(length=50)
        
        received = await db.gift_history.find(
            {"receiver_id": current_user.id}
        ).sort("created_at", -1).limit(50).to_list(length=50)
        
        # إزالة _id
        for g in sent + received:
            g.pop("_id", None)
        
        return {"sent": sent, "received": received}
    
    # ----- VIP -----
    
    @router.get("/vip/plans")
    async def get_vip_plans():
        """الحصول على باقات VIP"""
        return {"plans": VIP_PLANS}
    
    @router.get("/vip/status")
    async def get_vip_status(current_user = Depends(get_current_user)):
        """حالة اشتراك VIP"""
        user = await db.users.find_one(
            {"id": current_user.id},
            {"_id": 0, "is_vip": 1, "vip_until": 1, "vip_plan": 1, "role": 1}
        )
        
        # Owner دائماً VIP
        if user.get("role") == "owner":
            return {
                "is_vip": True,
                "vip_until": "2099-12-31T23:59:59Z",
                "vip_plan": "owner_lifetime",
                "is_owner": True
            }
        
        is_vip = user.get("is_vip", False)
        vip_until = user.get("vip_until")
        
        # تحقق من انتهاء الاشتراك
        if is_vip and vip_until:
            vip_until_dt = datetime.fromisoformat(vip_until.replace('Z', '+00:00'))
            if vip_until_dt < datetime.now(timezone.utc):
                # انتهى الاشتراك
                await db.users.update_one(
                    {"id": current_user.id},
                    {"$set": {"is_vip": False}}
                )
                is_vip = False
        
        return {
            "is_vip": is_vip,
            "vip_until": vip_until,
            "vip_plan": user.get("vip_plan"),
            "is_owner": False
        }
    
    @router.post("/vip/subscribe")
    async def subscribe_vip(data: VIPSubscribe, current_user = Depends(get_current_user)):
        """الاشتراك في VIP"""
        plan = next((p for p in VIP_PLANS if p["id"] == data.plan_id), None)
        if not plan:
            raise HTTPException(status_code=400, detail="باقة غير موجودة")
        
        # Owner يحصل على VIP مجاناً
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "role": 1})
        if user.get("role") == "owner":
            vip_until = datetime.now(timezone.utc) + timedelta(days=365*10)  # 10 سنوات
            await db.users.update_one(
                {"id": current_user.id},
                {
                    "$set": {
                        "is_vip": True,
                        "vip_until": vip_until.isoformat(),
                        "vip_plan": "owner_lifetime"
                    },
                    "$addToSet": {"badges": "vip_member"}
                }
            )
            return {"message": "تم تفعيل VIP مجاناً (Owner)", "vip_until": vip_until.isoformat(), "free": True}
        
        try:
            frontend_url = os.environ.get('FRONTEND_URL', 'https://pitch-chat.preview.emergentagent.com')
            
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': plan["name"],
                            'description': ' | '.join(plan["features"][:3]),
                        },
                        'unit_amount': int(plan["price"] * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f'{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{frontend_url}/payment/cancel',
                metadata={
                    'user_id': current_user.id,
                    'plan_id': plan["id"],
                    'duration_days': str(plan["duration_days"]),
                    'type': 'vip'
                }
            )
            
            return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"خطأ في إنشاء جلسة الدفع: {str(e)}")
    
    # ----- السحب -----
    
    @router.get("/withdraw/balance")
    async def get_withdrawable_balance(current_user = Depends(get_current_user)):
        """الرصيد القابل للسحب"""
        user = await db.users.find_one({"id": current_user.id})
        total_earned = user.get("total_earned", 0)
        
        # الحد الأدنى للسحب: 1000 عملة = $7
        min_withdraw = 1000
        can_withdraw = total_earned >= min_withdraw
        
        return {
            "total_earned": total_earned,
            "usd_value": round(total_earned * 0.007, 2),  # كل 1000 عملة = $7
            "min_withdraw": min_withdraw,
            "can_withdraw": can_withdraw
        }
    
    @router.post("/withdraw/request")
    async def request_withdrawal(data: WithdrawRequest, current_user = Depends(get_current_user)):
        """طلب سحب الأرباح"""
        user = await db.users.find_one({"id": current_user.id})
        total_earned = user.get("total_earned", 0)
        
        if data.amount > total_earned:
            raise HTTPException(status_code=400, detail="رصيد غير كافٍ")
        
        if data.amount < 1000:
            raise HTTPException(status_code=400, detail="الحد الأدنى للسحب 1000 عملة")
        
        usd_amount = round(data.amount * 0.007, 2)
        
        # إنشاء طلب السحب
        withdraw_request = {
            "user_id": current_user.id,
            "amount": data.amount,
            "usd_amount": usd_amount,
            "method": data.method,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.withdraw_requests.insert_one(withdraw_request)
        
        # خصم من الرصيد
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"total_earned": -data.amount}}
        )
        
        return {
            "message": "تم إرسال طلب السحب بنجاح",
            "amount": data.amount,
            "usd_amount": usd_amount,
            "status": "pending"
        }
    
    # ----- المعاملات -----
    
    @router.get("/transactions")
    async def get_transactions(current_user = Depends(get_current_user), limit: int = 50):
        """سجل المعاملات"""
        transactions = await db.transactions.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        for t in transactions:
            t.pop("_id", None)
        
        return {"transactions": transactions}
    
    return router
