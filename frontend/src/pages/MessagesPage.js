import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import BottomNavigation from '../components/BottomNavigation';
import { 
  Home, Trophy, Settings, MessageSquare, User, ArrowRight, ArrowLeft,
  Search, Send, Check, CheckCheck, MoreHorizontal, X, MessageCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const MessagesPage = ({ user }) => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { language, t } = useLanguage();
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
  const [wsConnected, setWsConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const txt = {
    ar: {
      messages: 'الرسائل',
      searchUsers: 'ابحث عن مستخدم...',
      noConversations: 'لا توجد محادثات',
      startChat: 'ابدأ محادثة جديدة',
      typeMessage: 'اكتب رسالة...',
      you: 'أنت',
      noMessages: 'لا توجد رسائل',
      sayHi: 'قل مرحباً!',
      online: 'متصل',
      lastSeen: 'آخر ظهور',
      search: 'بحث',
      noResults: 'لا توجد نتائج',
      follow: 'متابعة',
      following: 'متابَع',
      message: 'رسالة',
    },
    en: {
      messages: 'Messages',
      searchUsers: 'Search users...',
      noConversations: 'No conversations',
      startChat: 'Start a new chat',
      typeMessage: 'Type a message...',
      you: 'You',
      noMessages: 'No messages yet',
      sayHi: 'Say hi!',
      online: 'Online',
      lastSeen: 'Last seen',
      search: 'Search',
      noResults: 'No results',
      follow: 'Follow',
      following: 'Following',
      message: 'Message',
      typing: 'typing...',
    }
  }[language];

  // WebSocket connection
  useEffect(() => {
    if (!token) return;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/${token}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          const msg = data.message;
          
          // Update messages if we're in the same conversation
          if (currentConversation?.id === msg.conversation_id) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, {
                ...msg,
                is_mine: msg.sender_id === user.id
              }];
            });
          }
          
          // Update conversations list
          setConversations(prev => prev.map(c => 
            c.id === msg.conversation_id 
              ? { ...c, last_message: msg.content, last_message_at: msg.created_at }
              : c
          ));
          
          // Play sound for incoming messages (not from self)
          if (msg.sender_id !== user.id) {
            playMessageSound();
          }
        }
        
        if (data.type === 'typing' && currentConversation?.id === data.conversation_id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
        
        // Handle messages read notification
        if (data.type === 'messages_read' && currentConversation?.id === data.conversation_id) {
          // Mark all our messages as read
          setMessages(prev => prev.map(m => 
            m.is_mine ? { ...m, read: true } : m
          ));
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
    };
    
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, user.id]);

  // Update WebSocket message handler when conversation changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.onmessage) {
      // Re-bind the handler with new currentConversation
    }
  }, [currentConversation]);

  useEffect(() => {
    fetchConversations();
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      
      // Find conversation details
      const convo = conversations.find(c => c.id === convoId);
      if (convo) {
        setCurrentConversation(convo);
      }
      setCurrentView('chat');
      
      // Mark messages as read
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
    } catch (error) {
      console.error('Error marking messages as read');
    }
  };

  const startConversation = async (otherUserId) => {
    try {
      const res = await axios.post(`${API}/conversations/${otherUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const convoId = res.data.conversation_id;
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      navigate(`/messages/${convoId}`);
      loadConversation(convoId);
      fetchConversations();
    } catch (error) {
      toast.error(isRTL ? 'فشل بدء المحادثة' : 'Failed to start conversation');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;
    setSending(true);
    
    const messageContent = newMessage;
    setNewMessage('');
    
    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversation_id: currentConversation.id,
        content: messageContent
      }));
      setSending(false);
    } else {
      // Fallback to REST API
      const tempMessage = {
        id: Date.now().toString(),
        content: messageContent,
        is_mine: true,
        created_at: new Date().toISOString(),
        sender: { id: user.id, username: user.username, avatar: user.avatar }
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      try {
        await axios.post(`${API}/conversations/${currentConversation.id}/messages`, {
          content: messageContent
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchConversations();
      } catch (error) {
        toast.error(isRTL ? 'فشل الإرسال' : 'Failed to send');
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      } finally {
        setSending(false);
      }
    }
  };

  const handleTyping = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentConversation) {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: currentConversation.id
      }));
      
      // Throttle typing indicator
      typingTimeoutRef.current = setTimeout(() => {}, 2000);
    }
  };

  const playMessageSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.08;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
      
      // Vibrate on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.log('Audio not available');
    }
  };

  const searchUsers = async (query) => {
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
    } catch (error) {
      console.error('Search error');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return isRTL ? 'الآن' : 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${isRTL ? 'د' : 'm'}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${isRTL ? 'س' : 'h'}`;
    return date.toLocaleDateString();
  };

  // Conversations List View
  const ConversationsList = () => (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-slate-800 z-10">
        <div className={`flex items-center justify-between p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h1 className="text-xl font-cairo font-bold text-white">{txt.messages}</h1>
          <button 
            onClick={() => setShowSearch(true)}
            className="w-10 h-10 flex items-center justify-center text-white hover:bg-slate-800 rounded-full"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conversations */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-slate-700" />
          </div>
          <h3 className="text-white font-cairo font-bold text-lg mb-2">{txt.noConversations}</h3>
          <button 
            onClick={() => setShowSearch(true)}
            className="text-sky-400 font-almarai"
          >
            {txt.startChat}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => {
                setCurrentConversation(convo);
                navigate(`/messages/${convo.id}`);
                loadConversation(convo.id);
              }}
              className={`w-full p-4 hover:bg-slate-900/50 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="relative">
                  <img src={convo.user.avatar} alt="" className="w-12 h-12 rounded-full" />
                  {convo.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{convo.unread_count}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-cairo font-bold text-white">{convo.user.name}</span>
                    <span className="text-slate-500 text-xs">{formatTime(convo.last_message?.created_at)}</span>
                  </div>
                  <p className={`text-slate-400 text-sm truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                    {convo.last_message?.is_mine && <span className="text-slate-500">{txt.you}: </span>}
                    {convo.last_message?.content || ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation isRTL={isRTL} />
    </div>
  );

  // Chat View
  const ChatView = () => (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-slate-800 z-10">
        <div className={`flex items-center gap-3 p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={() => {
              setCurrentView('list');
              navigate('/messages');
            }}
            className="w-10 h-10 flex items-center justify-center"
          >
            <BackIcon className="w-6 h-6 text-white" />
          </button>
          {currentConversation && (
            <button 
              onClick={() => navigate(`/user/${currentConversation.user.id}`)}
              className={`flex items-center gap-3 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <img src={currentConversation.user.avatar} alt="" className="w-10 h-10 rounded-full" />
              <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="font-cairo font-bold text-white">{currentConversation.user.name}</p>
                <p className="text-slate-500 text-xs" dir="ltr">@{currentConversation.user.username}</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-slate-500 font-almarai">{txt.noMessages}</p>
            <p className="text-slate-600 text-sm">{txt.sayHi}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.is_mine ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}>
              <div className={`max-w-[75%] ${msg.is_mine ? 'order-1' : 'order-2'}`}>
                <div className={`rounded-2xl px-4 py-2 ${msg.is_mine ? 'bg-sky-500 text-white' : 'bg-slate-800 text-white'}`}>
                  <p className="font-almarai text-sm">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 ${msg.is_mine ? (isRTL ? 'justify-start flex-row-reverse' : 'justify-end') : (isRTL ? 'justify-end flex-row-reverse' : 'justify-start')}`}>
                  <span className="text-slate-600 text-xs">{formatTime(msg.created_at)}</span>
                  {msg.is_mine && (
                    <span className={`text-xs ${msg.read ? 'text-sky-400' : 'text-slate-500'}`}>
                      {msg.read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}}
        {isTyping && (
          <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <div className="bg-slate-800 rounded-2xl px-4 py-2">
              <p className="text-slate-400 text-sm font-almarai">{txt.typing}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-4 bg-black">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={txt.typeMessage}
            className={`flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-white font-almarai outline-none focus:border-sky-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center disabled:opacity-50"
          >
            <Send className={`w-5 h-5 text-white ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );

  // Search Modal
  const SearchModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50"
    >
      <div className="sticky top-0 bg-black border-b border-slate-800 p-4">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1 relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={txt.searchUsers}
              className={`w-full bg-slate-900 border border-slate-700 rounded-full py-2 text-white font-almarai outline-none focus:border-sky-500 ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'}`}
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {searchLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : searchResults.length === 0 && searchQuery ? (
          <p className="text-center text-slate-500 py-10 font-almarai">{txt.noResults}</p>
        ) : (
          searchResults.map((u) => (
            <div key={u.id} className={`flex items-center justify-between p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button 
                onClick={() => navigate(`/user/${u.id}`)}
                className={`flex items-center gap-3 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <img src={u.avatar} alt="" className="w-12 h-12 rounded-full" />
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="font-cairo font-bold text-white">{u.name}</p>
                  <p className="text-slate-500 text-sm" dir="ltr">@{u.username}</p>
                </div>
              </button>
              <button
                onClick={() => startConversation(u.id)}
                className="px-4 py-2 bg-sky-500 text-white font-cairo font-bold rounded-full text-sm"
              >
                {txt.message}
              </button>
            </div>
          ))
        )}
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
