/**
 * Script to delete the old Battalion Tuesday PT plan for week 2025-01-13
 * 
 * Usage:
 * Run: npx tsx scripts/deleteOldBattalionPT.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

const OLD_WEEK_START = '2025-01-13';
const PT_PLANS_COLLECTION = 'ptPlans';

function getPTPlanDocId(company: string, weekStartDate: string, day: string): string {
  return `${company}_${weekStartDate}_${day}`;
}

async function deleteOldPlan() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const docId = getPTPlanDocId('Battalion', OLD_WEEK_START, 'tuesday');
    const docRef = doc(db, PT_PLANS_COLLECTION, docId);

    await deleteDoc(docRef);
    console.log(`✓ Deleted old Battalion Tuesday PT plan for week ${OLD_WEEK_START}`);
    console.log(`  Document ID: ${docId}`);
  } catch (error) {
    console.error('Failed to delete plan:', error);
    process.exit(1);
  }
}

deleteOldPlan();
