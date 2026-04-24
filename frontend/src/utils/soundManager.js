/**
 * Sound Manager for Koora Voice
 * إدارة الأصوات في التطبيق
 */

// Sound URLs - Using free sound effects
const SOUNDS = {
  // Gift sounds
  gift_small: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Coin sound
  gift_medium: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Success chime
  gift_large: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', // Achievement
  gift_legendary: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3', // Crowd cheer
  
  // Notification sounds
  notification: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Pop notification
  message: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Message pop
  
  // Room sounds
  join_room: 'https://assets.mixkit.co/active_storage/sfx/2356/2356-preview.mp3', // Join sound
  leave_room: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3', // Leave sound
  hand_raise: 'https://assets.mixkit.co/active_storage/sfx/2355/2355-preview.mp3', // Hand raise
  
  // Stadium sounds
  stadium_cheer: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3', // Stadium crowd
  goal: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Goal celebration
  whistle: 'https://assets.mixkit.co/active_storage/sfx/2542/2542-preview.mp3', // Referee whistle
};

// Cache for loaded audio elements
const audioCache = {};

// Settings
let soundEnabled = true;
let volume = 0.7;

/**
 * Initialize sound settings from localStorage
 */
export const initSoundSettings = () => {
  const settings = localStorage.getItem('sound_settings');
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      soundEnabled = parsed.enabled !== false;
      volume = parsed.volume ?? 0.7;
    } catch (e) {
      console.error('Error parsing sound settings:', e);
    }
  }
};

/**
 * Save sound settings to localStorage
 */
export const saveSoundSettings = (enabled, vol) => {
  soundEnabled = enabled;
  volume = vol;
  localStorage.setItem('sound_settings', JSON.stringify({ enabled, volume: vol }));
};

/**
 * Get or create audio element
 */
const getAudio = (soundKey) => {
  if (!audioCache[soundKey]) {
    const url = SOUNDS[soundKey];
    if (!url) {
      console.warn(`Sound not found: ${soundKey}`);
      return null;
    }
    audioCache[soundKey] = new Audio(url);
  }
  return audioCache[soundKey];
};

/**
 * Play a sound
 */
export const playSound = (soundKey, customVolume) => {
  if (!soundEnabled) return;
  
  try {
    const audio = getAudio(soundKey);
    if (!audio) return;
    
    audio.volume = customVolume ?? volume;
    audio.currentTime = 0;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Auto-play was prevented, user hasn't interacted with page yet
      });
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

/**
 * Play gift sound based on gift price
 */
export const playGiftSound = (giftPrice) => {
  if (giftPrice >= 500) {
    playSound('gift_legendary', 0.8);
  } else if (giftPrice >= 100) {
    playSound('gift_large', 0.7);
  } else if (giftPrice >= 20) {
    playSound('gift_medium', 0.6);
  } else {
    playSound('gift_small', 0.5);
  }
};

/**
 * Play stadium cheer (for big gifts or celebrations)
 */
export const playStadiumCheer = () => {
  playSound('stadium_cheer', 0.6);
};

/**
 * Play notification sound
 */
export const playNotificationSound = () => {
  playSound('notification', 0.5);
};

/**
 * Play message sound
 */
export const playMessageSound = () => {
  playSound('message', 0.3);
};

/**
 * Toggle sound on/off
 */
export const toggleSound = () => {
  soundEnabled = !soundEnabled;
  saveSoundSettings(soundEnabled, volume);
  return soundEnabled;
};

/**
 * Set volume
 */
export const setVolume = (vol) => {
  volume = Math.max(0, Math.min(1, vol));
  saveSoundSettings(soundEnabled, volume);
};

/**
 * Check if sound is enabled
 */
export const isSoundEnabled = () => soundEnabled;

/**
 * Get current volume
 */
export const getVolume = () => volume;

// Initialize settings on load
initSoundSettings();

export default {
  playSound,
  playGiftSound,
  playStadiumCheer,
  playNotificationSound,
  playMessageSound,
  toggleSound,
  setVolume,
  isSoundEnabled,
  getVolume,
};
