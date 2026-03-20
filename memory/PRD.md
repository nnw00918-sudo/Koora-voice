# كورة فيرس - Social Media Application PRD

## Original Problem Statement
Building a football-themed social media application with voice chat, threads, user profiles, messaging, and social features.

## User Personas
- **Football fans** who want to discuss matches and share content
- **Arabic-speaking users** (primary language support)
- **Mobile-first users** (responsive design)

## Core Requirements
1. Voice chat rooms (Agora integration)
2. Threads/posts with media support (images, videos, Twitter embeds)
3. User profiles with activity tabs
4. User search and discovery
5. Private messaging
6. Follow/unfollow system
7. Internationalization (Arabic/English)

---

## Completed Features (March 2026)

### Phase 1: Core Threading System ✅
- Thread creation with text, images, videos
- Twitter/X link embedding
- Thread deletion by owner
- Reply system with nested replies
- Like and repost functionality ✅ (Backend + Frontend wired)

### Phase 2: Profile System ✅
- User profile page with stats (followers, following, likes)
- Profile tabs: Posts, Likes, Replies, Reposts
- Edit profile (name, username, bio, avatar)
- Avatar upload or random generation
- Level and XP display

### Phase 3: Social Features ✅ (March 19, 2026)
- **"Replying to @username"** indicator in replies
- **User search** functionality
- **View other users' profiles**
- **Private messaging system**:
  - Conversations list
  - Chat view
  - Search modal for starting new chats
- **Follow/Unfollow** users from profiles
- **Like/Repost buttons** fully functional in UI

### Phase 4: Code Organization ✅ (March 19, 2026)
- Created `/backend/models/` for Pydantic models
- Created `/backend/services/` for auth helpers
- Created `/backend/config.py` for shared configuration
- Created `/frontend/src/components/ThreadCard.jsx`
- Created `/frontend/src/components/ReplyInput.jsx`

### Phase 5: Real-time Features ✅ (March 19, 2026)
- Added WebSocket endpoint for real-time messaging
- Implemented typing indicators
- Messages sync instantly between users
- Auto-reconnect on connection loss

### Phase 6: Notifications System ✅ (March 19, 2026)
- Full notifications page (`/notifications`)
- Real-time notifications via WebSocket
- Notification types: like, reply, follow, message
- Mark as read (single or all)
- Bell icon added to navigation bar
- Notifications created automatically when:
  - Someone likes your post
  - Someone replies to your post
  - Someone follows you

### Phase 7: Polish & Read Receipts ✅ (March 19, 2026)
- **Read receipts** for messages (✓ sent, ✓✓ read)
- **Notification sounds** using Web Audio API
- **Vibration** for mobile devices
- **Auto mark as read** when opening conversation
- **WebSocket sync** for read status
- Created route templates in `/backend/routes/`

### Phase 8: Stories Feature ✅ (March 19, 2026)
- **Full Stories system** like Instagram/Snapchat
- Stories auto-expire after 24 hours
- Create stories with images or videos
- Add captions to stories
- View other users' stories
- Story progress bar and auto-advance
- See who viewed your story
- Delete your own stories
- Gradient ring for unviewed stories
- Pause/play functionality

### Phase 9: Mobile Responsive Design ✅ (March 19, 2026)
- **Full responsive design** for iPhone and Android
- Optimized for all screen sizes:
  - iPhone SE (320px) - smallest
  - iPhone X/11/12 (375px)
  - iPhone 14 Pro Max (430px) - largest
  - Samsung Galaxy S21 (360px)
- Added `xs` breakpoint (375px) in Tailwind config
- Responsive voice room layout:
  - Speaker avatars scale based on screen size
  - Control buttons adjust for mobile
  - Chat area uses dynamic viewport height (dvh)
- Safe area support for notched devices
- Bottom navigation bar responsive
- Room cards responsive with proper image heights
- Touch-friendly button sizes (44px minimum)

### Phase 10: Room Membership & Admin Controls ✅ (March 19-20, 2026)
- **Room Membership System**:
  - Users must join a room to become a member before entering
  - "Join" button for non-members, "Enter" button for members
  - Member count displayed on room cards
- **Advanced Admin Controls**:
  - Kick users from room
  - Mute/unmute speakers
  - Remove users from stage
  - Promote/demote users (Owner only)
- **UI Redesign**:
  - Complete "Celestial Majlis" theme for RoomPage
  - Glassmorphism effects with animated gradients
  - Connected users dropdown with admin controls
- **Mic Requests Modal** ✅ (March 20, 2026):
  - Moved mic requests to a dedicated modal
  - Only visible to room Owner and Admins
  - Button shows request count in header
- **Emoji Reactions Fix** ✅ (March 20, 2026):
  - Fixed regex to support all emoji types (including compound emojis like ❤️)
  - Emojis now display correctly in center of chat

---

## Technical Architecture

### Frontend
- React 18
- TailwindCSS
- Framer Motion (animations)
- Lucide React (icons)
- React Router DOM
- Axios for API calls
- Sonner for toasts

### Backend
- FastAPI (Python)
- Motor (async MongoDB driver)
- JWT authentication
- Pydantic models

### Database
- MongoDB

### File Structure
```
/app/
├── backend/
│   ├── server.py (2800+ lines - needs refactoring)
│   ├── requirements.txt
│   └── uploads/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── ThreadsPage.js
│       │   ├── ProfilePage.js
│       │   ├── UserProfilePage.js
│       │   ├── MessagesPage.js
│       │   ├── RoomPage.js
│       │   ├── DashboardPage.js
│       │   └── ...
│       └── contexts/
│           ├── LanguageContext.js
│           └── SettingsContext.js
└── test_reports/
```

---

## API Endpoints

### Threads
- `POST /api/threads` - Create thread
- `GET /api/threads` - Get feed
- `DELETE /api/threads/{id}` - Delete thread
- `POST /api/threads/{id}/reply` - Reply to thread
- `GET /api/threads/{id}/replies` - Get replies
- `POST /api/threads/{id}/like` - Like/unlike
- `POST /api/threads/{id}/repost` - Repost

### Users
- `GET /api/users/search?q=` - Search users
- `GET /api/users/{id}/profile` - Get user profile
- `POST /api/users/{id}/follow` - Follow user
- `GET /api/users/{id}/followers` - Get followers
- `GET /api/users/{id}/following` - Get following
- `GET /api/users/{id}/threads` - Get user threads

### Messages
- `GET /api/conversations` - Get conversations
- `POST /api/conversations/{userId}` - Create/get conversation
- `GET /api/conversations/{id}/messages` - Get messages
- `POST /api/conversations/{id}/messages` - Send message

### Voice Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create room
- `POST /api/rooms/{id}/join` - Join room
- `POST /api/rooms/{id}/leave` - Leave room
- `POST /api/rooms/{id}/close-and-kick` - Close room and kick all

---

## P0 - Upcoming Tasks
- None (All P0 tasks completed)

## P1 - Priority Backlog
1. Complete server.py refactoring into route modules (3000+ lines - critical tech debt)
2. Break down RoomPage.js into smaller components (1400+ lines)
3. Add push notifications (PWA)
4. Add story reactions/replies

## P2 - Future Features
1. User leveling/ranking system with badges
2. Highlights (save stories permanently)
3. Audio/Video calls
4. Gamification system

---

## Test Credentials
- Email: naifliver@gmail.com
- Password: As11223344
- User: _97

## Test User for Search
- Username: Liver97
- ID: b292fecb-9bde-4ea7-9cd7-9f4d62131a0f
