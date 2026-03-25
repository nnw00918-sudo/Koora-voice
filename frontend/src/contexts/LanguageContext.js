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
    
    // Toast Messages
    roomClosed: 'تم إغلاق الغرفة',
    roomDeleted: 'تم حذف الغرفة',
    failedToLoad: 'فشل التحميل',
    requestFailed: 'فشل إرسال الطلب',
    joinFailed: 'فشل الصعود للمنصة',
    approveFailed: 'فشلت الموافقة',
    requestRejected: 'تم رفض الطلب',
    rejectFailed: 'فشل الرفض',
    confirmKick: 'هل أنت متأكد من طرد هذا العضو؟',
    memberKicked: 'تم طرد العضو',
    kickFailed: 'فشل الطرد',
    roleChangeFailed: 'فشل تغيير الرتبة',
    newsRoleFailed: 'فشل تغيير رتبة الإخباري',
    memberMuted: 'تم كتم العضو',
    muteFailed: 'فشل الكتم',
    memberUnmuted: 'تم إلغاء كتم العضو',
    unmuteFailed: 'فشل إلغاء الكتم',
    inviteFailed: 'فشل إرسال الدعوة',
    demoteFailed: 'فشل إنزال العضو',
    statusChangeFailed: 'فشل تغيير حالة الغرفة',
    confirmDeleteRoom: 'هل أنت متأكد من حذف الغرفة؟ لا يمكن التراجع عن هذا الإجراء.',
    deleteRoomFailed: 'فشل حذف الغرفة',
    confirmCloseRoom: 'هل أنت متأكد من إغلاق الغرفة وطرد جميع المشاركين؟',
    closeRoomFailed: 'فشل إغلاق الغرفة',
    imageUpdated: 'تم تحديث صورة الغرفة',
    imageUpdateFailed: 'فشل تحديث الصورة',
    titleUpdated: 'تم تحديث اسم الغرفة',
    titleUpdateFailed: 'فشل تحديث اسم الغرفة',
    
    // Dashboard Extra
    liveRooms: 'غرف مباشرة',
    trending: 'الأكثر نشاطاً',
    newRooms: 'غرف جديدة',
    main: 'الرئيسية',
    enterPin: 'أدخل رمز الدخول',
    privateRoom: 'غرفة خاصة',
    pin: 'الرمز',
    join: 'انضمام',
    addToFavorites: 'إضافة للمفضلة',
    removeFromFavorites: 'إزالة من المفضلة',
    noRoomsFound: 'لا توجد غرف',
    createFirstRoom: 'أنشئ غرفتك الأولى',
    welcome: 'مرحباً',
    discoverRooms: 'اكتشف الغرف',
    
    // Time
    now: 'الآن',
    minutesAgo: 'دقائق',
    hoursAgo: 'ساعات',
    daysAgo: 'أيام',
    
    // Room Page Extended
    speaker: 'متحدث',
    promoteToAdmin: 'ترقية لأدمن',
    promoteToMod: 'ترقية لمود',
    removeRole: 'إزالة الرتبة',
    addNewsReporter: '+ إخباري',
    removeNewsReporter: 'إخباري ✓',
    demoteFromMic: 'إنزال',
    promoteToMic: 'رفع',
    kickUser: 'طرد',
    sound: 'صوت',
    noMembers: 'لا يوجد أعضاء في الغرفة',
    noMessages: 'لا توجد رسائل - ابدأ المحادثة!',
    micRequests: 'طلبات المايك',
    accept: 'قبول',
    reject: 'رفض',
    noMicRequests: 'لا توجد طلبات',
    connectedUsers: 'المتصلون',
    back: 'رجوع',
    live: 'مباشر',
    stream: 'بث',
    watchParty: 'مشاهدة جماعية',
    inviteFriends: 'دعوة أصدقاء',
    reactions: 'تفاعلات',
    polls: 'استطلاعات',
    deleteRoom: 'حذف الغرفة',
    roomDeleted: 'تم حذف الغرفة',
    confirmDelete: 'هل أنت متأكد من حذف الغرفة؟',
    roomTitle: 'اسم الغرفة',
    changeBackground: 'تغيير الخلفية',
    roomImage: 'صورة الغرفة',
    openRoom: 'فتح الغرفة',
    closeRoom: 'إغلاق الغرفة',
    roomPin: 'رمز الغرفة',
    micSettings: 'إعدادات المايك',
    cameraSettings: 'إعدادات الكاميرا',
    shareScreen: 'مشاركة الشاشة',
    stopSharing: 'إيقاف المشاركة',
    sendGift: 'إرسال هدية',
    coins: 'عملات',
    inviteSent: 'تم إرسال الدعوة',
    youAreInvited: 'تمت دعوتك للمنصة',
    acceptInvite: 'قبول',
    declineInvite: 'رفض',
    requestSent: 'تم إرسال الطلب',
    waitingApproval: 'بانتظار الموافقة',
    leaveStage: 'مغادرة المنصة',
    joinStage: 'صعود للمنصة',
    streamSlots: 'روابط البث',
    addStreamUrl: 'إضافة رابط بث',
    streamUrlPlaceholder: 'أدخل رابط البث...',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    activate: 'تفعيل',
    deactivate: 'إيقاف',
    slot: 'مكان',
    noActiveStream: 'لا يوجد بث نشط',
    roomBackground: 'خلفية الغرفة',
    selectImage: 'اختر صورة',
    uploadImage: 'رفع صورة',
    removeBackground: 'إزالة الخلفية',
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
    
    // Toast Messages
    roomClosed: 'Room is closed',
    roomDeleted: 'Room deleted',
    failedToLoad: 'Failed to load',
    requestFailed: 'Request failed',
    joinFailed: 'Failed to join stage',
    approveFailed: 'Approval failed',
    requestRejected: 'Request rejected',
    rejectFailed: 'Rejection failed',
    confirmKick: 'Are you sure you want to kick this member?',
    memberKicked: 'Member kicked',
    kickFailed: 'Kick failed',
    roleChangeFailed: 'Role change failed',
    newsRoleFailed: 'News reporter role change failed',
    memberMuted: 'Member muted',
    muteFailed: 'Mute failed',
    memberUnmuted: 'Member unmuted',
    unmuteFailed: 'Unmute failed',
    inviteFailed: 'Invite failed',
    demoteFailed: 'Demote failed',
    statusChangeFailed: 'Status change failed',
    confirmDeleteRoom: 'Are you sure you want to delete this room? This action cannot be undone.',
    deleteRoomFailed: 'Delete room failed',
    confirmCloseRoom: 'Are you sure you want to close the room and kick all participants?',
    closeRoomFailed: 'Close room failed',
    imageUpdated: 'Room image updated',
    imageUpdateFailed: 'Image update failed',
    titleUpdated: 'Room title updated',
    titleUpdateFailed: 'Title update failed',
    
    // Dashboard Extra
    liveRooms: 'Live Rooms',
    trending: 'Trending',
    newRooms: 'New Rooms',
    main: 'Main',
    enterPin: 'Enter room PIN',
    privateRoom: 'Private Room',
    pin: 'PIN',
    join: 'Join',
    addToFavorites: 'Add to Favorites',
    removeFromFavorites: 'Remove from Favorites',
    noRoomsFound: 'No rooms found',
    createFirstRoom: 'Create your first room',
    welcome: 'Welcome',
    discoverRooms: 'Discover Rooms',
    
    // Time
    now: 'Now',
    minutesAgo: 'minutes ago',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    
    // Room Page Extended
    speaker: 'Speaker',
    promoteToAdmin: 'Promote to Admin',
    promoteToMod: 'Promote to Mod',
    removeRole: 'Remove Role',
    addNewsReporter: '+ News Reporter',
    removeNewsReporter: 'News Reporter ✓',
    demoteFromMic: 'Demote',
    promoteToMic: 'Promote',
    kickUser: 'Kick',
    sound: 'Sound',
    noMembers: 'No members in the room',
    noMessages: 'No messages yet - start the conversation!',
    micRequests: 'Mic Requests',
    accept: 'Accept',
    reject: 'Reject',
    noMicRequests: 'No requests',
    connectedUsers: 'Connected Users',
    back: 'Back',
    live: 'Live',
    stream: 'Stream',
    watchParty: 'Watch Party',
    inviteFriends: 'Invite Friends',
    reactions: 'Reactions',
    polls: 'Polls',
    deleteRoom: 'Delete Room',
    roomDeleted: 'Room deleted',
    confirmDelete: 'Are you sure you want to delete this room?',
    roomTitle: 'Room Title',
    changeBackground: 'Change Background',
    roomImage: 'Room Image',
    openRoom: 'Open Room',
    closeRoom: 'Close Room',
    roomPin: 'Room PIN',
    micSettings: 'Mic Settings',
    cameraSettings: 'Camera Settings',
    shareScreen: 'Share Screen',
    stopSharing: 'Stop Sharing',
    sendGift: 'Send Gift',
    coins: 'Coins',
    inviteSent: 'Invite sent',
    youAreInvited: 'You are invited to the stage',
    acceptInvite: 'Accept',
    declineInvite: 'Decline',
    requestSent: 'Request sent',
    waitingApproval: 'Waiting for approval',
    leaveStage: 'Leave Stage',
    joinStage: 'Join Stage',
    streamSlots: 'Stream Slots',
    addStreamUrl: 'Add stream URL',
    streamUrlPlaceholder: 'Enter stream URL...',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    activate: 'Activate',
    deactivate: 'Deactivate',
    slot: 'Slot',
    noActiveStream: 'No active stream',
    roomBackground: 'Room Background',
    selectImage: 'Select Image',
    uploadImage: 'Upload Image',
    removeBackground: 'Remove Background',
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
