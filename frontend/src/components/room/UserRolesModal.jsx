import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Crown,
  Shield,
  Star,
  User,
  X,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Newspaper
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ROOM_ROLES = [
  { value: 'leader', label: 'رئيس الغرفة', icon: Crown, color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/20', borderColor: 'border-fuchsia-500/50' },
  { value: 'admin', label: 'أدمن', icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50' },
  { value: 'mod', label: 'مود', icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50' },
  { value: 'news_reporter', label: 'إخباري', icon: Newspaper, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/50' },
  { value: 'member', label: 'عضو', icon: User, color: 'text-slate-400', bgColor: 'bg-slate-500/20', borderColor: 'border-slate-500/50' }
];

export const UserRolesModal = ({
  isOpen,
  onClose,
  roomId,
  roomMembers = [],
  currentUserId,
  isOwner,
  ownerId,
  onRoleUpdated,
  onInviteToStage,
  onRemoveFromStage,
  speakers = []
}) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [roomRoles, setRoomRoles] = useState({});
  const token = localStorage.getItem('token');

  // Check if current user is leader
  const isLeader = roomRoles[currentUserId] === 'leader';
  const canManageRoles = isOwner || isLeader;

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRoomRoles();
    }
  }, [isOpen, roomId]);

  const fetchRoomRoles = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Convert array to object for easy lookup
      const rolesMap = {};
      (response.data.roles || []).forEach(r => {
        rolesMap[r.user_id] = r.role;
      });
      setRoomRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching room roles:', error);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!canManageRoles) {
      toast.error('ليس لديك صلاحية تغيير الرتب');
      return;
    }

    // Leader can't promote to leader (only owner can)
    if (newRole === 'leader' && !isOwner) {
      toast.error('فقط صاحب الغرفة يمكنه تعيين رئيس الغرفة');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/rooms/${roomId}/roles/${userId}`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const roleLabel = ROOM_ROLES.find(r => r.value === newRole)?.label || newRole;
      toast.success(`تم تغيير الرتبة إلى ${roleLabel}`);
      setRoomRoles(prev => ({ ...prev, [userId]: newRole }));
      setSelectedUser(null);
      
      if (onRoleUpdated) {
        onRoleUpdated(userId, newRole);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل تغيير الرتبة');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteToStage = async (userId, username) => {
    if (!canManageRoles) {
      toast.error('ليس لديك صلاحية لإدارة المايك');
      return;
    }

    try {
      await axios.post(`${API}/rooms/${roomId}/invite-stage/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`تم دعوة ${username} للمايك`);
      if (onInviteToStage) onInviteToStage(userId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل دعوة المستخدم للمايك');
    }
  };

  const handleRemoveFromStage = async (userId, username) => {
    if (!canManageRoles) {
      toast.error('ليس لديك صلاحية لإدارة المايك');
      return;
    }

    try {
      await axios.post(`${API}/rooms/${roomId}/kick-stage/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`تم إنزال ${username} من المايك`);
      if (onRemoveFromStage) onRemoveFromStage(userId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إنزال المستخدم من المايك');
    }
  };

  const getRoleInfo = (memberId) => {
    // Check if this user is the owner
    if (memberId === ownerId) {
      return { value: 'owner', label: 'المالك', icon: Crown, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50' };
    }
    
    const role = roomRoles[memberId] || 'member';
    return ROOM_ROLES.find(r => r.value === role) || ROOM_ROLES[3]; // Default to member
  };

  // Check if user is on stage (speaking)
  const isOnStage = (memberId) => {
    return speakers.some(s => s.user_id === memberId || s.id === memberId);
  };

  // Get member ID - handle different data structures
  const getMemberId = (member) => {
    return member.user_id || member.id;
  };

  // Get member username
  const getMemberUsername = (member) => {
    return member.username || member.name || 'مستخدم';
  };

  // Get member avatar
  const getMemberAvatar = (member) => {
    return member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getMemberUsername(member)}`;
  };

  // Get available roles for dropdown based on who is changing
  const getAvailableRoles = () => {
    if (isOwner) {
      return ROOM_ROLES; // Owner can set any role including leader
    }
    if (isLeader) {
      return ROOM_ROLES.filter(r => r.value !== 'leader'); // Leader can't set another leader
    }
    return [];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-md rounded-3xl border border-emerald-500/30 max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
              <div className="text-center flex-1">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-cairo font-bold text-white">رتب المستخدمين</h3>
                <p className="text-slate-400 text-xs font-almarai">إدارة أدوار الأعضاء في الغرفة</p>
              </div>
              <div className="w-6" /> {/* Spacer */}
            </div>
          </div>

          {/* Role Legend */}
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-1 text-xs">
              <Crown className="w-3 h-3 text-purple-400" />
              <span className="text-purple-400">المالك</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Crown className="w-3 h-3 text-fuchsia-400" />
              <span className="text-fuchsia-400">رئيس</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Shield className="w-3 h-3 text-red-400" />
              <span className="text-red-400">أدمن</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400">مود</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Newspaper className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-400">إخباري</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">عضو</span>
            </div>
          </div>

          {/* Members Count */}
          <div className="px-6 py-2 bg-slate-800/50">
            <span className="text-slate-400 text-xs font-almarai">
              {roomMembers.length} عضو في الغرفة
            </span>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {roomMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-cairo">لا يوجد أعضاء</p>
              </div>
            ) : (
              roomMembers.map((member, index) => {
                const memberId = getMemberId(member);
                const memberUsername = getMemberUsername(member);
                const memberAvatar = getMemberAvatar(member);
                const roleInfo = getRoleInfo(memberId);
                const RoleIcon = roleInfo.icon;
                const isCurrentUser = memberId === currentUserId;
                const isMemberOwner = memberId === ownerId;
                const isMemberLeader = roomRoles[memberId] === 'leader';
                const memberOnStage = isOnStage(memberId);
                
                // Can edit if: owner (can edit anyone except self), or leader (can edit non-owner, non-leader, non-self)
                const canEdit = (isOwner && !isCurrentUser) || 
                               (isLeader && !isMemberOwner && !isMemberLeader && !isCurrentUser);

                return (
                  <div
                    key={memberId || index}
                    className={`p-3 rounded-xl ${roleInfo.bgColor} border ${roleInfo.borderColor || 'border-slate-700'} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar with mic indicator */}
                      <div className="relative">
                        <img
                          src={memberAvatar}
                          alt={memberUsername}
                          className="w-10 h-10 rounded-full border-2 border-white/20 object-cover"
                        />
                        {memberOnStage && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-lime-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                            <Mic className="w-2.5 h-2.5 text-black" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-cairo font-bold text-white text-sm truncate">
                            {memberUsername}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-lime-500/20 text-lime-400 px-1.5 py-0.5 rounded">أنت</span>
                          )}
                          {memberOnStage && (
                            <span className="text-[10px] bg-lime-500/20 text-lime-400 px-1.5 py-0.5 rounded">على المايك</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <RoleIcon className={`w-3 h-3 ${roleInfo.color}`} />
                          <span className={`text-xs ${roleInfo.color}`}>{roleInfo.label}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          {/* Mic Control */}
                          {memberOnStage ? (
                            <button
                              onClick={() => handleRemoveFromStage(memberId, memberUsername)}
                              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                              title="إنزال من المايك"
                            >
                              <MicOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleInviteToStage(memberId, memberUsername)}
                              className="p-1.5 rounded-lg bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 transition-colors"
                              title="رفع للمايك"
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Role Selector */}
                          <div className="relative">
                            <button
                              onClick={() => setSelectedUser(selectedUser === memberId ? null : memberId)}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-cairo transition-colors"
                              disabled={loading}
                            >
                              رتبة
                              {selectedUser === memberId ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            
                            {/* Dropdown */}
                            <AnimatePresence>
                              {selectedUser === memberId && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute left-0 mt-1 w-36 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-10 overflow-hidden"
                                >
                                  {getAvailableRoles().map((role) => {
                                    const Icon = role.icon;
                                    const isCurrentRole = (roomRoles[memberId] || 'member') === role.value;
                                    
                                    return (
                                      <button
                                        key={role.value}
                                        onClick={() => handleChangeRole(memberId, role.value)}
                                        disabled={loading || isCurrentRole}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-cairo transition-colors ${
                                          isCurrentRole 
                                            ? 'bg-slate-700 text-slate-400' 
                                            : 'hover:bg-slate-700 text-white'
                                        }`}
                                      >
                                        <Icon className={`w-3 h-3 ${role.color}`} />
                                        <span>{role.label}</span>
                                        {isCurrentRole && <span className="mr-auto text-[10px]">✓</span>}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-cairo font-bold transition-colors"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserRolesModal;
