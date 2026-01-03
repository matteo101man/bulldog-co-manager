/**
 * Script to update cadet company assignments
 * 
 * Usage: npx tsx scripts/updateCompanies.ts
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

// Company assignments by last name
const COMPANY_ASSIGNMENTS: { [lastName: string]: 'Alpha' | 'Bravo' | 'Charlie' | 'Ranger' } = {
  // Alpha
  'Le': 'Alpha',
  'Phillips': 'Alpha',
  'Multhauf': 'Alpha',
  'Wilkins': 'Alpha',
  'Sanford': 'Alpha',
  'Kang': 'Alpha',
  'Lopez': 'Alpha',
  'Burnette': 'Alpha',
  'Markley': 'Alpha',
  'Stefan': 'Alpha',
  'Williams': 'Alpha',
  'Brezeale': 'Alpha',
  'Hickey': 'Alpha',
  'Nelson': 'Alpha',
  'Banks': 'Alpha',
  
  // Bravo
  'Maddux': 'Bravo',
  'Garza': 'Bravo',
  'Scanlon': 'Bravo',
  'Donahoe': 'Bravo',
  'Dwaram': 'Bravo',
  'Woodson': 'Bravo',
  'Lipsey': 'Bravo',
  'Rabindran': 'Bravo',
  'Harris': 'Bravo',
  'Lupczynski': 'Bravo',
  'Wallace': 'Bravo',
  'Nobrega': 'Bravo',
  'Martin': 'Bravo',
  'Kwashie': 'Bravo',
  'Street': 'Bravo',
  'Sutherland': 'Bravo',
  'Whitley': 'Bravo',
  
  // Charlie
  'Navarro': 'Charlie',
  'Kronmiller': 'Charlie',
  'Hunt': 'Charlie',
  'Reece': 'Charlie',
  'Sagatovski': 'Charlie',
  'Dantoulis': 'Charlie',
  'Choo': 'Charlie',
  'Ledvina': 'Charlie',
  'Ganesan': 'Charlie',
  'Robinson': 'Charlie',
  'Magilligan': 'Charlie',
  'Shield': 'Charlie',
  'Fagan': 'Charlie',
  'Dickerson': 'Charlie',
  'McCoy': 'Charlie',
  'Dacus': 'Charlie',
  
  // Ranger
  'Adkinson': 'Ranger',
  'Bublak': 'Ranger',
  'Keifer': 'Ranger',
  'McFadden': 'Ranger',
  'Wotka': 'Ranger',
  'Reed': 'Ranger',
  'Baria': 'Ranger',
  'Guerra': 'Ranger',
  'Kiefer': 'Ranger',
  'Merriam': 'Ranger',
  'Jackson': 'Ranger',
  'Biegalski': 'Ranger',
  'Hill': 'Ranger',
  'Kirkland': 'Ranger',
  'Wilson': 'Ranger'
};

async function updateCompanies() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Fetching all cadets...');
    const q = query(collection(db, 'cadets'));
    const querySnapshot = await getDocs(q);

    let updatedCount = 0;
    let notFoundCount = 0;
    const notFound: string[] = [];
    const updates: Array<{ name: string; oldCompany: string; newCompany: string }> = [];

    for (const docSnap of querySnapshot.docs) {
      const cadet = docSnap.data();
      const lastName = cadet.lastName;
      const currentCompany = cadet.company;
      
      if (COMPANY_ASSIGNMENTS[lastName]) {
        const newCompany = COMPANY_ASSIGNMENTS[lastName];
        
        if (currentCompany !== newCompany) {
          await updateDoc(doc(db, 'cadets', docSnap.id), {
            company: newCompany
          });
          updates.push({
            name: `${cadet.firstName} ${lastName}`,
            oldCompany: currentCompany,
            newCompany: newCompany
          });
          console.log(`✓ Updated: ${cadet.firstName} ${lastName} -> ${currentCompany} to ${newCompany}`);
          updatedCount++;
        } else {
          console.log(`  Already correct: ${cadet.firstName} ${lastName} (${newCompany})`);
        }
      }
    }

    // Check for any cadets in the list that weren't found
    for (const [lastName, company] of Object.entries(COMPANY_ASSIGNMENTS)) {
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
    console.log(`  Updated: ${updatedCount} cadets`);
    if (notFoundCount > 0) {
      console.log(`  Not found in database: ${notFoundCount} cadets`);
      notFound.forEach(name => console.log(`    - ${name}`));
    }
    
    // Summary by company
    console.log(`\nSummary of updates:`);
    const byCompany: { [key: string]: string[] } = {};
    updates.forEach(u => {
      if (!byCompany[u.newCompany]) byCompany[u.newCompany] = [];
      byCompany[u.newCompany].push(u.name);
    });
    Object.entries(byCompany).forEach(([company, names]) => {
      console.log(`  ${company}: ${names.length} cadets moved here`);
    });
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

updateCompanies();
