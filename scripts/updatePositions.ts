/**
 * Script to update cadet positions (1SG and CO)
 * 
 * Usage: npx tsx scripts/updatePositions.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

// Position assignments by last name
const POSITION_ASSIGNMENTS: { [lastName: string]: string } = {
  // Alpha
  'Liscano': '1SG',
  'Williams': 'CO',
  
  // Bravo
  'Woodson': '1SG',
  'Nobrega': 'CO',
  
  // Charlie
  'Dantoulis': '1SG',
  'Magilligan': 'CO',
  
  // Ranger
  'Reed': '1SG',
  'Latorre-Murrin': 'CO',
};

async function updatePositions() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Fetching all cadets...');
    const q = query(collection(db, 'cadets'));
    const querySnapshot = await getDocs(q);

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];
    const updates: Array<{ name: string; oldPosition: string; newPosition: string }> = [];

    for (const docSnap of querySnapshot.docs) {
      const cadet = docSnap.data();
      const lastName = cadet.lastName;
      const currentPosition = cadet.position || '';
      
      if (POSITION_ASSIGNMENTS[lastName]) {
        const newPosition = POSITION_ASSIGNMENTS[lastName];
        
        if (currentPosition !== newPosition) {
          await updateDoc(doc(db, 'cadets', docSnap.id), {
            position: newPosition
          });
          updates.push({
            name: `${cadet.firstName} ${lastName}`,
            oldPosition: currentPosition || '(empty)',
            newPosition: newPosition
          });
          console.log(`✓ Updated: ${cadet.firstName} ${lastName} -> "${currentPosition || '(empty)'}" to "${newPosition}"`);
          updatedCount++;
        } else {
          console.log(`  Already correct: ${cadet.firstName} ${lastName} (${newPosition})`);
        }
      }
    }

    // Check for any cadets in the list that weren't found
    for (const [lastName, position] of Object.entries(POSITION_ASSIGNMENTS)) {
      const found = Array.from(querySnapshot.docs).some(docSnap => {
        const data = docSnap.data();
        return data.lastName === lastName;
      });
      if (!found) {
        notFound.push(lastName);
        notFoundCount++;
      }
    }

    console.log(`\nUpdate complete!`);
    console.log(`Updated: ${updatedCount} cadets`);
    if (notFoundCount > 0) {
      console.log(`\nWarning: ${notFoundCount} cadets not found in database:`);
      notFound.forEach(name => console.log(`  - ${name}`));
    }
    
    if (updates.length > 0) {
      console.log(`\nSummary of updates:`);
      console.log('-'.repeat(80));
      updates.forEach(u => {
        console.log(`${u.name.padEnd(30)} "${u.oldPosition}" → "${u.newPosition}"`);
      });
      console.log('-'.repeat(80));
    }
  } catch (error) {
    console.error('Error updating positions:', error);
    process.exit(1);
  }
}

updatePositions();
