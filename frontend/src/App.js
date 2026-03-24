import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import RoomPage from './pages/RoomPage';
import UsersPage from './pages/UsersPage';
import AdminDashboard from './pages/AdminDashboard';
import CreateRoomPage from './pages/CreateRoomPage';
import ThreadsPage from './pages/ThreadsPage';
import SettingsPage from './pages/SettingsPage';
import MessagesPage from './pages/MessagesPage';
import UserProfilePage from './pages/UserProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import FollowListPage from './pages/FollowListPage';
import SearchUsersPage from './pages/SearchUsersPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import MiniAudioPlayer from './components/MiniAudioPlayer';
import { LanguageProvider } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { RoomAudioProvider } from './contexts/RoomAudioContext';
import { Toaster } from 'sonner';

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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-lime-400 text-xl font-cairo">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <SettingsProvider>
        <RoomAudioProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
              <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <AuthPage onLogin={handleLogin} />} />
              <Route path="/dashboard" element={user ? <DashboardPage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
              <Route path="/create-room" element={user?.role === 'owner' ? <CreateRoomPage user={user} /> : <Navigate to="/dashboard" />} />
              <Route path="/room/:roomId" element={user ? <RoomPage user={user} /> : <Navigate to="/" />} />
              <Route path="/users" element={user ? <UsersPage user={user} /> : <Navigate to="/" />} />
              <Route path="/admin" element={user?.role === 'owner' ? <AdminDashboard user={user} /> : <Navigate to="/dashboard" />} />
              <Route path="/threads" element={user ? <ThreadsPage user={user} /> : <Navigate to="/" />} />
              <Route path="/settings" element={user ? <SettingsPage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
              <Route path="/messages" element={user ? <MessagesPage user={user} /> : <Navigate to="/" />} />
              <Route path="/messages/:conversationId" element={user ? <MessagesPage user={user} /> : <Navigate to="/" />} />
              <Route path="/user/:userId" element={user ? <UserProfilePage currentUser={user} /> : <Navigate to="/" />} />
              <Route path="/notifications" element={user ? <NotificationsPage user={user} /> : <Navigate to="/" />} />
              <Route path="/profile" element={user ? <ProfilePage user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
              <Route path="/follows/:userId" element={user ? <FollowListPage user={user} /> : <Navigate to="/" />} />
              <Route path="/search-users" element={user ? <SearchUsersPage user={user} /> : <Navigate to="/" />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
            </Routes>
            <MiniAudioPlayer />
            <PWAInstallPrompt />
          </BrowserRouter>
          <Toaster position="top-center" theme="dark" richColors />
        </RoomAudioProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}

export default App;