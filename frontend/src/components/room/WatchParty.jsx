import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tv, Volume2, VolumeX, Maximize2, Minimize2, RefreshCw, SkipForward, SkipBack, Play, Pause } from 'lucide-react';
import { buildYouTubeEmbedUrl } from '../../utils/youtube';

// Watch Party Player Component with Channels - Enhanced
export const WatchPartyPlayer = ({ 
  watchParty, 
  isHost,
  onEnd,
  onChangeChannel,
  onSync
}) => {
  const [activeChannel, setActiveChannel] = useState(watchParty?.active_channel || 1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get channels from watchParty
  const channels = watchParty?.channels || [
    { id: 1, url: watchParty?.video_url, name: 'قناة 1' },
  ];

  const currentChannel = channels.find(c => c.id === activeChannel);
  const currentUrl = currentChannel?.url || watchParty?.video_url;
  const finalUrl = buildYouTubeEmbedUrl(currentUrl, { mute: isMuted ? 1 : 0 });

  // All hooks must be called before any conditional returns
  const handleChannelChange = useCallback((channelId) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel?.url) {
      setActiveChannel(channelId);
      if (isHost && onChangeChannel) {
        onChangeChannel(channelId);
      }
    }
  }, [channels, isHost, onChangeChannel]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 100);
  }, []);

  const handleNextChannel = useCallback(() => {
    const availableChannels = channels.filter(c => c.url);
    const currentIndex = availableChannels.findIndex(c => c.id === activeChannel);
    if (currentIndex < availableChannels.length - 1) {
      handleChannelChange(availableChannels[currentIndex + 1].id);
    }
  }, [channels, activeChannel, handleChannelChange]);

  const handlePrevChannel = useCallback(() => {
    const availableChannels = channels.filter(c => c.url);
    const currentIndex = availableChannels.findIndex(c => c.id === activeChannel);
    if (currentIndex > 0) {
      handleChannelChange(availableChannels[currentIndex - 1].id);
    }
  }, [channels, activeChannel, handleChannelChange]);
  
  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, showControls]);
  
  // Update active channel when watchParty changes (synced from server)
  useEffect(() => {
    if (watchParty?.active_channel && watchParty.active_channel !== activeChannel) {
      setActiveChannel(watchParty.active_channel);
    }
  }, [watchParty?.active_channel, activeChannel]);

  // Keyboard shortcuts when expanded
  useEffect(() => {
    if (!isExpanded) return;
    
    const handleKeyPress = (e) => {
      switch(e.key) {
        case 'Escape':
          setIsExpanded(false);
          break;
        case 'm':
        case 'M':
          setIsMuted(prev => !prev);
          break;
        case 'ArrowRight':
          handleNextChannel();
          break;
        case 'ArrowLeft':
          handlePrevChannel();
          break;
        case 'r':
        case 'R':
          handleRefresh();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isExpanded, handleNextChannel, handlePrevChannel, handleRefresh]);

  // Now we can have conditional return AFTER all hooks
  if (!watchParty) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-slate-900 rounded-xl overflow-hidden border border-lime-500/30 shadow-lg transition-all duration-300 ${
        isExpanded ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
      onMouseMove={() => isExpanded && setShowControls(true)}
      onTouchStart={() => isExpanded && setShowControls(true)}
    >
      {/* Video Player */}
      <div className="relative bg-black" style={{ height: isExpanded ? '100%' : '180px' }}>
        {!isRefreshing && finalUrl ? (
          <iframe
            key={`${finalUrl}-${refreshKey}`}
            src={finalUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
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
        
        {/* Overlay Controls - Show on hover or tap in expanded mode */}
        <AnimatePresence>
          {(showControls || !isExpanded) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none"
            >
              {/* Top Controls */}
              <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto">
                <button
                  onClick={handleRefresh}
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  title="تحديث (R)"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  title={isMuted ? 'تشغيل الصوت (M)' : 'كتم الصوت (M)'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  title={isExpanded ? 'تصغير (Esc)' : 'تكبير'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Channel Navigation - Visible when expanded */}
              {isExpanded && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 pointer-events-auto">
                  <button
                    onClick={handlePrevChannel}
                    className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-lime-500 hover:text-black transition-colors"
                    title="القناة السابقة"
                  >
                    <SkipBack className="w-6 h-6" />
                  </button>
                  <div className="text-white text-xl font-bold bg-black/50 px-4 py-2 rounded-full">
                    قناة {activeChannel}
                  </div>
                  <button
                    onClick={handleNextChannel}
                    className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-lime-500 hover:text-black transition-colors"
                    title="القناة التالية"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Channel Buttons - Bottom like remote (hidden when expanded) */}
      {!isExpanded && (
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
      )}
      
      {/* Floating End Button when expanded */}
      {isExpanded && isHost && showControls && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={onEnd}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-red-500 text-white font-cairo font-bold text-lg shadow-lg hover:bg-red-600 transition-colors z-50"
        >
          إنهاء البث
        </motion.button>
      )}
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
