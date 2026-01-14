const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onRequest} = require('firebase-functions/v2/https');
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

/**
 * Cloud Function to generate and serve ROTC training schedule calendar (.ics file)
 * This endpoint generates the calendar dynamically from Firestore data
 * Users can subscribe to this URL in their calendar apps for automatic updates
 */
exports.getCalendar = onRequest(
  {
    region: 'us-central1',
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    try {
      console.log('Generating calendar from Firestore...');
      
      // Fetch all training events from Firestore, ordered by date
      const eventsSnapshot = await admin.firestore()
        .collection('trainingEvents')
        .orderBy('date', 'asc')
        .get();

      const events = [];
      eventsSnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });

      console.log(`Found ${events.length} events`);

      // Helper function to format date for iCalendar (YYYYMMDD)
      function formatICalDate(dateStr) {
        return dateStr.replace(/-/g, '');
      }

      // Helper function to format date-time for iCalendar (YYYYMMDDTHHMMSSZ)
      function formatICalDateTime(dateStr, timeStr = '0800') {
        const date = formatICalDate(dateStr);
        let hours = 8;
        let minutes = 0;
        
        if (timeStr && timeStr !== 'TBD') {
          if (timeStr.length === 4) {
            hours = parseInt(timeStr.substring(0, 2), 10);
            minutes = parseInt(timeStr.substring(2, 4), 10);
          } else if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            hours = parseInt(parts[0], 10);
            minutes = parseInt(parts[1] || '0', 10);
          }
        }
        
        return `${date}T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00Z`;
      }

      // Escape text for iCalendar format
      function escapeICalText(text) {
        if (!text) return '';
        return String(text)
          .replace(/\\/g, '\\\\')
          .replace(/;/g, '\\;')
          .replace(/,/g, '\\,')
          .replace(/\n/g, '\\n');
      }

      // Generate iCalendar content
      let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ROTC Training Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:ROTC Training Schedule
X-WR-CALDESC:Spring 2026 ROTC Training Events
X-WR-TIMEZONE:America/Chicago
`;

      events.forEach((event) => {
        const startDate = event.date;
        const endDate = event.endDate || event.date;
        const eventName = escapeICalText(event.name);
        const description = event.mission 
          ? escapeICalText(`Mission: ${event.mission}`)
          : escapeICalText('ROTC Training Event');
        
        const oic = event.oicId ? `OIC: ${event.oicId}` : '';
        const ncoic = event.ncoicId ? `NCOIC: ${event.ncoicId}` : '';
        const ao = event.ao && event.ao !== 'TBD' ? `Location: ${event.ao}` : '';
        
        const fullDescription = [description, oic, ncoic, ao]
          .filter(Boolean)
          .join('\\n');

        // For multi-day events, set end date to next day at 00:00
        const isMultiDay = endDate !== startDate;
        const dtStart = formatICalDateTime(startDate, event.hitTime || '0800');
        const dtEnd = isMultiDay 
          ? formatICalDateTime(endDate, '2000') // End of last day
          : formatICalDateTime(startDate, event.hitTime ? '1700' : '1700'); // End of same day

        const now = new Date();
        const nowDate = now.toISOString().split('T')[0];
        const dtStamp = formatICalDateTime(nowDate, '1200');
        
        icsContent += `BEGIN:VEVENT
UID:rotc-event-${event.id}@bulldog-co-manager
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${eventName}
DESCRIPTION:${fullDescription}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
`;
      });

      icsContent += `END:VCALENDAR`;

      // Set proper headers for calendar file
      res.set('Content-Type', 'text/calendar; charset=utf-8');
      res.set('Content-Disposition', 'inline; filename=rotc-training-schedule.ics');
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.status(200).send(icsContent);
      
      console.log(`Calendar generated successfully with ${events.length} events`);
    } catch (error) {
      console.error('Error generating calendar:', error);
      res.status(500).send('Error generating calendar: ' + error.message);
    }
  }
);
