import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import BottomNavigation from '../components/BottomNavigation';
import { 
  ArrowRight, Search, Send, Check, CheckCheck, X, MessageCircle,
  Trash2, UserPlus
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ============ CHAT VIEW COMPONENT (Separate to prevent re-renders) ============
const ChatView = memo(function ChatView({ 
  conversation, 
  messages, 
  onBack, 
  onDelete, 
  onSend,
  txt 
}) {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
    <div className="flex flex-col h-screen bg-[#0e1621]" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#17212b] border-b border-[#232e3c] flex-shrink-0">
        <button onClick={onBack} className="text-[#6ab2f2]">
          <ArrowRight className="w-6 h-6" />
        </button>
        
        <img
          src={conversation?.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation?.user?.username}`}
          alt=""
          className="w-10 h-10 rounded-full bg-[#232e3c]"
        />
        
        <div className="flex-1 text-right">
          <p className="text-white font-medium">
            {conversation?.user?.name || conversation?.user?.username}
          </p>
          <p className="text-[#6c7883] text-xs">{txt.online}</p>
        </div>

        <button
          onClick={onDelete}
          className="p-2 text-[#6c7883] hover:text-red-400 rounded-full"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#6c7883]">
            <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
            <p>{txt.startConversation}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.is_mine ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg ${
                    msg.is_mine 
                      ? 'bg-[#2b5278] rounded-bl-none' 
                      : 'bg-[#182533] rounded-br-none'
                  } ${msg.sending ? 'opacity-70' : ''}`}
                >
                  <p className="text-white text-[15px] text-right whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.is_mine ? 'justify-start' : 'justify-end'}`}>
                    <span className="text-[11px] text-[#6c7883]">
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.is_mine && !msg.sending && (
                      msg.read 
                        ? <CheckCheck className="w-4 h-4 text-[#6ab2f2]" />
                        : <Check className="w-4 h-4 text-[#6c7883]" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-[#17212b] border-t border-[#232e3c] px-3 py-3 flex-shrink-0">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={txt.typeMessage}
            className="flex-1 bg-[#242f3d] text-white px-4 py-3 rounded-2xl outline-none text-right resize-none"
            style={{ fontSize: '16px', minHeight: '44px', maxHeight: '120px' }}
            dir="rtl"
            rows={1}
          />
          
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className="p-3 bg-[#6ab2f2] text-white rounded-full flex-shrink-0 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
});

// ============ MAIN COMPONENT ============
export default function MessagesPage() {
  const { language } = useLanguage();
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
  
  const token = localStorage.getItem('token');

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
      await axios.post(
        `${API}/conversations/${currentConversation.id}/messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? { ...m, sending: false } : m
      ));
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
      />
    );
  }

  // Conversation List
  return (
    <div className="flex flex-col h-screen bg-[#17212b]" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#17212b] border-b border-[#232e3c]">
        <h1 className="text-xl font-bold text-white">{txt.messages}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-[#6ab2f2] hover:bg-[#232e3c] rounded-full"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-[#6ab2f2] hover:bg-[#232e3c] rounded-full"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="absolute inset-0 bg-[#17212b] z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#232e3c]">
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-[#6ab2f2]">
              <X className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={txt.searchUsers}
              className="flex-1 bg-[#242f3d] text-white px-4 py-2 rounded-full outline-none text-right"
              style={{ fontSize: '16px' }}
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
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202b36]"
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
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202b36] border-b border-[#232e3c]/50"
            >
              <img
                src={convo.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.user?.username}`}
                alt={convo.user?.username}
                className="w-14 h-14 rounded-full bg-[#232e3c]"
              />
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
}
