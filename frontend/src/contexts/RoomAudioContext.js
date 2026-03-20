import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

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
  
  const agoraClientRef = useRef(null);

  const setCurrentRoomWithConnection = useCallback((roomData) => {
    if (roomData) {
      setCurrentRoom(roomData);
      setIsConnected(true);
      if (roomData.agoraClient) {
        agoraClientRef.current = roomData.agoraClient;
      }
      if (roomData.remoteUsers) {
        setRemoteUsers(roomData.remoteUsers);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsAudioMuted(prev => {
      const newState = !prev;
      // Mute/unmute all remote audio tracks
      if (agoraClientRef.current) {
        agoraClientRef.current.remoteUsers?.forEach(user => {
          if (user.audioTrack) {
            if (newState) {
              user.audioTrack.setVolume(0);
            } else {
              user.audioTrack.setVolume(100);
            }
          }
        });
      }
      return newState;
    });
  }, []);

  const disconnectFromRoom = useCallback(async () => {
    try {
      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current = null;
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
    agoraClient: agoraClientRef.current,
    toggleMute,
    disconnectFromRoom,
    minimizePlayer,
    maximizePlayer,
    setCurrentRoom: setCurrentRoomWithConnection,
  };

  return (
    <RoomAudioContext.Provider value={value}>
      {children}
    </RoomAudioContext.Provider>
  );
};

export default RoomAudioContext;
