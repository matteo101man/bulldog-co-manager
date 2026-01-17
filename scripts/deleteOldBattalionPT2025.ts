/**
 * Script to delete old Battalion Tuesday PT plans for 2025 weeks
 * 
 * Usage:
 * Run: npx tsx scripts/deleteOldBattalionPT2025.ts
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

const PT_PLANS_COLLECTION = 'ptPlans';

function getPTPlanDocId(company: string, weekStartDate: string, day: string): string {
  return `${company}_${weekStartDate}_${day}`;
}

async function deleteOldPlans() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const oldWeeks = ['2025-01-13', '2025-01-14'];
    
    for (const weekStart of oldWeeks) {
      const docId = getPTPlanDocId('Battalion', weekStart, 'tuesday');
      const docRef = doc(db, PT_PLANS_COLLECTION, docId);
      
      try {
        await deleteDoc(docRef);
        console.log(`✓ Deleted Battalion Tuesday PT plan for week ${weekStart}`);
      } catch (error: any) {
        if (error.code === 'not-found') {
          console.log(`- Plan for week ${weekStart} not found (already deleted)`);
        } else {
          console.error(`✗ Failed to delete plan for week ${weekStart}:`, error);
        }
      }
    }
    
    console.log('\nCleanup complete!');
  } catch (error) {
    console.error('Failed to delete plans:', error);
    process.exit(1);
  }
}

deleteOldPlans();
