import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Radio,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  UserX,
  Shield,
  Megaphone,
  BarChart3
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [newRoom, setNewRoom] = useState({
    id: '',
    name: '',
    name_en: '',
    description: '',
    image: ''
  });

  const token = localStorage.getItem('token');
  
  // Check access - only owner can access
  const isOwner = user.role === 'owner';
  const canPromoteUsers = user.role === 'owner'; // Only owner can change roles

  useEffect(() => {
    if (user.role !== 'owner') {
      toast.error('لا تملك صلاحيات للوصول');
      navigate('/dashboard');
      return;
    }
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('فشل تحميل بيانات Admin');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/rooms`, newRoom, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم إنشاء الغرفة بنجاح');
      setNewRoom({ id: '', name: '', name_en: '', description: '', image: '' });
      fetchAdminData();
    } catch (error) {
      toast.error('فشل إنشاء الغرفة');
    }
  };

  const handleToggleRoom = async (roomId) => {
    try {
      const response = await axios.post(
        `${API}/admin/rooms/${roomId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      fetchAdminData();
    } catch (error) {
      toast.error('فشل تغيير حالة الغرفة');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الغرفة؟')) return;
    
    try {
      await axios.delete(`${API}/admin/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم حذف الغرفة بنجاح');
      fetchAdminData();
    } catch (error) {
      toast.error('فشل حذف الغرفة');
    }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm('هل أنت متأكد من حظر هذا المستخدم؟')) return;
    
    try {
      await axios.post(
        `${API}/admin/users/${userId}/ban`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم حظر المستخدم');
      fetchAdminData();
    } catch (error) {
      toast.error('فشل حظر المستخدم');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await axios.post(
        `${API}/admin/users/${userId}/unban`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم إلغاء حظر المستخدم');
      fetchAdminData();
    } catch (error) {
      toast.error('فشل إلغاء الحظر');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await axios.post(
        `${API}/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`تم تحديث الصلاحية إلى ${newRole}`);
      fetchAdminData();
    } catch (error) {
      toast.error('فشل تحديث الصلاحية');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    try {
      await axios.post(
        `${API}/admin/broadcast`,
        { message: broadcastMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم إرسال الإعلان لجميع الغرف');
      setBroadcastMessage('');
    } catch (error) {
      toast.error('فشل إرسال الإعلان');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-lime-400 text-xl font-cairo">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button
              data-testid="back-btn"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="icon"
              className="hover:bg-slate-800 text-slate-400"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <div className="flex-1 text-right">
              <h1 className="text-xl font-cairo font-bold text-white">لوحة تحكم Admin</h1>
              <p className="text-xs text-slate-400 font-almarai">إدارة كاملة للتطبيق</p>
            </div>
            <Shield className="w-6 h-6 text-lime-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 overflow-x-auto hide-scrollbar">
          {[
            { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
            { id: 'rooms', label: 'الغرف', icon: Radio },
            { id: 'users', label: 'المستخدمين', icon: Users },
            { id: 'broadcast', label: 'الإعلانات', icon: Megaphone }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-cairo font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-lime-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" strokeWidth={2} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4"
              >
                <Users className="w-8 h-8 text-lime-400 mb-2" strokeWidth={1.5} />
                <p className="text-3xl font-chivo font-bold text-white">{stats.total_users}</p>
                <p className="text-sm text-slate-400 font-almarai">إجمالي المستخدمين</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4"
              >
                <Radio className="w-8 h-8 text-sky-400 mb-2" strokeWidth={1.5} />
                <p className="text-3xl font-chivo font-bold text-white">{stats.active_users_now}</p>
                <p className="text-sm text-slate-400 font-almarai">المستخدمين النشطين</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4"
              >
                <MessageSquare className="w-8 h-8 text-lime-400 mb-2" strokeWidth={1.5} />
                <p className="text-3xl font-chivo font-bold text-white">{stats.total_messages}</p>
                <p className="text-sm text-slate-400 font-almarai">إجمالي الرسائل</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4"
              >
                <Radio className="w-8 h-8 text-sky-400 mb-2" strokeWidth={1.5} />
                <p className="text-3xl font-chivo font-bold text-white">{stats.total_rooms}</p>
                <p className="text-sm text-slate-400 font-almarai">إجمالي الغرف</p>
              </motion.div>
            </div>

            {/* Room Stats */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4">
              <h3 className="text-lg font-cairo font-bold text-white mb-4 text-right">إحصائيات الغرف</h3>
              <div className="space-y-3">
                {stats.rooms.map((room) => (
                  <div
                    key={room.room_id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-lime-400">
                        <Users className="w-4 h-4" strokeWidth={1.5} />
                        <span className="text-sm font-chivo">{room.active_users}</span>
                      </div>
                      {room.is_closed && (
                        <Lock className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                      )}
                    </div>
                    <p className="text-white font-cairo">{room.room_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && stats && (
          <div className="p-4 space-y-4">
            {/* Create Room Form */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4">
              <h3 className="text-lg font-cairo font-bold text-white mb-4 text-right flex items-center gap-2 justify-end">
                <Plus className="w-5 h-5 text-lime-400" strokeWidth={2} />
                إنشاء غرفة جديدة
              </h3>
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="ID (مثال: news)"
                    value={newRoom.id}
                    onChange={(e) => setNewRoom({ ...newRoom, id: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white text-right"
                    dir="ltr"
                    required
                  />
                  <Input
                    placeholder="اسم الغرفة بالعربي"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white text-right"
                    dir="rtl"
                    required
                  />
                </div>
                <Input
                  placeholder="English Name"
                  value={newRoom.name_en}
                  onChange={(e) => setNewRoom({ ...newRoom, name_en: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
                <Input
                  placeholder="الوصف"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white text-right"
                  dir="rtl"
                  required
                />
                <Input
                  placeholder="رابط الصورة (Unsplash URL)"
                  value={newRoom.image}
                  onChange={(e) => setNewRoom({ ...newRoom, image: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  dir="ltr"
                  required
                />
                <Button
                  type="submit"
                  className="w-full bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold"
                >
                  إنشاء الغرفة
                </Button>
              </form>
            </div>

            {/* Rooms List */}
            <div className="space-y-3">
              {stats.rooms.map((room) => (
                <motion.div
                  key={room.room_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleToggleRoom(room.room_id)}
                        size="sm"
                        className={`${
                          room.is_closed
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-green-500 hover:bg-green-600'
                        } text-white`}
                      >
                        {room.is_closed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={() => handleDeleteRoom(room.room_id)}
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-cairo font-bold">{room.room_name}</p>
                      <p className="text-xs text-slate-400 font-almarai">
                        {room.active_users} مستخدم نشط
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="p-4 space-y-3">
            {users.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatar}
                    alt={u.username}
                    className="w-12 h-12 rounded-full ring-2 ring-slate-700"
                  />
                  <div className="flex-1 text-right">
                    <p className="font-cairo font-bold text-white">{u.username}</p>
                    <p className="text-xs text-slate-400 font-almarai">{u.email}</p>
                    <div className="flex gap-2 mt-1 justify-end">
                      <span className={`text-xs px-2 py-1 rounded ${
                        u.role === 'owner' ? 'bg-purple-500' :
                        u.role === 'admin' ? 'bg-red-500' :
                        u.role === 'news_editor' ? 'bg-emerald-500' :
                        u.role === 'mod' ? 'bg-yellow-500' :
                        'bg-slate-700'
                      } text-white`}>
                        {u.role === 'owner' ? 'أونر' : 
                         u.role === 'admin' ? 'أدمن' : 
                         u.role === 'news_editor' ? 'إخباري' :
                         u.role === 'mod' ? 'مود' : 'مستخدم'}
                      </span>
                      {u.is_banned && (
                        <span className="text-xs px-2 py-1 rounded bg-red-500 text-white">محظور</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {u.id !== user.id && u.role !== 'owner' && (
                      <>
                        {u.is_banned ? (
                          <Button
                            onClick={() => handleUnbanUser(u.id)}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            إلغاء الحظر
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleBanUser(u.id)}
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}
                        {canPromoteUsers && (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="bg-slate-800 text-white text-sm rounded px-2 py-1 border border-slate-700"
                          >
                            <option value="user">مستخدم</option>
                            <option value="mod">مود</option>
                            <option value="news_editor">إخباري</option>
                            <option value="admin">أدمن</option>
                          </select>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Broadcast Tab */}
        {activeTab === 'broadcast' && (
          <div className="p-4">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4">
              <h3 className="text-lg font-cairo font-bold text-white mb-4 text-right flex items-center gap-2 justify-end">
                <Megaphone className="w-5 h-5 text-lime-400" strokeWidth={2} />
                إرسال إعلان لجميع الغرف
              </h3>
              <form onSubmit={handleBroadcast} className="space-y-3">
                <Input
                  placeholder="اكتب الإعلان هنا..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white text-right"
                  dir="rtl"
                  required
                />
                <Button
                  type="submit"
                  className="w-full bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold"
                >
                  إرسال الإعلان
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
