import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AtSign, ImageIcon } from 'lucide-react';

// Single Chat Message
export const ChatMessage = ({ message, currentUserId, onMentionClick }) => {
  const isOwn = message.user_id === currentUserId;
  const isSystemMessage = message.type === 'system';
  
  // Parse mentions in message
  const renderMessageContent = (content) => {
    if (!content) return null;
    
    // Check if it's just emoji(s)
    const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+$/u;
    const isOnlyEmoji = emojiRegex.test(content.trim());
    
    if (isOnlyEmoji) {
      return <span className="text-4xl">{content}</span>;
    }
    
    // Parse @mentions
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <span 
            key={index}
            onClick={() => onMentionClick?.(part)}
            className="text-lime-400 font-bold cursor-pointer hover:underline"
          >
            @{part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (isSystemMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2"
      >
        <span className="text-slate-500 text-xs font-cairo bg-slate-800/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isOwn && (
        <img 
          src={message.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.username}`}
          alt=""
          className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-slate-700"
        />
      )}
      
      {/* Message Bubble */}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Username */}
        {!isOwn && (
          <p className="text-slate-400 text-xs font-cairo mb-1 mr-2">{message.username}</p>
        )}
        
        {/* Bubble */}
        <div className={`px-4 py-2.5 rounded-2xl ${
          isOwn 
            ? 'bg-lime-500 text-slate-900 rounded-br-md' 
            : 'bg-slate-800 text-white rounded-bl-md'
        }`}>
          <p className="font-cairo text-sm leading-relaxed break-words">
            {renderMessageContent(message.content)}
          </p>
        </div>
        
        {/* Time */}
        <p className={`text-slate-600 text-[10px] mt-1 ${isOwn ? 'text-left' : 'text-right'}`}>
          {new Date(message.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
};

// Mention Suggestions List
export const MentionList = ({ participants, searchTerm, onSelect }) => {
  const filtered = participants.filter(p => 
    p.username?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl"
    >
      {filtered.map((p) => (
        <button
          key={p.user_id || p.id}
          onClick={() => onSelect(p)}
          className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors text-right"
        >
          <img 
            src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
            alt=""
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-cairo text-sm truncate">{p.user?.name || p.username}</p>
            <p className="text-slate-400 text-xs">@{p.username}</p>
          </div>
        </button>
      ))}
    </motion.div>
  );
};

// Full Chat Box Component
export const RoomChat = ({ 
  messages, 
  participants,
  currentUserId,
  newMessage,
  setNewMessage,
  onSendMessage,
  showMentionList,
  setShowMentionList,
  mentionSearch,
  setMentionSearch,
  onMentionSelect,
  chatBackground,
  inputRef
}) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setShowMentionList(true);
        setMentionSearch(afterAt);
        return;
      }
    }
    setShowMentionList(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900/50">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
          <h3 className="text-white font-cairo font-bold text-sm">الدردشة</h3>
        </div>
        <span className="text-slate-400 text-xs font-cairo">{messages.length} رسالة</span>
      </div>
      
      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{
          backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {chatBackground && (
          <div className="absolute inset-0 bg-slate-950/70 pointer-events-none" />
        )}
        
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <ChatMessage 
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="relative p-3 bg-slate-800/80 border-t border-slate-700/50">
        <AnimatePresence>
          {showMentionList && (
            <MentionList 
              participants={participants}
              searchTerm={mentionSearch}
              onSelect={onMentionSelect}
            />
          )}
        </AnimatePresence>
        
        <form onSubmit={(e) => { e.preventDefault(); onSendMessage(); }} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك... استخدم @ للإشارة"
              className="w-full bg-slate-700/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-10 text-sm font-cairo focus:outline-none focus:ring-2 focus:ring-lime-500/50 border border-slate-600/50"
              dir="rtl"
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-lime-400 transition-colors"
            >
              <AtSign className="w-4 h-4" />
            </button>
          </div>
          
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!newMessage.trim()}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              newMessage.trim() 
                ? 'bg-lime-500 hover:bg-lime-400 text-slate-900 shadow-lg shadow-lime-500/30' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default RoomChat;
