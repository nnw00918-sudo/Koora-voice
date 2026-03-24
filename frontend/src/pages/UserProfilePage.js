import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Home, Trophy, Settings, MessageSquare, User, ArrowRight, ArrowLeft,
  Shield, Share2, Grid3X3, Heart, MoreHorizontal, MessageCircle,
  UserPlus, UserMinus, Repeat2, FileText, Ban, Flag
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
      followers: 'المتابعون',
      following: 'يتابع',
      posts: 'المنشورات',
      likes: 'الإعجابات',
      reposts: 'إعادة النشر',
      replies: 'الردود',
      follow: 'متابعة',
      unfollow: 'إلغاء المتابعة',
      message: 'رسالة',
      noPosts: 'لا توجد منشورات',
      noLikes: 'لا توجد إعجابات',
      noReposts: 'لا توجد إعادة نشر',
      noReplies: 'لا توجد ردود',
      userNotFound: 'المستخدم غير موجود',
      block: 'حظر',
      report: 'إبلاغ',
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
      block: 'Block',
      report: 'Report',
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
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 flex items-center justify-center"
            >
              <MoreHorizontal className="w-6 h-6 text-white" />
            </button>
            
            {/* Dropdown Menu */}
            {showMenu && (
              <div className={`absolute top-12 ${isRTL ? 'left-0' : 'right-0'} bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden min-w-[150px]`}>
                <button
                  onClick={() => {
                    toast.success(isRTL ? 'تم الحظر' : 'User blocked');
                    setShowMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-red-500 hover:bg-slate-800 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Ban className="w-4 h-4" />
                  <span className="font-medium">{txt.block}</span>
                </button>
                <button
                  onClick={() => {
                    toast.success(isRTL ? 'تم الإبلاغ' : 'User reported');
                    setShowMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-amber-500 hover:bg-slate-800 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Flag className="w-4 h-4" />
                  <span className="font-medium">{txt.report}</span>
                </button>
              </div>
            )}
          </div>
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
            onClick={() => navigate(`/follows/${userId}?tab=followers`)}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <p className="text-xl font-chivo font-bold text-white">{user.followers_count || 0}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.followers}</p>
          </button>
          <button 
            onClick={() => navigate(`/follows/${userId}?tab=following`)}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <p className="text-xl font-chivo font-bold text-white">{user.following_count || 0}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.following}</p>
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
            className={`flex-1 max-w-[80px] py-3 text-center font-almarai text-xs transition-colors relative ${activeTab === 'posts' ? 'text-white font-bold' : 'text-slate-500'}`}
          >
            <FileText className="w-4 h-4 mx-auto mb-1" />
            {txt.posts}
            {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-sky-500 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('likes')} 
            className={`flex-1 max-w-[80px] py-3 text-center font-almarai text-xs transition-colors relative ${activeTab === 'likes' ? 'text-white font-bold' : 'text-slate-500'}`}
          >
            <Heart className="w-4 h-4 mx-auto mb-1" />
            {txt.likes}
            {activeTab === 'likes' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-rose-500 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('reposts')} 
            className={`flex-1 max-w-[80px] py-3 text-center font-almarai text-xs transition-colors relative ${activeTab === 'reposts' ? 'text-white font-bold' : 'text-slate-500'}`}
          >
            <Repeat2 className="w-4 h-4 mx-auto mb-1" />
            {txt.reposts}
            {activeTab === 'reposts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-emerald-500 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('replies')} 
            className={`flex-1 max-w-[80px] py-3 text-center font-almarai text-xs transition-colors relative ${activeTab === 'replies' ? 'text-white font-bold' : 'text-slate-500'}`}
          >
            <MessageCircle className="w-4 h-4 mx-auto mb-1" />
            {txt.replies}
            {activeTab === 'replies' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-cyan-500 rounded-full" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[200px]">
        {loadingContent ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              userPosts.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
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
                      <p className={`text-white font-almarai text-sm leading-relaxed line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {thread.content}
                      </p>
                      <div className={`flex items-center gap-4 mt-2 text-xs text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {thread.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 className="w-3 h-3" /> {thread.reposts_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> {thread.replies_count || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Likes Tab */}
            {activeTab === 'likes' && (
              userLikes.length === 0 ? (
                <div className="py-16 text-center">
                  <Heart className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-slate-500 font-almarai">{txt.noLikes}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {userLikes.map(thread => (
                    <div 
                      key={thread.id} 
                      className="p-4 cursor-pointer hover:bg-slate-900/50 transition-colors active:scale-[0.99]"
                      onClick={() => navigate(`/threads/${thread.id}`)}
                    >
                      <div 
                        className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/user/${thread.author?.id}`);
                        }}
                      >
                        <img 
                          src={thread.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.author?.username}`} 
                          alt="" 
                          className="w-6 h-6 rounded-full hover:opacity-80"
                        />
                        <span className="text-lime-400 text-xs font-bold hover:text-lime-300">@{thread.author?.username}</span>
                      </div>
                      <p className={`text-white font-almarai text-sm leading-relaxed line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {thread.content}
                      </p>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Reposts Tab */}
            {activeTab === 'reposts' && (
              userReposts.length === 0 ? (
                <div className="py-16 text-center">
                  <Repeat2 className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-slate-500 font-almarai">{txt.noReposts}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {userReposts.map(thread => (
                    <div 
                      key={thread.id} 
                      className="p-4 cursor-pointer hover:bg-slate-900/50 transition-colors active:scale-[0.99]"
                      onClick={() => navigate(`/threads/${thread.id}`)}
                    >
                      <div className={`flex items-center gap-2 mb-2 text-emerald-400 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Repeat2 className="w-3 h-3" />
                        <span>أعاد نشر</span>
                      </div>
                      <p className={`text-white font-almarai text-sm leading-relaxed line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {thread.content}
                      </p>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Replies Tab */}
            {activeTab === 'replies' && (
              userReplies.length === 0 ? (
                <div className="py-16 text-center">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-slate-500 font-almarai">{txt.noReplies}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {userReplies.map(reply => (
                    <div 
                      key={reply.id} 
                      className="p-4 cursor-pointer hover:bg-slate-900/50 transition-colors active:scale-[0.99]"
                      onClick={() => navigate(`/threads/${reply.parent_thread_id}`)}
                    >
                      <div className={`flex items-center gap-2 mb-2 text-cyan-400 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <MessageCircle className="w-3 h-3" />
                        <span>رد على منشور</span>
                        {reply.thread_author && (
                          <span 
                            className="text-lime-400 font-bold hover:text-lime-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user/${reply.thread_author?.id}`);
                            }}
                          >
                            @{reply.thread_author?.username}
                          </span>
                        )}
                      </div>
                      {reply.thread_content && (
                        <div className="mb-2 p-2 bg-slate-900/50 rounded-lg border-r-2 border-slate-600">
                          <p className="text-slate-400 text-xs text-right line-clamp-1">{reply.thread_content}</p>
                        </div>
                      )}
                      <p className={`text-white font-almarai text-sm leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
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
