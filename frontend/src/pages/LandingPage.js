import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mic, MessageCircle, Users, Trophy, Play, Radio, Tv, Flame, ChevronLeft } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const features = [
    { 
      icon: Mic, 
      title: 'غرف صوتية', 
      subtitle: 'Voice Rooms',
      desc: 'تحدث مع المشجعين',
      color: 'from-lime-500 to-emerald-600',
      size: 'col-span-1'
    },
    { 
      icon: Tv, 
      title: 'بث مباشر', 
      subtitle: 'Live Stream',
      desc: 'شاهد المباريات',
      color: 'from-red-500 to-orange-600',
      size: 'col-span-1',
      live: true
    },
    { 
      icon: Trophy, 
      title: 'نتائج مباشرة', 
      subtitle: 'Live Scores',
      desc: 'تابع النتائج لحظة بلحظة',
      color: 'from-amber-500 to-yellow-600',
      size: 'col-span-2',
      match: true
    },
    { 
      icon: Users, 
      title: 'مجتمع رياضي', 
      subtitle: 'Community',
      desc: 'تواصل مع عشاق الكورة',
      color: 'from-blue-500 to-cyan-600',
      size: 'col-span-1'
    },
    { 
      icon: MessageCircle, 
      title: 'دردشة حية', 
      subtitle: 'Live Chat',
      desc: 'شارك رأيك',
      color: 'from-purple-500 to-pink-600',
      size: 'col-span-1'
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-hidden" dir="rtl">
      {/* Hero Section with Stadium Background */}
      <div className="relative min-h-screen">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/4122451/pexels-photo-4122451.jpeg)',
          }}
        />
        
        {/* Heavy Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-[#0A0A0A]" />
        
        {/* Animated Grain Texture */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#CCFF00]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-20 right-0 w-[300px] h-[300px] bg-[#CCFF00]/5 rounded-full blur-[100px]" />
        
        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col px-5 py-8 max-w-lg mx-auto">
          
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="text-center pt-12 mb-8"
          >
            {/* Animated Logo */}
            <div className="relative inline-block mb-6">
              {/* Pulse Ring */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-[#CCFF00]"
              />
              
              {/* Main Logo */}
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#CCFF00] to-[#00FF66] p-[3px]">
                <div className="w-full h-full rounded-full bg-[#0A0A0A] flex items-center justify-center">
                  <Radio className="w-10 h-10 text-[#CCFF00]" />
                </div>
              </div>
              
              {/* Live Dot */}
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center"
              >
                <span className="text-[8px] font-bold text-white">LIVE</span>
              </motion.div>
            </div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-cairo font-black text-white mb-2"
              style={{ textShadow: '0 0 40px rgba(204,255,0,0.3)' }}
            >
              صوت الكورة
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[#CCFF00] font-bold tracking-[0.3em] text-sm"
            >
              KOORA VOICE
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-400 mt-4 font-almarai text-base"
            >
              الاستاد الرقمي لعشاق كرة القدم
            </motion.p>
          </motion.div>

          {/* Bento Grid Features */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 gap-3 flex-1"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${feature.size} relative overflow-hidden rounded-2xl bg-[#121212]/80 backdrop-blur-xl border border-white/5 p-4 cursor-pointer group hover:border-[#CCFF00]/30 transition-colors`}
                data-testid={`feature-${feature.subtitle.toLowerCase().replace(' ', '-')}`}
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                {/* Live Badge */}
                {feature.live && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/20 px-2 py-1 rounded-full">
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 bg-red-500 rounded-full"
                    />
                    <span className="text-red-400 text-[10px] font-bold">LIVE</span>
                  </div>
                )}
                
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Text */}
                <h3 className="text-white font-cairo font-bold text-lg">{feature.title}</h3>
                <p className="text-gray-500 text-xs">{feature.subtitle}</p>
                
                {/* Match Score Preview for Live Scores */}
                {feature.match && (
                  <div className="mt-3 bg-[#0A0A0A] rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-white font-bold text-sm">ريال مدريد</p>
                        <p className="text-2xl font-black text-[#CCFF00]">2</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <motion.div
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-2 h-2 bg-red-500 rounded-full mb-1"
                        />
                        <span className="text-gray-400 text-xs">78'</span>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-bold text-sm">برشلونة</p>
                        <p className="text-2xl font-black text-white">1</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex justify-center gap-8 py-6 border-t border-white/5 mt-6"
          >
            {[
              { value: 'LIVE', label: 'بث مباشر', color: 'text-red-500' },
              { value: 'HD', label: 'جودة عالية', color: 'text-[#CCFF00]' },
              { value: '24/7', label: 'متاح دائماً', color: 'text-blue-400' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className={`font-black text-xl ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-500 text-xs font-almarai">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="pb-8"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="w-full py-4 rounded-2xl bg-[#CCFF00] text-[#0A0A0A] font-cairo font-black text-lg flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(204,255,0,0.3)]"
              data-testid="get-started-btn"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              ابدأ الآن
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            
            <p className="text-center text-gray-500 text-xs mt-4 font-almarai">
              انضم لأكثر من <span className="text-[#CCFF00] font-bold">10,000+</span> مشجع
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
