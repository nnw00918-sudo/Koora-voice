import React from 'react';
import { motion } from 'framer-motion';
import { Hand, Check, X } from 'lucide-react';
import { Button } from '../ui/button';

export const SeatRequestsModal = ({
  show,
  onClose,
  seatRequests,
  onApprove,
  onReject
}) => {
  if (!show) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-amber-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Hand className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-cairo font-bold text-white mb-2">طلبات الصعود</h3>
          <p className="text-slate-400 text-sm">{seatRequests.length} طلب</p>
        </div>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {seatRequests.map((req) => (
            <div key={req.user_id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
              <img 
                src={req.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.username}`} 
                alt="" 
                className="w-12 h-12 rounded-full border-2 border-amber-500/50"
              />
              <div className="flex-1">
                <p className="text-white font-cairo font-bold">{req.username}</p>
                <p className="text-slate-400 text-xs">يريد الصعود للمنصة</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => onApprove(req.user_id)}
                  className="w-10 h-10 rounded-full bg-lime-500 hover:bg-lime-400 p-0"
                >
                  <Check className="w-5 h-5 text-white" />
                </Button>
                <Button 
                  onClick={() => onReject(req.user_id)}
                  className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-400 p-0"
                >
                  <X className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <button 
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold"
        >
          إغلاق
        </button>
      </motion.div>
    </motion.div>
  );
};

export default SeatRequestsModal;
