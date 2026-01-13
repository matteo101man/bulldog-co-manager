/**
 * Script to check for Murrin cadet
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

async function checkMurrin() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Checking for Murrin...\n');
    
    // Check Ranger company
    const rangerQuery = query(
      collection(db, 'cadets'),
      where('company', '==', 'Ranger')
    );
    const rangerSnapshot = await getDocs(rangerQuery);
    
    console.log('Ranger Company cadets:');
    rangerSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = `${data.firstName} ${data.lastName}`;
      const position = data.position || '(none)';
      console.log(`  ${name} - Position: ${position}`);
      
      // Check for similar names
      if (data.lastName.toLowerCase().includes('mur') || data.firstName.toLowerCase().includes('mur')) {
        console.log(`  *** Possible match: ${name} ***`);
      }
    });
    
    // Also search all cadets for similar names
    const allQuery = query(collection(db, 'cadets'));
    const allSnapshot = await getDocs(allQuery);
    
    console.log('\nSearching all cadets for names containing "mur"...');
    const matches: Array<{name: string, company: string, position: string}> = [];
    allSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
      if (fullName.includes('mur')) {
        matches.push({
          name: `${data.firstName} ${data.lastName}`,
          company: data.company,
          position: data.position || '(none)'
        });
      }
    });
    
    if (matches.length > 0) {
      console.log('Found matches:');
      matches.forEach(m => console.log(`  ${m.name} (${m.company}) - Position: ${m.position}`));
    } else {
      console.log('No matches found.');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMurrin();
