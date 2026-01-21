const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
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

      // Helper function to parse time string to hours and minutes
      function parseTime(timeStr) {
        let hours = 8;
        let minutes = 0;
        
        if (!timeStr || timeStr === 'TBD' || timeStr.trim() === '') {
          return { hours: 8, minutes: 0 };
        }
        
        const trimmed = timeStr.trim();
        
        // Handle HH:mm format (e.g., "08:00" or "8:00")
        if (trimmed.includes(':')) {
          const parts = trimmed.split(':');
          hours = parseInt(parts[0], 10);
          minutes = parseInt(parts[1] || '0', 10);
        } 
        // Handle HHMM format (e.g., "0800")
        else if (trimmed.length === 4 && /^\d{4}$/.test(trimmed)) {
          hours = parseInt(trimmed.substring(0, 2), 10);
          minutes = parseInt(trimmed.substring(2, 4), 10);
        }
        // Handle HH format (e.g., "8" -> 08:00)
        else if (trimmed.length <= 2 && /^\d+$/.test(trimmed)) {
          hours = parseInt(trimmed, 10);
          minutes = 0;
        }
        
        // Ensure valid range and return defaults if invalid
        if (isNaN(hours) || hours < 0 || hours > 23) {
          hours = 8;
        }
        if (isNaN(minutes) || minutes < 0 || minutes > 59) {
          minutes = 0;
        }
        
        return { hours, minutes };
      }

      // Helper function to format date-time for iCalendar (YYYYMMDDTHHMMSS)
      // Note: Using local time with TZID since we're in America/Chicago timezone
      function formatICalDateTime(dateStr, timeStr = '0800') {
        const date = formatICalDate(dateStr);
        const { hours, minutes } = parseTime(timeStr);
        
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
X-WR-TIMEZONE:America/New_York
`;
        
        // Add timezone definition for America/New_York (Eastern Time - Georgia uses this)
        icsContent += `BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:20071104T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20070311T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
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
          ? escapeICalText(descriptionParts.join('\n'))
          : escapeICalText('ROTC Training Event');
        
        // Get location from AO
        const location = event.ao && event.ao !== 'TBD' 
          ? escapeICalText(event.ao)
          : '';

        // Get hit time, default to 0800 if TBD or not present
        let hitTime = '0800';
        if (event.hitTime && event.hitTime !== 'TBD' && String(event.hitTime).trim() !== '') {
          hitTime = String(event.hitTime).trim();
        }
        
        // Get end time if provided
        let endTime = null;
        if (event.endTime && event.endTime !== 'TBD' && String(event.endTime).trim() !== '') {
          endTime = String(event.endTime).trim();
        }
        
        // Log for debugging
        console.log(`Event: ${event.name}, hitTime: "${event.hitTime}", endTime: "${event.endTime}"`);

        // Parse hitTime to get hours
        const { hours: startHours } = parseTime(hitTime);
        
        // For multi-day events, set end date to next day
        const isMultiDay = endDate !== startDate;
        const dtStart = formatICalDateTime(startDate, hitTime);
        
        // Calculate end time: use endTime if provided, otherwise calculate or omit
        let dtEnd = null;
        if (endTime) {
          // Use provided endTime
          dtEnd = formatICalDateTime(isMultiDay ? endDate : startDate, endTime);
        } else if (isMultiDay) {
          // Multi-day event without endTime: end at 8 PM on last day
          dtEnd = formatICalDateTime(endDate, '2000');
        }
        // If single-day and no endTime, don't set DTEND (event will show as start-time only)
        
        console.log(`  Start: ${dtStart}, End: ${dtEnd || 'not set'}, hitTime: ${hitTime}, endTime: ${endTime || 'not set'}`);

        const now = new Date();
        const nowDate = now.toISOString().split('T')[0];
        const dtStamp = formatICalDateTime(nowDate, '1200') + 'Z'; // DTSTAMP should be UTC
        
        // Build VEVENT with location field and timezone
        let vevent = `BEGIN:VEVENT
UID:rotc-event-${event.id}@bulldog-co-manager
DTSTAMP:${dtStamp}
DTSTART;TZID=America/New_York:${dtStart}
`;
        
        // Only add DTEND if endTime is provided or it's a multi-day event
        if (dtEnd) {
          vevent += `DTEND;TZID=America/New_York:${dtEnd}
`;
        }
        
        vevent += `SUMMARY:${eventName}
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

/**
 * Scheduled Cloud Function that backs up attendance data daily (Monday-Friday)
 * Runs at 11:00 PM EST every weekday
 * Stores backup in Firestore, overwriting the previous day's backup
 */
exports.dailyAttendanceBackup = onSchedule(
  {
    schedule: '0 23 * * 1-5', // 11:00 PM EST, Monday-Friday (1-5)
    timeZone: 'America/New_York',
    region: 'us-central1',
  },
  async (event) => {
    try {
      console.log('Starting daily attendance backup...');
      const db = admin.firestore();
      
      // Get all attendance records
      const attendanceSnapshot = await db.collection('attendance').get();
      
      const attendanceRecords = [];
      attendanceSnapshot.forEach((doc) => {
        attendanceRecords.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Found ${attendanceRecords.length} attendance records`);
      
      // Get current date for backup metadata
      const now = new Date();
      const backupDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Create backup document
      const backupData = {
        version: '1.0',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        backupDate: backupDate,
        recordCount: attendanceRecords.length,
        attendance: attendanceRecords
      };
      
      // Store backup in Firestore, using 'latest' as the document ID to overwrite each day
      // This ensures we always have the most recent backup accessible
      await db.collection('attendanceBackups').doc('latest').set(backupData);
      
      // Also store a date-specific backup for historical tracking
      await db.collection('attendanceBackups').doc(backupDate).set(backupData);
      
      console.log(`Backup completed successfully. Stored ${attendanceRecords.length} records.`);
      console.log(`Backup date: ${backupDate}`);
      
      return null;
    } catch (error) {
      console.error('Error creating attendance backup:', error);
      // Don't throw - we don't want failed backups to cause function failures
      return null;
    }
  }
);
