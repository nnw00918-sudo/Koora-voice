import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import { LanguageProvider } from './contexts/LanguageContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { RoomAudioProvider } from './contexts/RoomAudioContext';
import { Toaster } from 'sonner';

// Lazy load pages for faster initial load
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RoomPage = lazy(() => import('./pages/RoomPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CreateRoomPage = lazy(() => import('./pages/CreateRoomPage'));
const ThreadsPage = lazy(() => import('./pages/ThreadsPage'));
const ThreadDetailPage = lazy(() => import('./pages/ThreadDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FollowListPage = lazy(() => import('./pages/FollowListPage'));
const SearchUsersPage = lazy(() => import('./pages/SearchUsersPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const NewsManagementPage = lazy(() => import('./pages/NewsManagementPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const BadgesPage = lazy(() => import('./pages/BadgesPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const PaymentResultPage = lazy(() => import('./pages/PaymentResultPage'));

// Non-lazy components (always needed)
import PWAInstallPrompt from './components/PWAInstallPrompt';
import MiniAudioPlayer from './components/MiniAudioPlayer';

// Loading spinner component
const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-slate-400 font-cairo">جاري التحميل...</span>
    </div>
  </div>
);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

// Toaster wrapper that responds to theme
const ThemedToaster = () => {
  const { isDarkMode } = useSettings();
  return <Toaster position="top-center" theme={isDarkMode ? "dark" : "light"} richColors />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Update user data when it changes
  const updateUser = (newUserData) => {
    localStorage.setItem('user', JSON.stringify(newUserData));
    setUser(newUserData);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <LanguageProvider>
      <SettingsProvider>
        <RoomAudioProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
                <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <AuthPage onLogin={handleLogin} />} />
                <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <AuthPage onLogin={handleLogin} isRegister />} />
                <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} />
                <Route path="/dashboard" element={user ? <DashboardPage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
                <Route path="/room/:roomId" element={user ? <RoomPage user={user} updateUser={updateUser} /> : <Navigate to="/" />} />
                <Route path="/users" element={user ? <UsersPage user={user} /> : <Navigate to="/" />} />
                <Route path="/admin" element={user?.role === 'owner' ? <AdminDashboard user={user} /> : <Navigate to="/dashboard" />} />
                <Route path="/create-room" element={user ? <CreateRoomPage user={user} /> : <Navigate to="/" />} />
                <Route path="/threads" element={user ? <ThreadsPage user={user} /> : <Navigate to="/" />} />
                <Route path="/thread/:threadId" element={user ? <ThreadDetailPage user={user} /> : <Navigate to="/" />} />
                <Route path="/settings" element={user ? <SettingsPage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
                <Route path="/messages" element={user ? <MessagesPage user={user} /> : <Navigate to="/" />} />
                <Route path="/user/:userId" element={user ? <UserProfilePage currentUser={user} /> : <Navigate to="/" />} />
                <Route path="/notifications" element={user ? <NotificationsPage user={user} /> : <Navigate to="/" />} />
                <Route path="/profile" element={user ? <ProfilePage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
                <Route path="/profile/followers" element={user ? <FollowListPage user={user} /> : <Navigate to="/" />} />
                <Route path="/profile/following" element={user ? <FollowListPage user={user} /> : <Navigate to="/" />} />
                <Route path="/user/:userId/followers" element={user ? <FollowListPage user={user} /> : <Navigate to="/" />} />
                <Route path="/user/:userId/following" element={user ? <FollowListPage user={user} /> : <Navigate to="/" />} />
                <Route path="/follows/:userId" element={user ? <FollowListPage user={user} /> : <Navigate to="/" />} />
                <Route path="/search-users" element={user ? <SearchUsersPage user={user} /> : <Navigate to="/" />} />
                <Route path="/news-management" element={user && ['news_editor', 'admin', 'owner'].includes(user.role) ? <NewsManagementPage user={user} /> : <Navigate to="/dashboard" />} />
                <Route path="/announcements" element={user?.role === 'owner' ? <AnnouncementsPage user={user} /> : <Navigate to="/dashboard" />} />
                <Route path="/badges" element={user ? <BadgesPage user={user} /> : <Navigate to="/" />} />
                <Route path="/store" element={user ? <StorePage /> : <Navigate to="/" />} />
                <Route path="/payment/success" element={user ? <PaymentResultPage /> : <Navigate to="/" />} />
                <Route path="/payment/cancel" element={user ? <PaymentResultPage /> : <Navigate to="/" />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
              </Routes>
            </Suspense>
            <MiniAudioPlayer />
            <PWAInstallPrompt />
          </BrowserRouter>
          <ThemedToaster />
        </RoomAudioProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}

export default App;
