import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link, Youtube, Tv } from 'lucide-react';

// Helper function to convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  
  if (url.includes('/embed/')) return url;
  
  let videoId = null;
  
  const liveMatch = url.match(/youtube\.com\/live\/([^?&]+)/);
  if (liveMatch) videoId = liveMatch[1];
  
  const watchMatch = url.match(/[?&]v=([^?&]+)/);
  if (watchMatch) videoId = watchMatch[1];
  
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) videoId = shortMatch[1];
  
  if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`;
  
  return url;
};

// Watch Party Player Component with Channels
export const WatchPartyPlayer = ({ 
  watchParty, 
  isHost,
  onSync,
  onEnd,
  onChangeChannel
}) => {
  const [activeChannel, setActiveChannel] = useState(1);
  
  // Get channels from watchParty or use defaults
  const channels = watchParty?.channels || [
    { id: 1, url: watchParty?.video_url, name: 'قناة 1' },
    { id: 2, url: '', name: 'قناة 2' },
    { id: 3, url: '', name: 'قناة 3' },
    { id: 4, url: '', name: 'قناة 4' },
    { id: 5, url: '', name: 'قناة 5' },
  ];

  const currentChannel = channels.find(c => c.id === activeChannel) || channels[0];
  const currentUrl = currentChannel?.url || watchParty?.video_url;

  if (!watchParty) return null;
  
  const embedUrl = getYouTubeEmbedUrl(currentUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-900 rounded-2xl overflow-hidden border border-lime-500/30 shadow-lg"
    >
      {/* Header with Channels */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800">
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-cairo font-bold flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            مباشر
          </span>
        </div>
        
        {/* Channel Buttons */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((num) => {
            const channel = channels.find(c => c.id === num);
            const hasUrl = channel?.url;
            return (
              <button
                key={num}
                onClick={() => hasUrl && setActiveChannel(num)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  activeChannel === num 
                    ? 'bg-lime-500 text-slate-900' 
                    : hasUrl 
                      ? 'bg-slate-700 text-white hover:bg-slate-600' 
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {isHost && (
          <button
            onClick={onEnd}
            className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 font-cairo font-bold text-xs border border-red-500/50"
          >
            إنهاء
          </button>
        )}
      </div>

      {/* Video Player */}
      <div className="relative aspect-video bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Tv className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 font-cairo text-sm">لا يوجد بث</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Start Watch Party Modal with 5 Channels
export const StartWatchPartyModal = ({ isOpen, onClose, onStart }) => {
  const [channels, setChannels] = useState([
    { id: 1, url: '', name: 'قناة 1' },
    { id: 2, url: '', name: 'قناة 2' },
    { id: 3, url: '', name: 'قناة 3' },
    { id: 4, url: '', name: 'قناة 4' },
    { id: 5, url: '', name: 'قناة 5' },
  ]);
  const [title, setTitle] = useState('');

  const updateChannel = (id, url) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, url } : c));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const activeChannels = channels.filter(c => c.url.trim());
    if (activeChannels.length === 0) return;
    
    onStart({
      video_url: activeChannels[0].url,
      title: title || 'بث مباشر',
      channels: channels
    });
    
    // Reset
    setChannels([
      { id: 1, url: '', name: 'قناة 1' },
      { id: 2, url: '', name: 'قناة 2' },
      { id: 3, url: '', name: 'قناة 3' },
      { id: 4, url: '', name: 'قناة 4' },
      { id: 5, url: '', name: 'قناة 5' },
    ]);
    setTitle('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-2xl p-4 w-full max-w-md border border-lime-500/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-cairo font-bold text-lg flex items-center gap-2">
              <Tv className="w-5 h-5 text-lime-400" />
              إضافة قنوات البث
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Channel Inputs */}
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  channel.url ? 'bg-lime-500 text-slate-900' : 'bg-slate-700 text-slate-400'
                }`}>
                  {channel.id}
                </span>
                <input
                  type="url"
                  value={channel.url}
                  onChange={(e) => updateChannel(channel.id, e.target.value)}
                  placeholder={`رابط القناة ${channel.id}`}
                  className="flex-1 bg-slate-800 border border-slate-700 focus:border-lime-500 rounded-lg text-white placeholder:text-slate-500 h-10 px-3 text-sm outline-none"
                  dir="ltr"
                />
              </div>
            ))}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!channels.some(c => c.url.trim())}
              className="w-full py-3 rounded-xl bg-lime-500 text-slate-900 font-cairo font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              بدء البث
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default { WatchPartyPlayer, StartWatchPartyModal };
