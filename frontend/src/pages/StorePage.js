import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Coins,
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
      
      const [packagesRes, plansRes, balanceRes, vipRes] = await Promise.all([
        axios.get(`${API}/payments/coins/packages`),
        axios.get(`${API}/payments/vip/plans`),
        axios.get(`${API}/payments/coins/balance`, { headers }),
        axios.get(`${API}/payments/vip/status`, { headers })
      ]);
      
      setCoinPackages(packagesRes.data.packages || []);
      setVipPlans(plansRes.data.plans || []);
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
      
      // Owner يحصل على العملات مجاناً
      if (response.data.free) {
        toast.success(`🎉 ${response.data.message}`);
        fetchData(); // Refresh balance
        return;
      }
      
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
      
      // Owner يحصل على VIP مجاناً
      if (response.data.free) {
        toast.success(`🎉 ${response.data.message}`);
        fetchData(); // Refresh status
        return;
      }
      
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
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            balance.is_owner 
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30' 
              : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                balance.is_owner ? 'bg-purple-500' : 'bg-amber-500'
              }`}>
                {balance.is_owner ? <Crown className="w-6 h-6 text-white" /> : <Coins className="w-6 h-6 text-white" />}
              </div>
              <div>
                <p className="text-white/60 text-sm">{isRTL ? 'رصيدك' : 'Your Balance'}</p>
                <p className="text-white font-bold text-xl">
                  {balance.is_owner ? (isRTL ? '∞ غير محدود' : '∞ Unlimited') : balance.coins.toLocaleString()}
                </p>
              </div>
            </div>
            {balance.is_owner ? (
              <div className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center gap-1">
                <Crown className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-bold">OWNER</span>
              </div>
            ) : vipStatus.is_vip && (
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
            { id: 'vip', icon: <Crown className="w-4 h-4" />, label: 'VIP' }
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
                        className={`w-full mt-3 font-bold rounded-xl ${
                          balance.is_owner
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                        } text-white`}
                      >
                        {balance.is_owner ? (isRTL ? '🎁 مجاني' : '🎁 Free') : pkg.price_display}
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
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StorePage;
