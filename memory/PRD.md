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

### 5. إشعارات Push (PWA)
- ✅ Service Worker
- ✅ UI للتفعيل

---

## الهندسة المعمارية (محدّث - 22 مارس 2026)

```
/app/
├── backend/
│   ├── server.py (~4277 سطر - تقلص من 5268)
│   ├── routes/
│   │   ├── football.py ✅ (جديد - ~600 سطر)
│   │   └── ... (قيد التطوير)
│   └── models/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.js ✅ (معاد تصميمه)
│   │   │   └── RoomPage.js (~3333 سطر)
│   │   └── components/
│   │       └── room/
│   │           ├── Reactions.jsx
│   │           └── WatchParty.jsx
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

---

## المهام القادمة

### P0 (أولوية قصوى)
- [ ] إكمال تقسيم server.py:
  - [ ] فصل Stories routes إلى `/routes/stories.py`
  - [ ] فصل Conversations routes إلى `/routes/conversations.py`
  - [ ] فصل Notifications routes إلى `/routes/notifications.py`
  - [ ] فصل Rooms routes إلى `/routes/rooms.py`
- [ ] تقسيم RoomPage.js إلى components أصغر

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
