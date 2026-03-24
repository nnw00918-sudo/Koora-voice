import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  MessageSquare, 
  Mail, 
  Settings 
} from 'lucide-react';

const BottomNavigation = ({ isRTL = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { id: 'home', icon: Home, label: 'الرئيسية', labelEn: 'Home', path: '/dashboard' },
    { id: 'threads', icon: MessageSquare, label: 'المنشورات', labelEn: 'Threads', path: '/threads' },
    { id: 'messages', icon: Mail, label: 'الرسائل', labelEn: 'Messages', path: '/messages' },
    { id: 'settings', icon: Settings, label: 'الإعدادات', labelEn: 'Settings', path: '/settings' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Gradient blur background */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/98 to-slate-950/90 backdrop-blur-xl" />
      
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime-500/50 to-transparent" />
      
      {/* Navigation content */}
      <div className={`relative max-w-[600px] mx-auto flex justify-around items-end py-2 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              className={`relative flex flex-col items-center gap-1 min-w-[60px] py-2 px-3 rounded-2xl transition-all duration-300 ${
                active 
                  ? 'text-lime-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {/* Active indicator - top glow bar */}
              {active && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -top-2 w-8 h-1 bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(163,230,53,0.6)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* Icon container */}
              <div className={`relative p-2 rounded-xl transition-all duration-300 ${
                active 
                  ? 'bg-lime-500/20 shadow-[0_0_20px_rgba(163,230,53,0.3)]' 
                  : 'bg-transparent'
              }`}>
                <Icon 
                  className={`w-5 h-5 transition-all duration-300 ${
                    active ? 'drop-shadow-[0_0_8px_rgba(163,230,53,0.8)]' : ''
                  }`} 
                  strokeWidth={active ? 2.5 : 1.5} 
                />
                
                {/* Active dot indicator */}
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-2 h-2 bg-lime-400 rounded-full shadow-[0_0_8px_rgba(163,230,53,0.8)]"
                  />
                )}
              </div>
              
              {/* Label */}
              <span className={`text-[10px] font-cairo font-bold transition-all duration-300 ${
                active ? 'text-lime-400' : 'text-slate-500'
              }`}>
                {isRTL ? item.label : item.labelEn}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
