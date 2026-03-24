# صوت الكورة (Koora Voice) - PRD

## نظرة عامة
تطبيق شبكة اجتماعية بموضوع كرة القدم يوفر غرف صوتية/فيديو، بث مباشر، والملف الشخصي.

## الميزات الأساسية

### 1. غرف الصوت والفيديو (Agora WebRTC)
- ✅ غرف صوتية متعددة المستخدمين
- ✅ غرف فيديو مع كاميرا (داخل avatars دائرية)
- ✅ تسجيل الغرف (.webm)
- ✅ نظام الهدايا والعملات
- ✅ **نظام الأدوار في الغرفة (Room Roles)** - جديد 23 مارس 2026:
  - Owner: مالك الغرفة - صلاحيات كاملة
  - Admin: أدمن - يمكنه الصعود للمنصة مباشرة + ترقية للمود
  - Mod: مود - يمكنه الصعود للمنصة مباشرة
  - Member: عضو عادي - يحتاج طلب للصعود
- ✅ **صلاحيات الأدمن المحدّثة** - 29 ديسمبر 2025:
  - الأدمن لا يمكنه طرد أدمن آخر
  - الأدمن يمكنه ترقية للمود فقط (ليس لـ admin)
  - الأدمن لا يمكنه تغيير رتبة أدمن آخر

### 2. ميزات Playback
- ✅ **Reactions (التفاعلات العائمة)**: إيموجي يطفو على الشاشة
- ✅ **Polls (الاستطلاعات)**: استطلاعات رأي في الغرف
- ✅ **Watch Party (5 قنوات)**: نظام مشاهدة متزامن بأسلوب الريسيفر
- ✅ **دعوة الأصدقاء**: مشاركة رابط الغرفة عبر واتساب/تيليجرام/تويتر

### 3. ~~نتائج المباريات الحية~~ (تم إزالتها - 23 مارس 2026)
- ❌ تم إزالة صفحة المباريات نهائياً
- ❌ تم إزالة MatchesPage.js, MatchDetailPage.js, LeagueDetailPage.js
- ✅ تم استبدال تبويب المباريات في الـ Navigation بـ **الملف الشخصي**

### 4. المراسلة والقصص
- ✅ رسائل خاصة
- ✅ قصص مع ردود وتفاعلات
- ✅ Feed اجتماعي (Threads)

### 5. إشعارات Push (PWA) - **محدّث 24 مارس 2026**
- ✅ Service Worker (`/public/sw-push.js`)
- ✅ VAPID Keys للـ Web Push
- ✅ Backend routes (`/routes/push.py`)
- ✅ Frontend Hook (`/hooks/usePushNotifications.js`)
- ✅ تكامل مع صفحة الإعدادات
- ✅ **Push Notifications مُفعّلة للأحداث التالية**:
  - 💬 الردود على المنشورات
  - 📢 @Mentions (الإشارات)
  - ❤️ الإعجابات
  - 👤 المتابعين الجدد
  - ✉️ الرسائل الخاصة

---

## الهندسة المعمارية (محدّث - 29 ديسمبر 2025)

```
/app/
├── backend/
│   ├── server.py (~3929 سطر - تقلص من 4596)
│   ├── routes/
│   │   ├── football.py ✅ (767 سطر)
│   │   ├── notifications.py ✅ (79 سطر)
│   │   ├── stories.py ✅ (379 سطر)
│   │   ├── conversations.py ✅ (220 سطر)
│   │   ├── push.py ✅ (217 سطر)
│   │   └── ... (قيد التطوير)
│   └── models/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.js ✅ (معاد تصميمه)
│   │   │   ├── ThreadDetailPage.js ✅ (صفحة المنشور الفردي)
│   │   │   └── RoomPage.js (~3556 سطر - تقلص من 3620)
│   │   └── components/
│   │       └── room/
│   │           ├── Reactions.jsx
│   │           ├── WatchParty.jsx
│   │           ├── ConnectedUsersList.jsx ✅ (جديد)
│   │           ├── RoomSettingsModal.jsx ✅ (جديد)
│   │           ├── GiftModal.jsx ✅ (جديد)
│   │           ├── SeatRequestsModal.jsx ✅ (جديد)
│   │           ├── InviteReceivedModal.jsx ✅ (جديد)
│   │           ├── StreamModal.jsx ✅ (جديد)
│   │           ├── PromoteModal.jsx ✅ (جديد)
│   │           ├── BackgroundPickerModal.jsx ✅ (جديد)
│   │           ├── ExpandedVideoModal.jsx ✅ (جديد)
│   │           └── index.js (تصدير المكونات)
```

---

## المهام المكتملة (23 مارس 2026)

### التصميم
- [x] إعادة تصميم LandingPage.js بتصميم قوي واحترافي
- [x] خلفية ملعب حية مع تأثيرات متحركة
- [x] شعار متحرك مع تأثير الدوران
- [x] بطاقة مباريات حية تتبدل تلقائياً
- [x] Features grid مع أيقونات ملونة
- [x] إحصائيات (50K+ مستخدم، 200+ غرفة، LIVE)
- [x] زر CTA أخضر متوهج

### تحديث التصميم الشامل - 24 ديسمبر 2025
- [x] **تطبيق design_guidelines.json** على كل الواجهات
- [x] **ThreadsPage.js**:
  - Header مع glassmorphism (bg-black/80 backdrop-blur-xl)
  - تبويبات مع مؤشر ليموني متوهج (#CCFF00)
  - أزرار التفاعل (إعجاب أحمر، إعادة نشر أخضر، رد أزرق)
  - Composer modal بتصميم جديد
- [x] **MessagesPage.js**:
  - خلفية متحركة مع orbs (lime/emerald)
  - Header مع glassmorphism
  - فقاعات دردشة: المرسل (gradient أخضر)، المستلم (خلفية داكنة)
  - مؤشر "متصل" أخضر متحرك
- [x] **ProfilePage.js**: 
  - إطار صورة متوهج (6 ألوان)
  - بطاقات إحصائيات مع backdrop-blur
- [x] **BottomNavigation.js**:
  - Glassmorphism مع gradient
  - شريط توهج علوي أخضر
  - أيقونات نشطة مع glow effect
- [x] **index.css**: 
  - استيراد خطوط Cairo و Almarai من Google Fonts
  - متغيرات CSS للألوان الجديدة
- [x] اختبار شامل - 100% نجاح (iteration_20.json)

### وضع النهار (Light Mode) - 24 ديسمبر 2025
- [x] **SettingsContext.js**: 
  - إضافة `themeColors` object لـ dark و light modes
  - إضافة `toggleTheme()` function
  - إضافة `currentTheme` و `isDarkMode` exports
  - CSS variables تتغير ديناميكياً حسب الوضع
- [x] **index.css**:
  - متغيرات CSS لـ Light Mode (.light class)
  - ألوان: bg=#F5F5F5, primary=#84CC16, text=#171717
- [x] **BottomNavigation.js**: دعم ديناميكي للوضعين
- [x] **MessagesPage.js**: دعم ديناميكي للوضعين  
- [x] **ThreadsPage.js**: دعم جزئي (themeClasses object)
- [x] **SettingsPage.js**: Toggle switch يعمل مع `toggleTheme()`
- [x] **App.js**: `ThemedToaster` component للإشعارات الديناميكية

### تفعيل جميع الإعدادات - 24 ديسمبر 2025
- [x] **SettingsContext.js محدث بالكامل**:
  - إعدادات الخصوصية: حساب خاص، إظهار الحالة، آخر ظهور، من يراسلني، الإشارات، إخفاء من البحث
  - إعدادات الإشعارات: Push، البريد، الرسائل، الإعجابات، التعليقات، المتابعات، الإشارات، الغرف
  - إعدادات العرض: الوضع الداكن، حجم الخط، الأصوات، الاهتزاز، تشغيل الفيديو تلقائياً، توفير البيانات
  - مزامنة تلقائية مع Backend API
  - تحميل الإعدادات من الخادم عند بدء التشغيل
- [x] **SettingsPage.js محدث**:
  - جميع الـ toggles تستخدم `updateSetting()` من Context
  - لا توجد حالات محلية منفصلة (state removed)
  - المزامنة مع الخادم تلقائية

### التقسيم والـ Refactoring
- [x] فصل Football routes إلى `/routes/football.py`
- [x] تقليص server.py من 5268 إلى 4277 سطر (~1000 سطر)

### الميزات الجديدة
- [x] ميزة **دعوة الأصدقاء** (`InviteFriends.jsx`)
  - زر مشاركة في header الغرفة
  - Modal مع رابط قابل للنسخ
  - مشاركة عبر واتساب، تيليجرام، تويتر
  - دعم Native Share API للموبايل

- [x] **نظام الأدوار في الغرفة** (Room Roles System) - 23 مارس 2026:
  - API endpoints: GET/PUT/DELETE /api/rooms/{room_id}/user-role/{user_id}
  - GET /api/rooms/{room_id}/roles - قائمة كل الأدوار
  - MongoDB collection: room_roles
  - Frontend: badges ملونة (ذهبي للمالك، بنفسجي للأدمن، أزرق للمود)
  - أزرار الترقية/التنزيل في قائمة المشاركين
  - الأدمن والمود يمكنهم الصعود للمنصة مباشرة بدون طلب

### Bug Fixes - 23 مارس 2026
- [x] إصلاح `isAdmin is not defined` error في RoomPage.js (تغيير إلى isRoomAdmin)

### إزالة المباريات - 23 مارس 2026
- [x] إزالة MatchesPage.js, MatchDetailPage.js, LeagueDetailPage.js
- [x] تحديث App.js لإزالة routes المباريات
- [x] تحديث BottomNavigation.js (استبدال المباريات بالملف الشخصي)
- [x] تحديث LandingPage.js (استبدال بطاقة المباريات ببطاقة المجتمع)
- [x] تحديث LanguageContext.js (إزالة ترجمات المباريات)

### ربط صفحة الملف الشخصي - 24 مارس 2026
- [x] إضافة route `/profile` في App.js (سطر 90)
- [x] إضافة tab "حسابي" مع أيقونة User في BottomNavigation.js
- [x] ProfilePage يعرض: الاسم، اسم المستخدم، الصورة، الإحصائيات
- [x] أزرار: تعديل الملف الشخصي، تسجيل الخروج
- [x] اختبار شامل - 100% نجاح

### تصميم جديد للملف الشخصي - 24 مارس 2026
- [x] **AnimatedBackground**: خلفية متحركة gradient مع 3 عناصر blur
- [x] **GlowingAvatar**: إطار متوهج للصورة بـ 5 ألوان حسب المستوى
  - المستوى 1: أخضر lime
  - المستوى 2: سماوي cyan
  - المستوى 3: بنفسجي purple
  - المستوى 4: ذهبي amber
  - المستوى 5: وردي rose
- [x] **شارة المستوى**: تظهر على الصورة (محسوبة من العملات)
- [x] **4 بطاقات إحصائيات**: متابع، متابَع، عملات، غرف
- [x] **قسم الشارات والإنجازات**: 6 شارات (متحدث، مالك غرفة، محبوب، نجم، موثق، أسطورة)
- [x] **Framer Motion animations**: تأثيرات حركية على كل العناصر
- [x] اختبار شامل - 100% نجاح (14 اختبار)

### ميزة تخصيص لون الإطار - 24 مارس 2026
- [x] **FrameColorSelector**: 6 ألوان للاختيار (lime, cyan, purple, amber, rose, rainbow)
- [x] **Backend support**: حقل frame_color في User model
- [x] **API endpoint**: PUT /api/auth/profile يدعم frame_color
- [x] **Validation**: Backend يتحقق من صحة اللون قبل الحفظ
- [x] **Arabic labels**: أخضر، سماوي، بنفسجي، ذهبي، وردي، قوس قزح
- [x] اختبار شامل - 100% نجاح (Backend 4/4, Frontend 10/10)

### تفعيل كل الميزات - 24 مارس 2026
- [x] **rooms_joined**: عدد الغرف المشارك فيها من room_participants
- [x] **rooms_created**: عدد الغرف المنشأة من rooms collection
- [x] **badges_earned**: array من الشارات المكتسبة محسوبة من الـ backend
- [x] **شروط الشارات**:
  - متحدث: دائماً مكتسبة
  - مالك غرفة: أنشأ غرفة واحدة على الأقل
  - محبوب: 10+ متابع
  - نجم: 100+ عملة
  - موثق: 50+ متابع و 5+ غرف
  - أسطورة: 100+ متابع و 1000+ عملة و 20+ غرف
- [x] اختبار شامل - 100% نجاح

### صفحة المتابعين والبحث - 24 مارس 2026
- [x] **FollowListPage**: صفحة المتابعين/المتابَعين
  - عرض قائمة المتابعين مع أزرار متابعة/إلغاء
  - عرض قائمة المتابَعين
  - Tabs للتبديل بين المتابعين والمتابَعين
  - الانتقال لملف المستخدم عند الضغط عليه
- [x] **SearchUsersPage**: البحث عن المستخدمين
  - البحث بالاسم أو @username
  - Debounced search (300ms)
  - عرض النتائج مع زر متابعة
- [x] **ProfilePage updates**:
  - زر البحث في Header
  - StatCard قابلة للنقر (المتابع/المتابَع)
- [x] **Routes جديدة**:
  - /follows/:userId?tab=followers|following
  - /search-users
- [x] اختبار شامل - 100% نجاح

### تصميم جديد للرسائل الخاصة - 24 مارس 2026
- [x] **ChatBackground**: خلفية متحركة مع تأثيرات blur (lime-500/emerald-500)
- [x] **MessageBubble**: فقاعات رسائل جديدة
  - رسائلي: تدرج lime-500 إلى emerald-600 مع glow effect
  - رسائل الآخرين: slate-800/80 مع border
- [x] **ConversationCard**: بطاقات محادثات محسّنة
  - صورة المستخدم بإطار gradient
  - تأثيرات hover مع lime-500/5
  - badge عدد الرسائل غير المقروءة
- [x] **تأثيرات Framer Motion**: animations على كل العناصر
- [x] **مؤشر "متصل الآن"**: نقطة خضراء على صورة المستخدم
- [x] اختبار شامل - 100% نجاح

### تصميم شاشة الدردشة الداخلية - 24 مارس 2026
- [x] **EnhancedChatBackground**: pattern خفيف + 3 orbs متحركة (lime, emerald, cyan)
- [x] **EnhancedMessageBubble**: 
  - رسائلي: تدرج أخضر مع shine effect متحرك
  - رسائل الآخرين: رمادي مع Avatar
- [x] **Header محسّن**:
  - صورة المستخدم مع glow effect
  - مؤشر "متصل الآن" متحرك
  - أزرار Phone, Video, Options
- [x] **DateSeparator**: فاصل التاريخ بين الرسائل
- [x] **TypingIndicator**: 3 نقاط متحركة
- [x] **QuickReactions**: 6 إيموجي سريعة
- [x] **Input محسّن**:
  - زر Emoji (يفتح Quick Reactions)
  - زر Image
  - زر Mic (تسجيل صوتي)
  - زر Send مع gradient
- [x] اختبار شامل - 100% نجاح

---

## المهام القادمة

### تم إنجازه - 29 ديسمبر 2025

#### صلاحيات الأدمن في الغرف (Admin RBAC)
- [x] **الأدمن لا يمكنه طرد أدمن آخر** - فقط المالك يستطيع
- [x] **الأدمن يمكنه طرد الأعضاء العاديين** فقط
- [x] **الأدمن لا يمكنه ترقية لـ admin** - فقط المالك
- [x] **الأدمن يمكنه ترقية أعضاء لـ mod**
- [x] **الأدمن لا يمكنه تغيير رتبة أدمن آخر**
- [x] اختبار شامل: `/app/backend/tests/test_admin_permissions.py` - 6/6 نجاح

#### تحليل Refactoring
- [x] تحليل server.py للتقسيم المستقبلي
- [x] البنية موجودة في `/app/backend/routes/` و `/app/backend/models/`
- [x] `football_router` يعمل بشكل مستقل
- [x] **نقل Notifications** إلى `/routes/notifications.py` (~79 سطر)
- [x] **نقل Stories** إلى `/routes/stories.py` (~379 سطر)
- [x] **نقل Conversations** إلى `/routes/conversations.py` (~220 سطر)
- [x] **server.py تقلص من 4596 إلى 3927 سطر** (-669 سطر / -14%)

---

### P0 (أولوية قصوى)
- [x] ~~اختبار صلاحيات الأدمن~~ - تم 29 ديسمبر 2025
- [x] ~~Refactoring: Notifications~~ - تم 29 ديسمبر 2025
- [x] ~~Refactoring: Stories~~ - تم 29 ديسمبر 2025
- [x] ~~Refactoring: Conversations~~ - تم 29 ديسمبر 2025
- [x] ~~إصلاح تبويب الردود في الملف الشخصي~~ - تم 24 مارس 2026:
  - تحديث Backend `/users/{user_id}/replies` لإرجاع `thread_author` و `thread_content`
  - الواجهة الأمامية تعرض الآن اسم صاحب المنشور الأصلي باللون الأخضر

### P1 (أولوية عالية) - Refactoring المتبقي
- [ ] نقل Users routes (معقد - يعتمد على create_notification)
- [ ] نقل Admin routes (معقد - يعتمد على get_admin_user)
- [x] **تقسيم RoomPage.js Modals** - تم 24 مارس 2026:
  - تم استخراج المكونات التالية إلى `/app/frontend/src/components/room/`:
    - `ConnectedUsersList.jsx` (297 سطر)
    - `RoomSettingsModal.jsx` (279 سطر)
    - `GiftModal.jsx` (58 سطر) - ✅ مُستخدم
    - `SeatRequestsModal.jsx` (79 سطر)
    - `InviteReceivedModal.jsx` (51 سطر) - ✅ مُستخدم
    - `StreamModal.jsx` (136 سطر)
    - `PromoteModal.jsx` (59 سطر)
    - `BackgroundPickerModal.jsx` (83 سطر) - ✅ مُستخدم
    - `ExpandedVideoModal.jsx` (104 سطر)
  - المكونات مستخرجة ومصدّرة من `index.js`
  - تم تحديث imports في `RoomPage.js`
  - **RoomPage.js تقلص من 3620 إلى 3476 سطر** (-144 سطر)
  - 3 modals تم استبدالها: GiftModal, InviteReceivedModal, BackgroundPickerModal
- [ ] إكمال استخدام باقي المكونات المستخرجة في RoomPage.js (6 متبقية)
- [ ] إكمال تقسيم server.py:
  - [ ] فصل Rooms routes إلى `/routes/rooms.py`

### P1 (أولوية عالية)
- [ ] التحقق من WebRTC video broadcasting والـ Camera Modals
- [ ] اختبار شامل للـ Watch Party 5-channel system

### P2 (أولوية متوسطة)
- [ ] نظام الشارات والمستويات (Gamification)
- [ ] ربط Push Notifications backend بـ WebPush
- [ ] تحسينات UI/UX إضافية

---

## الاعتمادات
- Agora SDK (Voice/Video)
- MongoDB
- FastAPI + React
- Framer Motion (animations)

## بيانات الاختبار
- Email: naifliver@gmail.com
- Password: As11223344
- Room ID: 3977f7ae

---

## ملاحظات مهمة للمطورين

### UI Sensitivity
- لا تغير تخطيط RoomPage UI إلا بطلب صريح
- الـ Mic circles: `w-16 h-16` مع 2 slots فقط
- الـ Chat والـ Stage مدمجان في بطاقة واحدة

### Video Embedding
- استخدم native iframe مع regex للـ YouTube URLs
- لا تستخدم react-player (فشل مع YouTube Live)

### Camera Logic
- Agora tracks تُعرض داخل دوائر صغيرة (RemoteVideoCircle)
- تفتح في modal عند النقر
- كن حذراً مع Agora track lifecycle methods

### Routes
- جميع الـ API routes يجب أن تبدأ بـ `/api`
- الـ Football routes الآن في ملف منفصل
