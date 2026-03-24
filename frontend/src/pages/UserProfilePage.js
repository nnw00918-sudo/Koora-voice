import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Home, Trophy, Settings, MessageSquare, User, ArrowRight, ArrowLeft,
  Shield, Share2, Grid3X3, Heart, MoreHorizontal, MessageCircle,
  UserPlus, UserMinus, Repeat2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserProfilePage = ({ currentUser }) => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { language, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const txt = {
    ar: {
      followers: 'متابِعون',
      following: 'متابَعون',
      likes: 'إعجاب',
      posts: 'منشوراتي',
      follow: 'متابعة',
      unfollow: 'إلغاء المتابعة',
      message: 'رسالة',
      noPosts: 'لا توجد منشورات',
      userNotFound: 'المستخدم غير موجود',
    },
    en: {
      followers: 'Followers',
      following: 'Following',
      likes: 'Likes',
      posts: 'Posts',
      follow: 'Follow',
      unfollow: 'Unfollow',
      message: 'Message',
      noPosts: 'No posts yet',
      userNotFound: 'User not found',
    }
  }[language];

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (user) fetchUserPosts();
  }, [user, activeTab]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle both API response formats
      const userData = res.data.user || res.data;
      setUser(userData);
      setIsFollowing(userData.is_following);
    } catch (error) {
      toast.error(txt.userNotFound);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await axios.get(`${API}/users/${userId}/threads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserPosts(res.data.threads || []);
    } catch (error) {
      console.error('Error fetching posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      await axios.post(`${API}/users/${userId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(!isFollowing);
      setUser(prev => ({
        ...prev,
        followers_count: isFollowing ? prev.followers_count - 1 : prev.followers_count + 1
      }));
      toast.success(isFollowing ? (isRTL ? 'تم إلغاء المتابعة' : 'Unfollowed') : (isRTL ? 'تمت المتابعة' : 'Followed'));
    } catch (error) {
      toast.error(isRTL ? 'فشلت العملية' : 'Failed');
    } finally {
      setFollowLoading(false);
    }
  };

  const startConversation = async () => {
    try {
      const res = await axios.post(`${API}/conversations/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/messages/${res.data.conversation_id}`);
    } catch (error) {
      toast.error(isRTL ? 'فشل بدء المحادثة' : 'Failed to start conversation');
    }
  };

  const handleLike = async (threadId) => {
    try {
      await axios.post(`${API}/threads/${threadId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserPosts(prev => prev.map(t => 
        t.id === threadId 
          ? { ...t, liked: !t.liked, likes_count: t.liked ? t.likes_count - 1 : t.likes_count + 1 }
          : t
      ));
    } catch (error) {
      console.error('Like failed');
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Redirect to own profile if viewing self
  if (user.id === currentUser.id) {
    navigate('/profile');
    return null;
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-xl z-10 px-4 py-3">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center">
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

        {/* Stats - Only Followers/Following */}
        <div className="flex justify-center gap-8 py-4">
          <button 
            onClick={() => navigate(`/follows/${userId}?tab=following`)}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <p className="text-xl font-chivo font-bold text-white">{user.following_count || 0}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.following}</p>
          </button>
          <button 
            onClick={() => navigate(`/follows/${userId}?tab=followers`)}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <p className="text-xl font-chivo font-bold text-white">{user.followers_count || 0}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.followers}</p>
          </button>
        </div>

        {/* Action Buttons */}
        <div className={`flex justify-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex-1 max-w-[140px] py-2.5 rounded-md font-cairo font-semibold text-sm flex items-center justify-center gap-2 ${
              isFollowing 
                ? 'bg-slate-800 text-white border border-slate-600' 
                : 'bg-[#fe2c55] text-white'
            }`}
          >
            {followLoading ? '...' : (
              <>
                {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isFollowing ? txt.unfollow : txt.follow}
              </>
            )}
          </button>
          <button 
            onClick={startConversation}
            className="flex-1 max-w-[140px] py-2.5 rounded-md bg-slate-800 text-white font-cairo font-semibold text-sm flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            {txt.message}
          </button>
          <button className="w-11 h-11 rounded-md bg-slate-800 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-center text-white font-almarai text-sm mb-4 px-8">{user.bio}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex justify-center">
          <button 
            onClick={() => setActiveTab('posts')} 
            className={`flex-1 max-w-[120px] py-3 text-center font-almarai text-sm transition-colors relative ${activeTab === 'posts' ? 'text-white font-bold' : 'text-slate-500'}`}
          >
            {txt.posts}
            {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-sky-500 rounded-full" />}
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="min-h-[200px]">
        {loadingPosts ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : userPosts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4">
              <Grid3X3 className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500 font-almarai">{txt.noPosts}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {userPosts.map(thread => (
              <div 
                key={thread.id} 
                className="p-4 cursor-pointer hover:bg-slate-900/50 transition-colors active:scale-[0.99]"
                onClick={() => navigate(`/threads/${thread.id}`)}
              >
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={thread.author?.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-cairo font-bold text-white truncate">{thread.author?.name}</span>
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
                    <div className={`flex items-center gap-6 text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{thread.replies_count || 0}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="w-4 h-4" />
                        <span className="text-xs">{thread.reposts_count || 0}</span>
                      </span>
                      <span className={`flex items-center gap-1 ${thread.liked ? 'text-red-500' : ''}`}>
                        <Heart className={`w-4 h-4 ${thread.liked ? 'fill-current' : ''}`} />
                        <span className="text-xs">{thread.likes_count || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-slate-800 z-40">
        <div className={`max-w-[600px] mx-auto flex justify-around p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400">
            <Home className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('home')}</span>
          </button>
          <button onClick={() => navigate('/threads')} className="flex flex-col items-center gap-1 text-slate-400">
            <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('threads')}</span>
          </button>
          <button onClick={() => navigate('/messages')} className="flex flex-col items-center gap-1 text-slate-400">
            <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{isRTL ? 'الرسائل' : 'Messages'}</span>
          </button>
          <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-slate-400">
            <User className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('profile')}</span>
          </button>
          <button onClick={() => navigate('/settings')} className="flex flex-col items-center gap-1 text-slate-400">
            <Settings className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
