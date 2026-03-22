import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, Link, Youtube } from 'lucide-react';

// Helper function to convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  
  // Already an embed URL
  if (url.includes('/embed/')) {
    return url;
  }
  
  let videoId = null;
  
  // YouTube Live URL: youtube.com/live/VIDEO_ID
  const liveMatch = url.match(/youtube\.com\/live\/([^?&]+)/);
  if (liveMatch) {
    videoId = liveMatch[1];
  }
  
  // YouTube Watch URL: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^?&]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  
  // YouTube Short URL: youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`;
  }
  
  return url;
};

// Watch Party Player Component
export const WatchPartyPlayer = ({ 
  watchParty, 
  isHost,
  onSync,
  onEnd 
}) => {
  const [isMuted, setIsMuted] = useState(false);

  if (!watchParty?.video_url) return null;
  
  const embedUrl = getYouTubeEmbedUrl(watchParty.video_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-900 rounded-2xl overflow-hidden border border-lime-500/30 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-cairo font-bold flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Watch Party
          </span>
        </div>
        {isHost && (
          <span className="bg-lime-500 text-slate-900 text-xs px-2 py-1 rounded-full font-cairo font-bold">
            أنت المضيف
          </span>
        )}
      </div>

      {/* Video Player - Using iframe for better compatibility */}
      <div className="relative aspect-video bg-black">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
        <div className="text-right flex-1">
          <p className="text-white font-cairo font-bold text-sm">{watchParty.title || 'Watch Party'}</p>
          <p className="text-slate-400 text-xs">مضيف: {watchParty.host_name || 'غير معروف'}</p>
        </div>

        {isHost && (
          <button
            onClick={onEnd}
            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 font-cairo font-bold text-sm border border-red-500/50"
          >
            إنهاء
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Start Watch Party Modal
export const StartWatchPartyModal = ({ isOpen, onClose, onStart }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (videoUrl.trim()) {
      onStart({
        video_url: videoUrl.trim(),
        title: title.trim() || 'Watch Party'
      });
      setVideoUrl('');
      setTitle('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-lime-500/30"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Youtube className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-white font-cairo font-bold text-xl">بدء Watch Party</h2>
            <p className="text-slate-400 text-sm">شاهدوا معاً بشكل متزامن</p>
          </div>
        </div>
        
        {/* Video URL */}
        <div className="mb-4">
          <label className="text-slate-400 text-sm font-cairo mb-2 block">رابط الفيديو (YouTube)</label>
          <div className="relative">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 pr-10 font-cairo placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
              dir="ltr"
            />
            <Link className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          </div>
        </div>
        
        {/* Title */}
        <div className="mb-6">
          <label className="text-slate-400 text-sm font-cairo mb-2 block">العنوان (اختياري)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: الهلال vs النصر"
            className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 font-cairo placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
            dir="rtl"
          />
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-cairo hover:bg-slate-600"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={!videoUrl.trim()}
            className="flex-1 py-3 rounded-xl bg-lime-500 text-slate-900 font-cairo font-bold hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            بدء
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default { WatchPartyPlayer, StartWatchPartyModal };
