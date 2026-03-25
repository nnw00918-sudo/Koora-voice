/**
 * SpeakersGrid Component
 * 4x3 grid of speaker seats with video/audio indicators
 */
import React from 'react';
import { motion } from 'framer-motion';
import { MicOff, Video, VideoOff, Crown, Shield, Star } from 'lucide-react';

export const SpeakerAvatar = ({
  seat,
  index,
  user,
  isRoomOwner,
  isRoomAdmin,
  currentUserRole,
  room,
  remoteUsers,
  localCameraStream,
  hasLocalCamera,
  cameraFacing,
  onSeatClick,
  onAvatarClick
}) => {
  const isCurrentUser = seat.user_id === user.id;
  const hasVideo = seat.user?.has_video || false;
  const isOnStageWithCameraOff = seat.user?.on_stage && !hasVideo;
  const remoteVideo = remoteUsers.find(u => String(u.uid) === String(seat.agora_uid));
  
  // Get room role for badge
  const roomRole = seat.user?.room_role || 'member';
  const isOwner = roomRole === 'owner' || seat.user_id === room?.owner_id;
  const isAdmin = roomRole === 'admin';
  const isMod = roomRole === 'mod';

  const getRoleBadge = () => {
    if (isOwner) return { icon: Crown, color: 'bg-amber-500', label: 'مالك' };
    if (isAdmin) return { icon: Shield, color: 'bg-violet-500', label: 'أدمن' };
    if (isMod) return { icon: Star, color: 'bg-blue-500', label: 'مود' };
    return null;
  };

  const badge = getRoleBadge();

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <button
          onClick={() => onSeatClick(seat, index)}
          className={`
            w-14 h-14 rounded-full overflow-hidden relative
            ring-2 ring-offset-2 ring-offset-[#0A0A0A]
            ${isOwner ? 'ring-amber-500' : isAdmin ? 'ring-violet-500' : isMod ? 'ring-blue-500' : 'ring-lime-500/50'}
            ${seat.user?.is_speaking ? 'ring-4 ring-lime-500 animate-pulse' : ''}
          `}
          data-testid={`speaker-seat-${index}`}
        >
          {isCurrentUser && hasLocalCamera ? (
            <video
              ref={(el) => {
                if (el && localCameraStream?.current) {
                  el.srcObject = localCameraStream.current;
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
            />
          ) : remoteVideo ? (
            <RemoteVideoCircle remoteUser={remoteVideo} />
          ) : (
            <div className="relative w-full h-full">
              <img 
                src={seat.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seat.user_id}`} 
                alt="" 
                className="w-full h-full object-cover" 
              />
              {isOnStageWithCameraOff && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-red-400" />
                </div>
              )}
            </div>
          )}
        </button>
        
        {/* Muted Indicator */}
        {seat.user.is_muted && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* Video Indicator */}
        {hasVideo && (
          <div className="absolute -top-1 -left-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
            <Video className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* Role Badge */}
        {badge && (
          <div className={`absolute -top-1 -right-1 w-5 h-5 ${badge.color} rounded-full flex items-center justify-center`}>
            <badge.icon className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      {/* Name */}
      <p className="text-white text-xs font-cairo mt-1.5 max-w-[70px] truncate text-center">
        {seat.user.name || seat.user.username}
      </p>
    </div>
  );
};

export const EmptySeat = ({ index }) => (
  <div className="flex flex-col items-center">
    <div className="w-14 h-14 rounded-full border-2 border-dashed border-lime-500/30 bg-slate-800/30" />
    <p className="text-slate-500 text-xs font-cairo mt-1.5">فارغ</p>
  </div>
);

export const RemoteVideoCircle = ({ remoteUser }) => {
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    if (remoteUser && remoteUser.videoTrack && videoRef.current) {
      remoteUser.videoTrack.play(videoRef.current);
    }
    return () => {
      if (remoteUser && remoteUser.videoTrack) {
        remoteUser.videoTrack.stop();
      }
    };
  }, [remoteUser]);

  return (
    <div
      ref={videoRef}
      className="w-full h-full rounded-full overflow-hidden"
      style={{ objectFit: 'cover' }}
    />
  );
};

export const SpeakersGrid = ({
  seats,
  user,
  room,
  isRoomOwner,
  isRoomAdmin,
  currentUserRole,
  remoteUsers,
  localCameraStream,
  hasLocalCamera,
  cameraFacing,
  onSeatClick,
  onAvatarClick
}) => {
  const occupiedSeats = seats.filter(s => s.occupied);
  const emptySeatsCount = 12 - occupiedSeats.length;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/60 text-xs font-cairo">المايكات</span>
        <span className="text-lime-400 text-xs font-cairo font-bold">{occupiedSeats.length}/12</span>
      </div>
      
      <div className="grid grid-cols-4 gap-3 place-items-center">
        {occupiedSeats.map((seat, i) => (
          <SpeakerAvatar
            key={seat.user_id || i}
            seat={seat}
            index={i}
            user={user}
            room={room}
            isRoomOwner={isRoomOwner}
            isRoomAdmin={isRoomAdmin}
            currentUserRole={currentUserRole}
            remoteUsers={remoteUsers}
            localCameraStream={localCameraStream}
            hasLocalCamera={hasLocalCamera}
            cameraFacing={cameraFacing}
            onSeatClick={onSeatClick}
            onAvatarClick={onAvatarClick}
          />
        ))}
        
        {/* Empty seats placeholders */}
        {[...Array(Math.min(emptySeatsCount, 4))].map((_, i) => (
          <EmptySeat key={`empty-${i}`} index={occupiedSeats.length + i} />
        ))}
      </div>
    </div>
  );
};

export default SpeakersGrid;
