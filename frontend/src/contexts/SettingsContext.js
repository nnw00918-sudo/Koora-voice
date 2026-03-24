import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

const defaultSettings = {
  // Privacy
  privateAccount: false,
  showOnline: true,
  
  // Notifications
  notifications: true,
  messageNotif: true,
  likesNotif: true,
  followNotif: true,
  roomNotif: true,
  
  // Display
  darkMode: true,
  sounds: true,
  vibration: true,
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
    
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.text;
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Play sound feedback if sounds enabled
    if (settings.sounds && key !== 'sounds') {
      playClickSound();
    }
    
    // Vibrate if vibration enabled
    if (settings.vibration && key !== 'vibration' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  const toggleTheme = () => {
    updateSetting('darkMode', !settings.darkMode);
  };
  
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
      playNotificationSound,
      vibrate 
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
