// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Bulldog CO Manager';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || 'You have a new notification',
    icon: '/web-app-manifest-192x192.png',
    badge: '/web-app-manifest-192x192.png',
    tag: 'bulldog-notification',
    requireInteraction: false,
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ((client.url.includes('/bulldog-co-manager/') || client.url.endsWith('/')) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/bulldog-co-manager/');
      }
    })
  );
});

