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
  ChevronUp
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ROOM_ROLES = [
  { value: 'admin', label: 'أدمن', icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50' },
  { value: 'mod', label: 'مود', icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50' },
  { value: 'member', label: 'عضو', icon: User, color: 'text-slate-400', bgColor: 'bg-slate-500/20', borderColor: 'border-slate-500/50' }
];

export const UserRolesModal = ({
  isOpen,
  onClose,
  roomId,
  roomMembers = [],
  currentUserId,
  isOwner,
  onRoleUpdated
}) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [roomRoles, setRoomRoles] = useState({});
  const token = localStorage.getItem('token');

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
    if (!isOwner) {
      toast.error('فقط صاحب الغرفة يمكنه تغيير الرتب');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/rooms/${roomId}/roles/${userId}`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`تم تغيير الرتبة بنجاح`);
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

  const getRoleInfo = (userId, ownerId) => {
    if (userId === ownerId) {
      return { value: 'owner', label: 'المالك', icon: Crown, color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
    }
    
    const role = roomRoles[userId] || 'member';
    return ROOM_ROLES.find(r => r.value === role) || ROOM_ROLES[2];
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
          <div className="px-6 py-3 border-b border-slate-800 flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-1 text-xs">
              <Crown className="w-3 h-3 text-purple-400" />
              <span className="text-purple-400">المالك</span>
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
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">عضو</span>
            </div>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {roomMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-cairo">لا يوجد أعضاء</p>
              </div>
            ) : (
              roomMembers.map((member) => {
                const roleInfo = getRoleInfo(member.user_id || member.id, member.owner_id || roomMembers.find(m => m.is_owner)?.user_id);
                const RoleIcon = roleInfo.icon;
                const isCurrentUser = (member.user_id || member.id) === currentUserId;
                const isMemberOwner = roleInfo.value === 'owner';
                const canEdit = isOwner && !isMemberOwner && !isCurrentUser;

                return (
                  <div
                    key={member.user_id || member.id}
                    className={`p-3 rounded-xl ${roleInfo.bgColor} border ${roleInfo.borderColor || 'border-slate-700'} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <img
                        src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                        alt={member.username}
                        className="w-10 h-10 rounded-full border-2 border-white/20"
                      />
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-cairo font-bold text-white text-sm truncate">
                            {member.username}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-lime-500/20 text-lime-400 px-1.5 py-0.5 rounded">أنت</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <RoleIcon className={`w-3 h-3 ${roleInfo.color}`} />
                          <span className={`text-xs ${roleInfo.color}`}>{roleInfo.label}</span>
                        </div>
                      </div>
                      
                      {/* Role Selector */}
                      {canEdit && (
                        <div className="relative">
                          <button
                            onClick={() => setSelectedUser(selectedUser === member.user_id ? null : member.user_id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-cairo transition-colors"
                            disabled={loading}
                          >
                            تغيير
                            {selectedUser === member.user_id ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                          
                          {/* Dropdown */}
                          <AnimatePresence>
                            {selectedUser === member.user_id && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-0 mt-1 w-32 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-10 overflow-hidden"
                              >
                                {ROOM_ROLES.map((role) => {
                                  const Icon = role.icon;
                                  const isCurrentRole = (roomRoles[member.user_id] || 'member') === role.value;
                                  
                                  return (
                                    <button
                                      key={role.value}
                                      onClick={() => handleChangeRole(member.user_id, role.value)}
                                      disabled={loading || isCurrentRole}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-cairo transition-colors ${
                                        isCurrentRole 
                                          ? 'bg-slate-700 text-slate-400' 
                                          : 'hover:bg-slate-700 text-white'
                                      }`}
                                    >
                                      <Icon className={`w-3 h-3 ${role.color}`} />
                                      <span>{role.label}</span>
                                      {isCurrentRole && <span className="mr-auto text-[10px]">الحالي</span>}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
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
