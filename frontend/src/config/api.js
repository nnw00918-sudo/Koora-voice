// Centralized API configuration with runtime-aware fallback behavior.
// If REACT_APP_BACKEND_URL is missing in production web builds, prefer same-origin
// to avoid mixed-content/API mismatch issues.

const REMOTE_FALLBACK_BACKEND_URL = 'http://165.245.209.28:8001';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const isNativeCapacitorRuntime = () => {
  if (typeof window === 'undefined' || !window.Capacitor) return false;
  try {
    const platform = window.Capacitor.getPlatform?.();
    return platform && platform !== 'web';
  } catch {
    return false;
  }
};

const resolveBackendUrl = () => {
  const envBackendUrl = trimTrailingSlash(process.env.REACT_APP_BACKEND_URL || '');
  if (envBackendUrl) return envBackendUrl;

  if (typeof window === 'undefined') return REMOTE_FALLBACK_BACKEND_URL;

  const { origin, protocol, hostname } = window.location;
  const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);

  // Native builds and file:// cannot rely on same-origin API requests.
  if (protocol === 'file:' || isNativeCapacitorRuntime()) {
    return REMOTE_FALLBACK_BACKEND_URL;
  }

  if (origin && !isLocalhost) {
    return trimTrailingSlash(origin);
  }

  return REMOTE_FALLBACK_BACKEND_URL;
};

export const BACKEND_URL = resolveBackendUrl();
export const API = `${BACKEND_URL}/api`;
export const WS_BACKEND_URL = BACKEND_URL
  .replace('https://', 'wss://')
  .replace('http://', 'ws://');
export const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID || 'b2c1cf7c621b48f2b1bf68cdf13f6bed';
