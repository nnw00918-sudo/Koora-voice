import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRoomAudio } from '../contexts/RoomAudioContext';
import { 
  Volume2, 
  VolumeX, 
  X, 
  ChevronUp,
  Radio,
  Users
} from 'lucide-react';

const MiniAudioPlayer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentRoom, 
    isConnected, 
    isAudioMuted, 
    isMinimized,
    remoteUsers,
    toggleMute, 
    disconnectFromRoom,
    maximizePlayer 
  } = useRoomAudio();

  // Debug logs
  console.log('MiniAudioPlayer render:', { currentRoom, isConnected, isMinimized, isOnRoomPage: location.pathname.startsWith('/room/') });

  // Don't show if not connected or if we're on the room page
  const isOnRoomPage = location.pathname.startsWith('/room/');
  
  if (!isConnected || !currentRoom || !isMinimized || isOnRoomPage) {
    return null;
  }

  const handleReturnToRoom = () => {
    maximizePlayer();
    navigate(`/room/${currentRoom.id}`);
  };

  const handleLeave = async () => {
    await disconnectFromRoom();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50"
      >
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-lime-500/30 shadow-2xl shadow-lime-500/10 overflow-hidden">
          {/* Live indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-500 via-green-500 to-lime-500 animate-pulse" />
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              {/* Room Info */}
              <div 
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={handleReturnToRoom}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-[8px] text-white font-bold">LIVE</span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-cairo font-bold truncate text-sm">
                    {currentRoom.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Users className="w-3 h-3" />
                    <span>{remoteUsers.length + 1} متصل</span>
                    <span className="text-lime-400">• مباشر</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Mute/Unmute */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isAudioMuted 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-lime-500/20 text-lime-400'
                  }`}
                >
                  {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </motion.button>

                {/* Return to Room */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleReturnToRoom}
                  className="w-10 h-10 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center"
                >
                  <ChevronUp className="w-5 h-5" />
                </motion.button>

                {/* Leave */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLeave}
                  className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Audio Visualizer */}
            {!isAudioMuted && remoteUsers.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-lime-500 rounded-full"
                    animate={{
                      height: [4, Math.random() * 16 + 4, 4],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MiniAudioPlayer;
