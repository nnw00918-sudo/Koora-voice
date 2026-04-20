"""
Payment System for Koora Voice - PayPal Integration
نظام الدفع والعملات والهدايا والـ VIP
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import httpx
import base64

router = APIRouter(prefix="/payments", tags=["payments"])

# ============================================
# PayPal Configuration
# ============================================

PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'live')  # 'sandbox' or 'live'

# PayPal API URLs
PAYPAL_API_URL = "https://api-m.paypal.com" if PAYPAL_MODE == 'live' else "https://api-m.sandbox.paypal.com"

async def get_paypal_access_token():
    """Get PayPal access token for API calls"""
    auth = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_SECRET}".encode()).decode()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PAYPAL_API_URL}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data="grant_type=client_credentials"
        )
        
        if response.status_code == 200:
            return response.json().get("access_token")
        else:
            raise HTTPException(status_code=500, detail="فشل في الاتصال بـ PayPal")

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
    # هدايا 1 عملة
    {"id": "football", "name": "كرة قدم", "name_en": "Football", "icon": "⚽", "price": 1, "animation": "bounce", "category": "football"},
    {"id": "basketball", "name": "كرة سلة", "name_en": "Basketball", "icon": "🏀", "price": 1, "animation": "bounce", "category": "basketball"},
    {"id": "whistle", "name": "صافرة", "name_en": "Whistle", "icon": "📣", "price": 1, "animation": "pulse", "category": "football"},
    {"id": "jersey", "name": "قميص", "name_en": "Jersey", "icon": "👕", "price": 1, "animation": "float", "category": "sports"},
    {"id": "sneakers", "name": "حذاء", "name_en": "Sneakers", "icon": "👟", "price": 1, "animation": "walk", "category": "sports"},
    {"id": "gloves", "name": "قفازات", "name_en": "Gloves", "icon": "🧤", "price": 1, "animation": "pulse", "category": "football"},
    
    # هدايا 2 عملة
    {"id": "goal", "name": "هدف", "name_en": "Goal", "icon": "🥅", "price": 2, "animation": "shake", "category": "football"},
    {"id": "medal", "name": "ميدالية", "name_en": "Medal", "icon": "🏅", "price": 2, "animation": "glow", "category": "trophy"},
    {"id": "fire", "name": "نار", "name_en": "Fire", "icon": "🔥", "price": 2, "animation": "pulse", "category": "sports"},
    {"id": "star", "name": "نجمة", "name_en": "Star", "icon": "⭐", "price": 2, "animation": "sparkle", "category": "sports"},
    {"id": "heart", "name": "قلب", "name_en": "Heart", "icon": "❤️", "price": 2, "animation": "pulse", "category": "sports"},
    {"id": "clap", "name": "تصفيق", "name_en": "Clap", "icon": "👏", "price": 2, "animation": "shake", "category": "sports"},
    
    # هدايا 3 عملات - الأندية والبطولات
    {"id": "trophy", "name": "كأس", "name_en": "Trophy", "icon": "🏆", "price": 3, "animation": "royal", "category": "trophy"},
    {"id": "crown", "name": "تاج", "name_en": "Crown", "icon": "👑", "price": 3, "animation": "legendary", "category": "player"},
    {"id": "stadium", "name": "ملعب", "name_en": "Stadium", "icon": "🏟️", "price": 3, "animation": "grand", "category": "venue"},
    {"id": "real_madrid", "name": "ريال مدريد", "name_en": "Real Madrid", "icon": "⚪", "price": 3, "animation": "glow", "category": "club"},
    {"id": "barcelona", "name": "برشلونة", "name_en": "Barcelona", "icon": "🔵🔴", "price": 3, "animation": "glow", "category": "club"},
    {"id": "al_hilal", "name": "الهلال", "name_en": "Al Hilal", "icon": "💙", "price": 3, "animation": "glow", "category": "club"},
    {"id": "al_nassr", "name": "النصر", "name_en": "Al Nassr", "icon": "💛", "price": 3, "animation": "glow", "category": "club"},
    {"id": "liverpool", "name": "ليفربول", "name_en": "Liverpool", "icon": "❤️", "price": 3, "animation": "glow", "category": "club"},
    {"id": "goat", "name": "الأفضل", "name_en": "GOAT", "icon": "🐐", "price": 3, "animation": "legendary", "category": "player"},
]

# Pydantic Models
class CoinPurchase(BaseModel):
    package_id: str

class GiftSend(BaseModel):
    gift_id: str
    room_id: str

class VIPSubscribe(BaseModel):
    plan_id: str

class WithdrawRequest(BaseModel):
    amount: int
    method: str

class PayPalCapture(BaseModel):
    order_id: str

# ============================================
# API Endpoints
# ============================================

def get_payments_router(db, get_current_user, stripe_key: str = None):
    """Create payments router with database dependency"""
    
    # ----- العملات -----
    
    @router.get("/coins/packages")
    async def get_coin_packages():
        """الحصول على باقات العملات المتاحة"""
        return {"packages": COIN_PACKAGES}
    
    @router.get("/coins/balance")
    async def get_coin_balance(current_user = Depends(get_current_user)):
        """الحصول على رصيد العملات"""
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "coins": 1, "total_earned": 1, "role": 1})
        
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
        """شراء عملات - إنشاء طلب PayPal"""
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
            # إنشاء طلب PayPal
            access_token = await get_paypal_access_token()
            frontend_url = os.environ.get('FRONTEND_URL', 'https://pitch-chat.preview.emergentagent.com')
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{PAYPAL_API_URL}/v2/checkout/orders",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "intent": "CAPTURE",
                        "purchase_units": [{
                            "reference_id": f"coins_{current_user.id}_{package['id']}",
                            "description": f"{package['coins']} عملة لصوت الكورة",
                            "custom_id": f"{current_user.id}|{package['id']}|coins|{package['coins'] + package.get('bonus', 0)}",
                            "amount": {
                                "currency_code": "USD",
                                "value": f"{package['price']:.2f}"
                            }
                        }],
                        "application_context": {
                            "return_url": f"{frontend_url}/payment/success",
                            "cancel_url": f"{frontend_url}/payment/cancel",
                            "brand_name": "صوت الكورة",
                            "landing_page": "BILLING",
                            "user_action": "PAY_NOW"
                        }
                    }
                )
                
                if response.status_code in [200, 201]:
                    order_data = response.json()
                    approval_url = next(
                        (link["href"] for link in order_data.get("links", []) if link["rel"] == "approve"),
                        None
                    )
                    return {
                        "order_id": order_data["id"],
                        "approval_url": approval_url,
                        "checkout_url": approval_url
                    }
                else:
                    raise HTTPException(status_code=500, detail=f"خطأ PayPal: {response.text}")
        
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"خطأ في الاتصال بـ PayPal: {str(e)}")
    
    @router.post("/coins/capture")
    async def capture_coins_payment(data: PayPalCapture, current_user = Depends(get_current_user)):
        """تأكيد دفع العملات من PayPal"""
        try:
            access_token = await get_paypal_access_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{PAYPAL_API_URL}/v2/checkout/orders/{data.order_id}/capture",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code in [200, 201]:
                    order_data = response.json()
                    
                    if order_data.get("status") == "COMPLETED":
                        # استخراج معلومات الطلب
                        purchase_unit = order_data.get("purchase_units", [{}])[0]
                        custom_id = purchase_unit.get("payments", {}).get("captures", [{}])[0].get("custom_id", "")
                        
                        # Parse custom_id: user_id|package_id|type|coins
                        parts = custom_id.split("|")
                        if len(parts) >= 4:
                            user_id = parts[0]
                            package_id = parts[1]
                            payment_type = parts[2]
                            coins = int(parts[3])
                            
                            # تحقق من عدم استخدام هذا الطلب من قبل
                            existing = await db.transactions.find_one({"paypal_order_id": data.order_id})
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
                                "paypal_order_id": data.order_id,
                                "created_at": datetime.now(timezone.utc).isoformat()
                            })
                            
                            return {"message": "تم إضافة العملات بنجاح!", "coins": coins, "success": True}
                    
                    raise HTTPException(status_code=400, detail="لم يكتمل الدفع")
                else:
                    raise HTTPException(status_code=400, detail=f"خطأ في تأكيد الدفع: {response.text}")
        
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"خطأ في الاتصال بـ PayPal: {str(e)}")
    
    # ----- الهدايا -----
    
    @router.get("/gifts")
    async def get_gifts():
        """الحصول على قائمة الهدايا"""
        return {"gifts": GIFTS}
    
    @router.post("/gifts/send")
    async def send_gift(data: GiftSend, current_user = Depends(get_current_user)):
        """إرسال هدية للغرفة"""
        gift = next((g for g in GIFTS if g["id"] == data.gift_id), None)
        if not gift:
            raise HTTPException(status_code=400, detail="هدية غير موجودة")
        
        room = await db.rooms.find_one({"id": data.room_id})
        if not room:
            raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
        
        sender = await db.users.find_one({"id": current_user.id})
        is_owner = sender.get("role") == "owner"
        
        if not is_owner and sender.get("coins", 0) < gift["price"]:
            raise HTTPException(status_code=400, detail="رصيد غير كافٍ")
        
        if not is_owner:
            await db.users.update_one(
                {"id": current_user.id},
                {"$inc": {"coins": -gift["price"]}}
            )
        
        app_owner = await db.users.find_one({"role": "owner"})
        if app_owner and app_owner["id"] != current_user.id:
            await db.users.update_one(
                {"id": app_owner["id"]},
                {"$inc": {"coins": gift["price"], "total_earned": gift["price"]}}
            )
        
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
        
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"xp": 10}}
        )
        
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
        """سجل الهدايا"""
        sent = await db.gift_history.find(
            {"sender_id": current_user.id}
        ).sort("created_at", -1).limit(50).to_list(length=50)
        
        received = await db.gift_history.find(
            {"receiver_id": current_user.id}
        ).sort("created_at", -1).limit(50).to_list(length=50)
        
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
        
        if user.get("role") == "owner":
            return {
                "is_vip": True,
                "vip_until": "2099-12-31T23:59:59Z",
                "vip_plan": "owner_lifetime",
                "is_owner": True
            }
        
        is_vip = user.get("is_vip", False)
        vip_until = user.get("vip_until")
        
        if is_vip and vip_until:
            vip_until_dt = datetime.fromisoformat(vip_until.replace('Z', '+00:00'))
            if vip_until_dt < datetime.now(timezone.utc):
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
        """الاشتراك في VIP - PayPal"""
        plan = next((p for p in VIP_PLANS if p["id"] == data.plan_id), None)
        if not plan:
            raise HTTPException(status_code=400, detail="باقة غير موجودة")
        
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "role": 1})
        if user.get("role") == "owner":
            vip_until = datetime.now(timezone.utc) + timedelta(days=365*10)
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
            access_token = await get_paypal_access_token()
            frontend_url = os.environ.get('FRONTEND_URL', 'https://pitch-chat.preview.emergentagent.com')
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{PAYPAL_API_URL}/v2/checkout/orders",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "intent": "CAPTURE",
                        "purchase_units": [{
                            "reference_id": f"vip_{current_user.id}_{plan['id']}",
                            "description": plan["name"],
                            "custom_id": f"{current_user.id}|{plan['id']}|vip|{plan['duration_days']}",
                            "amount": {
                                "currency_code": "USD",
                                "value": f"{plan['price']:.2f}"
                            }
                        }],
                        "application_context": {
                            "return_url": f"{frontend_url}/payment/success",
                            "cancel_url": f"{frontend_url}/payment/cancel",
                            "brand_name": "صوت الكورة VIP",
                            "landing_page": "BILLING",
                            "user_action": "PAY_NOW"
                        }
                    }
                )
                
                if response.status_code in [200, 201]:
                    order_data = response.json()
                    approval_url = next(
                        (link["href"] for link in order_data.get("links", []) if link["rel"] == "approve"),
                        None
                    )
                    return {
                        "order_id": order_data["id"],
                        "approval_url": approval_url,
                        "checkout_url": approval_url
                    }
                else:
                    raise HTTPException(status_code=500, detail=f"خطأ PayPal: {response.text}")
        
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"خطأ في الاتصال بـ PayPal: {str(e)}")
    
    @router.post("/vip/capture")
    async def capture_vip_payment(data: PayPalCapture, current_user = Depends(get_current_user)):
        """تأكيد دفع VIP من PayPal"""
        try:
            access_token = await get_paypal_access_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{PAYPAL_API_URL}/v2/checkout/orders/{data.order_id}/capture",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code in [200, 201]:
                    order_data = response.json()
                    
                    if order_data.get("status") == "COMPLETED":
                        purchase_unit = order_data.get("purchase_units", [{}])[0]
                        custom_id = purchase_unit.get("payments", {}).get("captures", [{}])[0].get("custom_id", "")
                        
                        parts = custom_id.split("|")
                        if len(parts) >= 4:
                            user_id = parts[0]
                            plan_id = parts[1]
                            payment_type = parts[2]
                            duration_days = int(parts[3])
                            
                            existing = await db.transactions.find_one({"paypal_order_id": data.order_id})
                            if existing:
                                return {"message": "تم تفعيل VIP مسبقاً"}
                            
                            vip_until = datetime.now(timezone.utc) + timedelta(days=duration_days)
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
                                "paypal_order_id": data.order_id,
                                "created_at": datetime.now(timezone.utc).isoformat()
                            })
                            
                            return {"message": "تم تفعيل VIP بنجاح!", "vip_until": vip_until.isoformat(), "success": True}
                    
                    raise HTTPException(status_code=400, detail="لم يكتمل الدفع")
                else:
                    raise HTTPException(status_code=400, detail=f"خطأ في تأكيد الدفع: {response.text}")
        
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"خطأ في الاتصال بـ PayPal: {str(e)}")
    
    # ----- PayPal Client ID للـ Frontend -----
    
    @router.get("/paypal/client-id")
    async def get_paypal_client_id():
        """إرجاع PayPal Client ID للـ Frontend"""
        return {"client_id": PAYPAL_CLIENT_ID, "mode": PAYPAL_MODE}
    
    # ----- السحب -----
    
    @router.get("/withdraw/balance")
    async def get_withdrawable_balance(current_user = Depends(get_current_user)):
        """الرصيد القابل للسحب"""
        user = await db.users.find_one({"id": current_user.id})
        total_earned = user.get("total_earned", 0)
        
        min_withdraw = 1000
        can_withdraw = total_earned >= min_withdraw
        
        return {
            "total_earned": total_earned,
            "usd_value": round(total_earned * 0.007, 2),
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
        
        withdraw_request = {
            "user_id": current_user.id,
            "amount": data.amount,
            "usd_amount": usd_amount,
            "method": data.method,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.withdraw_requests.insert_one(withdraw_request)
        
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
