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
  Settings
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
  // Role permissions
  const isOwner = user.role === 'owner';
  const isAdmin = user.role === 'admin';
  const isMod = user.role === 'mod';
  const canManageStage = ['owner', 'admin', 'mod'].includes(user.role); // approve/reject mic requests
  const canKickMute = ['owner', 'admin'].includes(user.role); // kick, mute, invite
  const canJoinStageDirect = ['owner', 'admin', 'mod'].includes(user.role); // join stage without request
  const [myInvites, setMyInvites] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedPromoteUser, setSelectedPromoteUser] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const agoraClient = useRef(null);
  const agoraUid = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
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
              if (!exists) {
                return [...prev, remoteUser];
              }
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
      if (canManageStage) {
        fetchSeatRequests();
      }
      fetchMyInvites();
    }, 3000);
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
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
      if (myParticipant && myParticipant.seat_number !== null) {
        setOnStage(true);
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
      if (invites.length > 0 && !showInviteModal) {
        setShowInviteModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch invites');
    }
  };

  const joinRoom = async () => {
    try {
      await axios.post(
        `${API}/rooms/${roomId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to join room');
    }
  };

  const leaveRoom = async () => {
    try {
      await axios.post(
        `${API}/rooms/${roomId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to leave room');
    }
  };

  const handleTakeSeat = async () => {
    try {
      const response = await axios.post(
        `${API}/rooms/${roomId}/seat/request`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setPendingRequest(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الطلب');
    }
  };

  const handleJoinStageDirect = async () => {
    try {
      const response = await axios.post(
        `${API}/rooms/${roomId}/seat/join-direct`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setOnStage(true);
      fetchSeats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الصعود للمنصة');
    }
  };

  const handleApproveSeat = async (userId) => {
    try {
      await axios.post(
        `${API}/rooms/${roomId}/seat/approve/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تمت الموافقة على الطلب');
      fetchSeats();
      fetchSeatRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشلت الموافقة');
    }
  };

  const handleRejectSeat = async (userId) => {
    try {
      await axios.post(
        `${API}/rooms/${roomId}/seat/reject/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.info('تم رفض الطلب');
      fetchSeatRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الرفض');
    }
  };

  const handleKickUser = async (userId) => {
    if (!window.confirm('هل أنت متأكد من طرد هذا العضو؟')) return;
    
    try {
      await axios.post(
        `${API}/rooms/${roomId}/kick/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم طرد العضو');
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الطرد');
    }
  };

  const handleMuteUser = async (userId) => {
    try {
      await axios.post(
        `${API}/rooms/${roomId}/mute/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم كتم العضو');
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل الكتم');
    }
  };

  const handleUnmuteUser = async (userId) => {
    try {
      await axios.post(
        `${API}/rooms/${roomId}/unmute/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('تم إلغاء كتم العضو');
      fetchSeats();
      fetchParticipants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إلغاء الكتم');
    }
  };

  const handleInviteUser = async (userId, username) => {
    try {
      await axios.post(
        `${API}/rooms/${roomId}/seat/invite/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`تم إرسال دعوة إلى ${username}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الدعوة');
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      const response = await axios.post(
        `${API}/rooms/${roomId}/seat/invites/${inviteId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      await axios.post(
        `${API}/rooms/${roomId}/seat/invites/${inviteId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.info('رفضت الدعوة');
      setShowInviteModal(false);
      fetchMyInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل رفض الدعوة');
    }
  };

  // Owner: Promote user
  const handlePromoteUser = async (userId, newRole) => {
    try {
      const response = await axios.post(
        `${API}/rooms/${roomId}/promote/${userId}`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      if (isMicOn) {
        await toggleMic();
      }
      const response = await axios.post(
        `${API}/rooms/${roomId}/seat/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'music_standard',
        });
        setLocalAudioTrack(audioTrack);
        await agoraClient.current.publish([audioTrack]);
        setIsMicOn(true);
        toast.success('✅ تم تشغيل الميكروفون');
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
        errorMessage = '❌ تم رفض إذن الميكروفون';
      }
      toast.error(errorMessage);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(
        `${API}/rooms/${roomId}/messages`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
    }
  };

  const handleSendGift = async (giftId) => {
    if (!selectedUser) return;

    try {
      const response = await axios.post(
        `${API}/rooms/${roomId}/gift`,
        { gift_id: giftId, recipient_id: selectedUser.user_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setUserCoins(response.data.remaining_coins);
      setShowGiftModal(false);
      setSelectedUser(null);
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إرسال الهدية');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-lime-400 text-xl font-cairo">جاري التحميل...</div>
      </div>
    );
  }

  const speakers = seats.filter(s => s.occupied);
  const listeners = participants.filter(p => p.seat_number === null);

  // Reactions list
  const reactions = ['❤️', '😂', '🎉', '😮', '💯', '👏', '🔥'];

  // Send reaction
  const sendReaction = async (emoji) => {
    try {
      await axios.post(
        `${API}/rooms/${roomId}/messages`,
        { content: emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
    } catch (error) {
      console.error('Failed to send reaction');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] fixed inset-0 overflow-hidden room-container">
      <div className="max-w-[600px] mx-auto h-screen flex flex-col relative">
        
        {/* Speakers Row - Top */}
        <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-4">
          {/* Speaker Avatars */}
          <div className="flex justify-center gap-3 mb-3">
            {speakers.slice(0, 6).map((seat, index) => (
              <motion.div
                key={seat.seat_number}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                <button
                  onClick={() => {
                    if (isOwner && seat.user.user_id !== user.id) {
                      setShowUserMenu(showUserMenu === seat.user.user_id ? null : seat.user.user_id);
                    }
                  }}
                  className={`w-16 h-16 rounded-full overflow-hidden ${
                    seat.user.is_speaking || (seat.user.user_id === user.id && isMicOn)
                      ? 'ring-4 ring-lime-400 animate-pulse'
                      : 'ring-2 ring-slate-600'
                  } ${isOwner && seat.user.user_id !== user.id ? 'cursor-pointer' : ''}`}
                >
                  <img
                    src={seat.user.avatar}
                    alt={seat.user.username}
                    className="w-full h-full object-cover"
                  />
                </button>
                {/* Mic indicator */}
                {seat.user.is_muted && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <MicOff className="w-3 h-3 text-white" strokeWidth={2} />
                  </div>
                )}
                {seat.user.can_speak && !seat.user.is_muted && (seat.user.is_speaking || (seat.user.user_id === user.id && isMicOn)) && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center">
                    <Mic className="w-3 h-3 text-black" strokeWidth={2} />
                  </div>
                )}
                {/* Username */}
                <p className="text-[10px] text-slate-400 text-center mt-1 truncate max-w-[60px] font-almarai">
                  {seat.user.username}
                </p>
                
                {/* Owner Control Menu */}
                <AnimatePresence>
                  {isOwner && showUserMenu === seat.user.user_id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-slate-900 rounded-xl p-2 shadow-xl border border-slate-700 z-50 min-w-[140px]"
                    >
                      <p className="text-xs text-slate-400 font-almarai text-center mb-2 pb-2 border-b border-slate-700">
                        {seat.user.username}
                      </p>
                      <div className="space-y-1">
                        {seat.user.is_muted ? (
                          <button
                            onClick={() => { handleUnmuteUser(seat.user.user_id); setShowUserMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-green-400 text-sm font-almarai"
                          >
                            <Mic className="w-4 h-4" strokeWidth={2} />
                            إلغاء الكتم
                          </button>
                        ) : (
                          <button
                            onClick={() => { handleMuteUser(seat.user.user_id); setShowUserMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-yellow-400 text-sm font-almarai"
                          >
                            <MicOff className="w-4 h-4" strokeWidth={2} />
                            كتم
                          </button>
                        )}
                        <button
                          onClick={() => { handleKickUser(seat.user.user_id); setShowUserMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-red-400 text-sm font-almarai"
                        >
                          <UserX className="w-4 h-4" strokeWidth={2} />
                          طرد
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPromoteUser(seat.user);
                            setShowPromoteModal(true);
                            setShowUserMenu(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-purple-400 text-sm font-almarai"
                        >
                          <Shield className="w-4 h-4" strokeWidth={2} />
                          ترقية
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {/* Empty slots */}
            {speakers.length < 4 && Array.from({ length: Math.min(4 - speakers.length, 4) }).map((_, i) => (
              <div key={`empty-${i}`} className="w-16 h-16 rounded-full bg-slate-800/50 border-2 border-dashed border-slate-700 flex items-center justify-center">
                <Users className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
              </div>
            ))}
          </div>
        </div>

        {/* Control Header Bar */}
        <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              data-testid="close-btn"
              onClick={() => navigate('/dashboard')}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1.5">
              <div className="w-4 h-4 bg-purple-500 rounded flex items-center justify-center">
                <Star className="w-2.5 h-2.5 text-white" strokeWidth={2} fill="white" />
              </div>
              <span className="text-sm text-white font-chivo">{userCoins} XP</span>
            </div>
          </div>
          
          <h2 className="text-white font-cairo font-bold text-sm">المحادثة المباشرة</h2>
          
          {/* Participants Button - Clickable for Owner */}
          <button
            onClick={() => isOwner && setShowParticipants(true)}
            className={`flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1.5 ${isOwner ? 'hover:bg-slate-700 cursor-pointer' : ''}`}
          >
            <Users className="w-4 h-4 text-slate-400" strokeWidth={2} />
            <span className="text-sm text-white font-chivo">{participants.length}</span>
            {isOwner && <Settings className="w-3 h-3 text-purple-400" strokeWidth={2} />}
          </button>
        </div>

        {/* Main Content Area - Chat + Reactions */}
        <div className="flex-1 flex relative overflow-hidden">
          
          {/* Reactions Panel - Left Side */}
          <div className="absolute left-2 top-4 z-20 flex flex-col gap-2">
            <button
              onClick={() => sendReaction('❤️')}
              className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center hover:bg-red-500/40 transition-colors"
            >
              <span className="text-xl">❤️</span>
            </button>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <span className="text-xl">😊</span>
            </button>
            
            {/* Expanded Reactions */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-2"
                >
                  {['🎉', '😮', '💯', '👏', '🔥', '😂'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        sendReaction(emoji);
                        setShowReactions(false);
                      }}
                      className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
                    >
                      <span className="text-xl">{emoji}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 pl-16 space-y-3" style={{WebkitOverflowScrolling: 'touch'}}>
            {/* Welcome Message */}
            <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
              <p className="text-slate-300 text-sm font-almarai text-right">
                أهلاً بك في الدردشة المباشرة. لا تنس حماية خصوصيتك والالتزام بإرشادات المنتدى.
              </p>
              <button className="text-blue-400 text-xs font-almarai mt-2 hover:underline">
                مزيد من المعلومات ↓
              </button>
            </div>

            {messages.map((message) => {
              const isOwnMessage = message.user_id === user.id;
              const isSystem = message.user_id === 'system';
              const isEmoji = /^[\u{1F300}-\u{1F9FF}]$/u.test(message.content);
              
              if (isSystem) {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center"
                  >
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-2 text-xs text-yellow-200 font-almarai">
                      {message.content}
                    </div>
                  </motion.div>
                );
              }

              // Emoji only message - show big
              if (isEmoji) {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center"
                  >
                    <span className="text-5xl">{message.content}</span>
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
                  <img
                    src={message.avatar}
                    alt={message.username}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isOwnMessage ? (
                        <>
                          <span className="text-xs text-slate-500 font-almarai">{message.username}</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-chivo">#1</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-chivo">#2</span>
                          <span className="text-xs text-slate-500 font-almarai">{message.username}</span>
                        </>
                      )}
                    </div>
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[250px] ${
                        isOwnMessage
                          ? 'bg-amber-500 text-black'
                          : 'bg-slate-800 text-white'
                      } font-almarai text-sm`}
                    >
                      {message.content}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Admin/Mod: Seat Requests */}
        {canManageStage && seatRequests.length > 0 && (
          <div className="bg-amber-500/10 border-t border-amber-500/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-400 font-almarai">{seatRequests.length} طلب</span>
              <p className="text-sm text-amber-200 font-cairo font-bold">طلبات الصعود</p>
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {seatRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="flex-shrink-0 flex items-center gap-2 bg-slate-900/50 rounded-full px-3 py-2"
                >
                  <button
                    onClick={() => handleRejectSeat(request.user_id)}
                    className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleApproveSeat(request.user_id)}
                    className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-white" strokeWidth={2} />
                  </button>
                  <span className="text-sm text-white font-almarai">{request.username}</span>
                  <img
                    src={request.avatar}
                    alt={request.username}
                    className="w-8 h-8 rounded-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="bg-[#1a1a1a] border-t border-slate-800 p-3">
          <div className="flex items-center gap-3">
            {/* Mic/Stage Controls */}
            {onStage ? (
              <>
                <button
                  data-testid="toggle-mic-btn"
                  onClick={toggleMic}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isMicOn ? 'bg-lime-500' : 'bg-slate-700'
                  }`}
                >
                  {isMicOn ? (
                    <Mic className="w-6 h-6 text-black" strokeWidth={2} />
                  ) : (
                    <MicOff className="w-6 h-6 text-white" strokeWidth={2} />
                  )}
                </button>
                <button
                  data-testid="leave-stage-btn"
                  onClick={handleLeaveSeat}
                  className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                >
                  <SignOut className="w-6 h-6 text-white" strokeWidth={2} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAudioMuted(!isAudioMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isAudioMuted ? 'bg-red-500' : 'bg-amber-500'
                }`}
              >
                {isAudioMuted ? (
                  <VolumeX className="w-6 h-6 text-white" strokeWidth={2} />
                ) : (
                  <Volume2 className="w-6 h-6 text-white" strokeWidth={2} />
                )}
              </button>
            )}
            
            {/* Request to Speak / Stage Button */}
            {!onStage && (
              canJoinStageDirect ? (
                <button
                  data-testid="join-stage-direct-btn"
                  onClick={handleJoinStageDirect}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-full flex items-center justify-center gap-2 font-cairo font-bold transition-colors"
                >
                  <Hand className="w-5 h-5" strokeWidth={2} />
                  Request to speak
                </button>
              ) : (
                <button
                  data-testid="request-seat-btn"
                  onClick={handleTakeSeat}
                  disabled={pendingRequest}
                  className={`flex-1 py-3 rounded-full flex items-center justify-center gap-2 font-cairo font-bold transition-colors ${
                    pendingRequest
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <Hand className="w-5 h-5" strokeWidth={2} />
                  {pendingRequest ? 'طلبك قيد المراجعة...' : 'Request to speak'}
                </button>
              )
            )}
            
            {onStage && (
              <div className="flex-1 text-center">
                <span className="text-lime-400 font-cairo font-bold text-sm">أنت على المنصة</span>
              </div>
            )}
            
            {/* Gift Button */}
            <button
              onClick={() => {
                if (speakers.length > 0) {
                  setSelectedUser(speakers[0].user);
                  setShowGiftModal(true);
                }
              }}
              className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center transition-colors"
            >
              <Gift className="w-6 h-6 text-white" strokeWidth={2} />
            </button>
          </div>
          
          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2 mt-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="إرسال رسالة..."
              className="flex-1 bg-slate-800 border-slate-700 focus:border-lime-400 rounded-full text-white text-right font-almarai h-11"
              dir="rtl"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-11 h-11 p-0 flex-shrink-0"
            >
              <Send className="w-5 h-5" strokeWidth={2} />
            </Button>
          </form>
        </div>

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
                className="bg-slate-900 w-full max-w-[600px] mx-auto rounded-t-3xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-cairo font-bold text-white mb-4 text-right">
                  إرسال هدية إلى {selectedUser?.username}
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {gifts.map((gift) => (
                    <button
                      key={gift.id}
                      onClick={() => handleSendGift(gift.id)}
                      disabled={userCoins < gift.coins}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        userCoins < gift.coins
                          ? 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed'
                          : 'bg-slate-800 border-slate-700 hover:border-lime-400 hover:scale-105'
                      }`}
                    >
                      <span className="text-4xl">{gift.icon}</span>
                      <p className="text-sm text-white font-almarai">{gift.name}</p>
                      <p className="text-xs text-yellow-400 font-chivo">{gift.coins}</p>
                    </button>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-400 font-almarai">
                    رصيدك: <span className="text-yellow-400 font-chivo">{userCoins}</span> عملة
                  </p>
                </div>
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-slate-900 w-full max-w-[400px] mx-4 rounded-2xl p-6 border-2 border-lime-400"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <LogIn className="w-8 h-8 text-lime-400" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-cairo font-bold text-white mb-2">
                    دعوة للصعود للمنصة!
                  </h3>
                  <p className="text-slate-300 font-almarai text-sm">
                    {myInvites[0].invited_by_name} يدعوك للصعود للمنصة والتحدث
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleRejectInvite(myInvites[0].invite_id)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-cairo font-bold py-3 rounded-xl"
                  >
                    رفض
                  </Button>
                  <Button
                    onClick={() => handleAcceptInvite(myInvites[0].invite_id)}
                    className="flex-1 bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold py-3 rounded-xl"
                  >
                    قبول والصعود
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promote Modal (Owner Only) */}
        <AnimatePresence>
          {showPromoteModal && selectedPromoteUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
              onClick={() => setShowPromoteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-slate-900 w-full max-w-[350px] mx-4 rounded-2xl p-6 border-2 border-purple-500"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-4">
                  <img
                    src={selectedPromoteUser.avatar}
                    alt={selectedPromoteUser.username}
                    className="w-20 h-20 rounded-full mx-auto mb-3 ring-4 ring-purple-500"
                  />
                  <h3 className="text-xl font-cairo font-bold text-white mb-1">
                    ترقية {selectedPromoteUser.username}
                  </h3>
                  <p className="text-slate-400 font-almarai text-sm">
                    اختر الصلاحية الجديدة
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'admin')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-red-400" strokeWidth={2} />
                      <span className="text-white font-cairo font-bold">أدمن</span>
                    </div>
                    <span className="text-xs text-red-300 font-almarai">طرد + كتم + دعوة</span>
                  </button>
                  
                  <button
                    onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'mod')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-yellow-400" strokeWidth={2} />
                      <span className="text-white font-cairo font-bold">مود</span>
                    </div>
                    <span className="text-xs text-yellow-300 font-almarai">قبول طلبات + صعود</span>
                  </button>
                  
                  <button
                    onClick={() => handlePromoteUser(selectedPromoteUser.user_id, 'user')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-slate-400" strokeWidth={2} />
                      <span className="text-white font-cairo font-bold">مستخدم عادي</span>
                    </div>
                    <span className="text-xs text-slate-400 font-almarai">إزالة الصلاحيات</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowPromoteModal(false)}
                  className="w-full mt-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-cairo font-bold transition-colors"
                >
                  إلغاء
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Participants Modal (Owner Only) */}
        <AnimatePresence>
          {showParticipants && isOwner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
              onClick={() => setShowParticipants(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-3xl max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 bg-[#1a1a1a] p-4 border-b border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setShowParticipants(false)}
                    className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
                  >
                    <X className="w-5 h-5" strokeWidth={2} />
                  </button>
                  <h3 className="text-white font-cairo font-bold text-lg">المشاركين ({participants.length})</h3>
                  <div className="w-8" />
                </div>

                {/* Participants List */}
                <div className="overflow-y-auto max-h-[calc(80vh-70px)] p-4 space-y-2">
                  {participants.map((participant) => {
                    const isOnStage = participant.seat_number !== null;
                    const isSelf = participant.user_id === user.id;
                    
                    return (
                      <div
                        key={participant.user_id}
                        className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3"
                      >
                        <img
                          src={participant.avatar}
                          alt={participant.username}
                          className={`w-12 h-12 rounded-full ${isOnStage ? 'ring-2 ring-lime-400' : ''}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-cairo font-bold text-sm">{participant.username}</p>
                            {isOnStage && (
                              <span className="text-[10px] bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded-full font-almarai">
                                على المنصة
                              </span>
                            )}
                            {participant.role === 'owner' && (
                              <Crown className="w-4 h-4 text-purple-400" strokeWidth={2} />
                            )}
                            {participant.role === 'admin' && (
                              <Shield className="w-4 h-4 text-red-400" strokeWidth={2} />
                            )}
                            {participant.role === 'mod' && (
                              <Star className="w-4 h-4 text-yellow-400" strokeWidth={2} />
                            )}
                          </div>
                          <p className="text-slate-500 text-xs font-almarai">
                            {participant.role === 'owner' ? 'أونر' : 
                             participant.role === 'admin' ? 'أدمن' : 
                             participant.role === 'mod' ? 'مود' : 'مستخدم'}
                          </p>
                        </div>
                        
                        {/* Control Buttons - Not for self or other owners */}
                        {!isSelf && participant.role !== 'owner' && (
                          <div className="flex gap-2">
                            {/* Mute/Unmute (only if on stage) */}
                            {isOnStage && (
                              participant.is_muted ? (
                                <button
                                  onClick={() => handleUnmuteUser(participant.user_id)}
                                  className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/30 transition-colors"
                                >
                                  <Mic className="w-5 h-5" strokeWidth={2} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMuteUser(participant.user_id)}
                                  className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                                >
                                  <MicOff className="w-5 h-5" strokeWidth={2} />
                                </button>
                              )
                            )}
                            
                            {/* Kick */}
                            <button
                              onClick={() => handleKickUser(participant.user_id)}
                              className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                              <UserX className="w-5 h-5" strokeWidth={2} />
                            </button>
                            
                            {/* Promote */}
                            <button
                              onClick={() => {
                                setSelectedPromoteUser(participant);
                                setShowPromoteModal(true);
                                setShowParticipants(false);
                              }}
                              className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 hover:bg-purple-500/30 transition-colors"
                            >
                              <Shield className="w-5 h-5" strokeWidth={2} />
                            </button>
                            
                            {/* Invite to Stage (if not on stage) */}
                            {!isOnStage && (
                              <button
                                onClick={() => handleInviteUser(participant.user_id, participant.username)}
                                className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 hover:bg-lime-500/30 transition-colors"
                              >
                                <Hand className="w-5 h-5" strokeWidth={2} />
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
      </div>
    </div>
  );
};

export default YallaLiveRoom;
