import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Home, Trophy, Settings, MessageSquare, User, ArrowRight, ArrowLeft,
  Shield, Share2, Grid3X3, Bookmark, Heart, Camera, MoreHorizontal,
  Image, Shuffle, X, Repeat2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfilePage = ({ user: initialUser }) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentView, setCurrentView] = useState('profile');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [userStats, setUserStats] = useState({ followers_count: 0, following_count: 0 });
  
  // Tab data states
  const [myPosts, setMyPosts] = useState([]);
  const [myLikes, setMyLikes] = useState([]);
  const [myReplies, setMyReplies] = useState([]);
  const [myReposts, setMyReposts] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);
  
  // Edit form states
  const [editName, setEditName] = useState(user?.name || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');
  
  const fileInputRef = useRef(null);
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const txt = {
    ar: {
      profile: 'الملف الشخصي',
      editProfile: 'تعديل الملف الشخصي',
      followers: 'متابِعون',
      following: 'متابَعون',
      likes: 'إعجاب',
      myPosts: 'منشوراتي',
      myLikes: 'إعجاباتي',
      myReplies: 'ردودي',
      myReposts: 'إعادة نشر',
      noPosts: 'لا توجد منشورات',
      noLikes: 'لا توجد إعجابات',
      noReplies: 'لا توجد ردود',
      noReposts: 'لا توجد إعادة نشر',
      addBio: 'أضف نبذة تعريفية',
      save: 'حفظ',
      cancel: 'إلغاء',
      name: 'الاسم',
      username: 'اسم المستخدم',
      bio: 'النبذة',
      bioPlaceholder: 'أضف نبذة...',
      changePhoto: 'تغيير الصورة',
      album: 'الألبوم',
      random: 'صورة عشوائية',
      home: 'الرئيسية',
      threads: 'ثريد',
      matches: 'المباريات',
      settings: 'الإعدادات',
    },
    en: {
      profile: 'Profile',
      editProfile: 'Edit Profile',
      followers: 'Followers',
      following: 'Following',
      likes: 'Likes',
      myPosts: 'Posts',
      myLikes: 'Likes',
      myReplies: 'Replies',
      myReposts: 'Reposts',
      noPosts: 'No posts yet',
      noLikes: 'No likes yet',
      noReplies: 'No replies yet',
      noReposts: 'No reposts yet',
      addBio: 'Add bio',
      save: 'Save',
      cancel: 'Cancel',
      name: 'Name',
      username: 'Username',
      bio: 'Bio',
      bioPlaceholder: 'Add bio...',
      changePhoto: 'Change Photo',
      album: 'Album',
      random: 'Random',
      home: 'Home',
      threads: 'Threads',
      matches: 'Matches',
      settings: 'Settings',
    }
  }[language];

  useEffect(() => {
    fetchUserStats();
    fetchTabData('posts');
  }, []);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab]);

  const fetchTabData = async (tab) => {
    setLoadingTab(true);
    try {
      if (tab === 'posts') {
        const res = await axios.get(`${API}/users/${user.id}/threads`, { headers: { Authorization: `Bearer ${token}` } });
        setMyPosts(res.data.threads || []);
      } else if (tab === 'likes') {
        const res = await axios.get(`${API}/users/${user.id}/liked-threads`, { headers: { Authorization: `Bearer ${token}` } });
        setMyLikes(res.data.threads || []);
      } else if (tab === 'replies') {
        const res = await axios.get(`${API}/users/${user.id}/replies`, { headers: { Authorization: `Bearer ${token}` } });
        setMyReplies(res.data.replies || []);
      } else if (tab === 'reposts') {
        const res = await axios.get(`${API}/users/${user.id}/reposts`, { headers: { Authorization: `Bearer ${token}` } });
        setMyReposts(res.data.threads || []);
      }
    } catch (error) {
      console.error(`Error fetching ${tab}`);
    } finally {
      setLoadingTab(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        axios.get(`${API}/users/${user.id}/followers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/users/${user.id}/following`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUserStats({
        followers_count: followersRes.data.followers?.length || 0,
        following_count: followingRes.data.following?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats');
    }
  };

  const fetchFollowers = async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}/followers`, { headers: { Authorization: `Bearer ${token}` } });
      setFollowers(res.data.followers || []);
    } catch (error) {
      console.error('Error fetching followers');
    }
  };

  const fetchFollowing = async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}/following`, { headers: { Authorization: `Bearer ${token}` } });
      setFollowing(res.data.following || []);
    } catch (error) {
      console.error('Error fetching following');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await axios.put(`${API}/auth/profile`, {
        name: editName,
        username: editUsername,
        bio: editBio,
        avatar: editAvatar
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setUser(prev => ({ ...prev, ...res.data.user }));
      setIsEditingProfile(false);
      toast.success(isRTL ? 'تم الحفظ' : 'Saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل الحفظ' : 'Failed to save'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      setEditAvatar(base64);
      
      try {
        const res = await axios.post(`${API}/upload/avatar`, { image_data: base64 }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEditAvatar(res.data.avatar_url);
        toast.success(isRTL ? 'تم رفع الصورة' : 'Photo uploaded');
      } catch (error) {
        toast.error(isRTL ? 'فشل رفع الصورة' : 'Upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    setEditAvatar(newAvatar);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return isRTL ? 'الآن' : 'now';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return isRTL ? 'الآن' : 'now';
    if (minutes < 60) return `${minutes}${isRTL ? 'د' : 'm'}`;
    if (hours < 24) return `${hours}${isRTL ? 'س' : 'h'}`;
    return `${days}${isRTL ? 'ي' : 'd'}`;
  };

  const handleLike = async (threadId) => {
    try {
      await axios.post(`${API}/threads/${threadId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh current tab data
      fetchTabData(activeTab);
    } catch (error) {
      console.error('Like failed');
    }
  };

  // Empty State Component
  const EmptyState = ({ icon, message }) => (
    <div className="py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <p className="text-slate-500 font-almarai">{message}</p>
    </div>
  );

  // Thread Card Component
  const ThreadCard = ({ thread, isRepost }) => (
    <div className="p-4">
      {isRepost && (
        <div className={`flex items-center gap-2 text-slate-500 text-xs mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Repeat2 className="w-3 h-3" />
          <span>{isRTL ? 'أعدت النشر' : 'You reposted'}</span>
        </div>
      )}
      <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <img 
          src={thread.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.author?.username}`} 
          alt="" 
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="font-cairo font-bold text-white truncate">
              {thread.author?.name || thread.author?.username}
            </span>
            <span className="text-slate-500 text-sm" dir="ltr">@{thread.author?.username}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500 text-sm">{formatTime(thread.created_at)}</span>
          </div>
          
          {thread.content && (
            <p className={`text-white font-almarai leading-relaxed mb-3 whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
              {thread.content}
            </p>
          )}
          
          {thread.media_url && thread.media_type === 'image' && (
            <div className="rounded-xl overflow-hidden mb-3">
              <img src={thread.media_url} alt="" className="w-full max-h-[300px] object-cover" />
            </div>
          )}
          
          {thread.media_url && thread.media_type === 'video' && (
            <div className="rounded-xl overflow-hidden mb-3">
              <video src={thread.media_url} controls className="w-full max-h-[300px]" />
            </div>
          )}
          
          <div className={`flex items-center gap-6 text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button className="flex items-center gap-1 hover:text-sky-400">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">{thread.replies_count || 0}</span>
            </button>
            <button className="flex items-center gap-1 hover:text-green-400">
              <Repeat2 className="w-4 h-4" />
              <span className="text-xs">{thread.reposts_count || 0}</span>
            </button>
            <button 
              onClick={() => handleLike(thread.id)}
              className={`flex items-center gap-1 ${thread.liked ? 'text-red-500' : 'hover:text-red-400'}`}
            >
              <Heart className={`w-4 h-4 ${thread.liked ? 'fill-current' : ''}`} />
              <span className="text-xs">{thread.likes_count || 0}</span>
            </button>
            <button className="hover:text-sky-400">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Reply Card Component
  const ReplyCard = ({ reply }) => (
    <div className="p-4">
      <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <img 
          src={reply.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author?.username}`} 
          alt="" 
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="font-cairo font-bold text-white truncate">
              {reply.author?.name || reply.author?.username}
            </span>
            <span className="text-slate-500 text-sm" dir="ltr">@{reply.author?.username}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500 text-sm">{formatTime(reply.created_at)}</span>
          </div>
          
          <p className={`text-white font-almarai leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
            {reply.content}
          </p>
        </div>
      </div>
    </div>
  );

  // Followers/Following List View
  const UserListView = ({ title, users }) => (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 bg-black/90 backdrop-blur-xl z-10 px-4 py-3 border-b border-slate-800">
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setCurrentView('profile')} className="w-10 h-10 flex items-center justify-center">
            <BackIcon className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-cairo font-bold text-white">{title}</h1>
        </div>
      </div>
      <div className="divide-y divide-slate-800">
        {users.length === 0 ? (
          <p className="text-center text-slate-500 py-8 font-almarai">{isRTL ? 'لا يوجد' : 'None yet'}</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className={`flex items-center gap-3 p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt="" className="w-12 h-12 rounded-full" />
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-white font-cairo font-bold">{u.name || u.username}</p>
                <p className="text-slate-500 text-sm" dir="ltr">@{u.username}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Edit Profile Modal
  const EditProfileModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50"
    >
      <div className="sticky top-0 bg-black border-b border-slate-800 px-4 py-3 z-10">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setIsEditingProfile(false)} className="text-white font-almarai">{txt.cancel}</button>
          <h1 className="text-lg font-cairo font-bold text-white">{txt.editProfile}</h1>
          <button onClick={handleSaveProfile} disabled={savingProfile} className="text-[#fe2c55] font-cairo font-bold disabled:opacity-50">
            {savingProfile ? '...' : txt.save}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <img src={editAvatar || user.avatar} alt="" className="w-24 h-24 rounded-full border-2 border-slate-700" />
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-[#fe2c55] rounded-full flex items-center justify-center border-2 border-black">
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <div className="flex gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-800 rounded-lg text-white text-sm font-almarai flex items-center gap-2">
              <Image className="w-4 h-4" /> {txt.album}
            </button>
            <button onClick={generateRandomAvatar} className="px-4 py-2 bg-slate-800 rounded-lg text-white text-sm font-almarai flex items-center gap-2">
              <Shuffle className="w-4 h-4" /> {txt.random}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className={`block text-slate-400 text-sm mb-2 font-almarai ${isRTL ? 'text-right' : 'text-left'}`}>{txt.name}</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-almarai ${isRTL ? 'text-right' : 'text-left'}`} maxLength={30} />
          </div>
          <div>
            <label className={`block text-slate-400 text-sm mb-2 font-almarai ${isRTL ? 'text-right' : 'text-left'}`}>{txt.username}</label>
            <div className="relative">
              <span className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`}>@</span>
              <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-3 text-white font-almarai ${isRTL ? 'text-right pr-10' : 'text-left pl-10'}`} maxLength={20} dir="ltr" />
            </div>
          </div>
          <div>
            <label className={`block text-slate-400 text-sm mb-2 font-almarai ${isRTL ? 'text-right' : 'text-left'}`}>{txt.bio}</label>
            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder={txt.bioPlaceholder} className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-almarai resize-none h-24 ${isRTL ? 'text-right' : 'text-left'}`} maxLength={80} />
            <p className={`text-slate-500 text-xs mt-1 ${isRTL ? 'text-left' : 'text-right'}`}>{editBio.length}/80</p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Main Profile View
  const ProfileView = () => (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-xl z-10 px-4 py-3">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center">
            <BackIcon className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-cairo font-bold text-white" dir="ltr">@{user.username}</h1>
          <button className="w-10 h-10 flex items-center justify-center">
            <MoreHorizontal className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 pt-4 pb-6">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img src={user.avatar} alt="" className="w-24 h-24 rounded-full border-2 border-slate-800" />
            {user.role && user.role !== 'user' && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#fe2c55] flex items-center justify-center border-2 border-black">
                <Shield className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <h2 className="text-center text-xl font-cairo font-bold text-white mb-1" dir="ltr">@{user.username}</h2>
        {user.name && user.name !== user.username && (
          <p className="text-center text-slate-400 font-almarai text-sm mb-4">{user.name}</p>
        )}

        {/* Stats */}
        <div className="flex justify-center gap-8 py-4">
          <button onClick={() => { setCurrentView('following'); fetchFollowing(); }} className="text-center">
            <p className="text-xl font-chivo font-bold text-white">{userStats.following_count}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.following}</p>
          </button>
          <button onClick={() => { setCurrentView('followers'); fetchFollowers(); }} className="text-center">
            <p className="text-xl font-chivo font-bold text-white">{userStats.followers_count}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.followers}</p>
          </button>
          <div className="text-center">
            <p className="text-xl font-chivo font-bold text-white">{user.coins || 0}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.likes}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 mb-4">
          <button onClick={() => { setEditName(user.name || ''); setEditUsername(user.username || ''); setEditBio(user.bio || ''); setEditAvatar(user.avatar || ''); setIsEditingProfile(true); }} className="flex-1 max-w-[200px] py-2.5 rounded-md bg-slate-800 text-white font-cairo font-semibold text-sm">
            {txt.editProfile}
          </button>
          <button className="w-11 h-11 rounded-md bg-slate-800 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Bio */}
        {user.bio ? (
          <p className="text-center text-white font-almarai text-sm mb-4 px-8">{user.bio}</p>
        ) : (
          <button onClick={() => { setEditName(user.name || ''); setEditUsername(user.username || ''); setEditBio(user.bio || ''); setEditAvatar(user.avatar || ''); setIsEditingProfile(true); }} className="block mx-auto text-slate-500 font-almarai text-sm mb-4">
            + {txt.addBio}
          </button>
        )}

        {/* Level Badge */}
        <div className="flex justify-center gap-2 mb-6">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
            <span className="text-yellow-400 text-xs font-chivo font-bold">Lv.{user.level || 1}</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <span className="text-purple-400 text-xs font-chivo font-bold">{user.xp || 0} XP</span>
          </div>
        </div>
      </div>

      {/* Tabs - Twitter Style */}
      <div className="border-b border-slate-800">
        <div className="flex">
          <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 text-center font-almarai text-sm transition-colors relative ${activeTab === 'posts' ? 'text-white font-bold' : 'text-slate-500'}`}>
            {txt.myPosts}
            {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-sky-500 rounded-full" />}
          </button>
          <button onClick={() => setActiveTab('likes')} className={`flex-1 py-3 text-center font-almarai text-sm transition-colors relative ${activeTab === 'likes' ? 'text-white font-bold' : 'text-slate-500'}`}>
            {txt.myLikes}
            {activeTab === 'likes' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-sky-500 rounded-full" />}
          </button>
          <button onClick={() => setActiveTab('replies')} className={`flex-1 py-3 text-center font-almarai text-sm transition-colors relative ${activeTab === 'replies' ? 'text-white font-bold' : 'text-slate-500'}`}>
            {txt.myReplies}
            {activeTab === 'replies' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-sky-500 rounded-full" />}
          </button>
          <button onClick={() => setActiveTab('reposts')} className={`flex-1 py-3 text-center font-almarai text-sm transition-colors relative ${activeTab === 'reposts' ? 'text-white font-bold' : 'text-slate-500'}`}>
            {txt.myReposts}
            {activeTab === 'reposts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-sky-500 rounded-full" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[200px]">
        {loadingTab ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              myPosts.length === 0 ? (
                <EmptyState icon={<Grid3X3 className="w-8 h-8 text-slate-600" />} message={txt.noPosts} />
              ) : (
                <div className="divide-y divide-slate-800">
                  {myPosts.map(thread => <ThreadCard key={thread.id} thread={thread} />)}
                </div>
              )
            )}
            
            {/* Likes Tab */}
            {activeTab === 'likes' && (
              myLikes.length === 0 ? (
                <EmptyState icon={<Heart className="w-8 h-8 text-slate-600" />} message={txt.noLikes} />
              ) : (
                <div className="divide-y divide-slate-800">
                  {myLikes.map(thread => <ThreadCard key={thread.id} thread={thread} />)}
                </div>
              )
            )}
            
            {/* Replies Tab */}
            {activeTab === 'replies' && (
              myReplies.length === 0 ? (
                <EmptyState icon={<MessageSquare className="w-8 h-8 text-slate-600" />} message={txt.noReplies} />
              ) : (
                <div className="divide-y divide-slate-800">
                  {myReplies.map(reply => <ReplyCard key={reply.id} reply={reply} />)}
                </div>
              )
            )}
            
            {/* Reposts Tab */}
            {activeTab === 'reposts' && (
              myReposts.length === 0 ? (
                <EmptyState icon={<Repeat2 className="w-8 h-8 text-slate-600" />} message={txt.noReposts} />
              ) : (
                <div className="divide-y divide-slate-800">
                  {myReposts.map(thread => <ThreadCard key={thread.id} thread={thread} isRepost />)}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-slate-800 z-40">
        <div className={`max-w-[600px] mx-auto flex justify-around p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors">
            <Home className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{txt.home}</span>
          </button>
          <button onClick={() => navigate('/threads')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors">
            <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{txt.threads}</span>
          </button>
          <button onClick={() => navigate('/matches')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors">
            <Trophy className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{txt.matches}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white">
            <User className="w-6 h-6" strokeWidth={2} />
            <span className="text-xs font-almarai">{txt.profile}</span>
          </button>
          <button onClick={() => navigate('/settings')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors">
            <Settings className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{txt.settings}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {currentView === 'profile' && <ProfileView />}
      {currentView === 'followers' && <UserListView title={txt.followers} users={followers} />}
      {currentView === 'following' && <UserListView title={txt.following} users={following} />}
      
      <AnimatePresence>
        {isEditingProfile && <EditProfileModal />}
      </AnimatePresence>
    </>
  );
};

export default ProfilePage;
