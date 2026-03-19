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
  LogIn,
  LogOut as SignOut,
  Crown,
  UserX,
  Volume2,
  VolumeX,
  MessageCircle,
  Hand,
  Eye,
  ChevronDown,
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
  Headphones
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
  
  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin';
  const isMod = currentUserRole === 'mod';
  const canManageStage = ['owner', 'admin', 'mod'].includes(currentUserRole);
  const canKickMute = ['owner', 'admin'].includes(currentUserRole);
  const canJoinStageDirect = ['owner', 'admin', 'mod'].includes(currentUserRole);
  
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
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const agoraClient = useRef(null);
  const agoraUid = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCurrentUserRole();
    initializeAgora();
    joinRoom();
    fetchRoomData();
    fetchGifts();
    startPolling();

    return () => {
      leaveRoom();
      stopPolling();
      cleanupAgora();
    };
  }, [roomId]);

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
    pollInterval.current = setInterval(() => {
      fetchSeats();
      fetchMessages();
      fetchParticipants();
      if (canManageStage) fetchSeatRequests();
      fetchMyInvites();
    }, 3000);
  };

  const stopPolling = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
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
      
      const myParticipant = participantsRes.data.find(p => p.user_id === user.id);
      if (myParticipant && myParticipant.seat_number !== null) setOnStage(true);
      
      setLoading(false);
    } catch (error) {
      toast.error('فشل تحميل بيانات الغرفة');
      navigate('/dashboard');
    }
  };

  const fetchSeats = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/seats`);
      setSeats(response.data.seats);
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
      setMessages(filteredMessages);
    } catch (error) {
      console.error('Failed to fetch messages');
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/participants`);
      setParticipants(response.data);
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
      fetchSeats();
      fetchSeatRequests();
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-purple-400 text-xl font-cairo">جاري التحميل...</div>
      </div>
    );
  }

  const speakers = seats.filter(s => s.occupied);
  const listeners = participants.filter(p => p.seat_number === null);

  return (
    <div className="bg-[#0a0a0a] fixed inset-0 overflow-hidden room-container">
      <div className="w-full max-w-[500px] mx-auto h-[100dvh] flex flex-col relative room-responsive">
        
        {/* Header - Fixed Top Bar */}
        <div className="bg-[#0a0a0a] px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-gray-800/50 room-header-safe">
          
          {/* Left: Close & Settings */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800 flex items-center justify-center"
              data-testid="close-room-btn"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2} />
            </button>
            {isOwner && (
              <button
                onClick={() => setShowRoomSettings(true)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-600 flex items-center justify-center"
                data-testid="room-settings-btn"
              >
                <Power className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Center: Participant Count */}
          <div className="relative">
            <button 
              onClick={() => setShowConnectedList(!showConnectedList)}
              className="flex items-center gap-2 bg-purple-600/30 border-2 border-purple-500/60 rounded-full px-4 py-2 hover:bg-purple-600/40 transition-colors"
              data-testid="connected-count-btn"
            >
              <Users className="w-5 h-5 text-purple-300" />
              <span className="text-white font-bold text-base font-chivo">{participants.length}</span>
              <span className="text-purple-200 text-sm font-almarai font-bold">متصل</span>
              <ChevronDown className={`w-4 h-4 text-purple-300 transition-transform ${showConnectedList ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Connected Users Dropdown */}
            <AnimatePresence>
              {showConnectedList && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-800">
                    <h3 className="text-white font-cairo font-bold text-sm text-center">المتصلون ({participants.length})</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {participants.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-gray-500 text-sm font-almarai">لا يوجد متصلون</p>
                      </div>
                    ) : (
                      participants.map((p) => (
                        <div key={p.user_id || p.id} className="flex items-center gap-3 p-3 hover:bg-gray-800/50 transition-colors">
                          <img 
                            src={p.user?.avatar || p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user?.username || p.username}`}
                            alt=""
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-cairo text-sm font-bold truncate">
                              {p.user?.name || p.user?.username || p.username || 'مستخدم'}
                            </p>
                            <p className="text-gray-500 text-xs" dir="ltr">
                              @{p.user?.username || p.username || 'user'}
                            </p>
                          </div>
                          {p.role === 'speaker' || speakers.some(s => s.user_id === (p.user_id || p.id)) ? (
                            <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
                              <Mic className="w-3 h-3 text-green-400" />
                              <span className="text-green-400 text-xs font-bold">متحدث</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-gray-700/50 px-2 py-1 rounded-full">
                              <span className="text-gray-400 text-xs">مستمع</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Room Name */}
          <h1 className="text-white font-cairo font-bold text-sm sm:text-lg truncate max-w-[80px] sm:max-w-[120px]">{room?.title || room?.name || 'الغرفة'}</h1>
        </div>

        {/* Speakers Section */}
        <div className="px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-b from-[#0a0a0a] to-transparent">
          <div className="flex justify-center gap-2 sm:gap-4 flex-wrap">
            {speakers.map((seat, index) => (
              <motion.div
                key={seat.seat_number}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <button
                  onClick={() => {
                    if (isOwner && seat.user.user_id !== user.id) {
                      setShowUserMenu(showUserMenu === seat.user.user_id ? null : seat.user.user_id);
                    }
                  }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 speaker-avatar rounded-full overflow-hidden border-2 transition-all ${
                    seat.user.is_speaking || (seat.user.user_id === user.id && isMicOn)
                      ? 'border-green-400 shadow-lg shadow-green-400/30'
                      : seat.user.is_muted
                      ? 'border-red-500'
                      : 'border-gray-700'
                  } ${isOwner && seat.user.user_id !== user.id ? 'cursor-pointer hover:scale-105' : ''}`}
                  data-testid={`speaker-${seat.seat_number}`}
                >
                  <img src={seat.user.avatar} alt={seat.user.username} className="w-full h-full object-cover" />
                </button>
                
                {/* Mic Status */}
                {seat.user.is_muted ? (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                    <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={2} />
                  </div>
                ) : (seat.user.is_speaking || (seat.user.user_id === user.id && isMicOn)) && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                    <Mic className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={2} />
                  </div>
                )}
                
                {/* Username */}
                <p className="text-[10px] sm:text-[11px] text-gray-400 text-center mt-1 truncate max-w-[56px] sm:max-w-[64px] font-almarai">
                  {seat.user.username}
                </p>

                {/* Owner User Menu */}
                <AnimatePresence>
                  {isOwner && showUserMenu === seat.user.user_id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute top-20 left-1/2 -translate-x-1/2 bg-gray-900 rounded-xl p-2 shadow-2xl border border-gray-700 z-50 min-w-[150px]"
                    >
                      <p className="text-xs text-gray-400 font-almarai text-center mb-2 pb-2 border-b border-gray-700">
                        {seat.user.username}
                      </p>
                      <div className="space-y-1">
                        {seat.user.is_muted ? (
                          <button onClick={() => { handleUnmuteUser(seat.user.user_id); setShowUserMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-green-400 text-sm font-almarai">
                            <Mic className="w-4 h-4" /> إلغاء الكتم
                          </button>
                        ) : (
                          <button onClick={() => { handleMuteUser(seat.user.user_id); setShowUserMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-yellow-400 text-sm font-almarai">
                            <MicOff className="w-4 h-4" /> كتم
                          </button>
                        )}
                        <button onClick={() => { handleRemoveFromStage(seat.user.user_id); setShowUserMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-orange-400 text-sm font-almarai">
                          <ArrowDownCircle className="w-4 h-4" /> إنزال
                        </button>
                        <button onClick={() => { handleKickUser(seat.user.user_id); setShowUserMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-red-400 text-sm font-almarai">
                          <UserX className="w-4 h-4" /> طرد
                        </button>
                        <button onClick={() => { setSelectedPromoteUser(seat.user); setShowPromoteModal(true); setShowUserMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-purple-400 text-sm font-almarai">
                          <Shield className="w-4 h-4" /> ترقية
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            
            {/* Empty Slots */}
            {speakers.length < 4 && Array.from({ length: Math.min(4 - speakers.length, 4) }).map((_, i) => (
              <div key={`empty-${i}`} className="w-14 h-14 sm:w-16 sm:h-16 speaker-avatar rounded-full bg-gray-800/30 border-2 border-dashed border-gray-700 flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" strokeWidth={1.5} />
              </div>
            ))}
          </div>
          
          {/* Live Stats Bar - Speakers Only */}
          <div className="flex items-center justify-center gap-4 mt-2 sm:mt-3 pb-2">
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-full px-3 sm:px-4 py-1 sm:py-1.5">
              <Mic className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-bold">{speakers.length}</span>
              <span className="text-green-400/80 text-sm font-almarai">متحدث</span>
            </div>
          </div>
        </div>

        {/* Main Content - Chat & Reactions */}
        <div className="flex-1 relative overflow-hidden chat-area">
          
          {/* Left Side - Reaction Buttons */}
          <div className="absolute left-2 sm:left-3 top-3 sm:top-4 z-20 flex flex-col gap-2 sm:gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendReaction('❤️')}
              className="w-10 h-10 sm:w-12 sm:h-12 reaction-btn rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/30 transition-all"
              data-testid="reaction-heart"
            >
              <span className="text-xl sm:text-2xl">❤️</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowReactions(!showReactions)}
              className="w-10 h-10 sm:w-12 sm:h-12 reaction-btn rounded-full bg-gray-800/60 border border-gray-700 flex items-center justify-center hover:bg-gray-700/60 transition-all"
              data-testid="reaction-emoji"
            >
              <span className="text-xl sm:text-2xl">😊</span>
            </motion.button>
            
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-1.5 sm:gap-2"
                >
                  {['🎉', '😮', '💯', '👏', '🔥', '😂'].map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { sendReaction(emoji); setShowReactions(false); }}
                      className="w-10 h-10 sm:w-12 sm:h-12 reaction-btn rounded-full bg-gray-800/60 border border-gray-700 flex items-center justify-center hover:bg-gray-700/60 transition-all"
                    >
                      <span className="text-lg sm:text-xl">{emoji}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat Messages */}
          <div className="h-full overflow-y-auto px-3 sm:px-4 pl-14 sm:pl-20 py-3 sm:py-4 space-y-2 sm:space-y-3 hide-scrollbar" style={{WebkitOverflowScrolling: 'touch'}}>

            {messages.map((message) => {
              const isOwnMessage = message.user_id === user.id;
              const isSystem = message.user_id === 'system';
              const isEmoji = /^[\u{1F300}-\u{1F9FF}]$/u.test(message.content);
              
              if (isSystem) {
                return (
                  <motion.div key={message.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-2 text-xs text-yellow-200 font-almarai">
                      {message.content}
                    </div>
                  </motion.div>
                );
              }

              if (isEmoji) {
                return (
                  <motion.div key={message.id} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
                    <span className="text-5xl">{message.content}</span>
                  </motion.div>
                );
              }

              return (
                <motion.div key={message.id} initial={{ opacity: 0, x: isOwnMessage ? 20 : -20 }} animate={{ opacity: 1, x: 0 }}
                  className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                  <img src={message.avatar} alt={message.username} className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isOwnMessage ? (
                        <>
                          <span className="text-xs text-gray-500 font-almarai">{message.username}</span>
                          <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-chivo">#1</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-chivo">#2</span>
                          <span className="text-xs text-gray-500 font-almarai">{message.username}</span>
                        </>
                      )}
                    </div>
                    <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl max-w-[180px] sm:max-w-[220px] ${
                      isOwnMessage ? 'bg-orange-500 text-white' : 'bg-gray-800 text-white'
                    } font-almarai text-xs sm:text-sm`}>
                      {message.content}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Right Side - Q&A Area with user badge */}
          <div className="absolute right-2 sm:right-3 bottom-3 sm:bottom-4 flex flex-col items-end gap-1.5 sm:gap-2">
            {participants.slice(0, 2).map((p, i) => (
              <motion.div key={p.user_id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }} className="flex items-center gap-1.5 sm:gap-2 bg-gray-800/60 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1">
                <span className="text-[10px] sm:text-xs text-gray-400 font-almarai">{p.username?.slice(0, 4)}</span>
                <span className="text-[8px] sm:text-[10px] bg-purple-500/30 text-purple-300 px-1 sm:px-1.5 py-0.5 rounded">#{i + 1}</span>
                <img src={p.avatar} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Seat Requests Bar (Admin/Mod only) */}
        {canManageStage && seatRequests.length > 0 && (
          <div className="bg-orange-500/10 border-t border-orange-500/30 px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm text-orange-400 font-almarai">{seatRequests.length} طلب</span>
              <p className="text-xs sm:text-sm text-orange-200 font-cairo font-bold">طلبات الصعود</p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar">
              {seatRequests.map((request) => (
                <div key={request.request_id} className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 bg-gray-900/50 rounded-full px-2 sm:px-3 py-1.5 sm:py-2">
                  <button onClick={() => handleRejectSeat(request.user_id)}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center">
                    <X className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </button>
                  <button onClick={() => handleApproveSeat(request.user_id)}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </button>
                  <span className="text-xs sm:text-sm text-white font-almarai">{request.username}</span>
                  <img src={request.avatar} alt={request.username} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="bg-[#0a0a0a] border-t border-gray-800 px-3 sm:px-4 py-2 sm:py-3 room-footer-safe">
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Gift Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { if (speakers.length > 0) { setSelectedUser(speakers[0].user); setShowGiftModal(true); } }}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center transition-colors flex-shrink-0"
              data-testid="gift-btn"
            >
              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
            </motion.button>

            {/* Request to Speak / Stage Controls */}
            {onStage ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                    isMicOn ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                  data-testid="toggle-mic-btn"
                >
                  {isMicOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLeaveSeat}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors flex-shrink-0"
                  data-testid="leave-stage-btn"
                >
                  <SignOut className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </motion.button>
                <div className="flex-1 text-center min-w-0">
                  <span className="text-green-400 font-cairo font-bold text-xs sm:text-sm">أنت على المنصة</span>
                </div>
              </>
            ) : (
              <>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                    isAudioMuted ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                  data-testid="volume-btn"
                >
                  {isAudioMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
                </motion.button>
                
                {canJoinStageDirect ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleJoinStageDirect}
                    className="flex-1 min-w-0 bg-gray-700 hover:bg-gray-600 text-white py-2.5 sm:py-3 rounded-full flex items-center justify-center gap-1.5 sm:gap-2 font-cairo font-bold text-xs sm:text-sm transition-colors"
                    data-testid="join-stage-direct-btn"
                  >
                    <Hand className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">طلب التحدث</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTakeSeat}
                    disabled={pendingRequest}
                    className={`flex-1 min-w-0 py-2.5 sm:py-3 rounded-full flex items-center justify-center gap-1.5 sm:gap-2 font-cairo font-bold text-xs sm:text-sm transition-colors ${
                      pendingRequest ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                    data-testid="request-seat-btn"
                  >
                    <Hand className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">{pendingRequest ? 'قيد المراجعة...' : 'طلب التحدث'}</span>
                  </motion.button>
                )}
              </>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-2 sm:mt-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="إرسال رسالة..."
              className="flex-1 min-w-0 bg-gray-800 border-gray-700 focus:border-purple-400 rounded-full text-white text-right font-almarai h-10 sm:h-11 text-sm"
              dir="rtl"
              data-testid="message-input"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-10 h-10 sm:w-11 sm:h-11 p-0 flex-shrink-0"
              data-testid="send-message-btn"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </form>
        </div>

        {/* Gift Modal */}
        <AnimatePresence>
          {showGiftModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
              onClick={() => setShowGiftModal(false)}>
              <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
                className="bg-gray-900 w-full max-w-[500px] mx-auto rounded-t-3xl p-6"
                onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-cairo font-bold text-white mb-4 text-right">
                  إرسال هدية إلى {selectedUser?.username}
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {gifts.map((gift) => (
                    <button key={gift.id} onClick={() => handleSendGift(gift.id)} disabled={userCoins < gift.coins}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        userCoins < gift.coins ? 'bg-gray-800/50 border-gray-700 opacity-50 cursor-not-allowed'
                          : 'bg-gray-800 border-gray-700 hover:border-purple-400 hover:scale-105'
                      }`}>
                      <span className="text-4xl">{gift.icon}</span>
                      <p className="text-sm text-white font-almarai">{gift.name}</p>
                      <p className="text-xs text-yellow-400 font-chivo">{gift.coins}</p>
                    </button>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 font-almarai">رصيدك: <span className="text-yellow-400 font-chivo">{userCoins}</span> عملة</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite Modal */}
        <AnimatePresence>
          {showInviteModal && myInvites.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                className="bg-gray-900 w-full max-w-[400px] mx-4 rounded-2xl p-6 border-2 border-purple-400">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <LogIn className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white mb-2">دعوة للصعود للمنصة!</h3>
                  <p className="text-gray-300 font-almarai text-sm">{myInvites[0].invited_by_name} يدعوك للصعود للمنصة والتحدث</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => handleRejectInvite(myInvites[0].invite_id)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-cairo font-bold py-3 rounded-xl">رفض</Button>
                  <Button onClick={() => handleAcceptInvite(myInvites[0].invite_id)}
                    className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-cairo font-bold py-3 rounded-xl">قبول والصعود</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promote Modal (Owner Only) */}
        <AnimatePresence>
          {showPromoteModal && selectedPromoteUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
              onClick={() => setShowPromoteModal(false)}>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                className="bg-gray-900 w-full max-w-[350px] mx-4 rounded-2xl p-6 border-2 border-purple-500"
                onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-4">
                  <img src={selectedPromoteUser.avatar} alt={selectedPromoteUser.username}
                    className="w-20 h-20 rounded-full mx-auto mb-3 ring-4 ring-purple-500" />
                  <h3 className="text-xl font-cairo font-bold text-white mb-1">ترقية {selectedPromoteUser.username}</h3>
                  <p className="text-gray-400 font-almarai text-sm">اختر الصلاحية الجديدة</p>
                </div>
                <div className="space-y-2">
                  <button onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'admin')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50">
                    <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-red-400" /><span className="text-white font-cairo font-bold">أدمن</span></div>
                    <span className="text-xs text-red-300 font-almarai">طرد + كتم + دعوة</span>
                  </button>
                  <button onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'mod')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50">
                    <div className="flex items-center gap-3"><Star className="w-5 h-5 text-yellow-400" /><span className="text-white font-cairo font-bold">مود</span></div>
                    <span className="text-xs text-yellow-300 font-almarai">قبول طلبات + صعود</span>
                  </button>
                  <button onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'user')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 border border-gray-600">
                    <div className="flex items-center gap-3"><Users className="w-5 h-5 text-gray-400" /><span className="text-white font-cairo font-bold">مستخدم عادي</span></div>
                    <span className="text-xs text-gray-400 font-almarai">إزالة الصلاحيات</span>
                  </button>
                </div>
                <button onClick={() => setShowPromoteModal(false)}
                  className="w-full mt-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 font-cairo font-bold">إلغاء</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Participants Modal (Owner Only) */}
        <AnimatePresence>
          {showParticipants && isOwner && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
              onClick={() => setShowParticipants(false)}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-[#1a1a1a] p-4 border-b border-gray-800 flex items-center justify-between">
                  <button onClick={() => setShowParticipants(false)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-white font-cairo font-bold text-lg">المشاركين ({participants.length})</h3>
                  <div className="w-8" />
                </div>
                <div className="overflow-y-auto max-h-[calc(80vh-70px)] p-4 space-y-2">
                  {participants.map((participant) => {
                    const isOnStage = participant.seat_number !== null;
                    const isSelf = participant.user_id === user.id;
                    return (
                      <div key={participant.user_id} className="bg-gray-800/50 rounded-xl p-3 flex items-center gap-3">
                        <img src={participant.avatar} alt={participant.username}
                          className={`w-12 h-12 rounded-full ${isOnStage ? 'ring-2 ring-green-400' : ''}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-cairo font-bold text-sm">{participant.username}</p>
                            {isOnStage && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-almarai">على المنصة</span>}
                            {participant.role === 'owner' && <Crown className="w-4 h-4 text-purple-400" />}
                            {participant.role === 'admin' && <Shield className="w-4 h-4 text-red-400" />}
                            {participant.role === 'mod' && <Star className="w-4 h-4 text-yellow-400" />}
                          </div>
                          <p className="text-gray-500 text-xs font-almarai">
                            {participant.role === 'owner' ? 'أونر' : participant.role === 'admin' ? 'أدمن' : participant.role === 'mod' ? 'مود' : 'مستخدم'}
                          </p>
                        </div>
                        {!isSelf && participant.role !== 'owner' && (
                          <div className="flex gap-2">
                            {isOnStage && (participant.is_muted ? (
                              <button onClick={() => handleUnmuteUser(participant.user_id)}
                                className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/30">
                                <Mic className="w-5 h-5" />
                              </button>
                            ) : (
                              <button onClick={() => handleMuteUser(participant.user_id)}
                                className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 hover:bg-yellow-500/30">
                                <MicOff className="w-5 h-5" />
                              </button>
                            ))}
                            {isOnStage && (
                              <button onClick={() => handleRemoveFromStage(participant.user_id)}
                                className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 hover:bg-orange-500/30">
                                <ArrowDownCircle className="w-5 h-5" />
                              </button>
                            )}
                            <button onClick={() => handleKickUser(participant.user_id)}
                              className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30">
                              <UserX className="w-5 h-5" />
                            </button>
                            <button onClick={() => { setSelectedPromoteUser(participant); setShowPromoteModal(true); setShowParticipants(false); }}
                              className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 hover:bg-purple-500/30">
                              <Shield className="w-5 h-5" />
                            </button>
                            {!isOnStage && (
                              <button onClick={() => handleInviteUser(participant.user_id, participant.username)}
                                className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/30">
                                <Hand className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room Settings Modal (Owner Only) */}
        <AnimatePresence>
          {showRoomSettings && isOwner && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
              onClick={() => setShowRoomSettings(false)}>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                className="bg-gray-900 w-full max-w-[350px] mx-4 rounded-2xl p-6 border-2 border-purple-500"
                onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Power className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white mb-1">إعدادات الغرفة</h3>
                  <p className="text-gray-400 font-almarai text-sm">{room?.name}</p>
                </div>
                <div className="space-y-3">
                  {/* Toggle Room */}
                  <button onClick={handleToggleRoom}
                    className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
                      room?.is_closed ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50' : 'bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50'
                    }`}>
                    <div className="flex items-center gap-3">
                      {room?.is_closed ? <Unlock className="w-6 h-6 text-green-400" /> : <Lock className="w-6 h-6 text-orange-400" />}
                      <div className="text-right">
                        <span className={`font-cairo font-bold ${room?.is_closed ? 'text-green-400' : 'text-orange-400'}`}>
                          {room?.is_closed ? 'فتح الغرفة' : 'إغلاق الغرفة'}
                        </span>
                        <p className="text-xs text-gray-400 font-almarai">
                          {room?.is_closed ? 'السماح للأعضاء بالانضمام' : 'منع الأعضاء من الانضمام'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${room?.is_closed ? 'bg-gray-700' : 'bg-green-500'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${room?.is_closed ? '' : 'translate-x-5'}`} />
                    </div>
                  </button>
                  {/* Close Room and Kick All */}
                  <button onClick={handleCloseAndKickAll}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50">
                    <Power className="w-6 h-6 text-orange-400" />
                    <div className="text-right flex-1">
                      <span className="text-orange-400 font-cairo font-bold">إغلاق وطرد الجميع</span>
                      <p className="text-xs text-gray-400 font-almarai">إغلاق الغرفة وطرد كل المشاركين</p>
                    </div>
                  </button>
                  {/* Delete Room */}
                  <button onClick={handleDeleteRoom}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50">
                    <Trash2 className="w-6 h-6 text-red-400" />
                    <div className="text-right flex-1">
                      <span className="text-red-400 font-cairo font-bold">حذف الغرفة</span>
                      <p className="text-xs text-gray-400 font-almarai">حذف الغرفة نهائياً</p>
                    </div>
                  </button>
                  {/* View Participants */}
                  <button onClick={() => { setShowParticipants(true); setShowRoomSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50">
                    <Users className="w-6 h-6 text-purple-400" />
                    <div className="text-right flex-1">
                      <span className="text-purple-400 font-cairo font-bold">إدارة المشاركين</span>
                      <p className="text-xs text-gray-400 font-almarai">{participants.length} مشارك</p>
                    </div>
                  </button>
                </div>
                <button onClick={() => setShowRoomSettings(false)}
                  className="w-full mt-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 font-cairo font-bold">إلغاء</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default YallaLiveRoom;
