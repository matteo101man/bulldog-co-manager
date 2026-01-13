/**
 * Script to update company assignments based on provided list
 * 
 * Usage: npx tsx scripts/updateCompanyAssignments.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

// Company assignments from provided list
const companyAssignments: Record<string, string> = {
  'Tamera Wallace': 'Alpha',
  'Makaela Whitley': 'Bravo',
  'Evan Sagatovski': 'Charlie',
  'Katie Moebes': 'Alpha',
  'Yen Le': 'Headquarters Company',
  'McKenzie Dacus': 'Charlie',
  'Matteo Garza': 'Headquarters Company',
  'Gavin Guerra': 'Ranger',
  'Lillian Robinson': 'Charlie',
  'Kenny Biegalski': 'Ranger',
  'Ryan Fagan': 'Charlie',
  'Joshua Kang': 'Alpha',
  'Raven Kirkland': 'Ranger',
  'Emma Kate Merriam': 'Ranger',
  'Richard Rabindran': 'Bravo',
  'Sean Lupczynski': 'Charlie', // Keep in current company (Charlie)
  'Davis Evans': 'Headquarters Company',
  'Hampton Jackson': 'Ranger',
  'John Baria': 'Ranger',
  'Andrew Brezeale': 'Alpha',
  'Kaidyn Harris': 'Bravo',
  'Michael Liscano': 'Alpha',
  'Isabella Navarro': 'Charlie',
  'Ryan Kronmiller': 'Charlie',
  'Logan Magilligan': 'Charlie',
  'Peyton Nobrega': 'Bravo',
  'Chase Williams': 'Alpha',
  'Paul Choo': 'Charlie',
  'Rex Maddux': 'Headquarters Company',
  'Jackson Martin': 'Bravo',
  'Sydney McFadden': 'Ranger',
  'Andrew Dantoulis': 'Charlie',
  'Danny Lipsey': 'Bravo',
  'Rafael Reece': 'Charlie',
  'Brendan Latorre-Murrin': 'Ranger',
  'Andrew Shield': 'Charlie',
  'Daniel Woodson': 'Bravo',
  'Ansley Adkinson': 'Ranger',
  'Zennik Bublak': 'Ranger',
  'Jacob Dickerson': 'Charlie',
  'Alexander Keifer': 'Ranger',
  'Logan Reed': 'Ranger',
  'Thomas Wotka': 'Ranger',
  'Kelly Hickey': 'Alpha',
  'Julianna Phillips': 'Alpha',
  'Dwight Banks': 'Alpha',
  'Kushal Dwaram': 'Bravo',
  'James Nelson': 'Alpha',
  'Aydin Street': 'Bravo',
  'Michael Wilson': 'Ranger',
  'Leah McCoy': 'Charlie',
  'Sarah Burnette': 'Alpha',
  'Alex Jahng': 'Alpha',
  'Ben Hill': 'Ranger',
  'Ethan Wilkins': 'Alpha',
  'Harshitha Ganesan': 'Charlie',
  'Bella Hunt': 'Charlie',
  'Imogene Sutherland': 'Bravo',
  'Avery Donahoe': 'Bravo',
  'Fafa Kwashie': 'Bravo',
  'Sam Kiefer': 'Ranger',
  'Jordan Markley': 'Alpha',
  'Sofia Multhauf': 'Alpha',
  'Ryan Scanlon': 'Bravo',
};

// Cadets to remove from database
const cadetsToRemove = [
  'Andrew Stefan',
  'Alex Lopez',
  'William Brewer',
  'Lexis Van Meter',
  'Emery Marsh',
];

async function updateCompanyAssignments() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('Fetching all cadets from database...');
    const cadetsSnapshot = await getDocs(collection(db, 'cadets'));
    
    const updates: Array<{name: string, oldCompany: string, newCompany: string, docId: string}> = [];
    const skipped: Array<{name: string, reason: string}> = [];
    const toRemove: Array<{name: string, docId: string}> = [];
    
    cadetsSnapshot.forEach((docSnap) => {
      const cadet = docSnap.data();
      const fullName = `${cadet.firstName} ${cadet.lastName}`;
      
      // Check if this cadet should be removed
      if (cadetsToRemove.includes(fullName)) {
        toRemove.push({ name: fullName, docId: docSnap.id });
        return;
      }
      
      const newCompany = companyAssignments[fullName];
      
      if (!newCompany) {
        skipped.push({ name: fullName, reason: 'Not in provided list' });
        return;
      }
      
      const currentCompany = cadet.company;
      if (currentCompany !== newCompany) {
        updates.push({
          name: fullName,
          oldCompany: currentCompany,
          newCompany: newCompany,
          docId: docSnap.id
        });
      }
    });
    
    console.log(`\nFound ${updates.length} cadets that need company updates.`);
    console.log(`Found ${toRemove.length} cadets to remove.`);
    console.log(`Skipping ${skipped.length} cadets not in provided list.\n`);
    
    if (updates.length === 0 && toRemove.length === 0) {
      console.log('No updates needed!');
      return;
    }
    
    if (updates.length > 0) {
      console.log('Company updates to be made:');
      console.log('-'.repeat(80));
      updates.forEach(u => {
        console.log(`${u.name.padEnd(30)} ${u.oldCompany.padEnd(20)} → ${u.newCompany}`);
      });
      console.log('-'.repeat(80));
    }
    
    if (toRemove.length > 0) {
      console.log('\nCadets to be removed:');
      console.log('-'.repeat(80));
      toRemove.forEach(r => {
        console.log(`  - ${r.name}`);
      });
      console.log('-'.repeat(80));
    }
    
    // Ask for confirmation
    console.log('\n⚠️  This will update company assignments and remove cadets from the database.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let successCount = 0;
    let errorCount = 0;
    let removedCount = 0;
    let removeErrorCount = 0;
    
    // Update company assignments
    if (updates.length > 0) {
      console.log('Updating company assignments...\n');
      for (const update of updates) {
        try {
          await updateDoc(doc(db, 'cadets', update.docId), {
            company: update.newCompany
          });
          console.log(`✓ Updated: ${update.name} → ${update.newCompany}`);
          successCount++;
        } catch (error) {
          console.error(`✗ Failed to update ${update.name}:`, error);
          errorCount++;
        }
      }
    }
    
    // Remove cadets
    if (toRemove.length > 0) {
      console.log('\nRemoving cadets...\n');
      for (const remove of toRemove) {
        try {
          await deleteDoc(doc(db, 'cadets', remove.docId));
          console.log(`✓ Removed: ${remove.name}`);
          removedCount++;
        } catch (error) {
          console.error(`✗ Failed to remove ${remove.name}:`, error);
          removeErrorCount++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('UPDATE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Company updates - Success: ${successCount}, Errors: ${errorCount}`);
    console.log(`Removals - Success: ${removedCount}, Errors: ${removeErrorCount}`);
    console.log(`Skipped (not in list): ${skipped.length}`);
    
    if (skipped.length > 0) {
      console.log('\nSkipped cadets:');
      skipped.forEach(s => {
        console.log(`  - ${s.name} (${s.reason})`);
      });
    }
    
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

updateCompanyAssignments();
