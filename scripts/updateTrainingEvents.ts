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

// Helper function to create detailed CONOPS based on event type
function createConop(eventName: string, oic: string, ncoic: string, date: string, endDate?: string, eventType?: string): any {
  const dateStr = formatDateWithAbbrMonth(date, endDate);
  const isMultiDay = endDate && endDate !== date;
  
  // Determine event type from name if not provided
  const type = eventType || eventName.toLowerCase();
  
  // Base CONOPS structure
  let conop: any = {
    purpose: '',
    mission: '',
    situation: {
      oic: oic || 'TBD',
      ncoic: ncoic || 'TBD',
      date: dateStr,
      ao: 'TBD',
      uniform: 'TBD'
    },
    endState: '',
    conceptOfOperation: {},
    resources: {},
    keyDates: [],
    commsPace: {
      primary: 'Radio/Phone',
      alternate: 'Text Message',
      contingency: 'In-Person',
      emergency: '911/Cadre Emergency Contact'
    },
    tasksToSubs: '',
    staffDuties: {
      s1: 'Personnel accountability, attendance tracking, and roster management',
      s2: 'Intelligence gathering, weather monitoring, and threat assessment',
      s3: 'Training coordination, timeline management, and operations execution',
      s4: 'Supply and logistics coordination, equipment accountability',
      s5: 'Public affairs, media coordination, and event documentation',
      s6: 'Communications planning, radio frequencies, and signal operations'
    },
    resourceStatus: {
      missionGear: 'not-started',
      finance: 'not-started',
      riskAssessment: 'not-started'
    },
    weeklyTasks: {
      t6: { status: 'not-started', description: 'Final coordination and confirmation' },
      t5: { status: 'not-started', description: 'Equipment and supply verification' },
      t4: { status: 'not-started', description: 'Briefings and final preparations' },
      t3: { status: 'not-started', description: 'Pre-event checks and setup' },
      t2: { status: 'not-started', description: 'Last minute coordination' },
      t1: { status: 'not-started', description: 'Event execution day' },
      tWeek: { status: 'not-started', description: 'Post-event recovery and reporting' }
    }
  };

  // Event-specific CONOPS
  if (type.includes('welcome back') || type.includes('lab')) {
    conop.purpose = 'To welcome cadets back for the spring semester and provide orientation on upcoming training events, expectations, and semester objectives.';
    conop.mission = `Conduct Welcome Back Lab at ROTC Building on ${dateStr} from 1800-2000. Provide semester overview, training schedule, and unit expectations.`;
    conop.situation.ao = 'ROTC Building';
    conop.situation.uniform = 'Civilian Attire or ACU';
    conop.endState = 'All cadets receive semester orientation, understand training schedule, and are prepared for spring semester activities.';
    conop.conceptOfOperation = {
      phase1: 'OIC and staff arrive 15 minutes early to set up briefing materials and welcome area.',
      phase1Label: 'Setup',
      phase2: 'Cadets arrive and sign in. OIC provides welcome brief and semester overview.',
      phase2Label: 'Welcome Brief',
      phase3: 'Breakout sessions by MS level to discuss specific training requirements and expectations.',
      phase3Label: 'Breakout Sessions',
      phase4: 'Q&A session, distribute training schedules, and dismissal.',
      phase4Label: 'Q&A and Dismissal'
    };
    conop.resources = {
      class1: 'Water, snacks, refreshments',
      class2: 'Briefing materials, handouts, sign-in sheets',
      class5: 'N/A',
      class6: 'N/A',
      class8: 'First aid kit'
    };
    conop.keyDates = [
      '1745: Staff arrival and setup',
      '1800: Cadet arrival and sign-in',
      '1815: Welcome brief begins',
      '1900: Breakout sessions',
      '1945: Q&A and closing',
      '2000: Dismissal'
    ];
    conop.tasksToSubs = 'MSIVs assist with sign-in and breakout session facilitation.';
  }
  else if (type.includes('ranger challenge') || type.includes('rc competition')) {
    conop.purpose = 'To evaluate cadet tactical skills, physical fitness, and leadership capabilities through competitive military tasks in a team environment.';
    conop.mission = `Conduct Ranger Challenge Competition from ${dateStr}. Teams compete in events including land navigation, marksmanship, ruck march, obstacle course, and tactical tasks.`;
    conop.situation.ao = 'Training Area / Competition Site';
    conop.situation.uniform = 'ACU with Ruck Sack';
    conop.endState = 'All teams complete competition events. Winners determined and recognized. Cadets demonstrate proficiency in tactical and physical skills.';
    conop.conceptOfOperation = {
      phase1: 'Team arrival, equipment inspection, and safety brief. OIC coordinates with judges and event supervisors.',
      phase1Label: 'Reception & Staging',
      phase2: 'Competition events execution: land navigation, marksmanship, ruck march, obstacle course, and tactical lanes.',
      phase2Label: 'Competition Execution',
      phase3: 'Scoring, event completion, and team recovery.',
      phase3Label: 'Scoring & Recovery',
      phase4: 'Awards ceremony, equipment turn-in, and departure.',
      phase4Label: 'Awards & Departure'
    };
    conop.resources = {
      class1: 'MREs, water, Gatorade, snacks for competitors and staff',
      class2: 'ACU uniforms, ruck sacks (35-45 lbs), compasses, maps, individual equipment',
      class5: 'Training ammunition for marksmanship events',
      class6: 'Personal hygiene items, sunscreen',
      class8: 'First aid supplies, CLS bags, medical support'
    };
    conop.keyDates = [
      '0600: Team arrival and equipment inspection',
      '0630: Safety brief and event overview',
      '0700: Competition events begin',
      '1200: Lunch break',
      '1300: Competition events resume',
      '1700: Final event completion',
      '1730: Scoring and awards ceremony',
      '1800: Equipment turn-in and departure'
    ];
    conop.tasksToSubs = 'MSIVs serve as event judges and safety officers. MSIII cadets coordinate team logistics.';
  }
  else if (type.includes('army fitness test') || type.includes('aft')) {
    const testNumber = type.includes('1') ? '1' : '2';
    conop.purpose = `To assess cadet physical fitness levels and readiness through standardized Army Fitness Test (AFT) ${testNumber} evaluation.`;
    conop.mission = `Conduct Army Fitness Test ${testNumber} on ${dateStr}. All cadets will complete the AFT consisting of deadlift, standing power throw, hand-release push-ups, sprint-drag-carry, leg tuck, and 2-mile run.`;
    conop.situation.ao = 'PT Field / Track';
    conop.situation.uniform = 'PT Uniform';
    conop.endState = `All cadets complete AFT ${testNumber} with scores recorded. Physical fitness baseline established for spring semester.`;
    conop.conceptOfOperation = {
      phase1: 'Setup testing stations, equipment inspection, and cadet arrival/warm-up period.',
      phase1Label: 'Setup & Warm-up',
      phase2: 'AFT event execution: deadlift, standing power throw, hand-release push-ups, sprint-drag-carry, leg tuck, and 2-mile run.',
      phase2Label: 'Test Execution',
      phase3: 'Score recording, equipment recovery, and cool-down period.',
      phase3Label: 'Scoring & Recovery',
      phase4: 'Results brief, dismissal, and equipment turn-in.',
      phase4Label: 'Results & Dismissal'
    };
    conop.resources = {
      class1: 'Water, Gatorade, recovery snacks',
      class2: 'PT uniforms, testing equipment (deadlift bar, kettlebells, sled, etc.)',
      class5: 'N/A',
      class6: 'Personal hygiene items, towels',
      class8: 'First aid kit, ice packs, medical support'
    };
    conop.keyDates = [
      '0530: Equipment setup and station preparation',
      '0600: Cadet arrival and warm-up',
      '0630: Safety brief and test instructions',
      '0645: AFT events begin',
      '0830: Test completion',
      '0845: Score recording and cool-down',
      '0900: Results brief and dismissal'
    ];
    conop.tasksToSubs = 'MSIVs serve as test administrators and score recorders. MSIII cadets assist with equipment setup and recovery.';
  }
  else if (type.includes('basic rifle marksmanship') || type.includes('brm')) {
    conop.purpose = 'To develop cadet marksmanship skills and weapons handling proficiency through Basic Rifle Marksmanship training.';
    conop.mission = `Conduct Basic Rifle Marksmanship (BRM) training on ${dateStr} at designated range. Cadets will receive instruction on weapons safety, fundamentals of marksmanship, and live-fire qualification.`;
    conop.situation.ao = 'Rifle Range';
    conop.situation.uniform = 'ACU';
    conop.endState = 'All cadets complete BRM training with demonstrated proficiency in weapons safety and marksmanship fundamentals. Qualification scores recorded.';
    conop.conceptOfOperation = {
      phase1: 'Range setup, safety brief, weapons issue, and zero procedures.',
      phase1Label: 'Range Setup & Zero',
      phase2: 'Marksmanship instruction, dry-fire practice, and live-fire qualification.',
      phase2Label: 'Training & Qualification',
      phase3: 'Weapons cleaning, score recording, and equipment recovery.',
      phase3Label: 'Recovery',
      phase4: 'After-action review, weapons turn-in, and dismissal.',
      phase4Label: 'AAR & Dismissal'
    };
    conop.resources = {
      class1: 'MREs, water, snacks',
      class2: 'ACU uniforms, eye and ear protection, cleaning supplies',
      class5: 'Training ammunition (.22LR or 5.56mm)',
      class6: 'N/A',
      class8: 'First aid kit, medical support'
    };
    conop.keyDates = [
      '0700: Range setup and safety inspection',
      '0800: Cadet arrival and safety brief',
      '0830: Weapons issue and zero procedures',
      '1000: Marksmanship instruction',
      '1100: Live-fire qualification',
      '1300: Lunch break',
      '1400: Weapons cleaning',
      '1500: Score recording and AAR',
      '1600: Weapons turn-in and dismissal'
    ];
    conop.tasksToSubs = 'Range Safety Officers (RSOs) from cadre. MSIVs assist with instruction and score recording.';
  }
  else if (type.includes('field training exercise') || type.includes('ftx') || type.includes('spring ftx')) {
    conop.purpose = 'To provide comprehensive field training experience and evaluate cadet performance in tactical scenarios through a multi-day field training exercise.';
    conop.mission = `Conduct Spring Field Training Exercise (FTX) from ${dateStr}. Cadets will execute tactical operations including land navigation, patrolling, defensive positions, and leadership evaluation in a field environment.`;
    conop.situation.ao = 'Training Area / Field Site';
    conop.situation.uniform = 'ACU';
    conop.endState = 'All cadets complete FTX with demonstrated competency in tactical operations and leadership. Training objectives met and after-action review conducted.';
    conop.conceptOfOperation = {
      phase1: 'Movement to training area, site occupation, and initial tactical setup.',
      phase1Label: 'Movement & Occupation',
      phase2: 'Tactical training execution: land navigation, patrolling, defensive operations, and leadership rotations.',
      phase2Label: 'Tactical Training',
      phase3: 'Final exercise, equipment recovery, and site cleanup.',
      phase3Label: 'Final Exercise & Recovery',
      phase4: 'After-action review, equipment turn-in, and departure.',
      phase4Label: 'AAR & Departure'
    };
    conop.resources = {
      class1: 'MREs, water, hot meals (if available), snacks',
      class2: 'ACU uniforms, ruck sacks, sleeping systems, individual equipment, maps, compasses',
      class5: 'Training ammunition, blank rounds, pyrotechnics',
      class6: 'Personal hygiene items, field sanitation supplies',
      class8: 'CLS bags, medical supplies, litter, medical evacuation plan'
    };
    conop.keyDates = [
      '0600: Departure from ROTC Building',
      '0800: Arrival at training area',
      '0830: Site occupation and initial brief',
      '0900: Tactical training begins',
      '1200: Lunch break',
      '1300: Training continues',
      '1800: Evening meal and leadership rotation',
      '2000: Night operations',
      '2200: Security and rest',
      '0600: Final exercise',
      '1200: Equipment recovery',
      '1400: AAR and departure'
    ];
    conop.tasksToSubs = 'Cadre provide OPFOR and evaluation. MSIVs serve as team leaders. MSIII cadets execute tactical tasks.';
  }
  else if (type.includes('ruck') || type.includes('mile')) {
    const distance = type.includes('8') ? '8-mile' : type.includes('12') ? '12-mile' : '';
    conop.purpose = `To build cadet endurance, mental toughness, and tactical movement capabilities through a ${distance} ruck march under load.`;
    conop.mission = `Conduct ${distance} ruck march on ${dateStr}. Cadets will complete the ruck march with 35-45 lb ruck sacks following designated route within time standard.`;
    conop.situation.ao = 'Designated Ruck Route';
    conop.situation.uniform = 'ACU with Ruck Sack';
    conop.endState = `All cadets complete ${distance} ruck march within time standard. Physical endurance and mental resilience demonstrated.`;
    conop.conceptOfOperation = {
      phase1: 'Ruck inspection, weight verification, safety brief, and route overview.',
      phase1Label: 'Preparation & Brief',
      phase2: 'Ruck march execution with water points and safety monitoring.',
      phase2Label: 'Ruck March',
      phase3: 'Finish line operations, recovery, and equipment accountability.',
      phase3Label: 'Recovery',
      phase4: 'After-action review, equipment turn-in, and dismissal.',
      phase4Label: 'AAR & Dismissal'
    };
    conop.resources = {
      class1: 'Water, Gatorade, recovery snacks at water points and finish',
      class2: 'ACU uniforms, ruck sacks (35-45 lbs), boots, individual equipment',
      class5: 'N/A',
      class6: 'Personal hygiene items, blister prevention supplies',
      class8: 'Medical support vehicle, first aid supplies, hydration monitoring'
    };
    conop.keyDates = [
      '0530: Equipment setup and ruck inspection',
      '0600: Cadet arrival and weight verification',
      '0630: Safety brief and route overview',
      '0700: Ruck march begins',
      '1000: Mid-point water point (for 12-mile)',
      '1200: Finish line operations begin',
      '1300: Recovery and equipment accountability',
      '1400: AAR and dismissal'
    ];
    conop.tasksToSubs = 'Safety vehicles follow route. MSIVs serve as pace setters and safety monitors. Water point support from MSIII cadets.';
  }
  else if (type.includes('day/night lab')) {
    conop.purpose = 'To train MS3 cadets in tactical operations during varying light conditions, emphasizing day and night operations differences.';
    conop.mission = `Conduct Day/Night Lab training on ${dateStr} for MS3 cadets. Training will cover tactical movement, patrolling, and operations in both daylight and low-light conditions.`;
    conop.situation.ao = 'Training Area';
    conop.situation.uniform = 'ACU';
    conop.endState = 'MS3 cadets demonstrate proficiency in day and night tactical operations. Understanding of light discipline and night operations principles established.';
    conop.conceptOfOperation = {
      phase1: 'Arrival, equipment issue, and day operations brief.',
      phase1Label: 'Setup & Day Brief',
      phase2: 'Day tactical operations: movement, patrolling, and tactical tasks.',
      phase2Label: 'Day Operations',
      phase3: 'Transition to night operations with light discipline procedures.',
      phase3Label: 'Night Operations',
      phase4: 'After-action review, equipment turn-in, and dismissal.',
      phase4Label: 'AAR & Dismissal'
    };
    conop.resources = {
      class1: 'MREs, water, snacks',
      class2: 'ACU uniforms, individual equipment, maps, compasses, red lens flashlights',
      class5: 'N/A',
      class6: 'N/A',
      class8: 'First aid kit'
    };
    conop.keyDates = [
      '1300: Cadet arrival and equipment issue',
      '1330: Day operations brief',
      '1400: Day tactical training',
      '1700: Evening meal',
      '1900: Night operations brief',
      '2000: Night tactical training',
      '2200: AAR and equipment turn-in',
      '2230: Dismissal'
    ];
    conop.tasksToSubs = 'MSIVs serve as instructors and evaluators. Cadre provide oversight and safety.';
  }
  else if (type.includes('cait school tryouts') || type.includes('tryouts')) {
    conop.purpose = 'To select cadets competing for slots at Army schools such as Airborne, Air Assault, and other advanced training opportunities through competitive evaluation.';
    conop.mission = `Conduct CAIT School Tryouts from ${dateStr}. Evaluate cadets through physical fitness tests, leadership scenarios, and competitive events to determine selection for advanced Army school slots.`;
    conop.situation.ao = 'Training Area / PT Field';
    conop.situation.uniform = 'PT Uniform / ACU';
    conop.endState = 'Cadets evaluated and selected for Army school slots. Tryout results recorded and selections announced.';
    conop.conceptOfOperation = {
      phase1: 'Cadet arrival, registration, and initial brief on tryout process and standards.',
      phase1Label: 'Registration & Brief',
      phase2: 'Physical fitness evaluation, leadership assessment, and competitive events.',
      phase2Label: 'Evaluation',
      phase3: 'Scoring, deliberation, and selection process.',
      phase3Label: 'Selection',
      phase4: 'Results announcement and next steps brief.',
      phase4Label: 'Results & Next Steps'
    };
    conop.resources = {
      class1: 'Water, Gatorade, recovery snacks',
      class2: 'PT uniforms, ACU uniforms, evaluation forms, timers',
      class5: 'N/A',
      class6: 'Personal hygiene items',
      class8: 'First aid kit, medical support'
    };
    conop.keyDates = [
      '0600: Cadet arrival and registration',
      '0630: Tryout brief and standards review',
      '0700: Physical fitness evaluation',
      '0900: Leadership assessment',
      '1100: Competitive events',
      '1300: Lunch break',
      '1400: Deliberation and scoring',
      '1500: Results announcement',
      '1530: Next steps brief and dismissal'
    ];
    conop.tasksToSubs = 'Evaluation board consists of OIC, NCOIC, and cadre. MSIVs assist with event administration.';
  }
  else if (type.includes('5k')) {
    conop.purpose = 'To promote physical fitness and unit cohesion through a 5K run event open to all cadets and unit members.';
    conop.mission = `Conduct 5K run event on ${dateStr}. Participants will complete a 5-kilometer run following designated route with timing and recognition for top finishers.`;
    conop.situation.ao = 'Designated 5K Route';
    conop.situation.uniform = 'PT Uniform';
    conop.endState = 'All participants complete 5K run. Top finishers recognized. Unit cohesion and physical fitness promoted.';
    conop.conceptOfOperation = {
      phase1: 'Route setup, registration, and participant warm-up.',
      phase1Label: 'Setup & Registration',
      phase2: '5K run execution with water stations and timing.',
      phase2Label: 'Run Execution',
      phase3: 'Finish line operations, timing, and recovery.',
      phase3Label: 'Finish & Recovery',
      phase4: 'Awards ceremony and dismissal.',
      phase4Label: 'Awards & Dismissal'
    };
    conop.resources = {
      class1: 'Water, Gatorade, recovery snacks',
      class2: 'PT uniforms, timing equipment, route markers',
      class5: 'N/A',
      class6: 'N/A',
      class8: 'First aid kit, medical support'
    };
    conop.keyDates = [
      '0700: Route setup and registration',
      '0730: Participant arrival and warm-up',
      '0800: Safety brief and start',
      '0805: 5K run begins',
      '0900: Finish line operations',
      '0930: Awards ceremony',
      '1000: Dismissal'
    ];
    conop.tasksToSubs = 'Volunteers man water stations and finish line. MSIVs assist with timing and registration.';
  }
  else if (type.includes('commissioning')) {
    conop.purpose = 'To recognize and celebrate cadets transitioning to commissioned officers through formal commissioning ceremony.';
    conop.mission = `Conduct commissioning ceremony on ${dateStr}. MSIV cadets will be commissioned as Second Lieutenants in the United States Army with family, friends, and distinguished guests in attendance.`;
    conop.situation.ao = 'Ceremony Location (Auditorium/ROTC Building)';
    conop.situation.uniform = 'Dress Uniform (AGSU/ASU)';
    conop.endState = 'All MSIV cadets successfully commissioned as Second Lieutenants. Ceremony completed with proper military tradition and recognition.';
    conop.conceptOfOperation = {
      phase1: 'Setup ceremony location, rehearsal, and final preparations.',
      phase1Label: 'Setup & Rehearsal',
      phase2: 'Guest arrival, seating, and pre-ceremony activities.',
      phase2Label: 'Pre-Ceremony',
      phase3: 'Commissioning ceremony execution with oath of office and pinning.',
      phase3Label: 'Ceremony',
      phase4: 'Reception, photos, and dismissal.',
      phase4Label: 'Reception & Dismissal'
    };
    conop.resources = {
      class1: 'Reception refreshments, water, light snacks',
      class2: 'Dress uniforms, ceremony programs, decorations',
      class5: 'N/A',
      class6: 'N/A',
      class8: 'First aid kit'
    };
    conop.keyDates = [
      '1000: Setup and rehearsal',
      '1300: Guest arrival',
      '1400: Ceremony begins',
      '1500: Oath of office and pinning',
      '1530: Ceremony concludes',
      '1545: Reception begins',
      '1700: Dismissal'
    ];
    conop.tasksToSubs = 'MSIII cadets assist with setup and ushering. Cadre provide commissioning officers.';
  }
  else if (type.includes('mill ball') || type.includes('awards')) {
    conop.purpose = 'To recognize cadet achievements and celebrate unit accomplishments through Military Ball and Awards ceremony.';
    conop.mission = `Conduct Military Ball and Awards ceremony on ${dateStr}. Recognize outstanding cadets with awards, celebrate unit accomplishments, and promote unit cohesion through formal military tradition.`;
    conop.situation.ao = 'Ball Venue';
    conop.situation.uniform = 'Dress Uniform (AGSU/ASU) or Formal Attire';
    conop.endState = 'All awards presented. Unit accomplishments recognized. Military Ball completed with proper tradition and celebration.';
    conop.conceptOfOperation = {
      phase1: 'Venue setup, decorations, and final preparations.',
      phase1Label: 'Setup',
      phase2: 'Guest arrival, reception, and seating.',
      phase2Label: 'Reception',
      phase3: 'Awards ceremony and dinner service.',
      phase3Label: 'Awards & Dinner',
      phase4: 'Dancing, celebration, and dismissal.',
      phase4Label: 'Celebration & Dismissal'
    };
    conop.resources = {
      class1: 'Dinner service, refreshments, water',
      class2: 'Dress uniforms, awards, decorations, programs',
      class5: 'N/A',
      class6: 'N/A',
      class8: 'First aid kit'
    };
    conop.keyDates = [
      '1500: Venue setup',
      '1700: Guest arrival and reception',
      '1800: Awards ceremony begins',
      '1900: Dinner service',
      '2000: Dancing and celebration',
      '2300: Dismissal'
    ];
    conop.tasksToSubs = 'MSIII cadets assist with setup and ushering. MSIVs coordinate awards presentation.';
  }
  else if (type.includes('height/weight') || type.includes('cst layout') || type.includes('h/w')) {
    conop.purpose = 'To assess cadet physical standards and layout equipment for MS3s preparing for Cadet Summer Training (CST).';
    conop.mission = `Conduct Height/Weight assessment and CST Layout on ${dateStr}. Measure cadet height and weight for body composition standards. Layout and inspect equipment required for MS3s attending Cadet Summer Training.`;
    conop.situation.ao = 'ROTC Building / Designated Area';
    conop.situation.uniform = 'PT Uniform';
    conop.endState = 'All MS3 cadets height/weight recorded. CST equipment laid out, inspected, and accounted for. Cadets prepared for summer training.';
    conop.conceptOfOperation = {
      phase1: 'Setup measurement stations and equipment layout area.',
      phase1Label: 'Setup',
      phase2: 'Height/Weight measurements and body composition recording.',
      phase2Label: 'Height/Weight Assessment',
      phase3: 'CST equipment layout, inspection, and accountability.',
      phase3Label: 'Equipment Layout',
      phase4: 'Documentation, equipment storage, and dismissal.',
      phase4Label: 'Documentation & Dismissal'
    };
    conop.resources = {
      class1: 'Water',
      class2: 'PT uniforms, scales, measuring equipment, CST equipment lists',
      class5: 'N/A',
      class6: 'N/A',
      class8: 'First aid kit'
    };
    conop.keyDates = [
      '1300: Setup and station preparation',
      '1400: Cadet arrival and height/weight measurements',
      '1500: CST equipment layout begins',
      '1600: Equipment inspection and accountability',
      '1700: Documentation and storage',
      '1800: Dismissal'
    ];
    conop.tasksToSubs = 'MSIVs assist with measurements and equipment accountability. S4 coordinates equipment layout.';
  }
  else {
    // Default CONOPS for any other event type
    conop.purpose = `To execute ${eventName} in accordance with ROTC training requirements and unit standards.`;
    conop.mission = `Conduct ${eventName} on ${dateStr}. Execute training objectives and evaluate cadet performance.`;
    conop.endState = `Successfully complete ${eventName} with all objectives met and training requirements satisfied.`;
    conop.conceptOfOperation = {
      phase1: 'Pre-event preparation, coordination, and setup.',
      phase1Label: 'Preparation',
      phase2: 'Event execution and monitoring.',
      phase2Label: 'Execution',
      phase3: 'Post-event activities, recovery, and debrief.',
      phase3Label: 'Recovery',
      phase4: 'After-action review, documentation, and dismissal.',
      phase4Label: 'AAR & Dismissal'
    };
    conop.resources = {
      class1: 'Water, snacks as required',
      class2: 'Appropriate uniforms and equipment',
      class5: 'As required',
      class6: 'As required',
      class8: 'First aid kit'
    };
    conop.keyDates = [
      'TBD: Event start time',
      'TBD: Key milestones',
      'TBD: Event completion'
    ];
    conop.tasksToSubs = 'TBD based on event requirements.';
  }

  return conop;
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
