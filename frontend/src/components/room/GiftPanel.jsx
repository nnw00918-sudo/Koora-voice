import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { X, Coins, Gift, Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { playGiftSound, playStadiumCheer } from '../../utils/soundManager';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Gift Panel Component
 * لوحة إرسال الهدايا للغرفة - الأرباح تذهب لمالك الغرفة
 */
const GiftPanel = ({ 
  isOpen, 
  onClose, 
  roomId,
  roomTitle,
  onGiftSent
}) => {
  const [gifts, setGifts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [selectedGift, setSelectedGift] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  
  const token = localStorage.getItem('token');

  const categories = [
    { id: 'all', name: 'الكل', icon: '🎁' },
    { id: 'football', name: 'كرة قدم', icon: '⚽' },
    { id: 'basketball', name: 'سلة', icon: '🏀' },
    { id: 'club', name: 'أندية', icon: '🏟️' },
    { id: 'trophy', name: 'بطولات', icon: '🏆' },
    { id: 'player', name: 'لاعبين', icon: '👑' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [giftsRes, balanceRes] = await Promise.all([
        axios.get(`${API}/payments/gifts`),
        axios.get(`${API}/payments/coins/balance`, { headers })
      ]);
      
      setGifts(giftsRes.data.gifts || []);
      setBalance(balanceRes.data.coins || 0);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift) {
      toast.error('اختر هدية أولاً');
      return;
    }
    
    if (balance < selectedGift.price) {
      toast.error('رصيد غير كافٍ! اشحن عملاتك من المتجر');
      return;
    }
    
    try {
      setSending(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `${API}/payments/gifts/send`,
        {
          gift_id: selectedGift.id,
          room_id: roomId
        },
        { headers }
      );
      
      toast.success(`تم إرسال ${selectedGift.name} للغرفة!`);
      
      // Play gift sound based on price
      playGiftSound(selectedGift.price);
      
      // Play stadium cheer for legendary gifts (500+)
      if (selectedGift.price >= 500) {
        setTimeout(() => playStadiumCheer(), 500);
      }
      
      // Update balance
      setBalance(response.data.remaining_coins);
      
      // Notify parent
      if (onGiftSent) {
        onGiftSent({
          gift: selectedGift,
          senderUsername: response.data.sender_username
        });
      }
      
      setSelectedGift(null);
      onClose();
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error(error.response?.data?.detail || 'حدث خطأ أثناء إرسال الهدية');
    } finally {
      setSending(false);
    }
  };

  const filteredGifts = activeCategory === 'all' 
    ? gifts 
    : gifts.filter(g => g.category === activeCategory);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          className="w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl max-h-[85vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-white font-bold">إرسال هدية للغرفة</h3>
                <p className="text-white/60 text-sm">{roomTitle || 'الغرفة'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 rounded-full">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-bold">{balance.toLocaleString()}</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Categories */}
              <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                      activeCategory === cat.id 
                        ? 'bg-amber-500 text-black font-bold' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Gifts Grid */}
              <div className="p-3 grid grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto">
                {filteredGifts.map(gift => (
                  <motion.button
                    key={gift.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedGift(gift)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      selectedGift?.id === gift.id 
                        ? 'bg-amber-500/30 ring-2 ring-amber-500' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">{gift.icon}</span>
                    <span className="text-white text-xs truncate w-full text-center">{gift.name}</span>
                    <div className="flex items-center gap-0.5">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400 text-xs font-bold">{gift.price}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Selected Gift & Send */}
              <div className="p-4 border-t border-white/10 bg-slate-800/50">
                {selectedGift ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <span className="text-2xl">{selectedGift.icon}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold">{selectedGift.name}</p>
                        <div className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-400 text-sm">{selectedGift.price} عملة</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleSendGift}
                      disabled={sending || balance < selectedGift.price}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold px-6"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 ml-2" />
                          إرسال
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-white/50">اختر هدية لإرسالها للغرفة</p>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Gift Animation Component - يظهر الهدية المتحركة على الشاشة
export const GiftAnimation = ({ gift, senderName, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const getAnimationClass = () => {
    switch (gift?.animation) {
      case 'bounce': return 'animate-bounce';
      case 'pulse': return 'animate-pulse';
      case 'shake': return 'animate-shake';
      case 'float': return 'animate-float';
      case 'glow': return 'animate-glow';
      case 'sparkle': return 'animate-sparkle';
      case 'royal': return 'animate-royal';
      case 'legendary': return 'animate-legendary';
      case 'fireworks': return 'animate-fireworks';
      case 'grand': return 'animate-grand';
      default: return 'animate-bounce';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 100 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: -100 }}
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
    >
      <div className="flex flex-col items-center">
        <div className={`text-8xl ${getAnimationClass()}`}>
          {gift?.icon}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-500/90 to-orange-500/90 rounded-2xl backdrop-blur-sm"
        >
          <p className="text-white font-bold text-lg text-center">
            {senderName} أرسل {gift?.name}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Gift Button Component - زر الهدية على المنصة (غير مستخدم الآن لأن الهدايا للغرفة)
export const GiftButton = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="p-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
      title="إرسال هدية"
    >
      <Gift className="w-5 h-5" />
    </motion.button>
  );
};

export default GiftPanel;
