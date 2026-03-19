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

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // Apply dark mode
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0f172a';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
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
