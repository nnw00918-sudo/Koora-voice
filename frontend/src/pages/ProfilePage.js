import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ArrowRight, ArrowLeft, Camera, Image, Shuffle, X,
  Settings, LogOut, Edit3, Check
} from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';

const API = process.env.REACT_APP_BACKEND_URL;

const ProfilePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const isRTL = true;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const fileInputRef = useRef(null);
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  });

  // Generate random avatar
  const generateAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const styles = ['adventurer', 'avataaars', 'big-ears', 'bottts', 'fun-emoji'];
    const style = styles[Math.floor(Math.random() * styles.length)];
    setEditData(prev => ({ ...prev, avatar: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}` }));
  };

  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/api/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditData(prev => ({ ...prev, avatar: res.data.url }));
      toast.success('تم رفع الصورة');
    } catch (err) {
      toast.error('فشل رفع الصورة');
    }
  };

  // Save profile
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/users/me`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم حفظ التغييرات');
      setIsEditing(false);
      // Refresh page to get updated user data
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
            <BackIcon className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-cairo font-bold text-white">الملف الشخصي</h1>
          <button onClick={() => navigate('/settings')} className="w-10 h-10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 py-6">
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              <img 
                src={isEditing ? editData.avatar : user?.avatar} 
                alt="" 
                className="w-24 h-24 rounded-full border-4 border-lime-500/30 object-cover"
              />
              {isEditing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-lime-500 rounded-full flex items-center justify-center border-2 border-slate-900"
                >
                  <Camera className="w-4 h-4 text-slate-900" />
                </button>
              )}
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            
            {isEditing && (
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-800 rounded-lg text-white text-xs font-almarai flex items-center gap-1"
                >
                  <Image className="w-3 h-3" /> الألبوم
                </button>
                <button 
                  onClick={generateAvatar}
                  className="px-3 py-1.5 bg-slate-800 rounded-lg text-white text-xs font-almarai flex items-center gap-1"
                >
                  <Shuffle className="w-3 h-3" /> عشوائي
                </button>
              </div>
            )}

            {/* Name & Username */}
            {!isEditing ? (
              <>
                <h2 className="text-xl font-cairo font-bold text-white mb-1">{user?.name}</h2>
                <p className="text-slate-400 text-sm" dir="ltr">@{user?.username}</p>
                {user?.bio && (
                  <p className="text-slate-300 text-sm text-center mt-3 max-w-[250px]">{user?.bio}</p>
                )}
              </>
            ) : (
              <div className="w-full space-y-3 mt-2">
                <div>
                  <label className="block text-slate-400 text-xs mb-1 text-right">الاسم</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-right text-sm"
                    style={{ fontSize: '16px' }}
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1 text-right">اسم المستخدم</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white text-sm"
                      style={{ fontSize: '16px' }}
                      dir="ltr"
                      maxLength={20}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1 text-right">النبذة</label>
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-right text-sm resize-none h-16"
                    style={{ fontSize: '16px' }}
                    maxLength={80}
                    placeholder="اكتب نبذة عنك..."
                  />
                  <p className="text-slate-500 text-xs text-left">{editData.bio.length}/80</p>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          {!isEditing && (
            <div className="flex justify-center gap-8 py-4 border-t border-slate-800">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{user?.followers_count || 0}</p>
                <p className="text-slate-400 text-xs">متابع</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{user?.following_count || 0}</p>
                <p className="text-slate-400 text-xs">متابَع</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-lime-400">{user?.coins || 0}</p>
                <p className="text-slate-400 text-xs">عملة</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4">
            {!isEditing ? (
              <button
                onClick={() => {
                  setEditData({
                    name: user?.name || '',
                    username: user?.username || '',
                    bio: user?.bio || '',
                    avatar: user?.avatar || ''
                  });
                  setIsEditing(true);
                }}
                className="w-full py-3 bg-lime-500 text-slate-900 rounded-xl font-cairo font-bold flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                تعديل الملف الشخصي
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-cairo font-bold flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-lime-500 text-slate-900 rounded-xl font-cairo font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        {!isEditing && (
          <button
            onClick={onLogout}
            className="w-full mt-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-cairo font-bold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        )}
      </div>

      <BottomNavigation isRTL={isRTL} />
    </div>
  );
};

export default ProfilePage;
