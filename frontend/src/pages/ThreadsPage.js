import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import Stories from '../components/Stories';
import BottomNavigation from '../components/BottomNavigation';
import { 
  Home, Trophy, Settings, MessageCircle, Heart, MessageSquare,
  Share2, MoreHorizontal, Image, X, Video, MapPin, Smile, CalendarDays,
  Repeat2, Bookmark, Twitter, ExternalLink, Trash2, Globe, User, Bell, Mail
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
    setLoading(true);
    try {
      const response = await axios.get(`${API}/threads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { tab: activeTab }
      });
      setThreads(response.data.threads || []);
    } catch (error) {
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
    if (!newThread.trim() && !selectedMedia && !twitterUrl) return;
    setPosting(true);
    
    try {
      let mediaUrl = null;
      
      if (selectedMedia) {
        setUploadingMedia(true);
        const formData = new FormData();
        formData.append('file', selectedMedia);
        formData.append('type', mediaType);
        
        const uploadRes = await axios.post(`${API}/upload/thread-media`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        mediaUrl = uploadRes.data.url;
        setUploadingMedia(false);
      }
      
      await axios.post(`${API}/threads`, {
        content: newThread,
        media_url: mediaUrl,
        media_type: mediaType,
        twitter_url: twitterUrl || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clear the contentEditable div
      if (textareaRef.current) {
        textareaRef.current.textContent = '';
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
      await axios.delete(`${API}/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreads(prev => prev.filter(t => t.id !== threadId));
      setShowDeleteMenu(null);
      toast.success(txt.deleted);
    } catch (error) {
      toast.error(isRTL ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const handleReply = async (threadId) => {
    if (!replyContent.trim()) return;
    try {
      await axios.post(`${API}/threads/${threadId}/reply`, {
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
      const res = await axios.get(`${API}/threads/${threadId}/replies`, {
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
      const res = await axios.post(`${API}/threads/${threadId}/repost`, {}, {
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

  const TwitterEmbed = ({ url }) => {
    const tweetId = extractTwitterId(url);
    if (!tweetId) return null;
    
    return (
      <div className="rounded-xl border border-slate-700 overflow-hidden mb-3 bg-slate-900/50">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-3 hover:bg-slate-800/50 transition-colors"
        >
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Twitter className="w-4 h-4 text-sky-400" />
            <span className="text-sky-400 text-sm font-medium">{txt.fromTwitter}</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm truncate" dir="ltr">{url}</p>
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
        className="border-b border-slate-800 p-4 relative"
      >
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
              
              {/* More Options Button */}
              <div className={`${isRTL ? 'mr-auto' : 'ml-auto'} relative`}>
                <button 
                  onClick={() => setShowDeleteMenu(showDeleteMenu === thread.id ? null : thread.id)}
                  className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {/* Delete Menu */}
                {showDeleteMenu === thread.id && isOwner && (
                  <div className={`absolute top-8 ${isRTL ? 'left-0' : 'right-0'} bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden min-w-[150px]`}>
                    <button
                      onClick={() => handleDeleteThread(thread.id)}
                      className={`w-full px-4 py-3 text-red-500 hover:bg-slate-800 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="font-medium">{txt.delete}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {thread.content && (
              <p className={`text-white font-almarai leading-relaxed mb-3 whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
                {thread.content}
              </p>
            )}
            
            {thread.media_url && thread.media_type === 'image' && (
              <div className="rounded-xl overflow-hidden mb-3">
                <img src={thread.media_url} alt="" className="w-full max-h-[400px] object-cover" />
              </div>
            )}
            
            {thread.media_url && thread.media_type === 'video' && (
              <div className="rounded-xl overflow-hidden mb-3 relative bg-black">
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
            
            <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button 
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
                className={`flex items-center gap-1 transition-colors ${replyingTo === thread.id ? 'text-sky-400' : 'text-slate-500 hover:text-sky-400'}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{thread.replies_count || 0}</span>
              </button>
              <button 
                onClick={() => handleRepost(thread.id)}
                className={`flex items-center gap-1 transition-colors ${thread.reposted ? 'text-green-500' : 'text-slate-500 hover:text-green-400'}`}
              >
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
            
            {/* Reply Input */}
            {replyingTo === thread.id && (
              <div className={`mt-4 pt-4 border-t border-slate-800`} data-testid="reply-container">
                {/* Replying to indicator */}
                <div className={`flex items-center gap-1 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-500 text-sm">{txt.replyingTo}</span>
                  <span className="text-sky-400 text-sm" dir="ltr">@{thread.author?.username}</span>
                </div>
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div
                      ref={replyInputRef}
                      contentEditable
                      dir="rtl"
                      lang="ar"
                      data-placeholder={txt.writeReply}
                      onInput={(e) => {
                        const text = e.currentTarget.textContent || '';
                        if (text.length <= 280) {
                          setReplyContent(text);
                        } else {
                          e.currentTarget.textContent = text.slice(0, 280);
                          setReplyContent(text.slice(0, 280));
                        }
                      }}
                      onFocus={(e) => {
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                      }}
                      className="w-full bg-slate-800/50 text-white font-almarai outline-none text-base p-3 rounded-xl border border-slate-700 focus:border-sky-500 transition-colors min-h-[80px] text-right empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500"
                      style={{
                        direction: 'rtl',
                        textAlign: 'right',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                      data-testid="reply-textarea"
                    />
                    <div className={`flex items-center justify-between mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-slate-500 text-xs">{replyContent.length}/280</span>
                      <button
                        onClick={() => handleReply(thread.id)}
                        disabled={!replyContent.trim()}
                        className="px-5 py-2 bg-sky-500 text-white text-sm font-cairo font-bold rounded-full disabled:opacity-50 active:scale-95 transition-transform"
                        data-testid="send-reply-btn"
                      >
                        {txt.sendReply}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* View Replies Button */}
            {thread.replies_count > 0 && (
              <button
                onClick={() => toggleReplies(thread.id)}
                className={`mt-3 text-sky-400 text-sm font-almarai ${isRTL ? 'text-right w-full' : 'text-left'}`}
              >
                {showReplies === thread.id ? txt.hideReplies : `${txt.viewReplies} (${thread.replies_count})`}
              </button>
            )}
            
            {/* Replies List */}
            {showReplies === thread.id && (
              <div className="mt-3 space-y-3">
                {loadingReplies ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  threadReplies[thread.id]?.map((reply) => (
                    <div key={reply.id} className={`flex gap-3 p-3 bg-slate-900/50 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <img 
                        src={reply.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author?.username}`} 
                        alt="" 
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center gap-2 mb-1 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="font-cairo font-bold text-white text-sm">{reply.author?.name || reply.author?.username}</span>
                          <span className="text-slate-500 text-xs" dir="ltr">@{reply.author?.username}</span>
                          <span className="text-slate-600 text-xs">·</span>
                          <span className="text-slate-500 text-xs">{formatTime(reply.created_at)}</span>
                        </div>
                        {/* Replying to indicator */}
                        {reply.replying_to && reply.replying_to.username && (
                          <div className={`flex items-center gap-1 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-slate-500 text-xs">{txt.replyingTo}</span>
                            <span className="text-sky-400 text-xs" dir="ltr">@{reply.replying_to.username}</span>
                          </div>
                        )}
                        <p className={`text-white font-almarai text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{reply.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-slate-800 z-10">
          <div className="p-4">
            <h1 className={`text-xl font-cairo font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
              {txt.threads}
            </h1>
          </div>
        </div>
        
        {/* Stories */}
        <Stories user={user} />
          
        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('forYou')}
            className={`flex-1 py-3 text-center font-cairo font-medium transition-colors relative ${
              activeTab === 'forYou' ? 'text-white' : 'text-slate-500'
            }`}
          >
            {txt.forYou}
            {activeTab === 'forYou' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-sky-500 rounded-full" />
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
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-sky-500 rounded-full" />
            )}
          </button>
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
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-12"
            onClick={(e) => e.target === e.currentTarget && setShowComposer(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-black w-full max-w-[600px] rounded-2xl border border-slate-800 overflow-hidden mx-4"
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-3 border-b border-slate-800`}>
                <button 
                  onClick={() => { setShowComposer(false); clearMedia(); }} 
                  className="text-white hover:bg-slate-800 rounded-full p-2"
                >
                  <X className="w-5 h-5" />
                </button>
                <button className="text-sky-500 font-medium text-sm">
                  {txt.drafts}
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-4">
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    {/* Textarea */}
                    <div
                      ref={textareaRef}
                      contentEditable
                      dir="rtl"
                      lang="ar"
                      data-placeholder={txt.whatsNew}
                      onInput={(e) => {
                        const text = e.currentTarget.textContent || '';
                        if (text.length <= 500) {
                          setNewThread(text);
                        } else {
                          e.currentTarget.textContent = text.slice(0, 500);
                          setNewThread(text.slice(0, 500));
                        }
                      }}
                      className="w-full bg-transparent text-white text-xl font-almarai outline-none min-h-[120px] text-right empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500"
                      style={{
                        direction: 'rtl',
                        textAlign: 'right',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    />
                    
                    {/* Media Preview */}
                    {mediaPreview && (
                      <div className="relative mt-3 rounded-2xl overflow-hidden border border-slate-700">
                        {mediaType === 'image' ? (
                          <img src={mediaPreview} alt="" className="w-full max-h-[300px] object-cover" />
                        ) : (
                          <video src={mediaPreview} className="w-full max-h-[300px]" controls />
                        )}
                        <button
                          onClick={clearMedia}
                          className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 hover:bg-black"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                    
                    {/* Twitter URL Preview */}
                    {twitterUrl && !showTwitterInput && (
                      <div className="mt-3 rounded-2xl border border-slate-700 p-3 bg-slate-900/50">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Twitter className="w-4 h-4 text-sky-400" />
                            <span className="text-sky-400 text-sm">{txt.fromTwitter}</span>
                          </div>
                          <button onClick={() => setTwitterUrl('')} className="text-slate-500 hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-slate-400 text-sm mt-2 truncate" dir="ltr">{twitterUrl}</p>
                      </div>
                    )}
                    
                    {/* Twitter URL Input */}
                    {showTwitterInput && (
                      <div className="mt-3 rounded-2xl border border-slate-700 p-3 bg-slate-900/50">
                        <input
                          type="url"
                          value={twitterUrl}
                          onChange={(e) => setTwitterUrl(e.target.value)}
                          placeholder={txt.twitterPlaceholder}
                          className="w-full bg-transparent text-white text-sm outline-none mb-3 touch-action-auto"
                          dir="ltr"
                          inputMode="url"
                          autoComplete="off"
                        />
                        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={handleAddTwitterUrl}
                            className="px-3 py-1.5 bg-sky-500 text-white text-sm rounded-full font-medium"
                          >
                            {txt.add}
                          </button>
                          <button
                            onClick={() => { setShowTwitterInput(false); setTwitterUrl(''); }}
                            className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded-full font-medium"
                          >
                            {txt.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Reply Settings */}
                    <button className={`flex items-center gap-2 mt-4 text-sky-500 text-sm font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Globe className="w-4 h-4" />
                      <span>{txt.everyone}</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="border-t border-slate-800 p-3">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* Media Buttons */}
                  <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-full hover:bg-sky-500/10 text-sky-500 transition-colors"
                      title={txt.addImage}
                    >
                      <Image className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => videoInputRef.current?.click()}
                      className="p-2 rounded-full hover:bg-sky-500/10 text-sky-500 transition-colors"
                      title={txt.addVideo}
                    >
                      <Video className="w-5 h-5" />
                    </button>
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
                              stroke="#2d3748"
                              strokeWidth="2"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              fill="none"
                              stroke={isOverLimit ? '#ef4444' : charProgress > 80 ? '#f59e0b' : '#0ea5e9'}
                              strokeWidth="2"
                              strokeDasharray={`${Math.min(charProgress, 100) * 0.628} 62.8`}
                            />
                          </svg>
                          {remainingChars <= 20 && (
                            <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-medium ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
                              {remainingChars}
                            </span>
                          )}
                        </div>
                        <div className="w-px h-6 bg-slate-700" />
                      </div>
                    )}
                    
                    <button
                      onClick={handlePostThread}
                      disabled={(!newThread.trim() && !selectedMedia && !twitterUrl) || posting || isOverLimit}
                      className="px-4 py-1.5 bg-sky-500 text-white font-cairo font-bold rounded-full disabled:opacity-50 hover:bg-sky-600 transition-colors"
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
