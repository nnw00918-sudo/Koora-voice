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
 * لوحة إرسال الهدايا داخل الغرفة
 */
const GiftPanel = ({ 
  isOpen, 
  onClose, 
  receiverId: initialReceiverId, 
  receiverName: initialReceiverName,
  roomId,
  onGiftSent,
  participants = [] // قائمة المشاركين في الغرفة
}) => {
  const [gifts, setGifts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [selectedGift, setSelectedGift] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [roomParticipants, setRoomParticipants] = useState([]);
  const [selectedReceiver, setSelectedReceiver] = useState(
    initialReceiverId ? { id: initialReceiverId, name: initialReceiverName } : null
  );
  
  const token = localStorage.getItem('token');
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;

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
      // Reset selected receiver when panel opens with new props
      if (initialReceiverId) {
        setSelectedReceiver({ id: initialReceiverId, name: initialReceiverName });
      } else {
        setSelectedReceiver(null);
        // Fetch room participants if no receiver specified
        fetchParticipants();
      }
    }
  }, [isOpen, initialReceiverId]);

  const fetchParticipants = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API}/rooms/${roomId}/participants`, { headers });
      // Filter out current user
      const others = (res.data || []).filter(p => p.user_id !== currentUserId);
      setRoomParticipants(others);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

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
    if (!selectedGift || !selectedReceiver?.id) {
      toast.error('اختر شخصاً لإرسال الهدية إليه');
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
          receiver_id: selectedReceiver.id,
          room_id: roomId
        },
        { headers }
      );
      
      toast.success(`تم إرسال ${selectedGift.name} إلى ${selectedReceiver.name}`);
      
      // Play gift sound based on price
      playGiftSound(selectedGift.price);
      
      // Play stadium cheer for legendary gifts (500+)
      if (selectedGift.price >= 500) {
        setTimeout(() => playStadiumCheer(), 500);
      }
      
      // Update balance
      setBalance(prev => prev - selectedGift.price);
      
      // Notify parent
      if (onGiftSent) {
        onGiftSent({
          gift: selectedGift,
          receiverId: selectedReceiver.id,
          receiverName: selectedReceiver.name
        });
      }
      
      setSelectedGift(null);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الهدية');
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
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#1A1A1A] rounded-t-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-white font-bold">إرسال هدية</h3>
                <p className="text-white/60 text-sm">
                  {selectedReceiver ? `إلى ${selectedReceiver.name}` : 'اختر شخصاً'}
                </p>
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
          ) : !selectedReceiver ? (
            /* Participant Selection */
            <div className="p-4">
              <p className="text-white/60 text-sm mb-3 text-center">اختر شخصاً لإرسال الهدية إليه</p>
              {roomParticipants.length === 0 ? (
                <p className="text-white/40 text-center py-8">لا يوجد مشاركون آخرون في الغرفة</p>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                  {roomParticipants.map((p) => (
                    <motion.button
                      key={p.user_id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedReceiver({ id: p.user_id, name: p.username })}
                      className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <img 
                        src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`}
                        alt={p.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <span className="text-white text-xs truncate max-w-full">{p.username}</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected receiver info */}
              <div className="px-4 pt-3">
                <button 
                  onClick={() => setSelectedReceiver(null)}
                  className="text-xs text-amber-400 hover:underline"
                >
                  ← تغيير المستلم
                </button>
              </div>
              {/* Categories */}
              <div className="p-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-2 rounded-full whitespace-nowrap text-sm flex items-center gap-1 transition-all ${
                      activeCategory === cat.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Gifts Grid */}
              <div className="p-4 grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto">
                {filteredGifts.map((gift) => (
                  <motion.button
                    key={gift.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedGift(gift)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      selectedGift?.id === gift.id
                        ? 'bg-amber-500/20 border-amber-500'
                        : balance >= gift.price
                          ? 'bg-white/5 border-white/10 hover:border-white/30'
                          : 'bg-white/5 border-white/10 opacity-40'
                    }`}
                    disabled={balance < gift.price}
                  >
                    <div className="text-3xl mb-1">{gift.icon}</div>
                    <p className="text-white text-xs font-bold truncate">{gift.name}</p>
                    <p className="text-amber-400 text-xs flex items-center justify-center gap-0.5 mt-1">
                      <Coins className="w-3 h-3" />
                      {gift.price}
                    </p>
                  </motion.button>
                ))}
              </div>

              {/* Send Button */}
              <div className="p-4 border-t border-white/10">
                <Button
                  onClick={handleSendGift}
                  disabled={!selectedGift || sending}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : selectedGift ? (
                    <span className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      إرسال {selectedGift.name} ({selectedGift.price} عملة)
                    </span>
                  ) : (
                    'اختر هدية'
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Gift Animation Overlay
 * عرض أنيميشن الهدية على الشاشة
 */
export const GiftAnimation = ({ gift, senderName, receiverName, onComplete }) => {
  useEffect(() => {
    // Play sound when animation starts
    playGiftSound(gift.price);
    if (gift.price >= 500) {
      setTimeout(() => playStadiumCheer(), 300);
    }
    
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete, gift.price]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: [50, -20, 0] }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ duration: 0.5, repeat: 2 }}
          className="text-8xl mb-4"
        >
          {gift.icon}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black/80 backdrop-blur-xl px-6 py-3 rounded-2xl"
        >
          <p className="text-amber-400 font-bold text-lg">{gift.name}</p>
          <p className="text-white/80 text-sm">
            <span className="text-amber-300">{senderName}</span>
            {' ← '}
            <span className="text-green-300">{receiverName}</span>
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Gift Button for Speaker Card
 * زر الهدية في بطاقة المتحدث
 */
export const GiftButton = ({ onClick, className = '' }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 ${className}`}
      title="إرسال هدية"
    >
      <Gift className="w-4 h-4 text-white" />
    </motion.button>
  );
};

export default GiftPanel;
