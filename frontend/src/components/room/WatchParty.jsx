import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, Users, X, Link, Youtube } from 'lucide-react';

// Watch Party Player Component
export const WatchPartyPlayer = ({ 
  watchParty, 
  isHost,
  onSync,
  onEnd 
}) => {
  const [isPlaying, setIsPlaying] = useState(watchParty?.is_playing ?? false);
  const [currentTime, setCurrentTime] = useState(watchParty?.current_time ?? 0);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = useRef(null);
  const lastSyncRef = useRef(Date.now());

  // Extract YouTube video ID
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeId(watchParty?.video_url);

  // Sync playback state periodically (host only)
  useEffect(() => {
    if (!isHost) return;
    
    const syncInterval = setInterval(() => {
      if (playerRef.current && Date.now() - lastSyncRef.current > 2000) {
        onSync?.(currentTime, isPlaying);
        lastSyncRef.current = Date.now();
      }
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [isHost, currentTime, isPlaying, onSync]);

  // Update from server sync (non-host)
  useEffect(() => {
    if (isHost) return;
    
    if (watchParty?.current_time !== undefined) {
      const serverTime = watchParty.current_time;
      // Only seek if difference is more than 3 seconds
      if (Math.abs(serverTime - currentTime) > 3) {
        setCurrentTime(serverTime);
      }
    }
    
    if (watchParty?.is_playing !== undefined) {
      setIsPlaying(watchParty.is_playing);
    }
  }, [watchParty?.current_time, watchParty?.is_playing, isHost]);

  const handlePlayPause = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    if (isHost) {
      onSync?.(currentTime, newState);
    }
  };

  const handleSeek = (e) => {
    if (!isHost) return;
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * 100; // Assume 100 as max for demo
    setCurrentTime(newTime);
    onSync?.(newTime, isPlaying);
  };

  if (!watchParty) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-900 rounded-2xl overflow-hidden border border-lime-500/30 shadow-lg"
    >
      {/* Video Player */}
      <div className="relative aspect-video bg-black">
        {videoId ? (
          <iframe
            ref={playerRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&start=${Math.floor(currentTime)}&enablejsapi=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Youtube className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-white font-cairo">جاري التحميل...</p>
            </div>
          </div>
        )}
        
        {/* Watch Party Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500/90 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-bold">Watch Party</span>
        </div>
        
        {/* Host Badge */}
        {isHost && (
          <div className="absolute top-3 right-3 bg-lime-500/90 px-3 py-1.5 rounded-full">
            <span className="text-slate-900 text-sm font-bold font-cairo">أنت المضيف</span>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="p-3 bg-slate-800/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Play/Pause - Host only */}
            {isHost && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-xl bg-lime-500 text-slate-900 flex items-center justify-center"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </motion.button>
            )}
            
            {/* Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Title */}
          <div className="flex-1 mx-4 text-center">
            <p className="text-white font-cairo text-sm truncate">
              {watchParty.title || 'Watch Party'}
            </p>
            <p className="text-slate-400 text-xs">
              مضيف: {watchParty.host_name}
            </p>
          </div>
          
          {/* End Watch Party - Host only */}
          {isHost && (
            <button
              onClick={onEnd}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-cairo hover:bg-red-500/30"
            >
              إنهاء
            </button>
          )}
        </div>
        
        {/* Progress Bar */}
        {isHost && (
          <div 
            className="h-1 bg-slate-700 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-lime-500 rounded-full transition-all"
              style={{ width: `${Math.min(currentTime, 100)}%` }}
            />
          </div>
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
