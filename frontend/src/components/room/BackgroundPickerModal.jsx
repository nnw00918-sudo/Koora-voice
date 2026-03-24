import React from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Trash2 } from 'lucide-react';

export const BackgroundPickerModal = ({
  show,
  onClose,
  chatBackground,
  uploadingImage,
  backgroundInputRef,
  onBackgroundUpload,
  onRemoveBackground
}) => {
  if (!show) return null;

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
        className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-sm rounded-3xl p-6 border border-lime-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-cairo font-bold text-white mb-4 text-center">🖼️ خلفية الدردشة</h3>
        
        {/* Current Background Preview */}
        {chatBackground && (
          <div className="mb-4 relative rounded-xl overflow-hidden h-32">
            <img src={chatBackground} alt="الخلفية الحالية" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-white text-sm font-almarai">الخلفية الحالية</span>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {/* Upload from album */}
          <label className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/50 cursor-pointer transition-colors">
            <ImageIcon className="w-6 h-6 text-lime-400" />
            <span className="text-lime-400 font-cairo font-bold">
              {uploadingImage ? 'جاري الرفع...' : 'اختر من الألبوم'}
            </span>
            <input
              type="file"
              ref={backgroundInputRef}
              onChange={onBackgroundUpload}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              disabled={uploadingImage}
            />
          </label>
          
          {/* Remove background */}
          {chatBackground && (
            <button 
              onClick={onRemoveBackground}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
            >
              <Trash2 className="w-6 h-6 text-red-400" />
              <span className="text-red-400 font-cairo font-bold">إزالة الخلفية</span>
            </button>
          )}
        </div>
        
        <button 
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold"
        >
          إلغاء
        </button>
      </motion.div>
    </motion.div>
  );
};

export default BackgroundPickerModal;
