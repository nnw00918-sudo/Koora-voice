import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Crown,
  Shield,
  Star,
  User,
  X,
  Mic,
  MicOff,
  Newspaper,
  Check
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Primary roles (user can have only one)
const PRIMARY_ROLES = [
  { value: 'leader', label: 'رئيس الغرفة', icon: Crown, color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/20', borderColor: 'border-fuchsia-500/50' },
  { value: 'admin', label: 'أدمن', icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50' },
  { value: 'mod', label: 'مود', icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50' },
  { value: 'member', label: 'عضو', icon: User, color: 'text-slate-400', bgColor: 'bg-slate-500/20', borderColor: 'border-slate-500/50' }
];

// Addon roles (can be combined with primary roles)
const ADDON_ROLES = [
  { value: 'news_reporter', label: 'إخباري', icon: Newspaper, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/50' }
];

const ALL_ROLES = [...PRIMARY_ROLES, ...ADDON_ROLES];

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
  const [roomRoles, setRoomRoles] = useState({}); // { user_id: [roles array] }
  const token = localStorage.getItem('token');

  // Check if current user is leader
  const currentUserRoles = roomRoles[currentUserId] || [];
  const isLeader = currentUserRoles.includes('leader');
  const canManageRoles = isOwner || isLeader;

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRoomRoles();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomId]);

  const fetchRoomRoles = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Convert array to object with roles as arrays
      const rolesMap = {};
      (response.data.roles || []).forEach(r => {
        // Handle both old format (role) and new format (roles)
        const userRoles = r.roles || (r.role ? [r.role] : []);
        rolesMap[r.user_id] = userRoles;
      });
      setRoomRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching room roles:', error);
    }
  };

  const handleToggleRole = async (userId, role, isAdding) => {
    if (!canManageRoles) {
      toast.error('ليس لديك صلاحية تغيير الرتب');
      return;
    }

    // Leader can't be set by non-owner
    if (role === 'leader' && !isOwner) {
      toast.error('فقط صاحب الغرفة يمكنه تعيين رئيس الغرفة');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isAdding 
        ? `${API}/rooms/${roomId}/roles/${userId}/add`
        : `${API}/rooms/${roomId}/roles/${userId}/remove`;
      
      const response = await axios.post(endpoint, 
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(response.data.message);
      
      // Update local state with new roles
      setRoomRoles(prev => ({
        ...prev,
        [userId]: response.data.roles || []
      }));
      
      if (onRoleUpdated) {
        onRoleUpdated(userId, response.data.roles);
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

  const getUserRoleInfo = (memberId) => {
    // Check if this user is the owner
    if (memberId === ownerId) {
      return { 
        roles: ['owner'], 
        primaryRole: { value: 'owner', label: 'المالك', icon: Crown, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50' }
      };
    }
    
    const userRoles = roomRoles[memberId] || [];
    
    // Find primary role
    let primaryRole = PRIMARY_ROLES.find(r => r.value === 'member'); // default
    for (const role of PRIMARY_ROLES) {
      if (userRoles.includes(role.value)) {
        primaryRole = role;
        break;
      }
    }
    
    return { roles: userRoles, primaryRole };
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
                <p className="text-slate-400 text-xs font-almarai">يمكن إضافة أكثر من رتبة للمستخدم</p>
              </div>
              <div className="w-6" />
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
                const { roles: memberRoles, primaryRole } = getUserRoleInfo(memberId);
                const RoleIcon = primaryRole.icon;
                const isCurrentUser = memberId === currentUserId;
                const isMemberOwner = memberId === ownerId;
                const memberOnStage = isOnStage(memberId);
                
                // Can edit if owner (can edit anyone except self)
                const canEdit = isOwner && !isCurrentUser && !isMemberOwner;

                return (
                  <div
                    key={memberId || index}
                    className={`p-3 rounded-xl ${primaryRole.bgColor} border ${primaryRole.borderColor || 'border-slate-700'} transition-colors`}
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
                        {/* Show all roles */}
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {memberRoles.length > 0 ? memberRoles.map(role => {
                            const roleInfo = ALL_ROLES.find(r => r.value === role) || 
                              (role === 'owner' ? { icon: Crown, color: 'text-purple-400', label: 'المالك' } : null);
                            if (!roleInfo) return null;
                            const Icon = roleInfo.icon;
                            return (
                              <span key={role} className={`flex items-center gap-0.5 text-xs ${roleInfo.color}`}>
                                <Icon className="w-3 h-3" />
                                <span>{roleInfo.label}</span>
                              </span>
                            );
                          }) : (
                            <span className="text-xs text-slate-400">عضو</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {/* Mic Control */}
                        {canManageRoles && !isMemberOwner && !isCurrentUser && (
                          <>
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
                          </>
                        )}
                        
                        {/* Role Selector Button */}
                        {canEdit && (
                          <button
                            onClick={() => setSelectedUser(selectedUser === memberId ? null : memberId)}
                            className="px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-cairo transition-colors"
                            disabled={loading}
                          >
                            تعديل الرتب
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Role Selection Panel */}
                    <AnimatePresence>
                      {selectedUser === memberId && canEdit && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-white/10"
                        >
                          <p className="text-slate-400 text-xs mb-2 font-cairo">الرتبة الرئيسية (اختر واحدة):</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {PRIMARY_ROLES.map((role) => {
                              const Icon = role.icon;
                              const isActive = memberRoles.includes(role.value);
                              
                              return (
                                <button
                                  key={role.value}
                                  onClick={() => handleToggleRole(memberId, role.value, !isActive)}
                                  disabled={loading || (role.value === 'leader' && !isOwner)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-cairo transition-all ${
                                    isActive 
                                      ? `${role.bgColor} ${role.color} border ${role.borderColor}` 
                                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 border border-transparent'
                                  } ${(role.value === 'leader' && !isOwner) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  <span>{role.label}</span>
                                  {isActive && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                          
                          <p className="text-slate-400 text-xs mb-2 font-cairo">رتب إضافية (يمكن دمجها):</p>
                          <div className="flex flex-wrap gap-2">
                            {ADDON_ROLES.map((role) => {
                              const Icon = role.icon;
                              const isActive = memberRoles.includes(role.value);
                              
                              return (
                                <button
                                  key={role.value}
                                  onClick={() => handleToggleRole(memberId, role.value, !isActive)}
                                  disabled={loading}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-cairo transition-all ${
                                    isActive 
                                      ? `${role.bgColor} ${role.color} border ${role.borderColor}` 
                                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 border border-transparent'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  <span>{role.label}</span>
                                  {isActive && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
