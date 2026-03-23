# صوت الكورة (Koora Voice) - PRD

## نظرة عامة
تطبيق شبكة اجتماعية بموضوع كرة القدم يوفر غرف صوتية/فيديو، بث مباشر، ونتائج مباريات حية.

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

### 3. نتائج المباريات الحية
- ✅ API-Football integration
- ✅ صفحة تفاصيل المباراة
- ✅ News ticker

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
- API-Football
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
