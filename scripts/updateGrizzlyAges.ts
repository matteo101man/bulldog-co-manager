/**
 * Script to update age for all Grizzly Company cadets based on their date of birth
 * 
 * Usage:
 * Run: npx tsx scripts/updateGrizzlyAges.ts
 * 
 * Make sure you have Firebase credentials set up correctly
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

/**
 * Calculate age from date of birth (YYYY-MM-DD format)
 * Returns the age as a number
 */
function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // If birthday hasn't occurred yet this year, subtract 1
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

async function updateGrizzlyAges() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('\nFetching Grizzly Company cadets...');

    // Query all Grizzly Company cadets
    const q = query(
      collection(db, 'cadets'),
      where('company', '==', 'Grizzly Company')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No Grizzly Company cadets found.');
      return;
    }

    console.log(`Found ${querySnapshot.size} Grizzly Company cadets.\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      const cadetData = docSnapshot.data();
      const cadetId = docSnapshot.id;
      const firstName = cadetData.firstName || 'Unknown';
      const lastName = cadetData.lastName || 'Unknown';
      const dateOfBirth = cadetData.dateOfBirth;

      if (!dateOfBirth) {
        console.log(`⊘ Skipped ${lastName}, ${firstName}: No date of birth`);
        skippedCount++;
        continue;
      }

      try {
        const age = calculateAge(dateOfBirth);
        
        // Update the cadet document
        const cadetRef = doc(db, 'cadets', cadetId);
        await updateDoc(cadetRef, {
          age: age
        });
        
        console.log(`✓ Updated ${lastName}, ${firstName}: Age = ${age} (DOB: ${dateOfBirth})`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Failed to update ${lastName}, ${firstName}:`, error);
        errorCount++;
      }
    }

    console.log(`\nUpdate complete!`);
    console.log(`  Updated: ${updatedCount} cadets`);
    console.log(`  Skipped: ${skippedCount} cadets (no date of birth)`);
    console.log(`  Errors: ${errorCount} cadets`);
    console.log(`  Total processed: ${querySnapshot.size} cadets`);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

updateGrizzlyAges();
