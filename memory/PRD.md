# صوت الكورة (Koora Voice) - PRD

## نظرة عامة
تطبيق شبكة اجتماعية بموضوع كرة القدم يوفر غرف صوتية/فيديو، بث مباشر، ونتائج مباريات حية.

## الميزات الأساسية

### 1. غرف الصوت والفيديو (Agora WebRTC)
- ✅ غرف صوتية متعددة المستخدمين
- ✅ غرف فيديو مع كاميرا
- ✅ تسجيل الغرف (.webm)
- ✅ نظام الهدايا والعملات

### 2. ميزات Playback (جديد - 22 مارس 2026)
- ✅ **Reactions (التفاعلات العائمة)**: إيموجي يطفو على الشاشة
  - API: POST/GET `/api/rooms/{room_id}/reactions`
  - Frontend: FloatingReactions, ReactionBar components
  - Polling كل 2 ثانية
  
- ✅ **Polls (الاستطلاعات)**: استطلاعات رأي في الغرف
  - API: POST/GET/DELETE `/api/rooms/{room_id}/polls`
  - API: POST `/api/rooms/{room_id}/polls/{poll_id}/vote`
  - Frontend: PollCard, CreatePollModal components
  - Polling كل 3 ثواني
  
- ✅ **Watch Party**: مشاهدة فيديو متزامنة
  - API: POST/GET/PUT/DELETE `/api/rooms/{room_id}/watch-party`
  - Frontend: WatchPartyPlayer, StartWatchPartyModal components
  - Polling كل 5 ثواني

### 3. نتائج المباريات الحية
- ✅ API-Football integration
- ✅ صفحة تفاصيل المباراة (MatchDetailPage)

### 4. المراسلة والقصص
- ✅ رسائل خاصة
- ✅ قصص مع ردود
- ✅ Feed اجتماعي

### 5. إشعارات Push (PWA)
- ✅ Service Worker
- ✅ UI للتفعيل

## الهندسة المعمارية

```
/app/
├── backend/
│   ├── server.py (>5200 سطر)
│   ├── routes/ (scaffolding فارغ)
│   └── models/ (scaffolding فارغ)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── RoomPage.js (>3500 سطر)
│   │   │   └── MatchDetailPage.js
│   │   └── components/
│   │       └── room/
│   │           ├── Reactions.jsx (جديد)
│   │           └── WatchParty.jsx (جديد)
```

## المهام المكتملة (22 مارس 2026)
- [x] Reactions API و Frontend
- [x] Polls API و Frontend  
- [x] Watch Party API و Frontend
- [x] دمج المكونات في RoomPage.js
- [x] إصلاح ObjectId serialization
- [x] تحويل Form data إلى JSON (Pydantic)

## المهام القادمة

### P1 (أولوية عالية)
- [ ] إعادة هيكلة server.py (تقسيم إلى routes/)
- [ ] إعادة هيكلة RoomPage.js (تقسيم إلى components/)
- [ ] التحقق من WebRTC video broadcasting

### P2 (أولوية متوسطة)
- [ ] نظام الشارات والمستويات (Gamification)
- [ ] Push Notifications backend triggers
- [ ] تحسين UI/UX

## الاعتمادات
- Agora SDK (Voice/Video)
- API-Football
- MongoDB
- FastAPI + React

## بيانات الاختبار
- Email: naifliver@gmail.com
- Password: As11223344
- Room ID: 3977f7ae
