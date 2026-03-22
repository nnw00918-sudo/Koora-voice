import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle,
  Send,
  Users,
  Link2
} from 'lucide-react';
import { toast } from 'sonner';

// Social media icons as SVG components
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const InviteFriendsModal = ({ isOpen, onClose, roomId, roomTitle }) => {
  const [copied, setCopied] = useState(false);
  
  const baseUrl = window.location.origin;
  const inviteLink = `${baseUrl}/room/${roomId}?invite=true`;
  const shareText = `انضم معي في غرفة "${roomTitle}" على صوت الكورة! 🎙️⚽`;
  const shareTextEncoded = encodeURIComponent(shareText);
  const linkEncoded = encodeURIComponent(inviteLink);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('تم نسخ الرابط!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('فشل نسخ الرابط');
    }
  };
  
  const shareOptions = [
    {
      name: 'واتساب',
      icon: WhatsAppIcon,
      color: 'bg-[#25D366] hover:bg-[#20BA5A]',
      url: `https://wa.me/?text=${shareTextEncoded}%20${linkEncoded}`
    },
    {
      name: 'تيليجرام',
      icon: TelegramIcon,
      color: 'bg-[#0088cc] hover:bg-[#0077b5]',
      url: `https://t.me/share/url?url=${linkEncoded}&text=${shareTextEncoded}`
    },
    {
      name: 'تويتر',
      icon: TwitterIcon,
      color: 'bg-black hover:bg-gray-800',
      url: `https://twitter.com/intent/tweet?text=${shareTextEncoded}&url=${linkEncoded}`
    }
  ];
  
  const handleShare = (url) => {
    window.open(url, '_blank', 'width=600,height=400');
  };
  
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `غرفة ${roomTitle}`,
          text: shareText,
          url: inviteLink
        });
        toast.success('تمت المشاركة!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('فشلت المشاركة');
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] rounded-3xl p-6 w-full max-w-md border border-[#CCFF00]/20 shadow-[0_0_50px_rgba(204,255,0,0.1)]"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#CCFF00]/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#CCFF00]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">دعوة أصدقاء</h2>
                  <p className="text-sm text-white/50">شارك رابط الغرفة</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            {/* Room Info */}
            <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#CCFF00]/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#CCFF00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{roomTitle}</p>
                  <p className="text-xs text-white/40">غرفة صوتية</p>
                </div>
              </div>
            </div>
            
            {/* Copy Link Section */}
            <div className="mb-6">
              <label className="text-sm text-white/60 mb-2 block">رابط الدعوة</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#0a0a14] rounded-xl px-4 py-3 border border-white/10 flex items-center gap-2 overflow-hidden">
                  <Link2 className="w-4 h-4 text-[#CCFF00] flex-shrink-0" />
                  <span className="text-white/70 text-sm truncate">{inviteLink}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={copyToClipboard}
                  className={`px-4 rounded-xl flex items-center justify-center transition-all ${
                    copied 
                      ? 'bg-green-500 text-white' 
                      : 'bg-[#CCFF00] text-black hover:bg-[#b8e600]'
                  }`}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>
            
            {/* Share Options */}
            <div className="space-y-3">
              <label className="text-sm text-white/60 block">شارك عبر</label>
              
              <div className="grid grid-cols-3 gap-3">
                {shareOptions.map((option) => (
                  <motion.button
                    key={option.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleShare(option.url)}
                    className={`${option.color} rounded-xl p-4 flex flex-col items-center gap-2 transition-colors`}
                  >
                    <option.icon />
                    <span className="text-white text-xs font-medium">{option.name}</span>
                  </motion.button>
                ))}
              </div>
              
              {/* Native Share (Mobile) */}
              {navigator.share && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNativeShare}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 flex items-center justify-center gap-3 transition-colors"
                >
                  <Share2 className="w-5 h-5 text-[#CCFF00]" />
                  <span className="text-white font-medium">المزيد من الخيارات</span>
                </motion.button>
              )}
            </div>
            
            {/* Footer Note */}
            <p className="text-center text-white/30 text-xs mt-6">
              سيتمكن أي شخص لديه الرابط من الانضمام للغرفة
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Invite Friends Button Component
export const InviteFriendsButton = ({ onClick, variant = 'default' }) => {
  if (variant === 'icon') {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="w-12 h-12 rounded-full bg-[#CCFF00]/20 hover:bg-[#CCFF00]/30 flex items-center justify-center transition-colors"
        title="دعوة أصدقاء"
      >
        <Share2 className="w-5 h-5 text-[#CCFF00]" />
      </motion.button>
    );
  }
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-2 bg-[#CCFF00]/20 hover:bg-[#CCFF00]/30 text-[#CCFF00] px-4 py-2 rounded-xl transition-colors"
    >
      <Share2 className="w-4 h-4" />
      <span className="text-sm font-medium">دعوة أصدقاء</span>
    </motion.button>
  );
};
