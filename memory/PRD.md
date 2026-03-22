# صوت الكورة (Koora Voice) - PRD

## نظرة عامة
تطبيق شبكة اجتماعية بموضوع كرة القدم يوفر غرف صوتية/فيديو، بث مباشر، ونتائج مباريات حية.

## الميزات الأساسية

### 1. غرف الصوت والفيديو (Agora WebRTC)
- ✅ غرف صوتية متعددة المستخدمين
- ✅ غرف فيديو مع كاميرا (داخل avatars دائرية)
- ✅ تسجيل الغرف (.webm)
- ✅ نظام الهدايا والعملات

### 2. ميزات Playback
- ✅ **Reactions (التفاعلات العائمة)**: إيموجي يطفو على الشاشة
- ✅ **Polls (الاستطلاعات)**: استطلاعات رأي في الغرف
- ✅ **Watch Party (5 قنوات)**: نظام مشاهدة متزامن بأسلوب الريسيفر

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

## المهام المكتملة (22 مارس 2026)

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
