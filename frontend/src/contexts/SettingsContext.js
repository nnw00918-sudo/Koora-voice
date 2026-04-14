import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../config/api';

const SettingsContext = createContext();

const defaultSettings = {
  // Privacy
  privateAccount: false,
  showOnlineStatus: true,
  showLastSeen: true,
  allowMessages: 'everyone', // everyone, followers, nobody
  allowMentions: true,
  hideFromSearch: false,
  
  // Notifications
  pushEnabled: true,
  emailEnabled: false,
  messageNotif: true,
  likesNotif: true,
  commentsNotif: true,
  followNotif: true,
  mentionsNotif: true,
  roomNotif: true,
  
  // Display
  darkMode: true,
  sounds: true,
  vibration: true,
  autoPlayVideos: true,
  dataSaver: false,
  fontSize: 'medium', // small, medium, large
};

// Theme colors for light and dark modes
export const themeColors = {
  dark: {
    background: '#0A0A0A',
    surface: '#141414',
    primary: '#CCFF00',
    primaryForeground: '#000000',
    secondary: '#1A1A1A',
    muted: '#262626',
    mutedForeground: '#A3A3A3',
    border: '#262626',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    accentRed: '#FF3B30',
    accentBlue: '#007AFF',
    cardBg: '#141414',
    inputBg: '#141414',
    glassBg: 'rgba(0, 0, 0, 0.7)',
    glassBackdrop: 'blur(12px)',
  },
  light: {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    primary: '#84CC16',
    primaryForeground: '#FFFFFF',
    secondary: '#E5E5E5',
    muted: '#D4D4D4',
    mutedForeground: '#737373',
    border: '#E5E5E5',
    text: '#171717',
    textSecondary: '#525252',
    accentRed: '#DC2626',
    accentBlue: '#2563EB',
    cardBg: '#FFFFFF',
    inputBg: '#FFFFFF',
    glassBg: 'rgba(255, 255, 255, 0.8)',
    glassBackdrop: 'blur(12px)',
  }
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from server on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadSettingsFromServer(token);
    }
  }, []);

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // Apply theme
    const root = document.documentElement;
    const theme = settings.darkMode ? themeColors.dark : themeColors.light;
    
    if (settings.darkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    
    // Set CSS variables for theme
    root.style.setProperty('--theme-background', theme.background);
    root.style.setProperty('--theme-surface', theme.surface);
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-primary-foreground', theme.primaryForeground);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-muted', theme.muted);
    root.style.setProperty('--theme-muted-foreground', theme.mutedForeground);
    root.style.setProperty('--theme-border', theme.border);
    root.style.setProperty('--theme-text', theme.text);
    root.style.setProperty('--theme-text-secondary', theme.textSecondary);
    root.style.setProperty('--theme-card-bg', theme.cardBg);
    root.style.setProperty('--theme-input-bg', theme.inputBg);
    root.style.setProperty('--theme-glass-bg', theme.glassBg);
    
    // Apply font size
    const fontSizes = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--base-font-size', fontSizes[settings.fontSize] || '16px');
    
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
  }, [settings]);

  const loadSettingsFromServer = async (token) => {
    try {
      const response = await axios.get(`${API}/api/users/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        const serverSettings = {
          // Privacy
          privateAccount: response.data.privacy?.privateAccount ?? defaultSettings.privateAccount,
          showOnlineStatus: response.data.privacy?.showOnlineStatus ?? defaultSettings.showOnlineStatus,
          showLastSeen: response.data.privacy?.showLastSeen ?? defaultSettings.showLastSeen,
          allowMessages: response.data.privacy?.allowMessages ?? defaultSettings.allowMessages,
          allowMentions: response.data.privacy?.allowMentions ?? defaultSettings.allowMentions,
          hideFromSearch: response.data.privacy?.hideFromSearch ?? defaultSettings.hideFromSearch,
          // Notifications
          pushEnabled: response.data.notifications?.pushEnabled ?? defaultSettings.pushEnabled,
          emailEnabled: response.data.notifications?.emailEnabled ?? defaultSettings.emailEnabled,
          messageNotif: response.data.notifications?.messages ?? defaultSettings.messageNotif,
          likesNotif: response.data.notifications?.likes ?? defaultSettings.likesNotif,
          commentsNotif: response.data.notifications?.comments ?? defaultSettings.commentsNotif,
          followNotif: response.data.notifications?.follows ?? defaultSettings.followNotif,
          mentionsNotif: response.data.notifications?.mentions ?? defaultSettings.mentionsNotif,
          roomNotif: response.data.notifications?.roomInvites ?? defaultSettings.roomNotif,
          // Display
          darkMode: response.data.display?.darkMode ?? defaultSettings.darkMode,
          sounds: response.data.notifications?.soundEnabled ?? defaultSettings.sounds,
          vibration: response.data.notifications?.vibrationEnabled ?? defaultSettings.vibration,
          autoPlayVideos: response.data.display?.autoPlayVideos ?? defaultSettings.autoPlayVideos,
          dataSaver: response.data.display?.dataServerMode ?? defaultSettings.dataSaver,
          fontSize: response.data.display?.fontSize ?? defaultSettings.fontSize,
        };
        setSettings(prev => ({ ...prev, ...serverSettings }));
      }
    } catch (error) {
      console.log('Using local settings');
    }
  };

  const saveSettingsToServer = useCallback(async (category, data) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    setIsLoading(true);
    try {
      await axios.put(`${API}/api/users/settings`, {
        [category]: data
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to save settings to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Play sound feedback if sounds enabled
    if (settings.sounds && key !== 'sounds') {
      playClickSound();
    }
    
    // Vibrate if vibration enabled
    if (settings.vibration && key !== 'vibration' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Sync to server based on category
    const privacyKeys = ['privateAccount', 'showOnlineStatus', 'showLastSeen', 'allowMessages', 'allowMentions', 'hideFromSearch'];
    const notificationKeys = ['pushEnabled', 'emailEnabled', 'messageNotif', 'likesNotif', 'commentsNotif', 'followNotif', 'mentionsNotif', 'roomNotif', 'sounds', 'vibration'];
    const displayKeys = ['darkMode', 'autoPlayVideos', 'dataSaver', 'fontSize'];

    if (privacyKeys.includes(key)) {
      const privacyData = { ...settings, [key]: value };
      saveSettingsToServer('privacy', {
        privateAccount: privacyData.privateAccount,
        showOnlineStatus: privacyData.showOnlineStatus,
        showLastSeen: privacyData.showLastSeen,
        allowMessages: privacyData.allowMessages,
        allowMentions: privacyData.allowMentions,
        hideFromSearch: privacyData.hideFromSearch,
      });
    } else if (notificationKeys.includes(key)) {
      const notifData = { ...settings, [key]: value };
      saveSettingsToServer('notifications', {
        pushEnabled: notifData.pushEnabled,
        emailEnabled: notifData.emailEnabled,
        messages: notifData.messageNotif,
        likes: notifData.likesNotif,
        comments: notifData.commentsNotif,
        follows: notifData.followNotif,
        mentions: notifData.mentionsNotif,
        roomInvites: notifData.roomNotif,
        soundEnabled: notifData.sounds,
        vibrationEnabled: notifData.vibration,
      });
    } else if (displayKeys.includes(key)) {
      const displayData = { ...settings, [key]: value };
      saveSettingsToServer('display', {
        darkMode: displayData.darkMode,
        autoPlayVideos: displayData.autoPlayVideos,
        dataServerMode: displayData.dataSaver,
        fontSize: displayData.fontSize,
      });
    }
  }, [settings, saveSettingsToServer]);
  
  const toggleTheme = useCallback(() => {
    updateSetting('darkMode', !settings.darkMode);
  }, [settings.darkMode, updateSetting]);
  
  const currentTheme = settings.darkMode ? themeColors.dark : themeColors.light;

  const playClickSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.05);
    } catch (e) {
      // Audio not supported
    }
  };

  const playNotificationSound = () => {
    if (!settings.sounds) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.2;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 800;
      }, 100);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Audio not supported
    }
  };

  const vibrate = (pattern = 100) => {
    if (settings.vibration && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSetting,
      toggleTheme,
      currentTheme,
      isDarkMode: settings.darkMode,
      isLoading,
      playNotificationSound,
      vibrate,
      // Shortcut getters for common checks
      canReceiveMessages: (senderId, isFollower) => {
        if (settings.allowMessages === 'everyone') return true;
        if (settings.allowMessages === 'followers') return isFollower;
        return false;
      },
      shouldShowNotification: (type) => {
        const map = {
          message: settings.messageNotif,
          like: settings.likesNotif,
          comment: settings.commentsNotif,
          follow: settings.followNotif,
          mention: settings.mentionsNotif,
          room: settings.roomNotif,
        };
        return map[type] ?? true;
      },
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
