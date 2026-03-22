import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useRoomAudio } from '../contexts/RoomAudioContext';
import { FloatingReactions, ReactionBar, PollCard, CreatePollModal } from '../components/room/Reactions';
import { WatchPartyPlayer, StartWatchPartyModal } from '../components/room/WatchParty';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  Users,
  Gift,
  LogOut as SignOut,
  Crown,
  UserX,
  Volume2,
  VolumeX,
  MessageCircle,
  Hand,
  Eye,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Star,
  Check,
  X,
  Shield,
  UserPlus,
  Settings,
  ArrowDownCircle,
  Lock,
  Unlock,
  Trash2,
  Power,
  Headphones,
  Sparkles,
  Flame,
  Heart,
  Zap,
  Minimize2,
  Video,
  VideoOff,
  Play,
  Square,
  Tv,
  Monitor,
  Cast,
  SwitchCamera,
  Camera,
  ImageIcon,
  Circle,
  StopCircle,
  Download,
  ArrowRight,
  Phone,
  AtSign,
  BarChart3,
  Youtube
} from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID;

const YallaLiveRoom = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { 
    minimizePlayer, 
    disconnectFromRoom: globalDisconnect,
    setCurrentRoom
  } = useRoomAudio();
  
  const [room, setRoom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [isMicOn, setIsMicOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onStage, setOnStage] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [gifts, setGifts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCoins, setUserCoins] = useState(user.coins || 1000);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [remoteVideoUsers, setRemoteVideoUsers] = useState([]); // Users with active video
  const [seatRequests, setSeatRequests] = useState([]);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  
  // Check if current user is room owner based on room data
  const isRoomOwner = room?.owner_id === user.id;
  // System owner (role=owner) has ALL permissions in ALL rooms
  const isSystemOwner = currentUserRole === 'owner';
  // Room owner or system owner has full control
  const isOwner = isRoomOwner || isSystemOwner;
  const isAdmin = currentUserRole === 'admin' || isOwner;
  const isMod = currentUserRole === 'mod' || isOwner;
  const canManageStage = isOwner || ['admin', 'mod'].includes(currentUserRole);
  const canKickMute = isOwner || currentUserRole === 'admin';
  const canJoinStageDirect = isOwner || ['admin', 'mod'].includes(currentUserRole);
  
  const [myInvites, setMyInvites] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(100); // Microphone volume 0-100
  const [streamVolume, setStreamVolume] = useState(100); // Stream/broadcast volume 0-100
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedPromoteUser, setSelectedPromoteUser] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showConnectedList, setShowConnectedList] = useState(false);
  const [showSeatRequestsModal, setShowSeatRequestsModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [roomImageUrl, setRoomImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [chatBackground, setChatBackground] = useState('');
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
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
  
  // Screen sharing states
  const [screenShares, setScreenShares] = useState([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [watchingScreenShare, setWatchingScreenShare] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' = front, 'environment' = back
  const screenShareStream = useRef(null);
  const screenShareVideoRef = useRef(null);
  
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

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCurrentUserRole();
    initializeAgora();
    joinRoom();
    fetchRoomData();
    startPolling();
    startHeartbeat();
    fetchStreamStatus();

    // Poll stream status every 10 seconds
    const streamPoll = setInterval(fetchStreamStatus, 10000);

    return () => {
      // Clear messages when leaving room (ephemeral chat like Snapchat)
      setMessages([]);
      leaveRoom();
      stopPolling();
      stopHeartbeat();
      cleanupAgora();
      clearInterval(streamPoll);
      // Stop recording if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        stopRecording();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Separate polling for seat requests (only for owners/admins) - FAST
  useEffect(() => {
    if (isOwner || isAdmin || room?.owner_id === user?.id) {
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
  }, [isOwner, isAdmin, room?.owner_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mic volume control
  useEffect(() => {
    if (localAudioTrack) {
      localAudioTrack.setVolume(micVolume);
    }
  }, [micVolume, localAudioTrack]);

  // Stream volume control - affects remote users audio
  useEffect(() => {
    remoteUsers.forEach(remoteUser => {
      if (remoteUser.audioTrack) {
        remoteUser.audioTrack.setVolume(streamVolume);
      }
    });
  }, [streamVolume, remoteUsers]);

  // Playback features polling (Reactions, Polls, Watch Party)
  useEffect(() => {
    // Start polling for reactions
    const fetchReactions = async () => {
      try {
        const response = await axios.get(`${API}/rooms/${roomId}/reactions`, {
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
        const response = await axios.get(`${API}/rooms/${roomId}/polls/active`, {
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
        const response = await axios.get(`${API}/rooms/${roomId}/watch-party`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWatchParty(response.data.watch_party);
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error fetching watch party:', error);
        }
        setWatchParty(null);
      }
    };

    // Initial fetch
    fetchReactions();
    fetchActivePoll();
    fetchWatchParty();

    // Set up polling intervals
    reactionsPollingRef.current = setInterval(fetchReactions, 2000);
    pollPollingRef.current = setInterval(fetchActivePoll, 3000);
    watchPartyPollingRef.current = setInterval(fetchWatchParty, 5000);

    return () => {
      if (reactionsPollingRef.current) clearInterval(reactionsPollingRef.current);
      if (pollPollingRef.current) clearInterval(pollPollingRef.current);
      if (watchPartyPollingRef.current) clearInterval(watchPartyPollingRef.current);
    };
  }, [roomId, token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeAgora = async () => {
    try {
      agoraClient.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      
      agoraClient.current.on('user-published', async (remoteUser, mediaType) => {
        try {
          await agoraClient.current.subscribe(remoteUser, mediaType);
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
            setRemoteUsers(prev => {
              const exists = prev.find(u => u.uid === remoteUser.uid);
              if (!exists) return [...prev, remoteUser];
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
        `${API}/agora/token`,
        { channel_name: roomId, uid: generatedUid },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await agoraClient.current.join(
        AGORA_APP_ID,
        roomId,
        tokenResponse.data.token,
        generatedUid
      );
    } catch (error) {
      console.error('Agora error:', error);
    }
  };

  const cleanupAgora = async () => {
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
          axios.get(`${API}/rooms/${roomId}`),
          axios.get(`${API}/rooms/${roomId}/seats`),
          axios.get(`${API}/rooms/${roomId}/messages`),
          axios.get(`${API}/rooms/${roomId}/participants`),
          axios.get(`${API}/rooms/${roomId}/seat/my-request`, { headers: { Authorization: `Bearer ${token}` } })
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
          const sharesRes = await axios.get(`${API}/rooms/${roomId}/screen-shares`);
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
        await axios.post(`${API}/rooms/${roomId}/heartbeat`, {}, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };
    
    sendHeartbeat(); // Send immediately
    heartbeatInterval.current = setInterval(sendHeartbeat, 5000);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
  };

  const fetchCurrentUserRole = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.role) {
        setCurrentUserRole(response.data.role);
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.role = response.data.role;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      setCurrentUserRole(user.role || 'user');
    } finally {
      setRoleLoading(false);
    }
  };

  const fetchRoomData = async () => {
    try {
      const [roomRes, seatsRes, messagesRes, participantsRes] = await Promise.all([
        axios.get(`${API}/rooms/${roomId}`),
        axios.get(`${API}/rooms/${roomId}/seats`),
        axios.get(`${API}/rooms/${roomId}/messages`),
        axios.get(`${API}/rooms/${roomId}/participants`)
      ]);

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
      
      setSeats(seatsRes.data.seats);
      
      const filteredMessages = messagesRes.data.filter(msg => 
        !msg.content?.toLowerCase().includes('test message') &&
        !msg.content?.toLowerCase().includes('voice test') &&
        !msg.username?.toLowerCase().includes('test_user')
      );
      setMessages(filteredMessages);
      setParticipants(participantsRes.data);
      
      // Check if current user is on stage
      const myParticipant = participantsRes.data.find(p => p.user_id === user.id);
      if (myParticipant && myParticipant.seat_number !== null) {
        setOnStage(true);
        setPendingRequest(false); // Clear pending if approved
      } else {
        setOnStage(false);
      }
      
      setLoading(false);
    } catch (error) {
      toast.error('فشل تحميل بيانات الغرفة');
      navigate('/dashboard');
    }
  };

  const fetchSeats = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/seats`);
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
      const response = await axios.get(`${API}/rooms/${roomId}/messages`);
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

  const fetchParticipants = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/participants`);
      if (response.data.length !== participants.length) {
        setParticipants(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch participants');
    }
  };

  const fetchGifts = async () => {
    try {
      const response = await axios.get(`${API}/gifts`);
      setGifts(response.data.gifts);
    } catch (error) {
      console.error('Failed to fetch gifts');
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
      const response = await axios.get(`${API}/rooms/${roomId}/seat/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeatRequests(response.data.requests);
    } catch (error) {
      console.error('Failed to fetch seat requests');
    }
  };

  const checkMyRequestStatus = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/seat/my-request`, {
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
      const response = await axios.get(`${API}/rooms/${roomId}/seat/invites/me`, {
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
      await axios.post(`${API}/rooms/${roomId}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.error('Failed to join room');
    }
  };

  const leaveRoom = async () => {
    try {
      await axios.post(`${API}/rooms/${roomId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
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
      // Store room info in global context
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
      
      navigate('/dashboard');
    }
  };

  const handleTakeSeat = async () => {
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/seat/request`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setPendingRequest(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الطلب');
    }
  };

  const handleJoinStageDirect = async () => {
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/seat/join-direct`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setOnStage(true);
      fetchSeats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الصعود للمنصة');
    }
  };

  const handleApproveSeat = async (userId) => {
    try {
      await axios.post(`${API}/rooms/${roomId}/seat/approve/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تمت الموافقة على الطلب');
      // Immediately refresh all data
      await Promise.all([fetchSeats(), fetchSeatRequests(), fetchParticipants()]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشلت الموافقة');
    }
  };

  const handleRejectSeat = async (userId) => {
    try {
      await axios.post(`${API}/rooms/${roomId}/seat/reject/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.info('تم رفض الطلب');
      fetchSeatRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الرفض');
    }
  };

  const handleKickUser = async (userId) => {
    if (!window.confirm('هل أنت متأكد من طرد هذا العضو؟')) return;
    try {
      await axios.post(`${API}/rooms/${roomId}/kick/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم طرد العضو');
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الطرد');
    }
  };

  const handleMuteUser = async (userId) => {
    try {
      await axios.post(`${API}/rooms/${roomId}/mute/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم كتم العضو');
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الكتم');
    }
  };

  const handleUnmuteUser = async (userId) => {
    try {
      await axios.post(`${API}/rooms/${roomId}/unmute/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم إلغاء كتم العضو');
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إلغاء الكتم');
    }
  };

  const handleInviteUser = async (userId, username) => {
    try {
      await axios.post(`${API}/rooms/${roomId}/seat/invite/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`تم إرسال دعوة إلى ${username}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الدعوة');
    }
  };

  const handleRemoveFromStage = async (userId) => {
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/remove-from-stage/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إنزال العضو');
    }
  };

  const handleToggleRoom = async () => {
    try {
      const response = await axios.post(`${API}/admin/rooms/${roomId}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      
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
      toast.error(error.response?.data?.detail || 'فشل تغيير حالة الغرفة');
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('هل أنت متأكد من حذف الغرفة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      await axios.delete(`${API}/admin/rooms/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('تم حذف الغرفة');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل حذف الغرفة');
    }
  };

  const handleCloseAndKickAll = async () => {
    if (!window.confirm('هل أنت متأكد من إغلاق الغرفة وطرد جميع المشاركين؟')) return;
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/close-and-kick`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إغلاق الغرفة');
    }
  };

  const handleUpdateRoomImage = async () => {
    if (!roomImageUrl.trim()) {
      toast.error('أدخل رابط الصورة');
      return;
    }
    try {
      await axios.put(`${API}/rooms/${roomId}/image`, 
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

      const uploadResponse = await axios.post(`${API}/upload/image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = uploadResponse.data.url;
      
      // Update room image
      await axios.put(`${API}/rooms/${roomId}/image`, 
        { image: imageUrl }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('تم تحديث صورة الغرفة');
      setRoom(prev => ({ ...prev, image: imageUrl }));
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

      const uploadResponse = await axios.post(`${API}/upload/image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = uploadResponse.data.url;
      
      // Update room chat background
      await axios.put(`${API}/rooms/${roomId}/chat-background`, 
        { background_url: imageUrl }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('تم تحديث خلفية الدردشة');
      setChatBackground(imageUrl);
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
      await axios.put(`${API}/rooms/${roomId}/chat-background`, 
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

  // Stream functions
  const fetchStreamStatus = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/stream`);
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
      await axios.post(`${API}/rooms/${roomId}/stream/slots`, 
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
  const handlePlaySlot = (slot) => {
    const rawUrl = streamSlots[slot];
    if (!rawUrl) return;
    
    setStreamKey(Date.now());
    const embedUrl = convertToEmbedUrl(rawUrl);
    setActiveSlot(slot);
    setStreamUrl(embedUrl);
    setStreamActive(true);
    setViewMode('stream');
    
    // Sync to server
    axios.post(`${API}/rooms/${roomId}/stream/play/${slot}`, {}, 
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => {});
  };

  const handleStartStream = async () => {
    if (!streamInputUrl.trim()) {
      toast.error('أدخل رابط البث');
      return;
    }
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/stream/start`, 
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
      const response = await axios.post(`${API}/rooms/${roomId}/stream/stop`, {}, 
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
      const response = await axios.get(`${API}/rooms/${roomId}/screen-shares`);
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
      await axios.post(`${API}/rooms/${roomId}/screen-share/start`, 
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
      
      await axios.post(`${API}/rooms/${roomId}/screen-share/start`, 
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
      
      await axios.post(`${API}/rooms/${roomId}/screen-share/stop`, {},
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
      const response = await axios.post(`${API}/rooms/${roomId}/seat/invites/${inviteId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
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
      await axios.post(`${API}/rooms/${roomId}/seat/invites/${inviteId}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.info('رفضت الدعوة');
      setShowInviteModal(false);
      fetchMyInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل رفض الدعوة');
    }
  };

  const handlePromoteUser = async (userId, newRole) => {
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/promote/${userId}`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
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
      const response = await axios.post(`${API}/rooms/${roomId}/seat/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
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
    if (!onStage) {
      toast.error('يجب أن تكون على المنصة لتشغيل الكاميرا');
      return;
    }
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
        
        // Also publish to Agora for others to see
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: '720p_2',
          facingMode: cameraFacing
        });
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
        encoderConfig: '720p_2',
        facingMode: newFacing
      });
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/messages`, { content: newMessage }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([...messages, response.data]);
      setNewMessage('');
      setShowMentionList(false);
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
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

  const handleSendGift = async (giftId) => {
    if (!selectedUser) return;
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/gift`, { gift_id: giftId, recipient_id: selectedUser.user_id }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(response.data.message);
      setUserCoins(response.data.remaining_coins);
      setShowGiftModal(false);
      setSelectedUser(null);
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الهدية');
    }
  };

  // ===== Playback Features Functions =====
  
  // Send Reaction
  const handleSendReaction = async (emoji) => {
    try {
      await axios.post(`${API}/rooms/${roomId}/reactions`, 
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
      const response = await axios.post(`${API}/rooms/${roomId}/polls`, pollData, {
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
        `${API}/rooms/${roomId}/polls/${activePoll.id}/vote`,
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
      await axios.delete(`${API}/rooms/${roomId}/polls/${activePoll.id}`, {
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
      const response = await axios.post(`${API}/rooms/${roomId}/watch-party`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWatchParty(response.data.watch_party);
      toast.success('تم بدء Watch Party! 🎉');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل بدء Watch Party');
    }
  };

  // Sync Watch Party
  const handleSyncWatchParty = async (currentTime, isPlaying) => {
    if (!watchParty) return;
    try {
      await axios.put(`${API}/rooms/${roomId}/watch-party/sync`, 
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
      await axios.delete(`${API}/rooms/${roomId}/watch-party`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWatchParty(null);
      toast.success('تم إنهاء Watch Party');
    } catch (error) {
      toast.error('فشل إنهاء Watch Party');
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

  const speakers = seats.filter(s => s.occupied);
  const listeners = participants.filter(p => p.seat_number === null);

  return (
    <div className="min-h-screen bg-slate-950 fixed inset-0 overflow-hidden">
      {/* Floating Reactions - Playback Feature */}
      <FloatingReactions reactions={floatingReactions} />
      
      {/* Starry Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stars/Sparkles */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(2px 2px at 20px 30px, rgba(132,204,22,0.3), transparent),
                           radial-gradient(2px 2px at 40px 70px, rgba(132,204,22,0.2), transparent),
                           radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(2px 2px at 130px 80px, rgba(132,204,22,0.2), transparent),
                           radial-gradient(1px 1px at 160px 120px, rgba(255,255,255,0.2), transparent),
                           radial-gradient(2px 2px at 200px 50px, rgba(132,204,22,0.15), transparent),
                           radial-gradient(1px 1px at 250px 90px, rgba(255,255,255,0.25), transparent),
                           radial-gradient(2px 2px at 300px 150px, rgba(132,204,22,0.2), transparent)`,
          backgroundSize: '350px 200px'
        }} />
        {/* Gradient Overlay */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-gradient-to-b from-lime-500/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      <div className="w-full max-w-lg mx-auto h-[100dvh] flex flex-col relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 py-3 flex items-center justify-between"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          {/* Settings Button - Left */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowRoomSettings(true)}
            className="w-11 h-11 rounded-xl bg-lime-500 hover:bg-lime-400 flex items-center justify-center shadow-lg shadow-lime-500/30 transition-colors"
          >
            <Settings className="w-5 h-5 text-slate-900" />
          </motion.button>

          {/* Room Info - Center */}
          <div className="flex-1 mx-3 text-center">
            <h1 className="text-white font-cairo font-bold text-xl">{room?.title || 'الغرفة'}</h1>
            <motion.button
              onClick={() => setShowConnectedList(!showConnectedList)}
              className="flex items-center justify-center gap-2 mx-auto mt-1"
            >
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full">
                <span className="text-lime-400 font-bold text-sm">{participants.length}</span>
                <span className="text-slate-400 text-xs">متصل</span>
                {(remoteVideoUsers.length > 0 || isCameraOn) && (
                  <Video className="w-3 h-3 text-lime-400" />
                )}
              </div>
            </motion.button>
            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center justify-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/50 mt-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-xs font-bold font-mono">{formatRecordingTime(recordingTime)}</span>
              </div>
            )}
          </div>

          {/* Right Side - Close & Minimize */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleMinimize}
              className="w-10 h-10 rounded-xl bg-lime-500/20 hover:bg-lime-500/30 flex items-center justify-center border border-lime-500/30 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-lime-400" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleFullLeave}
              className="w-10 h-10 rounded-xl bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center border border-red-500/30 transition-colors"
            >
              <X className="w-5 h-5 text-red-400" />
            </motion.button>
          </div>
        </motion.div>

        {/* Seat Requests Badge */}
        {(room?.owner_id === user.id || currentUserRole === 'admin' || currentUserRole === 'owner') && seatRequests.length > 0 && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setShowSeatRequestsModal(true)}
            className="absolute top-16 right-4 flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 rounded-xl z-20"
            data-testid="seat-requests-button"
          >
            <Hand className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-bold text-sm">{seatRequests.length}</span>
          </motion.button>
        )}

        {/* Connected Users Dropdown */}
        <AnimatePresence>
          {showConnectedList && (
            <motion.div
              key={`dropdown-${isRoomOwner}-${participants.length}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-24 left-4 right-4 z-50 bg-slate-900/95 backdrop-blur-xl border border-lime-500/30 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-white font-cairo font-bold">المتصلون</h3>
                <span className="bg-lime-500/30 text-lime-300 px-3 py-1 rounded-full text-sm font-bold">
                  {[...new Map(participants.map(p => [p.user_id || p.id, p])).values()].length}
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {/* Remove duplicates by user_id */}
                {[...new Map(participants.map(p => [p.user_id || p.id, p])).values()].map((p) => {
                  const odId = p.user_id || p.id;
                  const isSpeaker = speakers.some(s => s.user_id === odId);
                  const speakerData = speakers.find(s => s.user_id === odId);
                  const isMuted = speakerData?.user?.is_muted || false;
                  const isCurrentUser = odId === user.id;
                  const canKickMuteUser = (room?.owner_id === user.id) || currentUserRole === 'admin' || currentUserRole === 'owner';
                  const canPromoteDemote = room?.owner_id === user.id;
                  
                  return (
                    <motion.div 
                      key={odId} 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-800/50 transition-colors border-b border-slate-800 last:border-0"
                    >
                      {/* Avatar */}
                      <div 
                        className="relative cursor-pointer flex-shrink-0"
                        onClick={() => {
                          setShowConnectedList(false);
                          navigate(`/user/${odId}`);
                        }}
                      >
                        <img 
                          src={p.user?.avatar || p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                          alt=""
                          className="w-12 h-12 rounded-full ring-2 ring-slate-700"
                        />
                        {isSpeaker && (
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-slate-900 ${isMuted ? 'bg-red-500' : 'bg-lime-500'}`}>
                            {isMuted ? <MicOff className="w-3 h-3 text-white" /> : <Mic className="w-3 h-3 text-white" />}
                          </div>
                        )}
                      </div>
                      
                      {/* User Info - Clickable */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          setShowConnectedList(false);
                          navigate(`/user/${odId}`);
                        }}
                      >
                        <p className="text-white font-cairo font-bold text-sm truncate">{p.user?.name || p.username}</p>
                        <p className="text-slate-400 text-xs truncate">@{p.username}</p>
                      </div>
                      
                      {/* Status Badge */}
                      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        isSpeaker 
                          ? 'text-lime-400 bg-lime-500/20' 
                          : 'text-slate-400 bg-slate-700/50'
                      }`}>
                        {isSpeaker ? 'متحدث' : 'مستمع'}
                      </span>
                      
                      {/* Follow Button - Not for current user */}
                      {!isCurrentUser && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await axios.post(`${API}/users/${odId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
                              toast.success(`تمت متابعة ${p.username}`);
                            } catch (error) {
                              if (error.response?.status === 400) {
                                // Already following, so unfollow
                                await axios.delete(`${API}/users/${odId}/follow`, { headers: { Authorization: `Bearer ${token}` } });
                                toast.success(`تم إلغاء متابعة ${p.username}`);
                              } else {
                                toast.error('فشلت العملية');
                              }
                            }
                          }}
                          className="flex-shrink-0 bg-lime-500 hover:bg-lime-400 text-slate-900 text-xs px-3 py-1.5 rounded-lg font-cairo font-bold transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </motion.button>
                      )}
                      
                      {/* Admin Controls */}
                      {!isCurrentUser && (canKickMuteUser || canPromoteDemote) && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {canKickMuteUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleKickUser(odId);
                              }}
                              className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                              title="طرد"
                            >
                              <UserX className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                          
                          {canKickMuteUser && isSpeaker && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                isMuted ? handleUnmuteUser(odId) : handleMuteUser(odId);
                              }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                isMuted ? 'bg-green-500/20 hover:bg-green-500/40' : 'bg-yellow-500/20 hover:bg-yellow-500/40'
                              }`}
                              title={isMuted ? 'إلغاء الكتم' : 'كتم'}
                            >
                              {isMuted ? <Mic className="w-4 h-4 text-green-400" /> : <MicOff className="w-4 h-4 text-yellow-400" />}
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speakers Stage */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-4 py-3"
        >
          {/* View Mode Tabs */}
          <div className="flex justify-center gap-2 mb-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('mics')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${
                viewMode === 'mics' 
                  ? 'bg-lime-500 text-slate-900 shadow-lg shadow-lime-500/30' 
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Mic className="w-4 h-4" />
              المايكات
            </motion.button>
            {streamActive && streamUrl && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('stream')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${
                  viewMode === 'stream' 
                    ? 'bg-lime-500 text-slate-900 shadow-lg shadow-lime-500/30' 
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Tv className="w-4 h-4" />
                المباشر
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('mirror')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${
                viewMode === 'mirror' 
                  ? 'bg-lime-500 text-slate-900 shadow-lg shadow-lime-500/30' 
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Video className="w-4 h-4" />
              الكاميرات
              {(remoteVideoUsers.length > 0 || isCameraOn) && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  viewMode === 'mirror' ? 'bg-slate-900/30' : 'bg-lime-500/30 text-lime-400'
                }`}>
                  {remoteVideoUsers.length + (isCameraOn ? 1 : 0)}
                </span>
              )}
            </motion.button>
          </div>

          {/* Watch Party Section - Playback Feature */}
          <AnimatePresence>
            {watchParty && (
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

          {/* Stream View Only - No separate stage card */}
          {streamActive && streamUrl && viewMode === 'stream' && (
            <div className="px-4 mb-2">
              <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-700">
                <div className="bg-slate-800 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white font-cairo font-bold text-sm">بث مباشر</span>
                  </div>
                </div>
                <div className="relative aspect-[16/9] max-h-[150px] bg-black">
                  <ReactPlayer
                    url={streamUrl}
                    playing={true}
                    controls={true}
                    width="100%"
                    height="100%"
                    muted={isAudioMuted}
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
        {/* Combined Stage + Chat Section */}
        <motion.div 
          className="px-4 pb-2 flex-1 min-h-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div 
            className="rounded-xl h-full flex flex-col relative overflow-hidden border border-lime-500/30 shadow-[0_0_20px_rgba(132,204,22,0.1)]"
            style={{
              backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: chatBackground ? 'transparent' : 'rgba(15, 23, 42, 0.6)'
            }}
          >
            {/* Dark overlay for readability */}
            {chatBackground && (
              <div className="absolute inset-0 bg-black/40" />
            )}
            
            {/* Mini Stage Inside Card */}
            <div className="relative z-10 border-b border-lime-500/20 px-3 py-2">
              <div className="flex items-center justify-center gap-2">
                <Star className="w-3 h-3 text-lime-400/70" />
                {speakers.length > 0 ? speakers.map((seat) => (
                  <div key={seat.seat_number} className="relative">
                    <div className={`w-6 h-6 rounded-full overflow-hidden border ${
                      seat.user.is_speaking ? 'border-lime-400 shadow-[0_0_6px_rgba(132,204,22,0.5)]' : 'border-slate-600'
                    }`}>
                      <img src={seat.user.avatar} alt="" className="w-full h-full object-cover" />
                    </div>
                    {seat.user.is_muted && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full" />}
                  </div>
                )) : (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border border-dashed border-lime-500/20 bg-slate-800/30" />
                  ))
                )}
                <span className="text-lime-400/50 text-[9px]">{speakers.length}/12</span>
              </div>
            </div>
            
            {/* Chat Header */}
            <div className="flex items-center justify-between px-3 py-1.5 relative z-10 border-b border-slate-700/50">
              <span className="text-slate-400 text-xs font-cairo">💬 الدردشة</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[10px]">{messages.length} رسالة</span>
                {room?.owner_id === user.id && (
                  <button
                    onClick={() => setShowBackgroundPicker(true)}
                    className="p-1 rounded bg-white/10 hover:bg-white/20"
                  >
                    <ImageIcon className="w-3 h-3 text-lime-400" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto space-y-2 hide-scrollbar relative z-10 p-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm font-cairo">
                  لا توجد رسائل - ابدأ المحادثة!
                </div>
              ) : (
                messages.slice(-20).map((message, index) => {
              const isOwnMessage = message.user_id === user.id;
              
              return (
                <motion.div 
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  {/* Avatar */}
                  <img 
                    src={message.avatar} 
                    alt="" 
                    className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-lime-500/30"
                  />
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <button 
                        onClick={() => {
                          if (message.user_id !== user.id) {
                            setNewMessage(prev => prev + `@${message.username} `);
                          }
                        }}
                        className="text-white font-cairo font-bold text-sm hover:text-lime-400 transition-colors"
                      >
                        {message.username}
                      </button>
                      <span className="text-slate-500 text-xs">الآن</span>
                    </div>
                    <p className="text-slate-300 font-cairo text-sm leading-relaxed">
                      {renderMessageContent(message.content)}
                    </p>
                  </div>
                </motion.div>
              );
            })
              )}
            <div ref={messagesEndRef} />
          </div>
          </div>
        </motion.div>

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
            {/* Volume Controls Panel */}
            <AnimatePresence>
            {showVolumeControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-full mb-3 left-4 right-4 bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-xl"
              >
                <div className="space-y-4">
                  {/* Mic Volume */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-cairo text-sm flex items-center gap-2">
                        <Mic className="w-4 h-4 text-lime-400" />
                        صوت المايك
                      </span>
                      <span className="text-lime-400 text-sm font-bold">{micVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={micVolume}
                      onChange={(e) => setMicVolume(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-lime-500"
                    />
                  </div>
                  
                  {/* Stream Volume */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-cairo text-sm flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-sky-400" />
                        صوت البث
                      </span>
                      <span className="text-sky-400 text-sm font-bold">{streamVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={streamVolume}
                      onChange={(e) => setStreamVolume(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-sky-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Controls - Compact */}
          <div className="flex items-center gap-2">
            {/* Audio Mute Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isAudioMuted ? 'bg-red-500' : 'bg-slate-800 border border-slate-700'
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
            </motion.button>

            {/* Headphones */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowVolumeControls(!showVolumeControls)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                showVolumeControls ? 'bg-sky-500' : 'bg-slate-800 border border-slate-700'
              }`}
            >
              <Headphones className="w-4 h-4 text-white" />
            </motion.button>

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
                  onClick={toggleCamera}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isCameraOn ? 'bg-lime-500' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  {isCameraOn ? <Video className="w-4 h-4 text-slate-900" /> : <VideoOff className="w-4 h-4 text-slate-300" />}
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
                {(room?.owner_id === user.id || currentUserRole === 'admin' || currentUserRole === 'owner') ? (
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
                      <span>صعود للمنصة</span>
                    </motion.button>
                  )
                )}
              </>
            )}
          </div>

          {/* Reaction Bar - Playback Feature - REMOVED */}

          {/* Message Input - Compact */}
          <div className="relative mt-2">
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
            
            <form onSubmit={handleSendMessage} className="flex gap-2" style={{ position: 'relative', zIndex: 10 }}>
              <input
                type="text"
                value={newMessage}
                onChange={handleMessageChange}
                placeholder="اكتب رسالة..."
                className="flex-1 bg-slate-800 border border-slate-700 focus:border-lime-500 rounded-lg text-white placeholder:text-slate-500 h-9 px-3 text-sm outline-none"
                dir="rtl"
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
              />
              <Button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-lime-500 hover:bg-lime-400 text-slate-900 rounded-lg w-9 h-9 p-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
          </div>
        </motion.div>

        {/* Gift Modal */}
        <AnimatePresence>
          {showGiftModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
              onClick={() => setShowGiftModal(false)}
            >
              <motion.div 
                initial={{ y: 300 }} 
                animate={{ y: 0 }} 
                exit={{ y: 300 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-lg mx-auto rounded-t-3xl p-6 border-t border-violet-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-cairo font-bold text-white mb-4 text-center">
                  إرسال هدية
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {gifts.map((gift) => (
                    <motion.button 
                      key={gift.id} 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSendGift(gift.id)} 
                      disabled={userCoins < gift.coins}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        userCoins < gift.coins 
                          ? 'bg-slate-800/50 border-slate-700 opacity-50' 
                          : 'bg-slate-800/80 border-violet-500/30 hover:border-violet-400'
                      }`}
                    >
                      <span className="text-4xl">{gift.icon}</span>
                      <p className="text-sm text-white font-almarai">{gift.name}</p>
                      <p className="text-xs text-amber-400 font-bold">{gift.coins}</p>
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-slate-400 text-sm">
                  رصيدك: <span className="text-amber-400 font-bold">{userCoins}</span> عملة
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room Settings Modal */}
        <AnimatePresence>
          {showRoomSettings && isOwner && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowRoomSettings(false)}
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
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white">إعدادات الغرفة</h3>
                </div>
                
                <div className="space-y-3">
                  {/* Change Room Image */}
                  <button onClick={() => setShowImagePicker(!showImagePicker)}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50"
                  >
                    <ImageIcon className="w-6 h-6 text-sky-400" />
                    <span className="text-sky-400 font-cairo font-bold">تغيير صورة الغرفة</span>
                  </button>
                  
                  {showImagePicker && (
                    <div className="p-4 bg-slate-800 rounded-xl space-y-4">
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                      />
                      
                      {/* Upload from album button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-900 rounded-xl font-cairo font-bold transition-all disabled:opacity-50"
                      >
                        {uploadingImage ? (
                          <>
                            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            <span>جاري الرفع...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-5 h-5" />
                            <span>اختر من الألبوم</span>
                          </>
                        )}
                      </button>
                      
                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-slate-500 text-sm">أو</span>
                        <div className="flex-1 h-px bg-slate-700" />
                      </div>
                      
                      {/* URL input */}
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={roomImageUrl}
                          onChange={(e) => setRoomImageUrl(e.target.value)}
                          placeholder="أدخل رابط الصورة..."
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm placeholder:text-slate-400"
                          dir="ltr"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={handleUpdateRoomImage}
                            disabled={!roomImageUrl.trim()}
                            className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-white rounded-lg font-cairo font-bold text-sm transition-colors"
                          >
                            حفظ الرابط
                          </button>
                          <button 
                            onClick={() => { setShowImagePicker(false); setRoomImageUrl(''); }}
                            className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-cairo text-sm transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Playback Features Section */}
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-slate-500 text-xs font-cairo mb-2">ميزات Playback</p>
                    
                    {/* Watch Party Button */}
                    {!watchParty ? (
                      <button 
                        onClick={() => { setShowRoomSettings(false); setShowWatchPartyModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 mb-2"
                        data-testid="start-watch-party-btn"
                      >
                        <Youtube className="w-6 h-6 text-red-400" />
                        <div className="flex-1 text-right">
                          <span className="text-red-400 font-cairo font-bold">بدء Watch Party</span>
                          <p className="text-red-300/70 text-xs">شاهدوا معاً بشكل متزامن</p>
                        </div>
                      </button>
                    ) : (
                      <button 
                        onClick={() => { handleEndWatchParty(); setShowRoomSettings(false); }}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500 hover:bg-red-600 mb-2"
                        data-testid="end-watch-party-btn"
                      >
                        <Youtube className="w-6 h-6 text-white" />
                        <span className="text-white font-cairo font-bold">إنهاء Watch Party</span>
                      </button>
                    )}
                    
                    {/* Create Poll Button */}
                    {!activePoll ? (
                      <button 
                        onClick={() => { setShowRoomSettings(false); setShowCreatePollModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50"
                        data-testid="create-poll-btn"
                      >
                        <BarChart3 className="w-6 h-6 text-amber-400" />
                        <div className="flex-1 text-right">
                          <span className="text-amber-400 font-cairo font-bold">إنشاء استطلاع</span>
                          <p className="text-amber-300/70 text-xs">اسأل الجمهور رأيهم</p>
                        </div>
                      </button>
                    ) : (
                      <button 
                        onClick={() => { handleClosePoll(); setShowRoomSettings(false); }}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-amber-500 hover:bg-amber-600"
                        data-testid="close-poll-btn"
                      >
                        <BarChart3 className="w-6 h-6 text-white" />
                        <span className="text-white font-cairo font-bold">إغلاق الاستطلاع</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Recording Controls - Owner/Admin only */}
                  {(isOwner || isAdmin) && (
                    <>
                      {isRecording ? (
                        <button 
                          onClick={() => { stopRecording(); setShowRoomSettings(false); }}
                          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
                        >
                          <div className="flex items-center gap-2">
                            <StopCircle className="w-6 h-6 text-red-400" />
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          </div>
                          <div className="flex-1 text-right">
                            <span className="text-red-400 font-cairo font-bold">إيقاف التسجيل</span>
                            <span className="text-red-300 text-sm mr-2 font-mono">{formatRecordingTime(recordingTime)}</span>
                          </div>
                        </button>
                      ) : (
                        <button 
                          onClick={() => { startRecording(); setShowRoomSettings(false); }}
                          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50"
                        >
                          <Circle className="w-6 h-6 text-rose-400" fill="currentColor" />
                          <span className="text-rose-400 font-cairo font-bold">تسجيل الغرفة</span>
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Stream Controls - Only for System Owner */}
                  {user.role === 'owner' && (
                    <>
                      {streamActive ? (
                        <button onClick={handleStopStream}
                          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
                        >
                          <VideoOff className="w-6 h-6 text-red-400" />
                          <span className="text-red-400 font-cairo font-bold">إيقاف البث</span>
                        </button>
                      ) : (
                        <button onClick={() => { setShowRoomSettings(false); setShowStreamModal(true); }}
                          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50"
                        >
                          <Video className="w-6 h-6 text-violet-400" />
                          <span className="text-violet-400 font-cairo font-bold">تشغيل بث مباشر</span>
                        </button>
                      )}
                    </>
                  )}
                  
                  <button onClick={handleToggleRoom}
                    className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-colors ${
                      room?.is_closed 
                        ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50' 
                        : 'bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50'
                    }`}
                  >
                    {room?.is_closed ? <Unlock className="w-6 h-6 text-green-400" /> : <Lock className="w-6 h-6 text-orange-400" />}
                    <span className={`font-cairo font-bold ${room?.is_closed ? 'text-green-400' : 'text-orange-400'}`}>
                      {room?.is_closed ? 'فتح الغرفة' : 'إغلاق الغرفة'}
                    </span>
                  </button>
                  
                  <button onClick={handleCloseAndKickAll}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50"
                  >
                    <Power className="w-6 h-6 text-orange-400" />
                    <span className="text-orange-400 font-cairo font-bold">إغلاق وطرد الجميع</span>
                  </button>
                  
                  <button onClick={handleDeleteRoom}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
                  >
                    <Trash2 className="w-6 h-6 text-red-400" />
                    <span className="text-red-400 font-cairo font-bold">حذف الغرفة</span>
                  </button>
                </div>
                
                <button onClick={() => setShowRoomSettings(false)}
                  className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold"
                >
                  إلغاء
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Background Picker Modal */}
        <AnimatePresence>
          {showBackgroundPicker && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowBackgroundPicker(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-lime-500/30"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-cairo font-bold text-white mb-4 text-center">🖼️ خلفية الدردشة</h3>
                
                {/* Current Background Preview */}
                {chatBackground && (
                  <div className="mb-4 relative rounded-xl overflow-hidden h-32">
                    <img src={chatBackground} alt="الخلفية الحالية" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-white text-sm font-almarai">الخلفية الحالية</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Upload from album */}
                  <label className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/50 cursor-pointer transition-colors">
                    <ImageIcon className="w-6 h-6 text-lime-400" />
                    <span className="text-lime-400 font-cairo font-bold">
                      {uploadingImage ? 'جاري الرفع...' : 'اختر من الألبوم'}
                    </span>
                    <input
                      type="file"
                      ref={backgroundInputRef}
                      onChange={handleBackgroundUpload}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                  
                  {/* Remove background */}
                  {chatBackground && (
                    <button 
                      onClick={removeBackground}
                      className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
                    >
                      <Trash2 className="w-6 h-6 text-red-400" />
                      <span className="text-red-400 font-cairo font-bold">إزالة الخلفية</span>
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowBackgroundPicker(false)}
                  className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold"
                >
                  إلغاء
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite Modal */}
        <AnimatePresence>
          {showInviteModal && myInvites.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-violet-500/30"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Hand className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white mb-2">دعوة للصعود!</h3>
                  <p className="text-violet-300 font-almarai">{myInvites[0].invited_by_name} يدعوك للتحدث</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => handleRejectInvite(myInvites[0].invite_id)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-cairo font-bold py-3 rounded-xl"
                  >
                    رفض
                  </Button>
                  <Button onClick={() => handleAcceptInvite(myInvites[0].invite_id)}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-cairo font-bold py-3 rounded-xl"
                  >
                    قبول
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
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
                  <p className="text-slate-400 font-almarai text-sm">5 روابط ثابتة - اضغط للتشغيل أو التعديل</p>
                </div>
                
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((slot) => (
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

        {/* Seat Requests Modal - Owner & Admin only */}
        <AnimatePresence>
          {showSeatRequestsModal && (room?.owner_id === user.id || currentUserRole === 'admin' || currentUserRole === 'owner') && (
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
      </div>
    </div>
  );
};

export default YallaLiveRoom;
