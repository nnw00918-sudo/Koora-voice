import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Zap,
  ChevronRight,
  Loader2,
  Image,
  MessageSquare,
  Frame,
  Package
} from 'lucide-react';

const StorePage = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [subscriptions, setSubscriptions] = useState([]);
  const [featuresStatus, setFeaturesStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const FEATURES_INFO = {
    photos: {
      icon: Image,
      name: isRTL ? 'إرسال صور' : 'Send Photos',
      description: isRTL ? 'أرسل صور في غرف الدردشة' : 'Send photos in chat rooms',
      color: 'from-blue-500 to-cyan-500'
    },
    vip_badge: {
      icon: Crown,
      name: isRTL ? 'شارة VIP' : 'VIP Badge',
      description: isRTL ? 'شارة ذهبية مميزة بجانب اسمك' : 'Gold badge next to your name',
      color: 'from-amber-500 to-yellow-500'
    },
    colored_messages: {
      icon: MessageSquare,
      name: isRTL ? 'رسائل ملونة' : 'Colored Messages',
      description: isRTL ? 'رسائلك تظهر بألوان مميزة' : 'Your messages appear in special colors',
      color: 'from-pink-500 to-rose-500'
    },
    profile_frame: {
      icon: Frame,
      name: isRTL ? 'إطار مميز' : 'Profile Frame',
      description: isRTL ? 'إطار ذهبي حول صورتك الشخصية' : 'Gold frame around your profile picture',
      color: 'from-purple-500 to-violet-500'
    },
    all: {
      icon: Package,
      name: isRTL ? 'جميع المميزات' : 'All Features',
      description: isRTL ? 'احصل على كل المميزات بسعر مخفض' : 'Get all features at a discounted price',
      color: 'from-emerald-500 to-green-500'
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [subsRes, statusRes] = await Promise.all([
        axios.get(`${API}/api/payments/subscriptions`),
        axios.get(`${API}/api/payments/features/status`, { headers })
      ]);
      
      setSubscriptions(subsRes.data.subscriptions || []);
      setFeaturesStatus(statusRes.data);
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (subscriptionId) => {
    try {
      setPurchasing(subscriptionId);
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `${API}/api/payments/subscribe`,
        { subscription_id: subscriptionId },
        { headers }
      );
      
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else if (response.data.free) {
        toast.success(isRTL ? 'تم التفعيل مجاناً!' : 'Activated for free!');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل في الاشتراك' : 'Subscription failed'));
    } finally {
      setPurchasing(null);
    }
  };

  const isOwner = user.role === 'owner';

  // Group subscriptions by feature
  const groupedSubs = subscriptions.reduce((acc, sub) => {
    if (!acc[sub.feature]) {
      acc[sub.feature] = { monthly: null, yearly: null };
    }
    acc[sub.feature][sub.period] = sub;
    return acc;
  }, {});

  const featureOrder = ['all', 'photos', 'vip_badge', 'colored_messages', 'profile_frame'];

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
            {isRTL ? 'المتجر' : 'Store'}
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
              {isRTL ? 'لديك جميع المميزات مفعلة بدون حدود' : 'All features are activated without limits'}
            </p>
          </motion.div>
        )}

        {/* Period Toggle */}
        {!isOwner && (
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
                  {isRTL ? 'وفر أكثر!' : 'Save!'}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Features List */}
        <div className="mt-8 space-y-4">
          {featureOrder.map((featureKey, index) => {
            const feature = FEATURES_INFO[featureKey];
            const subs = groupedSubs[featureKey];
            const currentSub = subs?.[selectedPeriod];
            const isActive = featuresStatus[featureKey] || isOwner;
            const Icon = feature?.icon || Star;

            if (!feature || !currentSub) return null;

            return (
              <motion.div
                key={featureKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-5 rounded-2xl border transition-all ${
                  featureKey === 'all'
                    ? 'bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-emerald-500/50'
                    : isActive
                    ? 'bg-gradient-to-br from-lime-600/10 to-green-600/10 border-lime-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {featureKey === 'all' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full">
                    <span className="text-white text-xs font-bold">
                      {isRTL ? 'الأفضل قيمة' : 'Best Value'}
                    </span>
                  </div>
                )}

                <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold text-lg font-cairo">{feature.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-lime-500/20 text-lime-400 text-xs rounded-full">
                          {isRTL ? 'مفعّل' : 'Active'}
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-sm mt-1 font-almarai">{feature.description}</p>
                    
                    {!isOwner && (
                      <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <p className="text-2xl font-bold text-white">
                            ${currentSub.price}
                            <span className="text-sm text-white/50 font-normal">
                              /{selectedPeriod === 'monthly' ? (isRTL ? 'شهر' : 'mo') : (isRTL ? 'سنة' : 'yr')}
                            </span>
                          </p>
                        </div>
                        
                        <Button
                          onClick={() => handleSubscribe(currentSub.id)}
                          disabled={purchasing === currentSub.id || isActive}
                          className={`${
                            isActive
                              ? 'bg-lime-500/20 text-lime-400'
                              : featureKey === 'all'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          } font-bold px-6`}
                        >
                          {purchasing === currentSub.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isActive ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="mr-1">{isRTL ? 'مفعّل' : 'Active'}</span>
                            </>
                          ) : (
                            <>
                              {isRTL ? 'اشترك' : 'Subscribe'}
                              <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180 mr-1' : 'ml-1'}`} />
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Payment Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-white/40 text-xs font-almarai">
            {isRTL 
              ? 'الدفع الآمن عبر PayPal • يمكنك الإلغاء في أي وقت'
              : 'Secure payment via PayPal • Cancel anytime'}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default StorePage;
