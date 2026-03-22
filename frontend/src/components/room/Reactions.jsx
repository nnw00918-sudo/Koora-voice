import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Floating Reactions Component
export const FloatingReactions = ({ reactions }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ 
              opacity: 1, 
              y: window.innerHeight,
              x: Math.random() * (window.innerWidth - 50) + 25
            }}
            animate={{ 
              opacity: [1, 1, 0],
              y: -100,
              scale: [1, 1.5, 1]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 3,
              ease: "easeOut"
            }}
            className="absolute text-5xl"
          >
            {reaction.reaction}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Reaction Buttons Bar
export const ReactionBar = ({ onReact, disabled }) => {
  const reactions = [
    { emoji: '⚽', label: 'هدف' },
    { emoji: '🔥', label: 'حماس' },
    { emoji: '👏', label: 'تصفيق' },
    { emoji: '❤️', label: 'حب' },
    { emoji: '😂', label: 'ضحك' },
    { emoji: '😮', label: 'واو' },
    { emoji: '😢', label: 'حزن' },
    { emoji: '🎉', label: 'احتفال' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {reactions.map((r) => (
        <motion.button
          key={r.emoji}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={() => !disabled && onReact(r.emoji)}
          disabled={disabled}
          className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-2xl transition-colors disabled:opacity-50"
          title={r.label}
        >
          {r.emoji}
        </motion.button>
      ))}
    </div>
  );
};

// Poll Component
export const PollCard = ({ poll, onVote, currentUserId, onClose, isOwner }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const hasVoted = poll?.voters?.includes(currentUserId);
  const totalVotes = poll?.total_votes || 0;

  // Calculate time remaining
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    if (!poll?.expires_at) return;
    
    const updateTime = () => {
      const now = new Date();
      const expires = new Date(poll.expires_at);
      const diff = expires - now;
      
      if (diff <= 0) {
        setTimeLeft('انتهى');
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [poll?.expires_at]);

  if (!poll) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-4 border border-lime-500/30 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lime-400">📊</span>
          <span className="text-white font-cairo font-bold">استطلاع</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono ${timeLeft === 'انتهى' ? 'text-red-400' : 'text-lime-400'}`}>
            {timeLeft}
          </span>
          {isOwner && poll.is_active && (
            <button 
              onClick={onClose}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>
      
      {/* Question */}
      <h3 className="text-white font-cairo font-bold text-lg mb-4">{poll.question}</h3>
      
      {/* Options */}
      <div className="space-y-2">
        {poll.options?.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isSelected = selectedOption === option.id;
          
          return (
            <motion.button
              key={option.id}
              whileTap={!hasVoted && poll.is_active ? { scale: 0.98 } : {}}
              onClick={() => {
                if (!hasVoted && poll.is_active) {
                  setSelectedOption(option.id);
                  onVote(option.id);
                }
              }}
              disabled={hasVoted || !poll.is_active}
              className={`w-full relative overflow-hidden rounded-xl p-3 text-right transition-all ${
                hasVoted || !poll.is_active
                  ? 'bg-slate-700/50'
                  : isSelected
                    ? 'bg-lime-500/30 border-2 border-lime-500'
                    : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
              }`}
            >
              {/* Progress Bar (shows after voting) */}
              {(hasVoted || !poll.is_active) && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-y-0 left-0 bg-lime-500/20"
                />
              )}
              
              <div className="relative flex items-center justify-between">
                <span className="text-white font-cairo">{option.text}</span>
                {(hasVoted || !poll.is_active) && (
                  <span className="text-lime-400 font-bold">{percentage}%</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-3 text-sm text-slate-400">
        <span>{totalVotes} صوت</span>
        <span>بواسطة {poll.creator_name}</span>
      </div>
    </motion.div>
  );
};

// Create Poll Modal
export const CreatePollModal = ({ isOpen, onClose, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(5);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    const validOptions = options.filter(o => o.trim());
    if (question.trim() && validOptions.length >= 2) {
      onSubmit({
        question: question.trim(),
        options: validOptions,
        duration_minutes: duration
      });
      setQuestion('');
      setOptions(['', '']);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-lime-500/30"
      >
        <h2 className="text-white font-cairo font-bold text-xl mb-4">إنشاء استطلاع</h2>
        
        {/* Question */}
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="اكتب سؤالك..."
          className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 mb-4 font-cairo placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
          dir="rtl"
        />
        
        {/* Options */}
        <div className="space-y-2 mb-4">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[index] = e.target.value;
                  setOptions(newOptions);
                }}
                placeholder={`الخيار ${index + 1}`}
                className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-2 font-cairo placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
                dir="rtl"
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(index)}
                  className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        
        {options.length < 6 && (
          <button
            onClick={addOption}
            className="text-lime-400 text-sm mb-4 hover:text-lime-300"
          >
            + إضافة خيار
          </button>
        )}
        
        {/* Duration */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-slate-400 font-cairo">المدة:</span>
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="bg-slate-800 text-white rounded-xl px-3 py-2 font-cairo"
          >
            <option value={1}>دقيقة</option>
            <option value={2}>دقيقتين</option>
            <option value={5}>5 دقائق</option>
            <option value={10}>10 دقائق</option>
            <option value={30}>30 دقيقة</option>
          </select>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-cairo hover:bg-slate-600"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            className="flex-1 py-3 rounded-xl bg-lime-500 text-slate-900 font-cairo font-bold hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            إنشاء
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default { FloatingReactions, ReactionBar, PollCard, CreatePollModal };
