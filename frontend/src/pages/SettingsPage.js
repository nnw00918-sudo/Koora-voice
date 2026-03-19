import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { Input } from '../components/ui/input';
import { 
  ArrowLeft,
  ArrowRight,
  Home, 
  Trophy, 
  Settings, 
  Bell, 
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Shield, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  User,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Palette,
  Smartphone,
  HelpCircle,
  Info,
  Mail,
  KeyRound,
  BellRing,
  BellOff,
  MessageSquare,
  Heart,
  UserPlus,
  Megaphone,
  Check,
  X,
  Vibrate
} from 'lucide-react';

const SettingsPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSetting } = useSettings();
  const [currentView, setCurrentView] = useState('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const isRTL = language === 'ar';
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const ForwardIcon = isRTL ? ChevronLeft : ChevronRight;

  const text = {
    ar: {
      settings: 'الإعدادات',
      account: 'حسابك',
      accountDesc: 'معلومات الحساب، تغيير كلمة المرور',
      privacy: 'الخصوصية والأمان',
      privacyDesc: 'إدارة ما يراه الآخرون عنك',
      notifications: 'الإشعارات',
      notificationsDesc: 'تخصيص الإشعارات التي تصلك',
      display: 'العرض والأصوات',
      displayDesc: 'المظهر، الوضع الداكن، الأصوات',
      language: 'اللغة',
      languageDesc: 'تغيير لغة التطبيق',
      help: 'مركز المساعدة',
      about: 'حول التطبيق',
      logout: 'تسجيل الخروج',
      logoutConfirm: 'هل تريد تسجيل الخروج؟',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      back: 'رجوع',
      save: 'حفظ',
      
      // Account
      username: 'اسم المستخدم',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      changePassword: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور',
      passwordChanged: 'تم تغيير كلمة المرور بنجاح',
      passwordError: 'كلمات المرور غير متطابقة',
      fillAllFields: 'يرجى ملء جميع الحقول',
      
      // Privacy
      privateAccount: 'حساب خاص',
      privateAccountDesc: 'فقط المتابعون يرون نشاطك',
      showOnline: 'إظهار الحالة',
      showOnlineDesc: 'السماح للآخرين برؤية أنك متصل',
      
      // Notifications
      pushNotifications: 'الإشعارات الفورية',
      pushDesc: 'تلقي إشعارات على جهازك',
      messageNotif: 'الرسائل',
      messageNotifDesc: 'إشعارات الرسائل الجديدة',
      likesNotif: 'الإعجابات',
      likesNotifDesc: 'عندما يعجب أحد بنشاطك',
      followNotif: 'المتابعات',
      followNotifDesc: 'عندما يتابعك أحد',
      roomNotif: 'الغرف',
      roomNotifDesc: 'إشعارات الغرف المباشرة',
      
      // Display
      darkMode: 'الوضع الداكن',
      darkModeDesc: 'تفعيل المظهر الداكن',
      lightMode: 'الوضع الفاتح',
      lightModeDesc: 'تفعيل المظهر الفاتح',
      sounds: 'الأصوات',
      soundsDesc: 'أصوات الإشعارات والتفاعلات',
      soundsOff: 'الأصوات معطلة',
      soundsOffDesc: 'لن تسمع أي أصوات',
      vibration: 'الاهتزاز',
      vibrationDesc: 'اهتزاز عند الإشعارات',
      
      // Language
      arabic: 'العربية',
      english: 'English',
      selectLanguage: 'اختر اللغة',
      
      // About
      version: 'الإصدار',
      developer: 'المطور',
      contact: 'تواصل معنا',
      
      // Status
      on: 'مفعّل',
      off: 'معطّل',
    },
    en: {
      settings: 'Settings',
      account: 'Your Account',
      accountDesc: 'Account info, change password',
      privacy: 'Privacy & Security',
      privacyDesc: 'Manage what others see about you',
      notifications: 'Notifications',
      notificationsDesc: 'Customize your notifications',
      display: 'Display & Sound',
      displayDesc: 'Appearance, dark mode, sounds',
      language: 'Language',
      languageDesc: 'Change app language',
      help: 'Help Center',
      about: 'About',
      logout: 'Log out',
      logoutConfirm: 'Are you sure you want to log out?',
      cancel: 'Cancel',
      confirm: 'Log out',
      back: 'Back',
      save: 'Save',
      
      // Account
      username: 'Username',
      email: 'Email',
      password: 'Password',
      changePassword: 'Change password',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      passwordChanged: 'Password changed successfully',
      passwordError: 'Passwords do not match',
      fillAllFields: 'Please fill all fields',
      
      // Privacy
      privateAccount: 'Private account',
      privateAccountDesc: 'Only followers see your activity',
      showOnline: 'Show online status',
      showOnlineDesc: 'Let others see when you are online',
      
      // Notifications
      pushNotifications: 'Push notifications',
      pushDesc: 'Receive notifications on your device',
      messageNotif: 'Messages',
      messageNotifDesc: 'New message notifications',
      likesNotif: 'Likes',
      likesNotifDesc: 'When someone likes your activity',
      followNotif: 'Follows',
      followNotifDesc: 'When someone follows you',
      roomNotif: 'Rooms',
      roomNotifDesc: 'Live room notifications',
      
      // Display
      darkMode: 'Dark mode',
      darkModeDesc: 'Enable dark appearance',
      lightMode: 'Light mode',
      lightModeDesc: 'Enable light appearance',
      sounds: 'Sounds',
      soundsDesc: 'Notification and interaction sounds',
      soundsOff: 'Sounds off',
      soundsOffDesc: 'You won\'t hear any sounds',
      vibration: 'Vibration',
      vibrationDesc: 'Vibrate on notifications',
      
      // Language
      arabic: 'العربية',
      english: 'English',
      selectLanguage: 'Select language',
      
      // About
      version: 'Version',
      developer: 'Developer',
      contact: 'Contact us',
      
      // Status
      on: 'On',
      off: 'Off',
    }
  };

  const txt = text[language];

  const handleChangePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error(txt.fillAllFields);
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error(txt.passwordError);
      return;
    }
    // Here you would call the API to change password
    toast.success(txt.passwordChanged);
    setShowPasswordModal(false);
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  const SettingItem = ({ icon: Icon, label, desc, onClick, toggle, value, onToggle, showArrow = true, status }) => (
    <button
      onClick={toggle ? () => onToggle(!value) : onClick}
      className={`w-full flex items-center justify-between p-4 hover:bg-slate-800/50 active:bg-slate-800 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
    >
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          toggle && value ? 'bg-lime-400/20' : 'bg-slate-800'
        }`}>
          <Icon className={`w-5 h-5 ${toggle && value ? 'text-lime-400' : 'text-slate-400'}`} />
        </div>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <p className="text-white font-cairo font-medium">{label}</p>
          {desc && <p className="text-slate-500 text-sm font-almarai">{desc}</p>}
        </div>
      </div>
      {toggle ? (
        <div className="flex items-center gap-3">
          {status && (
            <span className={`text-xs font-almarai ${value ? 'text-lime-400' : 'text-slate-500'}`}>
              {value ? txt.on : txt.off}
            </span>
          )}
          <div 
            className={`w-14 h-8 rounded-full flex items-center px-1 transition-all duration-300 ${
              value ? 'bg-lime-400' : 'bg-slate-700'
            }`}
          >
            <motion.div 
              className="w-6 h-6 rounded-full bg-white shadow-md"
              animate={{ x: value ? (isRTL ? 0 : 24) : (isRTL ? 24 : 0) }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
        </div>
      ) : showArrow ? (
        <ForwardIcon className="w-5 h-5 text-slate-500" />
      ) : null}
    </button>
  );

  const SectionHeader = ({ title }) => (
    <div className={`px-4 py-3 bg-slate-900/50 ${isRTL ? 'text-right' : 'text-left'}`}>
      <p className="text-slate-400 text-xs font-almarai font-bold uppercase tracking-wider">{title}</p>
    </div>
  );

  const SubPageHeader = ({ title, onBack }) => (
    <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 p-4 z-10">
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={onBack} className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center active:scale-95 transition-transform">
          <BackIcon className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-xl font-cairo font-bold text-white">{title}</h2>
      </div>
    </div>
  );

  // Main Settings View
  const MainView = () => (
    <>
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 p-4 z-10">
        <h1 className={`text-xl font-cairo font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {txt.settings}
        </h1>
      </div>

      {/* User Card */}
      <button
        onClick={() => setCurrentView('account')}
        className={`w-full p-4 flex items-center gap-4 hover:bg-slate-800/50 active:bg-slate-800 transition-colors border-b border-slate-800 ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <img src={user.avatar} alt={user.username} className="w-14 h-14 rounded-full ring-2 ring-lime-400" />
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-white font-cairo font-bold text-lg">{user.username}</p>
          <p className="text-slate-500 text-sm font-almarai">{user.email}</p>
        </div>
        <ForwardIcon className="w-5 h-5 text-slate-500" />
      </button>

      {/* Settings List */}
      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={User} label={txt.account} desc={txt.accountDesc} onClick={() => setCurrentView('account')} />
        <SettingItem icon={Shield} label={txt.privacy} desc={txt.privacyDesc} onClick={() => setCurrentView('privacy')} />
        <SettingItem icon={Bell} label={txt.notifications} desc={txt.notificationsDesc} onClick={() => setCurrentView('notifications')} />
        <SettingItem icon={Palette} label={txt.display} desc={txt.displayDesc} onClick={() => setCurrentView('display')} />
        <SettingItem icon={Globe} label={txt.language} desc={txt.languageDesc} onClick={() => setCurrentView('language')} />
      </div>

      <div className="h-2 bg-slate-900" />

      <div className="divide-y divide-slate-800/50">
        <SettingItem icon={HelpCircle} label={txt.help} onClick={() => window.open('mailto:support@pitchchat.com')} />
        <SettingItem icon={Info} label={txt.about} onClick={() => setCurrentView('about')} />
      </div>

      <div className="h-2 bg-slate-900" />

      <button
        onClick={() => setShowLogoutConfirm(true)}
        className={`w-full p-4 flex items-center gap-4 hover:bg-red-500/10 active:bg-red-500/20 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <LogOut className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-red-400 font-cairo font-medium">{txt.logout}</p>
      </button>
    </>
  );

  // Account View
  const AccountView = () => (
    <>
      <SubPageHeader title={txt.account} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <div className={`p-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="text-slate-400 font-almarai">{user.username}</p>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <User className="w-4 h-4 text-slate-500" />
            <p className="text-white font-cairo">{txt.username}</p>
          </div>
        </div>
        <div className={`p-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="text-slate-400 font-almarai">{user.email}</p>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Mail className="w-4 h-4 text-slate-500" />
            <p className="text-white font-cairo">{txt.email}</p>
          </div>
        </div>
        <SettingItem icon={KeyRound} label={txt.changePassword} onClick={() => setShowPasswordModal(true)} />
      </div>
    </>
  );

  // Privacy View
  const PrivacyView = () => (
    <>
      <SubPageHeader title={txt.privacy} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem
          icon={settings.privateAccount ? Lock : Eye}
          label={txt.privateAccount}
          desc={txt.privateAccountDesc}
          toggle
          value={settings.privateAccount}
          onToggle={(v) => updateSetting('privateAccount', v)}
          status
        />
        <SettingItem
          icon={settings.showOnline ? Eye : EyeOff}
          label={txt.showOnline}
          desc={txt.showOnlineDesc}
          toggle
          value={settings.showOnline}
          onToggle={(v) => updateSetting('showOnline', v)}
          status
        />
      </div>
    </>
  );

  // Notifications View
  const NotificationsView = () => (
    <>
      <SubPageHeader title={txt.notifications} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem
          icon={settings.notifications ? BellRing : BellOff}
          label={txt.pushNotifications}
          desc={txt.pushDesc}
          toggle
          value={settings.notifications}
          onToggle={(v) => updateSetting('notifications', v)}
          status
        />
      </div>
      
      {settings.notifications && (
        <>
          <SectionHeader title={isRTL ? 'أنواع الإشعارات' : 'Notification Types'} />
          <div className="divide-y divide-slate-800/50">
            <SettingItem
              icon={MessageSquare}
              label={txt.messageNotif}
              desc={txt.messageNotifDesc}
              toggle
              value={settings.messageNotif}
              onToggle={(v) => updateSetting('messageNotif', v)}
            />
            <SettingItem
              icon={Heart}
              label={txt.likesNotif}
              desc={txt.likesNotifDesc}
              toggle
              value={settings.likesNotif}
              onToggle={(v) => updateSetting('likesNotif', v)}
            />
            <SettingItem
              icon={UserPlus}
              label={txt.followNotif}
              desc={txt.followNotifDesc}
              toggle
              value={settings.followNotif}
              onToggle={(v) => updateSetting('followNotif', v)}
            />
            <SettingItem
              icon={Megaphone}
              label={txt.roomNotif}
              desc={txt.roomNotifDesc}
              toggle
              value={settings.roomNotif}
              onToggle={(v) => updateSetting('roomNotif', v)}
            />
          </div>
        </>
      )}
    </>
  );

  // Display View
  const DisplayView = () => (
    <>
      <SubPageHeader title={txt.display} onBack={() => setCurrentView('main')} />
      <SectionHeader title={isRTL ? 'المظهر' : 'Appearance'} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem
          icon={settings.darkMode ? Moon : Sun}
          label={settings.darkMode ? txt.darkMode : txt.lightMode}
          desc={settings.darkMode ? txt.darkModeDesc : txt.lightModeDesc}
          toggle
          value={settings.darkMode}
          onToggle={(v) => updateSetting('darkMode', v)}
          status
        />
      </div>
      
      <SectionHeader title={isRTL ? 'الصوت والاهتزاز' : 'Sound & Haptics'} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem
          icon={settings.sounds ? Volume2 : VolumeX}
          label={settings.sounds ? txt.sounds : txt.soundsOff}
          desc={settings.sounds ? txt.soundsDesc : txt.soundsOffDesc}
          toggle
          value={settings.sounds}
          onToggle={(v) => updateSetting('sounds', v)}
          status
        />
        <SettingItem
          icon={Smartphone}
          label={txt.vibration}
          desc={txt.vibrationDesc}
          toggle
          value={settings.vibration}
          onToggle={(v) => updateSetting('vibration', v)}
          status
        />
      </div>
    </>
  );

  // Language View
  const LanguageView = () => (
    <>
      <SubPageHeader title={txt.language} onBack={() => setCurrentView('main')} />
      <SectionHeader title={txt.selectLanguage} />
      <div className="divide-y divide-slate-800/50">
        <button
          onClick={() => setLanguage('ar')}
          className={`w-full p-4 flex items-center justify-between hover:bg-slate-800/50 active:bg-slate-800 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-2xl">🇸🇦</span>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo">العربية</p>
              <p className="text-slate-500 text-sm font-almarai">Arabic</p>
            </div>
          </div>
          {language === 'ar' && (
            <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
              <Check className="w-4 h-4 text-slate-900" />
            </div>
          )}
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`w-full p-4 flex items-center justify-between hover:bg-slate-800/50 active:bg-slate-800 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-2xl">🇺🇸</span>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-white font-cairo">English</p>
              <p className="text-slate-500 text-sm font-almarai">الإنجليزية</p>
            </div>
          </div>
          {language === 'en' && (
            <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
              <Check className="w-4 h-4 text-slate-900" />
            </div>
          )}
        </button>
      </div>
    </>
  );

  // About View
  const AboutView = () => (
    <>
      <SubPageHeader title={txt.about} onBack={() => setCurrentView('main')} />
      <div className="p-8 flex flex-col items-center">
        <motion.div 
          className="w-24 h-24 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-lime-400/20"
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-5xl">⚽</span>
        </motion.div>
        <h2 className="text-white font-cairo font-bold text-2xl mb-1">Pitch Chat</h2>
        <p className="text-slate-500 font-almarai text-sm mb-2">{txt.version}: 1.0.0</p>
        <p className="text-slate-600 font-almarai text-xs">© 2024 All rights reserved</p>
      </div>
      <div className="divide-y divide-slate-800/50">
        <div className={`p-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="text-lime-400 font-almarai">Emergent Labs</p>
          <p className="text-white font-cairo">{txt.developer}</p>
        </div>
        <SettingItem icon={Mail} label={txt.contact} onClick={() => window.open('mailto:contact@pitchchat.com')} />
      </div>
    </>
  );

  const renderView = () => {
    switch (currentView) {
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
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {renderView()}
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-white font-cairo font-bold text-lg">{txt.changePassword}</h3>
                <button onClick={() => setShowPasswordModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-slate-400 text-sm font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {txt.currentPassword}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white pr-10"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className={`block text-slate-400 text-sm font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {txt.newPassword}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white pr-10"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className={`block text-slate-400 text-sm font-almarai mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {txt.confirmPassword}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white pr-10"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-3 rounded-full bg-slate-800 text-white font-cairo font-bold hover:bg-slate-700 transition-colors"
                >
                  {txt.cancel}
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex-1 py-3 rounded-full bg-lime-400 text-slate-900 font-cairo font-bold hover:bg-lime-300 transition-colors"
                >
                  {txt.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <LogOut className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-white font-cairo font-bold text-lg text-center">
                  {txt.logoutConfirm}
                </p>
              </div>
              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-full bg-slate-800 text-white font-cairo font-bold hover:bg-slate-700 transition-colors"
                >
                  {txt.cancel}
                </button>
                <button
                  onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                  className="flex-1 py-3 rounded-full bg-red-500 text-white font-cairo font-bold hover:bg-red-600 transition-colors"
                >
                  {txt.confirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-40">
        <div className={`max-w-[600px] mx-auto flex justify-around p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <Home className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('home')}</span>
          </button>
          <button
            onClick={() => navigate('/matches')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <Trophy className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('matches')}</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-lime-400"
          >
            <Settings className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
