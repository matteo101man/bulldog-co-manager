# Firebase Setup Guide

## Step 1: Enable Firestore Database

1. In Firebase Console, click **"Firestore Database"** in the left sidebar (NOT Realtime Database)
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll add security rules later)
4. Choose a location (e.g., `us-central1`)
5. Click **"Enable"**

## Step 2: Get Your Firebase Config

1. Click the ⚙️ gear icon → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. If you don't have a web app, click **"Add app"** → **"Web"** (</> icon)
4. Register your app (name it "Bulldog CO Manager")
5. Copy the `firebaseConfig` object

## Step 3: Update Config File

Replace the values in `src/firebase/config.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "AIza...", // Your actual API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 4: Database Structure

Firestore will have two main collections:

### Collection: `cadets`
Each document represents a cadet:
```
cadets/{cadetId}
  - company: "Alpha" | "Bravo" | "Charlie" | "Ranger"
  - firstName: string
  - lastName: string
  - militaryScienceLevel: string (e.g., "MS1", "MS2", "MS3", "MS4")
  - phoneNumber: string
  - email: string
```

### Collection: `attendance`
Each document represents attendance for one cadet for one week:
```
attendance/{weekStartDate}_{cadetId}
  - cadetId: string (reference to cadet)
  - weekStartDate: string (ISO date, e.g., "2024-01-15")
  - tuesday: "present" | "excused" | "unexcused" | null
  - wednesday: "present" | "excused" | "unexcused" | null
  - thursday: "present" | "excused" | "unexcused" | null
```

## Step 5: Security Rules (Later)

We'll set up security rules after the app is working. For now, test mode is fine for development.

