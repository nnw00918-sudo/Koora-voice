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
  Crown
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
        `${API}/rooms/${roomId}/seat/take`,
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

  return (
    <div className="min-h-screen bg-slate-950 fixed inset-0 overflow-hidden room-container">
      <div className="max-w-md mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button
              data-testid="back-btn"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="icon"
              className="hover:bg-slate-800 text-slate-400"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <div className="flex-1 text-right">
              <h1 className="text-xl font-cairo font-bold text-white">{room.name}</h1>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-slate-400 font-almarai">{room.description}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sky-400">
              <Users className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm font-chivo">{participants.length}</span>
            </div>
          </div>
        </div>

        {/* Stage - المنصة */}
        <div className="bg-gradient-to-b from-slate-900/50 to-slate-950 border-b border-slate-800 p-4 flex-shrink-0 overflow-y-auto" style={{maxHeight: '45vh'}}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs text-slate-400 font-almarai">مباشر</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-lime-400 font-cairo font-bold">المنصة</p>
              <p className="text-xs text-slate-500 font-almarai">{speakers.length}/{room.total_seats || 12} مقعد</p>
            </div>
          </div>

          {/* Seats Grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {seats.map((seat) => (
              <motion.div
                key={seat.seat_number}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-1"
              >
                {seat.occupied ? (
                  <>
                    <div
                      className={`relative ${
                        seat.user.is_speaking || (seat.user.user_id === user.id && isMicOn)
                          ? 'ring-4 ring-lime-400 ring-opacity-50 speaking-pulse'
                          : 'ring-2 ring-slate-700'
                      } rounded-full`}
                    >
                      <img
                        src={seat.user.avatar}
                        alt={seat.user.username}
                        className="w-14 h-14 rounded-full"
                      />
                      {seat.user.room_role === 'owner' && (
                        <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" strokeWidth={2} />
                      )}
                      {seat.user.can_speak && seat.user.user_id === user.id && isMicOn && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center">
                          <Mic className="w-3 h-3 text-slate-950" strokeWidth={2} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 font-almarai max-w-[60px] truncate text-center">
                      {seat.user.username}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-slate-800/50 border-2 border-dashed border-slate-700 flex items-center justify-center">
                      <Users className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
                    </div>
                    <p className="text-xs text-slate-600 font-almarai">{seat.seat_number}</p>
                  </>
                )}
              </motion.div>
            ))}
          </div>

          {/* Stage Controls */}
          <div className="flex gap-2 justify-center">
            {onStage ? (
              <>
                <Button
                  data-testid="toggle-mic-btn"
                  onClick={toggleMic}
                  className={`${
                    isMicOn
                      ? 'bg-lime-400 hover:bg-lime-300 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  } rounded-full px-6 py-2 font-cairo font-bold`}
                >
                  {isMicOn ? (
                    <><Mic className="w-4 h-4 ml-2" strokeWidth={2} /> تحدث</>
                  ) : (
                    <><MicOff className="w-4 h-4 ml-2" strokeWidth={2} /> كتم</>
                  )}
                </Button>
                <Button
                  data-testid="leave-stage-btn"
                  onClick={handleLeaveSeat}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-2 font-cairo font-bold"
                >
                  <SignOut className="w-4 h-4 ml-2" strokeWidth={2} />
                  انزل
                </Button>
              </>
            ) : (
              <Button
                data-testid="take-seat-btn"
                onClick={handleTakeSeat}
                className="bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-full px-8 py-2 font-cairo font-bold"
              >
                <LogIn className="w-4 h-4 ml-2" strokeWidth={2} />
                اصعد للمنصة
              </Button>
            )}
          </div>
        </div>

        {/* Listeners List */}
        {listeners.length > 0 && (
          <div className="bg-slate-900/30 border-b border-slate-800 p-3 flex-shrink-0">
            <p className="text-xs text-slate-400 font-almarai mb-2">المستمعين ({listeners.length})</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {listeners.slice(0, 10).map((listener) => (
                <div key={listener.user_id} className="flex flex-col items-center gap-1">
                  <img
                    src={listener.avatar}
                    alt={listener.username}
                    className="w-10 h-10 rounded-full ring-1 ring-slate-700"
                  />
                </div>
              ))}
              {listeners.length > 10 && (
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="text-xs text-slate-400 font-chivo">+{listeners.length - 10}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-none" style={{WebkitOverflowScrolling: 'touch'}}>
          {messages.map((message) => {
            const isOwnMessage = message.user_id === user.id;
            const isSystem = message.user_id === 'system';
            
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

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
              >
                <img
                  src={message.avatar}
                  alt={message.username}
                  className="w-8 h-8 rounded-full ring-1 ring-slate-700"
                />
                <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                  <p className="text-xs text-slate-500 font-almarai mb-1">
                    {message.username}
                  </p>
                  <div
                    className={`inline-block px-4 py-2 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-lime-400 text-slate-950'
                        : 'bg-slate-800 text-white'
                    } font-almarai text-sm`}
                  >
                    {message.content}
                  </div>
                </div>
                {!isOwnMessage && (
                  <button
                    onClick={() => {
                      setSelectedUser(participants.find(p => p.user_id === message.user_id));
                      setShowGiftModal(true);
                    }}
                    className="text-slate-500 hover:text-yellow-400 transition-colors"
                  >
                    <Gift className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                )}
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 text-yellow-400">
              <span className="text-sm font-chivo font-bold">{userCoins}</span>
              <span className="text-xs font-almarai">عملة</span>
            </div>
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-full w-12 h-12 p-0 flex-shrink-0"
            >
              <Send className="w-5 h-5" strokeWidth={2} />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="flex-1 bg-slate-800 border-slate-700 focus:border-lime-400 rounded-full text-white text-right font-almarai"
              dir="rtl"
            />
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
                className="bg-slate-900 w-full max-w-md mx-auto rounded-t-3xl p-6"
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
      </div>
    </div>
  );
};

export default YallaLiveRoom;
