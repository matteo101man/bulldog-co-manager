import { 
  collection, 
  getDocs, 
  addDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { app } from '../firebase/config';

const SUBSCRIPTIONS_COLLECTION = 'pushSubscriptions';

// VAPID Key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
// Generate a key pair in Firebase Console and paste it here
const VAPID_KEY = 'BAbKf71jkqDJ3-30AGiKo3pzbDkPWQPYgPRqJTTrIPOPbtRid8HXr9cKBDmb-bP6IetkHsNEujfsKxEFsjcNvbE'; // Replace with your VAPID key from Firebase Console

// Initialize messaging (only in browser environment)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('Firebase Messaging initialization failed:', error);
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  if (Notification.permission === 'granted') {
    return await getFCMToken();
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  return await getFCMToken();
}

/**
 * Get FCM token for the current device
 */
async function getFCMToken(): Promise<string | null> {
  if (!messaging) {
    throw new Error('Firebase Messaging is not available');
  }

  try {
    // Use Vite's BASE_URL which will be '/' for Firebase Hosting or '/bulldog-co-manager/' for GitHub Pages
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
    let registration;
    
    // Check if there's already a service worker registered
    const existingRegistrations = await navigator.serviceWorker.getRegistrations();
    
    // First, try to find the Firebase messaging service worker
    let firebaseSW = existingRegistrations.find(reg => 
      reg.active?.scriptURL?.includes('firebase-messaging-sw') || 
      reg.installing?.scriptURL?.includes('firebase-messaging-sw') ||
      reg.waiting?.scriptURL?.includes('firebase-messaging-sw')
    );
    
    if (firebaseSW) {
      // Use existing Firebase messaging service worker
      registration = firebaseSW;
      // Wait for it to be ready if it's installing
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          const stateChangeHandler = () => {
            if (registration.installing?.state === 'activated' || registration.active) {
              registration.installing?.removeEventListener('statechange', stateChangeHandler);
              resolve();
            }
          };
          registration.installing.addEventListener('statechange', stateChangeHandler);
        });
      } else {
        await registration.ready;
      }
    } else {
      // Try to use the ready service worker (could be the main sw.js)
      // Firebase Messaging can work with any service worker for token generation
      try {
        registration = await navigator.serviceWorker.ready;
        // If the ready SW is not firebase-messaging-sw, we still need to register it
        // But we can use the ready SW for token generation
        if (!registration.active?.scriptURL?.includes('firebase-messaging-sw')) {
          // Register firebase-messaging-sw.js in the background for background message handling
          // But use the ready SW for token generation
          try {
            await navigator.serviceWorker.register(`${basePath}/firebase-messaging-sw.js`, {
              scope: `${basePath}/`
            });
          } catch (swError) {
            // If registration fails (e.g., scope conflict), that's okay
            // We'll use the existing SW for token generation
            console.warn('Could not register firebase-messaging-sw.js, using existing service worker:', swError);
          }
        }
      } catch (readyError) {
        // No service worker ready, register the Firebase messaging service worker
        registration = await navigator.serviceWorker.register(`${basePath}/firebase-messaging-sw.js`, {
          scope: `${basePath}/`
        });
        await registration.ready;
      }
    }
    
    // Validate VAPID key is configured
    if (!VAPID_KEY || VAPID_KEY.trim().length === 0) {
      throw new Error('VAPID key not configured. Please generate a key pair in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates and update VAPID_KEY in notificationService.ts');
    }
    
    // Get FCM token with VAPID key
    let token: string | null = null;
    
    try {
      token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey: VAPID_KEY
      });
    } catch (error) {
      console.error('Error getting FCM token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide more specific error messages
      if (errorMessage.includes('messaging/') || errorMessage.includes('service-worker')) {
        throw new Error(`Service worker error: ${errorMessage}. Please try refreshing the page and enabling notifications again.`);
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        throw new Error('Notification permission was denied. Please enable notifications in your browser settings.');
      } else {
        throw new Error(`Failed to get FCM token: ${errorMessage}. Please ensure your VAPID key is correct and service workers are enabled.`);
      }
    }

    if (token) {
      // Store subscription in Firestore
      await saveSubscription(token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    throw error;
  }
}

/**
 * Save push subscription to Firestore
 */
async function saveSubscription(token: string): Promise<void> {
  try {
    // Check if subscription already exists
    const q = query(
      collection(db, SUBSCRIPTIONS_COLLECTION),
      where('token', '==', token)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // Add new subscription
      await addDoc(collection(db, SUBSCRIPTIONS_COLLECTION), {
        token,
        createdAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}

/**
 * Get all push subscriptions from Firestore
 */
export async function getAllSubscriptions(): Promise<Array<{ id: string; token: string }>> {
  try {
    const querySnapshot = await getDocs(collection(db, SUBSCRIPTIONS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      token: doc.data().token
    }));
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    throw error;
  }
}

/**
 * Send push notification to all subscribers
 * This stores the notification request in Firestore.
 * To actually send push notifications, you'll need to:
 * 1. Set up a Firebase Cloud Function that listens to 'notificationRequests' collection
 * 2. Use the Firebase Admin SDK to send notifications to all tokens
 * 
 * For now, this will show a notification to users currently on the page.
 */
export async function sendNotificationToAll(message: string): Promise<void> {
  try {
    const subscriptions = await getAllSubscriptions();
    
    // Store notification request in Firestore
    // A Cloud Function or backend service should listen to this and send the actual push notifications
    await addDoc(collection(db, 'notificationRequests'), {
      message,
      subscriptionsCount: subscriptions.length,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });

    // Show notification to users currently on the page (immediate feedback)
    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Bulldog CO Manager', {
          body: message,
          icon: '/web-app-manifest-192x192.png',
          badge: '/web-app-manifest-192x192.png',
          tag: 'bulldog-notification',
          requireInteraction: false
        });
      } catch (swError) {
        console.warn('Could not show notification via service worker:', swError);
        // Fallback to browser notification API
        if (Notification.permission === 'granted') {
          new Notification('Bulldog CO Manager', {
            body: message,
            icon: '/web-app-manifest-192x192.png',
            tag: 'bulldog-notification'
          });
        }
      }
    }

    if (subscriptions.length === 0) {
      console.warn('No active subscriptions found. Notification request saved, but no users will receive it until they enable notifications.');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Listen for foreground messages (when app is open)
 */
export function onMessageListener(): Promise<any> {
  return new Promise((resolve) => {
    if (!messaging) {
      resolve(null);
      return;
    }
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

