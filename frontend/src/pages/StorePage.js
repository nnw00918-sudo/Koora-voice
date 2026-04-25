import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { API } from '../config/api';
import {
  Crown,
  ArrowRight,
  Sparkles,
  Check,
  Star,
  ChevronRight,
  Loader2,
  Image,
  MessageSquare,
  Frame,
  Package,
  RefreshCw,
  Apple
} from 'lucide-react';
import ApplePurchases, { isNativeIOS, PRODUCT_IDS } from '../services/ApplePurchases';

const StorePage = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [products, setProducts] = useState([]);
  const [featuresStatus, setFeaturesStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isIOS = isNativeIOS();

  const FEATURES_INFO = {
    all: {
      icon: Package,
      name: isRTL ? 'جميع المميزات' : 'All Features',
      description: isRTL ? 'إرسال صور، شارة VIP، رسائل ملونة، إطار مميز' : 'Send photos, VIP badge, colored messages, profile frame',
      color: 'from-emerald-500 to-green-500',
      features: [
        isRTL ? 'إرسال صور في الغرف' : 'Send photos in rooms',
        isRTL ? 'شارة VIP ذهبية' : 'Gold VIP badge',
        isRTL ? 'رسائل ملونة مميزة' : 'Colored messages',
        isRTL ? 'إطار مميز للصورة الشخصية' : 'Profile frame',
      ]
    }
  };

  useEffect(() => {
    initializeStore();
  }, []);

  const initializeStore = async () => {
    try {
      setLoading(true);
      
      // Initialize Apple purchases if on iOS
      if (isIOS) {
        await ApplePurchases.initializePurchases();
      }
      
      // Get products
      const storeProducts = await ApplePurchases.getProducts();
      setProducts(storeProducts);
      
      // Get features status from backend
      const headers = { Authorization: `Bearer ${token}` };
      const statusRes = await axios.get(`${API}/api/payments/features/status`, { headers });
      setFeaturesStatus(statusRes.data);
      
      // Check iOS subscription status
      if (isIOS) {
        const subStatus = await ApplePurchases.checkSubscriptionStatus();
        if (subStatus.isSubscribed) {
          setFeaturesStatus(prev => ({
            ...prev,
            photos: true,
            vip_badge: true,
            colored_messages: true,
            profile_frame: true,
          }));
        }
      }
    } catch (error) {
      console.error('Error initializing store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productId) => {
    if (!isIOS) {
      toast.error(isRTL ? 'الشراء متاح فقط على iPhone' : 'Purchases only available on iPhone');
      return;
    }

    try {
      setPurchasing(productId);
      
      const result = await ApplePurchases.purchaseProduct(productId);
      
      if (result.success) {
        toast.success(result.message || (isRTL ? 'تم الشراء بنجاح!' : 'Purchase successful!'));
        
        // Update features status
        setFeaturesStatus(prev => ({
          ...prev,
          photos: true,
          vip_badge: true,
          colored_messages: true,
          profile_frame: true,
        }));
        
        // Sync with backend
        try {
          const headers = { Authorization: `Bearer ${token}` };
          await axios.post(`${API}/api/payments/sync-apple-purchase`, {
            productId,
            transactionId: result.customerInfo?.originalAppUserId,
          }, { headers });
        } catch (e) {
          console.log('Backend sync will happen later');
        }
      } else if (result.cancelled) {
        toast.info(result.message || (isRTL ? 'تم إلغاء الشراء' : 'Purchase cancelled'));
      } else {
        toast.error(result.error || (isRTL ? 'فشل الشراء' : 'Purchase failed'));
      }
    } catch (error) {
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    if (!isIOS) {
      toast.error(isRTL ? 'متاح فقط على iPhone' : 'Only available on iPhone');
      return;
    }

    try {
      setRestoring(true);
      const result = await ApplePurchases.restorePurchases();
      
      if (result.success) {
        toast.success(result.message || (isRTL ? 'تم استعادة المشتريات' : 'Purchases restored'));
        initializeStore(); // Refresh status
      } else {
        toast.error(result.error || (isRTL ? 'فشل الاستعادة' : 'Restore failed'));
      }
    } catch (error) {
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setRestoring(false);
    }
  };

  const isOwner = user.role === 'owner';
  const isAllFeaturesActive = featuresStatus.photos && featuresStatus.vip_badge && 
                              featuresStatus.colored_messages && featuresStatus.profile_frame;

  const monthlyProduct = products.find(p => p.identifier === PRODUCT_IDS.ALL_MONTHLY);
  const yearlyProduct = products.find(p => p.identifier === PRODUCT_IDS.ALL_YEARLY);
  const currentProduct = selectedPeriod === 'monthly' ? monthlyProduct : yearlyProduct;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
          >
            <ArrowRight className={`w-5 h-5 text-white ${isRTL ? '' : 'rotate-180'}`} />
          </button>
          <h1 className="text-white font-bold text-lg font-cairo">
            {isRTL ? 'الاشتراك المميز' : 'Premium Subscription'}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Owner Badge */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-amber-600/20 via-amber-500/10 to-yellow-500/20 border border-amber-500/30 text-center"
          >
            <Crown className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg font-cairo">
              {isRTL ? 'أنت مالك التطبيق!' : "You're the App Owner!"}
            </h3>
            <p className="text-white/60 text-sm mt-2 font-almarai">
              {isRTL ? 'لديك جميع المميزات مفعلة' : 'All features are activated'}
            </p>
          </motion.div>
        )}

        {/* Premium Card */}
        {!isOwner && (
          <>
            {/* Period Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex justify-center"
            >
              <div className="bg-white/5 p-1 rounded-2xl flex gap-1">
                <button
                  onClick={() => setSelectedPeriod('monthly')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedPeriod === 'monthly'
                      ? 'bg-lime-500 text-slate-900'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {isRTL ? 'شهري' : 'Monthly'}
                </button>
                <button
                  onClick={() => setSelectedPeriod('yearly')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    selectedPeriod === 'yearly'
                      ? 'bg-lime-500 text-slate-900'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {isRTL ? 'سنوي' : 'Yearly'}
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {isRTL ? 'وفر 17%' : 'Save 17%'}
                  </span>
                </button>
              </div>
            </motion.div>

            {/* Main Subscription Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 relative overflow-hidden"
            >
              {/* Best Value Badge */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-b-xl z-10">
                <span className="text-slate-900 text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {isRTL ? 'الأفضل' : 'Best Value'}
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-lime-500/30 pt-10">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-lime-500 to-green-500 flex items-center justify-center mb-4">
                  <Crown className="w-10 h-10 text-white" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center font-cairo mb-2">
                  {FEATURES_INFO.all.name}
                </h2>

                {/* Price */}
                <div className="text-center mb-6">
                  <span className="text-4xl font-black text-lime-400">
                    {currentProduct?.priceString || (selectedPeriod === 'monthly' ? '$4.99' : '$49.99')}
                  </span>
                  <span className="text-white/50 text-lg">
                    /{selectedPeriod === 'monthly' ? (isRTL ? 'شهر' : 'mo') : (isRTL ? 'سنة' : 'yr')}
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-6">
                  {FEATURES_INFO.all.features.map((feature, index) => (
                    <div key={index} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-6 h-6 rounded-full bg-lime-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-lime-400" />
                      </div>
                      <span className="text-white/80 text-sm font-almarai">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Subscribe Button */}
                {isAllFeaturesActive || isOwner ? (
                  <div className="p-4 rounded-2xl bg-lime-500/20 border border-lime-500/30 text-center">
                    <Check className="w-8 h-8 text-lime-400 mx-auto mb-2" />
                    <p className="text-lime-400 font-bold font-cairo">
                      {isRTL ? 'الاشتراك مفعّل' : 'Subscription Active'}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      const productId = selectedPeriod === 'monthly' 
                        ? PRODUCT_IDS.ALL_MONTHLY 
                        : PRODUCT_IDS.ALL_YEARLY;
                      console.log('Purchasing product:', productId);
                      handlePurchase(productId);
                    }}
                    disabled={purchasing !== null}
                    className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-slate-900 font-bold rounded-2xl py-6 text-lg"
                  >
                    {purchasing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        {isIOS && <Apple className="w-5 h-5 mr-2" />}
                        {isRTL ? 'اشترك الآن' : 'Subscribe Now'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Payment Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center space-y-2"
        >
          {isIOS ? (
            <>
              <div className="flex items-center justify-center gap-2 text-white/40">
                <Apple className="w-4 h-4" />
                <span className="text-xs font-almarai">
                  {isRTL ? 'الدفع عبر iTunes' : 'Payment via iTunes'}
                </span>
              </div>
              <p className="text-white/30 text-xs font-almarai px-8">
                {isRTL 
                  ? 'سيتم تجديد الاشتراك تلقائياً. يمكنك إلغاؤه من إعدادات iTunes في أي وقت.'
                  : 'Subscription renews automatically. Cancel anytime from iTunes settings.'}
              </p>
            </>
          ) : (
            <p className="text-white/40 text-xs font-almarai">
              {isRTL 
                ? 'للاشتراك، استخدم التطبيق على iPhone'
                : 'To subscribe, use the app on iPhone'}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StorePage;
