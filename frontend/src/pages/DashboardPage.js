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
  const [categories, setCategories] = useState(['الكل']);
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  useEffect(() => {
    fetchRooms();
    fetchCategories();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(['الكل', ...response.data.categories]);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchRooms = async () => {
    try {
      const params = selectedCategory !== 'الكل' ? { category: selectedCategory } : {};
      const response = await axios.get(`${API}/rooms`, { params });
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
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
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
            className="bg-gradient-to-br from-lime-400/20 to-sky-400/20 backdrop-blur-md border border-lime-400/30 rounded-xl p-6 text-center mb-4"
          >
            <Radio className="w-12 h-12 text-lime-400 mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-2xl font-cairo font-bold text-white mb-2">
              مرحباً في كورة فيرس
            </h2>
            <p className="text-slate-300 font-almarai text-sm mb-4">
              انضم للغرف أو أنشئ غرفتك الخاصة
            </p>
            <Button
              onClick={() => navigate('/create-room')}
              className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold px-8 py-2 rounded-xl"
            >
              + إنشاء غرفة جديدة
            </Button>
          </motion.div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-cairo font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-lime-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="px-4 pb-6">
          <h3 className="text-lg font-cairo font-bold text-white mb-4 text-right">
            الغرف المتاحة ({rooms.length})
          </h3>
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-900/50 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 font-almarai mb-4">لا توجد غرف في هذه الفئة</p>
              <Button
                onClick={() => navigate('/create-room')}
                className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold"
              >
                كن أول من ينشئ غرفة
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleRoomClick(room.id)}
                  className="bg-slate-900/50 backdrop-blur-md border border-slate-800 hover:border-lime-400/50 rounded-xl overflow-hidden transition-all cursor-pointer"
                >
                  <div className="flex gap-3 p-4">
                    {/* Image */}
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                    
                    {/* Content */}
                    <div className="flex-1 text-right min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {room.is_live && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                              <span className="text-xs text-red-400 font-almarai">مباشر</span>
                            </div>
                          )}
                          <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 font-almarai">
                            {room.category}
                          </span>
                        </div>
                        <h4 className="text-base font-cairo font-bold text-white truncate">
                          {room.title}
                        </h4>
                      </div>
                      
                      <p className="text-xs text-slate-400 font-almarai mb-2 line-clamp-2">
                        {room.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-sky-400">
                            <Users className="w-3 h-3" strokeWidth={1.5} />
                            <span className="font-chivo">{room.participant_count}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-almarai">{room.owner_name}</span>
                          <img
                            src={room.owner_avatar}
                            alt={room.owner_name}
                            className="w-5 h-5 rounded-full ring-1 ring-slate-700"
                          />
                        </div>
                      </div>
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
        <div className="max-w-[600px] mx-auto flex justify-around p-4">
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