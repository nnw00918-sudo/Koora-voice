/**
 * RoomHeader Component
 * Glassmorphism header with room info and controls
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Share2, Settings, Hand } from 'lucide-react';

export const RoomHeader = ({
  room,
  participants,
  roomMembers,
  isRecording,
  recordingTime,
  formatRecordingTime,
  seatRequests,
  user,
  currentUserRole,
  onMinimize,
  onLeave,
  onShowInvite,
  onShowSettings,
  onShowConnectedList,
  onShowSeatRequests
}) => {
  const showSeatRequestsBadge = 
    (room?.owner_id === user.id || currentUserRole === 'admin' || currentUserRole === 'owner') && 
    seatRequests.length > 0;

  return (
    <>
      {/* Header */}
      <div 
        className="w-full flex items-center justify-between p-4 sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        {/* Right Side (RTL) - Back & Close */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMinimize}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            data-testid="room-minimize-btn"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onLeave}
            className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
            data-testid="room-leave-btn"
          >
            <X className="w-5 h-5 text-red-400" />
          </button>
        </div>

        {/* Center - Room Info */}
        <div className="flex-1 text-center mx-4">
          <h1 className="font-cairo font-bold text-lg text-white truncate">{room?.title || 'الغرفة'}</h1>
          <button
            onClick={onShowConnectedList}
            className="inline-flex items-center gap-2 text-white/60 text-xs mt-0.5"
            data-testid="room-members-btn"
          >
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
              <span>{participants.length} متصل</span>
            </span>
            <span className="text-white/40">•</span>
            <span>{roomMembers.length || participants.length} عضو</span>
          </button>
        </div>

        {/* Left Side (RTL) - Settings & Share */}
        <div className="flex items-center gap-2">
          <button
            onClick={onShowInvite}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            data-testid="room-share-btn"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onShowSettings}
            className="w-10 h-10 rounded-full bg-[#CCFF00] hover:bg-[#B3E600] flex items-center justify-center transition-colors"
            data-testid="room-settings-btn"
          >
            <Settings className="w-5 h-5 text-black" />
          </button>
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 bg-red-500/20 px-3 py-1.5 mx-4 mt-2 rounded-full border border-red-500/30">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 text-sm font-bold font-mono">{formatRecordingTime(recordingTime)}</span>
        </div>
      )}

      {/* Seat Requests Badge */}
      {showSeatRequestsBadge && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={onShowSeatRequests}
          className="absolute top-16 right-4 flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 rounded-xl z-20"
          data-testid="seat-requests-button"
        >
          <Hand className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold text-sm">{seatRequests.length}</span>
        </motion.button>
      )}
    </>
  );
};

export default RoomHeader;
