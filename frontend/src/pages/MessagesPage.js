import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import BottomNavigation from '../components/BottomNavigation';
import { 
  ArrowRight, Search, Send, Check, CheckCheck, X, MessageCircle,
  Image, Mic, Smile, MoreVertical, Phone, Video, Trash2, UserPlus
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Simple Chat Background
const ChatBackground = () => (
  <div className="absolute inset-0 bg-[#0e1621]">
    <div 
      className="absolute inset-0 opacity-5"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 30m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0' fill='%2384cc16' fill-opacity='0.4'/%3E%3C/svg%3E")`,
      }}
    />
  </div>
);

export default function MessagesPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  
  // States
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
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  const txt = {
    messages: 'الرسائل',
    searchUsers: 'ابحث عن مستخدم...',
    noConversations: 'لا توجد محادثات',
    startChat: 'ابدأ محادثة جديدة',
    typeMessage: 'اكتب رسالة...',
    online: 'متصل',
    offline: 'غير متصل',
    you: 'أنت',
    newChat: 'محادثة جديدة',
    search: 'بحث',
    noResults: 'لا توجد نتائج',
    deleteChat: 'حذف المحادثة',
    startConversation: 'ابدأ المحادثة'
  };

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;
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
  }, [token]);

  // Load conversation messages
  const loadConversation = useCallback(async (convoId) => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/conversations/${convoId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.messages || []);
      // Scroll to bottom after loading
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    } catch (error) {
      console.error('Error loading messages');
    }
  }, [token]);

  // Search users
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

  // Start new conversation
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

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentConversation || sending) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Optimistic update
    const tempMessage = {
      id: Date.now().toString(),
      content: messageText,
      is_mine: true,
      created_at: new Date().toISOString(),
      sending: true
    };
    setMessages(prev => [...prev, tempMessage]);
    
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      await axios.post(
        `${API}/conversations/${currentConversation.id}/messages`,
        { content: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update message as sent
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? { ...m, sending: false } : m
      ));
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
      // Remove failed message
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  }, [newMessage, currentConversation, sending, token]);

  // Delete conversation
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

  // Open conversation
  const openConversation = useCallback((convo) => {
    setCurrentConversation(convo);
    setCurrentView('chat');
    loadConversation(convo.id);
    navigate(`/messages/${convo.id}`);
  }, [loadConversation, navigate]);

  // Effects
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const convo = conversations.find(c => c.id === conversationId);
      if (convo) {
        setCurrentConversation(convo);
        setCurrentView('chat');
        loadConversation(conversationId);
      }
    }
  }, [conversationId, conversations, loadConversation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Format time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  // ============ CONVERSATION LIST ============
  const ConversationList = () => (
    <div className="flex flex-col h-full bg-[#17212b]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#17212b] border-b border-[#232e3c]">
        <h1 className="text-xl font-bold text-white">{txt.messages}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-[#6ab2f2] hover:bg-[#232e3c] rounded-full transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-[#6ab2f2] hover:bg-[#232e3c] rounded-full transition-colors"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="absolute inset-0 bg-[#17212b] z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#17212b] border-b border-[#232e3c]">
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-[#6ab2f2]">
              <X className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={txt.searchUsers}
              className="flex-1 bg-[#242f3d] text-white px-4 py-2 rounded-full outline-none text-right"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {searchLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#6ab2f2] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user.id, user)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202b36] transition-colors"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt={user.username}
                    className="w-12 h-12 rounded-full bg-[#232e3c]"
                  />
                  <div className="flex-1 text-right">
                    <p className="text-white font-medium">{user.name || user.username}</p>
                    <p className="text-[#6c7883] text-sm">@{user.username}</p>
                  </div>
                </button>
              ))
            ) : searchQuery && (
              <p className="text-center text-[#6c7883] py-8">{txt.noResults}</p>
            )}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-[#6ab2f2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#6c7883] px-4">
            <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg mb-2">{txt.noConversations}</p>
            <button
              onClick={() => setShowSearch(true)}
              className="mt-4 px-6 py-2 bg-[#6ab2f2] text-white rounded-full font-medium"
            >
              {txt.startChat}
            </button>
          </div>
        ) : (
          conversations.map(convo => (
            <button
              key={convo.id}
              onClick={() => openConversation(convo)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202b36] transition-colors border-b border-[#232e3c]/50"
            >
              <div className="relative">
                <img
                  src={convo.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.user?.username}`}
                  alt={convo.user?.username}
                  className="w-14 h-14 rounded-full bg-[#232e3c]"
                />
              </div>
              <div className="flex-1 text-right min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6c7883]">
                    {convo.last_message?.created_at && formatTime(convo.last_message.created_at)}
                  </span>
                  <span className="text-white font-medium truncate">
                    {convo.user?.name || convo.user?.username}
                  </span>
                </div>
                <p className="text-[#6c7883] text-sm truncate mt-1">
                  {convo.last_message?.is_mine && <span className="text-[#6ab2f2]">{txt.you}: </span>}
                  {convo.last_message?.content || txt.startConversation}
                </p>
              </div>
              {convo.unread_count > 0 && (
                <span className="bg-[#6ab2f2] text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                  {convo.unread_count}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      <BottomNavigation />
    </div>
  );

  // ============ CHAT VIEW ============
  const ChatView = () => (
    <div 
      className="flex flex-col bg-[#0e1621]"
      style={{ 
        height: '100%',
        height: '100dvh',
        maxHeight: '-webkit-fill-available'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#17212b] border-b border-[#232e3c]">
        <button
          onClick={() => {
            setCurrentView('list');
            setCurrentConversation(null);
            navigate('/messages');
          }}
          className="text-[#6ab2f2]"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        
        <img
          src={currentConversation?.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentConversation?.user?.username}`}
          alt=""
          className="w-10 h-10 rounded-full bg-[#232e3c]"
        />
        
        <div className="flex-1 text-right">
          <p className="text-white font-medium">
            {currentConversation?.user?.name || currentConversation?.user?.username}
          </p>
          <p className="text-[#6c7883] text-xs">{txt.online}</p>
        </div>

        <button
          onClick={deleteConversation}
          className="p-2 text-[#6c7883] hover:text-red-400 hover:bg-[#232e3c] rounded-full transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 relative"
        style={{ 
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0
        }}
      >
        <ChatBackground />
        
        <div className="relative z-10 space-y-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#6c7883]">
              <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
              <p>{txt.startConversation}</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_mine ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg ${
                    msg.is_mine 
                      ? 'bg-[#2b5278] text-white rounded-bl-none' 
                      : 'bg-[#182533] text-white rounded-br-none'
                  } ${msg.sending ? 'opacity-70' : ''}`}
                >
                  <p className="text-[15px] leading-relaxed text-right whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.is_mine ? 'justify-start' : 'justify-end'}`}>
                    <span className="text-[11px] text-[#6c7883]">
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.is_mine && (
                      msg.sending ? (
                        <div className="w-3 h-3 border border-[#6c7883] border-t-transparent rounded-full animate-spin" />
                      ) : msg.read ? (
                        <CheckCheck className="w-4 h-4 text-[#6ab2f2]" />
                      ) : (
                        <Check className="w-4 h-4 text-[#6c7883]" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Simple */}
      <div className="bg-[#17212b] border-t border-[#232e3c] px-3 py-3">
        <div className="flex items-center gap-3">
          <textarea
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              // Auto resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={txt.typeMessage}
            className="flex-1 bg-[#242f3d] text-white px-4 py-3 rounded-2xl outline-none text-right resize-none touch-action-auto"
            style={{ fontSize: '16px', minHeight: '44px', maxHeight: '120px' }}
            dir="rtl"
            rows={1}
            autoComplete="off"
            inputMode="text"
          />
          
          <button
            onClick={sendMessage}
            className="p-3 bg-[#6ab2f2] text-white rounded-full flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen h-[100dvh] overflow-hidden">
      {currentView === 'chat' && currentConversation ? <ChatView /> : <ConversationList />}
    </div>
  );
}
