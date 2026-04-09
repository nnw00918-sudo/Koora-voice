import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Coins,
  Gift,
  Crown,
  ArrowRight,
  Sparkles,
  Check,
  Star,
  Zap,
  Wallet,
  History,
  ChevronRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StorePage = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('coins');
  const [coinPackages, setCoinPackages] = useState([]);
  const [vipPlans, setVipPlans] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [balance, setBalance] = useState({ coins: 0, total_earned: 0 });
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
      
      const [packagesRes, plansRes, giftsRes, balanceRes, vipRes] = await Promise.all([
        axios.get(`${API}/payments/coins/packages`),
        axios.get(`${API}/payments/vip/plans`),
        axios.get(`${API}/payments/gifts`),
        axios.get(`${API}/payments/coins/balance`, { headers }),
        axios.get(`${API}/payments/vip/status`, { headers })
      ]);
      
      setCoinPackages(packagesRes.data.packages || []);
      setVipPlans(plansRes.data.plans || []);
      setGifts(giftsRes.data.gifts || []);
      setBalance(balanceRes.data);
      setVipStatus(vipRes.data);
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseCoins = async (packageId) => {
    try {
      setPurchasing(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `${API}/payments/coins/purchase`,
        { package_id: packageId },
        { headers }
      );
      
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل في إنشاء جلسة الدفع');
    } finally {
      setPurchasing(false);
    }
  };

  const handleSubscribeVIP = async (planId) => {
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
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل في إنشاء جلسة الدفع');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-[#0A0A0A] to-transparent pb-4">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowRight className={`w-5 h-5 text-white ${isRTL ? '' : 'rotate-180'}`} />
          </button>
          <h1 className="font-cairo font-bold text-lg text-white">{isRTL ? 'المتجر' : 'Store'}</h1>
          <button onClick={() => navigate('/wallet')} className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-amber-400" />
          </button>
        </div>
        
        {/* Balance Card */}
        <div className="max-w-lg mx-auto px-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/60 text-sm">{isRTL ? 'رصيدك' : 'Your Balance'}</p>
                <p className="text-white font-bold text-xl">{balance.coins.toLocaleString()}</p>
              </div>
            </div>
            {vipStatus.is_vip && (
              <div className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center gap-1">
                <Crown className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-bold">VIP</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Tabs */}
        <div className="flex gap-2 mt-4 p-1 bg-white/5 rounded-2xl">
          {[
            { id: 'coins', icon: <Coins className="w-4 h-4" />, label: isRTL ? 'عملات' : 'Coins' },
            { id: 'vip', icon: <Crown className="w-4 h-4" />, label: 'VIP' },
            { id: 'gifts', icon: <Gift className="w-4 h-4" />, label: isRTL ? 'هدايا' : 'Gifts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 rounded-xl font-cairo font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-amber-500 text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'coins' && (
            <motion.div
              key="coins"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 space-y-4"
            >
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {isRTL ? 'اشترِ عملات' : 'Buy Coins'}
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {coinPackages.map((pkg, index) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative p-4 rounded-2xl border ${
                      pkg.popular 
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500' 
                        : pkg.best_value
                          ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500'
                          : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 rounded-full text-white text-xs font-bold">
                        {isRTL ? 'الأكثر شراءً' : 'Popular'}
                      </div>
                    )}
                    {pkg.best_value && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 rounded-full text-white text-xs font-bold">
                        {isRTL ? 'أفضل قيمة' : 'Best Value'}
                      </div>
                    )}
                    
                    <div className="text-center">
                      <div className="text-4xl mb-2">💰</div>
                      <p className="text-white font-bold text-2xl">{pkg.coins.toLocaleString()}</p>
                      {pkg.bonus > 0 && (
                        <p className="text-amber-400 text-sm">+{pkg.bonus} {isRTL ? 'مجاناً' : 'bonus'}</p>
                      )}
                      <Button
                        onClick={() => handlePurchaseCoins(pkg.id)}
                        disabled={purchasing}
                        className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl"
                      >
                        {pkg.price_display}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'vip' && (
            <motion.div
              key="vip"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 space-y-4"
            >
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                {isRTL ? 'اشتراك VIP' : 'VIP Subscription'}
              </h2>
              
              {vipStatus.is_vip && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-amber-400 font-bold">{isRTL ? 'أنت عضو VIP!' : "You're VIP!"}</p>
                      <p className="text-white/60 text-sm">
                        {isRTL ? 'ينتهي في: ' : 'Expires: '}
                        {new Date(vipStatus.vip_until).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {vipPlans.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-5 rounded-2xl border ${
                      plan.discount 
                        ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/50' 
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                        <p className="text-amber-400 font-bold text-2xl">{plan.price_display}</p>
                      </div>
                      {plan.discount && (
                        <div className="px-3 py-1 bg-green-500 rounded-full text-white text-sm font-bold">
                          -{plan.discount}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-white/80 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      onClick={() => handleSubscribeVIP(plan.id)}
                      disabled={purchasing || vipStatus.is_vip}
                      className={`w-full font-bold rounded-xl ${
                        vipStatus.is_vip
                          ? 'bg-white/10 text-white/50'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                      }`}
                    >
                      {vipStatus.is_vip 
                        ? (isRTL ? 'مشترك حالياً' : 'Currently Subscribed')
                        : (isRTL ? 'اشترك الآن' : 'Subscribe Now')
                      }
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'gifts' && (
            <motion.div
              key="gifts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 space-y-4"
            >
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-400" />
                {isRTL ? 'الهدايا المتاحة' : 'Available Gifts'}
              </h2>
              <p className="text-white/60 text-sm">
                {isRTL ? 'أرسل هدايا للمتحدثين في الغرف لدعمهم!' : 'Send gifts to speakers in rooms to support them!'}
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                {gifts.map((gift, index) => (
                  <motion.div
                    key={gift.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center hover:border-pink-500/50 transition-colors"
                  >
                    <div className="text-4xl mb-2">{gift.icon}</div>
                    <p className="text-white text-sm font-bold">{gift.name}</p>
                    <p className="text-amber-400 text-xs flex items-center justify-center gap-1 mt-1">
                      <Coins className="w-3 h-3" />
                      {gift.price}
                    </p>
                  </motion.div>
                ))}
              </div>
              
              <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/30">
                <p className="text-pink-300 text-sm text-center">
                  {isRTL 
                    ? '💡 ادخل أي غرفة واضغط على المتحدث لإرسال هدية!'
                    : '💡 Enter any room and tap on a speaker to send a gift!'
                  }
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StorePage;
