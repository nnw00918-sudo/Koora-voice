import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Crown, Shield, Star, Volume2 } from 'lucide-react';

// Speaker Avatar Component - Shows a speaker on stage with glow effects
export const SpeakerAvatar = ({ 
  speaker, 
  isCurrentUser, 
  isOwner,
  isAdmin,
  isSpeaking,
  isMuted,
  onVolumeChange,
  localVolumes,
  onClick 
}) => {
  const speakerId = speaker?.user_id || speaker?.id;
  const avatar = speaker?.user?.avatar || speaker?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${speaker?.username}`;
  const name = speaker?.user?.name || speaker?.username || 'مستخدم';
  const username = speaker?.username || '';
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer group"
    >
      {/* Avatar Container with Glow */}
      <div className="relative">
        {/* Speaking Glow Ring */}
        {isSpeaking && !isMuted && (
          <>
            <div className="absolute inset-0 rounded-full bg-lime-500/30 animate-ping" />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-lime-400 to-lime-600 opacity-75 blur-sm animate-pulse" />
          </>
        )}
        
        {/* Avatar Image */}
        <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-3 transition-all duration-300 ${
          isSpeaking && !isMuted 
            ? 'border-lime-500 ring-4 ring-lime-500/50 shadow-[0_0_30px_rgba(132,204,22,0.5)]' 
            : isMuted 
              ? 'border-red-500/50 grayscale-[50%]'
              : 'border-slate-600 group-hover:border-lime-500/50'
        }`}>
          <img 
            src={avatar}
            alt={name}
            className="w-full h-full object-cover"
          />
          
          {/* Owner/Admin Badge */}
          {(isOwner || isAdmin) && (
            <div className={`absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center ${
              isOwner ? 'bg-amber-500' : 'bg-purple-500'
            }`}>
              {isOwner ? <Crown className="w-3 h-3 text-white" /> : <Shield className="w-3 h-3 text-white" />}
            </div>
          )}
        </div>
        
        {/* Mic Status Badge */}
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center border-2 border-slate-950 ${
          isMuted ? 'bg-red-500' : 'bg-lime-500'
        }`}>
          {isMuted ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-slate-900" />}
        </div>
      </div>
      
      {/* Name */}
      <div className="text-center max-w-[80px]">
        <p className="text-white font-cairo font-bold text-xs truncate">
          {isCurrentUser ? 'أنت' : name}
        </p>
        {isCurrentUser && (
          <p className="text-lime-400 text-[10px]">على المنصة</p>
        )}
      </div>
      
      {/* Volume Control (for other speakers) */}
      {!isCurrentUser && onVolumeChange && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg">
          <Volume2 className="w-3 h-3 text-slate-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={localVolumes?.[speakerId] || 100}
            onChange={(e) => onVolumeChange(speakerId, parseInt(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="w-16 h-1 accent-lime-500"
          />
        </div>
      )}
    </motion.div>
  );
};

// Empty Seat Component
export const EmptySeat = ({ seatNumber, onRequestSeat, isPending }) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center gap-2"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRequestSeat}
        disabled={isPending}
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
          isPending 
            ? 'border-amber-500/50 bg-amber-500/10 cursor-wait' 
            : 'border-slate-600 hover:border-lime-500 hover:bg-lime-500/10 bg-slate-800/30'
        }`}
      >
        {isPending ? (
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-slate-500 text-2xl font-light">+</span>
        )}
      </motion.button>
      <p className="text-slate-500 text-xs font-cairo">
        {isPending ? 'انتظار...' : `مقعد ${seatNumber}`}
      </p>
    </motion.div>
  );
};

// Speakers Grid Component
export const SpeakersGrid = ({ 
  speakers, 
  totalSeats = 12,
  currentUserId,
  roomOwnerId,
  admins = [],
  remoteUsers,
  onSpeakerClick,
  onRequestSeat,
  isPending,
  localVolumes,
  onVolumeChange
}) => {
  // Create array of seats
  const seatArray = Array(totalSeats).fill(null).map((_, index) => {
    const speaker = speakers[index];
    return speaker || { isEmpty: true, seatNumber: index + 1 };
  });

  return (
    <div className="w-full">
      {/* Stage Header */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-lime-500/30 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 bg-lime-500/10 border border-lime-500/30 rounded-full">
          <Star className="w-4 h-4 text-lime-400" />
          <span className="text-lime-400 font-cairo font-bold text-sm">المنصة</span>
          <span className="text-lime-300/70 text-xs">({speakers.length}/{totalSeats})</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-lime-500/30 to-transparent" />
      </div>

      {/* Speakers Grid */}
      <div className="grid grid-cols-4 md:grid-cols-6 gap-4 md:gap-6 justify-items-center max-w-3xl mx-auto">
        {seatArray.map((seat, index) => {
          if (seat.isEmpty) {
            return (
              <EmptySeat 
                key={`empty-${index}`}
                seatNumber={seat.seatNumber}
                onRequestSeat={onRequestSeat}
                isPending={isPending}
              />
            );
          }
          
          const speakerId = seat.user_id || seat.id;
          const isCurrentUser = speakerId === currentUserId;
          const isOwner = speakerId === roomOwnerId;
          const isAdmin = admins.includes(speakerId);
          const remoteUser = remoteUsers?.find(ru => ru.uid === speakerId);
          const isSpeaking = remoteUser?.hasAudio || (isCurrentUser && true);
          const isMuted = seat.user?.is_muted || seat.is_muted;
          
          return (
            <SpeakerAvatar
              key={speakerId}
              speaker={seat}
              isCurrentUser={isCurrentUser}
              isOwner={isOwner}
              isAdmin={isAdmin}
              isSpeaking={isSpeaking}
              isMuted={isMuted}
              localVolumes={localVolumes}
              onVolumeChange={onVolumeChange}
              onClick={() => onSpeakerClick?.(seat)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SpeakersGrid;
