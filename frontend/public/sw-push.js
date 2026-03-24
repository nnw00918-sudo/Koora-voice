// Push Notification Service Worker
// This file handles incoming push notifications

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body || 'لديك إشعار جديد',
        icon: data.icon || '/logo192.png',
        badge: data.badge || '/logo192.png',
        tag: data.tag || 'koora-voice',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/',
          ...data.data
        },
        actions: [
          { action: 'open', title: 'فتح' },
          { action: 'close', title: 'إغلاق' }
        ],
        dir: 'rtl',
        lang: 'ar'
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

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Open the app or focus existing window
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
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
