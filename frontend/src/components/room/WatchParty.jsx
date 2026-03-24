import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tv } from 'lucide-react';

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
  onEnd,
  onChangeChannel
}) => {
  const [activeChannel, setActiveChannel] = useState(watchParty?.active_channel || 1);
  
  // Update active channel when watchParty changes (synced from server)
  useEffect(() => {
    if (watchParty?.active_channel && watchParty.active_channel !== activeChannel) {
      setActiveChannel(watchParty.active_channel);
    }
  }, [watchParty?.active_channel]);
  
  // Get channels from watchParty
  const channels = watchParty?.channels || [
    { id: 1, url: watchParty?.video_url, name: 'قناة 1' },
  ];

  const currentChannel = channels.find(c => c.id === activeChannel);
  const currentUrl = currentChannel?.url || watchParty?.video_url;

  if (!watchParty) return null;
  
  const embedUrl = getYouTubeEmbedUrl(currentUrl);

  const handleChannelChange = (channelId) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel?.url) {
      setActiveChannel(channelId);
      if (isHost && onChangeChannel) {
        onChangeChannel(channelId);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-900 rounded-xl overflow-hidden border border-lime-500/30 shadow-lg"
    >
      {/* Video Player - Smaller size */}
      <div className="relative bg-black" style={{ height: '180px' }}>
        {embedUrl ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Tv className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 font-cairo text-xs">اختر قناة</p>
            </div>
          </div>
        )}
      </div>

      {/* Channel Buttons - Bottom like remote */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800">
        <div className="flex items-center gap-2">
          <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-cairo font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
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
                onClick={() => handleChannelChange(num)}
                disabled={!hasUrl}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                  activeChannel === num 
                    ? 'bg-lime-500 text-slate-900 scale-110' 
                    : hasUrl 
                      ? 'bg-slate-700 text-white hover:bg-slate-600 active:scale-95' 
                      : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
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
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-cairo font-bold text-xs"
          >
            إنهاء
          </button>
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

  const updateChannel = (id, url) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, url } : c));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const activeChannels = channels.filter(c => c.url.trim());
    if (activeChannels.length === 0) return;
    
    onStart({
      video_url: activeChannels[0].url,
      title: 'بث مباشر',
      channels: channels.filter(c => c.url.trim())
    });
    
    // Reset
    setChannels([
      { id: 1, url: '', name: 'قناة 1' },
      { id: 2, url: '', name: 'قناة 2' },
      { id: 3, url: '', name: 'قناة 3' },
      { id: 4, url: '', name: 'قناة 4' },
      { id: 5, url: '', name: 'قناة 5' },
    ]);
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
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  channel.url ? 'bg-lime-500 text-slate-900' : 'bg-slate-700 text-slate-400'
                }`}>
                  {channel.id}
                </span>
                <input
                  type="url"
                  value={channel.url}
                  onChange={(e) => updateChannel(channel.id, e.target.value)}
                  placeholder={`رابط القناة ${channel.id} (YouTube)`}
                  className="flex-1 bg-slate-800 border border-slate-700 focus:border-lime-500 rounded-lg text-white placeholder:text-slate-500 h-10 px-3 text-sm outline-none"
                  dir="ltr"
                />
              </div>
            ))}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!channels.some(c => c.url.trim())}
              className="w-full py-3 rounded-xl bg-lime-500 text-slate-900 font-cairo font-bold disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
