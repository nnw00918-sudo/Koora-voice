import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Trash2, Link, Check } from 'lucide-react';

export const BackgroundPickerModal = ({
  show,
  onClose,
  chatBackground,
  uploadingImage,
  backgroundInputRef,
  onBackgroundUpload,
  onRemoveBackground,
  onUrlSubmit
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) return;
    setUrlLoading(true);
    try {
      await onUrlSubmit(imageUrl.trim());
      setImageUrl('');
      setShowUrlInput(false);
    } catch (e) {
      console.error(e);
    } finally {
      setUrlLoading(false);
    }
  };

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
          <label className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-gradient-to-r from-pink-500/30 to-purple-500/30 hover:from-pink-500/40 hover:to-purple-500/40 border border-pink-500/50 cursor-pointer transition-colors">
            <ImageIcon className="w-6 h-6 text-pink-400" />
            <span className="text-pink-300 font-cairo font-bold">
              {uploadingImage ? 'جاري الرفع...' : 'اختر صورة من الألبوم'}
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

          {/* Add URL button */}
          {!showUrlInput ? (
            <button 
              onClick={() => setShowUrlInput(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 transition-colors"
            >
              <Link className="w-6 h-6 text-blue-400" />
              <span className="text-blue-400 font-cairo font-bold">أضف رابط صورة</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-3 py-3 rounded-xl bg-slate-800 border border-blue-500/50 text-white text-sm font-almarai placeholder-slate-500 focus:outline-none focus:border-blue-400"
                  dir="ltr"
                  disabled={urlLoading}
                />
                <button
                  onClick={handleUrlSubmit}
                  disabled={!imageUrl.trim() || urlLoading}
                  className="px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
                >
                  {urlLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <button
                onClick={() => { setShowUrlInput(false); setImageUrl(''); }}
                className="text-slate-400 text-xs font-almarai hover:text-white transition-colors"
              >
                إلغاء
              </button>
            </div>
          )}
          
          {/* Remove background */}
          {chatBackground && (
            <button 
              onClick={onRemoveBackground}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors"
            >
              <Trash2 className="w-6 h-6 text-slate-400" />
              <span className="text-slate-300 font-cairo font-bold">إزالة الخلفية</span>
            </button>
          )}
        </div>
        
        <button 
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-cairo font-bold hover:bg-white/20 transition-colors"
        >
          إغلاق
        </button>
      </motion.div>
    </motion.div>
  );
};

export default BackgroundPickerModal;
