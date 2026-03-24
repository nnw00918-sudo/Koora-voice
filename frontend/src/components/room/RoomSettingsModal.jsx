import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  ImageIcon,
  Lock,
  Unlock,
  Trash2,
  Video,
  Circle,
  StopCircle,
  Youtube,
  BarChart3
} from 'lucide-react';

export const RoomSettingsModal = ({
  show,
  onClose,
  room,
  isOwner,
  isRoomAdmin,
  user,
  // Image states
  showImagePicker,
  setShowImagePicker,
  roomImageUrl,
  setRoomImageUrl,
  uploadingImage,
  onImageUpload,
  onUpdateRoomImage,
  // Recording states
  isRecording,
  recordingTime,
  formatRecordingTime,
  onStartRecording,
  onStopRecording,
  // Stream
  streamActive,
  onShowStreamModal,
  // Room controls
  onToggleRoom,
  onDeleteRoom,
  // Playback features
  watchParty,
  activePoll,
  onShowWatchPartyModal,
  onShowCreatePollModal,
  onEndWatchParty,
  onClosePoll,
  // File input ref
  fileInputRef
}) => {
  if (!show || !isOwner) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-violet-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-cairo font-bold text-white">إعدادات الغرفة</h3>
        </div>
        
        <div className="space-y-3">
          {/* Change Room Image */}
          <button onClick={() => setShowImagePicker(!showImagePicker)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50"
          >
            <ImageIcon className="w-6 h-6 text-sky-400" />
            <span className="text-sky-400 font-cairo font-bold">تغيير صورة الغرفة</span>
          </button>
          
          {showImagePicker && (
            <div className="p-4 bg-slate-800 rounded-xl space-y-4">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={onImageUpload}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
              />
              
              {/* Upload from album button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-slate-900 rounded-xl font-cairo font-bold transition-all disabled:opacity-50"
              >
                {uploadingImage ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    <span>اختر من الألبوم</span>
                  </>
                )}
              </button>
              
              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-sm">أو</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              
              {/* URL input */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={roomImageUrl}
                  onChange={(e) => setRoomImageUrl(e.target.value)}
                  placeholder="أدخل رابط الصورة..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm placeholder:text-slate-400"
                  dir="ltr"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={onUpdateRoomImage}
                    disabled={!roomImageUrl.trim()}
                    className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-white rounded-lg font-cairo font-bold text-sm transition-colors"
                  >
                    حفظ الرابط
                  </button>
                  <button 
                    onClick={() => { setShowImagePicker(false); setRoomImageUrl(''); }}
                    className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-cairo text-sm transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Playback Features Section */}
          <div className="pt-2 border-t border-slate-700">
            <p className="text-slate-500 text-xs font-cairo mb-2">ميزات Playback</p>
            
            {/* Watch Party Button */}
            {!watchParty ? (
              <button 
                onClick={() => { onClose(); onShowWatchPartyModal(); }}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 mb-2"
                data-testid="start-watch-party-btn"
              >
                <Youtube className="w-6 h-6 text-red-400" />
                <div className="flex-1 text-right">
                  <span className="text-red-400 font-cairo font-bold">بدء Watch Party</span>
                  <p className="text-red-300/70 text-xs">شاهدوا معاً بشكل متزامن</p>
                </div>
              </button>
            ) : (
              <button 
                onClick={() => { onEndWatchParty(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500 hover:bg-red-600 mb-2"
                data-testid="end-watch-party-btn"
              >
                <Youtube className="w-6 h-6 text-white" />
                <span className="text-white font-cairo font-bold">إنهاء Watch Party</span>
              </button>
            )}
            
            {/* Create Poll Button */}
            {!activePoll ? (
              <button 
                onClick={() => { onClose(); onShowCreatePollModal(); }}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50"
                data-testid="create-poll-btn"
              >
                <BarChart3 className="w-6 h-6 text-amber-400" />
                <div className="flex-1 text-right">
                  <span className="text-amber-400 font-cairo font-bold">إنشاء استطلاع</span>
                  <p className="text-amber-300/70 text-xs">اسأل الجمهور رأيهم</p>
                </div>
              </button>
            ) : (
              <button 
                onClick={() => { onClosePoll(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-amber-500 hover:bg-amber-600"
                data-testid="close-poll-btn"
              >
                <BarChart3 className="w-6 h-6 text-white" />
                <span className="text-white font-cairo font-bold">إغلاق الاستطلاع</span>
              </button>
            )}
          </div>
          
          {/* Recording Controls - Owner/Admin only */}
          {(isOwner || isRoomAdmin) && (
            <>
              {isRecording ? (
                <button 
                  onClick={() => { onStopRecording(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
                >
                  <div className="flex items-center gap-2">
                    <StopCircle className="w-6 h-6 text-red-400" />
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-red-400 font-cairo font-bold">إيقاف التسجيل</span>
                    <span className="text-red-300 text-sm mr-2 font-mono">{formatRecordingTime(recordingTime)}</span>
                  </div>
                </button>
              ) : (
                <button 
                  onClick={() => { onStartRecording(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50"
                >
                  <Circle className="w-6 h-6 text-rose-400" fill="currentColor" />
                  <span className="text-rose-400 font-cairo font-bold">تسجيل الغرفة</span>
                </button>
              )}
            </>
          )}
          
          {/* Stream Controls - Only for System Owner */}
          {user.role === 'owner' && (
            <>
              {!streamActive && (
                <button onClick={() => { onClose(); onShowStreamModal(); }}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50"
                >
                  <Video className="w-6 h-6 text-violet-400" />
                  <span className="text-violet-400 font-cairo font-bold">تشغيل بث مباشر</span>
                </button>
              )}
            </>
          )}
          
          <button onClick={onToggleRoom}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-colors ${
              room?.is_closed 
                ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50' 
                : 'bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50'
            }`}
          >
            {room?.is_closed ? <Unlock className="w-6 h-6 text-green-400" /> : <Lock className="w-6 h-6 text-orange-400" />}
            <span className={`font-cairo font-bold ${room?.is_closed ? 'text-green-400' : 'text-orange-400'}`}>
              {room?.is_closed ? 'فتح الغرفة' : 'إغلاق الغرفة'}
            </span>
          </button>
          
          <button onClick={onDeleteRoom}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
          >
            <Trash2 className="w-6 h-6 text-red-400" />
            <span className="text-red-400 font-cairo font-bold">حذف الغرفة</span>
          </button>
        </div>
        
        <button onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold"
        >
          إلغاء
        </button>
      </motion.div>
    </motion.div>
  );
};

export default RoomSettingsModal;
