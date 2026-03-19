import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Home, Trophy, Settings, MessageCircle, Heart, MessageSquare,
  Share2, MoreHorizontal, Image, X, Video, Link2, Play,
  Repeat2, Bookmark, Twitter, ExternalLink, Trash2
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
  
  // Media states
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const [twitterUrl, setTwitterUrl] = useState('');
  const [showTwitterInput, setShowTwitterInput] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
      addImage: 'إضافة صورة',
      addVideo: 'إضافة فيديو',
      addTwitter: 'إضافة تغريدة',
      twitterPlaceholder: 'الصق رابط التغريدة هنا...',
      add: 'إضافة',
      cancel: 'إلغاء',
      uploading: 'جاري الرفع...',
      fromTwitter: 'من تويتر',
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
      addImage: 'Add Image',
      addVideo: 'Add Video',
      addTwitter: 'Add Tweet',
      twitterPlaceholder: 'Paste tweet URL here...',
      add: 'Add',
      cancel: 'Cancel',
      uploading: 'Uploading...',
      fromTwitter: 'From Twitter',
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
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB for images, 50MB for videos)
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
    // Extract tweet ID from various Twitter/X URL formats
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
      
      // Upload media if selected
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

  // Twitter Embed Component
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
          {thread.content && (
            <p className={`text-white font-almarai leading-relaxed mb-3 whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>
              {thread.content}
            </p>
          )}
          
          {/* Thread Media */}
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
          
          {/* Twitter Embed */}
          {thread.twitter_url && (
            <TwitterEmbed url={thread.twitter_url} />
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
                <button onClick={() => { setShowComposer(false); clearMedia(); }} className="text-white">
                  <X className="w-6 h-6" />
                </button>
                <button
                  onClick={handlePostThread}
                  disabled={(!newThread.trim() && !selectedMedia && !twitterUrl) || posting}
                  className="px-5 py-2 bg-lime-400 text-black font-cairo font-bold rounded-full disabled:opacity-50"
                >
                  {posting ? (uploadingMedia ? txt.uploading : '...') : txt.post}
                </button>
              </div>
              
              {/* Modal Content */}
              <div className={`flex-1 p-4 flex gap-3 overflow-y-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                <img src={user.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <textarea
                    value={newThread}
                    onChange={(e) => setNewThread(e.target.value)}
                    placeholder={txt.whatsNew}
                    className={`w-full bg-transparent text-white text-lg font-almarai outline-none resize-none min-h-[100px] ${isRTL ? 'text-right' : 'text-left'}`}
                    autoFocus
                    maxLength={500}
                  />
                  
                  {/* Media Preview */}
                  {mediaPreview && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-slate-700">
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
                    <div className="mt-3 rounded-xl border border-slate-700 p-3 bg-slate-900/50">
                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Twitter className="w-4 h-4 text-sky-400" />
                          <span className="text-sky-400 text-sm">{txt.fromTwitter}</span>
                        </div>
                        <button onClick={() => setTwitterUrl('')} className="text-slate-500 hover:text-white">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-400 text-sm mt-2 truncate" dir="ltr">{twitterUrl}</p>
                    </div>
                  )}
                  
                  {/* Twitter URL Input */}
                  {showTwitterInput && (
                    <div className="mt-3 rounded-xl border border-slate-700 p-3 bg-slate-900/50">
                      <input
                        type="text"
                        value={twitterUrl}
                        onChange={(e) => setTwitterUrl(e.target.value)}
                        placeholder={txt.twitterPlaceholder}
                        className="w-full bg-transparent text-white text-sm outline-none mb-3"
                        dir="ltr"
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
                  
                  <p className={`text-slate-600 text-sm mt-2 ${isRTL ? 'text-left' : 'text-right'}`}>{newThread.length}/500</p>
                </div>
              </div>
              
              {/* Modal Footer - Media Buttons */}
              <div className={`p-4 border-t border-slate-800 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-lime-400 hover:text-lime-300 transition-colors"
                  title={txt.addImage}
                >
                  <Image className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => videoInputRef.current?.click()}
                  className="flex items-center gap-2 text-lime-400 hover:text-lime-300 transition-colors"
                  title={txt.addVideo}
                >
                  <Video className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => { setShowTwitterInput(true); clearMedia(); }}
                  className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors"
                  title={txt.addTwitter}
                >
                  <Twitter className="w-6 h-6" />
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
