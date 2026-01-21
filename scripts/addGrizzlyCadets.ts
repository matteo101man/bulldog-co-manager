/**
 * Script to add Grizzly Company cadets to Firestore
 * 
 * Usage:
 * Run: npx tsx scripts/addGrizzlyCadets.ts
 * 
 * Make sure you have Firebase credentials set up correctly
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

interface CadetData {
  company: 'Grizzly Company';
  firstName: string;
  lastName: string;
  militaryScienceLevel: string;
  phoneNumber: string;
  email: string;
  dateOfBirth?: string;
  position?: string;
  contracted?: 'Y' | 'N';
}

// Helper function to convert M/D/YYYY to YYYY-MM-DD
function convertDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  const month = parts[0].padStart(2, '0');
  const day = parts[1].padStart(2, '0');
  const year = parts[2];
  return `${year}-${month}-${day}`;
}

// Grizzly Company cadets
const CADETS: CadetData[] = [
  { firstName: 'Ashley', lastName: 'Villagomez', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '678-997-1025', email: 'avillagomez@ggc.edu', dateOfBirth: convertDate('11/4/2003'), position: 'GCO CO', contracted: 'Y' },
  { firstName: 'Emily', lastName: 'Nieto', company: 'Grizzly Company', militaryScienceLevel: 'MS3', phoneNumber: '727-666-8859', email: 'enieto1@ggc.edu', dateOfBirth: convertDate('10/14/2004'), position: 'CG Captain, 2nd SL', contracted: 'Y' },
  { firstName: 'Treyvon', lastName: 'Lopez', company: 'Grizzly Company', militaryScienceLevel: 'MS3', phoneNumber: '470-350-8008', email: 'tlopez5@ggc.edu', dateOfBirth: convertDate('3/30/2004'), position: 'GCO OIC', contracted: 'N' },
  { firstName: 'Hannah', lastName: 'Fuchko', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '678-599-4344', email: 'hfuchko@ggc.edu', dateOfBirth: convertDate('8/26/2002'), contracted: 'Y' },
  { firstName: 'Katherine', lastName: 'Olvera', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '706-703-0759', email: 'kolvera1@ggc.edu', dateOfBirth: convertDate('9/10/2002'), position: 'S2', contracted: 'Y' },
  { firstName: 'Daniel', lastName: 'Quinteros', company: 'Grizzly Company', militaryScienceLevel: 'MS3', phoneNumber: '404-807-2815', email: 'dquinterosromero@ggc.edu', dateOfBirth: convertDate('5/31/1998'), position: 'GCO NCOIC', contracted: 'N' },
  { firstName: 'Samuel', lastName: 'Hampton', company: 'Grizzly Company', militaryScienceLevel: 'MS3', phoneNumber: '470-899-3191', email: 'shampton3@ggc.edu', dateOfBirth: convertDate('2/24/2005'), contracted: 'Y' },
  { firstName: 'Shakira', lastName: 'Jean-Jules', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '786-644-7275', email: 'sjeanjules@ggc.edu', dateOfBirth: convertDate('3/7/2003'), position: 'S3', contracted: 'Y' },
  { firstName: 'Enna', lastName: 'Lackey', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '912-856-8646', email: 'elackey2@ggc.edu', dateOfBirth: convertDate('11/8/2003'), position: 'S6', contracted: 'Y' },
  { firstName: 'Darhan', lastName: 'Amundson', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '470-209-1918', email: 'damundson@ggc.edu', dateOfBirth: convertDate('1/11/2004'), position: 'GCO 1SG', contracted: 'Y' },
  { firstName: 'Kristopher', lastName: 'Voglezon', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '470-875-2610', email: 'kvoglezon1@ggc.edu', dateOfBirth: convertDate('7/24/2003'), position: 'S1', contracted: 'Y' },
  { firstName: 'Keyauna', lastName: 'Fuller', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '470-366-5641', email: 'kfuller4@ggc.edu', dateOfBirth: convertDate('3/19/1999'), position: 'S5', contracted: 'Y' },
  { firstName: 'Emmanuel', lastName: 'Onuorah', company: 'Grizzly Company', militaryScienceLevel: 'MS1', phoneNumber: '470-364-0708', email: 'eonuorah@ggc.edu', dateOfBirth: convertDate('3/4/2006'), contracted: 'N' },
  { firstName: 'Kamel', lastName: 'Davis', company: 'Grizzly Company', militaryScienceLevel: 'MS1', phoneNumber: '470-843-2700', email: '', contracted: undefined },
  { firstName: 'Neisee', lastName: 'Williams', company: 'Grizzly Company', militaryScienceLevel: 'MS1', phoneNumber: '586-422-8250', email: 'nwilliams81@ggc.edu', dateOfBirth: convertDate('11/8/2006'), contracted: 'N' },
  { firstName: 'Toluwani', lastName: 'Akosile', company: 'Grizzly Company', militaryScienceLevel: 'MS1', phoneNumber: '240-825-6653', email: 'takosile@ggc.edu', dateOfBirth: convertDate('9/14/2006'), contracted: 'Y' },
  { firstName: 'Anisabel', lastName: 'Ruiz Leyva', company: 'Grizzly Company', militaryScienceLevel: 'MS3', phoneNumber: '678-334-7010', email: 'aruizleyva@ggc.edu', dateOfBirth: convertDate('10/7/1999'), contracted: 'Y' },
  { firstName: 'Jaylin', lastName: 'Penermon', company: 'Grizzly Company', militaryScienceLevel: 'MS1', phoneNumber: '470-230-3976', email: 'jpenermon@ggc.edu', dateOfBirth: convertDate('12/1/2003'), contracted: 'N' },
  { firstName: 'Mia', lastName: 'Biasiucci', company: 'Grizzly Company', militaryScienceLevel: 'MS4', phoneNumber: '678-842-1148', email: 'mbiasiuccu@ggc.edu', dateOfBirth: convertDate('11/25/2003'), position: '3rd SL', contracted: 'Y' },
  { firstName: 'Leah', lastName: 'Faircloth', company: 'Grizzly Company', militaryScienceLevel: 'MS3', phoneNumber: '334-494-5031', email: 'lfaircloth@ggc.edu', dateOfBirth: convertDate('8/31/2003'), position: 'PAO', contracted: 'Y' }
];

async function checkExistingCadet(db: any, firstName: string, lastName: string, company: string): Promise<boolean> {
  const q = query(
    collection(db, 'cadets'),
    where('firstName', '==', firstName),
    where('lastName', '==', lastName),
    where('company', '==', company)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

async function addGrizzlyCadets() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log(`\nStarting import of ${CADETS.length} Grizzly Company cadets...`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const cadet of CADETS) {
      try {
        // Check if cadet already exists
        const exists = await checkExistingCadet(db, cadet.firstName, cadet.lastName, cadet.company);
        if (exists) {
          console.log(`⊘ Skipped (already exists): ${cadet.lastName}, ${cadet.firstName}`);
          skippedCount++;
          continue;
        }

        // Remove undefined fields before adding
        const cadetData: any = {
          company: cadet.company,
          firstName: cadet.firstName,
          lastName: cadet.lastName,
          militaryScienceLevel: cadet.militaryScienceLevel,
          phoneNumber: cadet.phoneNumber,
          email: cadet.email
        };
        
        if (cadet.dateOfBirth) cadetData.dateOfBirth = cadet.dateOfBirth;
        if (cadet.position) cadetData.position = cadet.position;
        if (cadet.contracted) cadetData.contracted = cadet.contracted;
        
        const docRef = await addDoc(collection(db, 'cadets'), cadetData);
        console.log(`✓ Added: ${cadet.lastName}, ${cadet.firstName} (${docRef.id})`);
        addedCount++;
      } catch (error) {
        console.error(`✗ Failed to add ${cadet.lastName}, ${cadet.firstName}:`, error);
      }
    }

    console.log(`\nImport complete!`);
    console.log(`  Added: ${addedCount} cadets`);
    console.log(`  Skipped: ${skippedCount} cadets (already exist)`);
    console.log(`  Total processed: ${CADETS.length} cadets`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

addGrizzlyCadets();
