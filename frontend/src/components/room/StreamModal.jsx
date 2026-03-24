import React from 'react';
import { motion } from 'framer-motion';
import { Tv, Play, Square, Edit3, Check } from 'lucide-react';

export const StreamModal = ({
  show,
  onClose,
  user,
  streamSlots,
  activeSlot,
  streamActive,
  streamInputUrl,
  setStreamInputUrl,
  editingSlot,
  setEditingSlot,
  onPlaySlot,
  onSaveSlot,
  onStopStream
}) => {
  if (!show || user.role !== 'owner') return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => { onClose(); setEditingSlot(null); setStreamInputUrl(''); }}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-md rounded-3xl p-6 border border-violet-500/30 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Tv className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-cairo font-bold text-white mb-2">روابط البث</h3>
          <p className="text-slate-400 font-almarai text-sm">5 روابط ثابتة - اضغط للتشغيل أو التعديل</p>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((slot) => (
            <div key={slot} className={`p-3 rounded-xl border ${activeSlot === slot && streamActive ? 'bg-violet-500/20 border-violet-500' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-cairo font-bold">رابط {slot}</span>
                <div className="flex items-center gap-2">
                  {streamSlots[slot] && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onPlaySlot(slot)}
                      disabled={activeSlot === slot && streamActive}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activeSlot === slot && streamActive ? 'bg-violet-500' : 'bg-lime-500/20 hover:bg-lime-500/30'
                      }`}
                    >
                      {activeSlot === slot && streamActive ? (
                        <Square className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-lime-400" />
                      )}
                    </motion.button>
                  )}
                  <button
                    onClick={() => {
                      setEditingSlot(editingSlot === slot ? null : slot);
                      setStreamInputUrl(streamSlots[slot] || '');
                    }}
                    className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 flex items-center justify-center"
                  >
                    <Edit3 className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
              
              {/* URL Display or Edit */}
              {editingSlot === slot ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={streamInputUrl}
                    onChange={(e) => setStreamInputUrl(e.target.value)}
                    placeholder="رابط YouTube أو Twitch..."
                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500"
                    dir="ltr"
                  />
                  <button
                    onClick={() => onSaveSlot(slot)}
                    className="px-3 py-2 bg-lime-500 hover:bg-lime-400 rounded-lg"
                  >
                    <Check className="w-4 h-4 text-slate-900" />
                  </button>
                </div>
              ) : (
                streamSlots[slot] && (
                  <p className="text-slate-400 text-xs truncate" dir="ltr">{streamSlots[slot]}</p>
                )
              )}
              
              {/* Active indicator */}
              {activeSlot === slot && streamActive && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 text-xs font-cairo">يعمل الآن</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Stop All Streams */}
        {streamActive && (
          <button
            onClick={onStopStream}
            className="w-full mt-4 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-cairo font-bold flex items-center justify-center gap-2"
          >
            <Square className="w-5 h-5" />
            إيقاف البث
          </button>
        )}
        
        <button 
          onClick={() => { onClose(); setEditingSlot(null); setStreamInputUrl(''); }}
          className="w-full mt-3 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold"
        >
          إغلاق
        </button>
      </motion.div>
    </motion.div>
  );
};

export default StreamModal;
