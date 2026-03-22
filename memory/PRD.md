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

### Phase 11: "جبار" Football Design Overhaul ✅ (March 20, 2026)
- **DashboardPage Redesign** ✅:
  - Stadium background effects with pitch lines
  - Lime/emerald gradient color scheme
  - New room cards with hover animations and glow effects
  - Updated category and status filters with counters
  - Enhanced bottom navigation with active indicator
  - PIN modal with modern design for closed rooms
- **LeagueDetailPage Redesign** ✅:
  - Football-themed header with league flag and name
  - Four functional tabs: المباريات (Fixtures), الترتيب (Standings), الهدافين (Scorers), صانعي الأهداف (Assists)
  - Match cards grouped by date with team logos
  - Standings table with color-coded ranks (top 4 emerald, bottom red)
  - Player cards with gold badges for top performers
  - Smooth tab switching with Framer Motion animations
- **Live Football Data Integration** ✅:
  - API-Football integration for real-time match data
  - League standings with full stats (wins, draws, losses, GD, points)
  - Top scorers and assist leaders

### Phase 12: Multi-Camera Video Rooms ✅ (March 22, 2026)
- **Agora Video Integration** ✅:
  - Full video publishing/subscribing via Agora SDK
  - Multiple simultaneous camera streams support
  - Video track management (create, publish, unpublish, stop)
  - Remote video users state tracking
- **Camera Controls** ✅:
  - Camera toggle button in control bar (when on stage)
  - Front/back camera switch functionality
  - Auto-cleanup on leaving stage
- **Video View Mode** ✅:
  - New "الكاميرات" (Cameras) toggle button always visible
  - Grid layout for multiple video streams
  - Local video preview with "أنت" (You) badge
  - Remote video display with username labels
  - Empty state with instructions
- **Follow from Participants List** ✅:
  - Follow/unfollow button in participants dropdown
  - Click on user to navigate to profile

### Phase 13: Room Recording Feature ✅ (March 22, 2026)
- **Recording Controls** ✅:
  - Record button in Room Settings (Owner/Admin only)
  - Uses MediaRecorder API for local recording
  - Captures audio and video from the room
  - Unlimited recording duration
- **Recording UI** ✅:
  - Recording indicator in room header with elapsed time
  - Red pulsing dot to show active recording
  - Stop recording button with timer display
- **Recording Output** ✅:
  - Auto-downloads as .webm file when stopped
  - Filename includes room title and timestamp
  - Auto-cleanup on leaving room

### Phase 14: Match Details & Story Features ✅ (March 22, 2026)
- **Match Detail Page** ✅:
  - New `/match/:matchId` route
  - Four tabs: التشكيلة (Lineups), الإحصائيات (Stats), الأحداث (Events), المواجهات (H2H)
  - Full match info: teams, score, venue, status
  - Team lineups with formation and player positions
  - Live statistics comparison bar chart
  - Match events timeline (goals, cards, substitutions)
  - Head-to-head history of previous meetings
  - API endpoint `/api/football/match/{fixture_id}` with API-Football integration
  - Fallback sample data when API unavailable

- **Story Reactions & Replies** ✅:
  - New API endpoints for story interactions:
    - `POST /stories/{id}/react` - Add emoji reaction
    - `POST /stories/{id}/reply` - Send text reply
    - `GET /stories/{id}/replies` - Get replies (owner only)
    - `GET /stories/{id}/reactions` - Get reactions
  - Notifications for reactions and replies
  - Reply count tracking on stories

- **PWA Push Notifications** ✅:
  - Permission request button in Settings → Notifications
  - Browser notification permission handling
  - Test notification on enable
  - Status indicator showing if notifications are enabled
  - Service worker already supports push events

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
1. **CRITICAL**: Refactor server.py into route modules (4900+ lines - technical debt)
2. **CRITICAL**: Break down RoomPage.js into smaller components (3100+ lines)
3. Story reactions/replies UI in Frontend (Backend done)

## P2 - Future Features
1. User leveling/ranking system with badges
2. Highlights (save stories permanently)
3. 1-on-1 Video calls (now partially supported via room video)
4. Gamification system

## Completed This Session (March 22, 2026)
- ✅ Multi-Camera Video Rooms (Agora WebRTC)
- ✅ Room Recording Feature (Owner/Admin only)
- ✅ Camera mirror fix for front camera
- ✅ Match Detail Page with lineups, stats, events, H2H
- ✅ Story Reactions & Replies Backend APIs
- ✅ PWA Push Notifications (permission request in Settings)

---

## Test Credentials
- Email: naifliver@gmail.com
- Password: As11223344
- User: _97

## Test User for Search
- Username: Liver97
- ID: b292fecb-9bde-4ea7-9cd7-9f4d62131a0f
