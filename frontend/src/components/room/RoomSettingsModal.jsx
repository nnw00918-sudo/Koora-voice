import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  ImageIcon,
  Lock,
  Unlock,
  Trash2,
  Video,
  Circle,
  StopCircle,
  Users,
  BarChart3,
  ArrowRight,
  Type,
  X
} from 'lucide-react';

export const RoomSettingsModal = ({
  show,
  onClose,
  room,
  isOwner,
  isRoomAdmin,
  user,
  // Title change
  onUpdateRoomTitle,
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
  activePoll,
  onShowCreatePollModal,
  onClosePoll,
  // User roles
  onShowUserRolesModal,
  // File input ref
  fileInputRef
}) => {
  const [currentPage, setCurrentPage] = useState('main'); // main, title, image, roles, poll, record, stream, lock, delete
  const [newTitle, setNewTitle] = useState(room?.title || '');
  const localFileInputRef = useRef(null);
  const inputRef = fileInputRef || localFileInputRef;

  if (!show || !isOwner) return null;

  const goBack = () => setCurrentPage('main');
  
  const handleClose = () => {
    setCurrentPage('main');
    onClose();
  };

  // Page Header Component
  const PageHeader = ({ title, onBack }) => (
    <div className="flex items-center gap-3 mb-6">
      <button 
        onClick={onBack}
        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
      >
        <ArrowRight className="w-5 h-5 text-white" />
      </button>
      <h3 className="text-xl font-cairo font-bold text-white flex-1 text-center pr-10">{title}</h3>
    </div>
  );

  // Animated Option Button Component
  const OptionButton = ({ onClick, bgColor, hoverBgColor, borderColor, iconColor, Icon, title, subtitle, delay = 0 }) => (
    <motion.button 
      onClick={onClick}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02, x: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl ${bgColor} hover:${hoverBgColor} border ${borderColor} transition-all duration-200 group`}
    >
      <motion.div
        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Icon className={`w-6 h-6 ${iconColor} group-hover:scale-110 transition-transform`} />
      </motion.div>
      <div className="flex-1 text-right">
        <span className={`${iconColor} font-cairo font-bold`}>{title}</span>
        {subtitle && <p className={`${iconColor.replace('400', '300')}/70 text-xs`}>{subtitle}</p>}
      </div>
      <motion.div
        initial={{ x: 0 }}
        whileHover={{ x: -5 }}
        transition={{ duration: 0.2 }}
      >
        <ArrowRight className={`w-5 h-5 ${iconColor} rotate-180`} />
      </motion.div>
    </motion.button>
  );

  // Main Page - List of options
  const MainPage = () => (
    <>
      <div className="text-center mb-6">
        <motion.div 
          className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-3"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Settings className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>
        <motion.h3 
          className="text-xl font-cairo font-bold text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          إعدادات الغرفة
        </motion.h3>
      </div>
      
      <div className="space-y-3">
        {/* Change Room Title */}
        <OptionButton
          onClick={() => setCurrentPage('title')}
          bgColor="bg-lime-500/20"
          hoverBgColor="bg-lime-500/30"
          borderColor="border-lime-500/50"
          iconColor="text-lime-400"
          Icon={Type}
          title="تغيير اسم الغرفة"
          delay={1}
        />

        {/* Change Room Image */}
        <OptionButton
          onClick={() => setCurrentPage('image')}
          bgColor="bg-sky-500/20"
          hoverBgColor="bg-sky-500/30"
          borderColor="border-sky-500/50"
          iconColor="text-sky-400"
          Icon={ImageIcon}
          title="تغيير صورة الغرفة"
          delay={2}
        />
        
        {/* Room Management Section */}
        <motion.div 
          className="pt-2 border-t border-slate-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-slate-500 text-xs font-cairo mb-2">إدارة الغرفة</p>
          
          {/* User Roles Button */}
          <div className="mb-2">
            <OptionButton
              onClick={() => setCurrentPage('roles')}
              bgColor="bg-emerald-500/20"
              hoverBgColor="bg-emerald-500/30"
              borderColor="border-emerald-500/50"
              iconColor="text-emerald-400"
              Icon={Users}
              title="رتب المستخدمين"
              subtitle="إدارة أدوار الأعضاء في الغرفة"
              delay={3}
            />
          </div>
          
          {/* Create Poll Button */}
          <OptionButton
            onClick={() => setCurrentPage('poll')}
            bgColor="bg-amber-500/20"
            hoverBgColor="bg-amber-500/30"
            borderColor="border-amber-500/50"
            iconColor="text-amber-400"
            Icon={BarChart3}
            title={activePoll ? 'إدارة الاستطلاع' : 'إنشاء استطلاع'}
            subtitle="اسأل الجمهور رأيهم"
            delay={4}
          />
        </motion.div>
        
        {/* Recording Controls */}
        {(isOwner || isRoomAdmin) && (
          <motion.button 
            onClick={() => setCurrentPage('record')}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            whileHover={{ scale: 1.02, x: -5 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 group"
          >
            {isRecording ? (
              <>
                <div className="flex items-center gap-2">
                  <StopCircle className="w-6 h-6 text-rose-400" />
                  <motion.div 
                    className="w-2 h-2 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
                <div className="flex-1 text-right">
                  <span className="text-rose-400 font-cairo font-bold">تسجيل الغرفة</span>
                  <span className="text-rose-300 text-sm mr-2 font-mono">{formatRecordingTime(recordingTime)}</span>
                </div>
              </>
            ) : (
              <>
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Circle className="w-6 h-6 text-rose-400 group-hover:text-rose-300" fill="currentColor" />
                </motion.div>
                <span className="text-rose-400 font-cairo font-bold flex-1 text-right">تسجيل الغرفة</span>
              </>
            )}
            <ArrowRight className="w-5 h-5 text-rose-400 rotate-180" />
          </motion.button>
        )}
        
        {/* Stream Controls - Only for System Owner */}
        {user.role === 'owner' && !streamActive && (
          <OptionButton
            onClick={() => setCurrentPage('stream')}
            bgColor="bg-violet-500/20"
            hoverBgColor="bg-violet-500/30"
            borderColor="border-violet-500/50"
            iconColor="text-violet-400"
            Icon={Video}
            title="تشغيل بث مباشر"
            delay={6}
          />
        )}
        
        {/* Lock/Unlock Room */}
        <motion.button 
          onClick={() => setCurrentPage('lock')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          whileHover={{ scale: 1.02, x: -5 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-colors group ${
            room?.is_closed 
              ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50' 
              : 'bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50'
          }`}
        >
          <motion.div
            whileHover={{ rotate: room?.is_closed ? 20 : -20 }}
            transition={{ duration: 0.3 }}
          >
            {room?.is_closed ? <Unlock className="w-6 h-6 text-green-400" /> : <Lock className="w-6 h-6 text-orange-400" />}
          </motion.div>
          <span className={`font-cairo font-bold flex-1 text-right ${room?.is_closed ? 'text-green-400' : 'text-orange-400'}`}>
            {room?.is_closed ? 'فتح الغرفة' : 'إغلاق الغرفة'}
          </span>
          <ArrowRight className={`w-5 h-5 rotate-180 ${room?.is_closed ? 'text-green-400' : 'text-orange-400'}`} />
        </motion.button>
        
        {/* Delete Room */}
        <motion.button 
          onClick={() => setCurrentPage('delete')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          whileHover={{ scale: 1.02, x: -5, backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 border border-red-500/50 group"
        >
          <motion.div
            whileHover={{ rotate: [0, -15, 15, -15, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Trash2 className="w-6 h-6 text-red-400" />
          </motion.div>
          <span className="text-red-400 font-cairo font-bold flex-1 text-right">حذف الغرفة</span>
          <ArrowRight className="w-5 h-5 text-red-400 rotate-180" />
        </motion.button>
      </div>
      
      <motion.button 
        onClick={handleClose}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
        whileTap={{ scale: 0.98 }}
        className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold transition-colors"
      >
        إلغاء
      </motion.button>
    </>
  );

  // Title Change Page
  const TitlePage = () => (
    <>
      <PageHeader title="تغيير اسم الغرفة" onBack={goBack} />
      <div className="space-y-4">
        <div className="p-4 bg-slate-800 rounded-xl">
          <label className="text-white/60 text-sm font-cairo block mb-2">اسم الغرفة الجديد</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="أدخل اسم الغرفة..."
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white font-cairo placeholder:text-slate-400"
            dir="rtl"
          />
        </div>
        <button 
          onClick={() => {
            if (onUpdateRoomTitle && newTitle.trim()) {
              onUpdateRoomTitle(newTitle.trim());
              handleClose();
            }
          }}
          disabled={!newTitle.trim() || newTitle === room?.title}
          className="w-full py-4 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 disabled:from-slate-600 disabled:to-slate-600 text-slate-900 disabled:text-slate-400 rounded-xl font-cairo font-bold transition-all"
        >
          حفظ التغييرات
        </button>
      </div>
    </>
  );

  // Image Change Page
  const ImagePage = () => (
    <>
      <PageHeader title="تغيير صورة الغرفة" onBack={goBack} />
      <div className="space-y-4">
        {/* Hidden file input */}
        <input
          type="file"
          ref={inputRef}
          onChange={onImageUpload}
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
        />
        
        {/* Current image preview */}
        {room?.image && (
          <div className="text-center">
            <img src={room.image} alt="صورة الغرفة" className="w-24 h-24 rounded-xl object-cover mx-auto border-2 border-sky-500/50" />
            <p className="text-slate-400 text-xs mt-2 font-cairo">الصورة الحالية</p>
          </div>
        )}
        
        {/* Upload from album button */}
        <button
          onClick={() => inputRef.current?.click()}
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
        <div className="space-y-3">
          <input
            type="text"
            value={roomImageUrl}
            onChange={(e) => setRoomImageUrl(e.target.value)}
            placeholder="أدخل رابط الصورة..."
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-400"
            dir="ltr"
          />
          <button 
            onClick={() => {
              onUpdateRoomImage();
              handleClose();
            }}
            disabled={!roomImageUrl.trim()}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-white rounded-xl font-cairo font-bold transition-colors"
          >
            حفظ الرابط
          </button>
        </div>
      </div>
    </>
  );

  // User Roles Page
  const RolesPage = () => (
    <>
      <PageHeader title="رتب المستخدمين" onBack={goBack} />
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <Users className="w-10 h-10 text-emerald-400" />
        </div>
        <p className="text-white/60 font-cairo text-sm">إدارة أدوار الأعضاء في الغرفة</p>
        <p className="text-white/40 font-cairo text-xs">يمكنك تعيين مشرفين ومديرين للغرفة</p>
        <button 
          onClick={() => {
            handleClose();
            onShowUserRolesModal && onShowUserRolesModal();
          }}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-cairo font-bold"
        >
          فتح إدارة الأدوار
        </button>
      </div>
    </>
  );

  // Poll Page
  const PollPage = () => (
    <>
      <PageHeader title="الاستطلاعات" onBack={goBack} />
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
          <BarChart3 className="w-10 h-10 text-amber-400" />
        </div>
        {activePoll ? (
          <>
            <p className="text-amber-400 font-cairo font-bold">يوجد استطلاع نشط</p>
            <p className="text-white/60 font-cairo text-sm">{activePoll.question}</p>
            <button 
              onClick={() => {
                onClosePoll();
                handleClose();
              }}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-cairo font-bold"
            >
              إغلاق الاستطلاع
            </button>
          </>
        ) : (
          <>
            <p className="text-white/60 font-cairo text-sm">أنشئ استطلاع رأي للجمهور</p>
            <button 
              onClick={() => {
                handleClose();
                onShowCreatePollModal();
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-cairo font-bold"
            >
              إنشاء استطلاع جديد
            </button>
          </>
        )}
      </div>
    </>
  );

  // Recording Page
  const RecordPage = () => (
    <>
      <PageHeader title="تسجيل الغرفة" onBack={goBack} />
      <div className="space-y-4 text-center">
        <div className={`w-20 h-20 ${isRecording ? 'bg-red-500/20' : 'bg-rose-500/20'} rounded-full flex items-center justify-center mx-auto`}>
          {isRecording ? (
            <div className="relative">
              <StopCircle className="w-10 h-10 text-red-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
          ) : (
            <Circle className="w-10 h-10 text-rose-400" fill="currentColor" />
          )}
        </div>
        
        {isRecording ? (
          <>
            <p className="text-red-400 font-cairo font-bold text-lg">جاري التسجيل...</p>
            <p className="text-white font-mono text-2xl">{formatRecordingTime(recordingTime)}</p>
            <button 
              onClick={() => {
                onStopRecording();
                handleClose();
              }}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-cairo font-bold"
            >
              إيقاف التسجيل
            </button>
          </>
        ) : (
          <>
            <p className="text-white/60 font-cairo text-sm">سجّل محادثات الغرفة الصوتية</p>
            <p className="text-white/40 font-cairo text-xs">سيتم حفظ التسجيل على جهازك</p>
            <button 
              onClick={() => {
                onStartRecording();
                handleClose();
              }}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl font-cairo font-bold"
            >
              بدء التسجيل
            </button>
          </>
        )}
      </div>
    </>
  );

  // Stream Page
  const StreamPage = () => (
    <>
      <PageHeader title="البث المباشر" onBack={goBack} />
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto">
          <Video className="w-10 h-10 text-violet-400" />
        </div>
        <p className="text-white/60 font-cairo text-sm">شغّل بث فيديو مباشر في الغرفة</p>
        <p className="text-white/40 font-cairo text-xs">يمكنك بث محتوى من يوتيوب أو مصادر أخرى</p>
        <button 
          onClick={() => {
            handleClose();
            onShowStreamModal();
          }}
          className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-cairo font-bold"
        >
          إعداد البث
        </button>
      </div>
    </>
  );

  // Lock/Unlock Page
  const LockPage = () => (
    <>
      <PageHeader title={room?.is_closed ? 'فتح الغرفة' : 'إغلاق الغرفة'} onBack={goBack} />
      <div className="space-y-4 text-center">
        <div className={`w-20 h-20 ${room?.is_closed ? 'bg-green-500/20' : 'bg-orange-500/20'} rounded-full flex items-center justify-center mx-auto`}>
          {room?.is_closed ? (
            <Unlock className="w-10 h-10 text-green-400" />
          ) : (
            <Lock className="w-10 h-10 text-orange-400" />
          )}
        </div>
        
        {room?.is_closed ? (
          <>
            <p className="text-green-400 font-cairo font-bold">الغرفة مغلقة حالياً</p>
            <p className="text-white/60 font-cairo text-sm">فتح الغرفة سيسمح للأعضاء بالدخول</p>
            <button 
              onClick={() => {
                onToggleRoom();
                handleClose();
              }}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-cairo font-bold"
            >
              فتح الغرفة
            </button>
          </>
        ) : (
          <>
            <p className="text-orange-400 font-cairo font-bold">الغرفة مفتوحة حالياً</p>
            <p className="text-white/60 font-cairo text-sm">إغلاق الغرفة سيمنع دخول أعضاء جدد</p>
            <button 
              onClick={() => {
                onToggleRoom();
                handleClose();
              }}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-cairo font-bold"
            >
              إغلاق الغرفة
            </button>
          </>
        )}
      </div>
    </>
  );

  // Delete Page
  const DeletePage = () => (
    <>
      <PageHeader title="حذف الغرفة" onBack={goBack} />
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
          <Trash2 className="w-10 h-10 text-red-400" />
        </div>
        <p className="text-red-400 font-cairo font-bold">تحذير!</p>
        <p className="text-white/60 font-cairo text-sm">سيتم حذف الغرفة نهائياً ولا يمكن استعادتها</p>
        <p className="text-white/40 font-cairo text-xs">سيتم حذف جميع الرسائل والبيانات المرتبطة</p>
        <div className="flex gap-3 pt-4">
          <button 
            onClick={goBack}
            className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-cairo font-bold"
          >
            إلغاء
          </button>
          <button 
            onClick={() => {
              onDeleteRoom();
              handleClose();
            }}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-cairo font-bold"
          >
            حذف نهائي
          </button>
        </div>
      </div>
    </>
  );

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'title': return <TitlePage />;
      case 'image': return <ImagePage />;
      case 'roles': return <RolesPage />;
      case 'poll': return <PollPage />;
      case 'record': return <RecordPage />;
      case 'stream': return <StreamPage />;
      case 'lock': return <LockPage />;
      case 'delete': return <DeletePage />;
      default: return <MainPage />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-violet-500/30 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: currentPage === 'main' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: currentPage === 'main' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default RoomSettingsModal;
