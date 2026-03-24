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
  MoreHorizontal, Trash2, Send, Twitter, ExternalLink, Copy, Link, X
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ThreadDetailPage = ({ user }) => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isDarkMode } = useSettings();
  const [showShareMenu, setShowShareMenu] = useState(false);
  
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
      share: 'مشاركة',
      copyLink: 'نسخ الرابط',
      shareTwitter: 'مشاركة على تويتر',
      shareWhatsApp: 'مشاركة على واتساب',
      linkCopied: 'تم نسخ الرابط!',
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
      share: 'Share',
      copyLink: 'Copy Link',
      shareTwitter: 'Share on Twitter',
      shareWhatsApp: 'Share on WhatsApp',
      linkCopied: 'Link copied!',
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
    share: 'مشاركة',
    copyLink: 'نسخ الرابط',
    shareTwitter: 'مشاركة على تويتر',
    shareWhatsApp: 'مشاركة على واتساب',
    linkCopied: 'تم نسخ الرابط!',
  };

  // Share functions
  const getShareUrl = () => `${window.location.origin}/threads/${threadId}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success(txt.linkCopied);
      setShowShareMenu(false);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = getShareUrl();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(txt.linkCopied);
      setShowShareMenu(false);
    }
  };

  const handleShareTwitter = () => {
    const text = thread?.content?.substring(0, 200) || '';
    const url = getShareUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    const text = thread?.content?.substring(0, 200) || '';
    const url = getShareUrl();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + url)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'صوت الكورة',
          text: thread?.content?.substring(0, 200) || '',
          url: getShareUrl(),
        });
        setShowShareMenu(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      setShowShareMenu(true);
    }
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
            onClick={handleNativeShare}
            className={`p-3 rounded-full ${theme.textSecondary} hover:text-sky-400 hover:bg-sky-400/10 transition-colors relative`}
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

      {/* Share Menu Modal */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowShareMenu(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className={`w-full max-w-lg ${theme.cardBg} rounded-t-3xl p-6`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className={`text-lg font-cairo font-bold ${theme.textPrimary}`}>{txt.share}</h3>
                <button 
                  onClick={() => setShowShareMenu(false)}
                  className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                >
                  <X className={`w-5 h-5 ${theme.textSecondary}`} />
                </button>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-3 gap-4">
                {/* Copy Link */}
                <motion.button
                  onClick={handleCopyLink}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <Link className={`w-6 h-6 ${theme.textPrimary}`} />
                  </div>
                  <span className={`text-xs font-cairo ${theme.textPrimary}`}>{txt.copyLink}</span>
                </motion.button>

                {/* Twitter */}
                <motion.button
                  onClick={handleShareTwitter}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-14 h-14 rounded-full bg-[#1DA1F2] flex items-center justify-center">
                    <Twitter className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-xs font-cairo ${theme.textPrimary}`}>Twitter</span>
                </motion.button>

                {/* WhatsApp */}
                <motion.button
                  onClick={handleShareWhatsApp}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <span className={`text-xs font-cairo ${theme.textPrimary}`}>WhatsApp</span>
                </motion.button>
              </div>

              {/* URL Preview */}
              <div className={`mt-6 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} flex items-center gap-2`}>
                <Link className={`w-4 h-4 ${theme.textSecondary} flex-shrink-0`} />
                <span className={`text-xs ${theme.textSecondary} truncate`} dir="ltr">
                  {getShareUrl()}
                </span>
                <motion.button
                  onClick={handleCopyLink}
                  className="ml-auto flex-shrink-0 px-3 py-1 rounded-full text-xs font-cairo font-bold text-black"
                  style={{ backgroundColor: theme.primary }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
