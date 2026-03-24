import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ArrowRight, ArrowLeft, Camera, Image, Shuffle, X,
  Settings, LogOut, Edit3, Check, Trophy, Star, Mic,
  Users, Clock, Zap, Crown, Shield, Award, Heart,
  MessageCircle, Headphones, Search, Repeat2, FileText
} from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';

const API = process.env.REACT_APP_BACKEND_URL;

// Animated gradient background
const AnimatedBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
    <motion.div
      className="absolute top-0 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl"
      animate={{
        x: [0, 50, 0],
        y: [0, 30, 0],
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"
      animate={{
        x: [0, -40, 0],
        y: [0, -40, 0],
        scale: [1, 1.3, 1],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-1/2 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"
      animate={{
        x: [0, -30, 0],
        y: [0, 50, 0],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

// Frame color options
const FRAME_COLORS = {
  lime: { 
    gradient: "from-lime-400 via-emerald-400 to-lime-400", 
    label: "أخضر",
    preview: "bg-gradient-to-r from-lime-400 to-emerald-400"
  },
  cyan: { 
    gradient: "from-cyan-400 via-blue-400 to-cyan-400", 
    label: "سماوي",
    preview: "bg-gradient-to-r from-cyan-400 to-blue-400"
  },
  purple: { 
    gradient: "from-purple-400 via-pink-400 to-purple-400", 
    label: "بنفسجي",
    preview: "bg-gradient-to-r from-purple-400 to-pink-400"
  },
  amber: { 
    gradient: "from-amber-400 via-yellow-400 to-amber-400", 
    label: "ذهبي",
    preview: "bg-gradient-to-r from-amber-400 to-yellow-400"
  },
  rose: { 
    gradient: "from-rose-400 via-red-400 to-rose-400", 
    label: "وردي",
    preview: "bg-gradient-to-r from-rose-400 to-red-400"
  },
  rainbow: { 
    gradient: "from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500", 
    label: "قوس قزح",
    preview: "bg-gradient-to-r from-red-500 via-green-500 to-blue-500"
  },
};

// Glowing avatar frame
const GlowingAvatar = ({ src, size = "large", level = 1, frameColor = "lime" }) => {
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-20 h-20", 
    large: "w-28 h-28"
  };
  
  const glowGradient = FRAME_COLORS[frameColor]?.gradient || FRAME_COLORS.lime.gradient;

  return (
    <div className="relative">
      {/* Animated glow ring */}
      <motion.div
        className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gradient-to-r ${glowGradient} blur-md opacity-60`}
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Border ring */}
      <div className={`relative ${sizeClasses[size]} rounded-full p-1 bg-gradient-to-r ${glowGradient}`}>
        <img 
          src={src} 
          alt="" 
          className="w-full h-full rounded-full object-cover bg-slate-800"
        />
      </div>
    </div>
  );
};

// Frame color selector component
const FrameColorSelector = ({ selectedColor, onSelect }) => (
  <div className="mt-4">
    <label className="block text-slate-400 text-xs mb-2 text-right">لون الإطار</label>
    <div className="flex flex-wrap gap-2 justify-center">
      {Object.entries(FRAME_COLORS).map(([key, { label, preview }]) => (
        <motion.button
          key={key}
          onClick={() => onSelect(key)}
          className={`relative w-10 h-10 rounded-full ${preview} ${
            selectedColor === key ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title={label}
        >
          {selectedColor === key && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Check className="w-5 h-5 text-white drop-shadow-lg" />
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
    <p className="text-center text-slate-500 text-xs mt-2">
      {FRAME_COLORS[selectedColor]?.label || 'اختر لون'}
    </p>
  </div>
);

// Badge component
const Badge = ({ icon: Icon, label, color, earned = true }) => (
  <motion.div
    className={`flex flex-col items-center gap-1 ${!earned && 'opacity-40'}`}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
  >
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <span className="text-[10px] text-slate-400 text-center">{label}</span>
  </motion.div>
);

// Stat card component
const StatCard = ({ icon: Icon, value, label, color, onClick }) => (
  <motion.div
    className={`flex-1 bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50 ${onClick ? 'cursor-pointer' : ''}`}
    whileHover={{ scale: 1.02, borderColor: 'rgba(163, 230, 53, 0.3)' }}
    onClick={onClick}
  >
    <div className="flex flex-col items-center text-center">
      <Icon className={`w-5 h-5 ${color} mb-1`} />
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-slate-400 mt-1">{label}</span>
    </div>
  </motion.div>
);

const ProfilePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const isRTL = true;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const fileInputRef = useRef(null);
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(user?.frame_color || 'lime');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    frame_color: user?.frame_color || 'lime'
  });
  
  // Content tabs
  const [activeTab, setActiveTab] = useState('posts');
  const [myPosts, setMyPosts] = useState([]);
  const [myLikes, setMyLikes] = useState([]);
  const [myReposts, setMyReposts] = useState([]);
  const [myReplies, setMyReplies] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfileData(res.data);
        setSelectedFrame(res.data.frame_color || 'lime');
        setEditData({
          name: res.data.name || '',
          username: res.data.username || '',
          bio: res.data.bio || '',
          avatar: res.data.avatar || '',
          frame_color: res.data.frame_color || 'lime'
        });
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Use profileData if available, otherwise fall back to user prop
  const userData = profileData || user;

  // Fetch content based on active tab
  useEffect(() => {
    const fetchContent = async () => {
      if (!userData?.id) return;
      setContentLoading(true);
      const token = localStorage.getItem('token');
      
      try {
        if (activeTab === 'posts') {
          const res = await axios.get(`${API}/api/users/${userData.id}/threads`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMyPosts(res.data.threads || res.data || []);
        } else if (activeTab === 'likes') {
          const res = await axios.get(`${API}/api/users/${userData.id}/liked-threads`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMyLikes(res.data.threads || res.data || []);
        } else if (activeTab === 'reposts') {
          const res = await axios.get(`${API}/api/users/${userData.id}/reposts`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMyReposts(res.data.threads || res.data || []);
        } else if (activeTab === 'replies') {
          const res = await axios.get(`${API}/api/users/${userData.id}/replies`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMyReplies(res.data.replies || res.data || []);
        }
      } catch (err) {
        console.error('Error fetching content:', err);
      } finally {
        setContentLoading(false);
      }
    };
    
    if (!isEditing && userData?.id) {
      fetchContent();
    }
  }, [activeTab, userData?.id, isEditing]);

  // Calculate user level based on activity
  const userLevel = Math.min(5, Math.floor((userData?.coins || 0) / 100) + 1);

  // Badges data - using badges_earned from API
  const badgesEarned = userData?.badges_earned || [];
  const badges = [
    { icon: Mic, label: "متحدث", color: "from-lime-500 to-emerald-500", key: "speaker", earned: badgesEarned.includes("speaker") },
    { icon: Crown, label: "مالك غرفة", color: "from-amber-500 to-yellow-500", key: "room_owner", earned: badgesEarned.includes("room_owner") },
    { icon: Heart, label: "محبوب", color: "from-rose-500 to-pink-500", key: "popular", earned: badgesEarned.includes("popular") },
    { icon: Star, label: "نجم", color: "from-purple-500 to-indigo-500", key: "star", earned: badgesEarned.includes("star") },
    { icon: Shield, label: "موثق", color: "from-cyan-500 to-blue-500", key: "verified", earned: badgesEarned.includes("verified") },
    { icon: Award, label: "أسطورة", color: "from-orange-500 to-red-500", key: "legend", earned: badgesEarned.includes("legend") },
  ];

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
      await axios.put(`${API}/api/auth/profile`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم حفظ التغييرات');
      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // Handle like action
  const handleLike = async (threadId, e) => {
    e?.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API}/api/threads/${threadId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state
      const updateList = (list) => list.map(p => 
        p.id === threadId 
          ? { ...p, liked: !p.liked, likes_count: p.liked ? (p.likes_count || 1) - 1 : (p.likes_count || 0) + 1 }
          : p
      );
      setMyPosts(updateList);
      setMyLikes(updateList);
      setMyReposts(updateList);
      setMyReplies(updateList);
    } catch (err) {
      console.error('Like failed');
    }
  };

  // Handle repost action
  const handleRepost = async (threadId, e) => {
    e?.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(`${API}/api/threads/${threadId}/repost`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.reposted ? 'تمت إعادة النشر' : 'تم إلغاء إعادة النشر');
      // Update local state
      const updateList = (list) => list.map(p => 
        p.id === threadId 
          ? { ...p, reposted: res.data.reposted, reposts_count: res.data.reposted ? (p.reposts_count || 0) + 1 : (p.reposts_count || 1) - 1 }
          : p
      );
      setMyPosts(updateList);
      setMyLikes(updateList);
      setMyReposts(updateList);
      setMyReplies(updateList);
    } catch (err) {
      console.error('Repost failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24 relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50">
              <BackIcon className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-cairo font-bold text-white">الملف الشخصي</h1>
            <div className="flex gap-2">
              <button onClick={() => navigate('/search-users')} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50">
                <Search className="w-5 h-5 text-slate-400" />
              </button>
              <button onClick={() => navigate('/settings')} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50">
                <Settings className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Profile Content */}
        {!loading && (
        <div className="px-4 py-6">
          {/* Avatar Section */}
          <motion.div 
            className="flex flex-col items-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative mb-4">
              <GlowingAvatar 
                src={isEditing ? editData.avatar : userData?.avatar} 
                level={userLevel}
                frameColor={isEditing ? editData.frame_color : (userData?.frame_color || 'lime')}
              />
              {isEditing && (
                <motion.button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-9 h-9 bg-lime-500 rounded-full flex items-center justify-center border-3 border-slate-900 shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Camera className="w-4 h-4 text-slate-900" />
                </motion.button>
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
              <motion.div 
                className="flex gap-2 mb-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800/80 backdrop-blur rounded-xl text-white text-xs font-almarai flex items-center gap-2 border border-slate-700"
                >
                  <Image className="w-4 h-4" /> الألبوم
                </button>
                <button 
                  onClick={generateAvatar}
                  className="px-4 py-2 bg-slate-800/80 backdrop-blur rounded-xl text-white text-xs font-almarai flex items-center gap-2 border border-slate-700"
                >
                  <Shuffle className="w-4 h-4" /> عشوائي
                </button>
              </motion.div>
            )}

            {/* Name & Username */}
            {!isEditing ? (
              <motion.div 
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-2xl font-cairo font-bold text-white">{userData?.name}</h2>
                  {userData?.role === 'owner' && (
                    <Crown className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <p className="text-slate-400 text-sm mb-1" dir="ltr">@{userData?.username}</p>
                {userData?.bio && (
                  <p className="text-slate-300 text-sm text-center mt-3 max-w-[280px] leading-relaxed">{userData?.bio}</p>
                )}
              </motion.div>
            ) : (
              <motion.div 
                className="w-full space-y-3 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div>
                  <label className="block text-slate-400 text-xs mb-1 text-right">الاسم</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 text-white text-right text-sm focus:border-lime-500 focus:outline-none transition-colors"
                    style={{ fontSize: '16px' }}
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1 text-right">اسم المستخدم</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                      className="w-full bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white text-sm focus:border-lime-500 focus:outline-none transition-colors"
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
                    className="w-full bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 text-white text-right text-sm resize-none h-20 focus:border-lime-500 focus:outline-none transition-colors"
                    style={{ fontSize: '16px' }}
                    maxLength={80}
                    placeholder="اكتب نبذة عنك..."
                  />
                  <p className="text-slate-500 text-xs text-left mt-1">{editData.bio.length}/80</p>
                </div>
                
                {/* Frame Color Selector */}
                <FrameColorSelector 
                  selectedColor={editData.frame_color}
                  onSelect={(color) => setEditData(prev => ({ ...prev, frame_color: color }))}
                />
              </motion.div>
            )}
          </motion.div>

          {/* Stats Section - Only Followers/Following */}
          {!isEditing && (
            <motion.div 
              className="flex justify-center gap-8 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button 
                onClick={() => navigate(`/follows/${userData?.id}?tab=followers`)}
                className="flex flex-col items-center bg-slate-800/50 backdrop-blur-sm rounded-xl px-6 py-3 border border-slate-700/50 hover:border-lime-500/50 transition-colors"
              >
                <span className="text-2xl font-bold text-lime-400">{userData?.followers_count || 0}</span>
                <span className="text-slate-400 text-sm">متابع</span>
              </button>
              <button 
                onClick={() => navigate(`/follows/${userData?.id}?tab=following`)}
                className="flex flex-col items-center bg-slate-800/50 backdrop-blur-sm rounded-xl px-6 py-3 border border-slate-700/50 hover:border-rose-500/50 transition-colors"
              >
                <span className="text-2xl font-bold text-rose-400">{userData?.following_count || 0}</span>
                <span className="text-slate-400 text-sm">يتابع</span>
              </button>
            </motion.div>
          )}

          {/* Content Tabs */}
          {!isEditing && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              {/* Tab Buttons */}
              <div className="flex bg-slate-900/50 backdrop-blur-sm rounded-xl p-1 border border-slate-800/50 mb-4">
                {[
                  { id: 'posts', label: 'منشوراتي', icon: FileText },
                  { id: 'likes', label: 'إعجاباتي', icon: Heart },
                  { id: 'reposts', label: 'إعادة نشر', icon: Repeat2 },
                  { id: 'replies', label: 'ردودي', icon: MessageCircle },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-cairo font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-lime-500 text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 min-h-[200px]">
                {contentLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="p-4">
                    {/* Posts Tab */}
                    {activeTab === 'posts' && (
                      myPosts.length > 0 ? (
                        <div className="space-y-3">
                          {myPosts.slice(0, 10).map((post) => (
                            <div 
                              key={post.id} 
                              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-lime-500/50 transition-colors active:scale-[0.98]"
                              onClick={() => navigate(`/threads/${post.id}`)}
                            >
                              <p className="text-white text-sm text-right leading-relaxed line-clamp-2">{post.content}</p>
                              <div className="flex items-center justify-end gap-4 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Heart className="w-3 h-3" /> {post.likes_count || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Repeat2 className="w-3 h-3" /> {post.reposts_count || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3" /> {post.replies_count || 0}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">لا توجد منشورات</p>
                        </div>
                      )
                    )}

                    {/* Likes Tab */}
                    {activeTab === 'likes' && (
                      myLikes.length > 0 ? (
                        <div className="space-y-3">
                          {myLikes.slice(0, 10).map((post) => (
                            <div 
                              key={post.id} 
                              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-rose-500/50 transition-colors active:scale-[0.98]"
                              onClick={() => navigate(`/threads/${post.id}`)}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <img 
                                  src={post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username}`} 
                                  alt="" 
                                  className="w-6 h-6 rounded-full"
                                />
                                <span className="text-lime-400 text-xs font-bold">@{post.author?.username}</span>
                              </div>
                              <p className="text-white text-sm text-right leading-relaxed line-clamp-2">{post.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <Heart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">لا توجد إعجابات</p>
                        </div>
                      )
                    )}

                    {/* Reposts Tab */}
                    {activeTab === 'reposts' && (
                      myReposts.length > 0 ? (
                        <div className="space-y-3">
                          {myReposts.slice(0, 10).map((post) => (
                            <div 
                              key={post.id} 
                              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-emerald-500/50 transition-colors active:scale-[0.98]"
                              onClick={() => navigate(`/threads/${post.id}`)}
                            >
                              <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs">
                                <Repeat2 className="w-3 h-3" />
                                <span>أعدت نشر</span>
                              </div>
                              <p className="text-white text-sm text-right leading-relaxed line-clamp-2">{post.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <Repeat2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">لا توجد إعادة نشر</p>
                        </div>
                      )
                    )}

                    {/* Replies Tab */}
                    {activeTab === 'replies' && (
                      myReplies.length > 0 ? (
                        <div className="space-y-3">
                          {myReplies.slice(0, 10).map((reply) => (
                            <div 
                              key={reply.id} 
                              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-cyan-500/50 transition-colors active:scale-[0.98]"
                              onClick={() => navigate(`/threads/${reply.parent_thread_id}`)}
                            >
                              <div className="flex items-center gap-2 mb-2 text-cyan-400 text-xs">
                                <MessageCircle className="w-3 h-3" />
                                <span>رد على منشور</span>
                                {reply.thread_author && (
                                  <span className="text-lime-400 font-bold">@{reply.thread_author?.username || reply.thread_author_username}</span>
                                )}
                              </div>
                              {/* Original post preview */}
                              {reply.thread_content && (
                                <div className="mb-2 p-2 bg-slate-900/50 rounded-lg border-r-2 border-slate-600">
                                  <p className="text-slate-400 text-xs text-right line-clamp-1">{reply.thread_content}</p>
                                </div>
                              )}
                              <p className="text-white text-sm text-right leading-relaxed">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">لا توجد ردود</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {!isEditing ? (
              <motion.button
                onClick={() => {
                  setEditData({
                    name: userData?.name || '',
                    username: userData?.username || '',
                    bio: userData?.bio || '',
                    avatar: userData?.avatar || '',
                    frame_color: userData?.frame_color || 'lime'
                  });
                  setIsEditing(true);
                }}
                className="w-full py-4 bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-900 rounded-xl font-cairo font-bold flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Edit3 className="w-5 h-5" />
                تعديل الملف الشخصي
              </motion.button>
            ) : (
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 bg-slate-800/80 backdrop-blur text-white rounded-xl font-cairo font-bold flex items-center justify-center gap-2 border border-slate-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <X className="w-5 h-5" />
                  إلغاء
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-4 bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-900 rounded-xl font-cairo font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-lime-500/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Check className="w-5 h-5" />
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </motion.button>
              </div>
            )}

            {/* Logout Button */}
            {!isEditing && (
              <motion.button
                onClick={onLogout}
                className="w-full py-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-cairo font-bold flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut className="w-5 h-5" />
                تسجيل الخروج
              </motion.button>
            )}
          </motion.div>
        </div>
        )}
      </div>

      <BottomNavigation isRTL={isRTL} />
    </div>
  );
};

export default ProfilePage;
