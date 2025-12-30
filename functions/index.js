const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function that triggers when a new notification request is created
 * Sends push notifications to all registered devices
 */
exports.sendNotificationToAll = onDocumentCreated(
  {
    document: 'notificationRequests/{requestId}',
    region: 'us-central1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log('No data associated with the event');
      return null;
    }
    const notificationData = snap.data();
    
    // Only process if status is pending
    if (notificationData.status !== 'pending') {
      console.log('Notification request status is not pending, skipping');
      return null;
    }

    try {
      console.log('Processing notification request:', event.params.requestId);
      
      // Get all push subscriptions
      const subscriptionsSnapshot = await admin.firestore()
        .collection('pushSubscriptions')
        .get();

      if (subscriptionsSnapshot.empty) {
        console.log('No subscriptions found');
        // Update status to completed (no subscribers)
        await snap.ref.update({ 
          status: 'completed', 
          sentCount: 0,
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      const tokens = subscriptionsSnapshot.docs.map(doc => doc.data().token);
      const message = notificationData.message;

      console.log(`Sending notification to ${tokens.length} devices`);

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
      const failedCount = response.failureCount;
      const failedTokens = [];
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({
            token: tokens[idx],
            error: resp.error
          });
          console.error(`Failed to send to token ${idx}:`, resp.error);
        }
      });

      // Remove failed tokens from subscriptions (invalid/expired tokens)
      if (failedTokens.length > 0) {
        const batch = admin.firestore().batch();
        let deletedCount = 0;
        
        subscriptionsSnapshot.docs.forEach(doc => {
          const tokenData = doc.data().token;
          const failedToken = failedTokens.find(ft => ft.token === tokenData);
          if (failedToken) {
            // Only delete if it's an invalid token error
            if (failedToken.error && (
              failedToken.error.code === 'messaging/invalid-registration-token' ||
              failedToken.error.code === 'messaging/registration-token-not-registered'
            )) {
              batch.delete(doc.ref);
              deletedCount++;
            }
          }
        });
        
        if (deletedCount > 0) {
          await batch.commit();
          console.log(`Removed ${deletedCount} invalid tokens from subscriptions`);
        }
      }

      // Update notification request status
      await snap.ref.update({
        status: 'completed',
        sentCount: sentCount,
        failedCount: failedCount,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Successfully sent ${sentCount} notifications, ${failedCount} failed`);
      return null;
    } catch (error) {
      console.error('Error sending notifications:', error);
      await snap.ref.update({
        status: 'failed',
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return null;
    }
  }
);
