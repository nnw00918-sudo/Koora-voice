import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import BottomNavigation from '../components/BottomNavigation';
import { 
  ArrowLeft, ArrowRight, Home, Trophy, Settings, Bell, Moon, Sun, Volume2, VolumeX,
  Shield, LogOut, ChevronLeft, ChevronRight, User, Lock, Eye, EyeOff, Globe, Palette,
  Smartphone, HelpCircle, Info, Mail, KeyRound, BellRing, BellOff, MessageSquare,
  Heart, UserPlus, Megaphone, Check, X, Camera, AtSign, Image, Users, Edit3,
  Share2, MoreHorizontal, Grid3X3, Bookmark, Link2, Fingerprint, ShieldCheck,
  UserX, Ban, AlertTriangle, Trash2, Download, FileText, Key, Verified,
  Clock, MapPin, Wifi, WifiOff, Vibrate, Volume1, Zap, Sparkles
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SettingsPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSetting } = useSettings();
  const [currentView, setCurrentView] = useState('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  
  // Privacy Settings State
  const [privacySettings, setPrivacySettings] = useState({
    privateAccount: false,
    showOnlineStatus: true,
    showLastSeen: true,
    allowMessages: 'everyone', // everyone, followers, nobody
    allowComments: 'everyone',
    allowMentions: true,
    showActivityStatus: true,
    hideFromSearch: false,
    allowTagging: true,
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
    trustedDevices: [],
    activeSessions: [],
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    messages: true,
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    roomInvites: true,
    liveNotifications: true,
    matchReminders: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  // Display Settings State
  const [displaySettings, setDisplaySettings] = useState({
    darkMode: true,
    autoPlayVideos: true,
    dataServerMode: false,
    fontSize: 'medium',
    language: 'ar',
  });

  const [profileData, setProfileData] = useState({
    name: user.name || user.username || '',
    username: user.username || '',
    bio: user.bio || '',
    avatar: user.avatar || ''
  });

  const [userStats, setUserStats] = useState({ followers_count: 0, following_count: 0 });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const fileInputRef = useRef(null);

  const isRTL = language === 'ar';
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const ForwardIcon = isRTL ? ChevronLeft : ChevronRight;
  const token = localStorage.getItem('token');

  useEffect(() => { 
    fetchUserStats(); 
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/users/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setPrivacySettings(prev => ({ ...prev, ...response.data.privacy }));
        setSecuritySettings(prev => ({ ...prev, ...response.data.security }));
        setNotificationSettings(prev => ({ ...prev, ...response.data.notifications }));
        setDisplaySettings(prev => ({ ...prev, ...response.data.display }));
      }
    } catch (error) {
      console.log('Using default settings');
    }
  };

  const saveSettings = async (type, data) => {
    setSavingSettings(true);
    try {
      await axios.put(`${API}/users/settings`, {
        [type]: data
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch (error) {
      toast.error(isRTL ? 'فشل الحفظ' : 'Failed to save');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      setUserStats({ followers_count: response.data.followers_count || 0, following_count: response.data.following_count || 0 });
      setProfileData(prev => ({ ...prev, name: response.data.name || response.data.username || prev.name, bio: response.data.bio || prev.bio }));
    } catch (error) { console.error('Failed to fetch user stats'); }
  };

  const fetchBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const response = await axios.get(`${API}/users/blocked`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlockedUsers(response.data.blocked || []);
    } catch (error) {
      setBlockedUsers([]);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const unblockUser = async (userId) => {
    try {
      await axios.delete(`${API}/users/${userId}/block`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(isRTL ? 'تم إلغاء الحظر' : 'Unblocked');
    } catch (error) {
      toast.error(isRTL ? 'فشل' : 'Failed');
    }
  };

  // Push Notification Functions
  const [pushPermission, setPushPermission] = useState('default');
  
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(isRTL ? 'متصفحك لا يدعم الإشعارات' : 'Your browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        // Register service worker push subscription
        const registration = await navigator.serviceWorker.ready;
        
        // In production, use your VAPID public key
        // For now, we'll just show a success message
        toast.success(isRTL ? 'تم تفعيل الإشعارات بنجاح!' : 'Notifications enabled!');
        
        setNotificationSettings(prev => ({ ...prev, pushEnabled: true }));
        saveSettings('notifications', { ...notificationSettings, pushEnabled: true });
        
        // Show test notification
        new Notification(isRTL ? 'صوت الكورة' : 'Koora Voice', {
          body: isRTL ? 'تم تفعيل الإشعارات بنجاح!' : 'Notifications have been enabled!',
          icon: '/logo192.png',
          badge: '/logo192.png'
        });
      } else if (permission === 'denied') {
        toast.error(isRTL ? 'تم رفض إذن الإشعارات' : 'Notification permission denied');
      }
    } catch (error) {
      console.error('Push permission error:', error);
      toast.error(isRTL ? 'فشل تفعيل الإشعارات' : 'Failed to enable notifications');
    }
  };

  const txt = {
    ar: {
      settings: 'الإعدادات',
      profile: 'الملف الشخصي',
      profileDesc: 'تعديل الاسم والصورة والنبذة',
      account: 'الحساب',
      accountDesc: 'البريد الإلكتروني وكلمة المرور',
      privacy: 'الخصوصية',
      privacyDesc: 'التحكم في من يرى معلوماتك',
      security: 'الأمان',
      securityDesc: 'حماية حسابك',
      notifications: 'الإشعارات',
      notificationsDesc: 'تخصيص الإشعارات',
      display: 'العرض والأصوات',
      displayDesc: 'المظهر والأصوات',
      language: 'اللغة',
      languageDesc: 'تغيير لغة التطبيق',
      help: 'مركز المساعدة',
      about: 'حول التطبيق',
      logout: 'تسجيل الخروج',
      logoutConfirm: 'هل تريد تسجيل الخروج؟',
      deleteAccount: 'حذف الحساب',
      deleteConfirm: 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      save: 'حفظ',
      edit: 'تعديل',
      
      // Privacy
      privateAccount: 'حساب خاص',
      privateAccountDesc: 'فقط المتابعون المقبولون يرون منشوراتك',
      showOnline: 'إظهار الحالة',
      showOnlineDesc: 'السماح للآخرين برؤية أنك متصل',
      showLastSeen: 'آخر ظهور',
      showLastSeenDesc: 'إظهار وقت آخر نشاط لك',
      allowMessages: 'من يستطيع مراسلتك',
      everyone: 'الجميع',
      followersOnly: 'المتابعون فقط',
      nobody: 'لا أحد',
      allowComments: 'من يستطيع التعليق',
      allowMentions: 'السماح بالإشارة إليك',
      allowMentionsDesc: 'السماح للآخرين بالإشارة إليك في منشوراتهم',
      hideFromSearch: 'إخفاء من البحث',
      hideFromSearchDesc: 'لن يظهر حسابك في نتائج البحث',
      blockedUsers: 'المستخدمون المحظورون',
      blockedUsersDesc: 'إدارة قائمة الحظر',
      noBlockedUsers: 'لا يوجد مستخدمون محظورون',
      unblock: 'إلغاء الحظر',
      
      // Security
      changePassword: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور',
      twoFactor: 'المصادقة الثنائية',
      twoFactorDesc: 'أضف طبقة حماية إضافية لحسابك',
      twoFactorEnabled: 'مفعّلة',
      twoFactorDisabled: 'معطّلة',
      enable2FA: 'تفعيل',
      disable2FA: 'تعطيل',
      loginAlerts: 'تنبيهات تسجيل الدخول',
      loginAlertsDesc: 'إشعار عند تسجيل دخول من جهاز جديد',
      activeSessions: 'الجلسات النشطة',
      activeSessionsDesc: 'الأجهزة المتصلة بحسابك',
      endSession: 'إنهاء الجلسة',
      endAllSessions: 'إنهاء جميع الجلسات',
      downloadData: 'تحميل بياناتك',
      downloadDataDesc: 'احصل على نسخة من جميع بياناتك',
      
      // Notifications
      pushNotifications: 'الإشعارات الفورية',
      pushDesc: 'تلقي إشعارات على جهازك',
      emailNotifications: 'إشعارات البريد',
      emailDesc: 'تلقي إشعارات عبر البريد الإلكتروني',
      messageNotif: 'الرسائل',
      messageNotifDesc: 'إشعارات الرسائل الخاصة',
      likesNotif: 'الإعجابات',
      likesNotifDesc: 'إشعارات الإعجابات',
      commentsNotif: 'التعليقات',
      commentsNotifDesc: 'إشعارات التعليقات',
      followNotif: 'المتابعات',
      followNotifDesc: 'إشعارات المتابعات الجديدة',
      mentionsNotif: 'الإشارات',
      mentionsNotifDesc: 'عند الإشارة إليك',
      roomNotif: 'دعوات الغرف',
      roomNotifDesc: 'إشعارات دعوات الغرف الصوتية',
      liveNotif: 'البث المباشر',
      liveNotifDesc: 'عند بدء بث من تتابعه',
      matchNotif: 'تذكير المباريات',
      matchNotifDesc: 'تذكير قبل بدء المباريات',
      
      // Display
      darkMode: 'الوضع الداكن',
      darkModeDesc: 'تفعيل المظهر الداكن',
      sounds: 'الأصوات',
      soundsDesc: 'أصوات الإشعارات',
      vibration: 'الاهتزاز',
      vibrationDesc: 'اهتزاز عند الإشعارات',
      autoPlayVideos: 'تشغيل الفيديو تلقائياً',
      autoPlayDesc: 'تشغيل الفيديوهات تلقائياً',
      dataSaver: 'توفير البيانات',
      dataSaverDesc: 'تقليل استهلاك البيانات',
      fontSize: 'حجم الخط',
      small: 'صغير',
      medium: 'متوسط',
      large: 'كبير',
      
      selectLanguage: 'اختر اللغة',
      version: 'الإصدار',
      developer: 'المطور',
      contact: 'تواصل معنا',
      on: 'مفعّل',
      off: 'معطّل',
      
      name: 'الاسم',
      username: 'اسم المستخدم',
      bio: 'النبذة',
      email: 'البريد الإلكتروني',
      profileUpdated: 'تم تحديث الملف الشخصي',
      passwordChanged: 'تم تغيير كلمة المرور',
      passwordError: 'كلمة المرور غير متطابقة',
      fillAllFields: 'يرجى ملء جميع الحقول',
      gallery: 'الألبوم',
      randomAvatar: 'صورة عشوائية',
    },
    en: {
      settings: 'Settings',
      profile: 'Profile',
      profileDesc: 'Edit name, photo and bio',
      account: 'Account',
      accountDesc: 'Email and password',
      privacy: 'Privacy',
      privacyDesc: 'Control who sees your info',
      security: 'Security',
      securityDesc: 'Protect your account',
      notifications: 'Notifications',
      notificationsDesc: 'Customize notifications',
      display: 'Display & Sound',
      displayDesc: 'Appearance and sounds',
      language: 'Language',
      languageDesc: 'Change app language',
      help: 'Help Center',
      about: 'About',
      logout: 'Log out',
      logoutConfirm: 'Are you sure you want to log out?',
      deleteAccount: 'Delete Account',
      deleteConfirm: 'Are you sure? This action cannot be undone.',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      edit: 'Edit',
      
      // Privacy
      privateAccount: 'Private Account',
      privateAccountDesc: 'Only approved followers can see your posts',
      showOnline: 'Show Online Status',
      showOnlineDesc: 'Let others see when you are online',
      showLastSeen: 'Last Seen',
      showLastSeenDesc: 'Show when you were last active',
      allowMessages: 'Who can message you',
      everyone: 'Everyone',
      followersOnly: 'Followers only',
      nobody: 'Nobody',
      allowComments: 'Who can comment',
      allowMentions: 'Allow mentions',
      allowMentionsDesc: 'Allow others to mention you in their posts',
      hideFromSearch: 'Hide from search',
      hideFromSearchDesc: 'Your account won\'t appear in search results',
      blockedUsers: 'Blocked Users',
      blockedUsersDesc: 'Manage your block list',
      noBlockedUsers: 'No blocked users',
      unblock: 'Unblock',
      
      // Security
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      twoFactor: 'Two-Factor Authentication',
      twoFactorDesc: 'Add an extra layer of security',
      twoFactorEnabled: 'Enabled',
      twoFactorDisabled: 'Disabled',
      enable2FA: 'Enable',
      disable2FA: 'Disable',
      loginAlerts: 'Login Alerts',
      loginAlertsDesc: 'Get notified of new device logins',
      activeSessions: 'Active Sessions',
      activeSessionsDesc: 'Devices connected to your account',
      endSession: 'End Session',
      endAllSessions: 'End All Sessions',
      downloadData: 'Download Your Data',
      downloadDataDesc: 'Get a copy of all your data',
      
      // Notifications
      pushNotifications: 'Push Notifications',
      pushDesc: 'Receive notifications on your device',
      emailNotifications: 'Email Notifications',
      emailDesc: 'Receive notifications via email',
      messageNotif: 'Messages',
      messageNotifDesc: 'Private message notifications',
      likesNotif: 'Likes',
      likesNotifDesc: 'Like notifications',
      commentsNotif: 'Comments',
      commentsNotifDesc: 'Comment notifications',
      followNotif: 'Follows',
      followNotifDesc: 'New follower notifications',
      mentionsNotif: 'Mentions',
      mentionsNotifDesc: 'When you are mentioned',
      roomNotif: 'Room Invites',
      roomNotifDesc: 'Voice room invite notifications',
      liveNotif: 'Live Streams',
      liveNotifDesc: 'When someone you follow goes live',
      matchNotif: 'Match Reminders',
      matchNotifDesc: 'Reminders before matches start',
      
      // Display
      darkMode: 'Dark Mode',
      darkModeDesc: 'Enable dark theme',
      sounds: 'Sounds',
      soundsDesc: 'Notification sounds',
      vibration: 'Vibration',
      vibrationDesc: 'Vibrate on notifications',
      autoPlayVideos: 'Auto-play Videos',
      autoPlayDesc: 'Automatically play videos',
      dataSaver: 'Data Saver',
      dataSaverDesc: 'Reduce data usage',
      fontSize: 'Font Size',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      
      selectLanguage: 'Select Language',
      version: 'Version',
      developer: 'Developer',
      contact: 'Contact Us',
      on: 'On',
      off: 'Off',
      
      name: 'Name',
      username: 'Username',
      bio: 'Bio',
      email: 'Email',
      profileUpdated: 'Profile updated',
      passwordChanged: 'Password changed',
      passwordError: 'Passwords don\'t match',
      fillAllFields: 'Please fill all fields',
      gallery: 'Gallery',
      randomAvatar: 'Random',
    }
  }[language];

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (event) => setProfileData({ ...profileData, avatar: event.target?.result });
    reader.readAsDataURL(file);
  };

  const handleRandomAvatar = () => {
    const seeds = ['Felix', 'Aneka', 'Milo', 'Zoe', 'Max', 'Luna', 'Leo', 'Bella', 'Oscar', 'Coco'];
    setProfileData({ ...profileData, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seeds[Math.floor(Math.random() * seeds.length)]}${Date.now()}` });
  };

  const handleSaveProfile = async () => {
    if (!profileData.name.trim()) { toast.error(txt.fillAllFields); return; }
    setSavingProfile(true);
    try {
      const response = await axios.put(`${API}/auth/profile`,
        { name: profileData.name, username: profileData.username, bio: profileData.bio, avatar: profileData.avatar },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem('user', JSON.stringify({ ...user, ...response.data.user }));
      toast.success(txt.profileUpdated);
      setIsEditingProfile(false);
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || txt.profileError);
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error(txt.fillAllFields); return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error(txt.passwordError); return;
    }
    try {
      await axios.put(`${API}/auth/password`, {
        current_password: passwordData.current,
        new_password: passwordData.new
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(txt.passwordChanged);
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    }
  };

  // Toggle Switch Component
  const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
        enabled 
          ? 'bg-gradient-to-r from-lime-400 to-emerald-500 shadow-[0_0_15px_rgba(163,230,53,0.4)]' 
          : 'bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
      />
    </button>
  );

  // Setting Item Component
  const SettingItem = ({ icon: Icon, title, description, rightContent, onClick, danger = false }) => (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
        danger 
          ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20' 
          : 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50'
      } ${isRTL ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
        danger ? 'bg-red-500/20' : 'bg-lime-500/20'
      }`}>
        <Icon className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-lime-400'}`} />
      </div>
      <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className={`font-cairo font-bold ${danger ? 'text-red-400' : 'text-white'}`}>{title}</p>
        {description && <p className="text-slate-500 text-sm font-almarai">{description}</p>}
      </div>
      {rightContent || <ForwardIcon className="w-5 h-5 text-slate-500" />}
    </motion.button>
  );

  // Section Header
  const SectionHeader = ({ title, icon: Icon }) => (
    <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {Icon && <Icon className="w-5 h-5 text-lime-400" />}
      <h3 className="text-lime-400 font-cairo font-bold text-sm">{title}</h3>
    </div>
  );

  // Main Settings View
  const MainView = () => (
    <div className="space-y-3">
      <SettingItem 
        icon={Lock} 
        title={txt.account} 
        description={txt.accountDesc}
        onClick={() => setCurrentView('account')} 
      />
      <SettingItem 
        icon={Eye} 
        title={txt.privacy} 
        description={txt.privacyDesc}
        onClick={() => setCurrentView('privacy')} 
      />
      <SettingItem 
        icon={Shield} 
        title={txt.security} 
        description={txt.securityDesc}
        onClick={() => setCurrentView('security')} 
      />
      <SettingItem 
        icon={Bell} 
        title={txt.notifications} 
        description={txt.notificationsDesc}
        onClick={() => setCurrentView('notifications')} 
      />
      <SettingItem 
        icon={Palette} 
        title={txt.display} 
        description={txt.displayDesc}
        onClick={() => setCurrentView('display')} 
      />
      <SettingItem 
        icon={Globe} 
        title={txt.language} 
        description={txt.languageDesc}
        onClick={() => setCurrentView('language')} 
      />
      
      <div className="pt-4" />
      
      <SettingItem 
        icon={HelpCircle} 
        title={txt.help}
        onClick={() => {}} 
      />
      <SettingItem 
        icon={Info} 
        title={txt.about}
        onClick={() => setCurrentView('about')} 
      />
      
      <div className="pt-4" />
      
      <SettingItem 
        icon={LogOut} 
        title={txt.logout}
        onClick={() => setShowLogoutConfirm(true)}
        danger
      />
    </div>
  );

  // Privacy View
  const PrivacyView = () => (
    <div className="space-y-6">
      <SectionHeader title={isRTL ? 'الحساب' : 'Account'} icon={User} />
      <div className="space-y-3">
        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-lime-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.privateAccount}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.privateAccountDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={privacySettings.privateAccount}
            onChange={(val) => {
              setPrivacySettings(prev => ({ ...prev, privateAccount: val }));
              saveSettings('privacy', { ...privacySettings, privateAccount: val });
            }}
          />
        </div>

        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-lime-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.showOnline}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.showOnlineDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={privacySettings.showOnlineStatus}
            onChange={(val) => {
              setPrivacySettings(prev => ({ ...prev, showOnlineStatus: val }));
              saveSettings('privacy', { ...privacySettings, showOnlineStatus: val });
            }}
          />
        </div>

        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-lime-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.showLastSeen}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.showLastSeenDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={privacySettings.showLastSeen}
            onChange={(val) => {
              setPrivacySettings(prev => ({ ...prev, showLastSeen: val }));
              saveSettings('privacy', { ...privacySettings, showLastSeen: val });
            }}
          />
        </div>
      </div>

      <SectionHeader title={isRTL ? 'التفاعلات' : 'Interactions'} icon={MessageSquare} />
      <div className="space-y-3">
        <div className={`p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50`}>
          <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-lime-400" />
            </div>
            <p className="text-white font-cairo font-bold">{txt.allowMessages}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['everyone', 'followers', 'nobody'].map(option => (
              <button
                key={option}
                onClick={() => {
                  setPrivacySettings(prev => ({ ...prev, allowMessages: option }));
                  saveSettings('privacy', { ...privacySettings, allowMessages: option });
                }}
                className={`py-3 rounded-xl font-cairo text-sm transition-all ${
                  privacySettings.allowMessages === option
                    ? 'bg-lime-500 text-slate-900 font-bold'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {option === 'everyone' ? txt.everyone : option === 'followers' ? txt.followersOnly : txt.nobody}
              </button>
            ))}
          </div>
        </div>

        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <AtSign className="w-5 h-5 text-lime-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.allowMentions}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.allowMentionsDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={privacySettings.allowMentions}
            onChange={(val) => {
              setPrivacySettings(prev => ({ ...prev, allowMentions: val }));
              saveSettings('privacy', { ...privacySettings, allowMentions: val });
            }}
          />
        </div>

        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-orange-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.hideFromSearch}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.hideFromSearchDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={privacySettings.hideFromSearch}
            onChange={(val) => {
              setPrivacySettings(prev => ({ ...prev, hideFromSearch: val }));
              saveSettings('privacy', { ...privacySettings, hideFromSearch: val });
            }}
          />
        </div>
      </div>

      <SectionHeader title={isRTL ? 'الحظر' : 'Blocking'} icon={Ban} />
      <SettingItem 
        icon={UserX}
        title={txt.blockedUsers}
        description={txt.blockedUsersDesc}
        onClick={() => {
          fetchBlockedUsers();
          setShowBlockedUsers(true);
        }}
      />
    </div>
  );

  // Security View
  const SecurityView = () => (
    <div className="space-y-6">
      <SectionHeader title={isRTL ? 'كلمة المرور' : 'Password'} icon={Key} />
      <SettingItem 
        icon={KeyRound}
        title={txt.changePassword}
        onClick={() => setShowPasswordModal(true)}
      />

      <SectionHeader title={isRTL ? 'المصادقة' : 'Authentication'} icon={Fingerprint} />
      <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-lime-400" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-white font-cairo font-bold">{txt.twoFactor}</p>
            <p className="text-slate-500 text-sm font-almarai">{txt.twoFactorDesc}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          securitySettings.twoFactorEnabled 
            ? 'bg-lime-500/20 text-lime-400' 
            : 'bg-slate-700 text-slate-400'
        }`}>
          {securitySettings.twoFactorEnabled ? txt.twoFactorEnabled : txt.twoFactorDisabled}
        </span>
      </div>

      <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-lime-400" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-white font-cairo font-bold">{txt.loginAlerts}</p>
            <p className="text-slate-500 text-sm font-almarai">{txt.loginAlertsDesc}</p>
          </div>
        </div>
        <ToggleSwitch 
          enabled={securitySettings.loginAlerts}
          onChange={(val) => {
            setSecuritySettings(prev => ({ ...prev, loginAlerts: val }));
            saveSettings('security', { ...securitySettings, loginAlerts: val });
          }}
        />
      </div>

      <SectionHeader title={isRTL ? 'البيانات' : 'Data'} icon={FileText} />
      <SettingItem 
        icon={Download}
        title={txt.downloadData}
        description={txt.downloadDataDesc}
        onClick={() => toast.success(isRTL ? 'سيتم إرسال رابط التحميل إلى بريدك' : 'Download link will be sent to your email')}
      />

      <div className="pt-4" />
      
      <SettingItem 
        icon={Trash2}
        title={txt.deleteAccount}
        onClick={() => setShowDeleteConfirm(true)}
        danger
      />
    </div>
  );

  // Notifications View
  const NotificationsView = () => (
    <div className="space-y-6">
      {/* Enable Push Notifications Button */}
      {pushPermission !== 'granted' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 rounded-2xl border border-lime-500/30"
        >
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-12 h-12 rounded-xl bg-lime-500/30 flex items-center justify-center">
              <BellRing className="w-6 h-6 text-lime-400" />
            </div>
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-white font-cairo font-bold">
                {isRTL ? 'تفعيل الإشعارات الفورية' : 'Enable Push Notifications'}
              </p>
              <p className="text-slate-400 text-sm font-almarai">
                {isRTL ? 'اضغط هنا للسماح بالإشعارات على جهازك' : 'Click here to allow notifications on your device'}
              </p>
            </div>
            <Button
              onClick={requestPushPermission}
              className="bg-lime-500 hover:bg-lime-600 text-slate-900 font-cairo font-bold px-4 py-2 rounded-xl"
            >
              {isRTL ? 'تفعيل' : 'Enable'}
            </Button>
          </div>
        </motion.div>
      )}

      {pushPermission === 'granted' && (
        <div className="p-4 bg-slate-800/50 rounded-2xl border border-lime-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-500/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-lime-400" />
          </div>
          <p className="text-lime-400 font-cairo font-bold flex-1">
            {isRTL ? 'الإشعارات مفعّلة ✓' : 'Notifications Enabled ✓'}
          </p>
        </div>
      )}

      <SectionHeader title={isRTL ? 'عام' : 'General'} icon={Bell} />
      <div className="space-y-3">
        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-lime-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.pushNotifications}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.pushDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={notificationSettings.pushEnabled}
            onChange={(val) => {
              setNotificationSettings(prev => ({ ...prev, pushEnabled: val }));
              saveSettings('notifications', { ...notificationSettings, pushEnabled: val });
            }}
          />
        </div>

        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-lime-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.emailNotifications}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.emailDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={notificationSettings.emailEnabled}
            onChange={(val) => {
              setNotificationSettings(prev => ({ ...prev, emailEnabled: val }));
              saveSettings('notifications', { ...notificationSettings, emailEnabled: val });
            }}
          />
        </div>
      </div>

      <SectionHeader title={isRTL ? 'الأنشطة' : 'Activities'} icon={Heart} />
      <div className="space-y-3">
        {[
          { key: 'messages', icon: MessageSquare, title: txt.messageNotif, desc: txt.messageNotifDesc },
          { key: 'likes', icon: Heart, title: txt.likesNotif, desc: txt.likesNotifDesc },
          { key: 'comments', icon: MessageSquare, title: txt.commentsNotif, desc: txt.commentsNotifDesc },
          { key: 'follows', icon: UserPlus, title: txt.followNotif, desc: txt.followNotifDesc },
          { key: 'mentions', icon: AtSign, title: txt.mentionsNotif, desc: txt.mentionsNotifDesc },
        ].map(item => (
          <div key={item.key} className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-slate-400" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-white font-cairo font-bold">{item.title}</p>
                <p className="text-slate-500 text-sm font-almarai">{item.desc}</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={notificationSettings[item.key]}
              onChange={(val) => {
                setNotificationSettings(prev => ({ ...prev, [item.key]: val }));
                saveSettings('notifications', { ...notificationSettings, [item.key]: val });
              }}
            />
          </div>
        ))}
      </div>

      <SectionHeader title={isRTL ? 'كورة فويس' : 'Koora Voice'} icon={Trophy} />
      <div className="space-y-3">
        {[
          { key: 'roomInvites', icon: Users, title: txt.roomNotif, desc: txt.roomNotifDesc },
          { key: 'liveNotifications', icon: Zap, title: txt.liveNotif, desc: txt.liveNotifDesc },
          { key: 'matchReminders', icon: Trophy, title: txt.matchNotif, desc: txt.matchNotifDesc },
        ].map(item => (
          <div key={item.key} className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-slate-400" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-white font-cairo font-bold">{item.title}</p>
                <p className="text-slate-500 text-sm font-almarai">{item.desc}</p>
              </div>
            </div>
            <ToggleSwitch 
              enabled={notificationSettings[item.key]}
              onChange={(val) => {
                setNotificationSettings(prev => ({ ...prev, [item.key]: val }));
                saveSettings('notifications', { ...notificationSettings, [item.key]: val });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  // Display View
  const DisplayView = () => (
    <div className="space-y-6">
      <SectionHeader title={isRTL ? 'المظهر' : 'Appearance'} icon={Palette} />
      <div className="space-y-3">
        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <Moon className="w-5 h-5 text-lime-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.darkMode}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.darkModeDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={displaySettings.darkMode}
            onChange={(val) => {
              setDisplaySettings(prev => ({ ...prev, darkMode: val }));
              saveSettings('display', { ...displaySettings, darkMode: val });
            }}
          />
        </div>

        <div className={`p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50`}>
          <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 flex items-center justify-center">
              <span className="text-lime-400 font-bold">Aa</span>
            </div>
            <p className="text-white font-cairo font-bold">{txt.fontSize}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['small', 'medium', 'large'].map(size => (
              <button
                key={size}
                onClick={() => {
                  setDisplaySettings(prev => ({ ...prev, fontSize: size }));
                  saveSettings('display', { ...displaySettings, fontSize: size });
                }}
                className={`py-3 rounded-xl font-cairo transition-all ${
                  displaySettings.fontSize === size
                    ? 'bg-lime-500 text-slate-900 font-bold'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {size === 'small' ? txt.small : size === 'medium' ? txt.medium : txt.large}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SectionHeader title={isRTL ? 'الأصوات' : 'Sounds'} icon={Volume2} />
      <div className="space-y-3">
        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center">
              <Volume1 className="w-5 h-5 text-slate-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.sounds}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.soundsDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={notificationSettings.soundEnabled}
            onChange={(val) => {
              setNotificationSettings(prev => ({ ...prev, soundEnabled: val }));
              saveSettings('notifications', { ...notificationSettings, soundEnabled: val });
            }}
          />
        </div>

        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center">
              <Vibrate className="w-5 h-5 text-slate-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.vibration}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.vibrationDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={notificationSettings.vibrationEnabled}
            onChange={(val) => {
              setNotificationSettings(prev => ({ ...prev, vibrationEnabled: val }));
              saveSettings('notifications', { ...notificationSettings, vibrationEnabled: val });
            }}
          />
        </div>
      </div>

      <SectionHeader title={isRTL ? 'الفيديو' : 'Video'} icon={Image} />
      <div className="space-y-3">
        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center">
              <Image className="w-5 h-5 text-slate-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.autoPlayVideos}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.autoPlayDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={displaySettings.autoPlayVideos}
            onChange={(val) => {
              setDisplaySettings(prev => ({ ...prev, autoPlayVideos: val }));
              saveSettings('display', { ...displaySettings, autoPlayVideos: val });
            }}
          />
        </div>

        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-slate-400" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo font-bold">{txt.dataSaver}</p>
              <p className="text-slate-500 text-sm font-almarai">{txt.dataSaverDesc}</p>
            </div>
          </div>
          <ToggleSwitch 
            enabled={displaySettings.dataServerMode}
            onChange={(val) => {
              setDisplaySettings(prev => ({ ...prev, dataServerMode: val }));
              saveSettings('display', { ...displaySettings, dataServerMode: val });
            }}
          />
        </div>
      </div>
    </div>
  );

  // Language View
  const LanguageView = () => (
    <div className="space-y-4">
      <SectionHeader title={txt.selectLanguage} icon={Globe} />
      {[
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
      ].map(lang => (
        <motion.button
          key={lang.code}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLanguage(lang.code)}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
            language === lang.code
              ? 'bg-lime-500/20 border-2 border-lime-500'
              : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50'
          } ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <span className="text-3xl">{lang.flag}</span>
          <span className={`flex-1 font-cairo font-bold ${isRTL ? 'text-right' : 'text-left'} ${language === lang.code ? 'text-lime-400' : 'text-white'}`}>
            {lang.name}
          </span>
          {language === lang.code && (
            <div className="w-6 h-6 rounded-full bg-lime-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-slate-900" />
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );

  // About View
  const AboutView = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-lime-500/30 to-emerald-500/30 flex items-center justify-center border border-lime-500/30">
          <Sparkles className="w-12 h-12 text-lime-400" />
        </div>
        <h2 className="text-2xl font-cairo font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-300 to-emerald-400">
          {isRTL ? 'صوت الكورة' : 'Koora Voice'}
        </h2>
        <p className="text-slate-500 font-almarai mt-2">
          {isRTL ? 'الاستاد الرقمي لعشاق كرة القدم' : 'The Digital Stadium for Football Fans'}
        </p>
      </div>

      <div className="space-y-3">
        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className="text-slate-400 font-almarai">{txt.version}</span>
          <span className="text-lime-400 font-bold">2.0.0</span>
        </div>
        <div className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className="text-slate-400 font-almarai">{txt.developer}</span>
          <span className="text-white font-cairo">Koora Voice Team</span>
        </div>
      </div>

      <div className="pt-4">
        <SettingItem 
          icon={Mail}
          title={txt.contact}
          onClick={() => window.open('mailto:support@kooravoice.com')}
        />
      </div>

      <p className="text-center text-slate-600 text-sm font-almarai pt-8">
        © 2026 Koora Voice. All rights reserved.
      </p>
    </div>
  );

  // Profile View (simplified for brevity - keep existing implementation)
  const ProfileView = () => (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-6">
        <div className="relative">
          <img 
            src={profileData.avatar} 
            alt="" 
            className="w-28 h-28 rounded-full border-4 border-lime-500/30"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <Camera className="w-5 h-5 text-slate-900" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
        <button
          onClick={handleRandomAvatar}
          className="mt-3 text-lime-400 text-sm font-cairo"
        >
          {txt.randomAvatar}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className={`block text-slate-400 text-sm mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{txt.name}</label>
          <Input
            value={profileData.name}
            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div>
          <label className={`block text-slate-400 text-sm mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{txt.username}</label>
          <Input
            value={profileData.username}
            onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
            dir="ltr"
          />
        </div>
        <div>
          <label className={`block text-slate-400 text-sm mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{txt.bio}</label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 min-h-[100px] resize-none"
            maxLength={150}
          />
        </div>
      </div>

      <Button
        onClick={handleSaveProfile}
        disabled={savingProfile}
        className="w-full bg-lime-500 hover:bg-lime-400 text-slate-900 font-cairo font-bold py-3"
      >
        {savingProfile ? '...' : txt.save}
      </Button>
    </div>
  );

  // Account View
  const AccountView = () => (
    <div className="space-y-6">
      <div className={`p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className="text-slate-400 text-sm mb-1">{txt.email}</p>
        <p className="text-white font-cairo">{user.email}</p>
      </div>
      
      <SettingItem 
        icon={KeyRound}
        title={txt.changePassword}
        onClick={() => setShowPasswordModal(true)}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-lime-400" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-lime-400" />
        </div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[600px] mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-lime-500/20 z-40">
          <div className={`flex items-center gap-4 p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {currentView !== 'main' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setCurrentView('main')}
                className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center"
              >
                <BackIcon className="w-5 h-5 text-white" />
              </motion.button>
            )}
            <h1 className="text-xl font-cairo font-black text-white flex-1">
              {currentView === 'main' && txt.settings}
              {currentView === 'profile' && txt.profile}
              {currentView === 'account' && txt.account}
              {currentView === 'privacy' && txt.privacy}
              {currentView === 'security' && txt.security}
              {currentView === 'notifications' && txt.notifications}
              {currentView === 'display' && txt.display}
              {currentView === 'language' && txt.language}
              {currentView === 'about' && txt.about}
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'main' && <MainView />}
              {currentView === 'profile' && <ProfileView />}
              {currentView === 'account' && <AccountView />}
              {currentView === 'privacy' && <PrivacyView />}
              {currentView === 'security' && <SecurityView />}
              {currentView === 'notifications' && <NotificationsView />}
              {currentView === 'display' && <DisplayView />}
              {currentView === 'language' && <LanguageView />}
              {currentView === 'about' && <AboutView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Navigation */}
      {currentView === 'main' && <BottomNavigation isRTL={isRTL} />}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <LogOut className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-cairo font-bold text-white text-center mb-2">{txt.logout}</h3>
              <p className="text-slate-400 text-center mb-6">{txt.logoutConfirm}</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowLogoutConfirm(false)}
                  variant="outline"
                  className="flex-1 bg-transparent border-slate-600 text-white"
                >
                  {txt.cancel}
                </Button>
                <Button
                  onClick={onLogout}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  {txt.confirm}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-red-500/30"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-cairo font-bold text-red-400 text-center mb-2">{txt.deleteAccount}</h3>
              <p className="text-slate-400 text-center mb-6">{txt.deleteConfirm}</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="flex-1 bg-transparent border-slate-600 text-white"
                >
                  {txt.cancel}
                </Button>
                <Button
                  onClick={() => {
                    toast.error(isRTL ? 'تم تعطيل هذه الميزة' : 'This feature is disabled');
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  {txt.confirm}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-cairo font-bold text-white text-center mb-6">{txt.changePassword}</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPasswords.current ? 'text' : 'password'}
                    placeholder={txt.currentPassword}
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white pr-12"
                  />
                  <button
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? 'text' : 'password'}
                    placeholder={txt.newPassword}
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white pr-12"
                  />
                  <button
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    placeholder={txt.confirmPassword}
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white pr-12"
                  />
                  <button
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowPasswordModal(false)}
                  variant="outline"
                  className="flex-1 bg-transparent border-slate-600 text-white"
                >
                  {txt.cancel}
                </Button>
                <Button
                  onClick={handleChangePassword}
                  className="flex-1 bg-lime-500 hover:bg-lime-400 text-slate-900"
                >
                  {txt.save}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blocked Users Modal */}
      <AnimatePresence>
        {showBlockedUsers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowBlockedUsers(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-700 max-h-[70vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-cairo font-bold text-white text-center mb-4">{txt.blockedUsers}</h3>
              <div className="flex-1 overflow-y-auto">
                {loadingBlocked ? (
                  <div className="text-center py-8 text-slate-400">...</div>
                ) : blockedUsers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">{txt.noBlockedUsers}</div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map(user => (
                      <div key={user.id} className={`flex items-center gap-3 p-3 bg-slate-800 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" />
                        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <p className="text-white font-cairo">{user.name}</p>
                          <p className="text-slate-500 text-sm">@{user.username}</p>
                        </div>
                        <Button
                          onClick={() => unblockUser(user.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          {txt.unblock}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={() => setShowBlockedUsers(false)}
                className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white"
              >
                {txt.cancel}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
