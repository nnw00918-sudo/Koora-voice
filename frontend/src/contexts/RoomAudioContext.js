import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const RoomAudioContext = createContext();

export const useRoomAudio = () => {
  const context = useContext(RoomAudioContext);
  if (!context) {
    throw new Error('useRoomAudio must be used within RoomAudioProvider');
  }
  return context;
};

export const RoomAudioProvider = ({ children }) => {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const agoraClient = useRef(null);
  const localAudioTrack = useRef(null);

  const initializeAgora = useCallback(async (roomId, roomData, agoraToken, agoraUid) => {
    try {
      if (agoraClient.current) {
        await disconnectFromRoom();
      }

      agoraClient.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      
      agoraClient.current.on('user-published', async (user, mediaType) => {
        await agoraClient.current.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          user.audioTrack?.play();
          setRemoteUsers(prev => {
            if (!prev.find(u => u.uid === user.uid)) {
              return [...prev, user];
            }
            return prev;
          });
        }
      });

      agoraClient.current.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio') {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        }
      });

      agoraClient.current.on('user-left', (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      const appId = process.env.REACT_APP_AGORA_APP_ID;
      if (appId && agoraToken) {
        await agoraClient.current.join(appId, roomId, agoraToken, agoraUid);
        setCurrentRoom(roomData);
        setIsConnected(true);
        setIsMinimized(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize Agora:', error);
      return false;
    }
  }, []);

  const publishAudio = useCallback(async () => {
    try {
      if (!agoraClient.current) return false;
      
      localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();
      await agoraClient.current.publish([localAudioTrack.current]);
      return true;
    } catch (error) {
      console.error('Failed to publish audio:', error);
      return false;
    }
  }, []);

  const unpublishAudio = useCallback(async () => {
    try {
      if (localAudioTrack.current) {
        await agoraClient.current?.unpublish([localAudioTrack.current]);
        localAudioTrack.current.close();
        localAudioTrack.current = null;
      }
    } catch (error) {
      console.error('Failed to unpublish audio:', error);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsAudioMuted(prev => {
      const newState = !prev;
      // Mute/unmute all remote audio tracks
      remoteUsers.forEach(user => {
        if (user.audioTrack) {
          if (newState) {
            user.audioTrack.stop();
          } else {
            user.audioTrack.play();
          }
        }
      });
      return newState;
    });
  }, [remoteUsers]);

  const disconnectFromRoom = useCallback(async () => {
    try {
      if (localAudioTrack.current) {
        localAudioTrack.current.close();
        localAudioTrack.current = null;
      }
      
      if (agoraClient.current) {
        await agoraClient.current.leave();
        agoraClient.current = null;
      }
      
      setCurrentRoom(null);
      setIsConnected(false);
      setIsMinimized(false);
      setRemoteUsers([]);
      setIsAudioMuted(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, []);

  const minimizePlayer = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const maximizePlayer = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const value = {
    currentRoom,
    isConnected,
    isAudioMuted,
    isMinimized,
    remoteUsers,
    agoraClient: agoraClient.current,
    localAudioTrack: localAudioTrack.current,
    initializeAgora,
    publishAudio,
    unpublishAudio,
    toggleMute,
    disconnectFromRoom,
    minimizePlayer,
    maximizePlayer,
    setCurrentRoom,
  };

  return (
    <RoomAudioContext.Provider value={value}>
      {children}
    </RoomAudioContext.Provider>
  );
};

export default RoomAudioContext;
