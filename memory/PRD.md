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
- Like and repost functionality (backend complete)

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
│   ├── server.py (2266+ lines - needs refactoring)
│   ├── requirements.txt
│   └── uploads/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── ThreadsPage.js
│       │   ├── ProfilePage.js
│       │   ├── UserProfilePage.js
│       │   ├── MessagesPage.js
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

---

## P0 - Upcoming Tasks
1. Wire up Like and Repost buttons in UI (backend exists)

## P1 - Priority Backlog
1. Refactor server.py into modules (routes, models, services)
2. Extract shared components (ThreadCard, ReplyCard)
3. Real-time messaging with WebSockets

## P2 - Future Features
1. User leveling/ranking system with badges
2. Push notifications
3. Media optimization
4. Stories feature

---

## Test Credentials
- Email: naifliver@gmail.com
- Password: As11223344
- User: _97

## Test User for Search
- Username: Liver97
- ID: b292fecb-9bde-4ea7-9cd7-9f4d62131a0f
