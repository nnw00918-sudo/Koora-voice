import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Home, 
  MessageSquare, 
  Mail, 
  Settings,
  User
} from 'lucide-react';

const BottomNavigation = ({ isRTL = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useSettings();
  
  const navItems = [
    { id: 'home', icon: Home, label: 'الرئيسية', labelEn: 'Home', path: '/dashboard' },
    { id: 'threads', icon: MessageSquare, label: 'المنشورات', labelEn: 'Threads', path: '/threads' },
    { id: 'messages', icon: Mail, label: 'الرسائل', labelEn: 'Messages', path: '/messages' },
    { id: 'profile', icon: User, label: 'حسابي', labelEn: 'Profile', path: '/profile' },
    { id: 'settings', icon: Settings, label: 'الإعدادات', labelEn: 'Settings', path: '/settings' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  // Theme colors
  const primaryColor = isDarkMode ? '#CCFF00' : '#84CC16';
  const bgGradient = isDarkMode 
    ? 'bg-gradient-to-t from-slate-950 via-slate-950/98 to-slate-950/90' 
    : 'bg-gradient-to-t from-white via-white/98 to-white/90';
  const inactiveColor = isDarkMode ? 'text-slate-500' : 'text-gray-400';
  const hoverColor = isDarkMode ? 'hover:text-slate-300' : 'hover:text-gray-600';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Gradient blur background */}
      <div className={`absolute inset-0 ${bgGradient} backdrop-blur-xl`} />
      
      {/* Top border glow */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent`} style={{ background: `linear-gradient(to right, transparent, ${primaryColor}50, transparent)` }} />
      
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
                  ? '' 
                  : `${inactiveColor} ${hoverColor}`
              }`}
              style={active ? { color: primaryColor } : {}}
            >
              {/* Active indicator - top glow bar */}
              {active && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -top-2 w-8 h-1 rounded-full"
                  style={{ 
                    background: `linear-gradient(to right, ${primaryColor}, #10B981)`,
                    boxShadow: `0 0 15px ${primaryColor}99`
                  }}
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* Icon container */}
              <div 
                className={`relative p-2 rounded-xl transition-all duration-300`}
                style={active ? { 
                  backgroundColor: `${primaryColor}20`,
                  boxShadow: `0 0 20px ${primaryColor}4D`
                } : {}}
              >
                <Icon 
                  className={`w-5 h-5 transition-all duration-300`}
                  style={active ? { filter: `drop-shadow(0 0 8px ${primaryColor}CC)` } : {}}
                  strokeWidth={active ? 2.5 : 1.5} 
                />
                
                {/* Active dot indicator */}
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: primaryColor,
                      boxShadow: `0 0 8px ${primaryColor}CC`
                    }}
                  />
                )}
              </div>
              
              {/* Label */}
              <span 
                className={`text-[10px] font-cairo font-bold transition-all duration-300`}
                style={active ? { color: primaryColor } : {}}
              >
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
