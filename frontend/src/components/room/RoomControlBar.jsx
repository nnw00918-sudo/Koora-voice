import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  LogOut, 
  Hand, 
  Gift, 
  MessageCircle,
  Phone,
  Settings
} from 'lucide-react';

// Control Button Component
const ControlButton = ({ 
  icon: Icon, 
  label, 
  active, 
  danger, 
  primary,
  disabled,
  badge,
  onClick 
}) => {
  let bgClass = 'bg-slate-800 hover:bg-slate-700 text-white';
  
  if (active) {
    bgClass = 'bg-lime-500 hover:bg-lime-400 text-slate-900 shadow-lg shadow-lime-500/30';
  } else if (danger) {
    bgClass = 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30';
  } else if (primary) {
    bgClass = 'bg-lime-500 hover:bg-lime-400 text-slate-900';
  }
  
  if (disabled) {
    bgClass = 'bg-slate-800/50 text-slate-600 cursor-not-allowed';
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={`relative flex flex-col items-center gap-1`}
    >
      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all ${bgClass}`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
        
        {/* Badge */}
        {badge && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {label && (
        <span className="text-slate-400 text-[10px] font-cairo">{label}</span>
      )}
    </motion.button>
  );
};

// Bottom Control Bar
export const RoomControlBar = ({
  onStage,
  isMicOn,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
  onLeaveSeat,
  onLeaveRoom,
  onRaiseHand,
  onOpenGifts,
  onToggleChat,
  onOpenSettings,
  hasUnreadChat,
  pendingRequest,
  isOwner,
  seatRequestsCount
}) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Gradient Fade */}
      <div className="absolute inset-x-0 bottom-full h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
      
      {/* Control Bar */}
      <div className="bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50 px-4 py-4 pb-safe">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-3 md:gap-4">
          
          {onStage ? (
            // On Stage Controls
            <>
              <ControlButton
                icon={isMicOn ? Mic : MicOff}
                label={isMicOn ? 'صامت' : 'تحدث'}
                active={isMicOn}
                onClick={onToggleMic}
              />
              
              <ControlButton
                icon={isCameraOn ? Video : VideoOff}
                label={isCameraOn ? 'إيقاف' : 'كاميرا'}
                active={isCameraOn}
                onClick={onToggleCamera}
              />
              
              <ControlButton
                icon={LogOut}
                label="غادر المنصة"
                danger
                onClick={onLeaveSeat}
              />
            </>
          ) : (
            // Audience Controls
            <ControlButton
              icon={Hand}
              label={pendingRequest ? 'بانتظار...' : 'اطلب الكلام'}
              primary={!pendingRequest}
              disabled={pendingRequest}
              onClick={onRaiseHand}
            />
          )}
          
          {/* Divider */}
          <div className="w-px h-10 bg-slate-700/50 mx-1" />
          
          {/* Common Controls */}
          <ControlButton
            icon={Gift}
            label="هدايا"
            onClick={onOpenGifts}
          />
          
          <ControlButton
            icon={MessageCircle}
            label="دردشة"
            badge={hasUnreadChat ? 1 : 0}
            onClick={onToggleChat}
          />
          
          {isOwner && (
            <ControlButton
              icon={Settings}
              label="إعدادات"
              badge={seatRequestsCount || 0}
              onClick={onOpenSettings}
            />
          )}
          
          {/* Leave Room */}
          <ControlButton
            icon={Phone}
            label="خروج"
            danger
            onClick={onLeaveRoom}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default RoomControlBar;
