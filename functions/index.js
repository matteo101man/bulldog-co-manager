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

      // Helper function to format date-time for iCalendar (YYYYMMDDTHHMMSS)
      // Note: Using local time (no Z) since we're in America/Chicago timezone
      function formatICalDateTime(dateStr, timeStr = '0800') {
        const date = formatICalDate(dateStr);
        let hours = 8;
        let minutes = 0;
        
        if (timeStr && timeStr !== 'TBD' && timeStr.trim() !== '') {
          // Handle HH:mm format (e.g., "08:00")
          if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            hours = parseInt(parts[0], 10) || 8;
            minutes = parseInt(parts[1] || '0', 10) || 0;
          } 
          // Handle HHMM format (e.g., "0800")
          else if (timeStr.length === 4 && /^\d{4}$/.test(timeStr)) {
            hours = parseInt(timeStr.substring(0, 2), 10) || 8;
            minutes = parseInt(timeStr.substring(2, 4), 10) || 0;
          }
          // Handle HH format (e.g., "8" -> 08:00)
          else if (timeStr.length <= 2 && /^\d+$/.test(timeStr)) {
            hours = parseInt(timeStr, 10) || 8;
            minutes = 0;
          }
        }
        
        // Ensure valid range
        hours = Math.max(0, Math.min(23, hours));
        minutes = Math.max(0, Math.min(59, minutes));
        
        // Return in local time format (no Z suffix) - calendar apps will use TZID
        return `${date}T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;
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
        
        // Add timezone definition for America/Chicago
        icsContent += `BEGIN:VTIMEZONE
TZID:America/Chicago
BEGIN:STANDARD
DTSTART:20071104T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZOFFSETFROM:-0500
TZOFFSETTO:-0600
TZNAME:CST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20070311T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZOFFSETFROM:-0600
TZOFFSETTO:-0500
TZNAME:CDT
END:DAYLIGHT
END:VTIMEZONE
`;

      events.forEach((event) => {
        const startDate = event.date;
        const endDate = event.endDate || event.date;
        const eventName = escapeICalText(event.name);
        
        // Build description with only mission and uniform
        const descriptionParts = [];
        if (event.mission) {
          descriptionParts.push(`Mission: ${event.mission}`);
        }
        if (event.uniform && event.uniform !== 'TBD') {
          descriptionParts.push(`Uniform: ${event.uniform}`);
        }
        const fullDescription = descriptionParts.length > 0 
          ? escapeICalText(descriptionParts.join('\\n'))
          : escapeICalText('ROTC Training Event');
        
        // Get location from AO
        const location = event.ao && event.ao !== 'TBD' 
          ? escapeICalText(event.ao)
          : '';

        // Get hit time, default to 0800 if TBD or not present
        let hitTime = '0800';
        if (event.hitTime && event.hitTime !== 'TBD' && event.hitTime.trim() !== '') {
          hitTime = event.hitTime;
        }
        
        // Log for debugging
        console.log(`Event: ${event.name}, hitTime from DB: ${event.hitTime}, using: ${hitTime}`);

        // For multi-day events, set end date to next day at 20:00 (8 PM)
        const isMultiDay = endDate !== startDate;
        const dtStart = formatICalDateTime(startDate, hitTime);
        
        // Calculate end time: for single-day events, add 9 hours to start time (or default to 5 PM)
        // For multi-day events, end at 8 PM on the last day
        let endTime = '1700'; // Default end time (5 PM)
        if (!isMultiDay) {
          // Parse hitTime to calculate end time (start + 9 hours)
          let startHours = 8;
          if (hitTime && hitTime !== 'TBD' && hitTime.trim() !== '') {
            if (hitTime.includes(':')) {
              startHours = parseInt(hitTime.split(':')[0], 10) || 8;
            } else if (hitTime.length === 4) {
              startHours = parseInt(hitTime.substring(0, 2), 10) || 8;
            }
          }
          const endHours = Math.min(23, startHours + 9); // Add 9 hours, cap at 11 PM
          endTime = String(endHours).padStart(2, '0') + '00';
        } else {
          endTime = '2000'; // 8 PM for multi-day events
        }
        
        const dtEnd = formatICalDateTime(isMultiDay ? endDate : startDate, endTime);

        const now = new Date();
        const nowDate = now.toISOString().split('T')[0];
        const dtStamp = formatICalDateTime(nowDate, '1200') + 'Z'; // DTSTAMP should be UTC
        
        // Build VEVENT with location field and timezone
        let vevent = `BEGIN:VEVENT
UID:rotc-event-${event.id}@bulldog-co-manager
DTSTAMP:${dtStamp}
DTSTART;TZID=America/Chicago:${dtStart}
DTEND;TZID=America/Chicago:${dtEnd}
SUMMARY:${eventName}
DESCRIPTION:${fullDescription}
STATUS:CONFIRMED
SEQUENCE:0
`;
        
        // Add location if available
        if (location) {
          vevent += `LOCATION:${location}
`;
        }
        
        vevent += `END:VEVENT
`;
        
        icsContent += vevent;
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
