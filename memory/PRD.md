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
│   │   └── ... (قيد التطوير)
│   └── models/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.js ✅ (معاد تصميمه)
│   │   │   ├── ThreadDetailPage.js ✅ (صفحة المنشور الفردي)
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
