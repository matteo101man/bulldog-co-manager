/**
 * Script to generate an iCalendar (.ics) file for all training events
 * This file can be imported into calendar applications or hosted for QR code access
 * 
 * Usage:
 * Run: npx tsx scripts/generateCalendar.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

// Helper function to format date for iCalendar (YYYYMMDD)
function formatICalDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

// Helper function to format date-time for iCalendar (YYYYMMDDTHHMMSSZ)
function formatICalDateTime(dateStr: string, timeStr: string = '0800'): string {
  const date = formatICalDate(dateStr);
  // Convert time from HHMM to HH:MM format
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
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

async function generateCalendar() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Fetching training events...\n');

    // Get all training events
    const eventsRef = collection(db, 'trainingEvents');
    const q = query(eventsRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);

    const events: any[] = [];
    snapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Found ${events.length} events\n`);

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

    events.forEach((event, index) => {
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
      const dtStart = formatICalDateTime(startDate, '0800');
      const dtEnd = isMultiDay 
        ? formatICalDateTime(endDate, '2000') // End of last day
        : formatICalDateTime(startDate, '1700'); // End of same day

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

    // Write to file
    const outputPath = path.join(process.cwd(), 'public', 'rotc-training-schedule.ics');
    const outputDir = path.dirname(outputPath);
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, icsContent, 'utf8');
    
    console.log(`✓ Calendar file generated: ${outputPath}`);
    console.log(`\nTo create a QR code:`);
    console.log(`1. Host the file at: https://bulldog-co-manager.web.app/rotc-training-schedule.ics`);
    console.log(`2. Use a QR code generator (like https://www.qr-code-generator.com/)`);
    console.log(`3. Encode the URL: https://bulldog-co-manager.web.app/rotc-training-schedule.ics`);
    console.log(`\nOr use this direct link after deploying:`);
    console.log(`https://bulldog-co-manager.web.app/rotc-training-schedule.ics`);
    
  } catch (error) {
    console.error('Error generating calendar:', error);
    process.exit(1);
  }
}

generateCalendar();
