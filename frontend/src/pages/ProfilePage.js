import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ArrowRight, Camera, Shuffle, X,
  Settings, Edit3, Check, Heart,
  MessageCircle, Repeat2, FileText
} from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';
import { GlowingAvatar, FRAME_COLORS, ProfileTabs } from '../components/profile';
import { useSettings } from '../contexts/SettingsContext';
import { BACKEND_URL as API } from '../config/api';

// Animated cover background
const AnimatedCover = () => (
  <div className="absolute inset-0 overflow-hidden">
    <motion.div
      className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950"
      animate={{ 
        backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute top-0 right-0 w-96 h-96 bg-lime-500/10 rounded-full blur-[100px]"
      animate={{
        scale: [1, 1.3, 1],
        x: [0, -50, 0],
        y: [0, 50, 0],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[80px]"
      animate={{
        scale: [1, 1.2, 1],
        x: [0, 30, 0],
        y: [0, -30, 0],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    {/* Pitch pattern overlay */}
    <div className="absolute inset-0 opacity-5" style={{
      backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px)`
    }} />
  </div>
);

// Thread/Post Card Component
const ThreadCard = ({ thread, onLike, onNavigate }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 hover:border-lime-500/30 transition-colors cursor-pointer"
    onClick={() => onNavigate(thread.id)}
  >
    <p className="text-white font-almarai text-sm leading-relaxed mb-3 line-clamp-3">
      {thread.content}
    </p>
    
    {thread.image && (
      <img src={thread.image} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
    )}
    
    <div className="flex items-center justify-between text-slate-400 text-xs">
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); onLike(thread.id, e); }}
          className={`flex items-center gap-1 transition-colors ${thread.liked ? 'text-rose-400' : 'hover:text-rose-400'}`}
        >
          <Heart className={`w-4 h-4 ${thread.liked ? 'fill-current' : ''}`} />
          <span>{thread.likes_count || 0}</span>
        </button>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-4 h-4" />
          {thread.replies_count || 0}
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="w-4 h-4" />
          {thread.reposts_count || 0}
        </span>
      </div>
      <span className="text-slate-500">
        {new Date(thread.created_at).toLocaleDateString('ar-EG')}
      </span>
    </div>
  </motion.div>
);

// Reply Card Component
const ReplyCard = ({ reply, onNavigate }) => {
  // thread_author can be a string or an object
  const authorUsername = typeof reply.thread_author === 'object' 
    ? reply.thread_author?.username 
    : reply.thread_author;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 cursor-pointer hover:border-cyan-500/30 transition-colors"
      onClick={() => onNavigate(reply.parent_thread_id || reply.thread_id)}
    >
      {/* Original thread reference */}
      {authorUsername && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/50">
          <span className="text-xs text-slate-500">رداً على</span>
          <span className="text-xs text-lime-400 font-cairo">@{authorUsername}</span>
        </div>
      )}
      <p className="text-white font-almarai text-sm leading-relaxed line-clamp-2">
        {reply.content}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
        <span>{new Date(reply.created_at).toLocaleDateString('ar-EG')}</span>
      </div>
    </motion.div>
  );
};

// Frame Color Picker
const FrameColorPicker = ({ selected, onSelect }) => (
  <div className="flex gap-2 flex-wrap justify-center">
    {Object.entries(FRAME_COLORS).map(([key, config]) => (
      <button
        key={key}
        onClick={() => onSelect(key)}
        className={`w-10 h-10 rounded-full bg-gradient-to-r ${config.gradient} transition-all ${
          selected === key ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
        }`}
        title={config.label}
      />
    ))}
  </div>
);

const ProfilePage = ({ user }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { isDarkMode } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState('lime');
  const [editData, setEditData] = useState({
    name: '',
    username: '',
    bio: '',
    avatar: '',
    frame_color: 'lime'
  });

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
        if (!token) {
          setLoading(false);
          return;
        }
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
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (err) {
        console.error('Error fetching profile:', err);
        // If token is invalid, redirect to login
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

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

  // Tabs configuration
  const tabs = [
    { id: 'posts', label: 'المنشورات', icon: FileText, count: myPosts.length },
    { id: 'likes', label: 'الإعجابات', icon: Heart, count: myLikes.length },
    { id: 'reposts', label: 'إعادة النشر', icon: Repeat2, count: myReposts.length },
    { id: 'replies', label: 'الردود', icon: MessageCircle, count: myReplies.length },
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
      const res = await axios.post(`${API}/api/upload/image`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setEditData(prev => ({ ...prev, avatar: `${res.data.url}?t=${Date.now()}` }));
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
      const updateList = (list) => list.map(p => 
        p.id === threadId 
          ? { ...p, liked: !p.liked, likes_count: p.liked ? (p.likes_count || 1) - 1 : (p.likes_count || 0) + 1 }
          : p
      );
      if (activeTab === 'posts') setMyPosts(updateList);
      else if (activeTab === 'likes') setMyLikes(updateList);
      else if (activeTab === 'reposts') setMyReposts(updateList);
    } catch (err) {
      console.error('Error liking:', err);
    }
  };

  // Navigate to thread
  const handleNavigateToThread = (threadId) => {
    if (threadId) {
      navigate(`/thread/${threadId}`);
    }
  };

  // Get current content
  const getCurrentContent = () => {
    switch (activeTab) {
      case 'posts': return myPosts;
      case 'likes': return myLikes;
      case 'reposts': return myReposts;
      case 'replies': return myReplies;
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen pb-24 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`} dir="rtl">
        {/* Skeleton Loading */}
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className={`h-56 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
          
          {/* Avatar and name skeleton */}
          <div className="px-4 -mt-16 relative z-10">
            <div className={`w-28 h-28 rounded-full mx-auto ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
            <div className={`h-6 w-32 mx-auto mt-4 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
            <div className={`h-4 w-24 mx-auto mt-2 rounded ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
          </div>
          
          {/* Stats skeleton */}
          <div className="flex justify-center gap-8 mt-6">
            <div className={`w-24 h-20 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
            <div className={`w-24 h-20 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`} dir="rtl">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header with cover */}
      <div className="relative h-56">
        <AnimatedCover />
        
        {/* Top navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
              data-testid="settings-btn"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Avatar - positioned at bottom of cover */}
        <div className="absolute -bottom-14 right-6 z-20">
          <GlowingAvatar
            src={isEditing ? editData.avatar : userData?.avatar}
            size="xlarge"
            frameColor={isEditing ? editData.frame_color : selectedFrame}
            isEditing={isEditing}
            onClick={() => isEditing && fileInputRef.current?.click()}
          />
          
          {isEditing && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center shadow-lg"
              >
                <Camera className="w-4 h-4 text-slate-900" />
              </button>
              <button
                onClick={generateAvatar}
                className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shadow-lg"
              >
                <Shuffle className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile content */}
      <div className="px-4 pt-20">
        {/* User info */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-2xl font-black font-cairo text-white bg-transparent border-b-2 border-lime-500 focus:outline-none w-full mb-1"
                  placeholder="الاسم"
                />
              ) : (
                <h1 className="text-2xl font-black font-cairo text-white mb-1">
                  {userData?.name}
                </h1>
              )}
              
              {isEditing ? (
                <input
                  type="text"
                  value={editData.username}
                  onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                  className="text-sm text-lime-400 bg-transparent border-b border-slate-700 focus:outline-none w-full"
                  placeholder="اسم المستخدم"
                  dir="ltr"
                />
              ) : (
                <p className="text-sm text-lime-400 font-almarai">@{userData?.username}</p>
              )}
            </div>
            
            {/* Edit/Save button */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-lime-500/10 border border-lime-500/30 rounded-xl text-lime-400 font-cairo text-sm hover:bg-lime-500/20 transition-colors"
                data-testid="edit-profile-btn"
              >
                <Edit3 className="w-4 h-4" />
                <span>تعديل</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: userData?.name || '',
                      username: userData?.username || '',
                      bio: userData?.bio || '',
                      avatar: userData?.avatar || '',
                      frame_color: userData?.frame_color || 'lime'
                    });
                  }}
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-10 h-10 rounded-full bg-lime-500 flex items-center justify-center disabled:opacity-50"
                  data-testid="save-profile-btn"
                >
                  {saving ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full" />
                  ) : (
                    <Check className="w-5 h-5 text-slate-900" />
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Bio */}
          <div className="mt-3">
            {isEditing ? (
              <textarea
                value={editData.bio}
                onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full text-sm text-slate-300 bg-slate-800/50 border border-slate-700 rounded-xl p-3 focus:outline-none focus:border-lime-500 resize-none"
                rows={3}
                placeholder="اكتب نبذة عنك..."
              />
            ) : (
              <p className="text-sm text-slate-400 font-almarai leading-relaxed">
                {userData?.bio || 'لا يوجد وصف'}
              </p>
            )}
          </div>
          
          {/* Frame color picker in edit mode */}
          {isEditing && (
            <div className="mt-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
              <p className="text-sm text-slate-400 font-cairo mb-3 text-center">لون الإطار</p>
              <FrameColorPicker
                selected={editData.frame_color}
                onSelect={(color) => setEditData(prev => ({ ...prev, frame_color: color }))}
              />
            </div>
          )}
        </div>

        {/* Stats Grid - Followers/Following Only */}
        <div className="flex justify-center gap-8 mb-6">
          <button
            onClick={() => navigate(`/profile/followers`)}
            className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-lime-500/30 transition-colors min-w-[100px]"
            data-testid="followers-btn"
          >
            <span className="text-2xl font-black font-cairo text-white">
              {userData?.followers_count || 0}
            </span>
            <span className="text-sm font-almarai text-lime-400">متابِعون</span>
          </button>
          
          <button
            onClick={() => navigate(`/profile/following`)}
            className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-cyan-500/30 transition-colors min-w-[100px]"
            data-testid="following-btn"
          >
            <span className="text-2xl font-black font-cairo text-white">
              {userData?.following_count || 0}
            </span>
            <span className="text-sm font-almarai text-cyan-400">أتابعهم</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <ProfileTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Content */}
        <div className="space-y-3 min-h-[200px]">
          {contentLoading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-3 border-lime-500 border-t-transparent rounded-full"
              />
            </div>
          ) : getCurrentContent().length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                {activeTab === 'posts' && <FileText className="w-8 h-8 text-slate-600" />}
                {activeTab === 'likes' && <Heart className="w-8 h-8 text-slate-600" />}
                {activeTab === 'reposts' && <Repeat2 className="w-8 h-8 text-slate-600" />}
                {activeTab === 'replies' && <MessageCircle className="w-8 h-8 text-slate-600" />}
              </div>
              <p className="text-slate-500 font-almarai">
                {activeTab === 'posts' && 'لا يوجد منشورات'}
                {activeTab === 'likes' && 'لا يوجد إعجابات'}
                {activeTab === 'reposts' && 'لا يوجد إعادة نشر'}
                {activeTab === 'replies' && 'لا يوجد ردود'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {activeTab === 'replies' ? (
                  myReplies.map((reply, index) => (
                    <ReplyCard
                      key={reply.id || index}
                      reply={reply}
                      onNavigate={handleNavigateToThread}
                    />
                  ))
                ) : (
                  getCurrentContent().map((thread, index) => (
                    <ThreadCard
                      key={thread.id || index}
                      thread={thread}
                      onLike={handleLike}
                      onNavigate={handleNavigateToThread}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;
