/**
 * Script to create the Battalion Tuesday PT plan for the special week
 * (Week starting January 13, 2025 - contains January 19th)
 * 
 * Usage:
 * Run: npx tsx scripts/createSpecialWeekBattalionPT.ts
 * 
 * Make sure you have Firebase credentials set up correctly
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

const SPECIAL_WEEK_START = '2025-01-14';
const PT_PLANS_COLLECTION = 'ptPlans';

function getPTPlanDocId(company: string, weekStartDate: string, day: string): string {
  return `${company}_${weekStartDate}_${day}`;
}

async function createBattalionPTPlan() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const plan = {
      company: 'Battalion',
      weekStartDate: SPECIAL_WEEK_START,
      day: 'tuesday',
      title: 'AGR',
      firstFormation: '0600',
      workouts: 'Ability Group Run',
      location: 'IM Fields',
      isGeneric: false,
    };

    const docId = getPTPlanDocId(plan.company, plan.weekStartDate, plan.day);
    const docRef = doc(db, PT_PLANS_COLLECTION, docId);

    await setDoc(docRef, plan, { merge: true });
    console.log(`✓ Created Battalion Tuesday PT plan for week ${SPECIAL_WEEK_START}`);
    console.log(`  Document ID: ${docId}`);
    console.log(`  Title: ${plan.title}`);
    console.log(`  Location: ${plan.location}`);
    console.log(`  First Formation: ${plan.firstFormation}`);
  } catch (error) {
    console.error('Failed to create plan:', error);
    process.exit(1);
  }
}

createBattalionPTPlan();
