import React from 'react';
import { motion } from 'framer-motion';
import { Hand } from 'lucide-react';
import { Button } from '../ui/button';

export const InviteReceivedModal = ({
  show,
  invites,
  onAccept,
  onReject
}) => {
  if (!show || !invites || invites.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-violet-500/30"
      >
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Hand className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-cairo font-bold text-white mb-2">دعوة للصعود!</h3>
          <p className="text-violet-300 font-almarai">{invites[0].invited_by_name} يدعوك للتحدث</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => onReject(invites[0].invite_id)}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-cairo font-bold py-3 rounded-xl"
          >
            رفض
          </Button>
          <Button onClick={() => onAccept(invites[0].invite_id)}
            className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-cairo font-bold py-3 rounded-xl"
          >
            قبول
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InviteReceivedModal;
