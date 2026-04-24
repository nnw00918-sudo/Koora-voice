import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { API, WS_BACKEND_URL } from '../config/api';
import { 
  Home, MessageSquare, User, Settings,
  Heart, MessageCircle, UserPlus, Bell, Check, Repeat2
} from 'lucide-react';

const WS_URL = WS_BACKEND_URL;
const NOTIFICATION_TEXT_KEYS = {
  like: 'likedYourPost',
  reply: 'repliedToYour',
  follow: 'startedFollowing',
  message: 'sentMessage',
  repost: 'reposted'
};

const NOTIFICATION_ICON_CONFIG = {
  like: { Icon: Heart, className: 'w-5 h-5 text-red-500 fill-current' },
  reply: { Icon: MessageCircle, className: 'w-5 h-5 text-sky-500' },
  follow: { Icon: UserPlus, className: 'w-5 h-5 text-green-500' },
  message: { Icon: MessageSquare, className: 'w-5 h-5 text-purple-500' },
  repost: { Icon: Repeat2, className: 'w-5 h-5 text-green-500' },
  default: { Icon: Bell, className: 'w-5 h-5 text-slate-500' }
};

const buildNotificationsSignature = (items = []) => (
  items
    .map((item) => `${item.id}|${item.read ? 1 : 0}|${item.created_at || ''}|${item.type || ''}|${item.message || ''}`)
    .join('~')
);

const NotificationRow = memo(function NotificationRow({
  notif,
  index,
  isDarkMode,
  isRTL,
  text,
  timeText,
  onNotificationClick,
  onProfileClick
}) {
  const iconConfig = NOTIFICATION_ICON_CONFIG[notif.type] || NOTIFICATION_ICON_CONFIG.default;
  const NotificationIcon = iconConfig.Icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onNotificationClick(notif)}
      className={`w-full p-4 flex items-start gap-3 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${!notif.read ? (isDarkMode ? 'bg-sky-500/5' : 'bg-sky-50') : ''} ${isDarkMode ? 'hover:bg-slate-900/50' : 'hover:bg-gray-100'}`}
      data-testid={`notification-${notif.id}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
        <NotificationIcon className={iconConfig.className} />
      </div>

      {notif.from_user && (
        <img
          src={notif.from_user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.from_user.username}`}
          alt=""
          className="w-10 h-10 rounded-full flex-shrink-0 cursor-pointer hover:opacity-80"
          onClick={(event) => {
            event.stopPropagation();
            onProfileClick(notif.from_user.id);
          }}
        />
      )}

      <div className="flex-1 min-w-0">
        <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-almarai text-sm`}>
          <span
            className={`font-bold cursor-pointer ${isDarkMode ? 'hover:text-lime-400' : 'hover:text-lime-600'}`}
            onClick={(event) => {
              event.stopPropagation();
              onProfileClick(notif.from_user?.id);
            }}
          >
            {notif.from_user?.name || notif.from_user?.username}
          </span>
          {' '}
          <span className={isDarkMode ? 'text-slate-400' : 'text-gray-600'}>{text}</span>
        </p>
        {notif.message && (
          <p className={`${isDarkMode ? 'text-slate-500' : 'text-gray-500'} text-sm mt-1 truncate`}>{notif.message}</p>
        )}
        <p className={`${isDarkMode ? 'text-slate-600' : 'text-gray-400'} text-xs mt-1`}>{timeText}</p>
      </div>

      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-2" />
      )}
    </motion.button>
  );
});

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isDarkMode } = useSettings();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const notificationsSignatureRef = useRef('');
  const notificationIdsRef = useRef(new Set());
  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  const txt = useMemo(() => ({
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
  }), [])[language];

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications]
  );

  const updateNotifications = useCallback((updater) => {
    setNotifications((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const signature = buildNotificationsSignature(next);
      if (signature === notificationsSignatureRef.current) {
        return prev;
      }
      notificationsSignatureRef.current = signature;
      notificationIdsRef.current = new Set(next.map((item) => item.id));
      return next;
    });
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
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

      const oscillator2 = audioContext.createOscillator();
      oscillator2.connect(gainNode);
      oscillator2.frequency.value = 1000;
      oscillator2.type = 'sine';
      oscillator2.start(audioContext.currentTime + 0.15);
      oscillator2.stop(audioContext.currentTime + 0.25);
    } catch {
      // Ignore audio failures silently.
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateNotifications(res.data.notifications || []);
    } catch {
      console.error('Error fetching notifications');
    } finally {
      setLoading(false);
    }
  }, [token, updateNotifications]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateNotifications((prev) => {
        let hasChanges = false;
        const next = prev.map((item) => {
          if (item.id !== notificationId || item.read) {
            return item;
          }
          hasChanges = true;
          return { ...item, read: true };
        });
        return hasChanges ? next : prev;
      });
    } catch {
      console.error('Error marking notification as read');
    }
  }, [token, updateNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.post(`${API}/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateNotifications((prev) => {
        let hasUnread = false;
        const next = prev.map((item) => {
          if (item.read) {
            return item;
          }
          hasUnread = true;
          return { ...item, read: true };
        });
        return hasUnread ? next : prev;
      });
    } catch {
      console.error('Error marking notifications as read');
    }
  }, [token, updateNotifications]);

  const getNotificationPath = useCallback((notif) => {
    if (notif.type === 'follow' && notif.from_user?.id) {
      return `/user/${notif.from_user.id}`;
    }
    if (notif.type === 'message') {
      return '/messages';
    }
    if (notif.thread_id) {
      return '/threads';
    }
    return null;
  }, []);

  const handleNotificationClick = useCallback(async (notif) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }

    const path = getNotificationPath(notif);
    if (path) {
      navigate(path);
    }
  }, [getNotificationPath, markNotificationAsRead, navigate]);

  const handleProfileClick = useCallback((userId) => {
    if (!userId) return;
    navigate(`/user/${userId}`);
  }, [navigate]);

  const connectWebSocket = useCallback(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}/ws/${token}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'notification' || !data.notification) return;

      const incoming = data.notification;
      if (notificationIdsRef.current.has(incoming.id)) {
        return;
      }

      updateNotifications((prev) => [incoming, ...prev]);
      playNotificationSound();

      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    };

    ws.onclose = () => {
      if (!shouldReconnectRef.current) {
        return;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    };

    wsRef.current = ws;
  }, [playNotificationSound, token, updateNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connectWebSocket();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return txt.justNow;
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return txt.justNow;
    if (diff < 3600) return `${Math.floor(diff / 60)}${txt.minutesAgo}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${txt.hoursAgo}`;
    return `${Math.floor(diff / 86400)}${txt.daysAgo}`;
  }, [txt]);

  const getNotificationText = useCallback((type) => {
    const key = NOTIFICATION_TEXT_KEYS[type];
    return key ? txt[key] : '';
  }, [txt]);

  const bottomNavItems = useMemo(() => ([
    { icon: Home, label: txt.home, path: '/' },
    { icon: MessageSquare, label: txt.threads, path: '/threads' },
    { icon: Bell, label: txt.notifications, path: '/notifications', active: true, badge: unreadCount },
    { icon: User, label: txt.profile, path: '/profile' },
    { icon: Settings, label: txt.settings, path: '/settings' }
  ]), [txt, unreadCount]);

  const BottomNav = useCallback(() => (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-slate-800 px-6 py-3 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {bottomNavItems.map((item) => (
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
  ), [bottomNavItems, navigate]);

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
              <NotificationRow
                key={notif.id}
                notif={notif}
                index={index}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                text={getNotificationText(notif.type)}
                timeText={formatTime(notif.created_at)}
                onNotificationClick={handleNotificationClick}
                onProfileClick={handleProfileClick}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
