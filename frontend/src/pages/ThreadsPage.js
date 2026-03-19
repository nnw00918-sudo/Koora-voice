import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Home, Trophy, Settings, MessageCircle, Heart, MessageSquare,
  Share2, MoreHorizontal, Image, Send, X, ArrowRight, ArrowLeft,
  Repeat2, Bookmark, ChevronDown
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ThreadsPage = ({ user }) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [newThread, setNewThread] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState('forYou');

  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  const txt = {
    ar: {
      threads: 'ثريد',
      forYou: 'لك',
      following: 'المتابَعون',
      whatsNew: 'ما الجديد؟',
      post: 'نشر',
      noThreads: 'لا توجد منشورات بعد',
      beFirst: 'كن أول من ينشر',
      startThread: 'ابدأ ثريد...',
      reply: 'رد',
      repost: 'إعادة نشر',
      like: 'إعجاب',
      share: 'مشاركة',
      replies: 'ردود',
      likes: 'إعجابات',
      justNow: 'الآن',
      minutesAgo: 'د',
      hoursAgo: 'س',
      daysAgo: 'ي',
    },
    en: {
      threads: 'Threads',
      forYou: 'For You',
      following: 'Following',
      whatsNew: "What's new?",
      post: 'Post',
      noThreads: 'No threads yet',
      beFirst: 'Be the first to post',
      startThread: 'Start a thread...',
      reply: 'Reply',
      repost: 'Repost',
      like: 'Like',
      share: 'Share',
      replies: 'replies',
      likes: 'likes',
      justNow: 'now',
      minutesAgo: 'm',
      hoursAgo: 'h',
      daysAgo: 'd',
    }
  }[language];

  useEffect(() => {
    fetchThreads();
  }, [activeTab]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/threads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { tab: activeTab }
      });
      setThreads(response.data.threads || []);
    } catch (error) {
      // If API doesn't exist yet, show empty state
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePostThread = async () => {
    if (!newThread.trim()) return;
    setPosting(true);
    try {
      await axios.post(`${API}/threads`, 
        { content: newThread },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewThread('');
      setShowComposer(false);
      fetchThreads();
      toast.success(isRTL ? 'تم النشر' : 'Posted');
    } catch (error) {
      toast.error(isRTL ? 'فشل النشر' : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (threadId) => {
    try {
      await axios.post(`${API}/threads/${threadId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreads(prev => prev.map(t => 
        t.id === threadId 
          ? { ...t, liked: !t.liked, likes_count: t.liked ? t.likes_count - 1 : t.likes_count + 1 }
          : t
      ));
    } catch (error) {
      console.error('Like failed');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return txt.justNow;
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return txt.justNow;
    if (minutes < 60) return `${minutes}${txt.minutesAgo}`;
    if (hours < 24) return `${hours}${txt.hoursAgo}`;
    return `${days}${txt.daysAgo}`;
  };

  const ThreadCard = ({ thread }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-slate-800 p-4"
    >
      <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <img 
          src={thread.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.author?.username}`} 
          alt="" 
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="font-cairo font-bold text-white truncate">
              {thread.author?.name || thread.author?.username}
            </span>
            <span className="text-slate-500 text-sm" dir="ltr">@{thread.author?.username}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500 text-sm">{formatTime(thread.created_at)}</span>
            <button className={`${isRTL ? 'mr-auto' : 'ml-auto'} text-slate-500 hover:text-white`}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          
          {/* Thread Content */}
          <p className={`text-white font-almarai leading-relaxed mb-3 whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
            {thread.content}
          </p>
          
          {/* Thread Image (if any) */}
          {thread.image && (
            <div className="rounded-xl overflow-hidden mb-3">
              <img src={thread.image} alt="" className="w-full" />
            </div>
          )}
          
          {/* Actions */}
          <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button className="flex items-center gap-1 text-slate-500 hover:text-sky-400 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{thread.replies_count || 0}</span>
            </button>
            <button className="flex items-center gap-1 text-slate-500 hover:text-green-400 transition-colors">
              <Repeat2 className="w-4 h-4" />
              <span className="text-xs">{thread.reposts_count || 0}</span>
            </button>
            <button 
              onClick={() => handleLike(thread.id)}
              className={`flex items-center gap-1 transition-colors ${thread.liked ? 'text-red-500' : 'text-slate-500 hover:text-red-400'}`}
            >
              <Heart className={`w-4 h-4 ${thread.liked ? 'fill-current' : ''}`} />
              <span className="text-xs">{thread.likes_count || 0}</span>
            </button>
            <button className="flex items-center gap-1 text-slate-500 hover:text-sky-400 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="text-slate-500 hover:text-sky-400 transition-colors">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 z-10">
          <div className="p-4">
            <h1 className={`text-xl font-cairo font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
              {txt.threads}
            </h1>
          </div>
          
          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveTab('forYou')}
              className={`flex-1 py-3 text-center font-cairo font-medium transition-colors relative ${
                activeTab === 'forYou' ? 'text-white' : 'text-slate-500'
              }`}
            >
              {txt.forYou}
              {activeTab === 'forYou' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-lime-400 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 py-3 text-center font-cairo font-medium transition-colors relative ${
                activeTab === 'following' ? 'text-white' : 'text-slate-500'
              }`}
            >
              {txt.following}
              {activeTab === 'following' && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-lime-400 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Composer Button */}
        <button
          onClick={() => setShowComposer(true)}
          className={`w-full p-4 border-b border-slate-800 flex items-center gap-3 hover:bg-slate-900/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
          <span className="text-slate-500 font-almarai">{txt.startThread}</span>
        </button>

        {/* Threads List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-white font-cairo font-bold text-lg mb-2">{txt.noThreads}</h3>
            <p className="text-slate-500 font-almarai text-center">{txt.beFirst}</p>
          </div>
        ) : (
          <div>
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </div>

      {/* Composer Modal */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50"
          >
            <div className="max-w-[600px] mx-auto h-full flex flex-col">
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-4 border-b border-slate-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button onClick={() => setShowComposer(false)} className="text-white">
                  <X className="w-6 h-6" />
                </button>
                <button
                  onClick={handlePostThread}
                  disabled={!newThread.trim() || posting}
                  className="px-5 py-2 bg-lime-400 text-black font-cairo font-bold rounded-full disabled:opacity-50"
                >
                  {posting ? '...' : txt.post}
                </button>
              </div>
              
              {/* Modal Content */}
              <div className={`flex-1 p-4 flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <img src={user.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <textarea
                    value={newThread}
                    onChange={(e) => setNewThread(e.target.value)}
                    placeholder={txt.whatsNew}
                    className={`w-full bg-transparent text-white text-lg font-almarai outline-none resize-none min-h-[150px] ${isRTL ? 'text-right' : 'text-left'}`}
                    autoFocus
                    maxLength={500}
                  />
                  <p className={`text-slate-600 text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{newThread.length}/500</p>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800">
                <button className="text-lime-400">
                  <Image className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-40">
        <div className={`max-w-[600px] mx-auto flex justify-around p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Home className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('home')}</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-lime-400"
          >
            <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{txt.threads}</span>
          </button>
          <button
            onClick={() => navigate('/matches')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Trophy className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('matches')}</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Settings className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreadsPage;
