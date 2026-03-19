import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { Input } from '../components/ui/input';
import { 
  ArrowLeft, ArrowRight, Home, Trophy, Settings, Bell, Moon, Sun, Volume2, VolumeX,
  Shield, LogOut, ChevronLeft, ChevronRight, User, Lock, Eye, EyeOff, Globe, Palette,
  Smartphone, HelpCircle, Info, Mail, KeyRound, BellRing, BellOff, MessageSquare,
  Heart, UserPlus, Megaphone, Check, X, Camera, AtSign, Image, Users, Edit3,
  Share2, MoreHorizontal, Grid3X3, Bookmark, Link2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SettingsPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSetting } = useSettings();
  const [currentView, setCurrentView] = useState('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  
  const [profileData, setProfileData] = useState({
    name: user.name || user.username || '',
    username: user.username || '',
    bio: user.bio || '',
    avatar: user.avatar || ''
  });
  const [userStats, setUserStats] = useState({ followers_count: 0, following_count: 0 });
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const fileInputRef = useRef(null);

  const isRTL = language === 'ar';
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const ForwardIcon = isRTL ? ChevronLeft : ChevronRight;
  const token = localStorage.getItem('token');

  useEffect(() => { fetchUserStats(); }, []);

  const fetchUserStats = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      setUserStats({ followers_count: response.data.followers_count || 0, following_count: response.data.following_count || 0 });
      setProfileData(prev => ({ ...prev, name: response.data.name || response.data.username || prev.name, bio: response.data.bio || prev.bio }));
    } catch (error) { console.error('Failed to fetch user stats'); }
  };

  const fetchFollowers = async () => {
    try {
      const response = await axios.get(`${API}/users/${user.id}/followers`, { headers: { Authorization: `Bearer ${token}` } });
      setFollowers(response.data.followers);
    } catch (error) { console.error('Failed'); }
  };

  const fetchFollowing = async () => {
    try {
      const response = await axios.get(`${API}/users/${user.id}/following`, { headers: { Authorization: `Bearer ${token}` } });
      setFollowing(response.data.following);
    } catch (error) { console.error('Failed'); }
  };

  const handleFollow = async (userId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        await axios.delete(`${API}/users/${userId}/follow`, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API}/users/${userId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
      }
      fetchFollowers(); fetchFollowing(); fetchUserStats();
    } catch (error) { toast.error(error.response?.data?.detail || 'Error'); }
  };

  const txt = {
    ar: {
      settings: 'الإعدادات', profile: 'الملف الشخصي', profileDesc: 'تعديل الاسم والصورة والنبذة',
      account: 'الحساب', accountDesc: 'البريد الإلكتروني وكلمة المرور',
      privacy: 'الخصوصية والأمان', privacyDesc: 'إدارة ما يراه الآخرون عنك',
      notifications: 'الإشعارات', notificationsDesc: 'تخصيص الإشعارات',
      display: 'العرض والأصوات', displayDesc: 'المظهر والأصوات',
      language: 'اللغة', languageDesc: 'تغيير لغة التطبيق',
      help: 'مركز المساعدة', about: 'حول التطبيق',
      logout: 'تسجيل الخروج', logoutConfirm: 'هل تريد تسجيل الخروج؟',
      cancel: 'إلغاء', confirm: 'تأكيد', save: 'حفظ', edit: 'تعديل',
      editProfile: 'تعديل الملف الشخصي',
      name: 'الاسم', namePlaceholder: 'اسمك الظاهر',
      username: 'اسم المستخدم', usernamePlaceholder: 'اسم الحساب',
      bio: 'النبذة', bioPlaceholder: 'أضف نبذة...',
      profileUpdated: 'تم التحديث', profileError: 'فشل التحديث',
      usernameTaken: 'الاسم مستخدم', usernameShort: 'الاسم قصير',
      followers: 'متابِع', following: 'متابَع', likes: 'إعجاب',
      noFollowers: 'لا يوجد متابعون', noFollowing: 'لا تتابع أحداً',
      follow: 'متابعة', unfollow: 'إلغاء',
      gallery: 'الألبوم', randomAvatar: 'صورة عشوائية',
      email: 'البريد الإلكتروني', changePassword: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية', newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور', passwordChanged: 'تم التغيير',
      passwordError: 'غير متطابقة', fillAllFields: 'املأ جميع الحقول',
      privateAccount: 'حساب خاص', privateAccountDesc: 'فقط المتابعون يرون نشاطك',
      showOnline: 'إظهار الحالة', showOnlineDesc: 'السماح للآخرين برؤية أنك متصل',
      pushNotifications: 'الإشعارات الفورية', pushDesc: 'تلقي إشعارات',
      messageNotif: 'الرسائل', messageNotifDesc: 'إشعارات الرسائل',
      likesNotif: 'الإعجابات', likesNotifDesc: 'إشعارات الإعجابات',
      followNotif: 'المتابعات', followNotifDesc: 'إشعارات المتابعات',
      roomNotif: 'الغرف', roomNotifDesc: 'إشعارات الغرف',
      darkMode: 'الوضع الداكن', darkModeDesc: 'تفعيل المظهر الداكن',
      sounds: 'الأصوات', soundsDesc: 'أصوات الإشعارات',
      vibration: 'الاهتزاز', vibrationDesc: 'اهتزاز عند الإشعارات',
      selectLanguage: 'اختر اللغة', version: 'الإصدار', developer: 'المطور', contact: 'تواصل معنا',
      on: 'مفعّل', off: 'معطّل',
      addBio: 'أضف نبذة تعريفية',
      posts: 'المنشورات', saved: 'المحفوظات', tagged: 'الإشارات',
      noPosts: 'لا توجد منشورات',
      shareProfile: 'مشاركة الملف',
    },
    en: {
      settings: 'Settings', profile: 'Profile', profileDesc: 'Edit name, photo and bio',
      account: 'Account', accountDesc: 'Email and password',
      privacy: 'Privacy & Security', privacyDesc: 'Manage visibility',
      notifications: 'Notifications', notificationsDesc: 'Customize notifications',
      display: 'Display & Sound', displayDesc: 'Appearance and sounds',
      language: 'Language', languageDesc: 'Change app language',
      help: 'Help Center', about: 'About',
      logout: 'Log out', logoutConfirm: 'Log out?',
      cancel: 'Cancel', confirm: 'Log out', save: 'Save', edit: 'Edit',
      editProfile: 'Edit profile',
      name: 'Name', namePlaceholder: 'Your display name',
      username: 'Username', usernamePlaceholder: 'Account handle',
      bio: 'Bio', bioPlaceholder: 'Add bio...',
      profileUpdated: 'Updated', profileError: 'Failed',
      usernameTaken: 'Username taken', usernameShort: 'Too short',
      followers: 'Followers', following: 'Following', likes: 'Likes',
      noFollowers: 'No followers yet', noFollowing: 'Not following anyone',
      follow: 'Follow', unfollow: 'Unfollow',
      gallery: 'Gallery', randomAvatar: 'Random',
      email: 'Email', changePassword: 'Change password',
      currentPassword: 'Current', newPassword: 'New',
      confirmPassword: 'Confirm', passwordChanged: 'Changed',
      passwordError: 'Mismatch', fillAllFields: 'Fill all fields',
      privateAccount: 'Private', privateAccountDesc: 'Only followers see you',
      showOnline: 'Show online', showOnlineDesc: 'Let others see when online',
      pushNotifications: 'Push notifications', pushDesc: 'Get notifications',
      messageNotif: 'Messages', messageNotifDesc: 'Message notifications',
      likesNotif: 'Likes', likesNotifDesc: 'Like notifications',
      followNotif: 'Follows', followNotifDesc: 'Follow notifications',
      roomNotif: 'Rooms', roomNotifDesc: 'Room notifications',
      darkMode: 'Dark mode', darkModeDesc: 'Enable dark mode',
      sounds: 'Sounds', soundsDesc: 'Notification sounds',
      vibration: 'Vibration', vibrationDesc: 'Vibrate on notifications',
      selectLanguage: 'Select language', version: 'Version', developer: 'Developer', contact: 'Contact',
      on: 'On', off: 'Off',
      addBio: 'Add bio',
      posts: 'Posts', saved: 'Saved', tagged: 'Tagged',
      noPosts: 'No posts yet',
      shareProfile: 'Share profile',
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
      const detail = error.response?.data?.detail || '';
      if (detail.includes('مستخدم') || detail.includes('taken')) toast.error(txt.usernameTaken);
      else toast.error(txt.profileError);
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) { toast.error(txt.fillAllFields); return; }
    if (passwordData.new !== passwordData.confirm) { toast.error(txt.passwordError); return; }
    toast.success(txt.passwordChanged);
    setShowPasswordModal(false);
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  const SettingItem = ({ icon: Icon, label, desc, onClick, toggle, value, onToggle, showArrow = true, status }) => (
    <button onClick={toggle ? () => onToggle(!value) : onClick}
      className={`w-full flex items-center justify-between p-4 hover:bg-slate-800/50 active:bg-slate-800 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${toggle && value ? 'bg-lime-400/20' : 'bg-slate-800'}`}>
          <Icon className={`w-5 h-5 ${toggle && value ? 'text-lime-400' : 'text-slate-400'}`} />
        </div>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <p className="text-white font-cairo font-medium">{label}</p>
          {desc && <p className="text-slate-500 text-sm font-almarai">{desc}</p>}
        </div>
      </div>
      {toggle ? (
        <div className={`w-14 h-8 rounded-full flex items-center px-1 transition-all ${value ? 'bg-lime-400' : 'bg-slate-700'}`}>
          <motion.div className="w-6 h-6 rounded-full bg-white shadow-md" animate={{ x: value ? (isRTL ? 0 : 24) : (isRTL ? 24 : 0) }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
        </div>
      ) : showArrow ? <ForwardIcon className="w-5 h-5 text-slate-500" /> : null}
    </button>
  );

  const SubPageHeader = ({ title, onBack, rightButton }) => (
    <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 p-4 z-10">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={onBack} className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center"><BackIcon className="w-5 h-5 text-white" /></button>
          <h2 className="text-xl font-cairo font-bold text-white">{title}</h2>
        </div>
        {rightButton}
      </div>
    </div>
  );

  const UserListItem = ({ u }) => (
    <div className={`flex items-center gap-3 p-4 hover:bg-slate-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <img src={u.avatar} alt={u.username} className="w-12 h-12 rounded-full" />
      <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className="text-white font-cairo font-bold">{u.name || u.username}</p>
        <p className="text-slate-500 text-sm font-almarai">@{u.username}</p>
      </div>
      {u.id !== user.id && (
        <button onClick={() => handleFollow(u.id, u.is_following)}
          className={`px-4 py-2 rounded-lg font-cairo font-bold text-sm ${u.is_following ? 'bg-slate-800 text-white border border-slate-600' : 'bg-[#fe2c55] text-white'}`}>
          {u.is_following ? txt.unfollow : txt.follow}
        </button>
      )}
    </div>
  );

  // Main View
  const MainView = () => (
    <>
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 p-4 z-10">
        <h1 className={`text-xl font-cairo font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>{txt.settings}</h1>
      </div>
      <button onClick={() => setCurrentView('profile')}
        className={`w-full p-4 flex items-center gap-4 hover:bg-slate-800/50 border-b border-slate-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <img src={user.avatar} alt="" className="w-14 h-14 rounded-full ring-2 ring-lime-400" />
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-white font-cairo font-bold text-lg">{user.name || user.username}</p>
          <p className="text-slate-500 text-sm font-almarai">@{user.username}</p>
        </div>
        <ForwardIcon className="w-5 h-5 text-slate-500" />
      </button>
      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={User} label={txt.profile} desc={txt.profileDesc} onClick={() => setCurrentView('profile')} />
        <SettingItem icon={Lock} label={txt.account} desc={txt.accountDesc} onClick={() => setCurrentView('account')} />
        <SettingItem icon={Shield} label={txt.privacy} desc={txt.privacyDesc} onClick={() => setCurrentView('privacy')} />
        <SettingItem icon={Bell} label={txt.notifications} desc={txt.notificationsDesc} onClick={() => setCurrentView('notifications')} />
        <SettingItem icon={Palette} label={txt.display} desc={txt.displayDesc} onClick={() => setCurrentView('display')} />
        <SettingItem icon={Globe} label={txt.language} desc={txt.languageDesc} onClick={() => setCurrentView('language')} />
      </div>
      <div className="h-2 bg-slate-900" />
      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={HelpCircle} label={txt.help} onClick={() => {}} />
        <SettingItem icon={Info} label={txt.about} onClick={() => setCurrentView('about')} />
      </div>
      <div className="h-2 bg-slate-900" />
      <button onClick={() => setShowLogoutConfirm(true)} className={`w-full p-4 flex items-center gap-4 hover:bg-red-500/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center"><LogOut className="w-5 h-5 text-red-400" /></div>
        <p className="text-red-400 font-cairo font-medium">{txt.logout}</p>
      </button>
    </>
  );

  // TikTok Style Profile View
  const ProfileView = () => (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-xl z-10 px-4 py-3">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setCurrentView('main')} className="w-10 h-10 flex items-center justify-center">
            <BackIcon className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-cairo font-bold text-white" dir="ltr">@{user.username}</h1>
          <button className="w-10 h-10 flex items-center justify-center">
            <MoreHorizontal className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-4 pt-4 pb-6">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img src={user.avatar} alt="" className="w-24 h-24 rounded-full border-2 border-slate-800" />
            {user.role && user.role !== 'user' && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#fe2c55] flex items-center justify-center border-2 border-black">
                <Shield className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <h2 className="text-center text-xl font-cairo font-bold text-white mb-1" dir="ltr">
          @{user.username}
        </h2>
        {user.name && user.name !== user.username && (
          <p className="text-center text-slate-400 font-almarai text-sm mb-4">{user.name}</p>
        )}

        {/* Stats Row - TikTok Style */}
        <div className="flex justify-center gap-8 py-4">
          <button onClick={() => { setCurrentView('following'); fetchFollowing(); }} className="text-center">
            <p className="text-xl font-chivo font-bold text-white">{userStats.following_count}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.following}</p>
          </button>
          <button onClick={() => { setCurrentView('followers'); fetchFollowers(); }} className="text-center">
            <p className="text-xl font-chivo font-bold text-white">{userStats.followers_count}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.followers}</p>
          </button>
          <div className="text-center">
            <p className="text-xl font-chivo font-bold text-white">{user.coins || 0}</p>
            <p className="text-slate-500 text-xs font-almarai">{txt.likes}</p>
          </div>
        </div>

        {/* Action Buttons - TikTok Style */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setIsEditingProfile(true)}
            className="flex-1 max-w-[200px] py-2.5 rounded-md bg-slate-800 text-white font-cairo font-semibold text-sm"
          >
            {txt.editProfile}
          </button>
          <button className="w-11 h-11 rounded-md bg-slate-800 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Bio */}
        {user.bio ? (
          <p className="text-center text-white font-almarai text-sm mb-4 px-8">{user.bio}</p>
        ) : (
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="block mx-auto text-slate-500 font-almarai text-sm mb-4"
          >
            + {txt.addBio}
          </button>
        )}

        {/* Level Badge */}
        <div className="flex justify-center gap-2 mb-6">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
            <span className="text-yellow-400 text-xs font-chivo font-bold">Lv.{user.level || 1}</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <span className="text-purple-400 text-xs font-chivo font-bold">{user.xp || 0} XP</span>
          </div>
        </div>
      </div>

      {/* Tabs - TikTok Style */}
      <div className="border-b border-slate-800">
        <div className="flex justify-center">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 max-w-[120px] py-3 flex justify-center ${activeTab === 'posts' ? 'border-b-2 border-white' : ''}`}
          >
            <Grid3X3 className={`w-5 h-5 ${activeTab === 'posts' ? 'text-white' : 'text-slate-500'}`} />
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 max-w-[120px] py-3 flex justify-center ${activeTab === 'saved' ? 'border-b-2 border-white' : ''}`}
          >
            <Bookmark className={`w-5 h-5 ${activeTab === 'saved' ? 'text-white' : 'text-slate-500'}`} />
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 max-w-[120px] py-3 flex justify-center ${activeTab === 'liked' ? 'border-b-2 border-white' : ''}`}
          >
            <Heart className={`w-5 h-5 ${activeTab === 'liked' ? 'text-white' : 'text-slate-500'}`} />
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-1">
        <div className="grid grid-cols-3 gap-1">
          {/* Empty state */}
          <div className="col-span-3 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-4">
              {activeTab === 'posts' && <Grid3X3 className="w-8 h-8 text-slate-600" />}
              {activeTab === 'saved' && <Bookmark className="w-8 h-8 text-slate-600" />}
              {activeTab === 'liked' && <Heart className="w-8 h-8 text-slate-600" />}
            </div>
            <p className="text-slate-500 font-almarai">{txt.noPosts}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Edit Profile Modal - TikTok Style
  const EditProfileModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50"
    >
      {/* Header */}
      <div className="sticky top-0 bg-black border-b border-slate-800 px-4 py-3 z-10">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setIsEditingProfile(false)} className="text-white font-almarai">
            {txt.cancel}
          </button>
          <h1 className="text-lg font-cairo font-bold text-white">{txt.editProfile}</h1>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="text-[#fe2c55] font-cairo font-bold disabled:opacity-50"
          >
            {savingProfile ? '...' : txt.save}
          </button>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="py-6">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <img src={profileData.avatar} alt="" className="w-24 h-24 rounded-full" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>
        </div>
        <div className="flex justify-center gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="text-[#fe2c55] font-almarai text-sm">
            {txt.gallery}
          </button>
          <span className="text-slate-600">|</span>
          <button onClick={handleRandomAvatar} className="text-[#fe2c55] font-almarai text-sm">
            {txt.randomAvatar}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 space-y-4">
        {/* Name */}
        <div className="border-b border-slate-800 pb-4">
          <label className={`block text-slate-500 text-xs font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {txt.name}
          </label>
          <input
            value={profileData.name}
            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            placeholder={txt.namePlaceholder}
            className={`w-full bg-transparent text-white text-lg font-cairo outline-none ${isRTL ? 'text-right' : 'text-left'}`}
            maxLength={50}
          />
        </div>

        {/* Username */}
        <div className="border-b border-slate-800 pb-4">
          <label className={`block text-slate-500 text-xs font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {txt.username}
          </label>
          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-slate-500">@</span>
            <input
              value={profileData.username}
              onChange={(e) => setProfileData({ ...profileData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
              placeholder={txt.usernamePlaceholder}
              className={`flex-1 bg-transparent text-white text-lg font-cairo outline-none ${isRTL ? 'text-right' : 'text-left'}`}
              maxLength={20}
            />
          </div>
        </div>

        {/* Bio */}
        <div className="border-b border-slate-800 pb-4">
          <label className={`block text-slate-500 text-xs font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {txt.bio}
          </label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            placeholder={txt.bioPlaceholder}
            className={`w-full bg-transparent text-white text-base font-almarai outline-none resize-none h-20 ${isRTL ? 'text-right' : 'text-left'}`}
            maxLength={80}
          />
          <p className={`text-slate-600 text-xs ${isRTL ? 'text-left' : 'text-right'}`}>{profileData.bio.length}/80</p>
        </div>
      </div>
    </motion.div>
  );

  const FollowersView = () => (
    <>
      <SubPageHeader title={txt.followers} onBack={() => setCurrentView('profile')} />
      {followers.length === 0 ? (
        <div className="p-8 text-center"><Users className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p className="text-slate-500">{txt.noFollowers}</p></div>
      ) : <div className="divide-y divide-slate-800">{followers.map(u => <UserListItem key={u.id} u={u} />)}</div>}
    </>
  );

  const FollowingView = () => (
    <>
      <SubPageHeader title={txt.following} onBack={() => setCurrentView('profile')} />
      {following.length === 0 ? (
        <div className="p-8 text-center"><Users className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p className="text-slate-500">{txt.noFollowing}</p></div>
      ) : <div className="divide-y divide-slate-800">{following.map(u => <UserListItem key={u.id} u={u} />)}</div>}
    </>
  );

  const AccountView = () => (
    <>
      <SubPageHeader title={txt.account} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <div className={`p-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="text-slate-400 font-almarai">{user.email}</p>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Mail className="w-4 h-4 text-slate-500" /><p className="text-white font-cairo">{txt.email}</p></div>
        </div>
        <SettingItem icon={KeyRound} label={txt.changePassword} onClick={() => setShowPasswordModal(true)} />
      </div>
    </>
  );

  const PrivacyView = () => (
    <>
      <SubPageHeader title={txt.privacy} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={Lock} label={txt.privateAccount} desc={txt.privateAccountDesc} toggle value={settings.privateAccount} onToggle={(v) => updateSetting('privateAccount', v)} />
        <SettingItem icon={Eye} label={txt.showOnline} desc={txt.showOnlineDesc} toggle value={settings.showOnline} onToggle={(v) => updateSetting('showOnline', v)} />
      </div>
    </>
  );

  const NotificationsView = () => (
    <>
      <SubPageHeader title={txt.notifications} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={BellRing} label={txt.pushNotifications} desc={txt.pushDesc} toggle value={settings.notifications} onToggle={(v) => updateSetting('notifications', v)} />
        {settings.notifications && <>
          <SettingItem icon={MessageSquare} label={txt.messageNotif} toggle value={settings.messageNotif} onToggle={(v) => updateSetting('messageNotif', v)} />
          <SettingItem icon={Heart} label={txt.likesNotif} toggle value={settings.likesNotif} onToggle={(v) => updateSetting('likesNotif', v)} />
          <SettingItem icon={UserPlus} label={txt.followNotif} toggle value={settings.followNotif} onToggle={(v) => updateSetting('followNotif', v)} />
          <SettingItem icon={Megaphone} label={txt.roomNotif} toggle value={settings.roomNotif} onToggle={(v) => updateSetting('roomNotif', v)} />
        </>}
      </div>
    </>
  );

  const DisplayView = () => (
    <>
      <SubPageHeader title={txt.display} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={Moon} label={txt.darkMode} desc={txt.darkModeDesc} toggle value={settings.darkMode} onToggle={(v) => updateSetting('darkMode', v)} />
        <SettingItem icon={Volume2} label={txt.sounds} desc={txt.soundsDesc} toggle value={settings.sounds} onToggle={(v) => updateSetting('sounds', v)} />
        <SettingItem icon={Smartphone} label={txt.vibration} desc={txt.vibrationDesc} toggle value={settings.vibration} onToggle={(v) => updateSetting('vibration', v)} />
      </div>
    </>
  );

  const LanguageView = () => (
    <>
      <SubPageHeader title={txt.language} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        {['ar', 'en'].map(lang => (
          <button key={lang} onClick={() => setLanguage(lang)} className={`w-full p-4 flex items-center justify-between hover:bg-slate-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-2xl">{lang === 'ar' ? '🇸🇦' : '🇺🇸'}</span>
              <p className="text-white font-cairo">{lang === 'ar' ? 'العربية' : 'English'}</p>
            </div>
            {language === lang && <Check className="w-5 h-5 text-[#fe2c55]" />}
          </button>
        ))}
      </div>
    </>
  );

  const AboutView = () => (
    <>
      <SubPageHeader title={txt.about} onBack={() => setCurrentView('main')} />
      <div className="p-8 flex flex-col items-center">
        <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mb-4 border border-slate-800"><span className="text-4xl">⚽</span></div>
        <h2 className="text-white font-cairo font-bold text-xl mb-1">Pitch Chat</h2>
        <p className="text-slate-500 font-almarai text-sm">{txt.version}: 1.0.0</p>
      </div>
    </>
  );

  const renderView = () => {
    switch (currentView) {
      case 'profile': return <ProfileView />;
      case 'followers': return <FollowersView />;
      case 'following': return <FollowingView />;
      case 'account': return <AccountView />;
      case 'privacy': return <PrivacyView />;
      case 'notifications': return <NotificationsView />;
      case 'display': return <DisplayView />;
      case 'language': return <LanguageView />;
      case 'about': return <AboutView />;
      default: return <MainView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">{renderView()}</div>

      <AnimatePresence>{isEditingProfile && <EditProfileModal />}</AnimatePresence>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-cairo font-bold text-lg mb-6 text-center">{txt.changePassword}</h3>
              <div className="space-y-4">
                {['current', 'new', 'confirm'].map((field) => (
                  <div key={field}>
                    <Input type={showPasswords[field] ? 'text' : 'password'} value={passwordData[field]}
                      onChange={(e) => setPasswordData({ ...passwordData, [field]: e.target.value })}
                      placeholder={field === 'current' ? txt.currentPassword : field === 'new' ? txt.newPassword : txt.confirmPassword}
                      className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 rounded-lg bg-slate-800 text-white font-cairo">{txt.cancel}</button>
                <button onClick={handleChangePassword} className="flex-1 py-3 rounded-lg bg-[#fe2c55] text-white font-cairo font-bold">{txt.save}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <p className="text-white font-cairo font-bold text-lg text-center mb-6">{txt.logoutConfirm}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-lg bg-slate-800 text-white font-cairo">{txt.cancel}</button>
                <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="flex-1 py-3 rounded-lg bg-[#fe2c55] text-white font-cairo font-bold">{txt.confirm}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentView !== 'profile' && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-40">
          <div className={`max-w-[600px] mx-auto flex justify-around p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400"><Home className="w-6 h-6" /><span className="text-xs">{t('home')}</span></button>
            <button onClick={() => navigate('/threads')} className="flex flex-col items-center gap-1 text-slate-400"><MessageSquare className="w-6 h-6" /><span className="text-xs">{t('threads')}</span></button>
            <button onClick={() => navigate('/matches')} className="flex flex-col items-center gap-1 text-slate-400"><Trophy className="w-6 h-6" /><span className="text-xs">{t('matches')}</span></button>
            <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 text-slate-400"><User className="w-6 h-6" /><span className="text-xs">{t('profile')}</span></button>
            <button className="flex flex-col items-center gap-1 text-white"><Settings className="w-6 h-6" /><span className="text-xs">{t('settings')}</span></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
