import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Users, 
  Settings, 
  Crown,
  Lock,
  Unlock,
  Circle,
  StopCircle,
  ChevronDown
} from 'lucide-react';

// Room Header Component
export const RoomHeader = ({
  room,
  participantsCount,
  isRecording,
  recordingTime,
  isOwner,
  onBack,
  onOpenSettings,
  onToggleParticipants,
  showParticipants
}) => {
  // Format recording time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Back Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </motion.button>

        {/* Room Info - Center */}
        <div className="flex-1 mx-4 text-center">
          <div className="flex items-center justify-center gap-2">
            {/* Room Status */}
            {room?.is_closed && (
              <Lock className="w-4 h-4 text-amber-500" />
            )}
            
            {/* Room Title */}
            <h1 className="text-white font-cairo font-bold text-lg truncate max-w-[180px]">
              {room?.title || 'الغرفة'}
            </h1>
            
            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/50">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-bold font-mono">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>
          
          {/* Participants Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onToggleParticipants}
            className="flex items-center justify-center gap-2 mx-auto mt-1"
          >
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-lime-500/30 hover:border-lime-500/50 transition-colors">
              <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <Users className="w-3 h-3 text-lime-400" />
              <span className="text-lime-400 font-bold text-sm">{participantsCount}</span>
              <span className="text-slate-400 text-xs">متصل</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showParticipants ? 'rotate-180' : ''}`} />
            </div>
          </motion.button>
        </div>

        {/* Settings Button */}
        {isOwner ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-xl bg-lime-500 hover:bg-lime-400 flex items-center justify-center shadow-lg shadow-lime-500/30 transition-colors"
          >
            <Settings className="w-5 h-5 text-slate-900" />
          </motion.button>
        ) : (
          <div className="w-10" />
        )}
      </div>
      
      {/* Category Badge */}
      {room?.category && (
        <div className="flex justify-center pb-2">
          <span className="text-slate-500 text-xs font-cairo bg-slate-800/50 px-3 py-1 rounded-full">
            {room.room_type === 'diwaniya' ? '🏠 ديوانية' : '🌐 عام'} • {room.category}
          </span>
        </div>
      )}
    </motion.header>
  );
};

// View Mode Switcher
export const ViewModeSwitcher = ({ 
  activeMode, 
  onModeChange, 
  hasStream, 
  cameraCount 
}) => {
  const modes = [
    { id: 'mics', label: 'المايكات', icon: '🎤' },
    { id: 'cameras', label: 'الكاميرات', icon: '📹', badge: cameraCount },
    ...(hasStream ? [{ id: 'stream', label: 'البث', icon: '📺' }] : [])
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {modes.map((mode) => (
        <motion.button
          key={mode.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => onModeChange(mode.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${
            activeMode === mode.id
              ? 'bg-lime-500 text-slate-900 shadow-lg shadow-lime-500/30'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <span>{mode.icon}</span>
          {mode.label}
          {mode.badge > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeMode === mode.id ? 'bg-slate-900/30' : 'bg-lime-500/30 text-lime-400'
            }`}>
              {mode.badge}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default RoomHeader;
