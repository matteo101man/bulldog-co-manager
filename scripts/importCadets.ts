/**
 * Script to import cadets into Firestore
 * 
 * Usage:
 * 1. Update the CADETS array below with your cadet data
 * 2. Run: npx tsx scripts/importCadets.ts
 * 
 * Make sure you have Firebase credentials set up correctly
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

interface CadetData {
  company: 'Alpha' | 'Bravo' | 'Charlie' | 'Ranger';
  firstName: string;
  lastName: string;
  militaryScienceLevel: string;
  phoneNumber: string;
  email: string;
}

// Example cadets - you can modify or add more
const CADETS: CadetData[] = [
  {
    company: 'Alpha',
    firstName: 'John',
    lastName: 'Smith',
    militaryScienceLevel: 'MS4',
    phoneNumber: '555-0101',
    email: 'john.smith@example.com'
  },
  {
    company: 'Alpha',
    firstName: 'Sarah',
    lastName: 'Johnson',
    militaryScienceLevel: 'MS3',
    phoneNumber: '555-0102',
    email: 'sarah.johnson@example.com'
  },
  {
    company: 'Bravo',
    firstName: 'Michael',
    lastName: 'Williams',
    militaryScienceLevel: 'MS2',
    phoneNumber: '555-0201',
    email: 'michael.williams@example.com'
  },
  {
    company: 'Bravo',
    firstName: 'Emily',
    lastName: 'Brown',
    militaryScienceLevel: 'MS1',
    phoneNumber: '555-0202',
    email: 'emily.brown@example.com'
  },
  {
    company: 'Charlie',
    firstName: 'David',
    lastName: 'Jones',
    militaryScienceLevel: 'MS3',
    phoneNumber: '555-0301',
    email: 'david.jones@example.com'
  },
  {
    company: 'Ranger',
    firstName: 'Jessica',
    lastName: 'Davis',
    militaryScienceLevel: 'MS4',
    phoneNumber: '555-0401',
    email: 'jessica.davis@example.com'
  }
];

async function importCadets() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log(`Starting import of ${CADETS.length} cadets...`);

    for (const cadet of CADETS) {
      try {
        const docRef = await addDoc(collection(db, 'cadets'), cadet);
        console.log(`✓ Added: ${cadet.lastName}, ${cadet.firstName} (${docRef.id})`);
      } catch (error) {
        console.error(`✗ Failed to add ${cadet.lastName}, ${cadet.firstName}:`, error);
      }
    }

    console.log('\nImport complete!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importCadets();

