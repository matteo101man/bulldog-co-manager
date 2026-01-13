/**
 * Script to update training events in Firestore
 * 
 * Usage:
 * Run: npx tsx scripts/updateTrainingEvents.ts
 * 
 * This script will:
 * 1. Delete all events except "leadership lab - mentor night" and rename it
 * 2. Add all new training events with OIC/NCOIC assignments, mission, and CONOPS
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

interface TrainingEventData {
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  endDate?: string; // ISO date string for multi-day events
  hitTime?: string;
  planningStatus: 'complete' | 'in-progress' | 'issues' | 'not-started';
  oicId?: string; // Can be cadet ID or text
  ncoicId?: string; // Can be cadet ID or text
  ao?: string;
  uniform?: string;
  mission?: string;
  conop?: any;
}

// Helper function to parse dates like "22-25 Jan", "03-04 FEB", "9th MAY", "21st MAR", etc.
// Assumes current year (2026)
function parseDateRange(dateStr: string): { start: string; end: string } {
  const currentYear = 2026;
  const monthMap: { [key: string]: number } = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
  };

  // Remove extra spaces and convert to uppercase
  const cleaned = dateStr.trim().toUpperCase();
  
  // Match patterns like "22-25 JAN", "03-04 FEB", "9th MAY", "21st MAR", "18th FEB"
  // First try range pattern: "22-25 JAN" or "22 - 25 JAN"
  const rangeMatch = cleaned.match(/(\d+)(?:st|nd|rd|th)?\s*-\s*(\d+)(?:st|nd|rd|th)?\s+([A-Z]{3})/);
  // Then try single date: "9th MAY" or "21 MAR" or "18 FEB"
  const singleMatch = cleaned.match(/(\d+)(?:st|nd|rd|th)?\s+([A-Z]{3})/);
  
  if (rangeMatch) {
    const [, startDay, endDay, month] = rangeMatch;
    const monthNum = monthMap[month];
    if (!monthNum) {
      throw new Error(`Invalid month: ${month}`);
    }
    return {
      start: `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(parseInt(startDay)).padStart(2, '0')}`,
      end: `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(parseInt(endDay)).padStart(2, '0')}`
    };
  } else if (singleMatch) {
    const [, day, month] = singleMatch;
    const monthNum = monthMap[month];
    if (!monthNum) {
      throw new Error(`Invalid month: ${month}`);
    }
    const dateStr = `${currentYear}-${String(monthNum).padStart(2, '0')}-${String(parseInt(day)).padStart(2, '0')}`;
    return { start: dateStr, end: dateStr };
  }
  
  throw new Error(`Could not parse date: ${dateStr}`);
}

function formatDate(dateStr: string): string {
  const { start } = parseDateRange(dateStr);
  return start;
}

function formatEndDate(dateStr: string): string {
  const { end } = parseDateRange(dateStr);
  return end;
}

// Helper function to format date with abbreviated month (e.g., "22-25 JAN 2025")
function formatDateWithAbbrMonth(dateStr: string, endDateStr?: string): string {
  const monthAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  function formatSingleDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    return `${day}${monthAbbr[month - 1]}${year}`;
  }
  
  if (endDateStr && endDateStr !== dateStr) {
    return `${formatSingleDate(dateStr)} - ${formatSingleDate(endDateStr)}`;
  }
  return formatSingleDate(dateStr);
}

// Helper function to create CONOPS based on event type
function createConop(eventName: string, oic: string, ncoic: string, date: string, endDate?: string): any {
  const dateStr = formatDateWithAbbrMonth(date, endDate);
  
  return {
    purpose: `To execute ${eventName.toLowerCase()} in accordance with ROTC training requirements.`,
    mission: `Conduct ${eventName} on ${dateStr}.`,
    situation: {
      oic: oic || 'TBD',
      ncoic: ncoic || 'TBD',
      date: dateStr,
      ao: 'TBD',
      uniform: 'TBD'
    },
    endState: `Successfully complete ${eventName} with all objectives met.`,
    conceptOfOperation: {
      phase1: 'Pre-event preparation and coordination.',
      phase1Label: 'Preparation',
      phase2: 'Event execution and monitoring.',
      phase2Label: 'Execution',
      phase3: 'Post-event activities and debrief.',
      phase3Label: 'Completion',
      phase4: 'Final reporting and documentation.',
      phase4Label: 'Reporting'
    },
    resources: {
      class1: 'TBD',
      class2: 'TBD',
      class5: 'TBD',
      class6: 'TBD',
      class8: 'TBD'
    },
    keyDates: [
      'TBD: Event start time',
      'TBD: Key milestones',
      'TBD: Event completion'
    ],
    commsPace: {
      primary: 'TBD',
      alternate: 'TBD',
      contingency: 'TBD',
      emergency: 'TBD'
    },
    tasksToSubs: 'TBD',
    staffDuties: {
      s1: 'TBD',
      s2: 'TBD',
      s3: 'TBD',
      s4: 'TBD',
      s5: 'TBD',
      s6: 'TBD'
    },
    resourceStatus: {
      missionGear: 'not-started',
      finance: 'not-started',
      riskAssessment: 'not-started'
    },
    weeklyTasks: {
      t6: { status: 'not-started', description: 'TBD' },
      t5: { status: 'not-started', description: 'TBD' },
      t4: { status: 'not-started', description: 'TBD' },
      t3: { status: 'not-started', description: 'TBD' },
      t2: { status: 'not-started', description: 'TBD' },
      t1: { status: 'not-started', description: 'TBD' },
      tWeek: { status: 'not-started', description: 'TBD' }
    }
  };
}

// New training events based on user requirements
const NEW_EVENTS: TrainingEventData[] = [
  {
    name: 'Welcome Back Lab',
    date: formatDate('15 JAN'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Tactics OICs',
    ao: 'TBD',
    mission: 'Welcome cadets back for the spring semester with orientation and training updates.',
    conop: createConop('Welcome Back Lab', 'Tactics OICs', '', formatDate('15 JAN'))
  },
  {
    name: 'Ranger Challenge Competition',
    date: formatDate('22-25 JAN'),
    endDate: formatEndDate('22-25 JAN'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Tactics OICs',
    ao: 'TBD',
    mission: 'Conduct Ranger Challenge Competition to evaluate cadet tactical skills, physical fitness, and leadership capabilities in a competitive environment.',
    conop: createConop('Ranger Challenge Competition', 'Tactics OICs', '', formatDate('22-25 JAN'), formatEndDate('22-25 JAN'))
  },
  {
    name: 'Army Fitness Test 1',
    date: formatDate('03-04 FEB'),
    endDate: formatEndDate('03-04 FEB'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Fagan/Maddux + protégé',
    ao: 'TBD',
    mission: 'Conduct Army Fitness Test (AFT) 1 to assess cadet physical fitness levels and readiness.',
    conop: createConop('Army Fitness Test 1', 'Fagan/Maddux + protégé', '', formatDate('03-04 FEB'), formatEndDate('03-04 FEB'))
  },
  {
    name: 'Basic Rifle Marksmanship',
    date: formatDate('24 MAR'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Fagan',
    ao: 'TBD',
    mission: 'Conduct Basic Rifle Marksmanship (BRM) training to develop cadet marksmanship skills and weapons handling proficiency.',
    conop: createConop('Basic Rifle Marksmanship', 'Fagan', '', formatDate('24 MAR'))
  },
  {
    name: 'Army Fitness Test 2',
    date: formatDate('14-15 APR'),
    endDate: formatEndDate('14-15 APR'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Fagan/Maddux + protégé',
    ao: 'TBD',
    mission: 'Conduct Army Fitness Test (AFT) 2 to reassess cadet physical fitness levels and track progress.',
    conop: createConop('Army Fitness Test 2', 'Fagan/Maddux + protégé', '', formatDate('14-15 APR'), formatEndDate('14-15 APR'))
  },
  {
    name: 'Spring Field Training Exercise',
    date: formatDate('16-19 APR'),
    endDate: formatEndDate('16-19 APR'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Cadre w/ Tactics OIC coord',
    ao: 'TBD',
    mission: 'Conduct Spring Field Training Exercise (FTX) to provide comprehensive field training experience and evaluate cadet performance in tactical scenarios.',
    conop: createConop('Spring Field Training Exercise', 'Cadre w/ Tactics OIC coord', '', formatDate('16-19 APR'), formatEndDate('16-19 APR'))
  },
  {
    name: '8 Mile Ruck',
    date: formatDate('18 FEB'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Tactics OICs',
    ao: 'TBD',
    mission: 'Conduct 8-mile ruck march to build cadet endurance, mental toughness, and tactical movement capabilities.',
    conop: createConop('8 Mile Ruck', 'Tactics OICs', '', formatDate('18 FEB'))
  },
  {
    name: 'End of Semester 12 Mile Ruck',
    date: formatDate('23 APR'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Tactics OICs',
    ao: 'TBD',
    mission: 'Conduct End of Semester Lab 12-mile ruck march as a culminating physical training event.',
    conop: createConop('End of Semester 12 Mile Ruck', 'Tactics OICs', '', formatDate('23 APR'))
  },
  {
    name: 'Day/Night Lab',
    date: formatDate('02 APR'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Tactics OICs',
    ao: 'TBD',
    mission: 'Conduct Day/Night Lab training for MS3 cadets focusing on tactical operations in varying light conditions.',
    conop: createConop('Day/Night Lab', 'Tactics OICs', '', formatDate('02 APR'))
  },
  {
    name: 'CAIT School Tryouts',
    date: formatDate('17-20 FEB'),
    endDate: formatEndDate('17-20 FEB'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Fagan, Evans, Guerra, Jackson',
    ao: 'TBD',
    mission: 'Conduct CAIT School tryouts to select cadets competing for slots at Army schools such as Airborne, Air Assault, and other advanced training opportunities.',
    conop: createConop('CAIT School Tryouts', 'Fagan, Evans, Guerra, Jackson', '', formatDate('17-20 FEB'), formatEndDate('17-20 FEB'))
  },
  {
    name: '5K',
    date: formatDate('21 MAR'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'McFadden',
    ncoicId: 'Donahoe',
    ao: 'TBD',
    mission: 'Conduct 5K run event to promote physical fitness and unit cohesion.',
    conop: createConop('5K', 'McFadden', 'Donahoe', formatDate('21 MAR'))
  },
  {
    name: 'Commissioning',
    date: formatDate('09 MAY'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Bubak',
    ncoicId: 'Phillips',
    ao: 'TBD',
    mission: 'Conduct commissioning ceremony to recognize and celebrate cadets transitioning to commissioned officers.',
    conop: createConop('Commissioning', 'Bubak', 'Phillips', formatDate('09 MAY'))
  },
  {
    name: 'Mill Ball / Awards',
    date: formatDate('09 APR'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Navarro',
    ncoicId: 'Adkinson',
    ao: 'TBD',
    mission: 'Conduct Military Ball and Awards ceremony to recognize cadet achievements and celebrate unit accomplishments.',
    conop: createConop('Mill Ball / Awards', 'Navarro', 'Adkinson', formatDate('09 APR'))
  },
  {
    name: 'Height/Weight & CST Layout',
    date: formatDate('11 FEB'),
    hitTime: 'TBD',
    planningStatus: 'in-progress',
    oicId: 'Tactics OICs',
    ao: 'TBD',
    mission: 'Conduct Height/Weight assessment and CST (Cadet Summer Training) Layout to assess cadet physical standards and layout equipment for MS3s preparing for Cadet Summer Training.',
    conop: createConop('Height/Weight & CST Layout', 'Tactics OICs', '', formatDate('11 FEB'))
  }
];

async function updateTrainingEvents() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Starting training events update...\n');

    // Step 1: Get all existing events
    const eventsRef = collection(db, 'trainingEvents');
    const snapshot = await getDocs(eventsRef);
    
    console.log(`Found ${snapshot.size} existing events`);

    // Step 2: Find and update "leadership lab - mentor night" (case-insensitive)
    let mentorNightEvent: any = null;
    const eventsToDelete: string[] = [];

    snapshot.forEach((docSnap) => {
      const eventData = docSnap.data();
      const eventName = eventData.name?.toLowerCase() || '';
      
      if (eventName.includes('leadership lab') && 
          (eventName.includes('mentor') || eventName.includes('mentorship'))) {
        mentorNightEvent = { id: docSnap.id, ...eventData };
        console.log(`Found mentor night event: ${eventData.name} (${docSnap.id})`);
      } else {
        eventsToDelete.push(docSnap.id);
      }
    });

    // Step 3: Delete all other events
    console.log(`\nDeleting ${eventsToDelete.length} events...`);
    for (const eventId of eventsToDelete) {
      try {
        await deleteDoc(doc(db, 'trainingEvents', eventId));
        console.log(`  ✓ Deleted event: ${eventId}`);
      } catch (error) {
        console.error(`  ✗ Failed to delete ${eventId}:`, error);
      }
    }

    // Step 4: Update mentor night event name
    if (mentorNightEvent) {
      try {
        await updateDoc(doc(db, 'trainingEvents', mentorNightEvent.id), {
          name: 'leadership lab - mentor night (test)'
        });
        console.log(`\n✓ Renamed mentor night event to: leadership lab - mentor night (test)`);
      } catch (error) {
        console.error(`✗ Failed to rename mentor night event:`, error);
      }
    } else {
      console.log('\n⚠ Warning: Could not find "leadership lab - mentor night" event');
      console.log('Creating it as a new event...');
      const newMentorNight: TrainingEventData = {
        name: 'leadership lab - mentor night (test)',
        date: '2026-01-15', // Placeholder date
        planningStatus: 'in-progress',
        ao: 'TBD',
        mission: 'Facilitate mentorship connections between MSIV cadets and underclassmen.',
        conop: createConop('leadership lab - mentor night (test)', '', '', '2026-01-15')
      };
      await addDoc(collection(db, 'trainingEvents'), newMentorNight);
      console.log('✓ Created mentor night event');
    }

    // Step 5: Add all new events
    console.log(`\nAdding ${NEW_EVENTS.length} new events...`);
    for (const event of NEW_EVENTS) {
      try {
        const docRef = await addDoc(collection(db, 'trainingEvents'), event);
        console.log(`  ✓ Added: ${event.name} (${docRef.id}) - Date: ${event.date}${event.endDate ? ` to ${event.endDate}` : ''}`);
      } catch (error) {
        console.error(`  ✗ Failed to add ${event.name}:`, error);
      }
    }

    console.log('\n✓ Update complete!');
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

updateTrainingEvents();
