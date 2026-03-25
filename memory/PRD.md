# صوت الكورة (Koora Voice) - PRD

## نظرة عامة
تطبيق شبكة اجتماعية بموضوع كرة القدم يوفر غرف صوتية/فيديو، بث مباشر، والملف الشخصي.

## الميزات الأساسية

### 1. غرف الصوت والفيديو (Agora WebRTC)
- ✅ غرف صوتية متعددة المستخدمين
- ✅ غرف فيديو مع كاميرا (داخل avatars دائرية)
- ✅ تسجيل الغرف (.webm)
- ✅ نظام الهدايا والعملات
- ✅ **نظام الأدوار في الغرفة (Room Roles)** - محدّث 25 مارس 2026:
  - Owner: مالك الغرفة - صلاحيات كاملة
  - Leader (رئيس الغرفة): يمكنه الصعود مباشرة + إدارة الأدوار + طرد/كتم
  - Admin: أدمن - يمكنه الصعود للمنصة مباشرة + ترقية للمود
  - Mod: مود - يمكنه الصعود للمنصة مباشرة
  - Member: عضو عادي - يحتاج طلب للصعود
- ✅ **صلاحية الصعود المباشر** - 25 مارس 2026:
  - Owner, Leader, Admin, Mod يمكنهم الصعود مباشرة للمنصة
  - Member يحتاج إرسال طلب والانتظار للموافقة
- ✅ **التحكم بمستوى صوت المتحدثين** - 25 مارس 2026:
  - زر الصوت يفتح slider للتحكم بمستوى الصوت (0-100%)
  - يحفظ الإعداد في localStorage
- ✅ **صلاحيات الأدمن المحدّثة** - 29 ديسمبر 2025:
  - الأدمن لا يمكنه طرد أدمن آخر
  - الأدمن يمكنه ترقية للمود فقط (ليس لـ admin)
  - الأدمن لا يمكنه تغيير رتبة أدمن آخر

### 2. ميزات Playback
- ✅ **Reactions (التفاعلات العائمة)**: إيموجي يطفو على الشاشة
- ✅ **Polls (الاستطلاعات)**: استطلاعات رأي في الغرف
- ✅ **Watch Party (5 قنوات)**: نظام مشاهدة متزامن بأسلوب الريسيفر
- ✅ **دعوة الأصدقاء**: مشاركة رابط الغرفة عبر واتساب/تيليجرام/تويتر

### 3. نظام الأخبار المحلية (جديد - 25 مارس 2026)
- ✅ **رتبة الإخباري (news_editor)**: رتبة جديدة في النظام (للأخبار العامة)
- ✅ **CRUD للأخبار**: إضافة/تعديل/حذف الأخبار
- ✅ **شريط الأخبار**: يظهر الأخبار المحلية + أخبار المباريات الحية
- ✅ **تصنيفات الأخبار**: عام، انتقالات، نتائج، تصريحات، عاجل
- ✅ **صفحة إدارة الأخبار**: `/news-management`

### 3.1 أخبار الدوانية (Room News) - **جديد 25 مارس 2026**
- ✅ **شريط أخبار الدوانية**: يظهر في جميع الغرف التي يحتوي اسمها على "دوانية"
- ✅ **دور إخباري الدوانية (news_reporter)**: دور خاص بالغرفة يسمح بإضافة أخبار للغرفة
- ✅ **إضافة أخبار الغرفة**: زر "+" في شريط الأخبار يفتح modal لإضافة خبر
- ✅ **تصنيفات أخبار الغرفة**: عام، نتائج، انتقالات، تصريحات، عاجل
- ✅ **حذف الأخبار**: صاحب الغرفة أو كاتب الخبر يمكنه الحذف
- ✅ **إشعارات Push للأخبار**: عند إضافة خبر جديد، يتم إرسال إشعار لجميع المتواجدين في الغرفة
- ✅ **Backend APIs**:
  - `GET /api/rooms/{room_id}/news` - جلب أخبار الغرفة
  - `POST /api/rooms/{room_id}/news` - إضافة خبر (Owner أو news_reporter) + إرسال إشعارات
  - `DELETE /api/rooms/{room_id}/news/{news_id}` - حذف خبر
  - `POST /api/rooms/{room_id}/news-reporter/{user_id}` - تعيين إخباري
  - `DELETE /api/rooms/{room_id}/news-reporter/{user_id}` - إزالة إخباري

### 4. المراسلة والقصص
- ✅ رسائل خاصة (WebSocket + HTTP Fallback)
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

## نظام الأدوار (محدّث - 25 مارس 2026)

### التسلسل الهرمي للأدوار العامة
```
owner > admin > news_editor > mod > user
```

### أدوار الغرفة (Room Roles) - نظام رتب متعددة ✨
```
الرتب الرئيسية (واحدة فقط): leader > admin > mod > member
الرتب الإضافية (يمكن دمجها): news_reporter
```

**مثال:** يمكن للمستخدم أن يكون: `admin + news_reporter` أو `mod + news_reporter`

### صلاحيات كل رتبة
| الرتبة | الوصف | الصلاحيات |
|--------|--------|----------|
| owner | المالك | جميع الصلاحيات |
| admin | الأدمن | طرد/كتم المستخدمين، إدارة المنصة |
| news_editor | الإخباري (عام) | إدارة الأخبار العامة (إضافة/تعديل/حذف) |
| mod | المود | الموافقة على طلبات المنصة |
| user | المستخدم | صلاحيات عادية |

### أدوار الغرفة (Room-specific)
| الرتبة | الوصف | الصلاحيات |
|--------|--------|----------|
| leader | رئيس الغرفة | صعود مباشر + إدارة الأدوار + طرد/كتم |
| admin | أدمن الغرفة | صعود مباشر + ترقية للمود |
| mod | مود الغرفة | صعود مباشر للمنصة |
| news_reporter | إخباري الدوانية | إضافة أخبار خاصة بالغرفة (يمكن دمجها مع أي رتبة) |
| member | عضو | صلاحيات عادية، يحتاج طلب للصعود |

### API Endpoints للرتب المتعددة
- `POST /api/rooms/{room_id}/roles/{user_id}/add` - إضافة رتبة
- `POST /api/rooms/{room_id}/roles/{user_id}/remove` - إزالة رتبة
- `GET /api/rooms/{room_id}/user-role/{user_id}` - الحصول على الرتب (يرجع `roles` array)

---

## الهندسة المعمارية (محدّث - 25 مارس 2026)

```
/app/
├── backend/
│   ├── server.py (~4242 سطر)
│   │   ├── ConnectionManager (WebSocket with room support)
│   │   ├── WebSocket endpoint /ws/{token}
│   │   └── Room message broadcasting
│   ├── routes/
│   │   ├── football.py ✅ (767 سطر)
│   │   ├── notifications.py ✅ (79 سطر)
│   │   ├── stories.py ✅ (379 سطر)
│   │   ├── conversations.py ✅ (220 سطر)
│   │   ├── push.py ✅ (217 سطر)
│   │   ├── news.py ✅ (263 سطر) - جديد 25 مارس 2026
│   │   └── ... (قيد التطوير)
│   └── models/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.js ✅ (معاد تصميمه)
│   │   │   ├── ThreadDetailPage.js ✅ (صفحة المنشور الفردي)
│   │   │   ├── NewsManagementPage.js ✅ (صفحة إدارة الأخبار) - جديد 25 مارس 2026
│   │   │   └── RoomPage.js (~3556 سطر) ✅ WebSocket chat
│   │   └── components/
│   │       └── room/
│   │           ├── Reactions.jsx
│   │           ├── WatchParty.jsx
│   │           ├── ConnectedUsersList.jsx ✅
│   │           ├── RoomSettingsModal.jsx ✅
│   │           ├── GiftModal.jsx ✅
│   │           ├── SeatRequestsModal.jsx ✅
│   │           ├── InviteReceivedModal.jsx ✅
│   │           ├── StreamModal.jsx ✅
│   │           ├── PromoteModal.jsx ✅
│   │           ├── BackgroundPickerModal.jsx ✅
│   │           ├── ExpandedVideoModal.jsx ✅
│   │           └── index.js
```

---

## المهام المكتملة (25 مارس 2026)

### صلاحية الصعود المباشر للمنصة - 25 مارس 2026
- [x] **تحديث Backend** (`/api/rooms/{room_id}/seat/join-direct`):
  - يتحقق من رتبة المستخدم داخل الغرفة (room role)
  - Owner, Leader, Admin, Mod يمكنهم الصعود مباشرة
  - تم إضافة التحقق من `room_roles` collection
- [x] **تحديث Frontend** (`RoomPage.js`):
  - إضافة `isRoomLeader` للتحقق من رتبة Leader
  - تحديث `canJoinStageDirect` ليشمل Leader
  - تحديث صلاحيات `canManageStage`, `canKickMute`, `canChangeRoles`
- [x] **إصلاح bug تغيير الرتب**:
  - الـ Frontend كان يستدعي `POST /api/rooms/{room_id}/roles/{user_id}`
  - الـ Backend كان يتوقع `PUT /api/rooms/{room_id}/user-role/{user_id}`
  - تم إضافة POST endpoint جديد لحل المشكلة
- [x] **اختبار**: تم التحقق من جميع الرتب عبر curl

### إضافة رتبة الإخباري ونظام الأخبار المحلية - 25 مارس 2026
- [x] **إضافة رتبة news_editor في النظام**:
  - تحديث `ROLE_HIERARCHY` في server.py
  - تحديث جميع endpoints للترقية (admin/promote)
  - إضافة خيار "إخباري" في AdminDashboard
- [x] **إنشاء Backend API للأخبار** (`/routes/news.py`):
  - `GET /api/news/` - الأخبار النشطة (عام)
  - `GET /api/news/ticker` - شريط الأخبار للداشبورد
  - `GET /api/news/admin` - جميع الأخبار للمدراء
  - `POST /api/news` - إضافة خبر
  - `PUT /api/news/{id}` - تعديل خبر
  - `DELETE /api/news/{id}` - حذف خبر
  - `POST /api/news/{id}/toggle` - تفعيل/تعطيل خبر
- [x] **إنشاء صفحة إدارة الأخبار** (`NewsManagementPage.js`):
  - واجهة كاملة لإدارة الأخبار
  - نموذج إضافة/تعديل الأخبار
  - تصنيفات: عام، انتقالات، نتائج، تصريحات، عاجل
  - خيارات: شريط الأخبار، خبر مميز
- [x] **دمج الأخبار المحلية مع شريط الأخبار**:
  - تحديث DashboardPage لجلب الأخبار المحلية + أخبار كرة القدم
  - الأخبار المحلية لها أولوية أعلى
- [x] **إضافة زر إدارة الأخبار في الـ Header**:
  - يظهر فقط للـ news_editor, admin, owner

### إصلاح صفحة الغرف - 25 مارس 2026
- [x] **إصلاح أخطاء JSX في RoomPage.js**:
  - إضافة imports ناقصة: `ArrowLeft`, `ArrowDown`, `UserX`
  - إصلاح `</motion.div>` إلى `</div>` في السطور 2509 و 2676
  - حذف كود مكرر (duplicate) من السطور 2607-2653
- [x] **اختبار صفحة الغرف**: 100% نجاح

### تحويل دردشة الغرف إلى WebSocket - 25 مارس 2026
- [x] **Backend ConnectionManager محدث**:
  - إضافة `room_connections: Dict[str, set]` لتتبع المستخدمين في الغرف
  - إضافة `join_room()`, `leave_room()`, `broadcast_to_room()` methods
  - إضافة معالج `room_message` في WebSocket endpoint
- [x] **Frontend RoomPage.js محدث**:
  - إضافة `roomWsRef` و `wsReconnectTimeoutRef` refs
  - إضافة `connectRoomWebSocket()`, `disconnectRoomWebSocket()`, `sendMessageViaWebSocket()`
  - تحديث `handleSendMessage()` لاستخدام WebSocket مع HTTP fallback
- [x] **اختبار WebSocket Chat**: 100% نجاح
  - Backend: 11/11 اختبارات ناجحة
  - Frontend: كل العناصر تعمل
  - ملاحظة: WebSocket لا يعمل في K8s ingress ولكن HTTP fallback يعمل بشكل ممتاز

---

## المهام القادمة

### P0 (مكتمل) - تحسين سرعة التطبيق ⚡ - 25 مارس 2026
- [x] **MongoDB Indexes**: إضافة indexes لـ users, rooms, messages, threads, notifications, announcements
- [x] **Lazy Loading**: تحميل الصفحات عند الحاجة فقط (Code Splitting)
- [x] **GZip Compression**: ضغط الـ responses من Backend
- [x] **Smart Caching**: Service Worker محسّن مع cache strategies مختلفة
- [x] **Image Caching**: تخزين مؤقت للصور (avatars, room images)
- [x] **Memoization**: استخدام `memo`, `useCallback`, `useMemo` للـ components
- [x] **Preconnect**: DNS prefetch لـ external resources
- [x] **Parallel Fetching**: جلب البيانات بالتوازي

### P0 (مكتمل) - ميزة الرد على الرسائل ✅ - 25 مارس 2026
- [x] **Backend**: تحديث WebSocket و HTTP endpoints لدعم reply_to fields
- [x] **Frontend**: 
  - زر رد يظهر عند hover على الرسالة
  - شريط Reply Preview أعلى حقل الإدخال
  - عرض الرسالة المُرد عليها في فقاعة الرد
- [x] **تخزين في MongoDB**: حفظ reply_to_id, reply_to_username, reply_to_content

### P0 (مكتمل) - نظام الإعلانات ✅ - 25 مارس 2026
- [x] **Backend API للإعلانات** (`/app/backend/routes/announcements.py`):
  - إنشاء إعلان مع اختيار غرف متعددة
  - جلب جميع الإعلانات (للمالك)
  - جلب الغرف للاختيار
  - جلب الإعلانات لغرفة محددة
  - تعديل/حذف/تفعيل/تعطيل الإعلانات
- [x] **صفحة إدارة الإعلانات** (`/app/frontend/src/pages/AnnouncementsPage.js`):
  - عرض قائمة الإعلانات
  - إنشاء إعلان جديد مع اختيار الغرف (checkboxes)
  - تحديد الكل / إلغاء الكل
  - بحث في الغرف
  - تفعيل/تعطيل/حذف الإعلانات
- [x] **عرض الإعلانات في الغرفة** (RoomPage.js):
  - الإعلانات تظهر كرسالة ثابتة أعلى الدردشة
  - تصميم مميز بلون ذهبي/برتقالي
- [x] **رابط في الإعدادات** للوصول السريع لصفحة الإعلانات (للمالك فقط)

### P0 (مكتمل) - الترجمة الكاملة ✅ - 25 مارس 2026
- [x] **إنشاء LanguageContext.js**:
  - سياق عام للغة مع دالة `t()` للترجمة
  - دعم كامل للعربية والإنجليزية
  - تبديل تلقائي لـ RTL/LTR
  - حفظ تفضيل اللغة في localStorage
- [x] **ترجمة صفحة البداية (LandingPage.js)** ✅
- [x] **ترجمة صفحة المصادقة (AuthPage.js)** ✅
- [x] **ترجمة صفحة الداشبورد (DashboardPage.js)** ✅
- [x] **ترجمة صفحة الغرفة (RoomPage.js)** ✅
  - رسائل Toast
  - أسماء الرتب
  - أزرار التحكم
  - رسائل التأكيد
- [x] **زر تبديل اللغة (LanguageToggle)** في جميع الصفحات

### P1 (أولوية عالية) - Refactoring المتبقي
- [ ] نقل Users routes (معقد - يعتمد على create_notification)
- [ ] نقل Admin routes (معقد - يعتمد على get_admin_user)
- [ ] إكمال استخدام باقي المكونات المستخرجة في RoomPage.js (6 متبقية)
- [ ] إكمال تقسيم server.py:
  - [ ] فصل Rooms routes إلى `/routes/rooms.py`

### P1 (أولوية عالية)
- [ ] التحقق من WebRTC video broadcasting والـ Camera Modals
- [ ] اختبار شامل للـ Watch Party 5-channel system

### P2 (أولوية متوسطة)
- [ ] اختبار ميزة "مشاركة المنشور" في ThreadDetailPage
- [ ] نظام الشارات والمستويات (Gamification)
- [ ] ربط Push Notifications backend بـ WebPush
- [ ] تحسينات UI/UX إضافية

---

## الاعتمادات
- Agora SDK (Voice/Video)
- MongoDB
- FastAPI + React
- Framer Motion (animations)
- WebSocket (real-time messaging)
- **LanguageContext** (Arabic/English i18n)

## بيانات الاختبار
- Email: naifliver@gmail.com
- Password: As11223344
- Room ID: 3977f7ae

---

## ملاحظات مهمة للمطورين

### UI Sensitivity
- لا تغير تخطيط RoomPage UI إلا بطلب صريح
- الـ Mic circles: `w-14 h-14` في شبكة 4x3 (12 مقعد)
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

### WebSocket
- WebSocket endpoint: `/ws/{token}`
- أنواع الرسائل المدعومة:
  - `message`: رسائل خاصة (conversations)
  - `typing`: مؤشر الكتابة
  - `join_room`: الانضمام لغرفة
  - `leave_room`: مغادرة غرفة
  - `room_message`: رسالة في غرفة
- في بيئة K8s: WebSocket قد لا يعمل، HTTP fallback متاح دائماً
