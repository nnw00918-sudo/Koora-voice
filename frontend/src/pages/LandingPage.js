import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] overflow-hidden selection:bg-[#CCFF00] selection:text-black" dir="rtl">
      
      {/* Background */}
      <div className="fixed inset-0">
        {/* Stadium Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/7258838/pexels-photo-7258838.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          }}
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/90" />
        
        {/* Glow Effect */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#CCFF00]/20 rounded-full blur-[100px]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        
        {/* Logo Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="mb-8"
        >
          <div className="relative">
            {/* Outer Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-32 h-32 rounded-full border-2 border-[#CCFF00]/30 flex items-center justify-center"
            >
              {/* Inner Circle with Icon */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#CCFF00]/20 to-[#00FF66]/20 border border-[#CCFF00]/50 flex items-center justify-center backdrop-blur-sm">
                <Radio className="w-12 h-12 text-[#CCFF00]" />
              </div>
            </motion.div>
            
            {/* LIVE Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-500 rounded-full flex items-center gap-1"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-bold">LIVE</span>
            </motion.div>
          </div>
        </motion.div>

        {/* App Name - Arabic */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-5xl sm:text-6xl font-bold text-white font-cairo mb-2 text-center"
        >
          صوت الكورة
        </motion.h1>

        {/* App Name - English */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-[#CCFF00] text-lg sm:text-xl tracking-[0.3em] font-bold mb-16"
        >
          KOORA VOICE
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full max-w-xs space-y-4"
        >
          {/* Login Button */}
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 rounded-2xl bg-[#CCFF00] hover:bg-[#b8e600] text-black font-cairo font-bold text-lg transition-all duration-300 shadow-lg shadow-[#CCFF00]/20 hover:shadow-[#CCFF00]/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            تسجيل دخول
          </button>

          {/* Register Button */}
          <button
            onClick={() => navigate('/register')}
            className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/40 text-white font-cairo font-bold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            إنشاء حساب
          </button>
        </motion.div>

        {/* Footer Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="absolute bottom-8 text-slate-500 text-sm font-almarai"
        >
          الاستاد الرقمي لعشاق كرة القدم
        </motion.p>
      </div>
    </div>
  );
};

export default LandingPage;
