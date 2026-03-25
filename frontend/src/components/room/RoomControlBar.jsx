/**
 * RoomControlBar Component
 * Bottom action bar with stage controls
 */
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, Hand, 
  Tv, Gift, BarChart3, Circle, StopCircle,
  ArrowDown
} from 'lucide-react';

export const RoomControlBar = ({
  user,
  room,
  currentUserRole,
  isOnStage,
  isMuted,
  hasCamera,
  hasRaisedHand,
  isRecording,
  onToggleMic,
  onToggleCamera,
  onRaiseHand,
  onLeaveStage,
  onRequestSeat,
  onToggleRecording,
  onShowGiftModal,
  onShowStreamModal,
  onShowPollModal,
  onShowWatchPartyModal
}) => {
  const isRoomOwner = room?.owner_id === user.id;
  const isRoomAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';
  const canAutoJoinStage = currentUserRole === 'admin' || currentUserRole === 'mod' || currentUserRole === 'owner';

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="px-4 py-3">
        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Stage Control Button */}
          {isOnStage ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onLeaveStage}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400"
              data-testid="leave-stage-btn"
            >
              <ArrowDown className="w-5 h-5" />
              <span className="font-cairo font-bold text-sm">نزول من المنصة</span>
            </motion.button>
          ) : canAutoJoinStage ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onRequestSeat}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#CCFF00] text-black"
              data-testid="join-stage-btn"
            >
              <Mic className="w-5 h-5" />
              <span className="font-cairo font-bold text-sm">صعود للمنصة</span>
            </motion.button>
          ) : hasRaisedHand ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onRaiseHand}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-400"
              data-testid="cancel-request-btn"
            >
              <Hand className="w-5 h-5" />
              <span className="font-cairo font-bold text-sm">إلغاء الطلب</span>
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onRaiseHand}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#CCFF00] text-black"
              data-testid="raise-hand-btn"
            >
              <Hand className="w-5 h-5" />
              <span className="font-cairo font-bold text-sm">طلب التحدث</span>
            </motion.button>
          )}

          {/* Mic Button (only when on stage) */}
          {isOnStage && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onToggleMic}
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isMuted 
                  ? 'bg-red-500/20 border border-red-500/50' 
                  : 'bg-lime-500/20 border border-lime-500/50'
              }`}
              data-testid="mic-toggle-btn"
            >
              {isMuted ? (
                <MicOff className="w-5 h-5 text-red-400" />
              ) : (
                <Mic className="w-5 h-5 text-lime-400" />
              )}
            </motion.button>
          )}

          {/* Camera Button (only when on stage) */}
          {isOnStage && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onToggleCamera}
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                hasCamera 
                  ? 'bg-purple-500/20 border border-purple-500/50' 
                  : 'bg-white/5 border border-white/10'
              }`}
              data-testid="camera-toggle-btn"
            >
              {hasCamera ? (
                <Video className="w-5 h-5 text-purple-400" />
              ) : (
                <VideoOff className="w-5 h-5 text-white/50" />
              )}
            </motion.button>
          )}

          {/* Gift Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onShowGiftModal}
            className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/50 flex items-center justify-center"
            data-testid="gift-btn"
          >
            <Gift className="w-5 h-5 text-pink-400" />
          </motion.button>
        </div>

        {/* Secondary Controls (for admins/owners) */}
        {isRoomAdmin && (
          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-white/10">
            {/* Stream Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onShowStreamModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/20 border border-violet-500/50"
              data-testid="stream-btn"
            >
              <Tv className="w-4 h-4 text-violet-400" />
              <span className="text-violet-300 text-xs font-cairo">بث</span>
            </motion.button>

            {/* Poll Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onShowPollModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50"
              data-testid="poll-btn"
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-xs font-cairo">استطلاع</span>
            </motion.button>

            {/* Record Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onToggleRecording}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${
                isRecording 
                  ? 'bg-red-500/30 border border-red-500' 
                  : 'bg-red-500/20 border border-red-500/50'
              }`}
              data-testid="record-btn"
            >
              {isRecording ? (
                <StopCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Circle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-red-300 text-xs font-cairo">
                {isRecording ? 'إيقاف' : 'تسجيل'}
              </span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomControlBar;
