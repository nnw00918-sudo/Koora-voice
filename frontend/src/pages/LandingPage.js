import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mic, MessageCircle, Users, Trophy, Play, Wifi, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden relative">
      {/* Stadium Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Pitch lines */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-white rounded-full" />
        </div>
        
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-lime-500/20 via-lime-500/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-lime-400/10 rounded-full blur-[100px]" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
        
        {/* Animated particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-lime-400/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-lg mx-auto min-h-screen flex flex-col px-6 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-8"
        >
          {/* Football Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1 }}
            className="relative inline-block mb-6"
          >
            {/* Outer ring with pulse */}
            <div className="absolute inset-0 rounded-full bg-lime-400/20 animate-ping" />
            
            {/* Main ball container */}
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-lime-400 via-lime-500 to-emerald-600 p-1 shadow-[0_0_60px_rgba(163,230,53,0.4)]">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                {/* Football pattern */}
                <div className="relative">
                  <Mic className="w-12 h-12 text-lime-400" strokeWidth={2} />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-lime-400 rounded-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Sound waves */}
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-lime-400"
            />
          </motion.div>

          {/* App Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-5xl font-cairo font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-lime-400 to-emerald-400 leading-tight mb-2">
              صوت الكورة
            </h1>
            <p className="text-xl font-bold text-lime-400/80 tracking-widest">
              KOORA VOICE
            </p>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-400 font-almarai text-base mt-4 leading-relaxed max-w-xs mx-auto"
          >
            الاستاد الرقمي لعشاق كرة القدم
            <br />
            <span className="text-lime-400/60">The Digital Stadium for Football Fans</span>
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 gap-3 mt-10"
        >
          {[
            { icon: Mic, title: 'غرف صوتية', titleEn: 'Voice Rooms', color: 'lime' },
            { icon: MessageCircle, title: 'دردشة حية', titleEn: 'Live Chat', color: 'emerald' },
            { icon: Trophy, title: 'نتائج مباشرة', titleEn: 'Live Scores', color: 'lime' },
            { icon: Users, title: 'مجتمع رياضي', titleEn: 'Community', color: 'emerald' },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 text-center group cursor-pointer`}
            >
              {/* Hover glow */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${
                feature.color === 'lime' ? 'from-lime-500/10 to-transparent' : 'from-emerald-500/10 to-transparent'
              }`} />
              
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
                feature.color === 'lime' 
                  ? 'bg-lime-500/20 text-lime-400' 
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                <feature.icon className="w-6 h-6" strokeWidth={2} />
              </div>
              <p className="text-white font-cairo font-bold text-sm">{feature.title}</p>
              <p className="text-slate-500 text-xs mt-1">{feature.titleEn}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex justify-center gap-8 mt-8"
        >
          {[
            { value: '24/7', label: 'متاح دائماً' },
            { value: 'HD', label: 'جودة عالية' },
            { value: 'LIVE', label: 'بث مباشر' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-lime-400 font-bold text-lg">{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-auto pt-8 space-y-4"
        >
          {/* Main CTA Button */}
          <Button
            data-testid="get-started-btn"
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-950 font-cairo font-black text-xl py-7 rounded-2xl shadow-[0_0_40px_rgba(163,230,53,0.3)] hover:shadow-[0_0_60px_rgba(163,230,53,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6 fill-current" />
            ابدأ الآن
          </Button>

          {/* Secondary info */}
          <div className="flex items-center justify-center gap-4 text-slate-500 text-sm">
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span>عربي / English</span>
            </div>
            <div className="w-1 h-1 bg-slate-600 rounded-full" />
            <div className="flex items-center gap-1">
              <Wifi className="w-4 h-4" />
              <span>مجاني</span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center pt-8 pb-4"
        >
          <p className="text-slate-600 text-xs font-almarai">
            © 2026 صوت الكورة - Koora Voice
          </p>
          <p className="text-slate-700 text-xs mt-1">
            جميع الحقوق محفوظة
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;
