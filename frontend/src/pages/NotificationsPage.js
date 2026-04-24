import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { API, WS_BACKEND_URL } from '../config/api';
import { 
  Home, MessageSquare, User, Settings, ArrowRight, ArrowLeft,
  Heart, MessageCircle, UserPlus, Bell, Check, Repeat2
} from 'lucide-react';

const WS_URL = WS_BACKEND_URL;

const NotificationsPage = ({ user }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isDarkMode } = useSettings();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const wsRef = useRef(null);
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const txt = {
    ar: {
      notifications: 'الإشعارات',
      noNotifications: 'لا توجد إشعارات',
      markAllRead: 'تحديد الكل كمقروء',
      likedYourPost: 'أعجب بمنشورك',
      repliedToYour: 'رد على منشورك',
      startedFollowing: 'بدأ بمتابعتك',
      sentMessage: 'أرسل لك رسالة',
      reposted: 'أعاد نشر منشورك',
      justNow: 'الآن',
      minutesAgo: 'د',
      hoursAgo: 'س',
      daysAgo: 'ي',
      home: 'الرئيسية',
      threads: 'ثريد',
      messages: 'الرسائل',
      profile: 'الملف',
      settings: 'الإعدادات',
    },
    en: {
      notifications: 'Notifications',
      noNotifications: 'No notifications',
      markAllRead: 'Mark all as read',
      likedYourPost: 'liked your post',
      repliedToYour: 'replied to your post',
      startedFollowing: 'started following you',
      sentMessage: 'sent you a message',
      reposted: 'reposted your post',
      justNow: 'just now',
      minutesAgo: 'm',
      hoursAgo: 'h',
      daysAgo: 'd',
      home: 'Home',
      threads: 'Threads',
      messages: 'Messages',
      profile: 'Profile',
      settings: 'Settings',
    }
  }[language];

  useEffect(() => {
    fetchNotifications();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    if (!token) return;
    
    const ws = new WebSocket(`${WS_URL}/ws/${token}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Play notification sound
        playNotificationSound();
        
        // Vibrate if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    };
    
    wsRef.current = ws;
  };

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      // Second beep
      const oscillator2 = audioContext.createOscillator();
      oscillator2.connect(gainNode);
      oscillator2.frequency.value = 1000;
      oscillator2.type = 'sine';
      oscillator2.start(audioContext.currentTime + 0.15);
      oscillator2.stop(audioContext.currentTime + 0.25);
    } catch (error) {
      // Silent fallback when audio APIs are unavailable.
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read');
    }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.read) {
      try {
        await axios.post(`${API}/notifications/${notif.id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => 
          n.id === notif.id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read');
      }
    }
    
    // Navigate based on type
    if (notif.type === 'follow') {
      navigate(`/user/${notif.from_user.id}`);
    } else if (notif.type === 'message') {
      navigate('/messages');
    } else if (notif.thread_id) {
      navigate('/threads');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return txt.justNow;
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return txt.justNow;
    if (diff < 3600) return `${Math.floor(diff / 60)}${txt.minutesAgo}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${txt.hoursAgo}`;
    return `${Math.floor(diff / 86400)}${txt.daysAgo}`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-current" />;
      case 'reply': return <MessageCircle className="w-5 h-5 text-sky-500" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'message': return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'repost': return <Repeat2 className="w-5 h-5 text-green-500" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getNotificationText = (type) => {
    switch (type) {
      case 'like': return txt.likedYourPost;
      case 'reply': return txt.repliedToYour;
      case 'follow': return txt.startedFollowing;
      case 'message': return txt.sentMessage;
      case 'repost': return txt.reposted;
      default: return '';
    }
  };

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-slate-800 px-6 py-3 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {[
          { icon: Home, label: txt.home, path: '/' },
          { icon: MessageSquare, label: txt.threads, path: '/threads' },
          { icon: Bell, label: txt.notifications, path: '/notifications', active: true, badge: unreadCount },
          { icon: User, label: txt.profile, path: '/profile' },
          { icon: Settings, label: txt.settings, path: '/settings' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 relative ${item.active ? 'text-sky-400' : 'text-slate-500'}`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-almarai">{item.label}</span>
            {item.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 backdrop-blur-xl z-10 ${isDarkMode ? 'bg-black/95 border-b border-slate-800' : 'bg-white/95 border-b border-gray-200'}`}>
        <div className={`flex items-center justify-between p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h1 className={`text-xl font-cairo font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{txt.notifications}</h1>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}
            >
              <Check className="w-4 h-4" />
              <span className="font-almarai">{txt.markAllRead}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-200'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${isDarkMode ? 'border-sky-500' : 'border-sky-600'}`}></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className={`w-16 h-16 mb-4 ${isDarkMode ? 'text-slate-700' : 'text-gray-400'}`} />
            <p className={`font-almarai ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{txt.noNotifications}</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif, index) => (
              <motion.button
                key={notif.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full p-4 flex items-start gap-3 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${!notif.read ? (isDarkMode ? 'bg-sky-500/5' : 'bg-sky-50') : ''} ${isDarkMode ? 'hover:bg-slate-900/50' : 'hover:bg-gray-100'}`}
                data-testid={`notification-${notif.id}`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                  {getNotificationIcon(notif.type)}
                </div>
                
                {/* Avatar */}
                {notif.from_user && (
                  <img 
                    src={notif.from_user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.from_user.username}`}
                    alt=""
                    className="w-10 h-10 rounded-full flex-shrink-0 cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/${notif.from_user.id}`);
                    }}
                  />
                )}
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-almarai text-sm">
                    <span 
                      className="font-bold cursor-pointer hover:text-lime-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user/${notif.from_user?.id}`);
                      }}
                    >
                      {notif.from_user?.name || notif.from_user?.username}
                    </span>
                    {' '}
                    <span className="text-slate-400">{getNotificationText(notif.type)}</span>
                  </p>
                  {notif.message && (
                    <p className="text-slate-500 text-sm mt-1 truncate">{notif.message}</p>
                  )}
                  <p className="text-slate-600 text-xs mt-1">{formatTime(notif.created_at)}</p>
                </div>
                
                {/* Unread indicator */}
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-2"></div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
