import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  ArrowRight, ArrowLeft, UserPlus, UserMinus, 
  MessageSquare, MoreHorizontal, Heart, MessageCircle,
  Repeat2, FileText, Ban, Flag, Share2
} from 'lucide-react';
import { GlowingAvatar, ProfileTabs } from '../components/profile';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Animated cover background
const AnimatedCover = () => (
  <div className="absolute inset-0 overflow-hidden">
    <motion.div
      className="absolute inset-0 bg-gradient-to-br from-slate-950 via-cyan-950/30 to-slate-950"
      animate={{ 
        backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]"
      animate={{
        scale: [1, 1.3, 1],
        x: [0, -50, 0],
        y: [0, 50, 0],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px]"
      animate={{
        scale: [1, 1.2, 1],
        x: [0, 30, 0],
        y: [0, -30, 0],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

// Thread Card Component
const ThreadCard = ({ thread, onLike, onNavigate, isRTL }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 hover:border-cyan-500/30 transition-colors cursor-pointer"
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
          onClick={(e) => { e.stopPropagation(); onLike(thread.id); }}
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
        {new Date(thread.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
      </span>
    </div>
  </motion.div>
);

// Reply Card Component
const ReplyCard = ({ reply, onNavigate, isRTL }) => {
  // thread_author can be a string or an object
  const authorUsername = typeof reply.thread_author === 'object' 
    ? reply.thread_author?.username 
    : reply.thread_author;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 cursor-pointer hover:border-purple-500/30 transition-colors"
      onClick={() => onNavigate(reply.parent_thread_id || reply.thread_id)}
    >
      {authorUsername && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/50">
          <span className="text-xs text-slate-500">{isRTL ? 'رداً على' : 'Reply to'}</span>
          <span className="text-xs text-cyan-400 font-cairo">@{authorUsername}</span>
        </div>
      )}
      <p className="text-white font-almarai text-sm leading-relaxed line-clamp-2">
        {reply.content}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
        <span>{new Date(reply.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</span>
      </div>
    </motion.div>
  );
};

// Menu Modal
const MenuModal = ({ show, onClose, onBlock, onReport, isRTL }) => {
  if (!show) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="w-full max-w-md bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
        
        <button
          onClick={onBlock}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 mb-3 transition-colors"
        >
          <Ban className="w-5 h-5 text-red-400" />
          <span className="text-red-400 font-cairo">{isRTL ? 'حظر المستخدم' : 'Block User'}</span>
        </button>
        
        <button
          onClick={onReport}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 mb-3 transition-colors"
        >
          <Flag className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-cairo">{isRTL ? 'إبلاغ' : 'Report'}</span>
        </button>
        
        <button
          onClick={onClose}
          className="w-full p-4 rounded-xl bg-slate-800 text-slate-400 font-cairo mt-2"
        >
          {isRTL ? 'إلغاء' : 'Cancel'}
        </button>
      </motion.div>
    </motion.div>
  );
};

const UserProfilePage = ({ currentUser }) => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { language } = useLanguage();
  const { isDarkMode } = useSettings();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [userPosts, setUserPosts] = useState([]);
  const [userLikes, setUserLikes] = useState([]);
  const [userReposts, setUserReposts] = useState([]);
  const [userReplies, setUserReplies] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const txt = {
    ar: {
      followers: 'متابع',
      following: 'متابَع',
      posts: 'المنشورات',
      likes: 'الإعجابات',
      reposts: 'إعادة النشر',
      replies: 'الردود',
      follow: 'متابعة',
      unfollow: 'إلغاء',
      message: 'رسالة',
      noPosts: 'لا توجد منشورات',
      noLikes: 'لا توجد إعجابات',
      noReposts: 'لا توجد إعادة نشر',
      noReplies: 'لا توجد ردود',
      userNotFound: 'المستخدم غير موجود',
    },
    en: {
      followers: 'Followers',
      following: 'Following',
      posts: 'Posts',
      likes: 'Likes',
      reposts: 'Reposts',
      replies: 'Replies',
      follow: 'Follow',
      unfollow: 'Unfollow',
      message: 'Message',
      noPosts: 'No posts yet',
      noLikes: 'No likes yet',
      noReposts: 'No reposts yet',
      noReplies: 'No replies yet',
      userNotFound: 'User not found',
    }
  }[language];

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    if (user) fetchTabContent();
  }, [user, activeTab]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const fetchTabContent = async () => {
    setLoadingContent(true);
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'posts':
          endpoint = `${API}/users/${userId}/threads`;
          break;
        case 'likes':
          endpoint = `${API}/users/${userId}/liked-threads`;
          break;
        case 'reposts':
          endpoint = `${API}/users/${userId}/reposts`;
          break;
        case 'replies':
          endpoint = `${API}/users/${userId}/replies`;
          break;
        default:
          endpoint = `${API}/users/${userId}/threads`;
      }
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      switch (activeTab) {
        case 'posts':
          setUserPosts(res.data.threads || []);
          break;
        case 'likes':
          setUserLikes(res.data.threads || []);
          break;
        case 'reposts':
          setUserReposts(res.data.threads || []);
          break;
        case 'replies':
          setUserReplies(res.data.replies || []);
          break;
        default:
          setUserPosts(res.data.threads || []);
      }
    } catch (error) {
      console.error('Error fetching content');
    } finally {
      setLoadingContent(false);
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
      const updateList = (list) => list.map(t => 
        t.id === threadId 
          ? { ...t, liked: !t.liked, likes_count: t.liked ? t.likes_count - 1 : t.likes_count + 1 }
          : t
      );
      if (activeTab === 'posts') setUserPosts(updateList);
      else if (activeTab === 'likes') setUserLikes(updateList);
      else if (activeTab === 'reposts') setUserReposts(updateList);
    } catch (error) {
      console.error('Like failed');
    }
  };

  const handleNavigateToThread = (threadId) => {
    if (threadId) {
      navigate(`/threads/${threadId}`);
    }
  };

  const handleBlock = async () => {
    try {
      await axios.post(`${API}/users/${userId}/block`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم حظر المستخدم' : 'User blocked');
      setShowMenu(false);
      navigate(-1);
    } catch (error) {
      toast.error(isRTL ? 'فشل الحظر' : 'Block failed');
    }
  };

  const handleReport = () => {
    toast.success(isRTL ? 'تم إرسال البلاغ' : 'Report submitted');
    setShowMenu(false);
  };

  // Tabs
  const tabs = [
    { id: 'posts', label: txt.posts, icon: FileText, count: userPosts.length },
    { id: 'likes', label: txt.likes, icon: Heart, count: userLikes.length },
    { id: 'reposts', label: txt.reposts, icon: Repeat2, count: userReposts.length },
    { id: 'replies', label: txt.replies, icon: MessageCircle, count: userReplies.length },
  ];

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'posts': return userPosts;
      case 'likes': return userLikes;
      case 'reposts': return userReposts;
      case 'replies': return userReplies;
      default: return [];
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'posts': return txt.noPosts;
      case 'likes': return txt.noLikes;
      case 'reposts': return txt.noReposts;
      case 'replies': return txt.noReplies;
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={`w-12 h-12 border-4 border-t-transparent rounded-full ${isDarkMode ? 'border-cyan-500' : 'border-cyan-600'}`}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <p className={`font-cairo ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{txt.userNotFound}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-8 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with cover */}
      <div className="relative h-56">
        <AnimatedCover />
        
        {/* Top navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            data-testid="back-btn"
          >
            <BackIcon className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: user.name,
                    url: window.location.href
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
                }
              }}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowMenu(true)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
              data-testid="menu-btn"
            >
              <MoreHorizontal className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Avatar */}
        <div className={`absolute -bottom-14 ${isRTL ? 'right-6' : 'left-6'} z-20`}>
          <GlowingAvatar
            src={user.avatar}
            size="xlarge"
            frameColor={user.frame_color || 'cyan'}
          />
        </div>
      </div>

      {/* Profile content */}
      <div className="px-4 pt-20">
        {/* User info & action buttons */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-black font-cairo text-white mb-1">
              {user.name}
            </h1>
            <p className="text-sm text-cyan-400 font-almarai">@{user.username}</p>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={startConversation}
              className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
              data-testid="message-btn"
            >
              <MessageSquare className="w-5 h-5 text-slate-300" />
            </button>
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-cairo text-sm transition-all ${
                isFollowing
                  ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400'
                  : 'bg-cyan-500 text-slate-900 hover:bg-cyan-400'
              }`}
              data-testid="follow-btn"
            >
              {followLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              ) : isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4" />
                  <span>{txt.unfollow}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{txt.follow}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-slate-400 font-almarai leading-relaxed mb-6">
            {user.bio}
          </p>
        )}

        {/* Stats - Followers/Following Only */}
        <div className="flex justify-center gap-8 mb-6">
          <button
            onClick={() => navigate(`/user/${userId}/followers`)}
            className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-cyan-500/30 transition-colors min-w-[100px]"
            data-testid="followers-btn"
          >
            <span className="text-2xl font-black font-cairo text-white">
              {user.followers_count || 0}
            </span>
            <span className="text-sm font-almarai text-cyan-400">{txt.followers}</span>
          </button>
          
          <button
            onClick={() => navigate(`/user/${userId}/following`)}
            className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-purple-500/30 transition-colors min-w-[100px]"
            data-testid="following-btn"
          >
            <span className="text-2xl font-black font-cairo text-white">
              {user.following_count || 0}
            </span>
            <span className="text-sm font-almarai text-purple-400">{txt.following}</span>
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
          {loadingContent ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full"
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
              <p className="text-slate-500 font-almarai">{getEmptyMessage()}</p>
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
                  userReplies.map((reply, index) => (
                    <ReplyCard
                      key={reply.id || index}
                      reply={reply}
                      onNavigate={handleNavigateToThread}
                      isRTL={isRTL}
                    />
                  ))
                ) : (
                  getCurrentContent().map((thread, index) => (
                    <ThreadCard
                      key={thread.id || index}
                      thread={thread}
                      onLike={handleLike}
                      onNavigate={handleNavigateToThread}
                      isRTL={isRTL}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Menu Modal */}
      <AnimatePresence>
        <MenuModal
          show={showMenu}
          onClose={() => setShowMenu(false)}
          onBlock={handleBlock}
          onReport={handleReport}
          isRTL={isRTL}
        />
      </AnimatePresence>
    </div>
  );
};

export default UserProfilePage;
