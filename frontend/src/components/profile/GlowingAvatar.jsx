import React from 'react';
import { motion } from 'framer-motion';

// Frame color options
const FRAME_COLORS = {
  lime: { 
    gradient: "from-lime-400 via-emerald-400 to-lime-400", 
    shadow: "shadow-lime-500/50",
    label: "أخضر"
  },
  cyan: { 
    gradient: "from-cyan-400 via-blue-400 to-cyan-400", 
    shadow: "shadow-cyan-500/50",
    label: "سماوي"
  },
  purple: { 
    gradient: "from-purple-400 via-pink-400 to-purple-400", 
    shadow: "shadow-purple-500/50",
    label: "بنفسجي"
  },
  amber: { 
    gradient: "from-amber-400 via-yellow-400 to-amber-400", 
    shadow: "shadow-amber-500/50",
    label: "ذهبي"
  },
  rose: { 
    gradient: "from-rose-400 via-red-400 to-rose-400", 
    shadow: "shadow-rose-500/50",
    label: "وردي"
  },
  rainbow: { 
    gradient: "from-red-500 via-yellow-500 to-blue-500", 
    shadow: "shadow-purple-500/50",
    label: "قوس قزح"
  },
};

export const GlowingAvatar = ({ 
  src, 
  size = "large", 
  frameColor = "lime",
  isEditing = false,
  onClick
}) => {
  const sizeClasses = {
    small: "w-14 h-14",
    medium: "w-20 h-20", 
    large: "w-28 h-28",
    xlarge: "w-32 h-32"
  };

  const frameConfig = FRAME_COLORS[frameColor] || FRAME_COLORS.lime;

  return (
    <motion.div 
      className="relative cursor-pointer group"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer glow */}
      <motion.div
        className={`absolute -inset-1 ${sizeClasses[size]} rounded-full bg-gradient-to-r ${frameConfig.gradient} blur-lg opacity-60`}
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.7, 0.4],
          rotate: [0, 180, 360]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
      
      {/* Inner ring */}
      <motion.div
        className={`absolute -inset-0.5 rounded-full bg-gradient-to-r ${frameConfig.gradient} p-[3px]`}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <div className={`${sizeClasses[size]} rounded-full bg-slate-950`} />
      </motion.div>
      
      {/* Avatar image */}
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden ring-2 ring-slate-900`}>
        <img 
          src={src || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
          alt="Avatar"
          className="w-full h-full object-cover"
        />
        
        {/* Edit overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-cairo">تغيير</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export { FRAME_COLORS };
