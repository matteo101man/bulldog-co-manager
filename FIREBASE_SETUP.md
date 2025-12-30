# Firebase Cloud Messaging Setup Guide

## Step 1: Generate VAPID Key in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `bulldog-co-manager`
3. Go to **Project Settings** (gear icon) → **Cloud Messaging** tab
4. Under **Web configuration**, click **Generate key pair** (or copy existing VAPID key)
5. Copy the VAPID key

## Step 2: Update VAPID Key in Code

Update the VAPID key in `src/services/notificationService.ts`:

```typescript
// In the getFCMToken function, replace:
vapidKey: undefined
// With:
vapidKey: 'YOUR_VAPID_KEY_HERE'
```

## Step 3: Set Up Firebase Cloud Functions

### Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### Login to Firebase
```bash
firebase login
```

### Initialize Functions in Your Project
```bash
# In your project root directory
firebase init functions

# Select:
# - Use an existing project → bulldog-co-manager
# - Language: JavaScript (or TypeScript if you prefer)
# - ESLint: Yes
# - Install dependencies: Yes
```

### Create the Cloud Function

Create/edit `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNotificationToAll = functions.firestore
  .document('notificationRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const notificationData = snap.data();
    
    // Only process if status is pending
    if (notificationData.status !== 'pending') {
      return null;
    }

    try {
      // Get all push subscriptions
      const subscriptionsSnapshot = await admin.firestore()
        .collection('pushSubscriptions')
        .get();

      if (subscriptionsSnapshot.empty) {
        console.log('No subscriptions found');
        // Update status to completed (no subscribers)
        await snap.ref.update({ status: 'completed', sentCount: 0 });
        return null;
      }

      const tokens = subscriptionsSnapshot.docs.map(doc => doc.data().token);
      const message = notificationData.message;

      // Prepare the notification payload
      const messagePayload = {
        notification: {
          title: 'Bulldog CO Manager',
          body: message,
        },
        data: {
          message: message,
          timestamp: new Date().toISOString(),
        },
        tokens: tokens, // Send to multiple tokens
      };

      // Send notifications using Firebase Admin SDK
      const response = await admin.messaging().sendEachForMulticast(messagePayload);
      
      // Update status
      const sentCount = response.successCount;
      const failedTokens = [];
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      // Remove failed tokens from subscriptions
      if (failedTokens.length > 0) {
        const batch = admin.firestore().batch();
        subscriptionsSnapshot.docs.forEach(doc => {
          if (failedTokens.includes(doc.data().token)) {
            batch.delete(doc.ref);
          }
        });
        await batch.commit();
      }

      // Update notification request status
      await snap.ref.update({
        status: 'completed',
        sentCount: sentCount,
        failedCount: response.failureCount,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Successfully sent ${sentCount} notifications`);
      return null;
    } catch (error) {
      console.error('Error sending notifications:', error);
      await snap.ref.update({
        status: 'failed',
        error: error.message
      });
      return null;
    }
  });
```

### Install Required Dependencies
```bash
cd functions
npm install firebase-admin firebase-functions
cd ..
```

### Deploy the Function
```bash
firebase deploy --only functions
```

## Step 4: Enable Cloud Messaging API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `bulldog-co-manager`
3. Go to **APIs & Services** → **Library**
4. Search for "Firebase Cloud Messaging API"
5. Click **Enable**

## Step 5: Set Up Service Account (if needed)

If you get permission errors:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **IAM & Admin** → **Service Accounts**
3. Find the Firebase service account (usually `firebase-adminsdk-xxxxx@bulldog-co-manager.iam.gserviceaccount.com`)
4. Ensure it has the **Firebase Cloud Messaging Admin** role

## Testing

1. Open your app in a browser
2. Go to Settings → Send Notification
3. Enter a message and click "Send Notification"
4. Check Firebase Console → Functions → Logs to see if the function executed
5. Check Firestore → `notificationRequests` collection to see the status

## Troubleshooting

- **Function not triggering**: Check that the function is deployed and active
- **No notifications received**: 
  - Verify VAPID key is correct
  - Check browser console for errors
  - Ensure notification permission is granted
  - Check that tokens are being saved in `pushSubscriptions` collection
- **Permission errors**: Ensure Cloud Messaging API is enabled

