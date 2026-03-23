import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, MessageCircle, Users, Play, Radio, Tv, 
  Flame, ChevronLeft, Volume2, Zap, Star, TrendingUp,
  Headphones, Wifi, Crown, Target
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const features = [
    { 
      icon: Mic, 
      title: 'غرف صوتية',
      desc: 'تحدث مباشرة مع المشجعين',
      gradient: 'from-[#CCFF00] to-[#00FF66]',
      delay: 0.1
    },
    { 
      icon: Tv, 
      title: 'بث مباشر',
      desc: 'شاهد المباريات مع الجمهور',
      gradient: 'from-[#FF3B30] to-[#FF6B00]',
      live: true,
      delay: 0.2
    },
    { 
      icon: Crown, 
      title: 'ملفك الشخصي',
      desc: 'خصص حسابك وتميز عن الجميع',
      gradient: 'from-[#FFD700] to-[#FFA500]',
      delay: 0.3
    },
    { 
      icon: Users, 
      title: 'مجتمع رياضي',
      desc: 'انضم لآلاف المشجعين',
      gradient: 'from-[#00D4FF] to-[#0066FF]',
      delay: 0.4
    },
  ];

  const stats = [
    { icon: Headphones, value: '50K+', label: 'مستخدم نشط' },
    { icon: Radio, value: '200+', label: 'غرفة يومياً' },
    { icon: Zap, value: 'LIVE', label: 'بث مباشر', isLive: true },
  ];

  return (
    <div className="min-h-screen bg-[#050505] overflow-hidden selection:bg-[#CCFF00] selection:text-black" dir="rtl">
      
      {/* Animated Background */}
      <div className="fixed inset-0">
        {/* Stadium Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/7258838/pexels-photo-7258838.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          }}
        />
        
        {/* Dark Overlay Layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-[#050505]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        
        {/* Animated Glow Orbs */}
        <motion.div
          animate={{ 
            x: [0, 50, 0], 
            y: [0, -30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-10 w-[400px] h-[400px] bg-[#CCFF00]/20 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{ 
            x: [0, -30, 0], 
            y: [0, 50, 0],
            scale: [1.2, 1, 1.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-40 left-0 w-[300px] h-[300px] bg-[#00FF66]/10 rounded-full blur-[120px]"
        />
        
        {/* Noise Texture */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
        
        {/* Grid Lines */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(204,255,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(204,255,0,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col px-4 sm:px-6 py-6 max-w-lg mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
            <span className="text-[#FF3B30] text-xs font-bold tracking-wider">LIVE NOW</span>
          </div>
          <button 
            onClick={() => navigate('/auth')}
            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-colors"
            data-testid="login-header-btn"
          >
            تسجيل الدخول
          </button>
        </motion.div>

        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 1, delay: 0.2 }}
          className="text-center mb-10"
        >
          {/* Animated Logo */}
          <div className="relative inline-block mb-6">
            {/* Outer Glow Ring */}
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1], 
                opacity: [0.3, 0, 0.3] 
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-[-20px] rounded-full bg-[#CCFF00]/20 blur-xl"
            />
            
            {/* Main Logo Circle */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32">
              {/* Spinning Border */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #CCFF00, #00FF66, #CCFF00)',
                  padding: '3px',
                }}
              >
                <div className="w-full h-full rounded-full bg-[#050505]" />
              </motion.div>
              
              {/* Inner Content */}
              <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-[#0A0A0A] to-[#151515] flex items-center justify-center border border-[#CCFF00]/20">
                <Radio className="w-12 h-12 sm:w-14 sm:h-14 text-[#CCFF00] drop-shadow-[0_0_20px_rgba(204,255,0,0.5)]" />
              </div>
            </div>
            
            {/* Live Badge */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -top-2 -right-2 flex items-center gap-1 bg-[#FF3B30] px-2.5 py-1 rounded-full shadow-[0_0_20px_rgba(255,59,48,0.5)]"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-white text-[10px] font-black tracking-wider">LIVE</span>
            </motion.div>
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl sm:text-6xl font-cairo font-black text-white mb-2 tracking-tight"
            style={{ 
              textShadow: '0 0 60px rgba(204,255,0,0.4), 0 4px 30px rgba(0,0,0,0.5)',
            }}
          >
            صوت الكورة
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '120px' }}
            transition={{ delay: 0.6 }}
            className="h-[2px] bg-gradient-to-r from-transparent via-[#CCFF00] to-transparent mx-auto mb-3"
          />
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-[#CCFF00] font-bold tracking-[0.4em] text-xs sm:text-sm"
          >
            KOORA VOICE
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-white/50 mt-4 font-almarai text-sm sm:text-base"
          >
            الاستاد الرقمي لعشاق كرة القدم
          </motion.p>
        </motion.div>

        {/* Welcome Card - Replacing Match Ticker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A0A0A] to-[#121212] border border-[#CCFF00]/20 p-6">
            {/* Decorative Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#CCFF00]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#00FF66]/10 rounded-full blur-2xl" />
            
            <div className="relative flex flex-col items-center text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 bg-gradient-to-br from-[#CCFF00] to-[#00FF66] rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(204,255,0,0.4)]"
              >
                <Users className="w-8 h-8 text-black" />
              </motion.div>
              
              <h3 className="text-white font-cairo font-bold text-xl mb-2">انضم للمجتمع الآن!</h3>
              <p className="text-white/50 text-sm mb-4">آلاف المشجعين ينتظرونك في الغرف الصوتية</p>
              
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 bg-[#00FF66] rounded-full"
                />
                <span className="text-[#CCFF00] text-sm font-bold">متصل الآن: 1.2K+</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + feature.delay }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="relative overflow-hidden rounded-2xl bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/5 p-4 cursor-pointer group hover:border-[#CCFF00]/30 transition-all duration-300"
              data-testid={`feature-${feature.title}`}
            >
              {/* Hover Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              {/* Live Badge */}
              {feature.live && (
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#FF3B30]/20 px-1.5 py-0.5 rounded-full">
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full"
                  />
                  <span className="text-[#FF3B30] text-[8px] font-bold">LIVE</span>
                </div>
              )}
              
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:shadow-[0_0_30px_rgba(204,255,0,0.2)] transition-shadow`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              
              {/* Text */}
              <h3 className="text-white font-cairo font-bold text-base">{feature.title}</h3>
              <p className="text-white/40 text-xs mt-1 font-almarai">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="flex justify-between items-center px-4 py-4 mb-8 rounded-2xl bg-[#0A0A0A]/80 border border-white/5"
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center flex-1">
              <div className="flex justify-center mb-2">
                {stat.isLive ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-[#FF3B30]/20 flex items-center justify-center"
                  >
                    <stat.icon className="w-5 h-5 text-[#FF3B30]" />
                  </motion.div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#CCFF00]/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-[#CCFF00]" />
                  </div>
                )}
              </div>
              <p className={`font-black text-xl ${stat.isLive ? 'text-[#FF3B30]' : 'text-[#CCFF00]'}`}>{stat.value}</p>
              <p className="text-white/40 text-[10px] font-almarai mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
          className="mt-auto pb-6"
        >
          {/* Main CTA Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/auth')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#CCFF00] to-[#B3E600] text-[#050505] font-cairo font-black text-lg flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(204,255,0,0.3)] hover:shadow-[0_0_60px_rgba(204,255,0,0.5)] transition-shadow"
            data-testid="get-started-btn"
          >
            <Play className="w-5 h-5" fill="currentColor" />
            <span>ابدأ الآن مجاناً</span>
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          
          {/* Secondary Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="flex items-center justify-center gap-4 mt-4"
          >
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <Crown className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>مجاني 100%</span>
            </div>
            <div className="w-1 h-1 bg-white/20 rounded-full" />
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <Wifi className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>بدون تسجيل</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
