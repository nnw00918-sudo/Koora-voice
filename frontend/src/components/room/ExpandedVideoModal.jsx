import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, SwitchCamera } from 'lucide-react';

// Remote Video Circle Component for expanded view
const RemoteVideoCircle = ({ remoteUser }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (remoteUser?.videoTrack && videoRef.current) {
      remoteUser.videoTrack.play(videoRef.current);
    }
    return () => {
      if (remoteUser?.videoTrack) {
        remoteUser.videoTrack.stop();
      }
    };
  }, [remoteUser, remoteUser?.videoTrack]);
  
  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      className="w-full h-full object-cover"
    />
  );
};

export const ExpandedVideoModal = ({
  show,
  expandedVideo,
  onClose,
  localCameraStream,
  cameraFacing,
  onSwitchCamera
}) => {
  if (!show || !expandedVideo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="relative w-full h-full max-w-2xl max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-full rounded-lg overflow-hidden">
          {expandedVideo.isLocal && localCameraStream ? (
            <video
              ref={(el) => {
                if (el && localCameraStream) {
                  el.srcObject = localCameraStream;
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
            />
          ) : expandedVideo.remoteUser ? (
            <div className="w-full h-full">
              <RemoteVideoCircle remoteUser={expandedVideo.remoteUser} />
            </div>
          ) : (
            <img src={expandedVideo.avatar} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        
        {/* Username overlay */}
        <div className="absolute bottom-4 left-4 bg-black/60 px-4 py-2 rounded-lg">
          <span className="text-white font-cairo font-bold">{expandedVideo.username}</span>
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        
        {/* Switch camera for local video */}
        {expandedVideo.isLocal && (
          <button 
            onClick={onSwitchCamera}
            className="absolute top-4 left-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center"
          >
            <SwitchCamera className="w-6 h-6 text-white" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ExpandedVideoModal;
