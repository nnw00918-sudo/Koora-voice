import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  Zap
} from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID;

const YallaLiveRoom = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMicOn, setIsMicOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onStage, setOnStage] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [gifts, setGifts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCoins, setUserCoins] = useState(user.coins || 1000);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
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
  const [showReactions, setShowReactions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedPromoteUser, setSelectedPromoteUser] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showConnectedList, setShowConnectedList] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showSeatRequestsModal, setShowSeatRequestsModal] = useState(false);
  
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

    return () => {
      leaveRoom();
      stopPolling();
      stopHeartbeat();
      cleanupAgora();
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
        } catch (err) {
          console.error('Error subscribing:', err);
        }
      });

      agoraClient.current.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'audio') {
          setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
        }
      });

      agoraClient.current.on('user-left', (remoteUser) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
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
        const [seatsRes, messagesRes, participantsRes, myRequestRes] = await Promise.all([
          axios.get(`${API}/rooms/${roomId}/seats`),
          axios.get(`${API}/rooms/${roomId}/messages`),
          axios.get(`${API}/rooms/${roomId}/participants`),
          axios.get(`${API}/rooms/${roomId}/seat/my-request`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
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

      setRoom(roomRes.data);
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
    } catch (error) {
      console.error('Failed to leave room');
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
      toast.success(response.data.message);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const response = await axios.post(`${API}/rooms/${roomId}/messages`, { content: newMessage }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
    }
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

  const sendReaction = async (emoji) => {
    try {
      await axios.post(`${API}/rooms/${roomId}/messages`, { content: emoji }, { headers: { Authorization: `Bearer ${token}` } });
      fetchMessages();
    } catch (error) {
      console.error('Failed to send reaction');
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/30 to-slate-950 fixed inset-0 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="w-full max-w-lg mx-auto h-[100dvh] flex flex-col relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 py-3 flex items-center justify-between backdrop-blur-xl bg-slate-900/60 border-b border-white/10"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          {/* Left Side - Seat Requests (Owner/Admin only) & Close Button */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>
            
            {/* Seat Requests Badge - Owner & Admin only */}
            {(room?.owner_id === user.id || currentUserRole === 'admin' || currentUserRole === 'owner') && seatRequests.length > 0 && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setShowSeatRequestsModal(true)}
                className="flex items-center gap-1.5 bg-amber-500/30 border border-amber-500/50 px-3 py-1.5 rounded-full"
                data-testid="seat-requests-button"
              >
                <Hand className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-bold text-sm">{seatRequests.length}</span>
              </motion.button>
            )}
          </div>

          {/* Room Info - Center */}
          <div className="flex-1 mx-2 text-center">
            <h1 className="text-white font-cairo font-bold text-base truncate">{room?.title || 'الغرفة'}</h1>
            <motion.button
              onClick={() => setShowConnectedList(!showConnectedList)}
              className="flex items-center justify-center gap-2 mx-auto mt-1"
            >
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600/40 to-fuchsia-600/40 backdrop-blur px-3 py-1 rounded-full border border-violet-400/30">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white font-bold text-sm">{participants.length}</span>
                <span className="text-violet-200 text-xs">متصل</span>
                <ChevronDown className={`w-3 h-3 text-violet-300 transition-transform ${showConnectedList ? 'rotate-180' : ''}`} />
              </div>
            </motion.button>
          </div>

          {/* Settings Button */}
          {isOwner && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowRoomSettings(true)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30"
            >
              <Settings className="w-5 h-5 text-white" />
            </motion.button>
          )}
          {!isOwner && <div className="w-10" />}
        </motion.div>

        {/* Connected Users Dropdown */}
        <AnimatePresence>
          {showConnectedList && (
            <motion.div
              key={`dropdown-${isRoomOwner}-${participants.length}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-24 left-4 right-4 z-50 bg-slate-900/95 backdrop-blur-xl border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-500/20 overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-white font-cairo font-bold">المتصلون</h3>
                <span className="bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded-full text-sm font-bold">
                  {[...new Map(participants.map(p => [p.user_id || p.id, p])).values()].length}
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto overflow-x-visible">
                {/* Remove duplicates by user_id */}
                {[...new Map(participants.map(p => [p.user_id || p.id, p])).values()].map((p) => {
                  const odId = p.user_id || p.id;
                  const isSpeaker = speakers.some(s => s.user_id === odId);
                  const speakerData = speakers.find(s => s.user_id === odId);
                  const isMuted = speakerData?.user?.is_muted || false;
                  const isCurrentUser = odId === user.id;
                  // Kick/Mute - show for room owner or admin
                  const canKickMuteUser = (room?.owner_id === user.id) || currentUserRole === 'admin' || currentUserRole === 'owner';
                  // Promote/Demote - show ONLY for room owner
                  const canPromoteDemote = room?.owner_id === user.id;
                  
                  return (
                    <motion.div 
                      key={odId} 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex items-center gap-2 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      {/* Admin Controls - Left side */}
                      {!isCurrentUser && (canKickMuteUser || canPromoteDemote) && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Kick Button - Owner & Admin */}
                          {canKickMuteUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleKickUser(odId);
                              }}
                              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                              title="طرد"
                            >
                              <UserX className="w-4 h-4 text-white" />
                            </button>
                          )}
                          
                          {/* Mute Button - Owner & Admin (only for speakers) */}
                          {canKickMuteUser && isSpeaker && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                isMuted ? handleUnmuteUser(odId) : handleMuteUser(odId);
                              }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                                isMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'
                              }`}
                              title={isMuted ? 'إلغاء الكتم' : 'كتم'}
                            >
                              {isMuted ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
                            </button>
                          )}
                          
                          {/* Remove from Stage Button - Owner & Admin (only for speakers) */}
                          {canKickMuteUser && isSpeaker && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromStage(odId);
                              }}
                              className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors"
                              title="إنزال من المنصة"
                            >
                              <ArrowDownCircle className="w-4 h-4 text-white" />
                            </button>
                          )}
                          
                          {/* Promote Button - ONLY Owner */}
                          {canPromoteDemote && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPromoteUser({ user_id: odId, username: p.username });
                                setShowPromoteModal(true);
                              }}
                              className="w-9 h-9 rounded-full bg-violet-500 hover:bg-violet-600 flex items-center justify-center transition-colors"
                              title="ترقية / تنزيل"
                            >
                              <Crown className="w-4 h-4 text-white" />
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        isSpeaker 
                          ? 'text-green-400 bg-green-500/20' 
                          : 'text-slate-400 bg-slate-700/50'
                      }`}>
                        {isSpeaker ? 'متحدث' : 'مستمع'}
                      </span>
                      
                      {/* User Info - Clickable to profile */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer text-right"
                        onClick={() => {
                          setShowConnectedList(false);
                          navigate(`/user/${odId}`);
                        }}
                      >
                        <p className="text-white font-cairo font-bold text-sm truncate">{p.user?.name || p.username}</p>
                        <p className="text-violet-300 text-xs truncate">@{p.username}</p>
                      </div>
                      
                      {/* Avatar - Clickable to profile */}
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
                          className="w-12 h-12 rounded-full ring-2 ring-violet-500/50"
                        />
                        {isSpeaker && (
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-slate-900 ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}>
                            {isMuted ? <MicOff className="w-3 h-3 text-white" /> : <Mic className="w-3 h-3 text-white" />}
                          </div>
                        )}
                      </div>
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
          className="px-4 py-6"
        >
          {/* Main Stage Glass Card */}
          <div className="relative bg-gradient-to-br from-violet-900/40 via-slate-900/60 to-fuchsia-900/40 backdrop-blur-xl rounded-3xl border border-violet-500/30 p-6 shadow-2xl">
            {/* Decorative Elements */}
            <div className="absolute top-2 right-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            
            {/* Speakers Grid */}
            <div className="flex justify-center gap-4 flex-wrap">
              {speakers.length > 0 ? speakers.map((seat, index) => (
                <motion.div
                  key={seat.seat_number}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1, type: "spring" }}
                  className="relative"
                >
                  <button
                    onClick={() => {
                      if (isOwner && seat.user.user_id !== user.id) {
                        setShowUserMenu(showUserMenu === seat.user.user_id ? null : seat.user.user_id);
                      }
                    }}
                    className="relative group"
                  >
                    {/* Glow Effect for Speaking */}
                    {(seat.user.is_speaking || (seat.user.user_id === user.id && isMicOn)) && (
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 blur-lg"
                      />
                    )}
                    
                    <div className={`relative w-20 h-20 rounded-full overflow-hidden border-4 transition-all ${
                      seat.user.is_speaking || (seat.user.user_id === user.id && isMicOn)
                        ? 'border-green-400 shadow-lg shadow-green-400/50'
                        : seat.user.is_muted
                        ? 'border-red-500'
                        : 'border-violet-500/50'
                    }`}>
                      <img src={seat.user.avatar} alt={seat.user.username} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Mic Status Badge */}
                    <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-slate-900 ${
                      seat.user.is_muted ? 'bg-red-500' : 
                      (seat.user.is_speaking || (seat.user.user_id === user.id && isMicOn)) ? 'bg-green-500' : 'bg-slate-700'
                    }`}>
                      {seat.user.is_muted ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
                    </div>
                    
                    {/* Owner Crown */}
                    {seat.user.user_id === room?.owner_id && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <Crown className="w-5 h-5 text-amber-400 drop-shadow-lg" fill="currentColor" />
                      </div>
                    )}
                  </button>
                  
                  <p className="text-center text-white text-xs font-almarai mt-2 truncate max-w-[80px]">
                    {seat.user.username}
                  </p>

                  {/* User Menu */}
                  <AnimatePresence>
                    {isOwner && showUserMenu === seat.user.user_id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
                        className="absolute top-24 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl rounded-xl p-2 shadow-2xl border border-violet-500/30 z-50 min-w-[140px]"
                      >
                        <div className="space-y-1">
                          {seat.user.is_muted ? (
                            <button onClick={() => { handleUnmuteUser(seat.user.user_id); setShowUserMenu(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-500/20 text-green-400 text-sm">
                              <Mic className="w-4 h-4" /> إلغاء الكتم
                            </button>
                          ) : (
                            <button onClick={() => { handleMuteUser(seat.user.user_id); setShowUserMenu(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-yellow-500/20 text-yellow-400 text-sm">
                              <MicOff className="w-4 h-4" /> كتم
                            </button>
                          )}
                          <button onClick={() => { handleRemoveFromStage(seat.user.user_id); setShowUserMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-orange-500/20 text-orange-400 text-sm">
                            <ArrowDownCircle className="w-4 h-4" /> إنزال
                          </button>
                          <button onClick={() => { handleKickUser(seat.user.user_id); setShowUserMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-400 text-sm">
                            <UserX className="w-4 h-4" /> طرد
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )) : (
                // Empty Stage Placeholder
                <div className="flex gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-20 h-20 rounded-full bg-white/5 border-2 border-dashed border-violet-500/30 flex items-center justify-center">
                      <Users className="w-8 h-8 text-violet-500/50" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-full">
                <Mic className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-bold text-sm">{speakers.length}</span>
                <span className="text-green-300/70 text-xs">متحدث</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col min-h-0 px-4">
          {/* Chat Toggle */}
          <button 
            onClick={() => setShowChat(!showChat)}
            className="flex items-center justify-center gap-2 py-2 text-violet-300 hover:text-white transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-almarai">الدردشة</span>
            {showChat ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Messages */}
          <AnimatePresence>
            {showChat && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex-1 overflow-y-auto space-y-2 pb-2 hide-scrollbar"
              >
                {messages.slice(-20).map((message, index) => {
                  const isOwnMessage = message.user_id === user.id;
                  // Check if message is a single emoji (including compound emojis like ❤️)
                  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
                  const isEmoji = emojiRegex.test(message.content);
                  
                  if (isEmoji) {
                    return (
                      <motion.div 
                        key={message.id}
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="flex justify-center"
                      >
                        <span className="text-4xl">{message.content}</span>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div 
                      key={message.id}
                      initial={{ opacity: 0, x: isOwnMessage ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                    >
                      <img src={message.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <p className={`text-xs text-slate-400 mb-1 ${isOwnMessage ? 'text-right' : ''}`}>{message.username}</p>
                        <div className={`px-4 py-2 rounded-2xl ${
                          isOwnMessage 
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white' 
                            : 'bg-white/10 text-white'
                        }`}>
                          <p className="text-sm font-almarai">{message.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Control Bar */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-900/80 backdrop-blur-xl border-t border-white/10 px-4 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {/* Quick Reactions */}
          <div className="flex justify-center gap-2 mb-3">
            {['❤️', '🔥', '👏', '😂', '🎉', '💯'].map((emoji) => (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.8 }}
                onClick={() => sendReaction(emoji)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <span className="text-lg">{emoji}</span>
              </motion.button>
            ))}
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-3">
            {/* Audio Mute Button - Always visible */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                isAudioMuted ? 'bg-red-500 shadow-red-500/30' : 'bg-slate-700'
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
            </motion.button>

            {/* Mic/Stage Controls */}
            {onStage ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                    isMicOn 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-green-500/30' 
                      : 'bg-slate-700'
                  }`}
                >
                  {isMicOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLeaveSeat}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30"
                >
                  <SignOut className="w-6 h-6 text-white" />
                </motion.button>
                <div className="flex-1 text-center">
                  <span className="text-green-400 font-cairo font-bold text-sm">أنت على المنصة</span>
                </div>
              </>
            ) : (
              <>
                {/* Show speak button ONLY for Owner and Admin */}
                {(room?.owner_id === user.id || currentUserRole === 'admin' || currentUserRole === 'owner') ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleJoinStageDirect}
                    className="flex-1 py-3 rounded-full flex items-center justify-center gap-2 font-cairo font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30"
                  >
                    <Mic className="w-5 h-5" />
                    <span>صعود للمنصة</span>
                  </motion.button>
                ) : (
                  /* Regular users can request to speak */
                  pendingRequest ? (
                    <div className="flex-1 py-3 rounded-full flex items-center justify-center gap-2 font-cairo text-amber-400 bg-amber-500/20 border border-amber-500/50">
                      <Hand className="w-5 h-5 animate-pulse" />
                      <span>في انتظار الموافقة...</span>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleTakeSeat}
                      className="flex-1 py-3 rounded-full flex items-center justify-center gap-2 font-cairo font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                    >
                      <Hand className="w-5 h-5" />
                      <span>طلب التحدث</span>
                    </motion.button>
                  )
                )}
              </>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-white/10 border-white/20 focus:border-violet-400 rounded-full text-white placeholder:text-slate-400 h-11"
              dir="rtl"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-full w-11 h-11 p-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
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
      </div>
    </div>
  );
};

export default YallaLiveRoom;
