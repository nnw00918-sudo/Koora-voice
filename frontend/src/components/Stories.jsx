import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { API } from '../config/api';
import { 
  X, Plus, ChevronLeft, ChevronRight, Eye, Trash2, 
  Image as ImageIcon, Camera, Send, Pause, Play
} from 'lucide-react';

const Stories = ({ user }) => {
  const { language } = useLanguage();
  const [storiesData, setStoriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  
  const progressRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  const txt = {
    ar: {
      addStory: 'إضافة قصة',
      yourStory: 'قصتك',
      noStories: 'لا توجد قصص',
      viewers: 'المشاهدون',
      delete: 'حذف',
      uploading: 'جاري الرفع...',
      storyDeleted: 'تم حذف القصة',
      storyCreated: 'تم نشر القصة',
      tapToAdd: 'اضغط لإضافة قصة',
    },
    en: {
      addStory: 'Add Story',
      yourStory: 'Your Story',
      noStories: 'No stories',
      viewers: 'Viewers',
      delete: 'Delete',
      uploading: 'Uploading...',
      storyDeleted: 'Story deleted',
      storyCreated: 'Story created',
      tapToAdd: 'Tap to add story',
    }
  }[language];

  const fetchStories = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/stories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStoriesData(res.data.stories || []);
    } catch (error) {
      console.error('Error fetching stories');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const markStoryViewed = useCallback(async (storyId) => {
    if (!storyId) return;
    try {
      await axios.post(`${API}/stories/${storyId}/view`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking story viewed');
    }
  }, [token]);

  const openStory = useCallback((userIndex) => {
    setCurrentUserIndex(userIndex);
    setCurrentStoryIndex(0);
    setShowViewer(true);
    setPaused(false);
    markStoryViewed(storiesData[userIndex]?.stories[0]?.id);
  }, [markStoryViewed, storiesData]);

  const closeViewer = useCallback(() => {
    setShowViewer(false);
    setShowViewers(false);
    fetchStories();
  }, [fetchStories]);

  const nextStory = useCallback(() => {
    const currentUser = storiesData[currentUserIndex];
    if (currentStoryIndex < currentUser.stories.length - 1) {
      const newIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(newIndex);
      markStoryViewed(currentUser.stories[newIndex]?.id);
    } else if (currentUserIndex < storiesData.length - 1) {
      const newUserIndex = currentUserIndex + 1;
      setCurrentUserIndex(newUserIndex);
      setCurrentStoryIndex(0);
      markStoryViewed(storiesData[newUserIndex]?.stories[0]?.id);
    } else {
      closeViewer();
    }
  }, [storiesData, currentUserIndex, currentStoryIndex, markStoryViewed, closeViewer]);

  const prevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentUserIndex > 0) {
      const newUserIndex = currentUserIndex - 1;
      const newUser = storiesData[newUserIndex];
      setCurrentUserIndex(newUserIndex);
      setCurrentStoryIndex(newUser.stories.length - 1);
    }
  }, [currentStoryIndex, currentUserIndex, storiesData]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      toast.error(isRTL ? 'نوع ملف غير مدعوم' : 'Unsupported file type');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الملف كبير جداً' : 'File too large');
      return;
    }

    setUploading(true);
    
    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await axios.post(`${API}/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Create story
      const storyFormData = new FormData();
      storyFormData.append('media_url', uploadRes.data.url);
      storyFormData.append('media_type', isVideo ? 'video' : 'image');
      storyFormData.append('caption', '');

      await axios.post(`${API}/stories`, storyFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(txt.storyCreated);
      fetchStories();
    } catch (error) {
      toast.error(isRTL ? 'فشل رفع القصة' : 'Failed to upload story');
    } finally {
      setUploading(false);
      setShowCreate(false);
    }
  };

  const deleteStory = async (storyId) => {
    try {
      await axios.delete(`${API}/stories/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(txt.storyDeleted);
      
      const currentUser = storiesData[currentUserIndex];
      if (currentUser.stories.length === 1) {
        closeViewer();
      } else {
        nextStory();
      }
      fetchStories();
    } catch (error) {
      toast.error(isRTL ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const fetchViewers = async (storyId) => {
    try {
      const res = await axios.get(`${API}/stories/${storyId}/viewers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewers(res.data.viewers || []);
      setShowViewers(true);
    } catch (error) {
      console.error('Error fetching viewers');
    }
  };

  // Auto-progress timer
  useEffect(() => {
    if (showViewer && !paused) {
      timerRef.current = setTimeout(() => {
        nextStory();
      }, 5000);
      
      return () => clearTimeout(timerRef.current);
    }
  }, [showViewer, paused, nextStory]);

  const currentUser = storiesData[currentUserIndex];
  const currentStory = currentUser?.stories[currentStoryIndex];

  // Check if current user has stories
  const ownStories = storiesData.find(s => s.is_own);
  const hasOwnStory = ownStories && ownStories.stories.length > 0;

  return (
    <>
      {/* Stories Bar */}
      <div className="bg-black border-b border-slate-800 py-4">
        <div className={`flex gap-4 px-4 overflow-x-auto scrollbar-hide ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Add Story Button */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative"
              data-testid="add-story-btn"
            >
              {hasOwnStory ? (
                <div 
                  className={`w-16 h-16 rounded-full p-0.5 ${ownStories.has_unviewed ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : 'bg-slate-700'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = storiesData.findIndex(s => s.is_own);
                    if (idx >= 0) openStory(idx);
                  }}
                >
                  <img 
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt=""
                    className="w-full h-full rounded-full object-cover border-2 border-black"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-6 h-6 text-slate-400" />
                  )}
                </div>
              )}
              {!hasOwnStory && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center border-2 border-black">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
            <span className="text-xs text-slate-400 font-almarai">{txt.yourStory}</span>
          </div>

          {/* Other Users' Stories */}
          {storiesData.filter(s => !s.is_own).map((userStory, idx) => {
            const actualIdx = storiesData.findIndex(s => s.user.id === userStory.user.id);
            return (
              <div key={userStory.user.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openStory(actualIdx)}
                  className={`w-16 h-16 rounded-full p-0.5 ${userStory.has_unviewed ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' : 'bg-slate-700'}`}
                  data-testid={`story-${userStory.user.id}`}
                >
                  <img 
                    src={userStory.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userStory.user.username}`}
                    alt=""
                    className="w-full h-full rounded-full object-cover border-2 border-black"
                  />
                </button>
                <span className="text-xs text-white font-almarai truncate max-w-[64px]">
                  {userStory.user.name?.split(' ')[0] || userStory.user.username}
                </span>
              </div>
            );
          })}

          {storiesData.length === 0 && !loading && (
            <div className="flex items-center justify-center py-2 px-4">
              <span className="text-slate-500 text-sm font-almarai">{txt.noStories}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {showViewer && currentUser && currentStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width / 3) {
                prevStory();
              } else if (x > (rect.width * 2) / 3) {
                nextStory();
              } else {
                setPaused(!paused);
              }
            }}
          >
            {/* Progress Bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
              {currentUser.stories.map((_, idx) => (
                <div key={idx} className="flex-1 h-0.5 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: idx < currentStoryIndex ? '100%' : '0%' }}
                    animate={{ 
                      width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? '100%' : '0%'
                    }}
                    transition={{ 
                      duration: idx === currentStoryIndex && !paused ? 5 : 0,
                      ease: 'linear'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <img 
                  src={currentUser.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.user.username}`}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-white font-cairo font-bold text-sm">{currentUser.user.name || currentUser.user.username}</p>
                  <p className="text-slate-400 text-xs">
                    {new Date(currentStory.created_at).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); setPaused(!paused); }} className="p-2">
                  {paused ? <Play className="w-5 h-5 text-white" /> : <Pause className="w-5 h-5 text-white" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); closeViewer(); }} className="p-2">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Story Content */}
            <div className="w-full h-full flex items-center justify-center">
              {currentStory.media_type === 'video' ? (
                <video
                  src={currentStory.media_url}
                  className="max-w-full max-h-full object-contain"
                  autoPlay
                  muted={false}
                  playsInline
                />
              ) : (
                <img
                  src={currentStory.media_url}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Caption */}
            {currentStory.caption && (
              <div className="absolute bottom-20 left-4 right-4 text-center">
                <p className="text-white font-almarai text-lg drop-shadow-lg">{currentStory.caption}</p>
              </div>
            )}

            {/* Bottom Actions (for own stories) */}
            {currentUser.is_own && (
              <div className="absolute bottom-8 left-4 right-4 flex items-center justify-between z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); fetchViewers(currentStory.id); }}
                  className="flex items-center gap-2 text-white"
                >
                  <Eye className="w-5 h-5" />
                  <span className="font-almarai">{currentStory.views_count}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteStory(currentStory.id); }}
                  className="p-2 text-red-400"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Viewers Modal */}
            {showViewers && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl max-h-[60%] overflow-hidden z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-cairo font-bold">{txt.viewers}</h3>
                    <button onClick={() => setShowViewers(false)}>
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[400px]">
                  {viewers.length === 0 ? (
                    <p className="text-slate-500 text-center py-8 font-almarai">{txt.noStories}</p>
                  ) : (
                    viewers.map((viewer) => (
                      <div key={viewer.id} className={`flex items-center gap-3 p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <img 
                          src={viewer.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewer.username}`}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="text-white font-cairo">{viewer.name || viewer.username}</p>
                          <p className="text-slate-500 text-xs" dir="ltr">@{viewer.username}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Navigation Arrows */}
            {currentUserIndex > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); prevStory(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}
            {currentUserIndex < storiesData.length - 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); nextStory(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Stories;
