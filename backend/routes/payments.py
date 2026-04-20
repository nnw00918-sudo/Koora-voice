"""
Feature Subscriptions - PayPal
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import os, httpx, base64

router = APIRouter(prefix="/payments", tags=["payments"])

PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')
PAYPAL_API_URL = "https://api-m.paypal.com"

async def get_paypal_token():
    auth = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_SECRET}".encode()).decode()
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{PAYPAL_API_URL}/v1/oauth2/token",
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
            data="grant_type=client_credentials")
        return r.json().get("access_token") if r.status_code == 200 else None

SUBSCRIPTIONS = [
    {"id": "photos_monthly", "feature": "photos", "name": "إرسال صور", "price": 0.99, "duration_days": 30, "period": "monthly"},
    {"id": "photos_yearly", "feature": "photos", "name": "إرسال صور", "price": 40, "duration_days": 365, "period": "yearly"},
    {"id": "badge_monthly", "feature": "vip_badge", "name": "شارة VIP", "price": 0.99, "duration_days": 30, "period": "monthly"},
    {"id": "badge_yearly", "feature": "vip_badge", "name": "شارة VIP", "price": 40, "duration_days": 365, "period": "yearly"},
    {"id": "colored_monthly", "feature": "colored_messages", "name": "رسائل ملونة", "price": 0.99, "duration_days": 30, "period": "monthly"},
    {"id": "colored_yearly", "feature": "colored_messages", "name": "رسائل ملونة", "price": 40, "duration_days": 365, "period": "yearly"},
    {"id": "frame_monthly", "feature": "profile_frame", "name": "إطار مميز", "price": 0.99, "duration_days": 30, "period": "monthly"},
    {"id": "frame_yearly", "feature": "profile_frame", "name": "إطار مميز", "price": 40, "duration_days": 365, "period": "yearly"},
    {"id": "all_monthly", "feature": "all", "name": "جميع المميزات", "price": 4.99, "duration_days": 30, "period": "monthly"},
    {"id": "all_yearly", "feature": "all", "name": "جميع المميزات", "price": 49.99, "duration_days": 365, "period": "yearly"},
]

ALL_FEATURES = ["photos", "vip_badge", "colored_messages", "profile_frame"]

class Subscribe(BaseModel):
    subscription_id: str

class PayPalCapture(BaseModel):
    order_id: str

def get_payments_router(db, get_current_user, stripe_key=None):
    
    @router.get("/subscriptions")
    async def get_subscriptions():
        return {"subscriptions": SUBSCRIPTIONS}
    
    @router.get("/features/status")
    async def get_features_status(current_user=Depends(get_current_user)):
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        if user.get("role") == "owner":
            return {"photos": True, "vip_badge": True, "colored_messages": True, "profile_frame": True, "is_owner": True}
        features = user.get("features", {})
        now = datetime.now(timezone.utc)
        result = {}
        for f in ALL_FEATURES:
            exp = features.get(f)
            if exp:
                result[f] = datetime.fromisoformat(exp.replace('Z', '+00:00')) > now
            else:
                result[f] = False
        result["is_owner"] = False
        return result
    
    @router.post("/subscribe")
    async def subscribe(data: Subscribe, current_user=Depends(get_current_user)):
        sub = next((s for s in SUBSCRIPTIONS if s["id"] == data.subscription_id), None)
        if not sub:
            raise HTTPException(400, "اشتراك غير موجود")
        user = await db.users.find_one({"id": current_user.id})
        if user.get("role") == "owner":
            exp = datetime.now(timezone.utc) + timedelta(days=3650)
            features_update = {f"features.{f}": exp.isoformat() for f in (ALL_FEATURES if sub["feature"] == "all" else [sub["feature"]])}
            await db.users.update_one({"id": current_user.id}, {"$set": features_update})
            return {"message": "تم التفعيل مجاناً", "free": True}
        token = await get_paypal_token()
        if not token:
            raise HTTPException(500, "خطأ PayPal")
        frontend_url = os.environ.get('FRONTEND_URL', 'https://kooravoice.com')
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{PAYPAL_API_URL}/v2/checkout/orders",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "description": sub["name"],
                        "custom_id": f"{current_user.id}|{sub['id']}|{sub['feature']}|{sub['duration_days']}",
                        "amount": {"currency_code": "USD", "value": f"{sub['price']:.2f}"}
                    }],
                    "application_context": {"brand_name": "صوت الكورة", "return_url": f"{frontend_url}/payment/success", "cancel_url": f"{frontend_url}/payment/cancel"}
                })
            if r.status_code in [200, 201]:
                data = r.json()
                url = next((l["href"] for l in data.get("links", []) if l["rel"] == "approve"), None)
                return {"order_id": data["id"], "checkout_url": url}
        raise HTTPException(500, "خطأ")
    
    @router.post("/capture")
    async def capture(data: PayPalCapture, current_user=Depends(get_current_user)):
        token = await get_paypal_token()
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{PAYPAL_API_URL}/v2/checkout/orders/{data.order_id}/capture",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
            if r.status_code in [200, 201] and r.json().get("status") == "COMPLETED":
                custom = r.json().get("purchase_units", [{}])[0].get("payments", {}).get("captures", [{}])[0].get("custom_id", "")
                parts = custom.split("|")
                if len(parts) >= 4:
                    feature, days = parts[2], int(parts[3])
                    exp = datetime.now(timezone.utc) + timedelta(days=days)
                    features_to_update = ALL_FEATURES if feature == "all" else [feature]
                    update = {f"features.{f}": exp.isoformat() for f in features_to_update}
                    await db.users.update_one({"id": current_user.id}, {"$set": update})
                    return {"message": "تم التفعيل بنجاح!", "success": True, "expires": exp.isoformat()}
        raise HTTPException(400, "فشل الدفع")
    
    @router.get("/paypal/client-id")
    async def get_client_id():
        return {"client_id": PAYPAL_CLIENT_ID}
    
    return router
