import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import BottomNavigation from '../components/BottomNavigation';
import { 
  ArrowRight, Search, Send, Check, CheckCheck, X, MessageCircle,
  Trash2, UserPlus, Sparkles
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Animated background orbs for messages
const ChatBackground = ({ isDarkMode }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className={`absolute inset-0 ${isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F5]'}`} />
    <motion.div
      className={`absolute top-1/4 right-1/4 w-64 h-64 ${isDarkMode ? 'bg-lime-500/5' : 'bg-lime-500/10'} rounded-full blur-3xl`}
      animate={{ 
        x: [0, 30, 0], 
        y: [0, -20, 0],
        scale: [1, 1.1, 1]
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className={`absolute bottom-1/3 left-1/4 w-48 h-48 ${isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-500/10'} rounded-full blur-3xl`}
      animate={{ 
        x: [0, -20, 0], 
        y: [0, 30, 0],
        scale: [1, 1.2, 1]
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

// ============ CHAT VIEW COMPONENT (Separate to prevent re-renders) ============
const ChatView = memo(function ChatView({ 
  conversation, 
  messages, 
  onBack, 
  onDelete, 
  onSend,
  txt,
  isDarkMode
}) {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Theme classes
  const theme = {
    bg: isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F5]',
    headerBg: isDarkMode ? 'bg-black/70' : 'bg-white/90',
    headerBorder: isDarkMode ? 'border-white/10' : 'border-black/5',
    textPrimary: isDarkMode ? 'text-white' : 'text-[#171717]',
    textSecondary: isDarkMode ? 'text-[#A3A3A3]' : 'text-[#525252]',
    inputBg: isDarkMode ? 'bg-[#141414]' : 'bg-white',
    inputBorder: isDarkMode ? 'border-[#262626]' : 'border-[#E5E5E5]',
    cardBg: isDarkMode ? 'bg-[#141414]' : 'bg-white',
    primary: isDarkMode ? '#CCFF00' : '#84CC16',
    myBubbleBg: isDarkMode ? 'from-[#CCFF00] to-emerald-500' : 'from-[#84CC16] to-emerald-500',
    otherBubbleBg: isDarkMode ? 'bg-[#141414] border-[#262626]' : 'bg-white border-[#E5E5E5]',
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;
    
    const text = inputValue.trim();
    setInputValue('');
    setSending(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
    
    try {
      await onSend(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
    // Auto resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`relative flex flex-col h-screen ${theme.bg}`} style={{ height: '100dvh' }}>
      <ChatBackground isDarkMode={isDarkMode} />
      
      {/* Header - Glassmorphism */}
      <div className={`relative flex items-center gap-3 px-4 py-3 ${theme.headerBg} backdrop-blur-xl border-b ${theme.headerBorder} flex-shrink-0 z-10`}>
        <motion.button 
          onClick={onBack} 
          className="p-2 rounded-full hover:opacity-80"
          style={{ color: theme.primary }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowRight className="w-5 h-5" />
        </motion.button>
        
        <div className="relative">
          <img
            src={conversation?.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation?.user?.username}`}
            alt=""
            className={`w-11 h-11 rounded-full cursor-pointer hover:opacity-80 ring-2 ${theme.cardBg}`}
            style={{ ringColor: `${theme.primary}30` }}
            onClick={() => window.location.href = `/user/${conversation?.user?.id}`}
          />
          {/* Online indicator */}
          <motion.div 
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ${isDarkMode ? 'ring-[#0A0A0A]' : 'ring-[#F5F5F5]'}`}
            style={{ backgroundColor: theme.primary }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        
        <div className="flex-1 text-right">
          <p 
            className={`font-cairo font-bold cursor-pointer hover:opacity-80 transition-colors ${theme.textPrimary}`}
            onClick={() => window.location.href = `/user/${conversation?.user?.id}`}
          >
            {conversation?.user?.name || conversation?.user?.username}
          </p>
          <p className="text-xs font-almarai" style={{ color: theme.primary }}>{txt.online}</p>
        </div>

        <motion.button
          onClick={onDelete}
          className={`p-2 ${theme.textSecondary} hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-full transition-colors`}
          whileTap={{ scale: 0.9 }}
        >
          <Trash2 className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto px-4 py-4 z-10">
        {messages.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full ${theme.textSecondary}`}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-20 h-20 rounded-full ${theme.cardBg} flex items-center justify-center mb-4 ring-1 ${isDarkMode ? 'ring-[#262626]' : 'ring-[#E5E5E5]'}`}
            >
              <Sparkles className="w-10 h-10" style={{ color: `${theme.primary}50` }} />
            </motion.div>
            <p className="font-almarai">{txt.startConversation}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex ${msg.is_mine ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.is_mine 
                      ? `bg-gradient-to-br ${theme.myBubbleBg} text-black rounded-bl-md shadow-[0_0_15px_rgba(204,255,0,0.2)]` 
                      : `${theme.otherBubbleBg} ${theme.textPrimary} rounded-br-md border`
                  } ${msg.sending ? 'opacity-70' : ''}`}
                >
                  <p className={`text-[15px] text-right whitespace-pre-wrap break-words font-almarai ${msg.is_mine ? 'text-black' : ''}`}>
                    {msg.content}
                  </p>
                  <div className={`flex items-center gap-1 mt-1.5 ${msg.is_mine ? 'justify-start' : 'justify-end'}`}>
                    <span className={`text-[11px] ${msg.is_mine ? 'text-black/60' : theme.textSecondary}`}>
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.is_mine && !msg.sending && (
                      msg.read 
                        ? <CheckCheck className="w-4 h-4 text-black/60" />
                        : <Check className="w-4 h-4 text-black/40" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - Glassmorphism */}
      <div className={`relative ${theme.headerBg} backdrop-blur-xl border-t ${theme.headerBorder} px-4 py-3 flex-shrink-0 z-10`}>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={txt.typeMessage}
            className={`flex-1 ${theme.inputBg} ${theme.textPrimary} px-4 py-3 rounded-2xl outline-none text-right resize-none border ${theme.inputBorder} font-almarai`}
            style={{ fontSize: '16px', minHeight: '44px', maxHeight: '120px' }}
            dir="rtl"
            rows={1}
          />
          
          <motion.button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className="p-3 text-black rounded-full flex-shrink-0 disabled:opacity-50 shadow-[0_0_15px_rgba(204,255,0,0.3)]"
            style={{ backgroundColor: theme.primary }}
            whileTap={{ scale: 0.9 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
});

// ============ MAIN COMPONENT ============
export default function MessagesPage() {
  const { language } = useLanguage();
  const { isDarkMode } = useSettings();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(conversationId ? 'chat' : 'list');
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  const token = localStorage.getItem('token');
  const wsRef = useRef(null);
  
  // WebSocket connection for real-time messages
  useEffect(() => {
    if (!token) return;
    
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${WS_URL}/ws/${token}`);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setWsConnected(true);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'new_message') {
              // Add new message to current conversation
              if (currentConversation && data.message.conversation_id === currentConversation.id) {
                setMessages(prev => {
                  // Avoid duplicates
                  if (prev.some(m => m.id === data.message.id)) return prev;
                  return [...prev, data.message];
                });
              }
              
              // Update conversation list
              setConversations(prev => prev.map(c => 
                c.id === data.message.conversation_id 
                  ? { ...c, last_message: { content: data.message.content, created_at: data.message.created_at } }
                  : c
              ));
            }
          } catch (err) {
            console.error('WebSocket message error:', err);
          }
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setWsConnected(false);
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        wsRef.current = ws;
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, currentConversation]);

  // Theme classes
  const theme = {
    bg: isDarkMode ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F5]',
    headerBg: isDarkMode ? 'bg-black/70' : 'bg-white/90',
    headerBorder: isDarkMode ? 'border-white/10' : 'border-black/5',
    textPrimary: isDarkMode ? 'text-white' : 'text-[#171717]',
    textSecondary: isDarkMode ? 'text-[#A3A3A3]' : 'text-[#525252]',
    inputBg: isDarkMode ? 'bg-[#141414]' : 'bg-white',
    inputBorder: isDarkMode ? 'border-[#262626]' : 'border-[#E5E5E5]',
    cardBg: isDarkMode ? 'bg-[#141414]' : 'bg-white',
    cardHover: isDarkMode ? 'hover:bg-[#141414]' : 'hover:bg-[#F9F9F9]',
    border: isDarkMode ? 'border-[#1A1A1A]' : 'border-[#E5E5E5]',
    primary: isDarkMode ? '#CCFF00' : '#84CC16',
    ring: isDarkMode ? 'ring-[#262626]' : 'ring-[#E5E5E5]',
  };

  const txt = {
    messages: 'الرسائل',
    searchUsers: 'ابحث عن مستخدم...',
    noConversations: 'لا توجد محادثات',
    startChat: 'ابدأ محادثة جديدة',
    typeMessage: 'اكتب رسالة...',
    online: 'متصل',
    you: 'أنت',
    noResults: 'لا توجد نتائج',
    startConversation: 'ابدأ المحادثة'
  };

  const fetchConversations = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000 // 10 second timeout
      });
      setConversations(res.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations');
      // Don't show error to user, just show empty state
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadConversation = useCallback(async (convoId) => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/conversations/${convoId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error('Error loading messages');
    }
  }, [token]);

  const searchUsers = useCallback(async (query) => {
    if (!query.trim() || !token) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await axios.get(`${API}/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data.users || res.data || []);
    } catch (error) {
      console.error('Error searching users');
    } finally {
      setSearchLoading(false);
    }
  }, [token]);

  const startConversation = useCallback(async (userId, user) => {
    if (!token) return;
    try {
      const res = await axios.post(`${API}/conversations/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const convoId = res.data.conversation_id;
      setCurrentConversation({ id: convoId, user });
      setMessages([]);
      setCurrentView('chat');
      setShowSearch(false);
      setSearchQuery('');
      navigate(`/messages/${convoId}`);
    } catch (error) {
      toast.error('فشل بدء المحادثة');
    }
  }, [token, navigate]);

  const sendMessage = useCallback(async (content) => {
    if (!currentConversation) return;
    
    const tempMessage = {
      id: Date.now().toString(),
      content,
      is_mine: true,
      created_at: new Date().toISOString(),
      sending: true
    };
    
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Try WebSocket first for instant delivery
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message',
          conversation_id: currentConversation.id,
          content
        }));
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? { ...m, sending: false } : m
        ));
      } else {
        // Fallback to HTTP
        await axios.post(
          `${API}/conversations/${currentConversation.id}/messages`,
          { content },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? { ...m, sending: false } : m
        ));
      }
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      throw error;
    }
  }, [currentConversation, token]);

  const deleteConversation = useCallback(async () => {
    if (!currentConversation) return;
    try {
      await axios.delete(`${API}/conversations/${currentConversation.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم حذف المحادثة');
      setCurrentView('list');
      setCurrentConversation(null);
      setMessages([]);
      navigate('/messages');
      fetchConversations();
    } catch (error) {
      toast.error('فشل حذف المحادثة');
    }
  }, [currentConversation, token, navigate, fetchConversations]);

  const openConversation = useCallback((convo) => {
    setCurrentConversation(convo);
    setCurrentView('chat');
    loadConversation(convo.id);
    navigate(`/messages/${convo.id}`);
  }, [loadConversation, navigate]);

  const handleBack = useCallback(() => {
    setCurrentView('list');
    setCurrentConversation(null);
    navigate('/messages');
  }, [navigate]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load conversation when navigating directly to a conversation URL
  useEffect(() => {
    const loadDirectConversation = async () => {
      if (!conversationId || !token) return;
      
      // First check if conversation exists in the list
      const convo = conversations.find(c => c.id === conversationId);
      if (convo) {
        setCurrentConversation(convo);
        setCurrentView('chat');
        loadConversation(conversationId);
        return;
      }
      
      // If not in list but we have an ID, try to load it directly
      if (conversations.length === 0 && !loading) {
        // Conversations haven't loaded yet, wait for them
        return;
      }
      
      // Try to fetch the conversation directly
      try {
        const res = await axios.get(`${API}/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          setCurrentConversation(res.data);
          setCurrentView('chat');
          loadConversation(conversationId);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        // Conversation not found, go back to list
        navigate('/messages');
      }
    };
    
    loadDirectConversation();
  }, [conversationId, conversations, loadConversation, token, loading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  // ============ RENDER ============
  if (currentView === 'chat' && currentConversation) {
    return (
      <ChatView
        conversation={currentConversation}
        messages={messages}
        onBack={handleBack}
        onDelete={deleteConversation}
        onSend={sendMessage}
        txt={txt}
        isDarkMode={isDarkMode}
      />
    );
  }

  // Conversation List
  return (
    <div className={`relative flex flex-col h-screen ${theme.bg}`} style={{ height: '100dvh' }}>
      <ChatBackground isDarkMode={isDarkMode} />
      
      {/* Header - Glassmorphism */}
      <div className={`relative flex items-center justify-between px-4 py-4 ${theme.headerBg} backdrop-blur-xl border-b ${theme.headerBorder} z-10`}>
        <h1 className={`text-xl font-cairo font-bold ${theme.textPrimary}`}>{txt.messages}</h1>
        <div className="flex items-center gap-1">
          <motion.button
            onClick={() => setShowSearch(true)}
            className="p-2.5 rounded-full transition-colors hover:opacity-80"
            style={{ color: theme.primary }}
            whileTap={{ scale: 0.9 }}
          >
            <Search className="w-5 h-5" />
          </motion.button>
          <motion.button
            onClick={() => setShowSearch(true)}
            className="p-2.5 rounded-full transition-colors hover:opacity-80"
            style={{ color: theme.primary }}
            whileTap={{ scale: 0.9 }}
          >
            <UserPlus className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0A0A0A] z-50 flex flex-col"
          >
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[#262626]">
              <motion.button 
                onClick={() => { setShowSearch(false); setSearchQuery(''); }} 
                className="text-[#CCFF00] p-2 rounded-full hover:bg-[#CCFF00]/10"
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={txt.searchUsers}
                className="flex-1 bg-[#141414] text-white px-4 py-3 rounded-2xl outline-none text-right border border-[#262626] focus:border-[#CCFF00]/50 font-almarai"
                style={{ fontSize: '16px' }}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user, index) => (
                  <motion.button
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => startConversation(user.id, user)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#141414] border-b border-[#1A1A1A] transition-colors"
                  >
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-12 h-12 rounded-full bg-[#141414] hover:opacity-80 ring-2 ring-[#262626]"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/user/${user.id}`;
                      }}
                    />
                    <div className="flex-1 text-right">
                      <p 
                        className="text-white font-cairo font-bold hover:text-[#CCFF00] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/user/${user.id}`;
                        }}
                      >
                        {user.name || user.username}
                      </p>
                      <p className="text-[#A3A3A3] text-sm font-almarai">@{user.username}</p>
                    </div>
                  </motion.button>
                ))
              ) : searchQuery && (
                <p className="text-center text-[#A3A3A3] py-8 font-almarai">{txt.noResults}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversations List */}
      <div className="relative flex-1 overflow-y-auto z-10">
        {loading ? (
          /* Skeleton Loading - Faster perceived loading */
          <div className="space-y-0">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-[#1A1A1A] animate-pulse">
                <div className="w-14 h-14 rounded-full bg-[#262626]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#262626] rounded w-24 mr-auto" />
                  <div className="h-3 bg-[#1A1A1A] rounded w-32 mr-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#A3A3A3] px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 rounded-full bg-[#141414] flex items-center justify-center mb-4 ring-1 ring-[#262626]"
            >
              <MessageCircle className="w-12 h-12 text-[#262626]" />
            </motion.div>
            <p className="text-lg mb-2 font-cairo">{txt.noConversations}</p>
            <motion.button
              onClick={() => setShowSearch(true)}
              className="mt-4 px-6 py-3 bg-[#CCFF00] text-black rounded-full font-cairo font-bold shadow-[0_0_20px_rgba(204,255,0,0.3)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {txt.startChat}
            </motion.button>
          </div>
        ) : (
          conversations.map((convo, index) => (
            <motion.button
              key={convo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => openConversation(convo)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#141414] border-b border-[#1A1A1A] transition-colors"
            >
              <div className="relative">
                <img
                  src={convo.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.user?.username}`}
                  alt={convo.user?.username}
                  className="w-14 h-14 rounded-full bg-[#141414] ring-2 ring-[#262626]"
                />
                {/* Online indicator - random for demo */}
                {index % 2 === 0 && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#CCFF00] rounded-full ring-2 ring-[#0A0A0A]" />
                )}
              </div>
              <div className="flex-1 text-right min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A3A3A3]">
                    {convo.last_message?.created_at && formatTime(convo.last_message.created_at)}
                  </span>
                  <span className="text-white font-cairo font-bold truncate">
                    {convo.user?.name || convo.user?.username}
                  </span>
                </div>
                <p className="text-[#A3A3A3] text-sm truncate mt-1 font-almarai">
                  {convo.last_message?.is_mine && <span className="text-[#CCFF00]">{txt.you}: </span>}
                  {convo.last_message?.content || txt.startConversation}
                </p>
              </div>
              {convo.unread_count > 0 && (
                <span className="bg-[#CCFF00] text-black text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] text-center shadow-[0_0_10px_rgba(204,255,0,0.4)]">
                  {convo.unread_count}
                </span>
              )}
            </motion.button>
          ))
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
