/**
 * Script to import training events into Firestore
 * 
 * Usage:
 * Run: npx tsx scripts/importTrainingEvents.ts
 * 
 * Make sure you have Firebase credentials set up correctly
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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
  planningStatus: 'complete' | 'in-progress' | 'issues';
  oicId?: string;
  ncoicId?: string;
  ao?: string;
  uniform?: string;
  mission?: string;
  conop?: any;
}

// Calculate dates: one upcoming (2 weeks from now) and one past (2 weeks ago)
const today = new Date();
const upcomingDate = new Date(today);
upcomingDate.setDate(today.getDate() + 14);
const pastDate = new Date(today);
pastDate.setDate(today.getDate() - 14);

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Example training events
const EVENTS: TrainingEventData[] = [
  {
    name: 'Field Training Exercise (FTX)',
    date: formatDate(upcomingDate),
    planningStatus: 'in-progress',
    ao: 'Training Area 7',
    uniform: 'ACU',
    mission: 'Conduct a 3-day field training exercise to evaluate cadet leadership and tactical skills in a simulated combat environment.',
    conop: {
      purpose: 'To provide hands-on training experience and evaluate cadet performance in field conditions.',
      mission: 'Conduct FTX at Training Area 7 from 0600 15SEP24 to 1800 17SEP24. Alternative location: Training Area 3.',
      situation: {
        oic: 'Smith, John',
        ncoic: 'Johnson, Sarah',
        date: '060015SEP24-180017SEP24',
        ao: 'Training Area 7',
        uniform: 'ACU'
      },
      endState: 'All cadets complete FTX with demonstrated competency in basic tactical operations.',
      conceptOfOperation: {
        phase1: 'Mentors and OIC arrive 15 min early to greet cadets and conduct safety brief.',
        phase2: 'First hour cadets get to know everyone in the battalion and hangout.',
        phase3: 'Cadets and mentors will get to talk and discuss expectations and get to know each other.',
        phase4: 'Cadets get back into battalion group and enjoy rest of night. Mentors and OIC last ones to leave.'
      },
      resources: {
        class1: 'MREs, Water, Snacks',
        class2: 'Uniform, Gear, Maps, M4s/AKs, Indiv. Items, see APPENDIX 2 for additional information.',
        class5: 'Does not apply.',
        class6: 'Hygiene & Recreational Items; Does not apply.',
        class8: 'CLS Bag, Litter'
      },
      keyDates: [
        '1745: OIC and mentors arrive to set-up',
        '1800: Cadets, cadre, and guests begin arrival',
        '1815: Begin ordering food',
        '2000: End of night'
      ],
      commsPace: {
        primary: 'Radio Channel 1',
        alternate: 'Radio Channel 2',
        contingency: 'Cell Phone',
        emergency: 'Satellite Phone'
      },
      tasksToSubs: 'Pre-/post-lab, ruck WP/SP/Pacers, MSIV instructors for lab, etc.',
      staffDuties: {
        s1: 'Personnel accountability and tracking',
        s2: 'Weather/crime rep. specific to event',
        s3: 'Training coordination and execution',
        s4: 'Supply fulfillment time, etc.',
        s5: 'Funds request goes here',
        s6: 'Specific comms needs'
      },
      resourceStatus: {
        missionGear: 'complete',
        finance: 'in-progress',
        riskAssessment: 'in-progress'
      },
      weeklyTasks: {
        t6: 'complete',
        t5: 'complete',
        t4: 'in-progress',
        t3: 'in-progress',
        t2: 'issues',
        t1: 'issues',
        tWeek: 'issues'
      }
    }
  },
  {
    name: 'Leadership Lab - Mentorship Night',
    date: formatDate(pastDate),
    planningStatus: 'complete',
    ao: 'ROTC Building',
    uniform: 'Civilian Attire',
    mission: 'Facilitate mentorship connections between MSIV cadets and underclassmen through structured activities and informal networking.',
    conop: {
      purpose: 'To establish mentorship relationships and provide guidance to underclassmen.',
      mission: 'Conduct mentorship night at ROTC Building from 1800-2000 on 01AUG24.',
      situation: {
        oic: 'Williams, Michael',
        ncoic: 'Brown, Emily',
        date: '180001AUG24-200001AUG24',
        ao: 'ROTC Building',
        uniform: 'Civilian Attire'
      },
      endState: 'All cadets paired with mentors and initial relationships established.',
      conceptOfOperation: {
        phase1: 'Mentors and OIC arrive 15 min early to greet cadets.',
        phase2: 'First hour cadets get to know everyone in the battalion and hangout.',
        phase3: 'Cadets and mentors will get to talk and discuss expectations and get to know each other.',
        phase4: 'Cadets get back into battalion group and enjoy rest of night. Mentors and OIC last ones to leave.'
      },
      resources: {
        class1: 'Snacks, MREs, Water, etc.',
        class2: 'Uniform, Gear, Maps, M4s/AKs, Indiv. Items, see APPENDIX 2 for additional information.',
        class5: 'Does not apply.',
        class6: 'Hygiene & Recreational Items; Does not apply.',
        class8: 'CLS Bag, Litter'
      },
      keyDates: [
        '1745: OIC and mentors arrive to set-up',
        '1800: Cadets, cadre, and guests begin arrival',
        '1815: Begin ordering food',
        '2000: End of night'
      ],
      commsPace: {
        primary: 'In-person',
        alternate: 'Group Chat',
        contingency: 'Phone',
        emergency: 'Emergency Contact List'
      },
      tasksToSubs: 'E.g. - Pre-/post-lab, ruck WP/SP/Pacers, MSIV instructors for lab, etc.',
      staffDuties: {
        s1: 'Attendance tracking',
        s2: 'Weather/crime rep. specific to event',
        s3: 'Activity coordination',
        s4: 'Supply fulfillment time, etc.',
        s5: 'Funds request goes here',
        s6: 'Specific comms needs'
      },
      resourceStatus: {
        missionGear: 'complete',
        finance: 'complete',
        riskAssessment: 'complete'
      },
      weeklyTasks: {
        t6: 'complete',
        t5: 'complete',
        t4: 'complete',
        t3: 'complete',
        t2: 'complete',
        t1: 'complete',
        tWeek: 'complete'
      }
    }
  }
];

async function importTrainingEvents() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log(`Starting import of ${EVENTS.length} training events...`);

    for (const event of EVENTS) {
      try {
        const docRef = await addDoc(collection(db, 'trainingEvents'), event);
        console.log(`✓ Added: ${event.name} (${docRef.id}) - Date: ${event.date}`);
      } catch (error) {
        console.error(`✗ Failed to add ${event.name}:`, error);
      }
    }

    console.log('\nImport complete!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importTrainingEvents();

