/**
 * Script to check cadet positions
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

async function checkPositions() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const companies = ['Alpha', 'Bravo', 'Charlie', 'Ranger'];
    
    for (const company of companies) {
      console.log(`\n${company} Company:`);
      const q = query(collection(db, 'cadets'), where('company', '==', company));
      const snapshot = await getDocs(q);
      
      const withPositions = snapshot.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .filter(c => c.position && (c.position.toLowerCase().includes('co') || c.position.toLowerCase().includes('1sg')));
      
      if (withPositions.length > 0) {
        withPositions.forEach(c => {
          console.log(`  ${c.firstName} ${c.lastName} - Position: "${c.position}"`);
        });
      } else {
        console.log('  No cadets with CO or 1SG positions found');
      }
      
      // Also check for Dacus specifically
      const dacus = snapshot.docs.find(d => d.data().lastName === 'Dacus');
      if (dacus) {
        console.log(`  *** Dacus found: ${dacus.data().firstName} ${dacus.data().lastName} - Position: "${dacus.data().position || '(none)'}" ***`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPositions();
