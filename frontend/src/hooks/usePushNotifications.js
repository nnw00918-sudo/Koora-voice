/**
 * Push Notifications Hook
 * Handles subscribing/unsubscribing to web push notifications
 */
import { useState, useEffect, useCallback } from 'react';
import { API } from '../config/api';

// Convert base64 string to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function usePushNotifications(token) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState('default');
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check subscription status
  useEffect(() => {
    if (!isSupported || !token) {
      setIsLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported, token]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      throw err;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !token) {
      setError('Push notifications not supported or not logged in');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Permission denied');
        setIsLoading(false);
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Get VAPID public key
      const keyResponse = await fetch(`${API}/api/push/vapid-key`);
      const { public_key } = await keyResponse.json();

      if (!public_key) {
        throw new Error('VAPID key not available');
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key)
      });

      // Send subscription to server
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      };

      const response = await fetch(`${API}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;

    } catch (err) {
      console.error('Subscribe error:', err);
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, token, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported || !token) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch(`${API}/api/push/unsubscribe`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth'))
            }
          })
        });
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;

    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, token]);

  // Send test notification
  const sendTest = useCallback(async () => {
    if (!token) return false;

    try {
      const response = await fetch(`${API}/api/push/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (err) {
      console.error('Test notification error:', err);
      return false;
    }
  }, [token]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
    sendTest
  };
}
