const DEFAULT_YOUTUBE_ORIGIN =
  process.env.REACT_APP_FRONTEND_ORIGIN ||
  process.env.REACT_APP_CANONICAL_ORIGIN ||
  'https://pitch-chat.preview.emergentagent.com';

const ensureUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    // Handle inputs like "youtube.com/watch?v=..."
    if (!/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) {
      try {
        return new URL(`https://${trimmed}`);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const getSafeOrigin = () => {
  if (typeof window === 'undefined') return DEFAULT_YOUTUBE_ORIGIN;

  const { origin, protocol, hostname } = window.location;
  const isHttp = /^https?:$/i.test(protocol);
  const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes((hostname || '').toLowerCase());

  // iOS/Capacitor webviews often run on localhost which can trigger
  // YouTube client-identification issues (error 153) for embeds.
  if (origin && isHttp && !isLocalhost) return origin;

  return DEFAULT_YOUTUBE_ORIGIN;
};

export const isYouTubeUrl = (url) => {
  const parsed = ensureUrl(url);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  return host.includes('youtube.com') || host.includes('youtube-nocookie.com') || host.includes('youtu.be');
};

const extractYouTubeVideoId = (parsedUrl) => {
  const host = parsedUrl.hostname.toLowerCase();
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (host.includes('youtu.be')) {
    return segments[0] || null;
  }

  if (parsedUrl.pathname === '/watch') {
    return parsedUrl.searchParams.get('v');
  }

  if (segments[0] === 'embed' && segments[1] && segments[1] !== 'live_stream') {
    return segments[1];
  }

  if (['live', 'shorts', 'v'].includes(segments[0]) && segments[1]) {
    return segments[1];
  }

  return parsedUrl.searchParams.get('v');
};

const extractYouTubeChannelRef = (parsedUrl) => {
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (segments[0] === '@' && segments[1]) return segments[1];

  if (segments[0]?.startsWith('@')) return segments[0].slice(1);

  if (segments[0] === 'channel' && segments[1]) return segments[1];

  if (segments[0] === 'c' && segments[1]) return segments[1];

  return null;
};

/**
 * Normalizes YouTube links to embed URLs and appends params that improve
 * compatibility in mobile webviews (including iOS/Capacitor).
 */
export const buildYouTubeEmbedUrl = (url, { mute = 1 } = {}) => {
  const parsed = ensureUrl(url);
  if (!parsed || !isYouTubeUrl(url)) return url;

  const origin = getSafeOrigin();

  const channelRef = extractYouTubeChannelRef(parsed);
  if (channelRef) {
    const liveUrl = new URL('https://www.youtube.com/embed/live_stream');
    liveUrl.searchParams.set('channel', channelRef);
    liveUrl.searchParams.set('autoplay', '1');
    liveUrl.searchParams.set('playsinline', '1');
    liveUrl.searchParams.set('enablejsapi', '1');
    liveUrl.searchParams.set('rel', '0');
    liveUrl.searchParams.set('modestbranding', '1');
    liveUrl.searchParams.set('mute', String(mute));
    liveUrl.searchParams.set('origin', origin);
    liveUrl.searchParams.set('widget_referrer', origin);
    return liveUrl.toString();
  }

  // Already using /embed/live_stream?channel=... format
  if (parsed.pathname.includes('/embed/live_stream')) {
    parsed.searchParams.set('autoplay', '1');
    parsed.searchParams.set('playsinline', '1');
    parsed.searchParams.set('enablejsapi', '1');
    parsed.searchParams.set('rel', '0');
    parsed.searchParams.set('modestbranding', '1');
    parsed.searchParams.set('mute', String(mute));
    parsed.searchParams.set('origin', origin);
    parsed.searchParams.set('widget_referrer', origin);
    return parsed.toString();
  }

  const videoId = extractYouTubeVideoId(parsed);
  if (!videoId) return url;

  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  embedUrl.searchParams.set('autoplay', '1');
  embedUrl.searchParams.set('playsinline', '1');
  embedUrl.searchParams.set('enablejsapi', '1');
  embedUrl.searchParams.set('rel', '0');
  embedUrl.searchParams.set('modestbranding', '1');
  embedUrl.searchParams.set('mute', String(mute));
  embedUrl.searchParams.set('origin', origin);
  embedUrl.searchParams.set('widget_referrer', origin);

  return embedUrl.toString();
};
