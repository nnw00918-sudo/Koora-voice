import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Mic, MicOff, Send, Users } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RoomPage = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMicOn, setIsMicOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    joinRoom();
    fetchRoomData();
    startPolling();

    return () => {
      leaveRoom();
      stopPolling();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startPolling = () => {
    pollInterval.current = setInterval(() => {
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
      const [roomRes, participantsRes, messagesRes] = await Promise.all([
        axios.get(`${API}/rooms/${roomId}`),
        axios.get(`${API}/rooms/${roomId}/participants`),
        axios.get(`${API}/rooms/${roomId}/messages`)
      ]);

      setRoom(roomRes.data);
      setParticipants(participantsRes.data);
      setMessages(messagesRes.data);
      setLoading(false);
    } catch (error) {
      toast.error('فشل تحميل بيانات الغرفة');
      navigate('/dashboard');
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/rooms/${roomId}/messages`);
      setMessages(response.data);
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
      scrollToBottom();
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
    }
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    toast.info(isMicOn ? 'تم كتم الميكروفون' : 'تم تشغيل الميكروفون');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-lime-400 text-xl font-cairo">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button
              data-testid="back-to-dashboard-btn"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="icon"
              className="hover:bg-slate-800 text-slate-400"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <div className="flex-1 text-right">
              <h1 className="text-xl font-cairo font-bold text-white">{room.name}</h1>
              <p className="text-xs text-slate-400 font-almarai">{room.description}</p>
            </div>
            <div className="flex items-center gap-1 text-sky-400">
              <Users className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm font-chivo">{participants.length}</span>
            </div>
          </div>
        </div>

        {/* Voice Stage */}
        <div className="bg-slate-900/30 border-b border-slate-800 p-6">
          <div className="flex flex-wrap justify-center gap-4">
            {participants.slice(0, 8).map((participant) => (
              <motion.div
                key={participant.user_id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`relative ${
                    participant.is_speaking
                      ? 'ring-4 ring-lime-400 ring-opacity-50 speaking-pulse'
                      : 'ring-2 ring-slate-700'
                  } rounded-full`}
                >
                  <img
                    src={participant.avatar}
                    alt={participant.username}
                    className="w-16 h-16 rounded-full"
                  />
                  {participant.user_id === user.id && isMicOn && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center">
                      <Mic className="w-3 h-3 text-slate-950" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-300 font-almarai max-w-[70px] truncate">
                  {participant.username}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Mic Control */}
          <div className="mt-6 flex justify-center">
            <Button
              data-testid="toggle-mic-btn"
              onClick={toggleMic}
              className={`${
                isMicOn
                  ? 'bg-lime-400 hover:bg-lime-300 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              } rounded-full w-16 h-16 p-0 shadow-lg transition-all active:scale-95`}
            >
              {isMicOn ? (
                <Mic className="w-7 h-7" strokeWidth={2} />
              ) : (
                <MicOff className="w-7 h-7" strokeWidth={2} />
              )}
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar" data-testid="chat-messages-container">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 font-almarai mt-8">
              لا توجد رسائل بعد. كن أول من يبدأ المحادثة!
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.user_id === user.id;
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
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Button
              data-testid="send-message-btn"
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-lime-400 hover:bg-lime-300 text-slate-950 rounded-full w-12 h-12 p-0 flex-shrink-0"
            >
              <Send className="w-5 h-5" strokeWidth={2} />
            </Button>
            <Input
              data-testid="message-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="flex-1 bg-slate-800 border-slate-700 focus:border-lime-400 rounded-full text-white text-right font-almarai"
              dir="rtl"
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
