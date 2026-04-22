import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import ReactPlayer from 'react-player';
import { Browser } from '@capacitor/browser';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useRoomAudio } from '../contexts/RoomAudioContext';
import { useLanguage, LanguageToggle } from '../contexts/LanguageContext';
import { FloatingReactions, ReactionBar, PollCard, CreatePollModal } from '../components/room/Reactions';
import { WatchPartyPlayer, StartWatchPartyModal } from '../components/room/WatchParty';
import { InviteFriendsModal, InviteFriendsButton } from '../components/room/InviteFriends';
// Extracted modals
import { ConnectedUsersList } from '../components/room/ConnectedUsersList';
import { RoomSettingsModal } from '../components/room/RoomSettingsModal';
import { SeatRequestsModal } from '../components/room/SeatRequestsModal';
import { InviteReceivedModal } from '../components/room/InviteReceivedModal';
import { StreamModal } from '../components/room/StreamModal';
import { PromoteModal } from '../components/room/PromoteModal';
import { BackgroundPickerModal } from '../components/room/BackgroundPickerModal';
import { ExpandedVideoModal } from '../components/room/ExpandedVideoModal';
import { UserRolesModal } from '../components/room/UserRolesModal';
import { VIPBadge, VIPAvatarFrame } from '../components/room/VIPBadge';
import { playNotificationSound, toggleSound, isSoundEnabled } from '../utils/soundManager';
import { BACKEND_URL, API, AGORA_APP_ID } from '../config/api';
// Custom Hooks for Room Features
import { useRoomPlayback } from '../hooks/useRoomPlayback';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Volume1,
  VolumeX,
  Hand,
  Star,
  X,
  Settings,
  Sparkles,
  Video,
  VideoOff,
  Tv,
  SwitchCamera,
  ImageIcon,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  UserX,
  Share2,
  LogOut as SignOut,
  Crown,
  Shield,
  Users,
  Check,
  Gift,
  Square,
  Trash2,
  Bell,
  BellOff,
  Edit3,
  Lock,
  Unlock,
  Circle,
  StopCircle,
  Youtube,
  BarChart3,
  Type,
  Download,
  ZoomIn,
  ZoomOut,
  Link
} from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';

// Remote Video Circle Component for stage avatars
const RemoteVideoCircle = ({ remoteUser }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (remoteUser?.videoTrack && videoRef.current) {
      // Play video track on the video element
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

const YallaLiveRoom = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { 
    minimizePlayer, 
    disconnectFromRoom: globalDisconnect,
    setCurrentRoom,
    currentRoom,
    isMinimized,
    maximizePlayer,
    agoraClient: contextAgoraClient
  } = useRoomAudio();
  
  const { t, isRTL, language } = useLanguage();
  
  const [room, setRoom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]); // All room members (connected + offline)
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // {id, username, content} - message being replied to
  const [selectedImage, setSelectedImage] = useState(null); // Image to send in chat
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState(null); // Full-screen image viewer
  const [imageZoom, setImageZoom] = useState(1); // Zoom level for image viewer
  const [showImageUrlModal, setShowImageUrlModal] = useState(false); // Modal for image URL input
  const [imageUrlInput, setImageUrlInput] = useState(''); // Image URL input value
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [isMicOn, setIsMicOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onStage, setOnStage] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCoins, setUserCoins] = useState(user.coins || 1000);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const remoteUsersRef = useRef([]); // Ref to track remote users for volume control
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [remoteVideoUsers, setRemoteVideoUsers] = useState([]); // Users with active video
  const [seatRequests, setSeatRequests] = useState([]);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [roomRole, setRoomRole] = useState('member'); // Room-specific primary role: owner, admin, mod, member
  const [roomRoles, setRoomRoles] = useState([]); // All room roles (supports multiple roles)
  const [roleLoading, setRoleLoading] = useState(true);
  
  // Check if current user is room owner based on room data
  const isRoomOwner = room?.owner_id === user.id;
  // System owner (role=owner) has ALL permissions in ALL rooms
  const isSystemOwner = currentUserRole === 'owner';
  // Room owner or system owner has full control
  const isOwner = isRoomOwner || isSystemOwner;
  
  // Room-specific permissions (supports multiple roles)
  const isRoomLeader = roomRole === 'leader' || roomRoles.includes('leader');
  const isRoomAdmin = roomRole === 'admin' || roomRoles.includes('admin') || isRoomLeader || isOwner;
  const isRoomMod = roomRole === 'mod' || roomRoles.includes('mod') || isRoomAdmin;
  const isRoomNewsReporter = roomRoles.includes('news_reporter');
  const canManageStage = isOwner || isRoomLeader || isRoomAdmin || isRoomMod;
  const canKickMute = isOwner || isRoomLeader || isRoomAdmin;
  const canChangeRoles = isOwner || isRoomLeader || isRoomAdmin; // Leader & Admin can change roles
  const canJoinStageDirect = isOwner || isRoomLeader || roomRoles.includes('admin') || roomRoles.includes('mod'); // Leader, Admin & Mod can join stage directly
  const canApproveSeatRequests = isOwner || isRoomLeader || isRoomAdmin || isRoomMod; // All staff can see/approve seat requests
  
  const [myInvites, setMyInvites] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  const [showUserMenu, setShowUserMenu] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedPromoteUser, setSelectedPromoteUser] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showInviteFriendsModal, setShowInviteFriendsModal] = useState(false);
  const [showConnectedList, setShowConnectedList] = useState(false);
  const [showSeatRequestsModal, setShowSeatRequestsModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [roomImageUrl, setRoomImageUrl] = useState('');
  const [chatBackground, setChatBackground] = useState('');
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [updatingTitle, setUpdatingTitle] = useState(false);
  const backgroundInputRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Stream states
  const [streamActive, setStreamActive] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamInputUrl, setStreamInputUrl] = useState('');
  const [viewMode, setViewMode] = useState('mics'); // 'mics', 'stream', or 'mirror'
  const [streamSlots, setStreamSlots] = useState({});
  const [activeSlot, setActiveSlot] = useState(null); // Global active slot (set by owner)
  const [editingSlot, setEditingSlot] = useState(null);
  const [streamKey, setStreamKey] = useState(0); // Force iframe reload
  
  // Twitch HLS conversion state
  const [twitchHlsUrl, setTwitchHlsUrl] = useState(null);
  const [twitchHlsLoading, setTwitchHlsLoading] = useState(false);
  const [twitchHlsError, setTwitchHlsError] = useState(null);
  
  // YouTube direct URL state
  const [youtubeDirectUrl, setYoutubeDirectUrl] = useState(null);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState(null);
  const [youtubeInfo, setYoutubeInfo] = useState(null);
  
  // Watch Party Sync states
  const [watchPartySync, setWatchPartySync] = useState({
    currentTime: 0,
    isPlaying: false,
    lastSync: null
  });
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);
  const lastSyncTime = useRef(0);
  
  // Screen sharing states
  const [screenShares, setScreenShares] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [watchingScreenShare, setWatchingScreenShare] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' = front, 'environment' = back
  const [expandedVideo, setExpandedVideo] = useState(null); // For viewing video fullscreen
  const screenShareStream = useRef(null);
  const screenShareVideoRef = useRef(null);
  const streamPlayerRef = useRef(null); // Ref for ReactPlayer to control volume
  const [videoVolume, setVideoVolume] = useState(1); // Video volume state (0-1)
  const [isVideoMuted, setIsVideoMuted] = useState(false); // Video mute state
  const [micVolume, setMicVolume] = useState(100); // Microphones volume (0-100)
  const [isMicMuted, setIsMicMuted] = useState(false); // Mute all microphones
  
  // Room News states (for all rooms)
  const [roomNews, setRoomNews] = useState([]);
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);
  const [newNewsText, setNewNewsText] = useState('');
  const [newNewsCategory, setNewNewsCategory] = useState('عام');
  const [addingNews, setAddingNews] = useState(false);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [editingNews, setEditingNews] = useState(null); // {id, text, category}
  const [showEditNewsModal, setShowEditNewsModal] = useState(false);
  const [showNewsManageModal, setShowNewsManageModal] = useState(false); // Modal to list all news for edit/delete
  
  // Announcements state
  const [roomAnnouncements, setRoomAnnouncements] = useState([]);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStreamRef = useRef(null);
  
  // Playback features state (Reactions, Polls, Watch Party)
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [watchParty, setWatchParty] = useState(null);
  const [showWatchPartyModal, setShowWatchPartyModal] = useState(false);
  const [showUserRolesModal, setShowUserRolesModal] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const reactionIdRef = useRef(0);
  const reactionsPollingRef = useRef(null);
  const pollPollingRef = useRef(null);
  const watchPartyPollingRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const requestsPollInterval = useRef(null);
  const heartbeatInterval = useRef(null);
  const agoraClient = useRef(null);
  const agoraUid = useRef(null);
  const isMinimizingRef = useRef(false); // Track if we're minimizing
  const roomWsRef = useRef(null); // WebSocket for room messages
  const wsReconnectTimeoutRef = useRef(null);
  const roomInitializedRef = useRef(false); // Track if room has been initialized

  const token = localStorage.getItem('token');

  // Keyboard visibility detection for iOS
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const isKeyboard = window.visualViewport.height < window.innerHeight * 0.75;
        setKeyboardVisible(isKeyboard);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    // Check if user is authenticated
    if (!token) {
      toast.error('يرجى تسجيل الدخول أولاً');
      navigate('/');
      return;
    }
    
    // Reset minimizing flag
    isMinimizingRef.current = false;
    
    const initRoom = async () => {
      // Prevent double initialization from StrictMode
      if (roomInitializedRef.current) return;
      roomInitializedRef.current = true;
      
      // If returning from minimized state for SAME room, just maximize
      if (isMinimized && currentRoom && currentRoom.id === roomId && contextAgoraClient) {
        agoraClient.current = contextAgoraClient;
        maximizePlayer();
        fetchRoomData();
        startPolling();
        startHeartbeat();
        fetchStreamStatus();
        fetchCurrentUserRole();
        return;
      }
      
      // If there's a minimized room for DIFFERENT room, disconnect it first
      if (isMinimized && currentRoom && currentRoom.id !== roomId) {
        await globalDisconnect();
      }
      
      // Initialize fresh connection
      fetchCurrentUserRole();
      initializeAgora();
      joinRoom();
      fetchRoomData();
      startPolling();
      startHeartbeat();
      fetchStreamStatus();
      connectRoomWebSocket(); // Connect WebSocket for real-time messages
    };
    
    initRoom();

    // Poll stream status every 10 seconds
    const streamPoll = setInterval(fetchStreamStatus, 10000);
    
    // Poll room news every 8 seconds (for all rooms)
    const newsPoll = setInterval(() => fetchRoomNews(true), 8000);
    
    // Poll user roles every 15 seconds (to update if role changes)
    const rolesPoll = setInterval(fetchCurrentUserRole, 15000);

    return () => {
      // Reset initialization flag for next mount
      roomInitializedRef.current = false;
      
      // لا نمسح الرسائل عند cleanup لأن ذلك يمسح رسائل الهدايا
      // setMessages([]);
      
      // Disconnect WebSocket
      disconnectRoomWebSocket();
      
      // Only leave room and cleanup if we're NOT minimizing
      if (!isMinimizingRef.current) {
        leaveRoom();
        cleanupAgora();
      }
      
      stopPolling();
      stopHeartbeat();
      clearInterval(streamPoll);
      clearInterval(newsPoll);
      clearInterval(rolesPoll);
      
      // Stop recording if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        stopRecording();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Auto-convert Twitch URLs to HLS for direct playback
  useEffect(() => {
    const convertTwitchToHls = async () => {
      const url = room?.stream_url;
      if (!url || !url.includes('twitch.tv')) {
        setTwitchHlsUrl(null);
        setTwitchHlsError(null);
        return;
      }
      
      setTwitchHlsLoading(true);
      setTwitchHlsError(null);
      
      try {
        const response = await axios.get(`${API}/api/stream/twitch-hls`, {
          params: { url },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.hls_url) {
          setTwitchHlsUrl(response.data.hls_url);
          console.log('Twitch HLS URL obtained:', response.data.cached ? 'from cache' : 'fresh');
        }
      } catch (error) {
        console.error('Failed to convert Twitch to HLS:', error);
        setTwitchHlsError(error.response?.data?.detail || 'فشل في تحويل رابط Twitch');
        setTwitchHlsUrl(null);
      } finally {
        setTwitchHlsLoading(false);
      }
    };
    
    convertTwitchToHls();
    
    // Refresh HLS URL every 4 minutes (before 5 min cache expires)
    const refreshInterval = setInterval(convertTwitchToHls, 240000);
    
    return () => clearInterval(refreshInterval);
  }, [room?.stream_url, token]);

  // Auto-extract YouTube direct URL for in-app playback
  useEffect(() => {
    const extractYoutubeUrl = async () => {
      const url = room?.stream_url;
      if (!url) {
        setYoutubeDirectUrl(null);
        setYoutubeError(null);
        return;
      }
      
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      if (!isYouTube) {
        setYoutubeDirectUrl(null);
        setYoutubeError(null);
        return;
      }
      
      setYoutubeLoading(true);
      setYoutubeError(null);
      
      try {
        const response = await axios.get(`${API}/api/stream/youtube-direct`, {
          params: { url },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.direct_url) {
          setYoutubeDirectUrl(response.data.direct_url);
          setYoutubeInfo({
            title: response.data.title,
            duration: response.data.duration,
            thumbnail: response.data.thumbnail,
            isLive: response.data.is_live
          });
          console.log('YouTube direct URL obtained:', response.data.cached ? 'from cache' : 'fresh');
        }
      } catch (error) {
        console.error('Failed to extract YouTube URL:', error);
        setYoutubeError(error.response?.data?.detail || 'فشل في استخراج رابط الفيديو');
        setYoutubeDirectUrl(null);
      } finally {
        setYoutubeLoading(false);
      }
    };
    
    extractYoutubeUrl();
    
    // Refresh URL every 30 minutes (YouTube URLs last about 6 hours)
    const refreshInterval = setInterval(extractYoutubeUrl, 1800000);
    
    return () => clearInterval(refreshInterval);
  }, [room?.stream_url, token]);

  // Separate polling for seat requests (for staff: owner, leader, admin, mod) - FAST
  useEffect(() => {
    if (canApproveSeatRequests) {
      fetchSeatRequests();
      fetchMyInvites();
      requestsPollInterval.current = setInterval(() => {
        fetchSeatRequests();
        fetchMyInvites();
      }, 5000); // Poll every 5 seconds
    }
    return () => {
      if (requestsPollInterval.current) clearInterval(requestsPollInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApproveSeatRequests]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep remoteUsersRef in sync with remoteUsers state
  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

  // Audio mute/unmute control - applies ONLY to stream (ReactPlayer), NOT to Agora microphones
  useEffect(() => {
    // Apply to all audio elements (stream audio)
    document.querySelectorAll('audio').forEach(audio => {
      audio.muted = isAudioMuted;
    });
    
    // Apply to YouTube iframe
    const iframe = document.getElementById('youtube-player');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: isAudioMuted ? 'mute' : 'unMute',
          args: []
        }), '*');
      } catch (e) {}
    }
  }, [isAudioMuted]);

  // Control microphone volume separately - applies ONLY to Agora remote users
  useEffect(() => {
    remoteUsersRef.current.forEach(remoteUser => {
      if (remoteUser.audioTrack) {
        try {
          const effectiveVolume = isMicMuted ? 0 : micVolume;
          remoteUser.audioTrack.setVolume(effectiveVolume);
        } catch (e) {}
      }
    });
  }, [isMicMuted, micVolume]);

  // Playback features polling (Reactions, Polls, Watch Party)
  useEffect(() => {
    // Start polling for reactions
    const fetchReactions = async () => {
      try {
        const response = await axios.get(`${API}/api/rooms/${roomId}/reactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.reactions?.length > 0) {
          // Add new reactions with unique IDs for animation
          const newReactions = response.data.reactions.map(r => ({
            ...r,
            id: `${r.id}-${reactionIdRef.current++}`
          }));
          setFloatingReactions(prev => [...prev, ...newReactions]);
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            setFloatingReactions(prev => 
              prev.filter(r => !newReactions.some(nr => nr.id === r.id))
            );
          }, 3500);
        }
      } catch (error) {
        console.error('Error fetching reactions:', error);
      }
    };

    // Start polling for active poll
    const fetchActivePoll = async () => {
      try {
        const response = await axios.get(`${API}/api/rooms/${roomId}/polls/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActivePoll(response.data.poll);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error fetching poll:', error);
        }
        setActivePoll(null);
      }
    };

    // Start polling for watch party
    const fetchWatchParty = async () => {
      try {
        const response = await axios.get(`${API}/api/rooms/${roomId}/watch-party`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWatchParty(response.data.watch_party);
      } catch (error) {
        // 404 is expected when no watch party exists
        setWatchParty(null);
      }
    };

    // Initial fetch
    fetchReactions();
    fetchActivePoll();
    fetchWatchParty();

    // Set up polling intervals
    reactionsPollingRef.current = setInterval(fetchReactions, 5000);
    pollPollingRef.current = setInterval(fetchActivePoll, 8000);
    watchPartyPollingRef.current = setInterval(fetchWatchParty, 10000);

    return () => {
      if (reactionsPollingRef.current) clearInterval(reactionsPollingRef.current);
      if (pollPollingRef.current) clearInterval(pollPollingRef.current);
      if (watchPartyPollingRef.current) clearInterval(watchPartyPollingRef.current);
    };
  }, [roomId, token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Track if initialization is in progress
  const isInitializingRef = useRef(false);
  
  const initializeAgora = async () => {
    // Prevent double initialization
    if (isInitializingRef.current) {
      return;
    }
    isInitializingRef.current = true;
    
    try {
      // Clean up any existing local connection first
      if (agoraClient.current) {
        try {
          // Check if client is in a state that needs leaving
          const state = agoraClient.current.connectionState;
          if (state === 'CONNECTED' || state === 'CONNECTING') {
            await agoraClient.current.leave();
          }
        } catch (e) {
          // Ignore leave errors
        }
        agoraClient.current = null;
      }
      
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      agoraClient.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      
      agoraClient.current.on('user-published', async (remoteUser, mediaType) => {
        try {
          await agoraClient.current.subscribe(remoteUser, mediaType);
          if (mediaType === 'audio') {
            // Apply saved volume level before playing
            const savedVolume = localStorage.getItem('koora_speakers_volume');
            const volumeLevel = savedVolume ? parseInt(savedVolume) : 100;
            console.log(`New audio user ${remoteUser.uid} - applying volume ${volumeLevel}%`);
            remoteUser.audioTrack?.setVolume(volumeLevel);
            remoteUser.audioTrack?.play();
            setRemoteUsers(prev => {
              const exists = prev.find(u => u.uid === remoteUser.uid);
              if (!exists) {
                const newList = [...prev, remoteUser];
                // Also update ref immediately
                remoteUsersRef.current = newList;
                return newList;
              }
              return prev;
            });
          }
          if (mediaType === 'video') {
            // Add user to remote video users list
            setRemoteVideoUsers(prev => {
              const exists = prev.find(u => u.uid === remoteUser.uid);
              if (!exists) return [...prev, remoteUser];
              return prev.map(u => u.uid === remoteUser.uid ? remoteUser : u);
            });
          }
        } catch (err) {
          console.error('Error subscribing:', err);
        }
      });

      agoraClient.current.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'audio') {
          setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
        }
        if (mediaType === 'video') {
          setRemoteVideoUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
        }
      });

      agoraClient.current.on('user-left', (remoteUser) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
        setRemoteVideoUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
      });

      const generatedUid = Math.floor(Math.random() * 1000000);
      agoraUid.current = generatedUid;

      const tokenResponse = await axios.post(
        `${API}/api/agora/token`,
        { channel_name: roomId, uid: generatedUid },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Double-check client state before joining
      if (!agoraClient.current) {
        return;
      }
      
      const clientState = agoraClient.current.connectionState;
      if (clientState === 'CONNECTED' || clientState === 'CONNECTING') {
        // Already connected or connecting, skip join
        return;
      }

      await agoraClient.current.join(
        AGORA_APP_ID,
        roomId,
        tokenResponse.data.token,
        generatedUid
      );
      
      // Send agora_uid to backend for video matching
      try {
        await axios.put(
          `${API}/api/rooms/${roomId}/agora-uid`,
          { agora_uid: generatedUid },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error('Failed to update agora_uid:', err);
      }
    } catch (error) {
      console.error('Agora error:', error);
    } finally {
      isInitializingRef.current = false;
    }
  };

  const cleanupAgora = async () => {
    isInitializingRef.current = false; // Reset initialization flag
    try {
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      if (agoraClient.current) {
        await agoraClient.current.leave();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  const startPolling = () => {
    // Main polling for essential data - FAST polling
    pollInterval.current = setInterval(async () => {
      // Batch fetch essential data
      try {
        const [roomRes, seatsRes, messagesRes, participantsRes, myRequestRes] = await Promise.all([
          axios.get(`${API}/api/rooms/${roomId}`),
          axios.get(`${API}/api/rooms/${roomId}/seats`),
          axios.get(`${API}/api/rooms/${roomId}/messages`),
          axios.get(`${API}/api/rooms/${roomId}/participants`),
          axios.get(`${API}/api/rooms/${roomId}/seat/my-request`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        // Check if room was closed - kick user if not system owner
        const roomData = roomRes.data;
        if (roomData.is_closed && user.role !== 'owner') {
          toast.error('تم إغلاق الغرفة');
          stopPolling();
          stopHeartbeat();
          await cleanupAgora();
          navigate('/dashboard');
          return;
        }
        
        setRoom(roomData);
        
        // Update chat background if changed
        if (roomData.chat_background !== undefined) {
          setChatBackground(prev => {
            if (prev !== roomData.chat_background) {
              return roomData.chat_background || '';
            }
            return prev;
          });
        }
        
        // Update seats - only if changed
        const newSeats = seatsRes.data.seats;
        setSeats(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newSeats)) {
            return newSeats;
          }
          return prev;
        });
        
        // Update messages - only if changed
        const filteredMessages = messagesRes.data.filter(msg => 
          !msg.content?.toLowerCase().includes('test message') &&
          !msg.content?.toLowerCase().includes('voice test') &&
          !msg.username?.toLowerCase().includes('test_user')
        );
        setMessages(prev => {
          if (prev.length !== filteredMessages.length) {
            return filteredMessages;
          }
          return prev;
        });
        
        // Update participants - only if changed
        const newParticipants = participantsRes.data;
        setParticipants(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newParticipants)) {
            // Check for new members and show notification
            const prevIds = prev.map(p => p.user_id);
            const newMembers = newParticipants.filter(p => !prevIds.includes(p.user_id));
            newMembers.forEach(member => {
              if (member.user_id !== user.id) {
                toast.success(`انضم ${member.username} للغرفة 👋`, { duration: 3000 });
              }
            });
            return newParticipants;
          }
          return prev;
        });
        
        // Check if current user got approved (is on stage now)
        const myParticipant = newParticipants.find(p => p.user_id === user.id);
        if (myParticipant && myParticipant.seat_number !== null) {
          setOnStage(true);
          setPendingRequest(false); // Clear pending when approved
        } else {
          // Check request status from API
          const requestStatus = myRequestRes.data;
          if (requestStatus.status === 'approved' || requestStatus.status === 'rejected' || !requestStatus.has_pending) {
            setPendingRequest(false);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
      
      // Fetch screen shares if in mirror mode
      if (viewMode === 'mirror') {
        try {
          const sharesRes = await axios.get(`${API}/api/rooms/${roomId}/screen-shares`);
          setScreenShares(prev => {
            const serverShares = sharesRes.data.screen_shares || [];
            // Keep local streams, merge with server data
            const merged = serverShares.map(s => {
              const local = prev.find(p => p.user_id === s.user_id);
              return local?.stream ? { ...s, stream: local.stream } : s;
            });
            return merged;
          });
        } catch (e) {
          console.error('Screen shares fetch error:', e);
        }
      }
    }, 5000); // Poll every 5 seconds
  };

  const stopPolling = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    if (requestsPollInterval.current) clearInterval(requestsPollInterval.current);
  };

  const startHeartbeat = () => {
    // Send heartbeat every 10 seconds to keep connection alive
    const sendHeartbeat = async () => {
      try {
        await axios.post(`${API}/api/rooms/${roomId}/heartbeat`, {}, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };
    
    sendHeartbeat(); // Send immediately
    heartbeatInterval.current = setInterval(sendHeartbeat, 15000);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
  };

  const fetchCurrentUserRole = async () => {
    try {
      // Fetch global role
      const response = await axios.get(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.role) {
        setCurrentUserRole(response.data.role);
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.role = response.data.role;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }
      
      // Fetch room-specific role (supports multiple roles)
      const roomRoleRes = await axios.get(`${API}/api/rooms/${roomId}/user-role/${user.id}`);
      if (roomRoleRes.data) {
        setRoomRole(roomRoleRes.data.role || 'member');
        setRoomRoles(roomRoleRes.data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      setCurrentUserRole(user.role || 'user');
      setRoomRole('member');
      setRoomRoles([]);
    } finally {
      setRoleLoading(false);
    }
  };

  const fetchRoomData = async (retryCount = 0) => {
    try {
      // Fetch main room data first
      const roomRes = await axios.get(`${API}/api/rooms/${roomId}`);
      const roomData = roomRes.data;
      setRoom(roomData);
      
      // Set chat background if exists
      if (roomData.chat_background) {
        setChatBackground(roomData.chat_background);
      }
      
      // Check if room was closed and user should be kicked (only system owner stays)
      if (roomData.is_closed && user.role !== 'owner') {
        toast.error('تم إغلاق الغرفة');
        await cleanupAgora();
        navigate('/dashboard');
        return;
      }
      
      // Fetch other data in parallel with error handling for each
      const [seatsRes, messagesRes, participantsRes] = await Promise.all([
        axios.get(`${API}/api/rooms/${roomId}/seats`).catch(() => ({ data: { seats: [] } })),
        axios.get(`${API}/api/rooms/${roomId}/messages`).catch(() => ({ data: [] })),
        axios.get(`${API}/api/rooms/${roomId}/participants`).catch(() => ({ data: [] }))
      ]);
      
      // Fetch members separately with token (optional, won't fail room load)
      try {
        const membersRes = await axios.get(`${API}/api/rooms/${roomId}/members`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (membersRes.data?.members) {
          setRoomMembers(membersRes.data.members);
        }
      } catch (err) {
        // Members fetch is optional
      }
      
      setSeats(seatsRes.data.seats || []);
      
      const filteredMessages = (messagesRes.data || []).filter(msg => 
        !msg.content?.toLowerCase().includes('test message') &&
        !msg.content?.toLowerCase().includes('voice test') &&
        !msg.username?.toLowerCase().includes('test_user')
      );
      setMessages(filteredMessages);
      setParticipants(participantsRes.data || []);
      
      // Check if current user is on stage
      const myParticipant = (participantsRes.data || []).find(p => p.user_id === user.id);
      if (myParticipant && myParticipant.seat_number !== null) {
        setOnStage(true);
        setPendingRequest(false); // Clear pending if approved
      } else {
        setOnStage(false);
      }
      
      // Fetch room news for all rooms
      try {
        const newsRes = await axios.get(`${API}/api/rooms/${roomId}/news`);
        setRoomNews(newsRes.data.news || []);
      } catch (err) {
        // News fetch is optional
      }
      
      // Fetch announcements for this room
      fetchRoomAnnouncements();
      
      setLoading(false);
    } catch (error) {
      console.error('Room load error:', error);
      setLoading(false);
      // Retry up to 2 times with delay
      if (retryCount < 2) {
        setLoading(true);
        setTimeout(() => fetchRoomData(retryCount + 1), 1000);
        return;
      }
      toast.error('فشل تحميل بيانات الغرفة');
      navigate('/dashboard');
    }
  };

  const fetchSeats = async () => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/seats`);
      const newSeats = response.data.seats;
      if (JSON.stringify(newSeats) !== JSON.stringify(seats)) {
        setSeats(newSeats);
      }
    } catch (error) {
      console.error('Failed to fetch seats');
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/messages`);
      const filteredMessages = response.data.filter(msg => 
        !msg.content?.toLowerCase().includes('test message') &&
        !msg.content?.toLowerCase().includes('voice test') &&
        !msg.username?.toLowerCase().includes('test_user')
      );
      if (filteredMessages.length !== messages.length) {
        setMessages(filteredMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages');
    }
  };

  // WebSocket connection for real-time room messages
  const connectRoomWebSocket = () => {
    if (!token || roomWsRef.current) return;
    
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/ws/${token}`);
    
    ws.onopen = () => {
      
      // Join the room channel
      ws.send(JSON.stringify({ type: 'join_room', room_id: roomId }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'room_message' && data.room_id === roomId) {
        // Add new message to state
        setMessages(prev => [...prev, data.message]);
        // Auto-scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      
      // Handle message deletion broadcast
      if (data.type === 'message_deleted' && data.room_id === roomId) {
        setMessages(prev => prev.filter(m => m.id !== data.message_id));
      }
      
      // Handle Watch Party sync from host
      if (data.type === 'watch_party_sync') {
        console.log('Watch Party Sync received:', data);
        if (isSyncEnabled && streamPlayerRef.current) {
          setWatchPartySync({
            currentTime: data.current_time,
            isPlaying: data.is_playing,
            lastSync: Date.now()
          });
          // Seek to synced time if difference is more than 2 seconds
          const currentTime = streamPlayerRef.current.getCurrentTime?.() || 0;
          if (Math.abs(currentTime - data.current_time) > 2) {
            streamPlayerRef.current.seekTo?.(data.current_time, 'seconds');
          }
        }
      }
    };
    
    ws.onclose = () => {
      
      roomWsRef.current = null;
      // Attempt to reconnect after 3 seconds
      wsReconnectTimeoutRef.current = setTimeout(() => {
        if (!isMinimizingRef.current) {
          connectRoomWebSocket();
        }
      }, 3000);
    };
    
    ws.onerror = () => {
      // Silent error - will auto-reconnect
    };
    
    roomWsRef.current = ws;
  };

  const disconnectRoomWebSocket = () => {
    if (wsReconnectTimeoutRef.current) {
      clearTimeout(wsReconnectTimeoutRef.current);
    }
    if (roomWsRef.current) {
      // Leave the room before closing
      if (roomWsRef.current.readyState === WebSocket.OPEN) {
        roomWsRef.current.send(JSON.stringify({ type: 'leave_room', room_id: roomId }));
      }
      roomWsRef.current.close();
      roomWsRef.current = null;
    }
  };

  const sendMessageViaWebSocket = (content, replyData = null) => {
    if (roomWsRef.current && roomWsRef.current.readyState === WebSocket.OPEN) {
      roomWsRef.current.send(JSON.stringify({
        type: 'room_message',
        room_id: roomId,
        content: content,
        ...(replyData || {})
      }));
      return true;
    }
    return false;
  };

  const fetchParticipants = async () => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/participants`);
      if (response.data.length !== participants.length) {
        setParticipants(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch participants');
    }
  };

  // Update local video when camera stream changes
  useEffect(() => {
    if (localVideoRef.current && localCameraStream.current) {
      localVideoRef.current.srcObject = localCameraStream.current;
    }
  }, [isCameraOn, cameraFacing]);

  const fetchSeatRequests = async () => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/seat/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeatRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to fetch seat requests');
    }
  };

  const checkMyRequestStatus = async () => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/seat/my-request`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // If request was approved or rejected, clear pending state
      if (response.data.status === 'approved' || response.data.status === 'rejected') {
        setPendingRequest(false);
      } else if (response.data.has_pending) {
        setPendingRequest(true);
      }
    } catch (error) {
      console.error('Failed to check request status');
    }
  };

  const fetchMyInvites = async () => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/seat/invites/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const invites = response.data.invites;
      setMyInvites(invites);
      if (invites.length > 0 && !showInviteModal) setShowInviteModal(true);
    } catch (error) {
      console.error('Failed to fetch invites');
    }
  };

  const joinRoom = async () => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.error('Failed to join room');
    }
  };

  const leaveRoom = async () => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
      // Clear local messages when leaving (ephemeral chat like Snapchat)
      setMessages([]);
    } catch (error) {
      console.error('Failed to leave room');
    }
  };

  // Leave room completely (disconnect audio)
  const handleFullLeave = async () => {
    // Clear messages first (ephemeral chat)
    setMessages([]);
    await leaveRoom();
    await cleanupAgora();
    await globalDisconnect();
    navigate('/dashboard');
  };

  // Minimize - keep audio playing in background
  const handleMinimize = async () => {
    
    if (room && agoraClient.current) {
      // Mark that we're minimizing so cleanup doesn't disconnect audio
      isMinimizingRef.current = true;
      
      
      // Store room info in global context with agora client
      setCurrentRoom({ 
        id: roomId, 
        title: room.title,
        agoraClient: agoraClient.current,
        remoteUsers: remoteUsers
      });
      
      
      minimizePlayer();
      
      // Don't cleanup agora - keep audio playing
      // Just stop polling
      stopPolling();
      stopHeartbeat();
      
      
      // Use setTimeout to ensure isMinimizingRef is set before cleanup runs
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    }
  };

  const handleTakeSeat = async () => {
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/seat/request`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setPendingRequest(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الطلب');
    }
  };

  const handleJoinStageDirect = async () => {
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/seat/join-direct`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setOnStage(true);
      fetchSeats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الصعود للمنصة');
    }
  };

  const handleApproveSeat = async (userId) => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/seat/approve/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تمت الموافقة على الطلب');
      // Immediately refresh all data
      await Promise.all([fetchSeats(), fetchSeatRequests(), fetchParticipants()]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشلت الموافقة');
    }
  };

  const handleRejectSeat = async (userId) => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/seat/reject/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.info('تم رفض الطلب');
      fetchSeatRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الرفض');
    }
  };

  const handleKickUser = async (userId) => {
    if (!window.confirm(t('confirmKick'))) return;
    try {
      await axios.post(`${API}/api/rooms/${roomId}/kick/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(t('memberKicked'));
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('kickFailed'));
    }
  };

  // Change user's room-specific role
  const handleChangeRoomRole = async (userId, newRole, username) => {
    try {
      const response = await axios.put(
        `${API}/api/rooms/${roomId}/user-role/${userId}`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message || t('success'));
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('roleChangeFailed'));
    }
  };

  // Toggle news_reporter role (add or remove)
  const handleToggleNewsReporter = async (userId, username, isAdding) => {
    try {
      const endpoint = isAdding 
        ? `${API}/api/rooms/${roomId}/roles/${userId}/add`
        : `${API}/api/rooms/${roomId}/roles/${userId}/remove`;
      
      const response = await axios.post(
        endpoint,
        { role: 'news_reporter' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      fetchParticipants();
      // Refresh room members to get updated roles
      try {
        const membersRes = await axios.get(`${API}/api/rooms/${roomId}/members`, { headers: { Authorization: `Bearer ${token}` } });
        setRoomMembers(membersRes.data.members || []);
      } catch {}
    } catch (error) {
      toast.error(error.response?.data?.detail || t('newsRoleFailed'));
    }
  };

  // Get user's room role for display
  const getUserRoomRole = async (userId) => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/user-role/${userId}`);
      return response.data.role || 'member';
    } catch {
      return 'member';
    }
  };

  const handleMuteUser = async (userId) => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/mute/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(t('memberMuted'));
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('muteFailed'));
    }
  };

  const handleUnmuteUser = async (userId) => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/unmute/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(t('memberUnmuted'));
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('unmuteFailed'));
    }
  };

  const handleInviteUser = async (userId, username) => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/seat/invite/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(t('inviteSent'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('inviteFailed'));
    }
  };

  const handleRemoveFromStage = async (userId) => {
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/remove-from-stage/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('demoteFailed'));
    }
  };

  const handleToggleRoom = async () => {
    try {
      const response = await axios.post(`${API}/api/admin/rooms/${roomId}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      
      // Show PIN if room is closed
      if (response.data.is_closed && response.data.pin) {
        toast.success(
          <div className="text-center">
            <p className="font-bold mb-2">{response.data.message}</p>
            <p className="text-lg">الرمز السري:</p>
            <p className="text-3xl font-bold text-lime-400 my-2">{response.data.pin}</p>
            <p className="text-xs text-slate-400">احتفظ بهذا الرمز للدخول</p>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.success(response.data.message);
      }
      
      fetchRoomData();
      setShowRoomSettings(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('statusChangeFailed'));
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm(t('confirmDeleteRoom'))) return;
    try {
      await axios.delete(`${API}/api/admin/rooms/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(t('roomDeleted'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('deleteRoomFailed'));
    }
  };

  const handleCloseAndKickAll = async () => {
    if (!window.confirm(t('confirmCloseRoom'))) return;
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/close-and-kick`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('closeRoomFailed'));
    }
  };

  const handleUpdateRoomImage = async () => {
    if (!roomImageUrl.trim()) {
      toast.error('أدخل رابط الصورة');
      return;
    }
    try {
      await axios.put(`${API}/api/rooms/${roomId}/image`, 
        { image: roomImageUrl }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم تحديث صورة الغرفة');
      setRoom(prev => ({ ...prev, image: roomImageUrl }));
      setShowImagePicker(false);
      setRoomImageUrl('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل تحديث الصورة');
    }
  };

  const handleUpdateRoomTitle = async (titleParam) => {
    const title = titleParam || newRoomTitle;
    if (!title.trim()) {
      toast.error('أدخل اسم الغرفة');
      return;
    }
    if (title.trim().length > 100) {
      toast.error('اسم الغرفة طويل جداً (الحد الأقصى 100 حرف)');
      return;
    }
    setUpdatingTitle(true);
    try {
      await axios.put(`${API}/api/rooms/${roomId}/title`, 
        { title: title.trim() }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم تحديث اسم الغرفة');
      setRoom(prev => ({ ...prev, title: title.trim() }));
      setShowTitleEditor(false);
      setNewRoomTitle('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل تحديث اسم الغرفة');
    } finally {
      setUpdatingTitle(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. استخدم JPG, PNG, GIF أو WebP');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 5MB');
      return;
    }

    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(`${API}/api/upload/image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = uploadResponse.data.url;
      
      // Update room image
      await axios.put(`${API}/api/rooms/${roomId}/image`, 
        { image: imageUrl }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('تم تحديث صورة الغرفة');
      // Add timestamp to bypass cache
      const cachedUrl = `${imageUrl}?t=${Date.now()}`;
      setRoom(prev => ({ ...prev, image: cachedUrl }));
      setShowImagePicker(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle chat background upload
  const handleBackgroundUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. استخدم JPG, PNG, GIF أو WebP');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 5MB');
      return;
    }

    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post(`${API}/api/upload/image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = uploadResponse.data.url;
      
      // Update room chat background
      await axios.put(`${API}/api/rooms/${roomId}/chat-background`, 
        { background_url: imageUrl }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('تم تحديث خلفية الدردشة');
      // Add timestamp to bypass cache
      const cachedUrl = `${imageUrl}?t=${Date.now()}`;
      setChatBackground(cachedUrl);
      setShowBackgroundPicker(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل رفع الخلفية');
    } finally {
      setUploadingImage(false);
      if (backgroundInputRef.current) {
        backgroundInputRef.current.value = '';
      }
    }
  };

  // Remove chat background
  const removeBackground = async () => {
    try {
      await axios.put(`${API}/api/rooms/${roomId}/chat-background`, 
        { background_url: '' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم إزالة الخلفية');
      setChatBackground('');
      setShowBackgroundPicker(false);
    } catch (error) {
      toast.error('فشل إزالة الخلفية');
    }
  };

  // Set background from URL
  const handleBackgroundUrl = async (url) => {
    try {
      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        toast.error('الرابط غير صحيح');
        return;
      }
      
      // Update room chat background with URL directly
      await axios.put(`${API}/api/rooms/${roomId}/chat-background`, 
        { background_url: url }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('تم تحديث خلفية الدردشة');
      // Add timestamp to bypass cache
      const cachedUrl = `${url}?t=${Date.now()}`;
      setChatBackground(cachedUrl);
      setShowBackgroundPicker(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل تحديث الخلفية');
    }
  };

  // Play breaking news alert sound
  const playBreakingNewsSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create oscillator for alert sound (two-tone beep)
      const playTone = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Play urgent two-tone alert (like news alert)
      const now = audioContext.currentTime;
      playTone(880, now, 0.15);        // High A
      playTone(660, now + 0.15, 0.15); // E
      playTone(880, now + 0.3, 0.15);  // High A
      playTone(660, now + 0.45, 0.2);  // E (longer)
      
    } catch (error) {
      
    }
  };

  // Fetch Room News (for all rooms) with new news detection
  const fetchRoomNews = async (showNewNewsToast = false) => {
    if (!room) return;
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/news`);
      const newNews = response.data.news || [];
      
      // Check for new news items (compare with current news)
      if (showNewNewsToast && roomNews.length > 0 && newNews.length > roomNews.length) {
        const latestNews = newNews[0]; // Newest is first
        if (latestNews && latestNews.author_id !== user.id) {
          // Check if it's breaking news (عاجل)
          const isBreakingNews = latestNews.category === 'عاجل';
          
          // Play sound for breaking news
          if (isBreakingNews) {
            playBreakingNewsSound();
          }
          
          // Show toast for new news from others
          toast[isBreakingNews ? 'error' : 'info'](
            `${isBreakingNews ? '🚨 عاجل' : '📰 خبر جديد'}: ${latestNews.text?.substring(0, 50)}${latestNews.text?.length > 50 ? '...' : ''}`,
            { duration: isBreakingNews ? 8000 : 5000 }
          );
        }
      }
      
      setRoomNews(newNews);
    } catch (error) {
      console.error('Failed to fetch room news');
    }
  };

  // Fetch Room Announcements
  const fetchRoomAnnouncements = async () => {
    try {
      const response = await axios.get(`${API}/api/announcements/room/${roomId}`);
      setRoomAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements');
    }
  };

  // Add Room News
  const handleAddRoomNews = async () => {
    if (!newNewsText.trim()) {
      toast.error('أدخل نص الخبر');
      return;
    }
    setAddingNews(true);
    try {
      await axios.post(`${API}/api/rooms/${roomId}/news`, 
        { text: newNewsText, category: newNewsCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم إضافة الخبر');
      setNewNewsText('');
      setNewNewsCategory('عام');
      setShowAddNewsModal(false);
      fetchRoomNews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إضافة الخبر');
    } finally {
      setAddingNews(false);
    }
  };

  // Delete Room News
  const handleDeleteRoomNews = async (newsId) => {
    try {
      await axios.delete(`${API}/api/rooms/${roomId}/news/${newsId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم حذف الخبر');
      fetchRoomNews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل حذف الخبر');
    }
  };

  // Edit Room News
  const handleEditRoomNews = async () => {
    if (!editingNews || !editingNews.text?.trim()) {
      toast.error('أدخل نص الخبر');
      return;
    }
    setAddingNews(true);
    try {
      await axios.put(`${API}/api/rooms/${roomId}/news/${editingNews.id}`, 
        { text: editingNews.text, category: editingNews.category },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم تعديل الخبر');
      setEditingNews(null);
      setShowEditNewsModal(false);
      fetchRoomNews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل تعديل الخبر');
    } finally {
      setAddingNews(false);
    }
  };

  // Open edit modal for specific news
  const openEditNews = (news) => {
    setEditingNews({ id: news.id, text: news.text, category: news.category });
    setShowEditNewsModal(true);
  };

  // Check if user can add room news (owner, system owner, or news_reporter)
  const canAddRoomNews = isOwner || isRoomNewsReporter;

  // Stream functions
  const fetchStreamStatus = async () => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/stream`);
      setStreamActive(response.data.stream_active);
      setStreamUrl(response.data.stream_url || '');
      setStreamSlots(response.data.stream_slots || {});
      setActiveSlot(response.data.active_slot);
    } catch (error) {
      console.error('Failed to fetch stream status');
    }
  };

  const handleSaveSlot = async (slot) => {
    if (!streamInputUrl.trim()) {
      toast.error('أدخل رابط البث');
      return;
    }
    try {
      const newSlots = { ...streamSlots, [slot]: streamInputUrl };
      await axios.post(`${API}/api/rooms/${roomId}/stream/slots`, 
        { slots: newSlots }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم حفظ الرابط');
      setStreamSlots(newSlots);
      setStreamInputUrl('');
      setEditingSlot(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل حفظ الرابط');
    }
  };

  // Convert URL to embed format - with controls for sound
  const convertToEmbedUrl = (url) => {
    if (!url) return '';
    
    // YouTube Channel - live stream
    if (url.includes('youtube.com/@') || url.includes('youtube.com/channel/') || url.includes('youtube.com/c/')) {
      let channelId = '';
      if (url.includes('youtube.com/@')) {
        // Handle @username format - need to use the username
        const username = url.split('@')[1]?.split('/')[0]?.split('?')[0] || '';
        if (username) {
          // For @username, we use the channel's live stream URL
          return `https://www.youtube-nocookie.com/embed/live_stream?channel=${username}&autoplay=1&mute=1&modestbranding=1&rel=0&vq=hd1080&playsinline=1`;
        }
      } else if (url.includes('youtube.com/channel/')) {
        channelId = url.split('/channel/')[1]?.split('/')[0]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/c/')) {
        channelId = url.split('/c/')[1]?.split('/')[0]?.split('?')[0] || '';
      }
      if (channelId) {
        return `https://www.youtube-nocookie.com/embed/live_stream?channel=${channelId}&autoplay=1&mute=1&modestbranding=1&rel=0&vq=hd1080&playsinline=1`;
      }
    }
    
    // YouTube Video - regular video or live
    if (url.includes('youtube.com/watch') || url.includes('youtu.be') || url.includes('youtube.com/live')) {
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        videoId = url.split('v=')[1]?.split('&')[0] || '';
      } else if (url.includes('youtube.com/live')) {
        videoId = url.split('/live/')[1]?.split('?')[0] || '';
      } else {
        videoId = url.split('/').pop()?.split('?')[0] || '';
      }
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&modestbranding=1&rel=0&vq=hd1080&playsinline=1`;
      }
    }
    
    // Twitch
    if (url.includes('twitch.tv')) {
      const channel = url.split('twitch.tv/')[1]?.split('/')[0] || '';
      if (channel) {
        return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=true&muted=true`;
      }
    }
    
    // Dailymotion
    if (url.includes('dailymotion.com')) {
      let videoId = '';
      if (url.includes('/video/')) {
        videoId = url.split('/video/')[1]?.split('?')[0] || '';
      } else if (url.includes('/live/')) {
        videoId = url.split('/live/')[1]?.split('?')[0] || '';
      }
      if (videoId) {
        return `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=1&quality=1080`;
      }
    }
    
    // Facebook
    if (url.includes('facebook.com') && url.includes('/videos/')) {
      return `https://www.facebook.com/plugins/video.php?href=${url}&autoplay=true&mute=1`;
    }
    
    return url;
  };

  // TV Receiver Style - Instant channel switch
  const handlePlaySlot = async (slot) => {
    const rawUrl = streamSlots[slot];
    if (!rawUrl) return;
    
    setStreamKey(Date.now());
    setActiveSlot(slot);
    setStreamUrl(rawUrl);
    setStreamActive(true);
    setViewMode('stream');
    
    // Update room state with ORIGINAL URL (not embed) for proper detection
    setRoom(prev => ({ ...prev, stream_url: rawUrl }));
    
    // Sync to server
    try {
      await axios.post(`${API}/api/rooms/${roomId}/stream/play/${slot}`, {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      // Still works locally even if server sync fails
    }
  };

  const handleStartStream = async () => {
    if (!streamInputUrl.trim()) {
      toast.error('أدخل رابط البث');
      return;
    }
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/stream/start`, 
        { url: streamInputUrl, slot: editingSlot || 1 }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setStreamActive(true);
      setStreamUrl(response.data.stream_url);
      setShowStreamModal(false);
      setStreamInputUrl('');
      setEditingSlot(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل بدء البث');
    }
  };

  const handleStopStream = async () => {
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/stream/stop`, {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setStreamActive(false);
      setStreamUrl('');
      setActiveSlot(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إيقاف البث');
    }
  };

  // Camera sharing is supported on all devices
  const isCameraSupported = typeof navigator !== 'undefined' && 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getUserMedia === 'function';

  // Screen sharing is supported on desktop only
  const isScreenShareSupported = typeof navigator !== 'undefined' && 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getDisplayMedia === 'function';

  // Camera Sharing Functions
  const fetchScreenShares = async () => {
    try {
      const response = await axios.get(`${API}/api/rooms/${roomId}/screen-shares`);
      setScreenShares(response.data.screen_shares || []);
    } catch (error) {
      console.error('Failed to fetch screen shares');
    }
  };

  const startScreenShare = async (facing = cameraFacing) => {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      screenShareStream.current = stream;
      setIsScreenSharing(true);
      setCameraFacing(facing);
      
      // Generate a simple peer ID
      const peerId = `${user.id}-${Date.now()}`;
      
      // Register with server
      await axios.post(`${API}/api/rooms/${roomId}/screen-share/start`, 
        { peer_id: peerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Store stream locally for others to view
      const newShare = {
        user_id: user.id,
        username: user.username,
        avatar: user.avatar,
        peer_id: peerId,
        stream: stream
      };
      
      setScreenShares(prev => {
        const filtered = prev.filter(s => s.user_id !== user.id);
        return [...filtered, newShare];
      });
      setWatchingScreenShare(newShare);
      
      // Handle when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      toast.success('تم تشغيل الكاميرا');
    } catch (error) {
      console.error('Camera error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('تم رفض إذن الكاميرا');
      } else {
        toast.error('فشل تشغيل الكاميرا');
      }
    }
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    
    // Stop current stream
    if (screenShareStream.current) {
      screenShareStream.current.getTracks().forEach(track => track.stop());
    }
    
    // Start with new camera
    await startScreenShare(newFacing);
  };

  // Start screen sharing (desktop only)
  const startScreenMirror = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: true
      });
      
      screenShareStream.current = stream;
      setIsScreenSharing(true);
      
      const peerId = `${user.id}-${Date.now()}`;
      
      await axios.post(`${API}/api/rooms/${roomId}/screen-share/start`, 
        { peer_id: peerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newShare = {
        user_id: user.id,
        username: user.username,
        avatar: user.avatar,
        peer_id: peerId,
        stream: stream,
        type: 'screen'
      };
      
      setScreenShares(prev => {
        const filtered = prev.filter(s => s.user_id !== user.id);
        return [...filtered, newShare];
      });
      setWatchingScreenShare(newShare);
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      toast.success('تم بدء انعكاس الشاشة');
    } catch (error) {
      console.error('Screen share error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('تم رفض إذن مشاركة الشاشة');
      } else {
        toast.error('فشل بدء انعكاس الشاشة');
      }
    }
  };

  const stopScreenShare = async () => {
    try {
      if (screenShareStream.current) {
        screenShareStream.current.getTracks().forEach(track => track.stop());
        screenShareStream.current = null;
      }
      
      setIsScreenSharing(false);
      setScreenShares(prev => prev.filter(s => s.user_id !== user.id));
      
      if (watchingScreenShare?.user_id === user.id) {
        setWatchingScreenShare(null);
      }
      
      await axios.post(`${API}/api/rooms/${roomId}/screen-share/stop`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('تم إيقاف الكاميرا');
    } catch (error) {
      console.error('Stop screen share error:', error);
    }
  };

  const watchScreenShare = (share) => {
    setWatchingScreenShare(share);
  };


  const handleAcceptInvite = async (inviteId) => {
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/seat/invites/${inviteId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setOnStage(true);
      setShowInviteModal(false);
      fetchSeats();
      fetchMyInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل قبول الدعوة');
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/seat/invites/${inviteId}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.info(t('declineInvite'));
      setShowInviteModal(false);
      fetchMyInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    }
  };

  const handlePromoteUser = async (userId, newRole) => {
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/promote/${userId}`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setShowPromoteModal(false);
      setSelectedPromoteUser(null);
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشلت الترقية');
    }
  };

  const handleLeaveSeat = async () => {
    try {
      if (isMicOn) await toggleMic();
      // Stop camera if on
      if (isCameraOn && localVideoTrack) {
        await agoraClient.current.unpublish([localVideoTrack]);
        localVideoTrack.stop();
        localVideoTrack.close();
        setLocalVideoTrack(null);
        setIsCameraOn(false);
      }
      const response = await axios.post(`${API}/api/rooms/${roomId}/seat/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setOnStage(false);
      fetchSeats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل النزول من المنصة');
    }
  };

  const toggleMic = async () => {
    if (!onStage) {
      toast.error('يجب أن تكون على المنصة للتحدث');
      return;
    }
    try {
      if (!isMicOn) {
        toast.info('جاري طلب إذن الميكروفون...');
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'music_standard' });
        setLocalAudioTrack(audioTrack);
        await agoraClient.current.publish([audioTrack]);
        setIsMicOn(true);
        toast.success('تم تشغيل الميكروفون');
      } else {
        if (localAudioTrack) {
          await agoraClient.current.unpublish([localAudioTrack]);
          localAudioTrack.stop();
          localAudioTrack.close();
          setLocalAudioTrack(null);
        }
        setIsMicOn(false);
        toast.info('تم كتم الميكروفون');
      }
    } catch (error) {
      console.error('Error toggling mic:', error);
      let errorMessage = 'فشل تشغيل الميكروفون';
      if (error.code === 'PERMISSION_DENIED' || error.name === 'NotAllowedError') {
        errorMessage = 'تم رفض إذن الميكروفون';
      }
      toast.error(errorMessage);
    }
  };

  // Local camera stream reference
  const localCameraStream = useRef(null);
  const localVideoRef = useRef(null);

  // Toggle Camera - Uses phone camera directly
  const toggleCamera = async () => {
    try {
      if (!isCameraOn) {
        toast.info('جاري طلب إذن الكاميرا...');
        
        // Get camera stream directly from phone
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        localCameraStream.current = stream;
        
        // Also publish to Agora for others to see - 4K Quality
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: { ideal: 3840, max: 3840 },
            height: { ideal: 2160, max: 2160 },
            frameRate: { ideal: 30, max: 60 },
            bitrateMin: 8000,
            bitrateMax: 18000
          },
          facingMode: cameraFacing,
          optimizationMode: 'detail' // Prioritize clarity over smoothness
        });
        
        // Disable mirror mode on the track so it's not mirrored for remote viewers
        if (cameraFacing === 'user') {
          videoTrack.setEncoderConfiguration({
            mirror: false
          });
        }
        
        setLocalVideoTrack(videoTrack);
        await agoraClient.current.publish([videoTrack]);
        
        setIsCameraOn(true);
        setViewMode('mirror');
        toast.success('تم تشغيل الكاميرا');
      } else {
        // Stop local stream
        if (localCameraStream.current) {
          localCameraStream.current.getTracks().forEach(track => track.stop());
          localCameraStream.current = null;
        }
        
        // Stop Agora track
        if (localVideoTrack) {
          await agoraClient.current.unpublish([localVideoTrack]);
          localVideoTrack.stop();
          localVideoTrack.close();
          setLocalVideoTrack(null);
        }
        setIsCameraOn(false);
        toast.info('تم إيقاف الكاميرا');
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      let errorMessage = 'فشل تشغيل الكاميرا';
      if (error.code === 'PERMISSION_DENIED' || error.name === 'NotAllowedError') {
        errorMessage = 'تم رفض إذن الكاميرا';
      }
      toast.error(errorMessage);
    }
  };

  // Switch camera (front/back)
  const switchAgoraCamera = async () => {
    if (!isCameraOn) return;
    try {
      const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
      
      // Stop current local stream
      if (localCameraStream.current) {
        localCameraStream.current.getTracks().forEach(track => track.stop());
      }
      
      // Get new stream with different camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      localCameraStream.current = stream;
      
      // Update Agora track
      if (localVideoTrack) {
        await agoraClient.current.unpublish([localVideoTrack]);
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: {
          width: { ideal: 3840, max: 3840 },
          height: { ideal: 2160, max: 2160 },
          frameRate: { ideal: 30, max: 60 },
          bitrateMin: 8000,
          bitrateMax: 18000
        },
        facingMode: newFacing,
        optimizationMode: 'detail' // Prioritize clarity over smoothness
      });
      
      // Disable mirror mode for front camera
      if (newFacing === 'user') {
        videoTrack.setEncoderConfiguration({
          mirror: false
        });
      }
      
      setLocalVideoTrack(videoTrack);
      await agoraClient.current.publish([videoTrack]);
      
      setCameraFacing(newFacing);
      toast.success(newFacing === 'user' ? 'الكاميرا الأمامية' : 'الكاميرا الخلفية');
    } catch (error) {
      console.error('Error switching camera:', error);
      toast.error('فشل تبديل الكاميرا');
    }
  };

  // Recording Functions - Owner/Admin Only
  const startRecording = async () => {
    try {
      // Get display media (screen + audio) or camera + mic
      let stream;
      
      // Try to capture the room content
      if (localVideoTrack && localAudioTrack) {
        // Combine local video and audio tracks
        const videoStream = localVideoTrack.getMediaStreamTrack();
        const audioStream = localAudioTrack.getMediaStreamTrack();
        stream = new MediaStream([videoStream, audioStream]);
      } else if (localAudioTrack) {
        // Audio only
        const audioStream = localAudioTrack.getMediaStreamTrack();
        stream = new MediaStream([audioStream]);
      } else {
        // Fallback: capture screen/window with audio
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            displaySurface: 'browser'
          },
          audio: true
        });
      }
      
      recordingStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
        // Auto download when recording stops
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        a.download = `room_recording_${room?.title || roomId}_${date}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('تم حفظ التسجيل');
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('بدأ التسجيل');
      
      // Handle stream ending (user stops sharing)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopRecording();
      });
      
    } catch (error) {
      console.error('Recording error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('تم رفض إذن التسجيل');
      } else {
        toast.error('فشل بدء التسجيل');
      }
    }
  };
  
  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setIsRecording(false);
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };
  
  // Format recording time
  const formatRecordingTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if user can send images (Admin, Owner, Room Owner, Mod)
  const canSendImages = () => {
    // Owner and Admin can always send images
    if (user?.role === 'owner' || user?.role === 'admin') return true;
    // Room owner can send images
    if (room?.owner_id === user?.id) return true;
    // VIP users can send images
    if (user?.is_vip) return true;
    // Room admins/mods can send images
    const userRole = participants.find(p => p.id === user?.id);
    if (userRole?.role === 'admin' || userRole?.role === 'mod') return true;
    return false;
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الصورة كبير جداً (الحد 5MB)' : 'Image too large (max 5MB)');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'الملف ليس صورة' : 'File is not an image');
      return;
    }
    
    setSelectedImage(file);
  };

  // Upload image and send message
  const handleSendImageMessage = async () => {
    if (!selectedImage) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('room_id', roomId);
      
      const response = await axios.post(`${API}/api/rooms/${roomId}/messages/image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Add message to local state
      setMessages(prev => [...prev, response.data]);
      setSelectedImage(null);
      toast.success(isRTL ? 'تم إرسال الصورة' : 'Image sent');
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل إرسال الصورة' : 'Failed to send image'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Send image via URL
  const handleSendImageUrl = async (url) => {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      toast.error('الرابط غير صحيح');
      return;
    }
    
    setUploadingImage(true);
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/messages/image-url`, 
        { image_url: url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add message to local state
      setMessages(prev => [...prev, response.data]);
      setImageUrlInput('');
      setShowImageUrlModal(false);
      toast.success('تم إرسال الصورة');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;
    
    // If there's an image, send it first
    if (selectedImage) {
      await handleSendImageMessage();
      if (!newMessage.trim()) return;
    }
    
    // Prepare message content with reply info
    const messageContent = newMessage.trim();
    const replyData = replyingTo ? {
      reply_to_id: replyingTo.id,
      reply_to_username: replyingTo.username,
      reply_to_content: replyingTo.content?.substring(0, 100)
    } : null;
    
    // Try WebSocket first for instant delivery
    const sent = sendMessageViaWebSocket(messageContent, replyData);
    if (sent) {
      setNewMessage('');
      setReplyingTo(null);
      setShowMentionList(false);
      return;
    }
    
    // Fallback to HTTP if WebSocket not available
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/messages`, { 
        content: messageContent,
        ...replyData
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([...messages, response.data]);
      setNewMessage('');
      setReplyingTo(null);
      setShowMentionList(false);
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
    }
  };

  // Sync video playback for Watch Party (host only)
  const syncWatchParty = async (currentTime, isPlaying) => {
    if (!isOwner && !isRoomLeader) return; // Only host can sync
    
    // Don't sync too frequently (max once per 2 seconds)
    const now = Date.now();
    if (now - lastSyncTime.current < 2000) return;
    lastSyncTime.current = now;
    
    try {
      await axios.put(`${API}/api/rooms/${roomId}/watch-party/sync`, {
        current_time: currentTime,
        is_playing: isPlaying
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.error('Failed to sync watch party:', error);
    }
  };

  // Handle @ mention input
  const handleMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewMessage(value);
    setMentionCursorPos(cursorPos);

    // Check if user is typing @
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      // Only show if no space after @
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionList(true);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  // Insert mention into message
  const insertMention = (username) => {
    const textBeforeCursor = newMessage.substring(0, mentionCursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = newMessage.substring(mentionCursorPos);
    
    const newText = textBeforeCursor.substring(0, atIndex) + '@' + username + ' ' + textAfterCursor;
    setNewMessage(newText);
    setShowMentionList(false);
  };

  // Get filtered participants for mention
  const filteredMentionUsers = participants.filter(p => 
    p.username.toLowerCase().includes(mentionSearch) && p.user_id !== user.id
  );

  // Render message content with mentions highlighted
  const renderMessageContent = (content) => {
    const mentionRegex = /@(\S+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      // Check if this part is a mention (odd indexes after split)
      if (index % 2 === 1) {
        const isMentioningMe = part.toLowerCase() === user.username?.toLowerCase();
        return (
          <span 
            key={index} 
            className={`font-bold ${isMentioningMe ? 'text-lime-400 bg-lime-500/20 px-1 rounded' : 'text-sky-400'}`}
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  // Delete message from chat
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذه الرسالة؟' : 'Are you sure you want to delete this message?')) {
      return;
    }
    try {
      await axios.delete(`${API}/api/rooms/${roomId}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove message from local state immediately
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success(isRTL ? 'تم حذف الرسالة' : 'Message deleted');
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل حذف الرسالة' : 'Failed to delete message'));
    }
  };

  // ===== Playback Features Functions =====
  
  // Send Reaction
  const handleSendReaction = async (emoji) => {
    try {
      await axios.post(`${API}/api/rooms/${roomId}/reactions`, 
        { reaction: emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Immediately show own reaction locally
      const localReaction = {
        id: `local-${reactionIdRef.current++}`,
        reaction: emoji,
        user_id: user.id,
        username: user.username
      };
      setFloatingReactions(prev => [...prev, localReaction]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== localReaction.id));
      }, 3500);
    } catch (error) {
      toast.error('فشل إرسال التفاعل');
    }
  };

  // Create Poll
  const handleCreatePoll = async (pollData) => {
    try {
      const response = await axios.post(`${API}/api/rooms/${roomId}/polls`, pollData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivePoll(response.data.poll);
      toast.success('تم إنشاء الاستطلاع');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إنشاء الاستطلاع');
    }
  };

  // Vote in Poll
  const handleVotePoll = async (optionId) => {
    if (!activePoll) return;
    try {
      const response = await axios.post(
        `${API}/api/rooms/${roomId}/polls/${activePoll.id}/vote`,
        { option_id: optionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActivePoll(response.data.poll);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل التصويت');
    }
  };

  // Close Poll
  const handleClosePoll = async () => {
    if (!activePoll) return;
    try {
      await axios.delete(`${API}/api/rooms/${roomId}/polls/${activePoll.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivePoll(null);
      toast.success('تم إغلاق الاستطلاع');
    } catch (error) {
      toast.error('فشل إغلاق الاستطلاع');
    }
  };

  // Start Watch Party
  const handleStartWatchParty = async (data) => {
    try {
      
      const response = await axios.post(`${API}/api/rooms/${roomId}/watch-party`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWatchParty(response.data.watch_party);
      setShowWatchPartyModal(false);
      toast.success('تم بدء Watch Party! 🎉');
    } catch (error) {
      console.error('Watch Party error:', error);
      toast.error(error.response?.data?.detail || 'فشل بدء Watch Party');
    }
  };

  // Sync Watch Party
  const handleSyncWatchParty = async (currentTime, isPlaying) => {
    if (!watchParty) return;
    try {
      await axios.put(`${API}/api/rooms/${roomId}/watch-party/sync`, 
        { current_time: currentTime, is_playing: isPlaying },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to sync watch party:', error);
    }
  };

  // End Watch Party
  const handleEndWatchParty = async () => {
    try {
      await axios.delete(`${API}/api/rooms/${roomId}/watch-party`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWatchParty(null);
      toast.success('تم إنهاء Watch Party');
    } catch (error) {
      toast.error('فشل إنهاء Watch Party');
    }
  };

  // Change Watch Party Channel
  const handleChangeChannel = async (channelId) => {
    try {
      await axios.put(`${API}/api/rooms/${roomId}/watch-party/channel/${channelId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to change channel:', error);
    }
  };
  // ===== End Playback Features =====

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
      </div>
    );
  }

  // If room is not loaded yet, show loading
  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
      </div>
    );
  }

  const speakers = seats.filter(s => s.occupied);
  const listeners = participants.filter(p => p.seat_number === null);

  return (
    <div className="min-h-screen bg-[#0A0A0A] fixed inset-0 overflow-hidden" dir="rtl">
      {/* Floating Reactions - Playback Feature */}
      <FloatingReactions reactions={floatingReactions} />
      
      {/* Subtle Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-60 bg-gradient-to-b from-lime-500/5 to-transparent" />
      </div>

      <div className="w-full max-w-[430px] mx-auto h-[100dvh] flex flex-col relative z-10">
        
        {/* ===== HEADER - Glassmorphism ===== */}
        <div 
          className="w-full flex items-center justify-between p-4 sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
        >
          {/* Right Side (RTL) - Back & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleMinimize}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleFullLeave}
              className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-red-400" />
            </button>
          </div>

          {/* Center - Room Info */}
          <div className="flex-1 text-center mx-4">
            <h1 className="font-cairo font-bold text-sm text-white truncate">{room?.title || 'الغرفة'}</h1>
            <button
              onClick={() => setShowConnectedList(!showConnectedList)}
              className="inline-flex items-center gap-2 text-white/60 text-xs mt-0.5"
            >
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
                <span>{participants.length} متصل</span>
              </span>
              <span className="text-white/40">•</span>
              <span>{roomMembers.length || participants.length} عضو</span>
            </button>
          </div>

          {/* Left Side (RTL) - Settings & Share */}
          <div className="flex items-center gap-2">
            {/* Sound Toggle Button */}
            <button
              onClick={() => {
                const newState = toggleSound();
                setSoundEnabled(newState);
                toast.success(newState ? '🔔 تم تفعيل الصوت' : '🔕 تم إيقاف الصوت');
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                soundEnabled 
                  ? 'bg-amber-500/20 hover:bg-amber-500/30' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              title={soundEnabled ? 'إيقاف الصوت' : 'تفعيل الصوت'}
            >
              {soundEnabled ? (
                <Bell className="w-5 h-5 text-amber-400" />
              ) : (
                <BellOff className="w-5 h-5 text-white/50" />
              )}
            </button>
            <button
              onClick={() => setShowInviteFriendsModal(true)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setShowRoomSettings(true)}
              className="w-10 h-10 rounded-full bg-[#CCFF00] hover:bg-[#B3E600] flex items-center justify-center transition-colors"
            >
              <Settings className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-2 bg-red-500/20 px-3 py-1.5 mx-4 mt-2 rounded-full border border-red-500/30">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-bold font-mono">{formatRecordingTime(recordingTime)}</span>
          </div>
        )}

        {/* Room News Ticker - نفس الرئيسية بالضبط */}
        {room && roomNews.length > 0 && (
          <div className="px-4 pb-3">
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-lime-500/30 rounded-2xl">
              {/* Live Badge - نفس الرئيسية بالضبط */}
              <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center">
                <div className="flex items-center gap-1.5 bg-gradient-to-l from-red-600 to-red-500 px-3 py-4 rounded-l-2xl shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white text-xs font-cairo font-bold">أخبار</span>
                </div>
              </div>
              
              {/* Add/Manage Buttons - Left Side */}
              {canAddRoomNews && (
                <div className="absolute left-2 top-0 bottom-0 z-20 flex items-center gap-1 bg-slate-900/90 px-1.5 rounded-lg">
                  <button
                    onClick={() => setShowAddNewsModal(true)}
                    className="w-6 h-6 rounded bg-lime-500/40 hover:bg-lime-500/60 flex items-center justify-center transition-colors"
                    title="إضافة خبر"
                  >
                    <span className="text-lime-300 text-xs font-bold">+</span>
                  </button>
                  <button
                    onClick={() => setShowNewsManageModal(true)}
                    className="w-6 h-6 rounded bg-slate-600/50 hover:bg-slate-500/50 flex items-center justify-center transition-colors"
                    title="إدارة الأخبار"
                  >
                    <Settings className="w-3 h-3 text-slate-300" />
                  </button>
                </div>
              )}
              
              {/* Scrolling News - جميع الأخبار تظهر كاملة من أولها لآخرها */}
              <div className={`py-3 pr-20 ${canAddRoomNews ? 'pl-16' : 'pl-4'} overflow-hidden`}>
                <div 
                  className="inline-flex gap-8 animate-scroll-rtl"
                  style={{
                    animationDuration: `${Math.max(roomNews.length * 8, 20)}s`
                  }}
                >
                  {/* All news items */}
                  {roomNews.map((news, idx) => (
                    <span key={news.id || idx} className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
                      <span className="text-base">{news.icon || '📰'}</span>
                      <span className={`font-almarai ${
                        news.category === 'عاجل' ? 'text-red-400 font-bold' :
                        news.category === 'انتقالات' ? 'text-sky-400' :
                        news.category === 'نتائج' ? 'text-lime-400' :
                        news.category === 'تصريحات' ? 'text-amber-400' :
                        'text-purple-400'
                      }`}>
                        {news.text}
                      </span>
                      <span className="text-lime-500/30 mx-4">|</span>
                    </span>
                  ))}
                  {/* Duplicate for continuous loop */}
                  {roomNews.map((news, idx) => (
                    <span key={`dup-${news.id || idx}`} className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
                      <span className="text-base">{news.icon || '📰'}</span>
                      <span className={`font-almarai ${
                        news.category === 'عاجل' ? 'text-red-400 font-bold' :
                        news.category === 'انتقالات' ? 'text-sky-400' :
                        news.category === 'نتائج' ? 'text-lime-400' :
                        news.category === 'تصريحات' ? 'text-amber-400' :
                        'text-purple-400'
                      }`}>
                        {news.text}
                      </span>
                      <span className="text-lime-500/30 mx-4">|</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add News Button when no news */}
        {room && roomNews.length === 0 && canAddRoomNews && (
          <div className="px-4 pb-3">
            <button
              onClick={() => setShowAddNewsModal(true)}
              className="w-full py-2 bg-slate-800/50 border border-dashed border-lime-500/30 rounded-xl text-lime-400 text-sm font-cairo hover:bg-slate-800/70 transition-colors"
            >
              + إضافة أول خبر للغرفة
            </button>
          </div>
        )}

        {/* Seat Requests Badge - All staff (owner, leader, admin, mod) */}
        {canApproveSeatRequests && seatRequests.length > 0 && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setShowSeatRequestsModal(true)}
            className="fixed bottom-32 right-4 flex items-center gap-1.5 bg-amber-500 border border-amber-600 px-4 py-2 rounded-xl z-50 shadow-lg"
            data-testid="seat-requests-button"
          >
            <Hand className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-base">{seatRequests.length} طلب صعود</span>
          </motion.button>
        )}

        {/* Connected Users Dropdown - Enhanced */}
        <AnimatePresence>
          {showConnectedList && (
            <motion.div
              key={`dropdown-${isRoomOwner}-${participants.length}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-24 left-4 right-4 z-50 bg-slate-900 border border-lime-500/30 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-lime-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-lime-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-cairo font-bold">أعضاء الغرفة</h3>
                    <p className="text-slate-400 text-xs">اضغط على العضو للخيارات</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
                    <span className="text-lime-400 text-xs font-bold">{participants.length}</span>
                  </div>
                  <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm font-bold">
                    {roomMembers.length || participants.length}
                  </span>
                  <button
                    onClick={() => setShowConnectedList(false)}
                    className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
              
              {/* Members List - All members with online status */}
              <div className="max-h-96 overflow-y-auto">
                {(roomMembers.length > 0 ? roomMembers : participants).map((member) => {
                  const odId = member.user_id || member.id;
                  const isOnline = participants.some(p => (p.user_id || p.id) === odId);
                  const onlineParticipant = participants.find(p => (p.user_id || p.id) === odId);
                  const isSpeaker = speakers.some(s => s.user?.user_id === odId);
                  const speakerData = speakers.find(s => s.user?.user_id === odId);
                  const isMuted = speakerData?.user?.is_muted || false;
                  const isCurrentUser = odId === user.id;
                  const isOwnerOfRoom = member.role === 'owner' || room?.owner_id === odId;
                  const canManage = isRoomOwner || isRoomAdmin;
                  const canPromote = isRoomOwner;
                  const userRoomRole = member.role || onlineParticipant?.room_role || 'member';
                  const isUserAdmin = userRoomRole === 'admin';
                  const isUserMod = userRoomRole === 'mod';
                  
                  return (
                    <div 
                      key={odId} 
                      className={`border-b border-slate-800 last:border-0 ${!isOnline ? 'opacity-60' : ''}`}
                    >
                      {/* User Row */}
                      <div className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors">
                        {/* Avatar */}
                        <div 
                          className="relative cursor-pointer flex-shrink-0"
                          onClick={() => {
                            setShowConnectedList(false);
                            navigate(`/user/${odId}`);
                          }}
                        >
                          <img 
                            src={member.avatar || member.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                            alt=""
                            className={`w-14 h-14 rounded-full ring-2 ${
                              isOwnerOfRoom ? 'ring-amber-500' : 
                              isUserAdmin ? 'ring-purple-500' :
                              isUserMod ? 'ring-blue-500' :
                              isSpeaker ? 'ring-lime-500' : 'ring-slate-700'
                            }`}
                          />
                          {/* Online/Offline indicator */}
                          <div className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-900 ${isOnline ? 'bg-lime-500' : 'bg-slate-600'}`}>
                            {isOnline ? <span className="w-2 h-2 rounded-full bg-white"></span> : null}
                          </div>
                          {isSpeaker && isOnline && (
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-slate-900 ${isMuted ? 'bg-red-500' : 'bg-lime-500'}`}>
                              {isMuted ? <MicOff className="w-3 h-3 text-white" /> : <Mic className="w-3 h-3 text-white" />}
                            </div>
                          )}
                          {isOwnerOfRoom && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-slate-900">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {isUserAdmin && !isOwnerOfRoom && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center ring-2 ring-slate-900">
                              <Shield className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {isUserMod && !isOwnerOfRoom && !isUserAdmin && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-slate-900">
                              <Star className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-cairo font-bold truncate">{member.username}</p>
                            {isCurrentUser && (
                              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">أنت</span>
                            )}
                            {!isOnline && (
                              <span className="text-xs bg-slate-700 text-slate-500 px-2 py-0.5 rounded">غير متصل</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm truncate">@{member.username}</p>
                          {/* Role Badges - Show all roles */}
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {/* Primary Role */}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isOwnerOfRoom 
                                ? 'text-amber-400 bg-amber-500/20' 
                                : isUserAdmin
                                  ? 'text-purple-400 bg-purple-500/20'
                                  : isUserMod
                                    ? 'text-blue-400 bg-blue-500/20'
                                    : isSpeaker && isOnline
                                      ? 'text-lime-400 bg-lime-500/20' 
                                      : 'text-slate-400 bg-slate-700/50'
                            }`}>
                              {isOwnerOfRoom ? t('roomOwner') : isUserAdmin ? t('admin') : isUserMod ? t('mod') : isSpeaker && isOnline ? t('speaker') : t('member')}
                            </span>
                            {/* News Reporter Badge */}
                            {member.roles?.includes('news_reporter') && (
                              <span className="text-xs px-2 py-0.5 rounded-full text-cyan-400 bg-cyan-500/20">
                                {t('newsReporter')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons - Only for non-current users and if has permission */}
                      {!isCurrentUser && !isOwnerOfRoom && (isRoomOwner || isRoomAdmin) && (
                        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                          {/* Role Change Buttons */}
                          {isRoomOwner && (
                            <>
                              {/* Make Admin */}
                              {!isUserAdmin && (
                                <button
                                  onClick={() => handleChangeRoomRole(odId, 'admin', member.username)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-cairo transition-colors"
                                  title={t('promoteToAdmin')}
                                >
                                  <Shield className="w-3 h-3" />
                                  {t('admin')}
                                </button>
                              )}
                              
                              {/* Make Mod */}
                              {!isUserMod && !isUserAdmin && (
                                <button
                                  onClick={() => handleChangeRoomRole(odId, 'mod', member.username)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-cairo transition-colors"
                                  title={t('promoteToMod')}
                                >
                                  <Star className="w-3 h-3" />
                                  {t('mod')}
                                </button>
                              )}
                              
                              {/* Remove Role */}
                              {(isUserAdmin || isUserMod) && (
                                <button
                                  onClick={() => handleChangeRoomRole(odId, 'member', member.username)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 text-xs font-cairo transition-colors"
                                  title={t('removeRole')}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                  {t('member')}
                                </button>
                              )}
                              
                              {/* News Reporter Toggle */}
                              {member.roles?.includes('news_reporter') ? (
                                <button
                                  onClick={() => handleToggleNewsReporter(odId, member.username, false)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-400 text-xs font-cairo transition-colors"
                                  title={t('removeNewsReporter')}
                                >
                                  <Type className="w-3 h-3" />
                                  {t('removeNewsReporter')}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleNewsReporter(odId, member.username, true)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs font-cairo transition-colors"
                                  title={t('addNewsReporter')}
                                >
                                  <Type className="w-3 h-3" />
                                  {t('addNewsReporter')}
                                </button>
                              )}
                            </>
                          )}
                          
                          {/* Mic Controls - Only if user is online */}
                          {isOnline && (
                            <>
                              {isSpeaker ? (
                                <button
                                  onClick={() => handleDemoteSpeaker(odId)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-cairo transition-colors"
                                  title={t('demoteFromMic')}
                                >
                                  <MicOff className="w-3 h-3" />
                                  {t('demoteFromMic')}
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedPromoteUser({ user_id: odId, username: member.username, avatar: member.avatar });
                                    setShowPromoteModal(true);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-xs font-cairo transition-colors"
                                  title={t('promoteToMic')}
                                >
                                  <Mic className="w-3 h-3" />
                                  {t('promoteToMic')}
                                </button>
                              )}
                              
                              {/* Mute/Unmute */}
                              {isSpeaker && (
                                <button
                                  onClick={() => isMuted ? handleUnmuteUser(odId) : handleMuteUser(odId)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-cairo transition-colors ${
                                    isMuted 
                                      ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                                      : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                                  }`}
                                  title={isMuted ? t('unmute') : t('mute')}
                                >
                                  {isMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                                  {isMuted ? t('sound') : t('mute')}
                                </button>
                              )}
                              
                              {/* Kick */}
                              <button
                                onClick={() => handleKickUser(odId)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-cairo transition-colors"
                                title={t('kickUser')}
                              >
                                <UserX className="w-3 h-3" />
                                {t('kickUser')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {(roomMembers.length === 0 && participants.length === 0) && (
                  <div className="p-8 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-cairo">{t('noMembers')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speakers Stage */}
        <div className="px-4 py-3">
          {/* View Mode Tabs - Modern Pill Style */}
          <div className="flex justify-center mb-3">
            <div className="flex p-1 bg-white/5 rounded-full border border-white/10">
              <button
                onClick={() => setViewMode('mics')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-cairo font-semibold text-sm transition-all ${
                  viewMode === 'mics' 
                    ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                المايكات
              </button>
              {streamActive && streamUrl && (
                <button
                  onClick={() => setViewMode('stream')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-cairo font-semibold text-sm transition-all ${
                    viewMode === 'stream' 
                      ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Tv className="w-4 h-4" />
                  المباشر
                </button>
              )}
            </div>
          </div>
          
          {/* Speakers Header - Fixed position above scroll */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#CCFF00]/20 flex items-center justify-center">
                <Mic className="w-3 h-3 text-[#CCFF00]" />
              </div>
              <span className="font-cairo font-bold text-white text-sm">المتحدثون</span>
            </div>
            <span className="text-[#CCFF00] text-xs font-almarai">{speakers.length} متحدث</span>
          </div>

          {/* Watch Party Section - Only show in stream view */}
          <AnimatePresence>
            {watchParty && viewMode === 'stream' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4"
              >
                <WatchPartyPlayer
                  watchParty={watchParty}
                  isHost={watchParty?.host_id === user.id || isOwner}
                  onSync={handleSyncWatchParty}
                  onEnd={handleEndWatchParty}
                  onChangeChannel={handleChangeChannel}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Poll Section - Playback Feature */}
          <AnimatePresence>
            {activePoll && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4"
              >
                <PollCard
                  poll={activePoll}
                  onVote={handleVotePoll}
                  currentUserId={user.id}
                  onClose={handleClosePoll}
                  isOwner={isOwner}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Combined Stage + Chat Section */}
        <div className="px-4 pb-32 flex-1 overflow-y-auto">
          {/* ===== STREAM/BROADCAST AREA ===== */}
          {room?.stream_url && room.stream_url.trim() !== '' ? (
            <div className="mb-4 rounded-2xl overflow-hidden border border-white/10">
              <div className="aspect-video w-full bg-black relative">
                {/* Stream Player */}
                {(() => {
                  const url = room.stream_url;
                  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
                  const isTwitch = url.includes('twitch.tv');
                  const isKick = url.includes('kick.com');
                  const isTwitter = url.includes('twitter.com') || url.includes('x.com');
                  const isTikTok = url.includes('tiktok.com');
                  
                  // YouTube
                  if (isYouTube) {
                    let videoId = '';
                    if (url.includes('youtube.com/watch')) {
                      try { videoId = new URL(url).searchParams.get('v'); } catch(e) {}
                    } else if (url.includes('youtu.be/')) {
                      videoId = url.split('youtu.be/')[1]?.split('?')[0];
                    } else if (url.includes('youtube.com/live/')) {
                      videoId = url.split('youtube.com/live/')[1]?.split('?')[0];
                    } else if (url.includes('youtube.com/shorts/')) {
                      videoId = url.split('youtube.com/shorts/')[1]?.split('?')[0];
                    }
                    
                    if (videoId) {
                      return (
                        <iframe
                          id="youtube-player"
                          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&playsinline=1&rel=0&enablejsapi=1`}
                          className="w-full h-full"
                          allowFullScreen
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      );
                    }
                  }
                  
                  // Twitch
                  if (isTwitch) {
                    const channelName = url.split('twitch.tv/')[1]?.split('/')[0]?.split('?')[0];
                    return (
                      <iframe
                        src={`https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}&parent=localhost&muted=false&autoplay=true`}
                        className="w-full h-full"
                        allowFullScreen
                        frameBorder="0"
                      />
                    );
                  }
                  
                  // Kick
                  if (isKick) {
                    const channelName = url.split('kick.com/')[1]?.split('/')[0]?.split('?')[0];
                    return (
                      <iframe
                        src={`https://player.kick.com/${channelName}`}
                        className="w-full h-full"
                        allowFullScreen
                        frameBorder="0"
                      />
                    );
                  }
                  
                  // Twitter/X
                  if (isTwitter) {
                    return (
                      <iframe
                        src={url}
                        className="w-full h-full"
                        allowFullScreen
                        frameBorder="0"
                        sandbox="allow-scripts allow-same-origin allow-popups"
                      />
                    );
                  }
                  
                  // TikTok
                  if (isTikTok) {
                    return (
                      <iframe
                        src={url}
                        className="w-full h-full"
                        allowFullScreen
                        frameBorder="0"
                        sandbox="allow-scripts allow-same-origin allow-popups"
                      />
                    );
                  }
                  
                  // Default: ReactPlayer for direct URLs
                  return (
                    <ReactPlayer
                      url={url}
                      playing={true}
                      controls={true}
                      width="100%"
                      height="100%"
                      volume={streamVolume / 100}
                      muted={isAudioMuted}
                    />
                  );
                })()}
              </div>
              
              {/* Channel Switcher */}
              {Object.keys(streamSlots).filter(k => streamSlots[k]).length > 0 && (
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-2 border-t border-white/10">
                  <div className="flex items-center justify-center gap-2 overflow-x-auto" dir="ltr">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(slot => {
                      const hasChannel = streamSlots[slot];
                      const isActive = room.stream_url === streamSlots[slot];
                      if (!hasChannel) return null;
                      return (
                        <button
                          key={slot}
                          onClick={() => handlePlaySlot(slot)}
                          className={`min-w-[40px] h-9 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${
                            isActive ? 'bg-[#CCFF00] text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No Stream */
            <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950">
              <div className="aspect-video w-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">لا يوجد بث</p>
              </div>
              
              {/* Channel Switcher */}
              {Object.keys(streamSlots).filter(k => streamSlots[k]).length > 0 && (
                <div className="bg-slate-900 p-2 border-t border-white/10">
                  <div className="flex items-center justify-center gap-2 overflow-x-auto" dir="ltr">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(slot => {
                      if (!streamSlots[slot]) return null;
                      return (
                        <button
                          key={slot}
                          onClick={() => handlePlaySlot(slot)}
                          className="min-w-[40px] h-9 rounded-xl font-bold text-sm bg-slate-800 text-slate-400 hover:bg-[#CCFF00] hover:text-black"
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ===== SPEAKERS STRIP ===== */}
          <div className="mb-4 p-3 rounded-2xl bg-[#141414] border border-white/10">
            
            {/* Horizontal Scrollable Speakers */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {/* Show all occupied seats + 2 empty slots */}
              {seats.filter(s => s.occupied).concat(
                Array(2).fill({ occupied: false, user: null })
              ).slice(0, Math.max(speakers.length + 2, 2)).map((seat, index) => {
                const isOccupied = seat.occupied;
                const seatUser = seat.user;
                const isLocalUser = seatUser?.user_id === user.id;
                const hasLocalCamera = isLocalUser && isCameraOn && localCameraStream.current;
                const remoteVideo = isOccupied ? remoteVideoUsers.find(rv => rv.uid === seatUser?.user_id || rv.uid === seatUser?.agora_uid) : null;
                const hasVideo = hasLocalCamera || remoteVideo;
                
                  return (
                  <div key={index} className="flex flex-col items-center gap-1 flex-shrink-0 relative group">
                    {isOccupied ? (
                      /* Occupied Seat */
                      <>
                        <VIPAvatarFrame isVIP={seatUser?.is_vip} size="md">
                          <button
                            onClick={() => hasVideo && setExpandedVideo({ 
                              isLocal: isLocalUser, 
                              remoteUser: remoteVideo,
                              username: seatUser?.username,
                              avatar: seatUser?.avatar
                            })}
                            className={`w-16 h-16 rounded-full overflow-hidden relative ${
                              seatUser?.is_speaking 
                                ? 'ring-2 ring-[#CCFF00] ring-offset-2 ring-offset-[#0A0A0A]' 
                                : hasVideo 
                                  ? 'ring-2 ring-purple-500' 
                                  : ''
                            }`}
                          >
                            {hasLocalCamera ? (
                              <video
                                ref={(el) => {
                                  if (el && localCameraStream.current) {
                                    el.srcObject = localCameraStream.current;
                                  }
                                }}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                                style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
                              />
                            ) : remoteVideo ? (
                              <RemoteVideoCircle remoteUser={remoteVideo} />
                            ) : (
                              <img src={seatUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${index}`} alt="" className="w-full h-full object-cover" />
                            )}
                            {/* Mic Status Badge */}
                            <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0A0A0A] ${seatUser?.is_muted ? 'bg-red-500' : 'bg-[#CCFF00]'}`}>
                              {seatUser?.is_muted ? <MicOff className="w-2.5 h-2.5 text-white" /> : <Mic className="w-2.5 h-2.5 text-black" />}
                            </div>
                          </button>
                        </VIPAvatarFrame>
                      </>
                    ) : (
                      /* Empty Seat */
                      <button
                        onClick={() => !pendingRequest && !onStage && handleRequestStage()}
                        className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:border-white/30 transition-colors"
                      >
                        <span className="text-xl">+</span>
                      </button>
                    )}
                    {/* Username with VIP badge */}
                    <span className="font-almarai text-[10px] text-white/70 truncate max-w-[70px] text-center flex items-center gap-0.5">
                      {isOccupied ? (
                        <>
                          <span className={seatUser?.is_vip ? 'text-amber-400' : ''}>{seatUser?.username}</span>
                          {seatUser?.is_vip && <VIPBadge size="xs" />}
                        </>
                      ) : 'انضم'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* ===== CHAT SECTION ===== */}
          <div 
            className="rounded-2xl flex flex-col relative overflow-hidden bg-[#141414] border border-white/10"
            style={{
              backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '400px'
            }}
          >
            {/* Dark overlay for readability */}
            {chatBackground && (
              <div className="absolute inset-0 bg-black/50" />
            )}
            
            {/* Chat Header */}
            <div className="flex items-center justify-between px-3 py-2 relative z-10 border-b border-slate-700/50">
              <span className="text-slate-400 text-xs font-cairo">💬 {isRTL ? 'الدردشة' : 'Chat'}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">{messages.length} {isRTL ? 'رسالة' : 'messages'}</span>
                {room?.owner_id === user.id && (
                  <button
                    onClick={() => setShowBackgroundPicker(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/30 transition-colors"
                    title={isRTL ? 'تغيير خلفية الدردشة' : 'Change chat background'}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-lime-400" />
                    <span className="text-lime-400 text-[10px] font-cairo">{isRTL ? 'خلفية' : 'BG'}</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Pinned Announcements */}
            {roomAnnouncements.length > 0 && (
              <div className="relative z-10 border-b border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                {roomAnnouncements.slice(0, 1).map(announcement => (
                  <div key={announcement.id} className="px-3 py-2 flex items-start gap-2">
                    <span className="text-amber-400 text-lg">📢</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-amber-200 font-almarai text-sm leading-relaxed">
                        {announcement.text}
                      </p>
                      <span className="text-amber-400/60 text-[10px]">
                        {isRTL ? 'إعلان من المالك' : 'Owner Announcement'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto space-y-2 hide-scrollbar relative z-10 p-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm font-cairo">
                  {t('noMessages')}
                </div>
              ) : (
                messages.slice(-20).map((message, index) => {
              const isOwnMessage = message.user_id === user.id;
              
              return (
                <motion.div 
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 group"
                >
                  {/* Avatar */}
                  <img 
                    src={message.avatar} 
                    alt="" 
                    className="w-9 h-9 rounded-full flex-shrink-0 border-2 border-lime-500/30"
                  />
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    {/* Reply Preview - if this message is a reply */}
                    {message.reply_to_username && (
                      <div className="flex items-center gap-1 mb-1 text-[10px] text-slate-500 bg-slate-800/50 rounded px-2 py-1 border-r-2 border-lime-500/50">
                        <span>↩️</span>
                        <span className="text-lime-400/70">@{message.reply_to_username}</span>
                        <span className="truncate max-w-[150px]">{message.reply_to_content}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <button 
                        onClick={() => {
                          if (message.user_id !== user.id) {
                            setNewMessage(prev => prev + `@${message.username} `);
                          }
                        }}
                        className={`font-cairo font-bold text-sm transition-colors flex items-center gap-1 ${
                          message.is_vip 
                            ? 'text-amber-400 hover:text-amber-300' 
                            : 'text-white hover:text-lime-400'
                        }`}
                      >
                        {message.is_vip && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        {message.username}
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {/* Reply Button - appears on hover */}
                        <button
                          onClick={() => setReplyingTo({
                            id: message.id,
                            username: message.username,
                            content: message.content || (message.image_url ? '[صورة]' : '')
                          })}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-lime-400 transition-all"
                          title={isRTL ? 'رد' : 'Reply'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                        
                        {/* Delete Button - appears on hover for own messages or admins */}
                        {(isOwnMessage || isRoomOwner || isAppOwner || isAdmin || isRoomLeader) && (
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                            title={isRTL ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        
                        <span className="text-slate-500 text-[10px]">{isRTL ? 'الآن' : 'now'}</span>
                      </div>
                    </div>
                    
                    {/* Image Message */}
                    {message.image_url && (
                      <div className="mb-2">
                        <img 
                          src={message.image_url} 
                          alt="Shared" 
                          className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-700 cursor-pointer hover:border-lime-500/50 transition-colors"
                          onClick={() => setViewingImage(message.image_url)}
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    {/* Text Content */}
                    {message.content && (
                      <p className={`font-almarai text-sm leading-relaxed ${
                        message.is_vip 
                          ? 'text-amber-200 bg-gradient-to-r from-amber-500/10 to-transparent px-2 py-1 rounded-lg border-r-2 border-amber-500/50' 
                          : 'text-slate-300'
                      }`}>
                        {renderMessageContent(message.content)}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })
              )}
            <div ref={messagesEndRef} />
          </div>
          </div>
        </div>

        {/* Bottom Control Bar - Modern Design */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative"
        >
          {/* Gradient Fade */}
          <div className="absolute inset-x-0 bottom-full h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
          
          <div 
            className="bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50 px-4 py-4"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          >

          {/* Main Controls - Compact */}
          <div className="flex items-center gap-2">
            {/* Mute/Unmute Button - Simple toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const newMuted = !isAudioMuted;
                setIsAudioMuted(newMuted);
                
                // Apply ONLY to stream audio elements - NOT to Agora microphones
                document.querySelectorAll('audio').forEach(audio => {
                  audio.muted = newMuted;
                });
                
                // Apply to YouTube iframe
                const iframe = document.getElementById('youtube-player');
                if (iframe && iframe.contentWindow) {
                  try {
                    iframe.contentWindow.postMessage(JSON.stringify({
                      event: 'command',
                      func: newMuted ? 'mute' : 'unMute',
                      args: []
                    }), '*');
                  } catch (e) {}
                }
                
                
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isAudioMuted ? 'bg-red-500' : 'bg-slate-800 border border-slate-700'
              }`}
              title={isAudioMuted ? t('unmute') : t('mute')}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
            </motion.button>

            {/* Camera Button - Available for everyone */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleCamera}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCameraOn ? 'bg-purple-500' : 'bg-slate-800 border border-slate-700'
              }`}
            >
              {isCameraOn ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-slate-300" />}
            </motion.button>

            {/* Stream/Broadcast Button - Owner/Admin only */}
            {(room?.owner_id === user.id || user.role === 'admin' || user.role === 'owner') && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowStreamModal(true)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  room?.stream_url ? 'bg-red-500' : 'bg-slate-800 border border-slate-700'
                }`}
                title="بث مباشر"
              >
                <Tv className="w-4 h-4 text-white" />
              </motion.button>
            )}

            {/* Mic/Stage Controls */}
            {onStage ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isMicOn ? 'bg-lime-500' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  {isMicOn ? <Mic className="w-4 h-4 text-slate-900" /> : <MicOff className="w-4 h-4 text-slate-300" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLeaveSeat}
                  className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center"
                >
                  <SignOut className="w-4 h-4 text-white" />
                </motion.button>
              </>
            ) : (
              <>
                {canJoinStageDirect ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleJoinStageDirect}
                    className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-cairo font-bold text-sm bg-lime-500 text-slate-900"
                  >
                    <Mic className="w-4 h-4" />
                    <span>صعود للمنصة</span>
                  </motion.button>
                ) : (
                  pendingRequest ? (
                    <div className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-cairo text-sm text-amber-400 bg-amber-500/20 border border-amber-500/40">
                      <Hand className="w-4 h-4 animate-pulse" />
                      <span>في انتظار الموافقة...</span>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleTakeSeat}
                      className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-cairo font-bold text-sm bg-lime-500 text-slate-900"
                    >
                      <Hand className="w-4 h-4" />
                      <span>طلب مايك</span>
                    </motion.button>
                  )
                )}
              </>
            )}
          </div>

          {/* Reaction Bar - Playback Feature - REMOVED */}

          {/* Message Input - Compact - Fixed at bottom on iOS when keyboard is open */}
          <div 
            className={`relative mt-2 ${keyboardVisible ? 'fixed bottom-0 left-0 right-0 bg-slate-900 p-3 border-t border-slate-800 z-50' : ''}`}
            style={keyboardVisible ? { paddingBottom: 'env(safe-area-inset-bottom)' } : {}}
          >
            {/* Mention List Popup */}
            <AnimatePresence>
              {showMentionList && filteredMentionUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 left-0 right-0 bg-slate-800 border border-lime-500/30 rounded-xl overflow-hidden z-50 max-h-40 overflow-y-auto"
                >
                  {filteredMentionUsers.slice(0, 5).map((p) => (
                    <button
                      key={p.user_id}
                      type="button"
                      onClick={() => insertMention(p.username)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700 transition-colors text-right"
                    >
                      <img src={p.avatar} alt={p.username} className="w-8 h-8 rounded-full" />
                      <span className="text-white font-almarai">@{p.username}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Reply Preview Bar */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 border-t border-lime-500/30 rounded-t-lg"
                >
                  <div className="w-1 h-8 bg-lime-500 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <span className="text-lime-400 text-xs font-bold">
                      {isRTL ? 'رد على' : 'Replying to'} @{replyingTo.username}
                    </span>
                    <p className="text-slate-400 text-xs truncate">
                      {replyingTo.content?.substring(0, 50)}{replyingTo.content?.length > 50 ? '...' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Selected Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 border-t border-lime-500/30 rounded-t-lg"
                >
                  <img 
                    src={URL.createObjectURL(selectedImage)} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded-lg border border-lime-500/50"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-lime-400 text-xs font-bold">
                      {isRTL ? 'صورة جاهزة للإرسال' : 'Image ready to send'}
                    </span>
                    <p className="text-slate-400 text-xs truncate">
                      {selectedImage.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <form onSubmit={handleSendMessage} className="flex gap-2" style={{ position: 'relative', zIndex: 10 }}>
              {/* Image Upload Button - Only for Admin/Owner/Room Owner */}
              {canSendImages() && (
                <>
                  <input
                    type="file"
                    id="chat-image-input"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="chat-image-input"
                    className={`flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer transition-colors ${
                      uploadingImage 
                        ? 'bg-slate-700 text-slate-500' 
                        : 'bg-slate-800 border border-slate-700 hover:border-lime-500 text-slate-400 hover:text-lime-400'
                    }`}
                    title={isRTL ? 'إرسال صورة' : 'Send image'}
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                  </label>
                  {/* Image URL Button */}
                  <button
                    type="button"
                    onClick={() => setShowImageUrlModal(true)}
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 transition-colors"
                    title="إرسال رابط صورة"
                  >
                    <Link className="w-4 h-4" />
                  </button>
                </>
              )}
              
              <input
                type="text"
                value={newMessage}
                onChange={handleMessageChange}
                placeholder={replyingTo ? (isRTL ? 'اكتب ردك...' : 'Write your reply...') : (isRTL ? 'اكتب رسالة...' : 'Type a message...')}
                className="flex-1 bg-slate-800 border border-slate-700 focus:border-lime-500 rounded-lg text-white placeholder:text-slate-500 h-9 px-3 text-sm outline-none"
                dir="rtl"
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                style={{
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                  touchAction: 'manipulation'
                }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() && !selectedImage}
                onClick={(e) => {
                  e.preventDefault();
                  handleSendMessage(e);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSendMessage(e);
                }}
                className="bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 rounded-lg w-9 h-9 p-0 flex items-center justify-center"
                style={{
                  WebkitTapHighlightColor: 'rgba(163,230,53,0.3)',
                  touchAction: 'manipulation',
                  minWidth: '36px',
                  minHeight: '36px'
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
          </div>
        </motion.div>

        {/* Room Settings Modal */}
        <AnimatePresence>
          <RoomSettingsModal
            show={showRoomSettings}
            onClose={() => setShowRoomSettings(false)}
            room={room}
            isOwner={isOwner}
            isRoomAdmin={isRoomAdmin}
            user={user}
            onUpdateRoomTitle={handleUpdateRoomTitle}
            showImagePicker={showImagePicker}
            setShowImagePicker={setShowImagePicker}
            roomImageUrl={roomImageUrl}
            setRoomImageUrl={setRoomImageUrl}
            uploadingImage={uploadingImage}
            onImageUpload={handleImageUpload}
            onUpdateRoomImage={handleUpdateRoomImage}
            isRecording={isRecording}
            recordingTime={recordingTime}
            formatRecordingTime={formatRecordingTime}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            streamActive={streamActive}
            onShowStreamModal={() => setShowStreamModal(true)}
            onToggleRoom={handleToggleRoom}
            onDeleteRoom={handleDeleteRoom}
            activePoll={activePoll}
            onShowCreatePollModal={() => setShowCreatePollModal(true)}
            onClosePoll={handleClosePoll}
            onShowUserRolesModal={() => setShowUserRolesModal(true)}
            onBackgroundUpload={handleBackgroundUpload}
            onRemoveBackground={removeBackground}
            fileInputRef={fileInputRef}
          />
        </AnimatePresence>

        {/* Background Picker Modal */}
        <AnimatePresence>
          <BackgroundPickerModal
            show={showBackgroundPicker}
            onClose={() => setShowBackgroundPicker(false)}
            chatBackground={chatBackground}
            uploadingImage={uploadingImage}
            backgroundInputRef={backgroundInputRef}
            onBackgroundUpload={handleBackgroundUpload}
            onRemoveBackground={removeBackground}
            onUrlSubmit={handleBackgroundUrl}
          />
        </AnimatePresence>

        {/* Image URL Modal for Chat */}
        <AnimatePresence>
          {showImageUrlModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start pt-20 justify-center p-4"
              onClick={() => setShowImageUrlModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-2xl p-5 border border-blue-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-cairo font-bold text-white mb-4 text-center">🔗 إرسال رابط صورة</h3>
                
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="الصق رابط الصورة هنا..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-blue-500/50 text-white text-base font-almarai placeholder-slate-500 focus:outline-none focus:border-blue-400 mb-4"
                  dir="ltr"
                  autoFocus
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendImageUrl(imageUrlInput)}
                    disabled={!imageUrlInput.trim() || uploadingImage}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-white" />
                        <span className="text-white font-cairo font-bold">إرسال</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowImageUrlModal(false); setImageUrlInput(''); }}
                    className="px-4 py-3 rounded-xl bg-slate-700 text-slate-300 font-cairo font-bold hover:bg-slate-600 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite Modal */}
        <AnimatePresence>
          <InviteReceivedModal
            show={showInviteModal}
            invites={myInvites}
            onAccept={handleAcceptInvite}
            onReject={handleRejectInvite}
          />
        </AnimatePresence>

        {/* Stream Modal - 5 Slots */}
        <AnimatePresence>
          {showStreamModal && user.role === 'owner' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => { setShowStreamModal(false); setEditingSlot(null); setStreamInputUrl(''); }}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-md rounded-3xl p-6 border border-violet-500/30 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Tv className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white mb-2">روابط البث</h3>
                  <p className="text-slate-400 font-almarai text-sm">10 روابط ثابتة - اضغط للتشغيل أو التعديل</p>
                </div>
                
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((slot) => (
                    <div key={slot} className={`p-3 rounded-xl border ${activeSlot === slot && streamActive ? 'bg-violet-500/20 border-violet-500' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-cairo font-bold">رابط {slot}</span>
                        <div className="flex items-center gap-2">
                          {streamSlots[slot] && (
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handlePlaySlot(slot)}
                              disabled={activeSlot === slot && streamActive}
                              className={`px-3 py-1 rounded-full text-xs font-cairo font-bold ${
                                activeSlot === slot && streamActive 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-violet-500 hover:bg-violet-400 text-white'
                              }`}
                            >
                              {activeSlot === slot && streamActive ? 'يعمل الآن' : 'تشغيل'}
                            </motion.button>
                          )}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { 
                              setEditingSlot(slot); 
                              setStreamInputUrl(streamSlots[slot] || ''); 
                            }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
                          >
                            <Settings className="w-4 h-4 text-white/70" />
                          </motion.button>
                        </div>
                      </div>
                      
                      {editingSlot === slot ? (
                        <div className="space-y-2">
                          <Input
                            value={streamInputUrl}
                            onChange={(e) => setStreamInputUrl(e.target.value)}
                            placeholder="https://youtube.com/... أو https://twitch.tv/..."
                            className="bg-slate-800 border-slate-600 text-white text-xs font-almarai rounded-lg"
                            dir="ltr"
                          />
                          <div className="flex gap-2">
                            <Button onClick={() => handleSaveSlot(slot)}
                              className="flex-1 bg-lime-500 hover:bg-lime-400 text-black text-xs font-cairo font-bold py-2 rounded-lg"
                            >
                              حفظ
                            </Button>
                            <Button onClick={() => { setEditingSlot(null); setStreamInputUrl(''); }}
                              className="bg-white/10 hover:bg-white/20 text-white text-xs font-cairo py-2 px-3 rounded-lg"
                            >
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs truncate font-almarai" dir="ltr">
                          {streamSlots[slot] || 'لم يتم إضافة رابط'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Stop Stream Button */}
                {streamActive && (
                  <Button onClick={handleStopStream}
                    className="w-full mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-cairo font-bold py-3 rounded-xl border border-red-500/50"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    إيقاف البث
                  </Button>
                )}

                <Button onClick={() => { setShowStreamModal(false); setEditingSlot(null); }}
                  className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white font-cairo font-bold py-3 rounded-xl"
                >
                  إغلاق
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Promote/Demote Modal - ONLY for Room Owner */}
        <AnimatePresence>
          {showPromoteModal && selectedPromoteUser && (room?.owner_id === user.id) && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => { setShowPromoteModal(false); setSelectedPromoteUser(null); }}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-violet-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white">إدارة الرتبة</h3>
                  <p className="text-violet-300 text-sm mt-1">@{selectedPromoteUser.username}</p>
                </div>
                
                <div className="space-y-3">
                  {/* Promote to Admin */}
                  <button 
                    onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'admin')}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50 transition-colors"
                  >
                    <Shield className="w-6 h-6 text-violet-400" />
                    <div className="text-right flex-1">
                      <span className="text-violet-300 font-cairo font-bold">ترقية إلى أدمن</span>
                      <p className="text-violet-400/70 text-xs">يستطيع الكتم والطرد</p>
                    </div>
                  </button>
                  
                  {/* Promote to Mod */}
                  <button 
                    onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'mod')}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 transition-colors"
                  >
                    <Star className="w-6 h-6 text-blue-400" />
                    <div className="text-right flex-1">
                      <span className="text-blue-300 font-cairo font-bold">ترقية إلى مشرف</span>
                      <p className="text-blue-400/70 text-xs">يستطيع إدارة المنصة</p>
                    </div>
                  </button>
                  
                  {/* Demote to User */}
                  <button 
                    onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'user')}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 transition-colors"
                  >
                    <Users className="w-6 h-6 text-gray-400" />
                    <div className="text-right flex-1">
                      <span className="text-gray-300 font-cairo font-bold">تنزيل إلى عضو</span>
                      <p className="text-gray-400/70 text-xs">صلاحيات عادية</p>
                    </div>
                  </button>
                </div>
                
                <button 
                  onClick={() => { setShowPromoteModal(false); setSelectedPromoteUser(null); }}
                  className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold"
                >
                  إلغاء
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Seat Requests Modal - All staff (owner, leader, admin, mod) */}
        <AnimatePresence>
          {showSeatRequestsModal && canApproveSeatRequests && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowSeatRequestsModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-amber-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Hand className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white">طلبات الصعود للمنصة</h3>
                  <p className="text-amber-400 text-sm mt-1">{seatRequests.length} طلب في الانتظار</p>
                </div>
                
                {seatRequests.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {seatRequests.map((request) => (
                      <motion.div 
                        key={request.request_id} 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center gap-3 bg-slate-800/60 backdrop-blur rounded-xl p-3 border border-amber-500/20"
                      >
                        <img 
                          src={request.avatar} 
                          alt="" 
                          className="w-12 h-12 rounded-full ring-2 ring-amber-500/50 flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-white font-cairo font-bold truncate">{request.username}</p>
                          <p className="text-amber-400/70 text-xs">يريد التحدث</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleApproveSeat(request.user_id)}
                            className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30"
                            data-testid={`approve-seat-${request.user_id}`}
                          >
                            <Check className="w-5 h-5 text-white" />
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRejectSeat(request.user_id)}
                            className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30"
                            data-testid={`reject-seat-${request.user_id}`}
                          >
                            <X className="w-5 h-5 text-white" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 font-almarai">لا توجد طلبات حالياً</p>
                  </div>
                )}
                
                <button 
                  onClick={() => setShowSeatRequestsModal(false)}
                  className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold hover:bg-white/20 transition-colors"
                  data-testid="close-seat-requests-modal"
                >
                  إغلاق
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Poll Modal - Playback Feature */}
        <CreatePollModal
          isOpen={showCreatePollModal}
          onClose={() => setShowCreatePollModal(false)}
          onSubmit={handleCreatePoll}
        />

        {/* Start Watch Party Modal - Playback Feature */}
        <StartWatchPartyModal
          isOpen={showWatchPartyModal}
          onClose={() => setShowWatchPartyModal(false)}
          onStart={handleStartWatchParty}
        />

        {/* User Roles Modal */}
        <UserRolesModal
          isOpen={showUserRolesModal}
          onClose={() => setShowUserRolesModal(false)}
          roomId={roomId}
          roomMembers={participants.length > 0 ? participants : (room?.members || [])}
          currentUserId={user.id}
          isOwner={isOwner}
          ownerId={room?.owner_id}
          speakers={speakers}
          onRoleUpdated={(userId, newRole) => {
            // Refresh room data
            fetchRoomData();
          }}
          onInviteToStage={(userId) => {
            // Refresh seats
            fetchRoomData();
          }}
          onRemoveFromStage={(userId) => {
            // Refresh seats
            fetchRoomData();
          }}
        />

        {/* Expanded Video Modal */}
        <AnimatePresence>
          {expandedVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setExpandedVideo(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative w-full max-w-md aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Video */}
                {expandedVideo.isLocal && localCameraStream.current ? (
                  <video
                    ref={(el) => {
                      if (el && localCameraStream.current) {
                        el.srcObject = localCameraStream.current;
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

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-cairo font-bold">{expandedVideo.username}</span>
                    <button
                      onClick={() => setExpandedVideo(null)}
                      className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Controls - Only for local camera */}
                {expandedVideo.isLocal && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="flex items-center justify-center gap-4">
                      {/* Switch Camera Button */}
                      <button
                        onClick={switchAgoraCamera}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-500 text-white font-cairo font-bold"
                      >
                        <SwitchCamera className="w-5 h-5" />
                        <span>تبديل الكاميرا</span>
                      </button>
                      
                      {/* Close Camera */}
                      <button
                        onClick={() => {
                          toggleCamera();
                          setExpandedVideo(null);
                        }}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white font-cairo font-bold"
                      >
                        <VideoOff className="w-5 h-5" />
                        <span>إيقاف</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite Friends Modal */}
        <InviteFriendsModal
          isOpen={showInviteFriendsModal}
          onClose={() => setShowInviteFriendsModal(false)}
          roomId={roomId}
          roomTitle={room?.title || t('appName')}
        />

        {/* Add Room News Modal - إضافة خبر للدوانية */}
        <AnimatePresence>
          {showAddNewsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddNewsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-md rounded-3xl p-6 border border-amber-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Type className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white">إضافة خبر</h3>
                  <p className="text-slate-400 text-sm font-almarai">أضف خبراً للشريط الإخباري</p>
                </div>

                {/* News Category */}
                <div className="mb-4">
                  <label className="text-slate-300 text-sm font-cairo mb-2 block">تصنيف الخبر</label>
                  <div className="flex flex-wrap gap-2">
                    {['عام', 'نتائج', 'انتقالات', 'تصريحات', 'عاجل'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setNewNewsCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-cairo transition-colors ${
                          newNewsCategory === cat
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {cat === 'عام' && '📰'}
                        {cat === 'نتائج' && '⚽'}
                        {cat === 'انتقالات' && '🔄'}
                        {cat === 'تصريحات' && '🎙️'}
                        {cat === 'عاجل' && '🔴'}
                        {' '}{cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* News Text */}
                <div className="mb-6">
                  <label className="text-slate-300 text-sm font-cairo mb-2 block">نص الخبر</label>
                  <textarea
                    value={newNewsText}
                    onChange={(e) => setNewNewsText(e.target.value)}
                    placeholder="اكتب الخبر هنا..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white font-almarai resize-none focus:outline-none focus:border-amber-500"
                    rows={3}
                    dir="rtl"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddRoomNews}
                    disabled={addingNews || !newNewsText.trim()}
                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-cairo font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingNews ? t('loading') : t('addNews')}
                  </button>
                  <button
                    onClick={() => setShowAddNewsModal(false)}
                    className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-cairo font-bold transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Room News Modal - تعديل خبر */}
        <AnimatePresence>
          {showEditNewsModal && editingNews && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => { setShowEditNewsModal(false); setEditingNews(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-md rounded-3xl p-6 border border-blue-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Edit3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white">تعديل الخبر</h3>
                </div>

                {/* News Category */}
                <div className="mb-4">
                  <label className="text-slate-300 text-sm font-cairo mb-2 block">تصنيف الخبر</label>
                  <div className="flex flex-wrap gap-2">
                    {['عام', 'نتائج', 'انتقالات', 'تصريحات', 'عاجل'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setEditingNews({...editingNews, category: cat})}
                        className={`px-3 py-1.5 rounded-full text-xs font-cairo transition-colors ${
                          editingNews.category === cat
                            ? 'bg-blue-500 text-white font-bold'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {cat === 'عام' && '📰'}
                        {cat === 'نتائج' && '⚽'}
                        {cat === 'انتقالات' && '🔄'}
                        {cat === 'تصريحات' && '🎙️'}
                        {cat === 'عاجل' && '🔴'}
                        {' '}{cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* News Text */}
                <div className="mb-6">
                  <label className="text-slate-300 text-sm font-cairo mb-2 block">نص الخبر</label>
                  <textarea
                    value={editingNews.text}
                    onChange={(e) => setEditingNews({...editingNews, text: e.target.value})}
                    placeholder="اكتب الخبر هنا..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white font-almarai resize-none focus:outline-none focus:border-blue-500"
                    rows={3}
                    dir="rtl"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleEditRoomNews}
                    disabled={addingNews || !editingNews.text?.trim()}
                    className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-cairo font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingNews ? t('loading') : t('saveChanges')}
                  </button>
                  <button
                    onClick={() => { setShowEditNewsModal(false); setEditingNews(null); }}
                    className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-cairo font-bold transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* News Management Modal - إدارة الأخبار */}
        <AnimatePresence>
          {showNewsManageModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowNewsManageModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-md rounded-3xl border border-amber-500/30 max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setShowNewsManageModal(false)} className="text-slate-400 hover:text-white">
                      <X className="w-6 h-6" />
                    </button>
                    <div className="text-center flex-1">
                      <div className="w-12 h-12 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Type className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-cairo font-bold text-white">إدارة الأخبار</h3>
                      <p className="text-slate-400 text-xs">{roomNews.length} خبر</p>
                    </div>
                    <div className="w-6" />
                  </div>
                </div>

                {/* News List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {roomNews.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Type className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-cairo">لا توجد أخبار</p>
                    </div>
                  ) : (
                    roomNews.map((news) => {
                      // Owner, author, or news_reporter can manage
                      const canManage = isOwner || news.author_id === user.id || isRoomNewsReporter;
                      return (
                        <div
                          key={news.id}
                          className="p-4 rounded-xl bg-slate-800/50 border border-slate-700"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{news.icon || '📰'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-cairo text-sm">{news.text}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  news.category === 'عاجل' ? 'bg-red-500/20 text-red-400' :
                                  news.category === 'نتائج' ? 'bg-green-500/20 text-green-400' :
                                  news.category === 'انتقالات' ? 'bg-blue-500/20 text-blue-400' :
                                  news.category === 'تصريحات' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-slate-500/20 text-slate-400'
                                }`}>
                                  {news.category}
                                </span>
                                <span className="text-slate-500 text-xs">بواسطة {news.author_name}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          {canManage && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                              <button
                                onClick={() => {
                                  openEditNews(news);
                                  setShowNewsManageModal(false);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-cairo transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                                تعديل
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('هل أنت متأكد من حذف هذا الخبر؟')) {
                                    handleDeleteRoomNews(news.id);
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-cairo transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                حذف
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowNewsManageModal(false);
                      setShowAddNewsModal(true);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-cairo font-bold transition-colors"
                  >
                    + إضافة خبر جديد
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full-Screen Image Viewer Modal */}
        <AnimatePresence>
          {viewingImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center overflow-hidden"
              onClick={() => { setViewingImage(null); setImageZoom(1); }}
            >
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingImage(null);
                  setImageZoom(1);
                }}
                className="absolute top-4 right-4 z-[10000] w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
              >
                <X className="w-6 h-6 text-white" />
              </button>
              
              {/* Back Button (Left side for RTL) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingImage(null);
                  setImageZoom(1);
                }}
                className="absolute top-4 left-4 z-[10000] flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-cairo transition-colors"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>رجوع</span>
              </button>

              {/* Bottom Controls - Zoom & Download */}
              <div 
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm"
                style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Zoom Out */}
                <button
                  onClick={() => setImageZoom(prev => Math.max(0.5, prev - 0.25))}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  disabled={imageZoom <= 0.5}
                >
                  <ZoomOut className="w-5 h-5 text-white" />
                </button>

                {/* Zoom Indicator */}
                <span className="text-white font-cairo text-sm min-w-[50px] text-center">
                  {Math.round(imageZoom * 100)}%
                </span>

                {/* Zoom In */}
                <button
                  onClick={() => setImageZoom(prev => Math.min(3, prev + 0.25))}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  disabled={imageZoom >= 3}
                >
                  <ZoomIn className="w-5 h-5 text-white" />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-white/30" />

                {/* Download Button */}
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(viewingImage);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `koora-voice-${Date.now()}.jpg`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      toast.success('تم حفظ الصورة');
                    } catch (err) {
                      toast.error('فشل حفظ الصورة');
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-[#CCFF00]/30 hover:bg-[#CCFF00]/50 flex items-center justify-center transition-colors"
                >
                  <Download className="w-5 h-5 text-[#CCFF00]" />
                </button>
              </div>

              {/* Image with Zoom */}
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: imageZoom, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                src={viewingImage}
                alt="Full view"
                className="max-w-[95vw] max-h-[80vh] object-contain rounded-lg cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
                style={{ touchAction: 'none' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default YallaLiveRoom;
