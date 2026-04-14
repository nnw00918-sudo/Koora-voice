// Centralized API configuration with fallback for Capacitor iOS builds
// Environment variables may not be properly injected during native builds

export const BACKEND_URL = 'http://165.245.209.28:8001';
export const API = BACKEND_URL;
export const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID || 'b2c1cf7c621b48f2b1bf68cdf13f6bed';
