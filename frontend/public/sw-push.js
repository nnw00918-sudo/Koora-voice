// Push Notification Service Worker
// This file handles incoming push notifications with Deep Linking support

// Notification type icons mapping
const NOTIFICATION_ICONS = {
  'message': '/icons/chat-icon.png',
  'room': '/icons/room-icon.png',
  'follow': '/icons/follow-icon.png',
  'like': '/icons/like-icon.png',
  'mention': '/icons/mention-icon.png',
  'reply': '/icons/reply-icon.png',
  'gift': '/icons/gift-icon.png',
  'news': '/icons/news-icon.png',
  'default': '/logo192.png'
};

// Get appropriate icon based on notification type
function getNotificationIcon(type) {
  return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS['default'];
}

// Build deep link URL based on notification type
function buildDeepLinkUrl(data) {
  const baseUrl = self.location.origin;
  
  switch(data.type) {
    case 'message':
      // Direct to conversation
      return data.conversation_id 
        ? `${baseUrl}/messages/${data.conversation_id}` 
        : `${baseUrl}/messages`;
    case 'room':
    case 'room_invite':
      // Direct to room
      return data.room_id 
        ? `${baseUrl}/room/${data.room_id}` 
        : `${baseUrl}/dashboard`;
    case 'follow':
      // Direct to follower's profile
      return data.follower_id 
        ? `${baseUrl}/profile/${data.follower_id}` 
        : `${baseUrl}/dashboard`;
    case 'mention':
    case 'reply':
    case 'like':
      // Direct to thread/post
      return data.thread_id 
        ? `${baseUrl}/thread/${data.thread_id}` 
        : `${baseUrl}/dashboard`;
    case 'news':
      // Direct to news page
      return `${baseUrl}/news`;
    default:
      return data.url || `${baseUrl}/dashboard`;
  }
}

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      // Build deep link URL
      const deepLinkUrl = buildDeepLinkUrl(data);
      
      const options = {
        body: data.body || 'لديك إشعار جديد',
        icon: data.icon || getNotificationIcon(data.type),
        badge: '/logo192.png',
        tag: data.tag || `koora-${data.type || 'default'}-${Date.now()}`,
        vibrate: [100, 50, 100],
        renotify: true, // Always show even if same tag
        requireInteraction: data.type === 'message' || data.type === 'room_invite', // Keep visible for important notifications
        data: {
          url: deepLinkUrl,
          type: data.type,
          ...data.data
        },
        actions: getActionsForType(data.type),
        dir: 'rtl',
        lang: 'ar',
        timestamp: Date.now()
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'صوت الكورة', options)
      );
    } catch (e) {
      // Fallback for plain text
      event.waitUntil(
        self.registration.showNotification('صوت الكورة', {
          body: event.data.text(),
          icon: '/logo192.png',
          badge: '/logo192.png',
          dir: 'rtl'
        })
      );
    }
  }
});

// Get actions based on notification type
function getActionsForType(type) {
  switch(type) {
    case 'message':
      return [
        { action: 'reply', title: 'رد' },
        { action: 'open', title: 'فتح' }
      ];
    case 'room':
    case 'room_invite':
      return [
        { action: 'join', title: 'انضم' },
        { action: 'close', title: 'لاحقاً' }
      ];
    case 'follow':
      return [
        { action: 'view', title: 'عرض الملف' },
        { action: 'close', title: 'إغلاق' }
      ];
    default:
      return [
        { action: 'open', title: 'فتح' },
        { action: 'close', title: 'إغلاق' }
      ];
  }
}

// Handle notification click with deep linking
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  // Handle close action
  if (action === 'close') {
    return;
  }
  
  // Determine URL based on action and type
  let urlToOpen = data.url || '/dashboard';
  
  // Handle specific actions
  if (action === 'reply' && data.type === 'message') {
    // Open messages with reply intent
    urlToOpen = data.url + '?action=reply';
  } else if (action === 'join' && (data.type === 'room' || data.type === 'room_invite')) {
    // Join room directly
    urlToOpen = data.url;
  } else if (action === 'view' && data.type === 'follow') {
    // View follower profile
    urlToOpen = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate existing window to the target URL
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: urlToOpen,
            notificationType: data.type,
            action: action
          });
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.vapidPublicKey
    }).then(function(subscription) {
      // Send new subscription to server
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + self.authToken
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
            auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
          }
        })
      });
    })
  );
});
