"""
Feature Subscriptions - Apple In-App Purchases (iTunes)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

# Apple App Store URLs
APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt"
APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt"

# App Store Shared Secret (for receipt validation)
APPLE_SHARED_SECRET = os.environ.get('APPLE_SHARED_SECRET', '')

# Product IDs from App Store Connect
APPLE_PRODUCTS = {
    "com.kooravoice.all.monthly": {"feature": "all", "duration_days": 30, "price": 4.99},
    "com.kooravoice.all.yearly": {"feature": "all", "duration_days": 365, "price": 49.99},
}

ALL_FEATURES = ["photos", "vip_badge", "colored_messages", "profile_frame"]

class AppleReceiptValidation(BaseModel):
    receipt_data: str
    product_id: str
    transaction_id: Optional[str] = None

class SyncApplePurchase(BaseModel):
    productId: str
    transactionId: Optional[str] = None

async def validate_apple_receipt(receipt_data: str, is_sandbox: bool = False):
    """Validate receipt with Apple's servers"""
    url = APPLE_SANDBOX_URL if is_sandbox else APPLE_PRODUCTION_URL
    
    payload = {
        "receipt-data": receipt_data,
        "password": APPLE_SHARED_SECRET,
        "exclude-old-transactions": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            result = response.json()
            
            # Status 21007 means sandbox receipt sent to production
            if result.get("status") == 21007 and not is_sandbox:
                return await validate_apple_receipt(receipt_data, is_sandbox=True)
            
            return result
    except Exception as e:
        logger.error(f"Apple receipt validation error: {e}")
        return None

def get_payments_router(db, get_current_user, stripe_key=None):
    
    @router.get("/subscriptions")
    async def get_subscriptions():
        """Return available Apple IAP subscriptions"""
        subscriptions = [
            {
                "id": "all_monthly",
                "apple_product_id": "com.kooravoice.all.monthly",
                "feature": "all",
                "name": "جميع المميزات - شهري",
                "price": 4.99,
                "duration_days": 30,
                "period": "monthly"
            },
            {
                "id": "all_yearly",
                "apple_product_id": "com.kooravoice.all.yearly",
                "feature": "all",
                "name": "جميع المميزات - سنوي",
                "price": 49.99,
                "duration_days": 365,
                "period": "yearly"
            },
        ]
        return {"subscriptions": subscriptions}
    
    @router.get("/features/status")
    async def get_features_status(current_user=Depends(get_current_user)):
        """Check which features the user has access to"""
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        if not user:
            raise HTTPException(404, "المستخدم غير موجود")
        
        # Owner has all features forever
        if user.get("role") == "owner":
            return {
                "photos": True,
                "vip_badge": True,
                "colored_messages": True,
                "profile_frame": True,
                "is_owner": True
            }
        
        features = user.get("features", {})
        now = datetime.now(timezone.utc)
        result = {}
        
        for f in ALL_FEATURES:
            exp = features.get(f)
            if exp:
                try:
                    exp_dt = datetime.fromisoformat(exp.replace('Z', '+00:00'))
                    result[f] = exp_dt > now
                except:
                    result[f] = False
            else:
                result[f] = False
        
        result["is_owner"] = False
        return result
    
    @router.post("/apple/validate-receipt")
    async def validate_apple_receipt_endpoint(data: AppleReceiptValidation, current_user=Depends(get_current_user)):
        """
        Validate Apple receipt and grant features.
        This is called after a successful in-app purchase on iOS.
        """
        product_info = APPLE_PRODUCTS.get(data.product_id)
        if not product_info:
            raise HTTPException(400, "منتج غير صالح")
        
        # Check if user is owner (gets free access)
        user = await db.users.find_one({"id": current_user.id})
        if user and user.get("role") == "owner":
            exp = datetime.now(timezone.utc) + timedelta(days=3650)
            features_update = {f"features.{f}": exp.isoformat() for f in ALL_FEATURES}
            await db.users.update_one({"id": current_user.id}, {"$set": features_update})
            return {"success": True, "message": "تم التفعيل مجاناً", "expires": exp.isoformat()}
        
        # Validate receipt with Apple
        validation_result = await validate_apple_receipt(data.receipt_data)
        
        if not validation_result:
            raise HTTPException(500, "فشل التحقق من Apple")
        
        status = validation_result.get("status")
        if status != 0:
            error_messages = {
                21000: "App Store لا يستطيع قراءة الإيصال",
                21002: "بيانات الإيصال غير صحيحة",
                21003: "الإيصال غير موثق",
                21004: "السر المشترك غير صحيح",
                21005: "خادم Apple غير متاح",
                21006: "الاشتراك منتهي",
                21008: "إيصال إنتاج في بيئة sandbox",
            }
            error_msg = error_messages.get(status, f"خطأ في التحقق: {status}")
            raise HTTPException(400, error_msg)
        
        # Check for valid in_app purchases
        receipt_info = validation_result.get("receipt", {})
        in_app = receipt_info.get("in_app", [])
        
        # Find the matching purchase
        valid_purchase = None
        for purchase in in_app:
            if purchase.get("product_id") == data.product_id:
                valid_purchase = purchase
                break
        
        # Also check latest_receipt_info for subscriptions
        latest_info = validation_result.get("latest_receipt_info", [])
        for purchase in latest_info:
            if purchase.get("product_id") == data.product_id:
                valid_purchase = purchase
                break
        
        if not valid_purchase:
            raise HTTPException(400, "لم يتم العثور على الشراء في الإيصال")
        
        # Calculate expiration
        duration_days = product_info["duration_days"]
        
        # For subscriptions, use expires_date if available
        if "expires_date_ms" in valid_purchase:
            exp = datetime.fromtimestamp(int(valid_purchase["expires_date_ms"]) / 1000, tz=timezone.utc)
        else:
            exp = datetime.now(timezone.utc) + timedelta(days=duration_days)
        
        # Grant all features
        features_update = {f"features.{f}": exp.isoformat() for f in ALL_FEATURES}
        features_update["apple_transaction_id"] = valid_purchase.get("transaction_id", data.transaction_id)
        features_update["apple_product_id"] = data.product_id
        features_update["is_vip"] = True
        features_update["vip_until"] = exp.isoformat()
        
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": features_update}
        )
        
        # Log the purchase
        await db.apple_purchases.insert_one({
            "user_id": current_user.id,
            "product_id": data.product_id,
            "transaction_id": valid_purchase.get("transaction_id"),
            "expires": exp.isoformat(),
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "receipt_status": status
        })
        
        logger.info(f"Apple purchase validated for user {current_user.id}: {data.product_id}")
        
        return {
            "success": True,
            "message": "تم التفعيل بنجاح!",
            "expires": exp.isoformat(),
            "features": ALL_FEATURES
        }
    
    @router.post("/sync-apple-purchase")
    async def sync_apple_purchase(data: SyncApplePurchase, current_user=Depends(get_current_user)):
        """
        Simple sync endpoint for iOS purchases.
        Used when full receipt validation isn't needed (e.g., when using RevenueCat or Capacitor Purchases).
        This trusts the client-side purchase verification.
        """
        product_info = APPLE_PRODUCTS.get(data.productId)
        if not product_info:
            raise HTTPException(400, "منتج غير صالح")
        
        # Check if user is owner
        user = await db.users.find_one({"id": current_user.id})
        if user and user.get("role") == "owner":
            exp = datetime.now(timezone.utc) + timedelta(days=3650)
        else:
            exp = datetime.now(timezone.utc) + timedelta(days=product_info["duration_days"])
        
        # Grant all features
        features_update = {f"features.{f}": exp.isoformat() for f in ALL_FEATURES}
        features_update["is_vip"] = True
        features_update["vip_until"] = exp.isoformat()
        if data.transactionId:
            features_update["apple_transaction_id"] = data.transactionId
        features_update["apple_product_id"] = data.productId
        
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": features_update}
        )
        
        logger.info(f"Apple purchase synced for user {current_user.id}: {data.productId}")
        
        return {
            "success": True,
            "message": "تم مزامنة الشراء",
            "expires": exp.isoformat()
        }
    
    @router.post("/apple/restore")
    async def restore_apple_purchases(current_user=Depends(get_current_user)):
        """
        Called when user restores purchases on a new device.
        This endpoint is called by the frontend after Capacitor Purchases restores transactions.
        """
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        if not user:
            raise HTTPException(404, "المستخدم غير موجود")
        
        # Return current feature status
        features = user.get("features", {})
        now = datetime.now(timezone.utc)
        
        has_active_subscription = False
        for f in ALL_FEATURES:
            exp = features.get(f)
            if exp:
                try:
                    exp_dt = datetime.fromisoformat(exp.replace('Z', '+00:00'))
                    if exp_dt > now:
                        has_active_subscription = True
                        break
                except:
                    pass
        
        return {
            "success": True,
            "has_active_subscription": has_active_subscription,
            "message": "تمت استعادة المشتريات" if has_active_subscription else "لا توجد مشتريات سابقة"
        }
    
    @router.get("/apple/subscription-status")
    async def get_apple_subscription_status(current_user=Depends(get_current_user)):
        """Get detailed subscription status for the user"""
        user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        if not user:
            raise HTTPException(404, "المستخدم غير موجود")
        
        if user.get("role") == "owner":
            return {
                "is_subscribed": True,
                "is_owner": True,
                "expires": None,
                "product_id": None
            }
        
        vip_until = user.get("vip_until")
        is_subscribed = False
        
        if vip_until:
            try:
                exp_dt = datetime.fromisoformat(vip_until.replace('Z', '+00:00'))
                is_subscribed = exp_dt > datetime.now(timezone.utc)
            except:
                pass
        
        return {
            "is_subscribed": is_subscribed,
            "is_owner": False,
            "expires": user.get("vip_until"),
            "product_id": user.get("apple_product_id")
        }
    
    return router
