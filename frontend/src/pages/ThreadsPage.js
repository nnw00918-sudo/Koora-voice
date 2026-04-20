import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import Stories from '../components/Stories';
import BottomNavigation from '../components/BottomNavigation';
import { BACKEND_URL, API } from '../config/api';
import { 
  Home, Trophy, Settings, MessageCircle, Heart, MessageSquare,
  Share2, MoreHorizontal, Image, X, Video, MapPin, Smile, CalendarDays,
  Repeat2, Bookmark, Twitter, ExternalLink, Trash2, Globe, User, Bell, Mail
} from 'lucide-react';

const ThreadsPage = ({ user }) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { isDarkMode, currentTheme } = useSettings();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [newThread, setNewThread] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState('forYou');
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
  
  // Reply states
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(null);
  const [threadReplies, setThreadReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState(false);
  
  // Media states
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [twitterUrl, setTwitterUrl] = useState('');
  const [showTwitterInput, setShowTwitterInput] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);
  const replyInputRef = useRef(null);

  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  const txt = {
    ar: {
      threads: 'ثريد',
      forYou: 'لك',
      following: 'المتابَعون',
      whatsNew: 'ماذا يحدث؟!',
      post: 'نشر',
      noThreads: 'لا توجد منشورات بعد',
      beFirst: 'كن أول من ينشر',
      startThread: 'ماذا يحدث؟!',
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
      addImage: 'صورة',
      addVideo: 'فيديو',
      addTwitter: 'تغريدة',
      twitterPlaceholder: 'الصق رابط التغريدة هنا...',
      add: 'إضافة',
      cancel: 'إلغاء',
      uploading: 'جاري الرفع...',
      fromTwitter: 'من تويتر',
      delete: 'حذف',
      deleteConfirm: 'هل تريد حذف هذا الثريد؟',
      deleted: 'تم الحذف',
      everyone: 'الجميع يمكنهم الرد',
      drafts: 'مقالي',
      replyTo: 'الرد على',
      writeReply: 'اكتب ردك...',
      sendReply: 'رد',
      viewReplies: 'عرض الردود',
      hideReplies: 'إخفاء الردود',
      reposted: 'تمت إعادة النشر',
      unreposted: 'تم إلغاء إعادة النشر',
      replyingTo: 'رداً على',
    },
    en: {
      threads: 'Threads',
      forYou: 'For You',
      following: 'Following',
      whatsNew: "What's happening?!",
      post: 'Post',
      noThreads: 'No threads yet',
      beFirst: 'Be the first to post',
      startThread: "What's happening?!",
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
      addImage: 'Image',
      addVideo: 'Video',
      addTwitter: 'Tweet',
      twitterPlaceholder: 'Paste tweet URL here...',
      add: 'Add',
      cancel: 'Cancel',
      uploading: 'Uploading...',
      fromTwitter: 'From Twitter',
      delete: 'Delete',
      deleteConfirm: 'Delete this thread?',
      deleted: 'Deleted',
      everyone: 'Everyone can reply',
      drafts: 'Drafts',
      replyTo: 'Reply to',
      writeReply: 'Write your reply...',
      sendReply: 'Reply',
      viewReplies: 'View replies',
      hideReplies: 'Hide replies',
      reposted: 'Reposted',
      unreposted: 'Unreposted',
      replyingTo: 'Replying to',
    }
  }[language];

  useEffect(() => {
    fetchThreads();
  }, [activeTab]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newThread]);

  const fetchThreads = async () => {
    try {
      const response = await axios.get(`${API}/api/threads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { tab: activeTab },
        timeout: 15000 // 15 second timeout
      });
      setThreads(response.data.threads || []);
    } catch (error) {
      console.error('Error fetching threads:', error);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(isRTL ? 'الملف كبير جداً' : 'File is too large');
      return;
    }

    setSelectedMedia(file);
    setMediaType(type);
    setMediaPreview(URL.createObjectURL(file));
    setTwitterUrl('');
    setShowTwitterInput(false);
  };

  const clearMedia = () => {
    setSelectedMedia(null);
    setMediaPreview(null);
    setMediaType(null);
    setTwitterUrl('');
    setShowTwitterInput(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const extractTwitterId = (url) => {
    const patterns = [
      /twitter\.com\/\w+\/status\/(\d+)/,
      /x\.com\/\w+\/status\/(\d+)/,
      /mobile\.twitter\.com\/\w+\/status\/(\d+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddTwitterUrl = () => {
    const tweetId = extractTwitterId(twitterUrl);
    if (!tweetId) {
      toast.error(isRTL ? 'رابط تغريدة غير صالح' : 'Invalid tweet URL');
      return;
    }
    setShowTwitterInput(false);
    clearMedia();
    setTwitterUrl(twitterUrl);
  };

  const handlePostThread = async () => {
    // Read directly from textarea ref for uncontrolled component
    const content = textareaRef.current?.value || newThread || '';
    console.log('[THREADS] Posting thread with content:', content);
    console.log('[THREADS] Selected media:', selectedMedia);
    console.log('[THREADS] Twitter URL:', twitterUrl);
    
    if (!content.trim() && !selectedMedia && !twitterUrl) {
      console.log('[THREADS] Nothing to post');
      return;
    }
    setPosting(true);
    
    try {
      let mediaUrl = null;
      
      if (selectedMedia) {
        setUploadingMedia(true);
        const formData = new FormData();
        formData.append('file', selectedMedia);
        formData.append('type', mediaType);
        
        const uploadRes = await axios.post(`${API}/api/upload/thread-media`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        mediaUrl = uploadRes.data.url;
        setUploadingMedia(false);
      }
      
      await axios.post(`${API}/api/threads`, {
        content: content,
        media_url: mediaUrl,
        media_type: mediaType,
        twitter_url: twitterUrl || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clear the input
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
      setNewThread('');
      clearMedia();
      setShowComposer(false);
      fetchThreads();
      toast.success(isRTL ? 'تم النشر' : 'Posted');
    } catch (error) {
      toast.error(isRTL ? 'فشل النشر' : 'Failed to post');
    } finally {
      setPosting(false);
      setUploadingMedia(false);
    }
  };

  const handleDeleteThread = async (threadId) => {
    try {
      await axios.delete(`${API}/api/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreads(prev => prev.filter(t => t.id !== threadId));
      setShowDeleteMenu(null);
      toast.success(txt.deleted);
    } catch (error) {
      toast.error(isRTL ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  // Direct reply without React state - for RTL fix
  const handleReplyDirect = async (threadId, content) => {
    if (!content.trim()) return;
    try {
      await axios.post(`${API}/api/threads/${threadId}/reply`, {
        content: content
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Clear the input
      if (replyInputRef.current) {
        replyInputRef.current.value = '';
      }
      setReplyingTo(null);
      // Refresh replies
      fetchReplies(threadId);
      // Update thread replies count
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, replies_count: (t.replies_count || 0) + 1 } : t
      ));
      toast.success(isRTL ? 'تم الرد' : 'Reply sent');
    } catch (error) {
      toast.error(isRTL ? 'فشل الرد' : 'Failed to reply');
    }
  };

  const handleReply = async (threadId) => {
    if (!replyContent.trim()) return;
    try {
      await axios.post(`${API}/api/threads/${threadId}/reply`, {
        content: replyContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Clear the contentEditable div
      if (replyInputRef.current) {
        replyInputRef.current.textContent = '';
      }
      setReplyContent('');
      setReplyingTo(null);
      // Refresh replies
      fetchReplies(threadId);
      // Update thread replies count
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, replies_count: (t.replies_count || 0) + 1 } : t
      ));
      toast.success(isRTL ? 'تم الرد' : 'Reply sent');
    } catch (error) {
      toast.error(isRTL ? 'فشل الرد' : 'Failed to reply');
    }
  };

  const fetchReplies = async (threadId) => {
    setLoadingReplies(true);
    try {
      const res = await axios.get(`${API}/api/threads/${threadId}/replies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreadReplies(prev => ({ ...prev, [threadId]: res.data.replies || [] }));
    } catch (error) {
      console.error('Error fetching replies');
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleReplies = (threadId) => {
    if (showReplies === threadId) {
      setShowReplies(null);
    } else {
      setShowReplies(threadId);
      if (!threadReplies[threadId]) {
        fetchReplies(threadId);
      }
    }
  };

  const handleRepost = async (threadId) => {
    try {
      const res = await axios.post(`${API}/api/threads/${threadId}/repost`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreads(prev => prev.map(t => 
        t.id === threadId 
          ? { ...t, reposted: res.data.reposted, reposts_count: res.data.reposted ? (t.reposts_count || 0) + 1 : (t.reposts_count || 1) - 1 }
          : t
      ));
      toast.success(res.data.reposted ? txt.reposted : txt.unreposted);
    } catch (error) {
      console.error('Repost failed');
    }
  };

  const handleLike = async (threadId) => {
    try {
      await axios.post(`${API}/api/threads/${threadId}/like`, {}, {
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

  const TwitterEmbed = ({ url }) => {
    const tweetId = extractTwitterId(url);
    if (!tweetId) return null;
    
    return (
      <div className="rounded-xl border border-[#262626] overflow-hidden mb-3 bg-[#141414]">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-3 hover:bg-[#1A1A1A] transition-colors"
        >
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Twitter className="w-4 h-4 text-sky-400" />
            <span className="text-sky-400 text-sm font-cairo font-medium">{txt.fromTwitter}</span>
            <ExternalLink className="w-3 h-3 text-[#A3A3A3]" />
          </div>
          <p className="text-[#A3A3A3] text-sm truncate font-almarai" dir="ltr">{url}</p>
        </a>
      </div>
    );
  };

  const ThreadCard = ({ thread }) => {
    const isOwner = thread.author?.id === user.id;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[#1A1A1A] p-4 relative hover:bg-[#0F0F0F] transition-colors"
        data-testid={`thread-card-${thread.id}`}
      >
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <img 
            src={thread.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.author?.username}`} 
            alt="" 
            className="w-11 h-11 rounded-full flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-transparent hover:ring-[#CCFF00]/30"
            onClick={() => navigate(`/user/${thread.author?.id}`)}
          />
          
          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span 
                className="font-cairo font-bold text-white truncate cursor-pointer hover:text-[#CCFF00] transition-colors"
                onClick={() => navigate(`/user/${thread.author?.id}`)}
              >
                {thread.author?.name || thread.author?.username}
              </span>
              <span 
                className="text-[#A3A3A3] text-sm cursor-pointer hover:text-[#CCFF00] transition-colors" 
                dir="ltr"
                onClick={() => navigate(`/user/${thread.author?.id}`)}
              >
                @{thread.author?.username}
              </span>
              <span className="text-[#262626]">·</span>
              <span className="text-[#A3A3A3] text-sm">{formatTime(thread.created_at)}</span>
              
              {/* More Options Button */}
              <div className={`${isRTL ? 'mr-auto' : 'ml-auto'} relative`}>
                <button 
                  onClick={() => setShowDeleteMenu(showDeleteMenu === thread.id ? null : thread.id)}
                  className="text-[#A3A3A3] hover:text-white p-1.5 rounded-full hover:bg-[#262626] transition-colors"
                  data-testid={`thread-menu-${thread.id}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {/* Thread Options Menu */}
                {showDeleteMenu === thread.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`absolute top-8 ${isRTL ? 'left-0' : 'right-0'} bg-[#141414] border border-[#262626] rounded-xl shadow-xl z-20 overflow-hidden min-w-[150px]`}
                  >
                    {/* Share Option - للجميع */}
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(`${window.location.origin}/threads/${thread.id}`);
                        setShowDeleteMenu(null);
                      }}
                      className={`w-full px-4 py-3 text-white hover:bg-[#262626] flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="font-cairo font-medium">{isRTL ? 'نسخ الرابط' : 'Copy Link'}</span>
                    </button>
                    
                    {/* Delete Option - لصاحب المنشور فقط */}
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteThread(thread.id)}
                        className={`w-full px-4 py-3 text-[#FF3B30] hover:bg-[#262626] flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        data-testid={`delete-thread-${thread.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="font-cairo font-medium">{txt.delete}</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
            
            {thread.content && (
              <p className={`text-white font-almarai leading-relaxed mb-3 whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
                {thread.content}
              </p>
            )}
            
            {thread.media_url && thread.media_type === 'image' && (
              <div className="rounded-xl overflow-hidden mb-3 border border-[#262626]">
                <img src={thread.media_url} alt="" className="w-full max-h-[400px] object-cover" />
              </div>
            )}
            
            {thread.media_url && thread.media_type === 'video' && (
              <div className="rounded-xl overflow-hidden mb-3 relative bg-black border border-[#262626]">
                <video 
                  src={thread.media_url} 
                  controls 
                  className="w-full max-h-[400px]"
                  preload="metadata"
                />
              </div>
            )}
            
            {thread.twitter_url && (
              <TwitterEmbed url={thread.twitter_url} />
            )}
            
            {/* Action Buttons */}
            <div className={`flex items-center gap-4 mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <motion.button 
                onClick={() => {
                  const newReplyingTo = replyingTo === thread.id ? null : thread.id;
                  setReplyingTo(newReplyingTo);
                  setReplyContent('');
                  // Scroll and focus when opening reply
                  if (newReplyingTo) {
                    setTimeout(() => {
                      if (replyInputRef.current) {
                        replyInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                          replyInputRef.current?.focus();
                        }, 300);
                      }
                    }, 100);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all ${replyingTo === thread.id ? 'text-[#007AFF] bg-[#007AFF]/10' : 'text-[#A3A3A3] hover:text-[#007AFF] hover:bg-[#007AFF]/10'}`}
                whileTap={{ scale: 0.95 }}
                data-testid={`reply-btn-${thread.id}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs font-medium">{thread.replies_count || 0}</span>
              </motion.button>
              <motion.button 
                onClick={() => handleRepost(thread.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all ${thread.reposted ? 'text-[#CCFF00] bg-[#CCFF00]/10' : 'text-[#A3A3A3] hover:text-[#CCFF00] hover:bg-[#CCFF00]/10'}`}
                whileTap={{ scale: 0.95 }}
                data-testid={`repost-btn-${thread.id}`}
              >
                <Repeat2 className="w-4 h-4" />
                <span className="text-xs font-medium">{thread.reposts_count || 0}</span>
              </motion.button>
              <motion.button 
                onClick={() => handleLike(thread.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all ${thread.liked ? 'text-[#FF3B30] bg-[#FF3B30]/10' : 'text-[#A3A3A3] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10'}`}
                whileTap={{ scale: 0.95 }}
                data-testid={`like-btn-${thread.id}`}
              >
                <Heart className={`w-4 h-4 ${thread.liked ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">{thread.likes_count || 0}</span>
              </motion.button>
              <motion.button 
                className="flex items-center gap-1 text-[#A3A3A3] hover:text-sky-400 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Share2 className="w-4 h-4" />
              </motion.button>
              <motion.button 
                className="text-[#A3A3A3] hover:text-[#CCFF00] transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark className="w-4 h-4" />
              </motion.button>
            </div>
            
            {/* Reply Input */}
            {replyingTo === thread.id && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`mt-4 pt-4 border-t border-[#1A1A1A]`} 
                data-testid="reply-container"
              >
                {/* Replying to indicator */}
                <div className={`flex items-center gap-1 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[#A3A3A3] text-sm font-almarai">{txt.replyingTo}</span>
                  <span className="text-[#CCFF00] text-sm font-almarai" dir="ltr">@{thread.author?.username}</span>
                </div>
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-[#262626]" />
                  <div className="flex-1">
                    <input
                      ref={replyInputRef}
                      type="text"
                      placeholder={txt.writeReply}
                      dir="auto"
                      maxLength={280}
                      autoComplete="off"
                      autoFocus
                      onFocus={(e) => {
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                      }}
                      className="w-full bg-[#141414] text-white font-almarai outline-none text-base p-3 rounded-xl border border-[#262626] focus:border-[#CCFF00]/50 transition-colors"
                      data-testid="reply-textarea"
                    />
                    <div className={`flex items-center justify-between mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[#A3A3A3] text-xs">0/280</span>
                      <motion.button
                        onClick={() => {
                          const text = replyInputRef.current?.value || '';
                          if (text.trim()) {
                            handleReplyDirect(thread.id, text);
                          }
                        }}
                        className="px-5 py-2 bg-[#CCFF00] text-black text-sm font-cairo font-bold rounded-full shadow-[0_0_10px_rgba(204,255,0,0.2)]"
                        whileTap={{ scale: 0.95 }}
                        data-testid="send-reply-btn"
                      >
                        {txt.sendReply}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* View Replies Button */}
            {thread.replies_count > 0 && (
              <button
                onClick={() => toggleReplies(thread.id)}
                className={`mt-3 text-[#CCFF00] text-sm font-almarai hover:underline ${isRTL ? 'text-right w-full' : 'text-left'}`}
                data-testid={`view-replies-${thread.id}`}
              >
                {showReplies === thread.id ? txt.hideReplies : `${txt.viewReplies} (${thread.replies_count})`}
              </button>
            )}
            
            {/* Replies List */}
            <AnimatePresence>
              {showReplies === thread.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-3"
                >
                  {loadingReplies ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    threadReplies[thread.id]?.map((reply, index) => (
                      <motion.div 
                        key={reply.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex gap-3 p-3 bg-[#141414] rounded-xl border border-[#1A1A1A] ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <img 
                          src={reply.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author?.username}`} 
                          alt="" 
                          className="w-8 h-8 rounded-full flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/user/${reply.author?.id}`)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 mb-1 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span 
                              className="font-cairo font-bold text-white text-sm cursor-pointer hover:text-[#CCFF00] transition-colors"
                              onClick={() => navigate(`/user/${reply.author?.id}`)}
                            >
                              {reply.author?.name || reply.author?.username}
                            </span>
                            <span 
                              className="text-[#A3A3A3] text-xs cursor-pointer hover:text-[#CCFF00] transition-colors" 
                              dir="ltr"
                              onClick={() => navigate(`/user/${reply.author?.id}`)}
                            >
                              @{reply.author?.username}
                            </span>
                            <span className="text-[#262626] text-xs">·</span>
                            <span className="text-[#A3A3A3] text-xs">{formatTime(reply.created_at)}</span>
                          </div>
                          {/* Replying to indicator */}
                          {reply.replying_to && reply.replying_to.username && (
                            <div className={`flex items-center gap-1 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[#A3A3A3] text-xs">{txt.replyingTo}</span>
                              <span className="text-[#CCFF00] text-xs" dir="ltr">@{reply.replying_to.username}</span>
                            </div>
                          )}
                          <p className={`text-white font-almarai text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{reply.content}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Click outside to close menu */}
        {showDeleteMenu === thread.id && (
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDeleteMenu(null)}
          />
        )}
      </motion.div>
    );
  };

  // Character count and progress
  const maxChars = 280;
  const charCount = newThread.length;
  const charProgress = (charCount / maxChars) * 100;
  const isOverLimit = charCount > maxChars;
  const remainingChars = maxChars - charCount;

  // Theme-aware colors
  const themeClasses = {
    bg: isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F5]',
    headerBg: isDarkMode ? 'bg-black/80' : 'bg-white/90',
    headerBorder: isDarkMode ? 'border-white/5' : 'border-black/5',
    textPrimary: isDarkMode ? 'text-white' : 'text-[#171717]',
    textSecondary: isDarkMode ? 'text-[#A3A3A3]' : 'text-[#525252]',
    border: isDarkMode ? 'border-[#1A1A1A]' : 'border-[#E5E5E5]',
    cardBg: isDarkMode ? 'bg-[#141414]' : 'bg-white',
    cardHover: isDarkMode ? 'hover:bg-[#0F0F0F]' : 'hover:bg-[#F9F9F9]',
    inputBg: isDarkMode ? 'bg-[#141414]' : 'bg-white',
    inputBorder: isDarkMode ? 'border-[#262626]' : 'border-[#E5E5E5]',
    primary: isDarkMode ? '#CCFF00' : '#84CC16',
    modalBg: isDarkMode ? 'bg-[#0A0A0A]' : 'bg-white',
    modalOverlay: isDarkMode ? 'bg-black/90' : 'bg-black/50',
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header - Glassmorphism */}
        <div className={`sticky top-0 ${themeClasses.headerBg} backdrop-blur-xl border-b ${themeClasses.headerBorder} z-10`}>
          <div className="p-4">
            <h1 className={`text-xl font-cairo font-bold ${themeClasses.textPrimary} ${isRTL ? 'text-right' : 'text-left'}`}>
              {txt.threads}
            </h1>
          </div>
        </div>
        
        {/* Stories */}
        <Stories user={user} />
          
        {/* Tabs */}
        <div className={`flex border-b ${themeClasses.border}`}>
          <button
            onClick={() => setActiveTab('forYou')}
            className={`flex-1 py-3.5 text-center font-cairo font-medium transition-colors relative ${
              activeTab === 'forYou' ? themeClasses.textPrimary : themeClasses.textSecondary
            }`}
          >
            {txt.forYou}
            {activeTab === 'forYou' && (
              <motion.div layoutId="tab-indicator" className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full shadow-[0_0_15px_rgba(204,255,0,0.5)]`} style={{ backgroundColor: themeClasses.primary }} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3.5 text-center font-cairo font-medium transition-colors relative ${
              activeTab === 'following' ? themeClasses.textPrimary : themeClasses.textSecondary
            }`}
          >
            {txt.following}
            {activeTab === 'following' && (
              <motion.div layoutId="tab-indicator" className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full shadow-[0_0_15px_rgba(204,255,0,0.5)]`} style={{ backgroundColor: themeClasses.primary }} />
            )}
          </button>
        </div>

        {/* Composer Button */}
        <button
          onClick={() => setShowComposer(true)}
          className={`w-full p-4 border-b border-[#1A1A1A] flex items-center gap-3 hover:bg-[#0F0F0F] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          data-testid="composer-button"
        >
          <img src={user.avatar} alt="" className="w-11 h-11 rounded-full ring-2 ring-[#262626]" />
          <span className="text-[#A3A3A3] font-almarai">{txt.startThread}</span>
        </button>

        {/* Threads List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-[#141414] flex items-center justify-center mb-4 ring-1 ring-[#262626]">
              <MessageSquare className="w-10 h-10 text-[#262626]" />
            </div>
            <h3 className="text-white font-cairo font-bold text-lg mb-2">{txt.noThreads}</h3>
            <p className="text-[#A3A3A3] font-almarai text-center">{txt.beFirst}</p>
          </div>
        ) : (
          <div>
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, 'image')}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => handleFileSelect(e, 'video')}
        className="hidden"
      />

      {/* Twitter-Style Composer Modal */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-start justify-center pt-12"
            onClick={(e) => e.target === e.currentTarget && setShowComposer(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="bg-[#0A0A0A] w-full max-w-[600px] rounded-2xl border border-[#262626] overflow-hidden mx-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-3 border-b border-[#1A1A1A]`}>
                <motion.button 
                  onClick={() => { setShowComposer(false); clearMedia(); }} 
                  className="text-white hover:bg-[#262626] rounded-full p-2"
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
                <button className="text-[#CCFF00] font-cairo font-medium text-sm">
                  {txt.drafts}
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-4">
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-[#262626]" />
                  <div className="flex-1">
                    {/* Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={newThread}
                      onChange={(e) => setNewThread(e.target.value)}
                      placeholder={txt.whatsNew}
                      dir="auto"
                      maxLength={500}
                      autoComplete="off"
                      rows={3}
                      className="w-full bg-transparent text-white text-xl font-almarai outline-none py-4 placeholder:text-[#A3A3A3] resize-none"
                      style={{
                        WebkitUserSelect: 'text',
                        userSelect: 'text',
                        touchAction: 'auto'
                      }}
                      data-testid="thread-composer-input"
                    />
                    
                    {/* Media Preview */}
                    {mediaPreview && (
                      <div className="relative mt-3 rounded-2xl overflow-hidden border border-[#262626]">
                        {mediaType === 'image' ? (
                          <img src={mediaPreview} alt="" className="w-full max-h-[300px] object-cover" />
                        ) : (
                          <video src={mediaPreview} className="w-full max-h-[300px]" controls />
                        )}
                        <motion.button
                          onClick={clearMedia}
                          className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 hover:bg-black"
                          whileTap={{ scale: 0.9 }}
                        >
                          <X className="w-4 h-4 text-white" />
                        </motion.button>
                      </div>
                    )}
                    
                    {/* Twitter URL Preview */}
                    {twitterUrl && !showTwitterInput && (
                      <div className="mt-3 rounded-2xl border border-[#262626] p-3 bg-[#141414]">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Twitter className="w-4 h-4 text-sky-400" />
                            <span className="text-sky-400 text-sm font-almarai">{txt.fromTwitter}</span>
                          </div>
                          <button onClick={() => setTwitterUrl('')} className="text-[#A3A3A3] hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[#A3A3A3] text-sm mt-2 truncate" dir="ltr">{twitterUrl}</p>
                      </div>
                    )}
                    
                    {/* Twitter URL Input */}
                    {showTwitterInput && (
                      <div className="mt-3 rounded-2xl border border-[#262626] p-3 bg-[#141414]">
                        <input
                          type="url"
                          value={twitterUrl}
                          onChange={(e) => setTwitterUrl(e.target.value)}
                          placeholder={txt.twitterPlaceholder}
                          className="w-full bg-transparent text-white text-sm outline-none mb-3 touch-action-auto font-almarai"
                          dir="ltr"
                          inputMode="url"
                          autoComplete="off"
                        />
                        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <motion.button
                            onClick={handleAddTwitterUrl}
                            className="px-3 py-1.5 bg-sky-500 text-white text-sm rounded-full font-cairo font-medium"
                            whileTap={{ scale: 0.95 }}
                          >
                            {txt.add}
                          </motion.button>
                          <motion.button
                            onClick={() => { setShowTwitterInput(false); setTwitterUrl(''); }}
                            className="px-3 py-1.5 bg-[#262626] text-white text-sm rounded-full font-cairo font-medium"
                            whileTap={{ scale: 0.95 }}
                          >
                            {txt.cancel}
                          </motion.button>
                        </div>
                      </div>
                    )}
                    
                    {/* Reply Settings */}
                    <button className={`flex items-center gap-2 mt-4 text-[#CCFF00] text-sm font-cairo font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Globe className="w-4 h-4" />
                      <span>{txt.everyone}</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="border-t border-[#1A1A1A] p-3">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* Media Buttons */}
                  <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <motion.button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-full hover:bg-[#CCFF00]/10 text-[#CCFF00] transition-colors"
                      title={txt.addImage}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Image className="w-5 h-5" />
                    </motion.button>
                    <motion.button 
                      onClick={() => videoInputRef.current?.click()}
                      className="p-2 rounded-full hover:bg-[#CCFF00]/10 text-[#CCFF00] transition-colors"
                      title={txt.addVideo}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Video className="w-5 h-5" />
                    </motion.button>
                  </div>
                  
                  {/* Character Count & Post Button */}
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {charCount > 0 && (
                      <div className="flex items-center gap-2">
                        {/* Circular Progress */}
                        <div className="relative w-6 h-6">
                          <svg className="w-6 h-6 transform -rotate-90">
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              fill="none"
                              stroke="#262626"
                              strokeWidth="2"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              fill="none"
                              stroke={isOverLimit ? '#FF3B30' : charProgress > 80 ? '#f59e0b' : '#CCFF00'}
                              strokeWidth="2"
                              strokeDasharray={`${Math.min(charProgress, 100) * 0.628} 62.8`}
                            />
                          </svg>
                          {remainingChars <= 20 && (
                            <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-medium ${isOverLimit ? 'text-[#FF3B30]' : 'text-[#A3A3A3]'}`}>
                              {remainingChars}
                            </span>
                          )}
                        </div>
                        <div className="w-px h-6 bg-[#262626]" />
                      </div>
                    )}
                    
                    <button
                      onClick={handlePostThread}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handlePostThread();
                      }}
                      disabled={(!newThread.trim() && !selectedMedia && !twitterUrl) || posting || isOverLimit}
                      className="px-5 py-2 bg-[#CCFF00] text-black font-cairo font-bold rounded-full disabled:opacity-50 hover:shadow-[0_0_15px_rgba(204,255,0,0.4)] transition-shadow active:scale-95"
                      style={{
                        WebkitTapHighlightColor: 'rgba(204,255,0,0.3)',
                        touchAction: 'manipulation',
                        cursor: 'pointer',
                        minHeight: '44px'
                      }}
                      data-testid="post-thread-btn"
                    >
                      {posting ? (uploadingMedia ? '...' : '...') : txt.post}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNavigation isRTL={isRTL} />
    </div>
  );
};

export default ThreadsPage;
