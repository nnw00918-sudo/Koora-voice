import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  ar: {
    // Navigation
    home: 'الرئيسية',
    threads: 'ثريد',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    
    // Settings Page
    settingsTitle: 'الإعدادات',
    account: 'الحساب',
    changePassword: 'تغيير كلمة المرور',
    preferences: 'التفضيلات',
    notifications: 'الإشعارات',
    darkMode: 'الوضع الداكن',
    sounds: 'الأصوات',
    language: 'اللغة',
    support: 'الدعم',
    help: 'المساعدة',
    aboutApp: 'عن التطبيق',
    controlPanel: 'لوحة التحكم',
    logout: 'تسجيل الخروج',
    owner: 'مالك',
    admin: 'أدمن',
    mod: 'مود',
    arabic: 'العربية',
    english: 'English',
    
    // Dashboard
    liveRooms: 'الغرف المباشرة',
    createRoom: '+ إنشاء غرفة',
    all: 'الكل',
    joinNow: 'انضم الآن',
    host: 'المضيف',
    noRooms: 'لا توجد غرف في هذه الفئة',
    beFirst: 'كن أول من ينشئ غرفة',
    online: 'متصل',
    
    // Room
    room: 'الغرفة',
    requestToSpeak: 'طلب التحدث',
    onStage: 'أنت على المنصة',
    sendMessage: 'إرسال رسالة...',
    roomSettings: 'إعدادات الغرفة',
    closeRoom: 'إغلاق الغرفة',
    openRoom: 'فتح الغرفة',
    deleteRoom: 'حذف الغرفة',
    manageParticipants: 'إدارة المشاركين',
    participants: 'المشاركين',
    mute: 'كتم',
    unmute: 'إلغاء الكتم',
    kick: 'طرد',
    promote: 'ترقية',
    demote: 'إنزال من المنصة',
    invite: 'دعوة للمنصة',
    seatRequests: 'طلبات الصعود',
    
    // Auth
    welcome: 'مرحباً بعودتك',
    loginToContinue: 'سجل دخولك للمتابعة',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    noAccount: 'ليس لديك حساب؟',
    registerNow: 'سجل الآن',
    
    // Messages
    leftRoom: 'غادرت الغرفة',
    joinedStage: 'صعدت للمنصة',
    micOn: 'تم تشغيل الميكروفون',
    micOff: 'تم كتم الميكروفون',
  },
  en: {
    // Navigation
    home: 'Home',
    threads: 'Threads',
    profile: 'Profile',
    settings: 'Settings',
    
    // Settings Page
    settingsTitle: 'Settings',
    account: 'Account',
    changePassword: 'Change Password',
    preferences: 'Preferences',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    sounds: 'Sounds',
    language: 'Language',
    support: 'Support',
    help: 'Help',
    aboutApp: 'About App',
    controlPanel: 'Control Panel',
    logout: 'Logout',
    owner: 'Owner',
    admin: 'Admin',
    mod: 'Mod',
    arabic: 'العربية',
    english: 'English',
    
    // Dashboard
    liveRooms: 'Live Rooms',
    createRoom: '+ Create Room',
    all: 'All',
    joinNow: 'Join Now',
    host: 'Host',
    noRooms: 'No rooms in this category',
    beFirst: 'Be the first to create a room',
    online: 'Online',
    
    // Room
    room: 'Room',
    requestToSpeak: 'Request to speak',
    onStage: 'You are on stage',
    sendMessage: 'Send message...',
    roomSettings: 'Room Settings',
    closeRoom: 'Close Room',
    openRoom: 'Open Room',
    deleteRoom: 'Delete Room',
    manageParticipants: 'Manage Participants',
    participants: 'Participants',
    mute: 'Mute',
    unmute: 'Unmute',
    kick: 'Kick',
    promote: 'Promote',
    demote: 'Remove from stage',
    invite: 'Invite to stage',
    seatRequests: 'Seat Requests',
    
    // Auth
    welcome: 'Welcome Back',
    loginToContinue: 'Login to continue',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    noAccount: "Don't have an account?",
    registerNow: 'Register Now',
    
    // Messages
    leftRoom: 'Left the room',
    joinedStage: 'Joined the stage',
    micOn: 'Microphone on',
    micOff: 'Microphone muted',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
