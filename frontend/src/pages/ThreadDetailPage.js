import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import BottomNavigation from '../components/BottomNavigation';
import { 
  ArrowRight, Heart, MessageCircle, Repeat2, Share2, Bookmark,
  MoreHorizontal, Trash2, Send, Twitter, ExternalLink
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ThreadDetailPage = ({ user }) => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isDarkMode } = useSettings();
  
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
  
  const replyInputRef = useRef(null);
  const token = localStorage.getItem('token');
  const isRTL = language === 'ar';

  // Theme classes
  const theme = {
    bg: isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F5]',
    headerBg: isDarkMode ? 'bg-black/80' : 'bg-white/90',
    headerBorder: isDarkMode ? 'border-white/5' : 'border-black/5',
    textPrimary: isDarkMode ? 'text-white' : 'text-[#171717]',
    textSecondary: isDarkMode ? 'text-[#A3A3A3]' : 'text-[#525252]',
    border: isDarkMode ? 'border-[#1A1A1A]' : 'border-[#E5E5E5]',
    cardBg: isDarkMode ? 'bg-[#141414]' : 'bg-white',
    inputBg: isDarkMode ? 'bg-[#141414]' : 'bg-white',
    inputBorder: isDarkMode ? 'border-[#262626]' : 'border-[#E5E5E5]',
    primary: isDarkMode ? '#CCFF00' : '#84CC16',
  };

  const txt = {
    ar: {
      back: 'رجوع',
      thread: 'المنشور',
      replies: 'الردود',
      noReplies: 'لا توجد ردود بعد',
      beFirst: 'كن أول من يرد!',
      writeReply: 'اكتب ردك...',
      send: 'إرسال',
      delete: 'حذف',
      replyingTo: 'رد على',
      notFound: 'المنشور غير موجود',
      deleted: 'تم حذف المنشور',
      replySent: 'تم إرسال الرد',
      fromTwitter: 'من تويتر',
    },
    en: {
      back: 'Back',
      thread: 'Thread',
      replies: 'Replies',
      noReplies: 'No replies yet',
      beFirst: 'Be the first to reply!',
      writeReply: 'Write your reply...',
      send: 'Send',
      delete: 'Delete',
      replyingTo: 'Replying to',
      notFound: 'Thread not found',
      deleted: 'Thread deleted',
      replySent: 'Reply sent',
      fromTwitter: 'From Twitter',
    }
  }[language] || {
    back: 'رجوع',
    thread: 'المنشور',
    replies: 'الردود',
    noReplies: 'لا توجد ردود بعد',
    beFirst: 'كن أول من يرد!',
    writeReply: 'اكتب ردك...',
    send: 'إرسال',
    delete: 'حذف',
    replyingTo: 'رد على',
    notFound: 'المنشور غير موجود',
    deleted: 'تم حذف المنشور',
    replySent: 'تم إرسال الرد',
    fromTwitter: 'من تويتر',
  };

  useEffect(() => {
    fetchThread();
    fetchReplies();
  }, [threadId]);

  const fetchThread = async () => {
    try {
      const response = await axios.get(`${API}/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThread(response.data);
    } catch (error) {
      console.error('Error fetching thread:', error);
      toast.error(txt.notFound);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const response = await axios.get(`${API}/threads/${threadId}/replies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      setReplies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching replies:', error);
      setReplies([]);
    }
  };

  const handleLike = async () => {
    if (!thread) return;
    try {
      await axios.post(`${API}/threads/${threadId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThread(prev => ({
        ...prev,
        liked: !prev.liked,
        likes_count: prev.liked ? prev.likes_count - 1 : prev.likes_count + 1
      }));
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  const handleRepost = async () => {
    if (!thread) return;
    try {
      await axios.post(`${API}/threads/${threadId}/repost`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThread(prev => ({
        ...prev,
        reposted: !prev.reposted,
        reposts_count: prev.reposted ? prev.reposts_count - 1 : prev.reposts_count + 1
      }));
    } catch (error) {
      console.error('Error reposting:', error);
    }
  };

  const handleDelete = async () => {
    if (!thread || thread.author?.id !== user.id) return;
    try {
      await axios.delete(`${API}/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(txt.deleted);
      navigate('/threads');
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleReply = async () => {
    const text = replyInputRef.current?.value?.trim();
    if (!text || sending) return;
    
    setSending(true);
    try {
      await axios.post(`${API}/threads/${threadId}/reply`, {
        content: text
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (replyInputRef.current) {
        replyInputRef.current.value = '';
      }
      toast.success(txt.replySent);
      fetchReplies();
      
      // Update reply count
      setThread(prev => ({
        ...prev,
        replies_count: (prev.replies_count || 0) + 1
      }));
    } catch (error) {
      console.error('Error replying:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return isRTL ? 'الآن' : 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}${isRTL ? 'د' : 'm'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${isRTL ? 'س' : 'h'}`;
    return `${Math.floor(diff / 86400)}${isRTL ? 'ي' : 'd'}`;
  };

  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className={`min-h-screen ${theme.bg} flex flex-col items-center justify-center`}>
        <MessageCircle className={`w-16 h-16 ${theme.textSecondary} mb-4`} />
        <p className={`${theme.textSecondary} font-cairo`}>{txt.notFound}</p>
        <button 
          onClick={() => navigate('/threads')}
          className="mt-4 px-6 py-2 rounded-full font-cairo font-bold text-black"
          style={{ backgroundColor: theme.primary }}
        >
          {txt.back}
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} pb-24`}>
      {/* Header */}
      <div className={`sticky top-0 ${theme.headerBg} backdrop-blur-xl border-b ${theme.headerBorder} z-10`}>
        <div className={`flex items-center gap-3 p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <motion.button 
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowRight className={`w-5 h-5 ${isRTL ? '' : 'rotate-180'}`} style={{ color: theme.primary }} />
          </motion.button>
          <h1 className={`text-lg font-cairo font-bold ${theme.textPrimary}`}>{txt.thread}</h1>
        </div>
      </div>

      {/* Main Thread */}
      <div className={`p-4 border-b ${theme.border}`}>
        {/* Author Info */}
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <img 
            src={thread.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.author?.username}`}
            alt=""
            className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/user/${thread.author?.id}`)}
          />
          <div className="flex-1">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span 
                className={`font-cairo font-bold ${theme.textPrimary} cursor-pointer hover:underline`}
                onClick={() => navigate(`/user/${thread.author?.id}`)}
              >
                {thread.author?.name || thread.author?.username}
              </span>
              {thread.author?.id === user.id && (
                <div className="relative">
                  <button 
                    onClick={() => setShowDeleteMenu(showDeleteMenu ? null : thread.id)}
                    className={`p-1 rounded-full ${theme.textSecondary} hover:opacity-70`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {showDeleteMenu === thread.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`absolute top-8 ${isRTL ? 'left-0' : 'right-0'} ${theme.cardBg} border ${theme.border} rounded-xl shadow-xl z-20 overflow-hidden min-w-[120px]`}
                    >
                      <button
                        onClick={handleDelete}
                        className={`w-full px-4 py-3 text-red-500 hover:bg-red-500/10 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="font-cairo">{txt.delete}</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
            <span 
              className={`${theme.textSecondary} text-sm cursor-pointer hover:underline`}
              dir="ltr"
              onClick={() => navigate(`/user/${thread.author?.id}`)}
            >
              @{thread.author?.username}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
          <p className={`${theme.textPrimary} font-almarai text-lg leading-relaxed whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
            {thread.content}
          </p>
        </div>

        {/* Media */}
        {thread.media_url && thread.media_type === 'image' && (
          <div className={`mt-4 rounded-2xl overflow-hidden border ${theme.border}`}>
            <img src={thread.media_url} alt="" className="w-full max-h-[500px] object-cover" />
          </div>
        )}
        
        {thread.media_url && thread.media_type === 'video' && (
          <div className={`mt-4 rounded-2xl overflow-hidden border ${theme.border}`}>
            <video src={thread.media_url} controls className="w-full max-h-[500px]" />
          </div>
        )}

        {/* Twitter Embed */}
        {thread.twitter_url && (
          <a 
            href={thread.twitter_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-4 block rounded-2xl border ${theme.border} p-4 ${theme.cardBg} hover:opacity-80 transition-opacity`}
          >
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Twitter className="w-4 h-4 text-sky-400" />
              <span className="text-sky-400 text-sm font-cairo">{txt.fromTwitter}</span>
              <ExternalLink className={`w-3 h-3 ${theme.textSecondary}`} />
            </div>
            <p className={`${theme.textSecondary} text-sm mt-2 truncate`} dir="ltr">{thread.twitter_url}</p>
          </a>
        )}

        {/* Date */}
        <p className={`mt-4 ${theme.textSecondary} text-sm`}>
          {formatFullDate(thread.created_at)}
        </p>

        {/* Stats */}
        <div className={`mt-4 pt-4 border-t ${theme.border} flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className={theme.textSecondary}>
            <strong className={theme.textPrimary}>{thread.replies_count || 0}</strong> {txt.replies}
          </span>
          <span className={theme.textSecondary}>
            <strong className={theme.textPrimary}>{thread.reposts_count || 0}</strong> {isRTL ? 'إعادة نشر' : 'Reposts'}
          </span>
          <span className={theme.textSecondary}>
            <strong className={theme.textPrimary}>{thread.likes_count || 0}</strong> {isRTL ? 'إعجاب' : 'Likes'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className={`mt-4 pt-4 border-t ${theme.border} flex items-center justify-around`}>
          <motion.button 
            onClick={() => replyInputRef.current?.focus()}
            className={`p-3 rounded-full ${theme.textSecondary} hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors`}
            whileTap={{ scale: 0.9 }}
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
          <motion.button 
            onClick={handleRepost}
            className={`p-3 rounded-full transition-colors ${thread.reposted ? 'text-[#CCFF00] bg-[#CCFF00]/10' : `${theme.textSecondary} hover:text-[#CCFF00] hover:bg-[#CCFF00]/10`}`}
            whileTap={{ scale: 0.9 }}
          >
            <Repeat2 className="w-6 h-6" />
          </motion.button>
          <motion.button 
            onClick={handleLike}
            className={`p-3 rounded-full transition-colors ${thread.liked ? 'text-[#FF3B30] bg-[#FF3B30]/10' : `${theme.textSecondary} hover:text-[#FF3B30] hover:bg-[#FF3B30]/10`}`}
            whileTap={{ scale: 0.9 }}
          >
            <Heart className={`w-6 h-6 ${thread.liked ? 'fill-current' : ''}`} />
          </motion.button>
          <motion.button 
            className={`p-3 rounded-full ${theme.textSecondary} hover:text-sky-400 hover:bg-sky-400/10 transition-colors`}
            whileTap={{ scale: 0.9 }}
          >
            <Share2 className="w-6 h-6" />
          </motion.button>
          <motion.button 
            className={`p-3 rounded-full ${theme.textSecondary} hover:opacity-70 transition-colors`}
            style={{ ':hover': { color: theme.primary } }}
            whileTap={{ scale: 0.9 }}
          >
            <Bookmark className="w-6 h-6" />
          </motion.button>
        </div>
      </div>

      {/* Reply Input */}
      <div className={`p-4 border-b ${theme.border}`}>
        <div className={`flex items-center gap-1 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className={`${theme.textSecondary} text-sm`}>{txt.replyingTo}</span>
          <span className="text-sm" style={{ color: theme.primary }} dir="ltr">@{thread.author?.username}</span>
        </div>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <img src={user.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 flex gap-2">
            <input
              ref={replyInputRef}
              type="text"
              placeholder={txt.writeReply}
              dir="auto"
              maxLength={280}
              autoComplete="off"
              className={`flex-1 ${theme.inputBg} ${theme.textPrimary} px-4 py-3 rounded-2xl outline-none border ${theme.inputBorder} font-almarai`}
              style={{ fontSize: '16px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            />
            <motion.button
              onClick={handleReply}
              disabled={sending}
              className="p-3 rounded-full text-black disabled:opacity-50"
              style={{ backgroundColor: theme.primary }}
              whileTap={{ scale: 0.9 }}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div>
        {!Array.isArray(replies) || replies.length === 0 ? (
          <div className="py-16 text-center">
            <MessageCircle className={`w-12 h-12 mx-auto mb-3 ${theme.textSecondary} opacity-50`} />
            <p className={`${theme.textSecondary} font-cairo`}>{txt.noReplies}</p>
            <p className={`${theme.textSecondary} text-sm mt-1 font-almarai`}>{txt.beFirst}</p>
          </div>
        ) : (
          <div>
            {replies.map((reply, index) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 border-b ${theme.border}`}
              >
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img 
                    src={reply.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author?.username}`}
                    alt=""
                    className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/user/${reply.author?.id}`)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span 
                        className={`font-cairo font-bold ${theme.textPrimary} cursor-pointer hover:underline`}
                        onClick={() => navigate(`/user/${reply.author?.id}`)}
                      >
                        {reply.author?.name || reply.author?.username}
                      </span>
                      <span className={`${theme.textSecondary} text-sm`} dir="ltr">
                        @{reply.author?.username}
                      </span>
                      <span className={theme.textSecondary}>·</span>
                      <span className={`${theme.textSecondary} text-sm`}>{formatTime(reply.created_at)}</span>
                    </div>
                    <p className={`mt-1 ${theme.textPrimary} font-almarai ${isRTL ? 'text-right' : 'text-left'}`}>
                      {reply.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showDeleteMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowDeleteMenu(null)} />
      )}

      <BottomNavigation isRTL={isRTL} />
    </div>
  );
};

export default ThreadDetailPage;
