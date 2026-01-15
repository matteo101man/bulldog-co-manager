import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firestore with error handling
let db: Firestore;
try {
  db = getFirestore(app);
  // Verify Firestore is available
  if (!db) {
    throw new Error('Firestore initialization returned undefined. Please ensure Firestore is enabled in Firebase Console.');
  }
} catch (error) {
  console.error('Error initializing Firestore:', error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  throw new Error(`Firestore initialization failed: ${errorMessage}\n\nPlease ensure:\n1. Firestore Database is enabled in Firebase Console\n2. You're using the correct Firebase project\n3. Your internet connection is working`);
}

// Initialize Messaging (only in browser environment)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('Firebase Messaging initialization failed:', error);
  }
}

// Initialize Storage
let storage: FirebaseStorage;
try {
  storage = getStorage(app);
  if (!storage) {
    throw new Error('Storage initialization returned undefined. Please ensure Firebase Storage is enabled in Firebase Console.');
  }
} catch (error) {
  console.error('Error initializing Storage:', error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  throw new Error(`Firebase Storage initialization failed: ${errorMessage}\n\nPlease ensure:\n1. Firebase Storage is enabled in Firebase Console: https://console.firebase.google.com/project/bulldog-co-manager/storage\n2. Click 'Get Started' to set up Firebase Storage\n3. You're using the correct Firebase project\n4. Your internet connection is working`);
}

export { db, app, messaging, storage };