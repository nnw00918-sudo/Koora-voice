import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import BottomNavigation from '../components/BottomNavigation';
import { 
  ArrowRight, Search, Send, Check, CheckCheck, X, MessageCircle,
  Sparkles, Image, Mic, Smile, MoreVertical, Phone, Video, Trash2,
  UserPlus
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Enhanced Chat Background with pattern
const EnhancedChatBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Base gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
    
    {/* Subtle pattern overlay */}
    <div 
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2384cc16' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    />
    
    {/* Animated glow orbs */}
    <motion.div
      className="absolute top-20 right-10 w-72 h-72 bg-lime-500/8 rounded-full blur-3xl"
      animate={{
        x: [0, 40, 0],
        y: [0, 30, 0],
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-40 left-10 w-56 h-56 bg-emerald-500/8 rounded-full blur-3xl"
      animate={{
        x: [0, -30, 0],
        y: [0, -40, 0],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

// Enhanced Message Bubble with avatar
const EnhancedMessageBubble = ({ message, isRTL, formatTime, showAvatar, otherUser }) => {
  const isMine = message.is_mine;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`flex items-end gap-2 mb-4 ${isMine ? 'flex-row' : 'flex-row-reverse'}`}
    >
      {/* Avatar - only show for other's messages */}
      {!isMine && showAvatar && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-br from-lime-400 to-emerald-500">
            <img 
              src={otherUser?.avatar} 
              alt="" 
              className="w-full h-full rounded-full object-cover bg-slate-800"
            />
          </div>
        </motion.div>
      )}
      {!isMine && !showAvatar && <div className="w-8" />}
      
      {/* Message content */}
      <div className={`max-w-[75%] ${isMine ? 'order-1' : 'order-2'}`}>
        <motion.div
          className={`relative overflow-hidden ${
            isMine 
              ? 'bg-gradient-to-br from-lime-500 via-lime-400 to-emerald-500 text-slate-900 rounded-2xl rounded-bl-md shadow-lg shadow-lime-500/20' 
              : 'bg-slate-800/90 backdrop-blur-md text-white border border-slate-700/50 rounded-2xl rounded-br-md'
          }`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Shine effect for my messages */}
          {isMine && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            />
          )}
          
          <div className="relative px-4 py-3">
            <p className="font-almarai text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        </motion.div>
        
        {/* Time and read status */}
        <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${isMine ? 'justify-start' : 'justify-end'}`}>
          <span className="text-slate-500 text-[11px]">{formatTime(message.created_at)}</span>
          {isMine && (
            <motion.span 
              className={`${message.read ? 'text-lime-400' : 'text-slate-500'}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {message.read ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Date separator component
const DateSeparator = ({ date }) => (
  <div className="flex items-center justify-center my-6">
    <div className="bg-slate-800/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-700/30">
      <span className="text-slate-400 text-xs font-cairo">{date}</span>
    </div>
  </div>
);

// Typing indicator with animated dots
const TypingIndicator = () => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    className="flex items-end gap-2 mb-4 flex-row-reverse"
  >
    <div className="w-8" />
    <div className="bg-slate-800/90 backdrop-blur-md rounded-2xl rounded-br-md px-4 py-3 border border-slate-700/50">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 bg-lime-400 rounded-full"
            animate={{ 
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 0.6, 
              repeat: Infinity, 
              delay: i * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  </motion.div>
);

// Quick emoji reactions
const QuickReactions = ({ onSelect }) => {
  const emojis = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className="flex gap-1 bg-slate-800/90 backdrop-blur-md rounded-full p-2 border border-slate-700/50 shadow-xl"
    >
      {emojis.map((emoji) => (
        <motion.button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-700/50 text-lg"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
};

// Conversation card with glow
const ConversationCard = ({ convo, onClick, formatTime, txt }) => (
  <motion.button
    onClick={onClick}
    className="w-full p-4 text-right relative group"
    whileHover={{ backgroundColor: 'rgba(163, 230, 53, 0.05)' }}
    whileTap={{ scale: 0.98 }}
  >
    {/* Hover glow */}
    <div className="absolute inset-0 bg-gradient-to-l from-lime-500/0 via-lime-500/5 to-lime-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    
    <div className="flex items-center gap-3 flex-row-reverse relative">
      {/* Avatar with online indicator */}
      <div className="relative">
        <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-br from-lime-400 to-emerald-500">
          <img 
            src={convo.user.avatar} 
            alt="" 
            className="w-full h-full rounded-full object-cover bg-slate-800"
          />
        </div>
        {/* Unread badge */}
        {convo.unread_count > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -left-1 min-w-[22px] h-[22px] bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-lime-500/30"
          >
            <span className="text-slate-900 text-xs font-bold px-1">{convo.unread_count}</span>
          </motion.div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between flex-row-reverse mb-1">
          <span className="font-cairo font-bold text-white">{convo.user.name}</span>
          <span className="text-slate-500 text-xs">{formatTime(convo.last_message?.created_at)}</span>
        </div>
        <p className="text-slate-400 text-sm truncate text-right">
          {convo.last_message?.is_mine && <span className="text-lime-400">{txt.you}: </span>}
          {convo.last_message?.content || ''}
        </p>
      </div>
    </div>
  </motion.button>
);

const MessagesPage = ({ user }) => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { language } = useLanguage();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(conversationId ? 'chat' : 'list');
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  const txt = {
    messages: 'الرسائل',
    searchUsers: 'ابحث عن مستخدم...',
    noConversations: 'لا توجد محادثات',
    startChat: 'ابدأ محادثة جديدة',
    typeMessage: 'اكتب رسالة...',
    you: 'أنت',
    noMessages: 'ابدأ المحادثة',
    sayHi: 'أرسل أول رسالة 👋',
    typing: 'يكتب...',
    deleteChat: 'حذف المحادثة',
    confirmDelete: 'هل أنت متأكد من حذف هذه المحادثة؟',
    deleted: 'تم الحذف',
    noResults: 'لا توجد نتائج',
    message: 'رسالة',
  };

  // WebSocket connection
  useEffect(() => {
    if (!token) return;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/${token}`);
      
      ws.onopen = () => console.log('WS connected');
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          const msg = data.message;
          if (currentConversation?.id === msg.conversation_id) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, { ...msg, is_mine: msg.sender_id === user.id }];
            });
          }
          setConversations(prev => prev.map(c => 
            c.id === msg.conversation_id 
              ? { ...c, last_message: msg, unread_count: msg.sender_id !== user.id ? (c.unread_count || 0) + 1 : c.unread_count }
              : c
          ));
          if (msg.sender_id !== user.id) playMessageSound();
        }
        
        if (data.type === 'typing' && currentConversation?.id === data.conversation_id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
        
        if (data.type === 'messages_read' && currentConversation?.id === data.conversation_id) {
          setMessages(prev => prev.map(m => m.is_mine ? { ...m, read: true } : m));
        }
      };
      
      ws.onclose = () => setTimeout(connectWebSocket, 3000);
      wsRef.current = ws;
    };
    
    connectWebSocket();
    return () => wsRef.current?.close();
  }, [token, user.id, currentConversation?.id]);

  useEffect(() => {
    fetchConversations();
    if (conversationId) loadConversation(conversationId);
  }, [conversationId]);

  useEffect(() => {
    // Only scroll when new messages arrive, not when typing
    if (messages.length > 0) {
      // Use a small delay to avoid scrolling while typing
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]); // Only depend on length, not the entire array

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (convoId) => {
    try {
      const res = await axios.get(`${API}/conversations/${convoId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.messages || []);
      const convo = conversations.find(c => c.id === convoId);
      if (convo) setCurrentConversation(convo);
      setCurrentView('chat');
      markMessagesAsRead(convoId);
    } catch (error) {
      console.error('Error loading conversation');
    }
  };

  const markMessagesAsRead = async (convoId) => {
    try {
      await axios.post(`${API}/conversations/${convoId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(prev => prev.map(c => 
        c.id === convoId ? { ...c, unread_count: 0 } : c
      ));
    } catch (error) {}
  };

  const startConversation = async (otherUserId) => {
    try {
      const res = await axios.post(`${API}/conversations/${otherUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const convoId = res.data.conversation_id;
      setShowSearch(false);
      setSearchQuery('');
      navigate(`/messages/${convoId}`);
      fetchConversations();
    } catch (error) {
      toast.error('فشل بدء المحادثة');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;
    setSending(true);
    const messageContent = newMessage;
    setNewMessage('');
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversation_id: currentConversation.id,
        content: messageContent
      }));
      setSending(false);
    } else {
      const tempMessage = {
        id: Date.now().toString(),
        content: messageContent,
        is_mine: true,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempMessage]);
      
      try {
        await axios.post(`${API}/conversations/${currentConversation.id}/messages`, {
          content: messageContent
        }, { headers: { Authorization: `Bearer ${token}` } });
        fetchConversations();
      } catch (error) {
        toast.error('فشل الإرسال');
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      } finally {
        setSending(false);
      }
    }
  };

  const deleteConversation = async () => {
    if (!currentConversation || !window.confirm(txt.confirmDelete)) return;
    try {
      await axios.delete(`${API}/conversations/${currentConversation.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(txt.deleted);
      setCurrentConversation(null);
      setMessages([]);
      setCurrentView('list');
      fetchConversations();
      navigate('/messages');
    } catch (error) {
      toast.error('فشل الحذف');
    }
  };

  const handleTyping = () => {
    if (typingDebounceRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN && currentConversation) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: currentConversation.id
      }));
      typingDebounceRef.current = setTimeout(() => {
        typingDebounceRef.current = null;
      }, 1000);
    }
  };

  const playMessageSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.value = 0.1;
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
      if ('vibrate' in navigator) navigator.vibrate(50);
    } catch (e) {}
  };

  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await axios.get(`${API}/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data.users || []);
    } catch (error) {}
    finally { setSearchLoading(false); }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}د`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}س`;
    return date.toLocaleDateString('ar');
  };

  // ===================== VIEWS =====================

  // Conversations List
  const ConversationsList = () => (
    <div className="min-h-screen bg-slate-950 pb-24 relative">
      <EnhancedChatBackground />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-4 py-4 flex-row-reverse">
          <h1 className="text-xl font-cairo font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-lime-400" />
            {txt.messages}
          </h1>
          <motion.button 
            onClick={() => setShowSearch(true)}
            className="w-11 h-11 flex items-center justify-center bg-slate-800/50 rounded-full border border-slate-700/50"
            whileHover={{ scale: 1.05, borderColor: 'rgba(163, 230, 53, 0.5)' }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus className="w-5 h-5 text-lime-400" />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div 
              className="w-10 h-10 border-2 border-lime-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <motion.div 
              className="w-24 h-24 rounded-full bg-gradient-to-br from-lime-500/20 to-emerald-500/20 flex items-center justify-center mb-4 border border-lime-500/30"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MessageCircle className="w-12 h-12 text-lime-400" />
            </motion.div>
            <h3 className="text-white font-cairo font-bold text-lg mb-2">{txt.noConversations}</h3>
            <motion.button 
              onClick={() => setShowSearch(true)}
              className="text-lime-400 font-cairo flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <UserPlus className="w-4 h-4" />
              {txt.startChat}
            </motion.button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {conversations.map((convo) => (
              <ConversationCard
                key={convo.id}
                convo={convo}
                onClick={() => {
                  setCurrentConversation(convo);
                  navigate(`/messages/${convo.id}`);
                  loadConversation(convo.id);
                }}
                formatTime={formatTime}
                txt={txt}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavigation isRTL={isRTL} />
    </div>
  );

  // Chat View - Enhanced Design
  const ChatView = () => {
    const [showEmoji, setShowEmoji] = useState(false);
    
    // Group messages by date
    const groupMessagesByDate = () => {
      const groups = [];
      let currentDate = null;
      
      messages.forEach((msg, idx) => {
        const msgDate = new Date(msg.created_at).toLocaleDateString('ar-SA');
        if (msgDate !== currentDate) {
          groups.push({ type: 'date', date: msgDate });
          currentDate = msgDate;
        }
        // Check if should show avatar (first message or different sender than previous)
        const prevMsg = messages[idx - 1];
        const showAvatar = !msg.is_mine && (!prevMsg || prevMsg.is_mine || 
          new Date(msg.created_at) - new Date(prevMsg?.created_at) > 60000);
        groups.push({ type: 'message', data: msg, showAvatar });
      });
      
      return groups;
    };
    
    const handleEmojiSelect = (emoji) => {
      setNewMessage(prev => prev + emoji);
      setShowEmoji(false);
    };
    
    return (
      <div 
        className="fixed inset-0 bg-slate-950 flex flex-col"
        style={{ 
          height: '100dvh', // Use dynamic viewport height
          touchAction: 'manipulation' // Prevent zoom on double tap
        }}
      >
        <EnhancedChatBackground />
        
        {/* Enhanced Header */}
        <div className="flex-shrink-0 z-20 relative">
          {/* Main header */}
          <div className="bg-slate-950/70 backdrop-blur-2xl border-b border-slate-800/30">
            <div className="flex items-center gap-3 p-3 flex-row-reverse">
              {/* Back button */}
              <motion.button 
                onClick={() => { setCurrentView('list'); navigate('/messages'); }}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-800/50 border border-slate-700/30"
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(163, 230, 53, 0.1)' }}
                whileTap={{ scale: 0.9 }}
              >
                <ArrowRight className="w-5 h-5 text-white" />
              </motion.button>
              
              {/* User info */}
              {currentConversation && (
                <motion.div 
                  className="flex items-center gap-3 flex-1 flex-row-reverse cursor-pointer"
                  onClick={() => navigate(`/user/${currentConversation.user.id}`)}
                  whileHover={{ x: -3 }}
                >
                  {/* Avatar with glow */}
                  <div className="relative">
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-full blur-md opacity-40"
                      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-lime-400 to-emerald-500">
                      <img 
                        src={currentConversation.user.avatar} 
                        alt="" 
                        className="w-full h-full rounded-full object-cover bg-slate-800"
                      />
                    </div>
                    {/* Online indicator */}
                    <motion.div 
                      className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-lime-400 rounded-full border-2 border-slate-950"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  
                  {/* Name and status */}
                  <div className="text-right flex-1">
                    <p className="font-cairo font-bold text-white text-base">{currentConversation.user.name}</p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <motion.div 
                        className="w-2 h-2 bg-lime-400 rounded-full"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <p className="text-lime-400 text-xs font-almarai">متصل الآن</p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <motion.button 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 border border-slate-700/30"
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(163, 230, 53, 0.1)' }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Phone className="w-4 h-4 text-lime-400" />
                </motion.button>
                <motion.button 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 border border-slate-700/30"
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(163, 230, 53, 0.1)' }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Video className="w-4 h-4 text-lime-400" />
                </motion.button>
                <motion.button 
                  onClick={() => setShowOptions(!showOptions)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 border border-slate-700/30"
                  whileHover={{ scale: 1.1 }}
                >
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </motion.button>
              </div>
            </div>
          </div>
          
          {/* Options dropdown */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute left-4 top-full mt-2 bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden z-30 shadow-xl"
              >
                <button
                  onClick={() => { deleteConversation(); setShowOptions(false); }}
                  className="flex items-center gap-3 px-5 py-3.5 text-red-400 hover:bg-red-500/10 w-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-cairo text-sm">{txt.deleteChat}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Messages Area */}
        <div 
          className="flex-1 overflow-y-auto px-4 py-2 relative z-10" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain' // Prevent scroll chaining
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="relative"
              >
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-lime-500/30 to-emerald-500/30 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-lime-500/20 to-emerald-500/20 flex items-center justify-center border border-lime-500/30">
                  <Send className="w-10 h-10 text-lime-400" />
                </div>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white font-cairo font-bold text-lg mt-6"
              >
                {txt.noMessages}
              </motion.p>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-slate-500 text-sm mt-2"
              >
                {txt.sayHi}
              </motion.p>
            </div>
          ) : (
            <>
              {groupMessagesByDate().map((item, idx) => (
                item.type === 'date' ? (
                  <DateSeparator key={`date-${idx}`} date={item.date} />
                ) : (
                  <EnhancedMessageBubble 
                    key={item.data.id} 
                    message={item.data}
                    showAvatar={item.showAvatar}
                    otherUser={currentConversation?.user}
                    isRTL={isRTL} 
                    formatTime={formatTime}
                  />
                )
              ))}
              
              <AnimatePresence>
                {isTyping && <TypingIndicator />}
              </AnimatePresence>
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area */}
        <div 
          className="flex-shrink-0 relative z-20"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {/* Quick emoji picker */}
          <AnimatePresence>
            {showEmoji && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3">
                <QuickReactions onSelect={handleEmojiSelect} />
              </div>
            )}
          </AnimatePresence>
          
          {/* Input container */}
          <div className="bg-slate-950/70 backdrop-blur-2xl border-t border-slate-800/30 px-3 py-3">
            <div className="flex items-center gap-2 flex-row-reverse">
              {/* Main input */}
              <div className="flex-1 relative">
                <div className="flex items-center bg-slate-800/60 backdrop-blur border border-slate-700/30 rounded-full overflow-hidden focus-within:border-lime-500/50 transition-colors">
                  {/* Emoji button */}
                  <motion.button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="p-3 text-slate-400 hover:text-lime-400 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Smile className="w-5 h-5" />
                  </motion.button>
                  
                  {/* Text input */}
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    onFocus={(e) => {
                      handleTyping();
                      // Prevent iOS/Android from scrolling on focus
                      e.target.scrollIntoView({ behavior: 'instant', block: 'nearest' });
                    }}
                    placeholder={txt.typeMessage}
                    className="flex-1 bg-transparent py-3 text-white font-almarai text-right outline-none placeholder-slate-500"
                    style={{ fontSize: '16px' }}
                    autoComplete="off"
                    inputMode="text"
                    enterKeyHint="send"
                  />
                  
                  {/* Attachment buttons */}
                  {!newMessage && (
                    <>
                      <motion.button
                        className="p-3 text-slate-400 hover:text-lime-400 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Image className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        className="p-3 text-slate-400 hover:text-lime-400 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Mic className="w-5 h-5" />
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Send button */}
              <motion.button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  newMessage.trim() 
                    ? 'bg-gradient-to-r from-lime-500 to-emerald-500 shadow-lime-500/30' 
                    : 'bg-slate-800/60 shadow-none'
                }`}
                whileHover={newMessage.trim() ? { scale: 1.1 } : {}}
                whileTap={newMessage.trim() ? { scale: 0.9 } : {}}
              >
                <Send className={`w-5 h-5 rotate-180 ${newMessage.trim() ? 'text-slate-900' : 'text-slate-500'}`} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Search Modal
  const SearchModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950 z-50"
    >
      <ChatBackground />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4">
          <div className="flex items-center gap-3 flex-row-reverse">
            <motion.button 
              onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.button>
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={txt.searchUsers}
                className="w-full bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-full pr-12 pl-4 py-3 text-white font-almarai text-right outline-none focus:border-lime-500/50"
                style={{ fontSize: '16px' }}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="divide-y divide-slate-800/50">
          {searchLoading ? (
            <div className="flex items-center justify-center py-10">
              <motion.div 
                className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : searchResults.length === 0 && searchQuery ? (
            <p className="text-center text-slate-500 py-10 font-cairo">{txt.noResults}</p>
          ) : (
            searchResults.map((u) => (
              <motion.div 
                key={u.id} 
                className="flex items-center justify-between p-4 flex-row-reverse"
                whileHover={{ backgroundColor: 'rgba(163, 230, 53, 0.05)' }}
              >
                <div 
                  className="flex items-center gap-3 flex-1 flex-row-reverse cursor-pointer"
                  onClick={() => navigate(`/user/${u.id}`)}
                >
                  <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-lime-400 to-emerald-500">
                    <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover bg-slate-800" />
                  </div>
                  <div className="text-right">
                    <p className="font-cairo font-bold text-white">{u.name}</p>
                    <p className="text-slate-500 text-sm" dir="ltr">@{u.username}</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => startConversation(u.id)}
                  className="px-5 py-2.5 bg-gradient-to-r from-lime-500 to-emerald-500 text-slate-900 font-cairo font-bold rounded-full text-sm shadow-lg shadow-lime-500/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {txt.message}
                </motion.button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {currentView === 'list' && <ConversationsList />}
      {currentView === 'chat' && <ChatView />}
      <AnimatePresence>
        {showSearch && <SearchModal />}
      </AnimatePresence>
    </>
  );
};

export default MessagesPage;
