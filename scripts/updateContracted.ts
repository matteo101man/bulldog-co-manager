/**
 * Script to update cadet contracted status
 * 
 * Usage: npx tsx scripts/updateContracted.ts
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

// List of cadets to mark as contracted (lastName, firstName)
const CONTRACTED_CADETS = [
  { lastName: 'Baria', firstName: 'John' },
  { lastName: 'Brezeale', firstName: 'Andrew' },
  { lastName: 'Bublak', firstName: 'Zennik' },
  { lastName: 'Dickerson', firstName: 'Jacob' },
  { lastName: 'Harris', firstName: 'Kaidyn' },
  { lastName: 'Kronmiller', firstName: 'Ryan' },
  { lastName: 'Le', firstName: 'Yen' },
  { lastName: 'Liscano', firstName: 'Michael' },
  { lastName: 'Magilligan', firstName: 'Logan' },
  { lastName: 'Moebes', firstName: 'Katie' },
  { lastName: 'Reed', firstName: 'Logan' },
  { lastName: 'Sanford', firstName: 'Colby' },
  { lastName: 'Wallace', firstName: 'Tamera' },
  { lastName: 'Wotka', firstName: 'Thomas' },
  { lastName: 'Choo', firstName: 'Paul' },
  { lastName: 'Dacus', firstName: 'McKenzie' },
  { lastName: 'Garza', firstName: 'Matteo' },
  { lastName: 'Guerra', firstName: 'Gavin' },
  { lastName: 'Kiefer', firstName: 'Sam' },
  { lastName: 'Levdina', firstName: 'Alanna' },
  { lastName: 'Martin', firstName: 'Jackson' },
  { lastName: 'McFadden', firstName: 'Sydney' },
  { lastName: 'Phillips', firstName: 'Julianna' },
  { lastName: 'Robinson', firstName: 'Lillian' },
  { lastName: 'Whitley', firstName: 'Makaela' },
  { lastName: 'Wilson', firstName: 'Michael' },
  { lastName: 'Banks', firstName: 'Dwight' },
  { lastName: 'Biegalski', firstName: 'Kenny' },
  { lastName: 'Brewer', firstName: 'William' },
  { lastName: 'Fagan', firstName: 'Ryan' },
  { lastName: 'Kang', firstName: 'Joshua' },
  { lastName: 'Kirkland', firstName: 'Raven' },
  { lastName: 'Latorre-Murrin', firstName: 'Brendan' },
  { lastName: 'Lipsey', firstName: 'Danny' },
  { lastName: 'Lupczynski', firstName: 'Sean' },
  { lastName: 'Merriam', firstName: 'Emma Kate' },
  { lastName: 'Rabindran', firstName: 'Richard' },
  { lastName: 'Reece', firstName: 'Rafael' },
  { lastName: 'Sagatovski', firstName: 'Evan' },
  { lastName: 'Woodson', firstName: 'Daniel' },
  { lastName: 'Evans', firstName: 'Davis' },
  { lastName: 'Jackson', firstName: 'Hampton' }
];

async function updateContracted() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Fetching all cadets...');
    const q = query(collection(db, 'cadets'));
    const querySnapshot = await getDocs(q);

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];

    for (const docSnap of querySnapshot.docs) {
      const cadet = docSnap.data();
      const lastName = cadet.lastName;
      const firstName = cadet.firstName;
      
      // Check if this cadet should be marked as contracted
      const shouldBeContracted = CONTRACTED_CADETS.some(
        c => c.lastName === lastName && c.firstName === firstName
      );
      
      if (shouldBeContracted) {
        await updateDoc(doc(db, 'cadets', docSnap.id), {
          contracted: 'Y'
        });
        console.log(`✓ Updated: ${firstName} ${lastName} -> Contracted: Y`);
        updatedCount++;
      }
    }

    // Check for any cadets in the list that weren't found
    for (const cadet of CONTRACTED_CADETS) {
      const found = Array.from(querySnapshot.docs).some(docSnap => {
        const data = docSnap.data();
        return data.lastName === cadet.lastName && data.firstName === cadet.firstName;
      });
      if (!found) {
        notFound.push(`${cadet.firstName} ${cadet.lastName}`);
        notFoundCount++;
      }
    }

    console.log(`\nUpdate complete!`);
    console.log(`  Updated: ${updatedCount} cadets`);
    if (notFoundCount > 0) {
      console.log(`  Not found in database: ${notFoundCount} cadets`);
      notFound.forEach(name => console.log(`    - ${name}`));
    }
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

updateContracted();
