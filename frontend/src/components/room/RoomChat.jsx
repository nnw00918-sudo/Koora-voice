/**
 * RoomChat Component
 * Chat section with messages and input
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ImageIcon } from 'lucide-react';
import { Input } from '../ui/input';

export const RoomChat = ({
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  showMentionList,
  setShowMentionList,
  mentionSearch,
  setMentionSearch,
  participants,
  user,
  onNavigateToUser,
  messagesEndRef
}) => {
  const inputRef = useRef(null);

  // Filter participants for mention
  const filteredMentions = participants.filter(p => 
    (p.username || p.name || '').toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Check for @ mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentionList(true);
      setMentionSearch('');
    } else if (lastAtIndex !== -1) {
      const searchText = value.substring(lastAtIndex + 1);
      if (!searchText.includes(' ')) {
        setShowMentionList(true);
        setMentionSearch(searchText);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const handleMentionSelect = (participant) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    const beforeMention = newMessage.substring(0, lastAtIndex);
    const username = participant.username || participant.name;
    setNewMessage(`${beforeMention}@${username} `);
    setShowMentionList(false);
    inputRef.current?.focus();
  };

  const formatMessageContent = (content) => {
    // Highlight @mentions
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-lime-400 font-bold cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat Header */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-white/60 text-xs font-cairo">الدردشة</span>
        <span className="text-lime-400 text-xs font-cairo">{messages.length} رسالة</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-sm font-cairo">لا توجد رسائل بعد</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <img
                src={msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user_id}`}
                alt=""
                className="w-8 h-8 rounded-full flex-shrink-0 cursor-pointer"
                onClick={() => onNavigateToUser(msg.user_id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span 
                    className="text-lime-400 text-xs font-cairo font-bold cursor-pointer hover:underline"
                    onClick={() => onNavigateToUser(msg.user_id)}
                  >
                    {msg.username}
                  </span>
                  <span className="text-white/30 text-[10px]">
                    {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-white text-sm font-almarai break-words">
                  {formatMessageContent(msg.content)}
                </p>
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Mention Suggestions */}
      <AnimatePresence>
        {showMentionList && filteredMentions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-4 mb-2 bg-slate-800 rounded-xl border border-lime-500/30 overflow-hidden"
          >
            {filteredMentions.map((p) => (
              <button
                key={p.user_id || p.id}
                onClick={() => handleMentionSelect(p)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors"
              >
                <img
                  src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-white text-sm font-cairo">{p.username || p.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={onSendMessage} className="px-4 pb-4">
        <div className="flex gap-2 bg-white/5 rounded-xl p-2 border border-white/10">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-transparent border-0 text-white placeholder:text-white/40 text-sm font-almarai focus-visible:ring-0"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-xl bg-[#CCFF00] hover:bg-[#B3E600] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            data-testid="chat-send-btn"
          >
            <Send className="w-5 h-5 text-black" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoomChat;
