import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Button } from '../ui/button';

export const PromoteModal = ({
  show,
  onClose,
  selectedUser,
  onPromote
}) => {
  if (!show || !selectedUser) return null;

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
        className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-lime-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <img 
            src={selectedUser.avatar || selectedUser.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`}
            alt=""
            className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-lime-500/50"
          />
          <h3 className="text-xl font-cairo font-bold text-white mb-2">ترقية {selectedUser.username}</h3>
          <p className="text-slate-400 font-almarai text-sm">ترقية العضو إلى متحدث على المنصة</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-cairo font-bold py-3 rounded-xl"
          >
            إلغاء
          </Button>
          <Button 
            onClick={() => onPromote(selectedUser.user_id || selectedUser.id, 'speaker')}
            className="flex-1 bg-lime-500 hover:bg-lime-400 text-slate-900 font-cairo font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <ArrowUp className="w-5 h-5" />
            ترقية
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PromoteModal;
