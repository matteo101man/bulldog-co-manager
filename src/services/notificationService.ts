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
    // Get the service worker registration (use existing if available, otherwise register)
    let registration;
    try {
      // Try to get existing registration first
      registration = await navigator.serviceWorker.ready;
      
      // Check if we need to register the Firebase messaging service worker
      // The VitePWA plugin creates a service worker, so we'll use that
      // The firebase-messaging-sw.js will be loaded by the main service worker if needed
    } catch (swError) {
      console.warn('Service worker not ready, attempting to register:', swError);
      // Try to register the Firebase messaging service worker as fallback
      try {
        const basePath = '/bulldog-co-manager';
        registration = await navigator.serviceWorker.register(`${basePath}/firebase-messaging-sw.js`, {
          scope: `${basePath}/`
        });
        await navigator.serviceWorker.ready;
      } catch (regError) {
        console.warn('Could not register Firebase messaging service worker:', regError);
        throw new Error('Service worker registration failed');
      }
    }
    
    // Get FCM token with VAPID key
    let token: string | null = null;
    
    // Validate VAPID key is configured
    if (!VAPID_KEY || VAPID_KEY.trim().length === 0) {
      throw new Error('VAPID key not configured. Please generate a key pair in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates and update VAPID_KEY in notificationService.ts');
    }
    
    try {
      token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey: VAPID_KEY
      });
    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw new Error(`Failed to get FCM token: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure your VAPID key is correct.`);
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

