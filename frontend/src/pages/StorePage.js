import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { BACKEND_URL, API } from '../config/api';
import {
  Crown,
  ArrowRight,
  Sparkles,
  Check,
  Star,
  Zap,
  ChevronRight,
  Loader2
} from 'lucide-react';

const StorePage = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [vipPlans, setVipPlans] = useState([]);
  const [vipStatus, setVipStatus] = useState({ is_vip: false });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [plansRes, vipRes] = await Promise.all([
        axios.get(`${API}/payments/vip/plans`),
        axios.get(`${API}/payments/vip/status`, { headers })
      ]);
      
      setVipPlans(plansRes.data.plans || []);
      setVipStatus(vipRes.data);
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseVIP = async (planId) => {
    try {
      setPurchasing(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `${API}/payments/vip/subscribe`,
        { plan_id: planId },
        { headers }
      );
      
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.success(isRTL ? 'تم تفعيل VIP بنجاح!' : 'VIP activated successfully!');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل في الاشتراك' : 'Subscription failed'));
    } finally {
      setPurchasing(false);
    }
  };

  const isOwner = user.role === 'owner';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
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
          <h1 className="text-white font-bold text-lg">VIP</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* VIP Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-purple-600/20 via-purple-500/10 to-pink-500/20 border border-purple-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-white/60 text-sm">{isRTL ? 'حالة VIP' : 'VIP Status'}</p>
                <p className="text-white font-bold text-xl">
                  {isOwner ? (
                    <span className="text-amber-400">OWNER</span>
                  ) : vipStatus.is_vip ? (
                    <span className="text-purple-400">VIP</span>
                  ) : (
                    <span className="text-white/50">{isRTL ? 'غير مشترك' : 'Not subscribed'}</span>
                  )}
                </p>
              </div>
            </div>
            {(vipStatus.is_vip || isOwner) && (
              <div className="px-3 py-1 bg-purple-500/20 rounded-full">
                <span className="text-purple-300 text-xs">
                  {isOwner ? '∞' : vipStatus.days_remaining + (isRTL ? ' يوم' : ' days')}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* VIP Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            {isRTL ? 'مميزات VIP' : 'VIP Benefits'}
          </h2>
          
          <div className="space-y-3">
            {[
              { icon: '👑', text: isRTL ? 'شارة VIP مميزة' : 'Exclusive VIP Badge' },
              { icon: '🎨', text: isRTL ? 'رسائل ملونة في الدردشة' : 'Colored chat messages' },
              { icon: '🖼️', text: isRTL ? 'إرسال صور في الدردشة' : 'Send images in chat' },
              { icon: '⭐', text: isRTL ? 'إطار مميز للصورة الشخصية' : 'Special profile frame' },
              { icon: '🚀', text: isRTL ? 'أولوية في الدعم الفني' : 'Priority support' },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
              >
                <span className="text-xl">{benefit.icon}</span>
                <span className="text-white/80 text-sm">{benefit.text}</span>
                <Check className="w-4 h-4 text-green-400 mr-auto" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* VIP Plans */}
        {!isOwner && !vipStatus.is_vip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              {isRTL ? 'اختر خطتك' : 'Choose Your Plan'}
            </h2>
            
            <div className="space-y-4">
              {vipPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={`relative p-5 rounded-2xl border transition-all ${
                    plan.popular 
                      ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/50' 
                      : 'bg-white/5 border-white/10 hover:border-purple-500/30'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                      <span className="text-white text-xs font-bold">
                        {isRTL ? 'الأكثر شعبية' : 'Most Popular'}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                      <p className="text-white/60 text-sm">
                        {plan.duration_days} {isRTL ? 'يوم' : 'days'}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-white">
                        ${plan.price}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handlePurchaseVIP(plan.id)}
                    disabled={purchasing}
                    className={`w-full mt-4 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        : 'bg-white/10 hover:bg-white/20'
                    } text-white font-bold`}
                  >
                    {purchasing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {isRTL ? 'اشترك الآن' : 'Subscribe Now'}
                        <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180 mr-2' : 'ml-2'}`} />
                      </>
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Already VIP or Owner */}
        {(isOwner || vipStatus.is_vip) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-center"
          >
            <Crown className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg">
              {isOwner 
                ? (isRTL ? 'أنت مالك التطبيق!' : "You're the App Owner!") 
                : (isRTL ? 'أنت عضو VIP!' : "You're a VIP Member!")}
            </h3>
            <p className="text-white/60 text-sm mt-2">
              {isOwner
                ? (isRTL ? 'لديك جميع الصلاحيات بدون حدود' : 'You have all privileges without limits')
                : (isRTL ? 'استمتع بجميع مميزات VIP الحصرية' : 'Enjoy all exclusive VIP benefits')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StorePage;
