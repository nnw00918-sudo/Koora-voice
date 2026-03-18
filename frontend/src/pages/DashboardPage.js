import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Radio, Users, LogOut, User, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API}/rooms`);
      setRooms(response.data);
    } catch (error) {
      toast.error('فشل تحميل الغرف');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-md mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-10 h-10 rounded-full ring-2 ring-lime-400"
              />
              <div className="text-right">
                <p className="text-white font-cairo font-bold">{user.username}</p>
                <p className="text-xs text-slate-400 font-almarai">متصل</p>
              </div>
            </div>
            <div className="flex gap-2">
              {user.role === 'admin' && (
                <Button
                  data-testid="admin-dashboard-btn"
                  onClick={() => navigate('/admin')}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-slate-800 text-lime-400"
                  title="لوحة تحكم Admin"
                >
                  <Shield className="w-5 h-5" strokeWidth={1.5} />
                </Button>
              )}
              <Button
                data-testid="logout-btn"
                onClick={onLogout}
                variant="ghost"
                size="icon"
                className="hover:bg-slate-800 text-slate-400 hover:text-red-400"
              >
                <LogOut className="w-5 h-5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-lime-400/20 to-sky-400/20 backdrop-blur-md border border-lime-400/30 rounded-xl p-6 text-center"
          >
            <Radio className="w-12 h-12 text-lime-400 mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-2xl font-cairo font-bold text-white mb-2">
              مرحباً في كورة فيرس
            </h2>
            <p className="text-slate-300 font-almarai text-sm">
              اختر غرفة وابدأ النقاش مع المجتمع الرياضي
            </p>
          </motion.div>
        </div>

        {/* Rooms Grid */}
        <div className="px-4 pb-6">
          <h3 className="text-lg font-cairo font-bold text-white mb-4 text-right">
            الغرف المتاحة
          </h3>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-slate-900/50 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  data-testid={`room-card-${room.id}`}
                  onClick={() => handleRoomClick(room.id)}
                  className="relative overflow-hidden rounded-xl border border-slate-800 hover:border-lime-400/50 transition-all group cursor-pointer h-48"
                >
                  {/* Background Image */}
                  <img
                    src={room.image}
                    alt={room.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                  {/* Content */}
                  <div className="relative h-full p-4 flex flex-col justify-end text-right">
                    <h4 className="text-xl font-cairo font-bold text-white mb-1">
                      {room.name}
                    </h4>
                    <p className="text-xs text-slate-300 font-almarai mb-3">
                      {room.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-lime-400">
                        <Users className="w-4 h-4" strokeWidth={1.5} />
                        <span className="text-xs font-chivo">{room.participants_count}</span>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 z-50">
        <div className="max-w-md mx-auto flex justify-around p-4">
          <button
            data-testid="nav-rooms-btn"
            className="flex flex-col items-center gap-1 text-lime-400"
          >
            <Radio className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">الغرف</span>
          </button>
          <button
            data-testid="nav-users-btn"
            onClick={() => navigate('/users')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Users className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">المستخدمين</span>
          </button>
          <button
            data-testid="nav-profile-btn"
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <User className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">الملف الشخصي</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;