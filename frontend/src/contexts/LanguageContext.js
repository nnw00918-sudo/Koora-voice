import React, { createContext, useContext, useState, useEffect } from 'react';

// Translations
const translations = {
  ar: {
    // Landing Page
    appName: 'صوت الكورة',
    appNameEn: 'KOORA VOICE',
    tagline: 'الاستاد الرقمي لعشاق كرة القدم',
    login: 'تسجيل دخول',
    register: 'إنشاء حساب',
    
    // Auth
    loginTitle: 'مرحباً بعودتك',
    loginSubtitle: 'سجل دخولك للانضمام للمجتمع',
    registerTitle: 'انضم إلينا',
    registerSubtitle: 'أنشئ حسابك وابدأ رحلتك',
    emailOrUsername: 'البريد الإلكتروني أو اسم المستخدم',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    username: 'اسم المستخدم',
    name: 'الاسم',
    loginBtn: 'دخول',
    registerBtn: 'إنشاء حساب',
    noAccount: 'ليس لديك حساب؟',
    hasAccount: 'لديك حساب؟',
    createAccount: 'إنشاء حساب',
    loginHere: 'سجل دخول',
    forgotPassword: 'نسيت كلمة المرور؟',
    resetPassword: 'إعادة تعيين كلمة المرور',
    enterEmail: 'أدخل بريدك الإلكتروني',
    sendCode: 'إرسال الرمز',
    verificationCode: 'رمز التحقق',
    enterCode: 'أدخل رمز التحقق',
    newPassword: 'كلمة المرور الجديدة',
    confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
    resetBtn: 'تغيير كلمة المرور',
    backToLogin: 'العودة لتسجيل الدخول',
    codeSent: 'تم إرسال الرمز',
    passwordChanged: 'تم تغيير كلمة المرور بنجاح',
    
    // Dashboard
    home: 'الرئيسية',
    rooms: 'الغرف',
    myRooms: 'غرفي',
    favorites: 'المفضلة',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    logout: 'تسجيل خروج',
    search: 'بحث...',
    createRoom: 'إنشاء غرفة',
    joinRoom: 'دخول',
    online: 'متصل',
    offline: 'غير متصل',
    members: 'أعضاء',
    
    // Room Categories
    all: 'الكل',
    sports: 'رياضة',
    entertainment: 'ترفيه',
    technology: 'تكنولوجيا',
    culture: 'ثقافة',
    diwaniya: 'الدوانيه',
    
    // Room Page
    roomOwner: 'مالك الغرفة',
    roomLeader: 'رئيس الغرفة',
    admin: 'أدمن',
    mod: 'مود',
    member: 'عضو',
    newsReporter: 'إخباري',
    requestMic: 'طلب مايك',
    leaveMic: 'مغادرة المايك',
    mute: 'كتم',
    unmute: 'إلغاء الكتم',
    leaveRoom: 'مغادرة الغرفة',
    roomSettings: 'إعدادات الغرفة',
    participants: 'المتواجدون',
    chat: 'المحادثة',
    sendMessage: 'أرسل رسالة...',
    
    // News Ticker
    addNews: 'إضافة خبر',
    editNews: 'تعديل الخبر',
    deleteNews: 'حذف الخبر',
    manageNews: 'إدارة الأخبار',
    newsText: 'نص الخبر',
    newsCategory: 'تصنيف الخبر',
    noNews: 'لا توجد أخبار',
    saveChanges: 'حفظ التعديل',
    cancel: 'إلغاء',
    general: 'عام',
    results: 'نتائج',
    transfers: 'انتقالات',
    statements: 'تصريحات',
    breaking: 'عاجل',
    
    // Roles Modal
    userRoles: 'رتب المستخدمين',
    multipleRolesNote: 'يمكن إضافة أكثر من رتبة للمستخدم',
    primaryRole: 'الرتبة الرئيسية (اختر واحدة)',
    addonRoles: 'رتب إضافية (يمكن دمجها)',
    editRoles: 'تعديل الرتب',
    close: 'إغلاق',
    
    // Messages
    success: 'تم بنجاح',
    error: 'حدث خطأ',
    loading: 'جاري التحميل...',
    noResults: 'لا توجد نتائج',
    confirm: 'تأكيد',
    yes: 'نعم',
    no: 'لا',
    
    // Time
    now: 'الآن',
    minutesAgo: 'دقائق',
    hoursAgo: 'ساعات',
    daysAgo: 'أيام',
  },
  
  en: {
    // Landing Page
    appName: 'Koora Voice',
    appNameEn: 'KOORA VOICE',
    tagline: 'The Digital Stadium for Football Fans',
    login: 'Login',
    register: 'Create Account',
    
    // Auth
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Login to join the community',
    registerTitle: 'Join Us',
    registerSubtitle: 'Create your account and start your journey',
    emailOrUsername: 'Email or Username',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    username: 'Username',
    name: 'Name',
    loginBtn: 'Login',
    registerBtn: 'Create Account',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    createAccount: 'Create Account',
    loginHere: 'Login here',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset Password',
    enterEmail: 'Enter your email',
    sendCode: 'Send Code',
    verificationCode: 'Verification Code',
    enterCode: 'Enter verification code',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    resetBtn: 'Change Password',
    backToLogin: 'Back to Login',
    codeSent: 'Code sent',
    passwordChanged: 'Password changed successfully',
    
    // Dashboard
    home: 'Home',
    rooms: 'Rooms',
    myRooms: 'My Rooms',
    favorites: 'Favorites',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    search: 'Search...',
    createRoom: 'Create Room',
    joinRoom: 'Join',
    online: 'Online',
    offline: 'Offline',
    members: 'Members',
    
    // Room Categories
    all: 'All',
    sports: 'Sports',
    entertainment: 'Entertainment',
    technology: 'Technology',
    culture: 'Culture',
    diwaniya: 'Diwaniya',
    
    // Room Page
    roomOwner: 'Room Owner',
    roomLeader: 'Room Leader',
    admin: 'Admin',
    mod: 'Mod',
    member: 'Member',
    newsReporter: 'News Reporter',
    requestMic: 'Request Mic',
    leaveMic: 'Leave Mic',
    mute: 'Mute',
    unmute: 'Unmute',
    leaveRoom: 'Leave Room',
    roomSettings: 'Room Settings',
    participants: 'Participants',
    chat: 'Chat',
    sendMessage: 'Send a message...',
    
    // News Ticker
    addNews: 'Add News',
    editNews: 'Edit News',
    deleteNews: 'Delete News',
    manageNews: 'Manage News',
    newsText: 'News Text',
    newsCategory: 'News Category',
    noNews: 'No news available',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    general: 'General',
    results: 'Results',
    transfers: 'Transfers',
    statements: 'Statements',
    breaking: 'Breaking',
    
    // Roles Modal
    userRoles: 'User Roles',
    multipleRolesNote: 'Users can have multiple roles',
    primaryRole: 'Primary Role (choose one)',
    addonRoles: 'Addon Roles (can be combined)',
    editRoles: 'Edit Roles',
    close: 'Close',
    
    // Messages
    success: 'Success',
    error: 'Error occurred',
    loading: 'Loading...',
    noResults: 'No results found',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    
    // Time
    now: 'Now',
    minutesAgo: 'minutes ago',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
  }
};

// Create Context
const LanguageContext = createContext();

// Provider Component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get saved language or default to Arabic
    return localStorage.getItem('app_language') || 'ar';
  });

  useEffect(() => {
    // Save language preference
    localStorage.setItem('app_language', language);
    
    // Update document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      toggleLanguage, 
      t, 
      isRTL,
      translations: translations[language]
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use language
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Language Toggle Button Component
export const LanguageToggle = ({ className = '' }) => {
  const { language, toggleLanguage } = useLanguage();
  
  return (
    <button
      onClick={toggleLanguage}
      className={`px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors ${className}`}
    >
      {language === 'ar' ? 'EN' : 'عربي'}
    </button>
  );
};

export default LanguageContext;
