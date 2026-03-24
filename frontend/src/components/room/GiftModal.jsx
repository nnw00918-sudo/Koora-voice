import React from 'react';
import { motion } from 'framer-motion';

export const GiftModal = ({
  show,
  onClose,
  gifts,
  userCoins,
  onSendGift
}) => {
  if (!show) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: 300 }} 
        animate={{ y: 0 }} 
        exit={{ y: 300 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-lg mx-auto rounded-t-3xl p-6 border-t border-violet-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-cairo font-bold text-white mb-4 text-center">
          إرسال هدية
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {gifts.map((gift) => (
            <motion.button 
              key={gift.id} 
              whileTap={{ scale: 0.95 }}
              onClick={() => onSendGift(gift.id)} 
              disabled={userCoins < gift.coins}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                userCoins < gift.coins 
                  ? 'bg-slate-800/50 border-slate-700 opacity-50' 
                  : 'bg-slate-800/80 border-violet-500/30 hover:border-violet-400'
              }`}
            >
              <span className="text-4xl">{gift.icon}</span>
              <p className="text-sm text-white font-almarai">{gift.name}</p>
              <p className="text-xs text-amber-400 font-bold">{gift.coins}</p>
            </motion.button>
          ))}
        </div>
        <p className="text-center text-slate-400 text-sm">
          رصيدك: <span className="text-amber-400 font-bold">{userCoins}</span> عملة
        </p>
      </motion.div>
    </motion.div>
  );
};

export default GiftModal;
