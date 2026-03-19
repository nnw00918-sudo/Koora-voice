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
  Heart, UserPlus, Megaphone, Check, X, Camera, AtSign, Image, Users, Edit3
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
  
  // Profile state
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
      setProfileData(prev => ({
        ...prev,
        name: response.data.name || response.data.username || prev.name,
        bio: response.data.bio || prev.bio
      }));
    } catch (error) { console.error('Failed to fetch user stats'); }
  };

  const fetchFollowers = async () => {
    try {
      const response = await axios.get(`${API}/users/${user.id}/followers`, { headers: { Authorization: `Bearer ${token}` } });
      setFollowers(response.data.followers);
    } catch (error) { console.error('Failed to fetch followers'); }
  };

  const fetchFollowing = async () => {
    try {
      const response = await axios.get(`${API}/users/${user.id}/following`, { headers: { Authorization: `Bearer ${token}` } });
      setFollowing(response.data.following);
    } catch (error) { console.error('Failed to fetch following'); }
  };

  const handleFollow = async (userId, isCurrentlyFollowing) => {
    try {
      if (isCurrentlyFollowing) {
        await axios.delete(`${API}/users/${userId}/follow`, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(isRTL ? 'تم إلغاء المتابعة' : 'Unfollowed');
      } else {
        await axios.post(`${API}/users/${userId}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(isRTL ? 'تمت المتابعة' : 'Followed');
      }
      fetchFollowers(); fetchFollowing(); fetchUserStats();
    } catch (error) { toast.error(error.response?.data?.detail || 'Error'); }
  };

  const txt = {
    ar: {
      settings: 'الإعدادات', profile: 'الملف الشخصي', profileDesc: 'تعديل الاسم والصورة والنبذة',
      account: 'الحساب', accountDesc: 'البريد الإلكتروني وكلمة المرور',
      privacy: 'الخصوصية والأمان', privacyDesc: 'إدارة ما يراه الآخرون عنك',
      notifications: 'الإشعارات', notificationsDesc: 'تخصيص الإشعارات التي تصلك',
      display: 'العرض والأصوات', displayDesc: 'المظهر، الوضع الداكن، الأصوات',
      language: 'اللغة', languageDesc: 'تغيير لغة التطبيق',
      help: 'مركز المساعدة', about: 'حول التطبيق',
      logout: 'تسجيل الخروج', logoutConfirm: 'هل تريد تسجيل الخروج؟',
      cancel: 'إلغاء', confirm: 'تأكيد', save: 'حفظ', edit: 'تعديل',
      editProfile: 'تعديل الملف الشخصي',
      name: 'الاسم', namePlaceholder: 'اسمك الظاهر للآخرين',
      username: 'اسم المستخدم', usernamePlaceholder: 'اسم الحساب (بدون مسافات)',
      bio: 'النبذة التعريفية', bioPlaceholder: 'اكتب نبذة عنك...',
      profileUpdated: 'تم تحديث الملف الشخصي', profileError: 'فشل تحديث الملف الشخصي',
      usernameTaken: 'اسم المستخدم مستخدم بالفعل', usernameShort: 'اسم المستخدم قصير جداً',
      followers: 'المتابعون', following: 'يتابع',
      noFollowers: 'لا يوجد متابعون بعد', noFollowing: 'لا تتابع أحداً بعد',
      follow: 'متابعة', unfollow: 'إلغاء المتابعة',
      gallery: 'الألبوم', randomAvatar: 'صورة عشوائية',
      email: 'البريد الإلكتروني', changePassword: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية', newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور', passwordChanged: 'تم تغيير كلمة المرور',
      passwordError: 'كلمات المرور غير متطابقة', fillAllFields: 'يرجى ملء جميع الحقول',
      privateAccount: 'حساب خاص', privateAccountDesc: 'فقط المتابعون يرون نشاطك',
      showOnline: 'إظهار الحالة', showOnlineDesc: 'السماح للآخرين برؤية أنك متصل',
      pushNotifications: 'الإشعارات الفورية', pushDesc: 'تلقي إشعارات على جهازك',
      messageNotif: 'الرسائل', messageNotifDesc: 'إشعارات الرسائل الجديدة',
      likesNotif: 'الإعجابات', likesNotifDesc: 'عندما يعجب أحد بنشاطك',
      followNotif: 'المتابعات', followNotifDesc: 'عندما يتابعك أحد',
      roomNotif: 'الغرف', roomNotifDesc: 'إشعارات الغرف المباشرة',
      darkMode: 'الوضع الداكن', darkModeDesc: 'تفعيل المظهر الداكن',
      sounds: 'الأصوات', soundsDesc: 'أصوات الإشعارات والتفاعلات',
      vibration: 'الاهتزاز', vibrationDesc: 'اهتزاز عند الإشعارات',
      selectLanguage: 'اختر اللغة', version: 'الإصدار', developer: 'المطور', contact: 'تواصل معنا',
      on: 'مفعّل', off: 'معطّل', level: 'المستوى', coins: 'العملات', xp: 'الخبرة',
    },
    en: {
      settings: 'Settings', profile: 'Profile', profileDesc: 'Edit name, photo and bio',
      account: 'Account', accountDesc: 'Email and password',
      privacy: 'Privacy & Security', privacyDesc: 'Manage what others see about you',
      notifications: 'Notifications', notificationsDesc: 'Customize your notifications',
      display: 'Display & Sound', displayDesc: 'Appearance, dark mode, sounds',
      language: 'Language', languageDesc: 'Change app language',
      help: 'Help Center', about: 'About',
      logout: 'Log out', logoutConfirm: 'Are you sure you want to log out?',
      cancel: 'Cancel', confirm: 'Log out', save: 'Save', edit: 'Edit',
      editProfile: 'Edit Profile',
      name: 'Name', namePlaceholder: 'Your display name',
      username: 'Username', usernamePlaceholder: 'Account handle (no spaces)',
      bio: 'Bio', bioPlaceholder: 'Write something about yourself...',
      profileUpdated: 'Profile updated', profileError: 'Failed to update profile',
      usernameTaken: 'Username is taken', usernameShort: 'Username too short',
      followers: 'Followers', following: 'Following',
      noFollowers: 'No followers yet', noFollowing: 'Not following anyone',
      follow: 'Follow', unfollow: 'Unfollow',
      gallery: 'Gallery', randomAvatar: 'Random Avatar',
      email: 'Email', changePassword: 'Change password',
      currentPassword: 'Current password', newPassword: 'New password',
      confirmPassword: 'Confirm password', passwordChanged: 'Password changed',
      passwordError: 'Passwords do not match', fillAllFields: 'Fill all fields',
      privateAccount: 'Private account', privateAccountDesc: 'Only followers see your activity',
      showOnline: 'Show online', showOnlineDesc: 'Let others see when online',
      pushNotifications: 'Push notifications', pushDesc: 'Get notifications on device',
      messageNotif: 'Messages', messageNotifDesc: 'New message notifications',
      likesNotif: 'Likes', likesNotifDesc: 'When someone likes your activity',
      followNotif: 'Follows', followNotifDesc: 'When someone follows you',
      roomNotif: 'Rooms', roomNotifDesc: 'Live room notifications',
      darkMode: 'Dark mode', darkModeDesc: 'Enable dark appearance',
      sounds: 'Sounds', soundsDesc: 'Notification sounds',
      vibration: 'Vibration', vibrationDesc: 'Vibrate on notifications',
      selectLanguage: 'Select language', version: 'Version', developer: 'Developer', contact: 'Contact us',
      on: 'On', off: 'Off', level: 'Level', coins: 'Coins', xp: 'XP',
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
      const updatedUser = { ...user, ...response.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success(txt.profileUpdated);
      setIsEditingProfile(false);
      window.location.reload();
    } catch (error) {
      const detail = error.response?.data?.detail || '';
      if (detail.includes('مستخدم') || detail.includes('taken')) toast.error(txt.usernameTaken);
      else if (detail.includes('3')) toast.error(txt.usernameShort);
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
        <div className="flex items-center gap-3">
          {status && <span className={`text-xs font-almarai ${value ? 'text-lime-400' : 'text-slate-500'}`}>{value ? txt.on : txt.off}</span>}
          <div className={`w-14 h-8 rounded-full flex items-center px-1 transition-all ${value ? 'bg-lime-400' : 'bg-slate-700'}`}>
            <motion.div className="w-6 h-6 rounded-full bg-white shadow-md" animate={{ x: value ? (isRTL ? 0 : 24) : (isRTL ? 24 : 0) }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          </div>
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
          className={`px-4 py-2 rounded-full font-cairo font-bold text-sm ${u.is_following ? 'bg-slate-800 text-white border border-slate-600' : 'bg-lime-400 text-slate-900'}`}>
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
        className={`w-full p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors border-b border-slate-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <img src={user.avatar} alt={user.username} className="w-14 h-14 rounded-full ring-2 ring-lime-400" />
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

  // Profile View
  const ProfileView = () => (
    <>
      <SubPageHeader title={isEditingProfile ? txt.editProfile : txt.profile} onBack={() => { setCurrentView('main'); setIsEditingProfile(false); }}
        rightButton={isEditingProfile ? (
          <button onClick={handleSaveProfile} disabled={savingProfile} className="px-5 py-2 rounded-full bg-lime-400 text-slate-900 font-cairo font-bold text-sm disabled:opacity-50">
            {savingProfile ? '...' : txt.save}
          </button>
        ) : (
          <button onClick={() => setIsEditingProfile(true)} className="px-5 py-2 rounded-full border border-slate-600 text-white font-cairo font-bold text-sm hover:bg-slate-800">
            {txt.edit}
          </button>
        )}
      />
      
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-lime-400/30 via-emerald-500/30 to-cyan-500/30" />
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="relative">
            <img src={isEditingProfile ? profileData.avatar : user.avatar} alt="" className="w-32 h-32 rounded-full border-4 border-slate-950 bg-slate-900 object-cover" />
            {isEditingProfile && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-lime-400 flex items-center justify-center shadow-lg">
                <Camera className="w-5 h-5 text-slate-900" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>
        </div>
      </div>

      <div className="pt-20 px-4 pb-6">
        {isEditingProfile ? (
          <div className="space-y-4">
            <div className="flex justify-center gap-3 mb-4">
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-white text-sm">
                <Image className="w-4 h-4" /> {txt.gallery}
              </button>
              <button onClick={handleRandomAvatar} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-white text-sm">
                <User className="w-4 h-4" /> {txt.randomAvatar}
              </button>
            </div>
            
            {/* Name Field */}
            <div>
              <label className={`block text-slate-400 text-sm font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{txt.name}</label>
              <div className="relative">
                <Edit3 className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500`} />
                <Input value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder={txt.namePlaceholder} className={`bg-slate-800 border-slate-700 text-white ${isRTL ? 'pr-10 text-right' : 'pl-10'}`} maxLength={50} />
              </div>
            </div>
            
            {/* Username Field */}
            <div>
              <label className={`block text-slate-400 text-sm font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{txt.username}</label>
              <div className="relative">
                <AtSign className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500`} />
                <Input value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder={txt.usernamePlaceholder} className={`bg-slate-800 border-slate-700 text-white ${isRTL ? 'pr-10 text-right' : 'pl-10'}`} maxLength={20} />
              </div>
              <p className={`text-slate-600 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>@{profileData.username || 'username'}</p>
            </div>
            
            {/* Bio Field */}
            <div>
              <label className={`block text-slate-400 text-sm font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{txt.bio}</label>
              <textarea value={profileData.bio} onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder={txt.bioPlaceholder} maxLength={160}
                className={`w-full bg-slate-800 border border-slate-700 rounded-lg text-white p-3 h-24 resize-none focus:border-lime-400 outline-none ${isRTL ? 'text-right' : 'text-left'}`} />
              <p className={`text-slate-500 text-xs mt-1 ${isRTL ? 'text-left' : 'text-right'}`}>{profileData.bio.length}/160</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-cairo font-bold text-white">{user.name || user.username}</h2>
            <p className="text-slate-500 font-almarai mt-1">@{user.username}</p>
            {user.bio && <p className="text-slate-300 font-almarai mt-3 max-w-sm mx-auto">{user.bio}</p>}
            
            <div className="flex justify-center gap-6 mt-4">
              <button onClick={() => { setCurrentView('followers'); fetchFollowers(); }} className="text-center hover:opacity-80">
                <p className="text-xl font-chivo font-bold text-white">{userStats.followers_count}</p>
                <p className="text-slate-500 text-sm font-almarai">{txt.followers}</p>
              </button>
              <button onClick={() => { setCurrentView('following'); fetchFollowing(); }} className="text-center hover:opacity-80">
                <p className="text-xl font-chivo font-bold text-white">{userStats.following_count}</p>
                <p className="text-slate-500 text-sm font-almarai">{txt.following}</p>
              </button>
            </div>
            
            <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-slate-800">
              <div className="text-center">
                <p className="text-xl font-chivo font-bold text-white">{user.level || 1}</p>
                <p className="text-slate-500 text-sm font-almarai">{txt.level}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-chivo font-bold text-lime-400">{user.coins || 1000}</p>
                <p className="text-slate-500 text-sm font-almarai">{txt.coins}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-chivo font-bold text-white">{user.xp || 0}</p>
                <p className="text-slate-500 text-sm font-almarai">{txt.xp}</p>
              </div>
            </div>

            {user.role && user.role !== 'user' && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/50">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 font-cairo font-bold text-sm">
                  {user.role === 'owner' ? (isRTL ? 'مالك' : 'Owner') : user.role === 'admin' ? (isRTL ? 'أدمن' : 'Admin') : (isRTL ? 'مشرف' : 'Mod')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
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
        <SettingItem icon={settings.privateAccount ? Lock : Eye} label={txt.privateAccount} desc={txt.privateAccountDesc} toggle value={settings.privateAccount} onToggle={(v) => updateSetting('privateAccount', v)} status />
        <SettingItem icon={settings.showOnline ? Eye : EyeOff} label={txt.showOnline} desc={txt.showOnlineDesc} toggle value={settings.showOnline} onToggle={(v) => updateSetting('showOnline', v)} status />
      </div>
    </>
  );

  const NotificationsView = () => (
    <>
      <SubPageHeader title={txt.notifications} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={settings.notifications ? BellRing : BellOff} label={txt.pushNotifications} desc={txt.pushDesc} toggle value={settings.notifications} onToggle={(v) => updateSetting('notifications', v)} status />
        {settings.notifications && <>
          <SettingItem icon={MessageSquare} label={txt.messageNotif} desc={txt.messageNotifDesc} toggle value={settings.messageNotif} onToggle={(v) => updateSetting('messageNotif', v)} />
          <SettingItem icon={Heart} label={txt.likesNotif} desc={txt.likesNotifDesc} toggle value={settings.likesNotif} onToggle={(v) => updateSetting('likesNotif', v)} />
          <SettingItem icon={UserPlus} label={txt.followNotif} desc={txt.followNotifDesc} toggle value={settings.followNotif} onToggle={(v) => updateSetting('followNotif', v)} />
          <SettingItem icon={Megaphone} label={txt.roomNotif} desc={txt.roomNotifDesc} toggle value={settings.roomNotif} onToggle={(v) => updateSetting('roomNotif', v)} />
        </>}
      </div>
    </>
  );

  const DisplayView = () => (
    <>
      <SubPageHeader title={txt.display} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={settings.darkMode ? Moon : Sun} label={txt.darkMode} desc={txt.darkModeDesc} toggle value={settings.darkMode} onToggle={(v) => updateSetting('darkMode', v)} status />
        <SettingItem icon={settings.sounds ? Volume2 : VolumeX} label={txt.sounds} desc={txt.soundsDesc} toggle value={settings.sounds} onToggle={(v) => updateSetting('sounds', v)} status />
        <SettingItem icon={Smartphone} label={txt.vibration} desc={txt.vibrationDesc} toggle value={settings.vibration} onToggle={(v) => updateSetting('vibration', v)} status />
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
            {language === lang && <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center"><Check className="w-4 h-4 text-slate-900" /></div>}
          </button>
        ))}
      </div>
    </>
  );

  const AboutView = () => (
    <>
      <SubPageHeader title={txt.about} onBack={() => setCurrentView('main')} />
      <div className="p-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-3xl flex items-center justify-center mb-4 shadow-lg"><span className="text-5xl">⚽</span></div>
        <h2 className="text-white font-cairo font-bold text-2xl mb-1">Pitch Chat</h2>
        <p className="text-slate-500 font-almarai text-sm">{txt.version}: 1.0.0</p>
      </div>
      <div className="divide-y divide-slate-800/50">
        <div className={`p-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="text-lime-400 font-almarai">Emergent Labs</p><p className="text-white font-cairo">{txt.developer}</p>
        </div>
        <SettingItem icon={Mail} label={txt.contact} onClick={() => window.open('mailto:contact@pitchchat.com')} />
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

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-white font-cairo font-bold text-lg">{txt.changePassword}</h3>
                <button onClick={() => setShowPasswordModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-4">
                {['current', 'new', 'confirm'].map((field) => (
                  <div key={field}>
                    <label className={`block text-slate-400 text-sm mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {field === 'current' ? txt.currentPassword : field === 'new' ? txt.newPassword : txt.confirmPassword}
                    </label>
                    <div className="relative">
                      <Input type={showPasswords[field] ? 'text' : 'password'} value={passwordData[field]} onChange={(e) => setPasswordData({ ...passwordData, [field]: e.target.value })} className="bg-slate-800 border-slate-700 text-white pr-10" />
                      <button type="button" onClick={() => setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPasswords[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 rounded-full bg-slate-800 text-white font-cairo font-bold">{txt.cancel}</button>
                <button onClick={handleChangePassword} className="flex-1 py-3 rounded-full bg-lime-400 text-slate-900 font-cairo font-bold">{txt.save}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4"><LogOut className="w-8 h-8 text-red-400" /></div>
                <p className="text-white font-cairo font-bold text-lg text-center">{txt.logoutConfirm}</p>
              </div>
              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-full bg-slate-800 text-white font-cairo font-bold">{txt.cancel}</button>
                <button onClick={() => { setShowLogoutConfirm(false); onLogout(); }} className="flex-1 py-3 rounded-full bg-red-500 text-white font-cairo font-bold">{txt.confirm}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-40">
        <div className={`max-w-[600px] mx-auto flex justify-around p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"><Home className="w-6 h-6" /><span className="text-xs font-almarai">{t('home')}</span></button>
          <button onClick={() => navigate('/matches')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"><Trophy className="w-6 h-6" /><span className="text-xs font-almarai">{t('matches')}</span></button>
          <button className="flex flex-col items-center gap-1 text-lime-400"><Settings className="w-6 h-6" /><span className="text-xs font-almarai">{t('settings')}</span></button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
