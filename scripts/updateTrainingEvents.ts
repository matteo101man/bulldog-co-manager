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
  endTime?: string;
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
    // Extract OIC and NCOIC - handle "Fagan/Maddux + protégé" format
    let oicName = oic || 'TBD';
    let ncoicName = ncoic || 'TBD';
    
    // If OIC contains "/" and NCOIC is not provided, split it (e.g., "Fagan/Maddux + protégé" -> OIC: "Fagan", NCOIC: "Maddux")
    if (oicName.includes('/') && (!ncoicName || ncoicName === 'TBD')) {
      const parts = oicName.split('/');
      if (parts.length >= 2) {
        oicName = parts[0].trim();
        // Extract name before "+" if present
        ncoicName = parts[1].split('+')[0].trim();
      }
    }
    
    conop.purpose = 'Conduct an ACFT in order to record vital physical fitness data from our program\'s cadets.';
    conop.mission = `UGA Bulldog BN conducts an ACFT on ${dateStr} at 0445 in order to allow the entire BN to conduct all 6 ACFT events within 120 minutes.`;
    conop.situation.oic = oicName;
    conop.situation.ncoic = ncoicName;
    conop.situation.ao = 'IM Fields';
    conop.situation.uniform = 'Summer APFUs';
    conop.endState = 'All cadets in BN will have their most up to date ACFT score for Cadre, Mentors, and Ranger Challenge.';
    conop.conceptOfOperation = {
      phase1: '3s/4s arrive early for setup',
      phase1Label: 'Location Prep',
      phase2: 'Cadets arrive and complete prep drills',
      phase2Label: 'Arrival',
      phase3: 'ACFT',
      phase3Label: 'Execution',
      phase4: 'Cadets turn in grading sheets and are dismissed upon completion of the ACFT.',
      phase4Label: 'Dismissal'
    };
    conop.resources = {
      class1: '–',
      class2: 'ACFT Supply request',
      class5: '– Does not apply',
      class6: '–',
      class8: '– CLS Bag, Litter'
    };
    conop.commsPace = {
      primary: 'Email',
      alternate: 'Cell',
      contingency: 'Word of mouth',
      emergency: 'Letter'
    };
    conop.keyDates = [
      '0430: OIC and 4s arrive to set-up',
      '0445: Cadets arrive',
      '0450: Prep drills conducted',
      '0500: Conduct ACFT',
      '0700: ACFT concludes',
      '0715: All gear loaded back into truck'
    ];
    conop.tasksToSubs = `Graders for MS 2, 4, 5

Deadlift: Brezeale, Choo, Dantoulis, Latorre-Murrin, Lipsey, Liscano
HRPs: Magiligan, Shield
SDC: Martin, McFadden, Navarro
Plank: Brewer
Run – Turnaround Point: Reece
Floater: Kronmiller

Graders for MS 1 & 3

Deadlift: Garza, Kirkland, Lupczynski, Merriam, Kang, Evans
HRPs – Le, Dacus
SDC: Biegalski, Jackson, Moebes
Plank: Guerra
Run: Turnaround point: Robinson
Floater: Rabindran`;
    conop.attachedAppendices = {
      appendix1: 'Medivac Plan',
      appendix3: 'Task Org'
    };
    conop.staffDuties = {
      s2: 'e.g., Weather/crime rep. specific to event',
      s4: 'e.g., Supply fulfillment time, etc.'
    };
    conop.weeklyTasks = {
      t6: { status: 'complete', description: 'Review and update previous CONOP' },
      t5: { status: 'complete', description: '' },
      t4: { status: 'complete', description: '' },
      t3: { status: 'complete', description: '' },
      t2: { status: 'complete', description: 'Early lights requested' },
      t1: { status: 'complete', description: 'Email sent to all Cadets with ACFT information\nSupply Request turned in\nTask org sent out for both days of ACFT\nTask org created\nPrint score sheets' },
      tWeek: { status: 'in-progress', description: 'Truck loaded with ACFT Supplies\nUpdate Spreadsheet' }
    };
  }
  else if (type.includes('basic rifle marksmanship') || type.includes('brm')) {
    // Extract OIC and NCOIC - handle multiple OICs format
    let oicName = oic || 'TBD';
    let ncoicName = ncoic || 'TBD';
    
    conop.purpose = 'Provide the MSIIIs with appropriate training on Tables IV and VI and increase familiarization with the M4 and prepare for qualification at CST.';
    conop.mission = `UGA Bulldog BN conducts Basic Rifle Marksmanship on ${dateStr} at Fort Gordon IOT prepare MSIII cadets for CST`;
    conop.situation.oic = oicName;
    conop.situation.ncoic = ncoicName;
    conop.situation.ao = 'Fort Gordon';
    conop.situation.uniform = 'ACU';
    conop.endState = 'Bulldog BN MSIII cadets will be familiarized with the M4 and qualification tables IV and VI.';
    conop.conceptOfOperation = {
      phase1: 'Prepare equipment and make plan for BRM',
      phase1Label: 'PREP',
      phase2: 'Perform BRM',
      phase2Label: 'EXECUTION',
      phase3: 'Clean up firing range and gather equipment and rifles for return',
      phase3Label: 'CLEAN UP',
      phase4: 'Conduct AAR',
      phase4Label: 'AAR'
    };
    conop.resources = {
      class1: 'MREs (43), Water Jugs (10)',
      class2: 'Magazines (100), EarPro (200), EyePro, Zero Sheets (70), Weapons Cleaning Kits, ACU uniforms',
      class5: 'Training ammunition (Ammo draw - MSG Shields)',
      class6: 'N/A',
      class8: 'First aid kit, medical support'
    };
    conop.keyDates = [
      '0600: SP',
      '0800: Ammo draw (MSG Shields)',
      '0800 - 0900: Weapons distribution',
      '0900 - 1000: PMI',
      '1000 - 1300: Weapons Zero',
      '1300 - 1600: Qualification',
      '1600 - 1700: Clean Weapons',
      '1700: AAR and Exfil'
    ];
    conop.tasksToSubs = `Davis - Execution OIC
Stacy, Thompson - ammo detail
Rankin, Denhardt - Lane support`;
    conop.attachedAppendices = {
      appendix1: 'MSIII Tracker (19)',
      appendix2: 'MS3 packing list',
      appendix3: 'Ammo Distribution COA, Vans, Excusal Forms'
    };
    conop.staffDuties = {
      s3: 'Key Tasks: Distribute packing list, Conduct classroom PMI, Supply request, Ammo draw',
      s4: 'Equipment/Logistical needs: Magazines (100), EarPro (200), EyePro, Zero Sheets (70), Water Jugs (10), MREs (43), Weapons Cleaning Kits'
    };
  }
  else if (type.includes('field training exercise') || type.includes('ftx') || type.includes('spring ftx')) {
    // Extract OIC and NCOIC
    let oicName = oic || 'TBD';
    let ncoicName = ncoic || 'TBD';
    
    conop.purpose = 'To prepare our MS3 cadets for success at CST25.';
    conop.mission = `Conduct field training exercise for MS3 cadets focusing on PLT STX training at Fort Benning ${dateStr} IOT prepare cadets for CST25.`;
    conop.situation.oic = oicName;
    conop.situation.ncoic = ncoicName;
    conop.situation.ao = 'Ft. Benning';
    conop.situation.uniform = 'OCPs';
    conop.endState = 'Cadets operate within the platoon and demonstrate tactical proficiency during the duration of the FTX.';
    conop.conceptOfOperation = {
      phase1: 'This phase will be conducted through a series of team meetings.',
      phase1Label: 'Planning',
      phase2: 'Cadets will arrive to a designated pickup location NLT 0430 on 03APR25 for bus movement to FTX AO.',
      phase2Label: 'Arrival',
      phase3: 'This phase will begin with the handover of cadets to TM Tactics on 03APR25 and ends on 06APR25.',
      phase3Label: 'PLT STX',
      phase4: 'Cadets leave on 06APR25 and return to UGA to be dismissed. Key task includes accountability for all MWE (Mission-Essential Weaponry/Equipment).',
      phase4Label: 'RTB - Return to Base'
    };
    conop.resources = {
      class1: 'MREs, Water, etc.',
      class2: 'Packing List - APPENDIX 2 for additional information',
      class5: 'N/A',
      class6: 'Hygiene & Recreational Items',
      class8: 'CLS Bag, Litter'
    };
    conop.keyDates = [
      '0430 03APR25: Meet at designated pickup location for movement'
    ];
    conop.tasksToSubs = 'Truck Loading date TBD.';
    conop.attachedAppendices = {
      appendix1: 'Task Org',
      appendix2: 'Packing List & Add. Items'
    };
    conop.staffDuties = {
      s1: 'Under Task Org',
      s2: 'Under Task Org',
      s3: 'Under Task Org',
      s4: 'Under Task Org',
      s5: 'Under Task Org',
      s6: 'Under Task Org'
    };
    conop.weeklyTasks = {
      t6: { status: 'complete', description: '' },
      t5: { status: 'complete', description: '' },
      t4: { status: 'complete', description: '' },
      t3: { status: 'complete', description: '' },
      t2: { status: 'complete', description: '' },
      t1: { status: 'in-progress', description: 'GEAR LAYOUT' },
      tWeek: { status: 'not-started', description: 'LOAD THE TRUCK' }
    };
  }
  else if (type.includes('ruck') || type.includes('mile')) {
    const distance = type.includes('8') ? '8-mile' : type.includes('12') ? '12-mile' : '';
    const is8Mile = type.includes('8');
    const is12Mile = type.includes('12');
    
    // Extract OIC and NCOIC
    let oicName = oic || 'TBD';
    let ncoicName = ncoic || 'TBD';
    
    conop.purpose = 'To maintain physical readiness for road marches and prepare cadets for CST.';
    
    if (is8Mile) {
      conop.mission = `Bulldog BN conducts an eight-mile road march on ${dateStr} at LOT E-23.`;
      conop.situation.ao = 'Lot E23 at 113-125 N Oconee Access Rd, Athens, Georgia 30605';
      conop.situation.uniform = 'Sterilized OCPs & Boots, Ruck, Water Source';
      conop.keyDates = [
        '0415: First Formation, PCC/PCI',
        '0430: Step Off',
        '0700: End State Formation'
      ];
      conop.tasksToSubs = `15 Min Pace: Downes + Kang
Water Point: Ledvina + Drake
Start Point: Wallace
17 Min Pace: Hare + Cook
Fall Out: Whitley + Bartsch`;
      conop.attachedAppendices = {
        appendix1: 'Medical Plan',
        appendix2: 'Task Org',
        appendix3: 'Route Plan'
      };
    } else if (is12Mile) {
      conop.mission = `Bulldog BN conducts a twelve-mile road march on ${dateStr} at White Hall Forest.`;
      conop.situation.ao = 'White Hall Forest';
      conop.situation.uniform = 'OCPs & Boots, Ruck, Water Source';
      conop.keyDates = [
        '1545: First Formation, PCC/PCI',
        '1600: Step Off',
        '1930: End State Formation'
      ];
      conop.tasksToSubs = `15 Min Pace: Downes + Kang
Water Point: CAIT Tryees
Start Point: CAIT Tryees
17 Min Pace: Hare + Cook
Fall Out: Whitley + Bartsch
Arm Immersions: CAIT Tryees`;
      conop.attachedAppendices = {
        appendix1: 'Medical Plan',
        appendix2: 'Packing List & Add. Items',
        appendix3: 'Route Plan'
      };
    } else {
      conop.mission = `Conduct ${distance} ruck march on ${dateStr}. Cadets will complete the ruck march with 35-45 lb ruck sacks following designated route within time standard.`;
      conop.situation.ao = 'Designated Ruck Route';
      conop.situation.uniform = 'ACU with Ruck Sack';
      conop.keyDates = [
        '0530: Equipment setup and ruck inspection',
        '0600: Cadet arrival and weight verification',
        '0630: Safety brief and route overview',
        '0700: Ruck march begins',
        '1200: Finish line operations begin',
        '1400: AAR and dismissal'
      ];
      conop.tasksToSubs = 'Safety vehicles follow route. MSIVs serve as pace setters and safety monitors.';
    }
    
    conop.situation.oic = oicName;
    conop.situation.ncoic = ncoicName;
    conop.endState = 'Bulldog BN cadets will maintain and/or improve their muscular endurance and have their general ruck proficiency assessed.';
    conop.conceptOfOperation = {
      phase1: 'Prepare hydration points and markers on ruck course.',
      phase1Label: 'Prep',
      phase2: 'Conduct Ruck March.',
      phase2Label: 'Execution',
      phase3: 'Pack and prepare equipment for return.',
      phase3Label: 'Clean-Up',
      phase4: 'Conduct general AAR and assess cadets\' ability to ruck.',
      phase4Label: 'AAR'
    };
    
    if (is12Mile) {
      conop.resources = {
        class1: 'Water',
        class2: 'Chem Lights, Water Jugs, Ruck Scale',
        class5: 'N/A',
        class6: 'N/A',
        class8: 'CLS Bag, litter, Arm immersion coolers'
      };
    } else {
      conop.resources = {
        class1: 'Water',
        class2: 'Chem Lights, Water Jugs, Ruck Scale',
        class5: 'N/A',
        class6: 'N/A',
        class8: 'CLS Bag, litter'
      };
    }
    
    conop.commsPace = {
      primary: 'Email',
      alternate: 'Cell',
      contingency: 'Word of Mouth',
      emergency: 'Letter'
    };
    
    conop.staffDuties = {
      s2: 'Weather/crime rep. specific to event',
      s4: 'Supply fulfillment'
    };
    
    if (is8Mile) {
      conop.weeklyTasks = {
        t6: { status: 'complete', description: '' },
        t5: { status: 'complete', description: '' },
        t4: { status: 'complete', description: '' },
        t3: { status: 'complete', description: 'Task Org, Reserve lot' },
        t2: { status: 'complete', description: 'Packing list, Route Plan' },
        t1: { status: 'complete', description: 'Equipment Check/Request' },
        tWeek: { status: 'not-started', description: 'Equipment loaded\nEmail sent to all cadets with ruck information' }
      };
    } else if (is12Mile) {
      conop.weeklyTasks = {
        t6: { status: 'complete', description: '' },
        t5: { status: 'complete', description: '' },
        t4: { status: 'complete', description: '' },
        t3: { status: 'complete', description: '' },
        t2: { status: 'complete', description: '' },
        t1: { status: 'complete', description: 'Equipment Check/Request\nRoute plan' },
        tWeek: { status: 'not-started', description: 'Equipment loaded\nEmail sent to all cadets with ruck information' }
      };
    }
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
  else if (type.includes('5k') || type.includes('memorial')) {
    // Extract OIC and NCOIC
    let oicName = oic || 'TBD';
    let ncoicName = ncoic || 'TBD';
    
    conop.purpose = 'To honor alumni and all who have made the ultimate sacrifice and recruit sponsors that will aid in funding the race and Bulldog Battalion.';
    conop.mission = `UGA Bulldog BN conducts an annual spring Memorial 5k Run at Oconee River Greenway, beginning and ending at Park and Ride lot E23, on ${dateStr} at 0900 to promote physical fitness and honor our fallen alumni.`;
    conop.situation.oic = oicName;
    conop.situation.ncoic = ncoicName;
    conop.situation.ao = 'Oconee River Greenway, beginning and ending at Park and Ride lot E23';
    conop.situation.uniform = 'PT Uniform';
    conop.endState = 'All participants complete Memorial 5K run. Fallen alumni honored. Physical fitness and unit cohesion promoted.';
    conop.conceptOfOperation = {
      phase1: 'Conducted through a series of team meetings.',
      phase1Label: 'Planning',
      phase2: 'Set up begins at 0530, check-in begins at 0800, opening ceremony at 0830, race starts at 0900.',
      phase2Label: 'Arrival',
      phase3: 'Cadets and civilians move on the Oconee River Greenway. Race day crew will posture along the route as water checkpoints.',
      phase3Label: 'Movement',
      phase4: 'All participants cross the finish line. Drinks and snacks are passed out. Equipment breakdown occurs. Race crew, NCOIC, and OIC are the last to leave.',
      phase4Label: 'Dismissal'
    };
    conop.resources = {
      class1: 'Water',
      class2: 'Tables, chairs, speakers, banners, event posters',
      class5: 'Does not apply',
      class6: 'Does not apply',
      class8: 'CLS Bag, Litter'
    };
    conop.commsPace = {
      primary: 'Cell phone',
      alternate: 'Radio',
      contingency: 'Runner',
      emergency: 'Word of Mouth'
    };
    conop.keyDates = [
      '0530: OIC, NCOIC, Cadre, and Race crew arrive for setup',
      '0800: Cadets, cadre, and guests begin arrival for check-in',
      '0830: Opening ceremony, speeches, and race announcements',
      '0900: Race begins',
      '1100: All race participants complete the race route',
      '1110: Closing ceremony/final statements',
      '1130: Equipment breakdown'
    ];
    conop.tasksToSubs = 'E.g. - Pre-/post-lab, ruck WP/SP/Pacers, MSIV instructors for lab, etc.';
    conop.attachedAppendices = {
      appendix1: 'Sponsor Task Org'
    };
    conop.staffDuties = {
      s2: 'e.g. Weather/crime rep. specific to event',
      s4: 'e.g. Supply fulfillment time, etc.',
      s5: 'e.g. Funds request for medals, porta potty, etc.'
    };
    conop.weeklyTasks = {
      t6: { status: 'complete', description: 'Purchase medals for winners\nConfirm Porta Potty setup\nRecruit race sponsors' },
      t5: { status: 'complete', description: 'Recruit race sponsors' },
      t4: { status: 'complete', description: 'Final call for sponsors\nTabling at Tate for participants' },
      t3: { status: 'complete', description: 'Sponsorship submissions close' },
      t2: { status: 'complete', description: 'Organize t-shirts' },
      t1: { status: 'complete', description: 'Insurance purchased' },
      tWeek: { status: 'not-started', description: 'Equipment staged\nRegistration closes' }
    };
  }
  else if (type.includes('commissioning')) {
    // Extract OIC and NCOIC
    let oicName = oic || 'TBD';
    let ncoicName = ncoic || 'TBD';
    
    conop.purpose = 'Highlight and provide updates and completion of key tasks relating to the 2025 commissioning ceremony.';
    conop.mission = `UGA Bulldog Battalion conducts commissioning ceremony on ${dateStr} IOT commission the MSIVs to 2nd Lieutenants.`;
    conop.situation.oic = oicName;
    conop.situation.ncoic = ncoicName;
    conop.situation.ao = 'University Chapel';
    conop.situation.uniform = 'MSIV\'s: AGSUs';
    conop.endState = 'UGA Army ROTC MSIV\'s will be commissioned into the Army as 2nd Lieutenants.';
    conop.conceptOfOperation = {
      phase1: 'Secure venue, food, speaker, color guard cadets, solidify timeline.',
      phase1Label: 'Prep',
      phase2: 'Script and color guard practiced and ensure venue equipment works.',
      phase2Label: 'Rehearsal',
      phase3: 'Pick up food at Military Building, detail set up auditorium at 0800. 0900-1130 Execute Commissioning Ceremony.',
      phase3Label: 'Set Up & Execute',
      phase4: 'Consolidate and perform AAR (After Action Review).',
      phase4Label: 'Clean up'
    };
    conop.resources = {
      class1: 'Cake and drinks',
      class2: 'AGSUs',
      class5: 'Does not apply',
      class6: 'Does not apply',
      class8: 'Does not apply'
    };
    conop.commsPace = {
      primary: 'email',
      alternate: 'text',
      contingency: 'word of mouth',
      emergency: 'letter'
    };
    conop.keyDates = [
      '0800: Set up detail arrives',
      '0800-0830: Set up',
      '0830-0855: Cadet fellowship',
      '0900: Ceremony begins - Official party entrance, National Anthem, Invocation, Welcoming remarks',
      '0910: Guest Speaker Remarks',
      '0930: Commissioning Begins',
      '1100: Official Party Closing Remarks',
      '1130: Food/drink and fellowship on Special Collections lawn',
      '1300: Close Out'
    ];
    conop.tasksToSubs = 'Key Tasks: Obtain guest speaker and guest speaker accommodations/gifts. Secure food/drinks/decor. Secure venue and color guard cadets. Conduct Commissioning Ceremony.';
    conop.staffDuties = {
      s5: 'Request $140 for cake/drinks'
    };
    conop.weeklyTasks = {
      t6: { status: 'complete', description: 'Reserve chapel\nFind speaker' },
      t5: { status: 'in-progress', description: 'Collect commissioning cadets info' },
      t4: { status: 'in-progress', description: 'Create a plan for rehearsals' },
      t3: { status: 'in-progress', description: 'Complete script\nSecure Color guard detail' },
      t2: { status: 'in-progress', description: 'Complete program\nFind photographer\nSubmit funds request' },
      t1: { status: 'not-started', description: 'Order cake\nRehearsal' },
      tWeek: { status: 'not-started', description: 'Pick up cake\nBuy drinks' }
    };
  }
  else if (type.includes('mill ball') || type.includes('awards')) {
    // Extract OIC and NCOIC
    let oicName = oic || 'TBD';
    let ncoicName = ncoic || 'TBD';
    
    conop.purpose = 'Culminating social event that allows UGA cadets, cadre, and guests to enjoy a formal evening together based upon Military Tradition.';
    conop.mission = `UGA Bulldog BN conducts Military Ball on ${dateStr} at Tate Grand Hall NLT 1800, IOT provide a memorable formal evening to recognize the hard work of UGA cadets and cadre during the 2022-2023 year.`;
    conop.situation.oic = oicName;
    conop.situation.ncoic = ncoicName;
    conop.situation.ao = 'Tate Grand Hall';
    conop.situation.uniform = 'Dress Uniform (AGSU/ASU) or Formal Attire';
    conop.endState = 'All UGA cadets, cadre, and guests will have experienced a traditional military ball that is a positive and memorable culminating event of their long ROTC year.';
    conop.conceptOfOperation = {
      phase1: 'Brief Cadre on date and time of military ball. Finalize and coordinate event space with Tate event coordinator.',
      phase1Label: 'PREP',
      phase2: 'OICs will gather at 1600 with MS4 detail to set-up tables with name placements, decorations, and picture station. Cadets, cadre, and guests will be seated at their assigned table.',
      phase2Label: 'SET-UP & Arrival',
      phase3: 'Initial speech by MC followed by grog being made by designated cadets. Cadets, cadre, and guests will retrieve food from buffet stations. Guest Speaker will give speech. Music will be played for the rest of the evening and patrons will be able to utilize dance floor until 2200.',
      phase3Label: 'Execution',
      phase4: 'OIC and NCOIC will clean up decorations and wrap up ball.',
      phase4Label: 'Clean-Up'
    };
    conop.resources = {
      class1: 'Catering, refreshments, water',
      class2: 'Dress uniforms, decorations, programs, name placements',
      class5: 'N/A',
      class6: 'N/A',
      class8: 'First aid kit'
    };
    conop.keyDates = [
      '1600: OIC and detail arrive to set-up',
      '1800: Cadets, cadre, and guests begin arrival',
      '1830: Military Ball starts',
      '1900: Guest Speaker',
      '1930-2030: Dinner',
      '2030-2200: Ball festivities',
      '2200-UTC: OIC and detail breakdown'
    ];
    conop.tasksToSubs = 'Key Tasks: Finalize key dates and timeline with Cadre POC: MSG Lawrence. Secure Tate Grand Hall for 23 MAR. Secure catering for 23 MAR. Meet with event coordinator at Tate to finalize event space. Decorate Tate Grand Hall NLT 180023MAR. Begin Military ball NLT 183023MAR2023. End Military ball NLT 220023MAR2023.';
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
    hitTime: '0445',
    endTime: '0700',
    planningStatus: 'in-progress',
    oicId: 'Fagan/Maddux + protégé',
    ncoicId: 'Maddux',
    ao: 'IM Fields',
    uniform: 'Summer PTs',
    mission: `UGA Bulldog BN conducts an ACFT on ${formatDateWithAbbrMonth(formatDate('03-04 FEB'), formatEndDate('03-04 FEB'))} at 0445 in order to allow the entire BN to conduct all 6 ACFT events within 120 minutes.`,
    conop: createConop('Army Fitness Test 1', 'Fagan', 'Maddux', formatDate('03-04 FEB'), formatEndDate('03-04 FEB'))
  },
  {
    name: 'Basic Rifle Marksmanship',
    date: formatDate('14 APR'),
    hitTime: '0600',
    endTime: '1700',
    planningStatus: 'in-progress',
    oicId: 'Nelson, Davis',
    ncoicId: 'Muth',
    ao: 'Fort Gordon',
    uniform: 'ACU',
    mission: `UGA Bulldog BN conducts Basic Rifle Marksmanship on ${formatDateWithAbbrMonth(formatDate('14 APR'))} at Fort Gordon IOT prepare MSIII cadets for CST`,
    conop: createConop('Basic Rifle Marksmanship', 'Nelson, Davis', 'Muth', formatDate('14 APR'))
  },
  {
    name: 'Army Fitness Test 2',
    date: formatDate('14-15 APR'),
    endDate: formatEndDate('14-15 APR'),
    hitTime: '0445',
    endTime: '0700',
    planningStatus: 'in-progress',
    oicId: 'Fagan/Maddux + protégé',
    ncoicId: 'Maddux',
    ao: 'IM Fields',
    uniform: 'Summer PTs',
    mission: `UGA Bulldog BN conducts an ACFT on ${formatDateWithAbbrMonth(formatDate('14-15 APR'), formatEndDate('14-15 APR'))} at 0445 in order to allow the entire BN to conduct all 6 ACFT events within 120 minutes.`,
    conop: createConop('Army Fitness Test 2', 'Fagan', 'Maddux', formatDate('14-15 APR'), formatEndDate('14-15 APR'))
  },
  {
    name: 'Spring Field Training Exercise',
    date: formatDate('16-19 APR'),
    endDate: formatEndDate('16-19 APR'),
    hitTime: '0430',
    planningStatus: 'in-progress',
    oicId: 'Sanford',
    ncoicId: 'Evans',
    ao: 'Ft. Benning',
    uniform: 'OCPs',
    mission: `Conduct field training exercise for MS3 cadets focusing on PLT STX training at Fort Benning ${formatDateWithAbbrMonth(formatDate('16-19 APR'), formatEndDate('16-19 APR'))} IOT prepare cadets for CST25.`,
    conop: createConop('Spring Field Training Exercise', 'Sanford', 'Evans', formatDate('16-19 APR'), formatEndDate('16-19 APR'))
  },
  {
    name: '8 Mile Ruck',
    date: formatDate('18 FEB'),
    hitTime: '0415',
    endTime: '0700',
    planningStatus: 'in-progress',
    oicId: 'Downes',
    ncoicId: 'Kang',
    ao: 'Lot E23 at 113-125 N Oconee Access Rd, Athens, Georgia 30605',
    uniform: 'Sterilized OCPs & Boots, Ruck, Water Source',
    mission: `Bulldog BN conducts an eight-mile road march on ${formatDateWithAbbrMonth(formatDate('18 FEB'))} at LOT E-23.`,
    conop: createConop('8 Mile Ruck', 'Downes', 'Kang', formatDate('18 FEB'))
  },
  {
    name: 'End of Semester 12 Mile Ruck',
    date: formatDate('23 APR'),
    hitTime: '1545',
    endTime: '1930',
    planningStatus: 'in-progress',
    oicId: 'Downes',
    ncoicId: 'Kang',
    ao: 'White Hall Forest',
    uniform: 'OCPs & Boots, Ruck, Water Source',
    mission: `Bulldog BN conducts a twelve-mile road march on ${formatDateWithAbbrMonth(formatDate('23 APR'))} at White Hall Forest.`,
    conop: createConop('End of Semester 12 Mile Ruck', 'Downes', 'Kang', formatDate('23 APR'))
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
    name: 'Memorial 5K',
    date: formatDate('21 MAR'),
    hitTime: '0530',
    endTime: '1200',
    planningStatus: 'in-progress',
    oicId: 'McFadden',
    ncoicId: 'Donahoe',
    ao: 'Oconee River Greenway, beginning and ending at Park and Ride lot E23',
    uniform: 'PT Uniform',
    mission: `UGA Bulldog BN conducts an annual spring Memorial 5k Run at Oconee River Greenway, beginning and ending at Park and Ride lot E23, on ${formatDateWithAbbrMonth(formatDate('21 MAR'))} at 0900 to promote physical fitness and honor our fallen alumni.`,
    conop: createConop('Memorial 5K', 'McFadden', 'Donahoe', formatDate('21 MAR'))
  },
  {
    name: 'Commissioning',
    date: formatDate('09 MAY'),
    hitTime: '0900',
    endTime: '1300',
    planningStatus: 'in-progress',
    oicId: 'Merriam',
    ncoicId: 'McFadden',
    ao: 'University Chapel',
    uniform: 'MSIV\'s: AGSUs',
    mission: `UGA Bulldog Battalion conducts commissioning ceremony on ${formatDateWithAbbrMonth(formatDate('09 MAY'))} IOT commission the MSIVs to 2nd Lieutenants.`,
    conop: createConop('Commissioning', 'Merriam', 'McFadden', formatDate('09 MAY'))
  },
  {
    name: 'Mill Ball / Awards',
    date: formatDate('09 APR'),
    hitTime: '1800',
    endTime: '2200',
    planningStatus: 'in-progress',
    oicId: 'Davis',
    ncoicId: 'Rankin',
    ao: 'Tate Grand Hall',
    uniform: 'Dress Uniform (AGSU/ASU) or Formal Attire',
    mission: `UGA Bulldog BN conducts Military Ball on ${formatDateWithAbbrMonth(formatDate('09 APR'))} at Tate Grand Hall NLT 1800, IOT provide a memorable formal evening to recognize the hard work of UGA cadets and cadre during the 2022-2023 year.`,
    conop: createConop('Mill Ball / Awards', 'Davis', 'Rankin', formatDate('09 APR'))
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
