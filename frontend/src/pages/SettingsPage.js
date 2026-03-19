import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  ArrowLeft,
  ArrowRight,
  Home, 
  Trophy, 
  Settings, 
  Bell, 
  Moon, 
  Volume2, 
  Shield, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  User,
  Lock,
  Eye,
  Globe,
  Palette,
  Smartphone,
  HelpCircle,
  Info,
  Mail,
  AtSign,
  KeyRound,
  BellRing,
  BellOff,
  MessageSquare,
  Heart,
  UserPlus,
  Megaphone,
  Check,
  X
} from 'lucide-react';

const SettingsPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSetting } = useSettings();
  const [currentView, setCurrentView] = useState('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      
      // Account
      username: 'اسم المستخدم',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      changePassword: 'تغيير كلمة المرور',
      
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
      sounds: 'الأصوات',
      soundsDesc: 'أصوات الإشعارات والتفاعلات',
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
      
      // Account
      username: 'Username',
      email: 'Email',
      password: 'Password',
      changePassword: 'Change password',
      
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
      sounds: 'Sounds',
      soundsDesc: 'Notification and interaction sounds',
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
    }
  };

  const txt = text[language];

  const SettingItem = ({ icon: Icon, label, desc, onClick, toggle, value, onToggle, showArrow = true }) => (
    <button
      onClick={toggle ? () => onToggle(!value) : onClick}
      className={`w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
    >
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <p className="text-white font-cairo font-medium">{label}</p>
          {desc && <p className="text-slate-500 text-sm font-almarai">{desc}</p>}
        </div>
      </div>
      {toggle ? (
        <div className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${value ? 'bg-lime-400' : 'bg-slate-700'}`}>
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value ? (isRTL ? '' : 'translate-x-5') : (isRTL ? 'translate-x-5' : '')}`} />
        </div>
      ) : showArrow ? (
        <ForwardIcon className="w-5 h-5 text-slate-500" />
      ) : null}
    </button>
  );

  const SectionHeader = ({ title }) => (
    <div className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
      <p className="text-slate-500 text-sm font-almarai font-medium">{title}</p>
    </div>
  );

  const SubPageHeader = ({ title, onBack }) => (
    <div className="sticky top-0 bg-slate-950 border-b border-slate-800 p-4 z-10">
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={onBack} className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center">
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
        className={`w-full p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors border-b border-slate-800 ${isRTL ? 'flex-row-reverse' : ''}`}
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
        <SettingItem icon={HelpCircle} label={txt.help} onClick={() => {}} />
        <SettingItem icon={Info} label={txt.about} onClick={() => setCurrentView('about')} />
      </div>

      <div className="h-2 bg-slate-900" />

      <button
        onClick={() => setShowLogoutConfirm(true)}
        className={`w-full p-4 flex items-center gap-4 hover:bg-red-500/10 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
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
          <p className="text-slate-500 font-almarai">{user.username}</p>
          <p className="text-white font-cairo">{txt.username}</p>
        </div>
        <div className={`p-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="text-slate-500 font-almarai">{user.email}</p>
          <p className="text-white font-cairo">{txt.email}</p>
        </div>
        <SettingItem icon={KeyRound} label={txt.changePassword} onClick={() => {}} />
      </div>
    </>
  );

  // Privacy View
  const PrivacyView = () => (
    <>
      <SubPageHeader title={txt.privacy} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem
          icon={Lock}
          label={txt.privateAccount}
          desc={txt.privateAccountDesc}
          toggle
          value={settings.privateAccount}
          onToggle={(v) => updateSetting('privateAccount', v)}
        />
        <SettingItem
          icon={Eye}
          label={txt.showOnline}
          desc={txt.showOnlineDesc}
          toggle
          value={settings.showOnline !== false}
          onToggle={(v) => updateSetting('showOnline', v)}
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
          icon={BellRing}
          label={txt.pushNotifications}
          desc={txt.pushDesc}
          toggle
          value={settings.notifications !== false}
          onToggle={(v) => updateSetting('notifications', v)}
        />
        <SettingItem
          icon={MessageSquare}
          label={txt.messageNotif}
          desc={txt.messageNotifDesc}
          toggle
          value={settings.messageNotif !== false}
          onToggle={(v) => updateSetting('messageNotif', v)}
        />
        <SettingItem
          icon={Heart}
          label={txt.likesNotif}
          desc={txt.likesNotifDesc}
          toggle
          value={settings.likesNotif !== false}
          onToggle={(v) => updateSetting('likesNotif', v)}
        />
        <SettingItem
          icon={UserPlus}
          label={txt.followNotif}
          desc={txt.followNotifDesc}
          toggle
          value={settings.followNotif !== false}
          onToggle={(v) => updateSetting('followNotif', v)}
        />
        <SettingItem
          icon={Megaphone}
          label={txt.roomNotif}
          desc={txt.roomNotifDesc}
          toggle
          value={settings.roomNotif !== false}
          onToggle={(v) => updateSetting('roomNotif', v)}
        />
      </div>
    </>
  );

  // Display View
  const DisplayView = () => (
    <>
      <SubPageHeader title={txt.display} onBack={() => setCurrentView('main')} />
      <div className="divide-y divide-slate-800/50">
        <SettingItem
          icon={Moon}
          label={txt.darkMode}
          desc={txt.darkModeDesc}
          toggle
          value={settings.darkMode !== false}
          onToggle={(v) => updateSetting('darkMode', v)}
        />
        <SettingItem
          icon={Volume2}
          label={txt.sounds}
          desc={txt.soundsDesc}
          toggle
          value={settings.sounds !== false}
          onToggle={(v) => updateSetting('sounds', v)}
        />
        <SettingItem
          icon={Smartphone}
          label={txt.vibration}
          desc={txt.vibrationDesc}
          toggle
          value={settings.vibration !== false}
          onToggle={(v) => updateSetting('vibration', v)}
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
          className={`w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-2xl">🇸🇦</span>
            <p className="text-white font-cairo">العربية</p>
          </div>
          {language === 'ar' && <Check className="w-5 h-5 text-lime-400" />}
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-2xl">🇺🇸</span>
            <p className="text-white font-cairo">English</p>
          </div>
          {language === 'en' && <Check className="w-5 h-5 text-lime-400" />}
        </button>
      </div>
    </>
  );

  // About View
  const AboutView = () => (
    <>
      <SubPageHeader title={txt.about} onBack={() => setCurrentView('main')} />
      <div className="p-6 flex flex-col items-center">
        <div className="w-20 h-20 bg-lime-400 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-4xl">⚽</span>
        </div>
        <h2 className="text-white font-cairo font-bold text-xl mb-1">Pitch Chat</h2>
        <p className="text-slate-500 font-almarai text-sm mb-6">{txt.version}: 1.0.0</p>
      </div>
      <div className="divide-y divide-slate-800/50">
        <div className={`p-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="text-slate-400 font-almarai">Emergent Labs</p>
          <p className="text-white font-cairo">{txt.developer}</p>
        </div>
        <SettingItem icon={Mail} label={txt.contact} onClick={() => {}} />
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
              className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className={`text-white font-cairo font-bold text-lg mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                {txt.logoutConfirm}
              </p>
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
