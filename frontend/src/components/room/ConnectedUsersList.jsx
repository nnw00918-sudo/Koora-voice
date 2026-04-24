import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../../config/api';
import {
  Users,
  Mic,
  MicOff,
  Crown,
  Shield,
  Star,
  ArrowUp,
  ArrowDown,
  UserX,
  UserPlus,
  X
} from 'lucide-react';

export const ConnectedUsersList = ({
  show,
  onClose,
  participants,
  speakers,
  user,
  room,
  isRoomOwner,
  isRoomAdmin,
  canChangeRoles,
  canManage,
  onKickUser,
  onMuteUser,
  onUnmuteUser,
  onChangeRoomRole,
  onDemoteSpeaker,
  onSetSelectedPromoteUser,
  onShowPromoteModal
}) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  if (!show) return null;

  const uniqueParticipants = [...new Map(participants.map(p => [p.user_id || p.id, p])).values()];

  return (
    <motion.div
      key={`dropdown-${isRoomOwner}-${participants.length}`}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="absolute top-24 left-4 right-4 z-50 bg-slate-900 border border-lime-500/30 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <h3 className="text-white font-cairo font-bold">المتصلون</h3>
            <p className="text-slate-400 text-xs">اضغط على العضو للخيارات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-lime-500/30 text-lime-300 px-3 py-1 rounded-full text-sm font-bold">
            {uniqueParticipants.length}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
      
      {/* Participants List */}
      <div className="max-h-96 overflow-y-auto">
        {uniqueParticipants.map((p) => {
          const odId = p.user_id || p.id;
          const isSpeaker = speakers.some(s => s.user_id === odId);
          const speakerData = speakers.find(s => s.user_id === odId);
          const isMuted = speakerData?.user?.is_muted || false;
          const isCurrentUser = odId === user.id;
          const isOwnerOfRoom = room?.owner_id === odId;
          const userRoomRole = p.room_role || 'member';
          const isUserAdmin = userRoomRole === 'admin';
          const isUserMod = userRoomRole === 'mod';
          
          return (
            <div 
              key={odId} 
              className="border-b border-slate-800 last:border-0"
            >
              {/* User Row */}
              <div className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors">
                {/* Avatar */}
                <div 
                  className="relative cursor-pointer flex-shrink-0"
                  onClick={() => {
                    onClose();
                    navigate(`/user/${odId}`);
                  }}
                >
                  <img 
                    src={p.user?.avatar || p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                    alt=""
                    className={`w-14 h-14 rounded-full ring-2 ${
                      isOwnerOfRoom ? 'ring-amber-500' : 
                      isUserAdmin ? 'ring-purple-500' :
                      isUserMod ? 'ring-blue-500' :
                      isSpeaker ? 'ring-lime-500' : 'ring-slate-700'
                    }`}
                  />
                  {isSpeaker && (
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-slate-900 ${isMuted ? 'bg-red-500' : 'bg-lime-500'}`}>
                      {isMuted ? <MicOff className="w-3 h-3 text-white" /> : <Mic className="w-3 h-3 text-white" />}
                    </div>
                  )}
                  {isOwnerOfRoom && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-slate-900">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {isUserAdmin && !isOwnerOfRoom && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center ring-2 ring-slate-900">
                      <Shield className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {isUserMod && !isOwnerOfRoom && !isUserAdmin && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-slate-900">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-cairo font-bold truncate">{p.user?.name || p.username}</p>
                    {isCurrentUser && (
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">أنت</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm truncate">@{p.username}</p>
                  {/* Role Badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isOwnerOfRoom 
                        ? 'text-amber-400 bg-amber-500/20' 
                        : isUserAdmin
                          ? 'text-purple-400 bg-purple-500/20'
                          : isUserMod
                            ? 'text-blue-400 bg-blue-500/20'
                            : isSpeaker 
                              ? 'text-lime-400 bg-lime-500/20' 
                              : 'text-slate-400 bg-slate-700/50'
                    }`}>
                      {isOwnerOfRoom ? 'مالك الغرفة' : isUserAdmin ? 'أدمن' : isUserMod ? 'مود' : isSpeaker ? 'متحدث' : 'عضو'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons - Only for non-current users and if has permission */}
              {!isCurrentUser && !isOwnerOfRoom && canManage && (
                <div className="px-4 pb-4 flex flex-wrap gap-2">
                  {/* Role Change Buttons - Only for owner/admin */}
                  {canChangeRoles && (
                    <>
                      {/* Make Admin - Only owner can do this */}
                      {isRoomOwner && !isUserAdmin && (
                        <button
                          onClick={() => onChangeRoomRole(odId, 'admin', p.username)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-cairo transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          أدمن
                        </button>
                      )}
                      
                      {/* Make Mod - Owner or Admin can do this */}
                      {!isUserMod && !isUserAdmin && (
                        <button
                          onClick={() => onChangeRoomRole(odId, 'mod', p.username)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-cairo transition-colors"
                        >
                          <Star className="w-4 h-4" />
                          مود
                        </button>
                      )}
                      
                      {/* Remove Role */}
                      {(isUserAdmin || isUserMod) && isRoomOwner && (
                        <button
                          onClick={() => onChangeRoomRole(odId, 'member', p.username)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 text-sm font-cairo transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                          إزالة الرتبة
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Promote to Speaker / Demote to Listener */}
                  {isRoomOwner && (
                    isSpeaker ? (
                      <button
                        onClick={() => onDemoteSpeaker(odId)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-sm font-cairo transition-colors"
                      >
                        <ArrowDown className="w-4 h-4" />
                        تنزيل لمستمع
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onSetSelectedPromoteUser(p);
                          onShowPromoteModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-sm font-cairo transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                        ترقية لمتحدث
                      </button>
                    )
                  )}
                  
                  {/* Mute/Unmute - Only for speakers */}
                  {canManage && isSpeaker && (
                    <button
                      onClick={() => isMuted ? onUnmuteUser(odId) : onMuteUser(odId)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-cairo transition-colors ${
                        isMuted 
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                          : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                      }`}
                    >
                      {isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      {isMuted ? 'إلغاء الكتم' : 'كتم'}
                    </button>
                  )}
                  
                  {/* Kick User */}
                  {canManage && (
                    <button
                      onClick={() => onKickUser(odId)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-cairo transition-colors"
                    >
                      <UserX className="w-4 h-4" />
                      طرد
                    </button>
                  )}
                  
                  {/* Follow */}
                  <button
                    onClick={async () => {
                      try {
                        await axios.post(`${API}/users/${odId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
                        toast.success(`تمت متابعة ${p.username}`);
                      } catch (error) {
                        if (error.response?.status === 400) {
                          await axios.delete(`${API}/users/${odId}/follow`, { headers: { Authorization: `Bearer ${token}` } });
                          toast.success(`تم إلغاء متابعة ${p.username}`);
                        } else {
                          toast.error('فشلت العملية');
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-sm font-cairo transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    متابعة
                  </button>
                </div>
              )}
            </div>
          );
        })}
        
        {participants.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-cairo">لا يوجد متصلون حالياً</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ConnectedUsersList;
