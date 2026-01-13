/**
 * Script to import base PT workout plans into Firestore
 * 
 * Usage:
 * Run: npx tsx scripts/importPTPlans.ts
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

interface PTPlanData {
  company: 'Alpha' | 'Bravo' | 'Charlie' | 'Ranger' | 'Headquarters Company';
  weekStartDate: string; // ISO date string for the Monday of the week
  day: 'tuesday' | 'wednesday' | 'thursday';
  title: string;
  firstFormation: string;
  workouts: string;
  location: string;
}

// Base workout plans - using a past week date so they appear as "old plans"
const BASE_WEEK_START = '2024-01-01'; // Monday of a past week

const PT_PLANS: PTPlanData[] = [
  {
    company: 'Alpha',
    weekStartDate: BASE_WEEK_START,
    day: 'tuesday',
    title: 'Cardio & Core',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- Dynamic stretching
- Light jog (1 lap around field)

0610-0620: Cardio Circuit
- 4x 400m sprints with 1 min rest between
- Focus on maintaining pace

0620-0630: Core Strength
- 3 rounds:
  * 30 sit-ups
  * 20 leg raises
  * 30 second plank
  * 20 flutter kicks

0630-0640: Cardio Finisher
- 2x 800m runs at moderate pace
- 2 min rest between

0640-0650: Cool Down
- Static stretching
- Focus on legs and core

0650-0700: Formation & Dismissal`,
    location: 'IM Fields'
  },
  {
    company: 'Alpha',
    weekStartDate: BASE_WEEK_START,
    day: 'wednesday',
    title: 'Parking Deck Strength',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- Stair climbs (2 levels up, 2 down)
- Dynamic stretching

0610-0625: Upper Body Circuit
- 3 rounds:
  * Push-ups: 20, 15, 10 (decreasing)
  * Pull-ups or inverted rows: max reps
  * Dips on railings: 15 reps
  * Burpees: 10 reps

0625-0640: Lower Body & Cardio
- 3 rounds:
  * Squats: 25 reps
  * Lunges: 20 each leg
  * Step-ups on stairs: 15 each leg
  * Jump squats: 15 reps

0640-0650: Full Body Finisher
- Bear crawls across parking deck (2 lengths)
- Mountain climbers: 50 reps
- High knees: 30 seconds

0650-0700: Cool Down & Dismissal`,
    location: 'Parking Deck'
  },
  {
    company: 'Alpha',
    weekStartDate: BASE_WEEK_START,
    day: 'thursday',
    title: 'Track Intervals',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- 1 mile easy jog
- Dynamic stretching

0610-0625: Interval Training
- 4x 800m at 75% effort
- 2 min rest between intervals
- Focus on consistent pace

0625-0635: Speed Work
- 6x 200m sprints
- 90 second rest between
- Full recovery between sets

0635-0645: Endurance Run
- 1 mile at moderate pace
- Maintain form throughout

0645-0655: Cool Down
- 1/2 mile easy jog
- Static stretching

0655-0700: Formation & Dismissal`,
    location: 'Spec Towns'
  },
  {
    company: 'Bravo',
    weekStartDate: BASE_WEEK_START,
    day: 'tuesday',
    title: 'Hill Sprints & Bodyweight',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- Light jog to hill
- Dynamic stretching

0610-0625: Hill Sprints
- 6x hill sprints (full effort)
- Walk down for recovery
- Focus on driving with legs

0625-0640: Bodyweight Circuit
- 4 rounds:
  * Push-ups: 20 reps
  * Squats: 25 reps
  * Sit-ups: 30 reps
  * Plank: 45 seconds
  * 30 second rest between rounds

0640-0650: Hill Finisher
- 3x hill sprints (moderate effort)
- Jog down for active recovery

0650-0700: Cool Down & Dismissal`,
    location: 'MILSB'
  },
  {
    company: 'Bravo',
    weekStartDate: BASE_WEEK_START,
    day: 'wednesday',
    title: 'Field Circuit Training',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- 1 lap around field
- Dynamic stretching

0610-0625: Circuit Round 1
- 4 stations, 2 min each:
  * Station 1: Burpees (max reps)
  * Station 2: Jumping jacks (100 reps)
  * Station 3: Push-ups (max reps)
  * Station 4: High knees (60 seconds)

0625-0640: Circuit Round 2
- 4 stations, 2 min each:
  * Station 1: Squat jumps (30 reps)
  * Station 2: Plank hold (max time)
  * Station 3: Mountain climbers (50 reps)
  * Station 4: Lunges (20 each leg)

0640-0650: Cardio Finisher
- 2x 400m sprints
- 2 min rest between

0650-0700: Cool Down & Dismissal`,
    location: 'IM Fields'
  },
  {
    company: 'Bravo',
    weekStartDate: BASE_WEEK_START,
    day: 'thursday',
    title: 'Parking Deck Endurance',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- Stair climbs (all 4 levels)
- Dynamic stretching

0610-0625: Stair Running
- 5x full deck climbs (all 4 levels)
- Walk down for recovery
- Maintain steady pace

0625-0640: Full Body Strength
- 3 rounds:
  * Push-ups: 25 reps
  * Dips: 20 reps
  * Step-ups: 20 each leg
  * Squats: 30 reps
  * 1 min rest between rounds

0640-0650: Cardio Finisher
- 2x full deck sprints
- 2 min rest between

0650-0700: Cool Down & Dismissal`,
    location: 'Parking Deck'
  },
  {
    company: 'Charlie',
    weekStartDate: BASE_WEEK_START,
    day: 'tuesday',
    title: 'Track Tempo Run',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- 1 mile easy jog
- Dynamic stretching

0610-0625: Tempo Run
- 2 mile run at tempo pace (comfortably hard)
- Maintain consistent pace throughout
- Focus on breathing and form

0625-0635: Recovery
- 1/4 mile easy walk/jog
- Light stretching

0635-0645: Speed Intervals
- 4x 400m at 80% effort
- 90 second rest between

0645-0655: Cool Down
- 1/2 mile easy jog
- Static stretching

0655-0700: Formation & Dismissal`,
    location: 'Spec Towns'
  },
  {
    company: 'Charlie',
    weekStartDate: BASE_WEEK_START,
    day: 'wednesday',
    title: 'IM Fields Strength & Conditioning',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- 1 lap around field
- Dynamic stretching

0610-0625: Strength Circuit
- 3 rounds:
  * Push-ups: 25 reps
  * Squats: 30 reps
  * Lunges: 20 each leg
  * Burpees: 15 reps
  * 1 min rest between rounds

0625-0640: Cardio Blast
- 4x 200m sprints
- 1 min rest between
- Full recovery between sets

0640-0650: Core Finisher
- 3 rounds:
  * Sit-ups: 40 reps
  * Leg raises: 25 reps
  * Plank: 60 seconds
  * Flutter kicks: 30 seconds

0650-0700: Cool Down & Dismissal`,
    location: 'IM Fields'
  },
  {
    company: 'Charlie',
    weekStartDate: BASE_WEEK_START,
    day: 'thursday',
    title: 'MILSB Hill & Bodyweight',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- Light jog to hill
- Dynamic stretching

0610-0625: Hill Intervals
- 5x hill sprints (full effort)
- Walk down for recovery
- Focus on power and form

0625-0640: Bodyweight Circuit
- 4 rounds:
  * Push-ups: 20 reps
  * Squats: 25 reps
  * Sit-ups: 30 reps
  * Plank: 45 seconds
  * Jumping jacks: 50 reps
  * 30 second rest between rounds

0640-0650: Hill Finisher
- 3x hill sprints (moderate effort)
- Jog down for active recovery

0650-0700: Cool Down & Dismissal`,
    location: 'MILSB'
  },
  {
    company: 'Ranger',
    weekStartDate: BASE_WEEK_START,
    day: 'tuesday',
    title: 'Parking Deck Power & Agility',
    firstFormation: '0600',
    workouts: `0600-0610: Formation & Warm-up
- Stair climbs (2 levels)
- Dynamic stretching

0610-0625: Power Circuit
- 3 rounds:
  * Box jumps (using stairs): 15 reps
  * Explosive push-ups: 15 reps
  * Jump squats: 20 reps
  * Burpees: 12 reps
  * 1 min rest between rounds

0625-0640: Agility & Speed
- 4x stair sprints (2 levels)
- 90 second rest between
- Focus on quick feet and power

0640-0650: Full Body Finisher
- Bear crawls: 2 lengths
- Mountain climbers: 60 reps
- High knees: 45 seconds
- Butt kicks: 45 seconds

0650-0700: Cool Down & Dismissal`,
    location: 'Parking Deck'
  }
];

async function importPTPlans() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log(`Starting import of ${PT_PLANS.length} PT plans...`);

    for (const plan of PT_PLANS) {
      try {
        const docRef = await addDoc(collection(db, 'ptPlans'), plan);
        console.log(`✓ Added: ${plan.title} - ${plan.company} ${plan.day} (${docRef.id})`);
      } catch (error) {
        console.error(`✗ Failed to add ${plan.title}:`, error);
      }
    }

    console.log('\nImport complete!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importPTPlans();

