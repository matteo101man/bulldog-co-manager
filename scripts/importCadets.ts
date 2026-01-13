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
import { getFirestore, collection, addDoc, getDocs, query, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

interface CadetData {
  company: 'Alpha' | 'Bravo' | 'Charlie' | 'Ranger' | 'Headquarters Company';
  firstName: string;
  lastName: string;
  militaryScienceLevel: string;
  phoneNumber: string;
  email: string;
  age?: number;
  dateOfBirth?: string;
  position?: string;
}

// Real cadet data
const CADETS: CadetData[] = [
  { firstName: 'Harshitha', lastName: 'Ganesan', company: 'Alpha', militaryScienceLevel: 'MS1', phoneNumber: '', email: 'hvg45617@uga.edu' },
  { firstName: 'Bella', lastName: 'Hunt', company: 'Alpha', militaryScienceLevel: 'MS1', phoneNumber: '706-525-4038', email: 'irh50754@uga.edu', dateOfBirth: '2007-04-30', age: 18 },
  { firstName: 'Imogene', lastName: 'Sutherland', company: 'Alpha', militaryScienceLevel: 'MS1', phoneNumber: '904-716-6116', email: 'ims42503@uga.edu', dateOfBirth: '2007-06-28', age: 18 },
  { firstName: 'Ansley', lastName: 'Adkinson', company: 'Alpha', militaryScienceLevel: 'MS2', phoneNumber: '850-851-8457', email: 'aea08959@uga.edu', dateOfBirth: '2005-11-21', age: 20 },
  { firstName: 'Zennik', lastName: 'Bublak', company: 'Alpha', militaryScienceLevel: 'MS2', phoneNumber: '412-583-5382', email: 'zpb74188@uga.edu', dateOfBirth: '2006-07-27', age: 19 },
  { firstName: 'Jacob', lastName: 'Dickerson', company: 'Alpha', militaryScienceLevel: 'MS2', phoneNumber: '706-955-3723', email: 'jad68055@uga.edu', dateOfBirth: '2005-10-21', age: 20 },
  { firstName: 'Alexander', lastName: 'Keifer', company: 'Alpha', militaryScienceLevel: 'MS2', phoneNumber: '(804) 399-9827', email: 'abk40896@uga.edu', dateOfBirth: '2005-10-27', age: 20 },
  { firstName: 'Leah', lastName: 'McCoy', company: 'Alpha', militaryScienceLevel: 'MS2', phoneNumber: '(706) 905-0388', email: 'lhm69945@uga.edu', dateOfBirth: '2005-03-03', age: 20 },
  { firstName: 'Logan', lastName: 'Reed', company: 'Alpha', militaryScienceLevel: 'MS2', phoneNumber: '610-233-5218', email: 'ljr91592@uga.edu' },
  { firstName: 'Thomas', lastName: 'Wotka', company: 'Alpha', militaryScienceLevel: 'MS2', phoneNumber: '571-666-1233', email: 'tnw15758@uga.edu', dateOfBirth: '2006-07-23', age: 19 },
  { firstName: 'John', lastName: 'Baria', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '(470) 449-4276', email: 'johnbaria2004@gmail.com', dateOfBirth: '2004-07-05', age: 21 },
  { firstName: 'Andrew', lastName: 'Brezeale', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '706-436-9887', email: 'atb76924@uga.edu', dateOfBirth: '2005-07-09', age: 20 },
  { firstName: 'Kaidyn', lastName: 'Harris', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '(404) 974-6923', email: '' },
  { firstName: 'Ryan', lastName: 'Kronmiller', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '(215) 933-9921', email: 'rk26531@uga.edu', dateOfBirth: '1996-05-26', age: 29 },
  { firstName: 'Michael', lastName: 'Liscano', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '(706) 587-3330', email: 'myl66512@uga.edu' },
  { firstName: 'Logan', lastName: 'Magilligan', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '478-293-3000', email: 'lcm72794@uga.edu', dateOfBirth: '2005-04-16', age: 20 },
  { firstName: 'Isabella', lastName: 'Navarro', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '678-863-8158', email: 'ijn7721@uga.edu', dateOfBirth: '2004-05-24', age: 21 },
  { firstName: 'Peyton', lastName: 'Nobrega', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '(770)-453-2917', email: 'pan36075@uga.edu', dateOfBirth: '2005-03-12', age: 20 },
  { firstName: 'Andrew', lastName: 'Stefan', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '404-268-5505', email: 'ajs49208@uga.edu' },
  { firstName: 'Chase', lastName: 'Williams', company: 'Alpha', militaryScienceLevel: 'MS3', phoneNumber: '770-707-6460', email: 'cmw21683@uga.edu', dateOfBirth: '2005-05-02', age: 20 },
  { firstName: 'Yen', lastName: 'Le', company: 'Alpha', militaryScienceLevel: 'MS4', phoneNumber: '404-702-3932', email: 'Ytl01093@uga.edu', dateOfBirth: '2001-09-03', age: 24 },
  { firstName: 'Katie', lastName: 'Moebes', company: 'Alpha', militaryScienceLevel: 'MS4', phoneNumber: '678-709-1433', email: 'kgm65038@uga.edu' },
  { firstName: 'Tamera', lastName: 'Wallace', company: 'Alpha', militaryScienceLevel: 'MS5', phoneNumber: '(678) 365-6477', email: 'tgp24407@uga.edu', dateOfBirth: '2003-02-15', age: 22 },
  { firstName: 'Avery', lastName: 'Donahoe', company: 'Bravo', militaryScienceLevel: 'MS1', phoneNumber: '(267) 614-5643', email: 'acd76287@uga.edu', dateOfBirth: '2007-06-14', age: 18 },
  { firstName: 'Sam', lastName: 'Kiefer', company: 'Bravo', militaryScienceLevel: 'MS1', phoneNumber: '706-676-0540', email: 'stk83754@uga.edu' },
  { firstName: 'Fafa', lastName: 'Kwashie', company: 'Bravo', militaryScienceLevel: 'MS1', phoneNumber: '(508) 918-8086', email: 'fak39303@uga.edu', dateOfBirth: '2006-10-23', age: 19 },
  { firstName: 'Jordan', lastName: 'Markley', company: 'Bravo', militaryScienceLevel: 'MS1', phoneNumber: '470-430-0377', email: 'jrm56800@uga.edu', dateOfBirth: '2006-11-14', age: 19 },
  { firstName: 'Sofia', lastName: 'Multhauf', company: 'Bravo', militaryScienceLevel: 'MS1', phoneNumber: '321-318-2648', email: 'slm89665@uga.edu', dateOfBirth: '2007-04-23', age: 18 },
  { firstName: 'Ryan', lastName: 'Scanlon', company: 'Bravo', militaryScienceLevel: 'MS1', phoneNumber: '516-824-2960', email: 'rps50042@uga.edu', dateOfBirth: '2007-03-14', age: 18 },
  { firstName: 'Sarah', lastName: 'Burnette', company: 'Bravo', militaryScienceLevel: 'MS2', phoneNumber: '706-206-0396', email: 'msb93542@uga.edu', dateOfBirth: '1998-05-13', age: 27 },
  { firstName: 'Kelly', lastName: 'Hickey', company: 'Bravo', militaryScienceLevel: 'MS2', phoneNumber: '404-514-6495', email: 'kmh31461@uga.edu', dateOfBirth: '2005-09-30', age: 20 },
  { firstName: 'Alex', lastName: 'Jahng', company: 'Bravo', militaryScienceLevel: 'MS2', phoneNumber: '', email: 'akj76154@uga.edu', dateOfBirth: '2007-01-23', age: 18 },
  { firstName: 'Alex', lastName: 'Lopez', company: 'Bravo', militaryScienceLevel: 'MS2', phoneNumber: '', email: 'Am50699@uga.edu' },
  { firstName: 'Julianna', lastName: 'Phillips', company: 'Bravo', militaryScienceLevel: 'MS2', phoneNumber: '678-780-8266', email: 'Jep18741@uga.edu' },
  { firstName: 'Michael', lastName: 'Wilson', company: 'Bravo', militaryScienceLevel: 'MS2', phoneNumber: '770-802-9054', email: 'mtw23369@uga.edu', dateOfBirth: '2005-10-06', age: 20 },
  { firstName: 'Paul', lastName: 'Choo', company: 'Bravo', militaryScienceLevel: 'MS3', phoneNumber: '678-899-1362', email: 'pc07434@uga.edu', dateOfBirth: '1998-06-07', age: 27 },
  { firstName: 'Rex', lastName: 'Maddux', company: 'Bravo', militaryScienceLevel: 'MS3', phoneNumber: '404-904-1889', email: 'Rrm52184@uga.edu', dateOfBirth: '2005-05-20', age: 20 },
  { firstName: 'Emery', lastName: 'Marsh', company: 'Bravo', militaryScienceLevel: 'MS3', phoneNumber: '', email: 'ejm16759@uga.edu' },
  { firstName: 'Jackson', lastName: 'Martin', company: 'Bravo', militaryScienceLevel: 'MS3', phoneNumber: '(706)-286-4820', email: 'jam59347@uga.edu', dateOfBirth: '2005-05-31', age: 20 },
  { firstName: 'Sydney', lastName: 'McFadden', company: 'Bravo', militaryScienceLevel: 'MS3', phoneNumber: '(571) 477-4705', email: 'srm61011@uga.edu', dateOfBirth: '2005-08-16', age: 20 },
  { firstName: 'McKenzie', lastName: 'Dacus', company: 'Bravo', militaryScienceLevel: 'MS4', phoneNumber: '(678) 316-4646', email: 'kmd04510@uga.edu', dateOfBirth: '2000-03-23', age: 25 },
  { firstName: 'Matteo', lastName: 'Garza', company: 'Bravo', militaryScienceLevel: 'MS4', phoneNumber: '678-832-3492', email: 'mg57623@uga.edu', dateOfBirth: '2001-09-22', age: 24 },
  { firstName: 'Gavin', lastName: 'Guerra', company: 'Bravo', militaryScienceLevel: 'MS4', phoneNumber: '678-725-5437', email: 'gdg33616@uga.edu', dateOfBirth: '2003-11-25', age: 22 },
  { firstName: 'Lillian', lastName: 'Robinson', company: 'Bravo', militaryScienceLevel: 'MS4', phoneNumber: '(470) 856-7100', email: 'alr14646@uga.edu' },
  { firstName: 'Makaela', lastName: 'Whitley', company: 'Bravo', militaryScienceLevel: 'MS5', phoneNumber: '(912) 704-9960', email: 'mlw67193@uga.edu', dateOfBirth: '2003-03-09', age: 22 },
  { firstName: 'Dwight', lastName: 'Banks', company: 'Charlie', militaryScienceLevel: 'MS2', phoneNumber: '662-910-5542', email: 'dcb67569@uga.edu', dateOfBirth: '2006-06-29', age: 19 },
  { firstName: 'Kushal', lastName: 'Dwaram', company: 'Charlie', militaryScienceLevel: 'MS2', phoneNumber: '470-991-3925', email: 'kd91820@uga.edu', dateOfBirth: '2005-11-08', age: 20 },
  { firstName: 'Ben', lastName: 'Hill', company: 'Charlie', militaryScienceLevel: 'MS2', phoneNumber: '404-908-2807', email: 'bph98653@uga.edu', dateOfBirth: '2005-06-22', age: 20 },
  { firstName: 'James', lastName: 'Nelson', company: 'Charlie', militaryScienceLevel: 'MS2', phoneNumber: '', email: 'jtn72520@uga.edu' },
  { firstName: 'Aydin', lastName: 'Street', company: 'Charlie', militaryScienceLevel: 'MS2', phoneNumber: '912-481-1713', email: 'aes18425@uga.edu', dateOfBirth: '2006-07-15', age: 19 },
  { firstName: 'Lexis', lastName: 'Van Meter', company: 'Charlie', militaryScienceLevel: 'MS2', phoneNumber: '(706)371-1556', email: 'lev40769@uga.edu', dateOfBirth: '2005-09-22', age: 20 },
  { firstName: 'Ethan', lastName: 'Wilkins', company: 'Charlie', militaryScienceLevel: 'MS2', phoneNumber: '912-509-1124', email: 'eaw12480@uga.edu', dateOfBirth: '2004-10-11', age: 21 },
  { firstName: 'William', lastName: 'Brewer', company: 'Charlie', militaryScienceLevel: 'MS3', phoneNumber: '(678) 338-0827', email: 'wfb58434@uga.edu', dateOfBirth: '2002-10-10', age: 23 },
  { firstName: 'Andrew', lastName: 'Dantoulis', company: 'Charlie', militaryScienceLevel: 'MS3', phoneNumber: '(404)-673-4832', email: 'atd15320@uga.edu', dateOfBirth: '2005-04-26', age: 20 },
  { firstName: 'Brendan', lastName: 'Latorre-Murrin', company: 'Charlie', militaryScienceLevel: 'MS3', phoneNumber: '404-317-1371', email: 'ironridgeforge@gmail.com' },
  { firstName: 'Danny', lastName: 'Lipsey', company: 'Charlie', militaryScienceLevel: 'MS3', phoneNumber: '770-688-0450', email: 'dwl48582@uga.edu', dateOfBirth: '2005-05-12', age: 20 },
  { firstName: 'Rafael', lastName: 'Reece', company: 'Charlie', militaryScienceLevel: 'MS3', phoneNumber: '513-312-3771', email: 'rar59292@uga.edu', dateOfBirth: '2005-01-17', age: 20 },
  { firstName: 'Andrew', lastName: 'Shield', company: 'Charlie', militaryScienceLevel: 'MS3', phoneNumber: '706-912-2155', email: 'ajs00072@uga.edu', dateOfBirth: '1999-03-24', age: 26 },
  { firstName: 'Daniel', lastName: 'Woodson', company: 'Charlie', militaryScienceLevel: 'MS3', phoneNumber: '706-415-3751', email: 'dcw30828@uga.edu', dateOfBirth: '2005-07-08', age: 20 },
  { firstName: 'Kenny', lastName: 'Biegalski', company: 'Charlie', militaryScienceLevel: 'MS4', phoneNumber: '404-630-6123', email: 'ksb42995@uga.edu', dateOfBirth: '2003-07-08', age: 22 },
  { firstName: 'Ryan', lastName: 'Fagan', company: 'Charlie', militaryScienceLevel: 'MS4', phoneNumber: '410-591-4866', email: 'rrf58653@uga.edu', dateOfBirth: '2004-05-18', age: 21 },
  { firstName: 'Joshua', lastName: 'Kang', company: 'Charlie', militaryScienceLevel: 'MS4', phoneNumber: '404-772-4612', email: 'jk78799@uga.edu', dateOfBirth: '2004-03-29', age: 21 },
  { firstName: 'Raven', lastName: 'Kirkland', company: 'Charlie', militaryScienceLevel: 'MS4', phoneNumber: '843-765-8828', email: 'raven.kirkland@uga.edu', dateOfBirth: '1996-08-25', age: 29 },
  { firstName: 'Sean', lastName: 'Lupczynski', company: 'Charlie', militaryScienceLevel: 'MS4', phoneNumber: '678-982-7783', email: 'Srl90278@uga.edu' },
  { firstName: 'Emma Kate', lastName: 'Merriam', company: 'Charlie', militaryScienceLevel: 'MS4', phoneNumber: '(770) 825-2002', email: 'Ekm47558@uga.edu', dateOfBirth: '2002-11-03', age: 23 },
  { firstName: 'Richard', lastName: 'Rabindran', company: 'Charlie', militaryScienceLevel: 'MS4', phoneNumber: '732-476-4670', email: 'drr13114@uga.edu', dateOfBirth: '2003-10-05', age: 22 },
  { firstName: 'Evan', lastName: 'Sagatovski', company: 'Charlie', militaryScienceLevel: 'MS5', phoneNumber: '(470) 985-4325', email: 'es60180@uga.edu', dateOfBirth: '2003-09-11', age: 22 },
  { firstName: 'Davis', lastName: 'Evans', company: 'Ranger', militaryScienceLevel: 'MS4', phoneNumber: '(912) 433-2639', email: 'Dce37178@uga.edu', dateOfBirth: '2005-11-08', age: 20 },
  { firstName: 'Hampton', lastName: 'Jackson', company: 'Ranger', militaryScienceLevel: 'MS4', phoneNumber: '(912) 432-1094', email: 'hampton.jackson@uga.edu', dateOfBirth: '2003-12-20', age: 22 }
];

async function deleteAllCadets(db: any) {
  console.log('Deleting all existing cadets...');
  const q = query(collection(db, 'cadets'));
  const querySnapshot = await getDocs(q);
  
  let deletedCount = 0;
  for (const docSnap of querySnapshot.docs) {
    await deleteDoc(doc(db, 'cadets', docSnap.id));
    deletedCount++;
  }
  
  console.log(`Deleted ${deletedCount} existing cadets.`);
}

async function importCadets() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Delete all existing cadets first
    await deleteAllCadets(db);

    console.log(`\nStarting import of ${CADETS.length} cadets...`);

    for (const cadet of CADETS) {
      try {
        // Remove undefined fields before adding
        const cadetData: any = {
          company: cadet.company,
          firstName: cadet.firstName,
          lastName: cadet.lastName,
          militaryScienceLevel: cadet.militaryScienceLevel,
          phoneNumber: cadet.phoneNumber,
          email: cadet.email
        };
        
        if (cadet.age !== undefined) cadetData.age = cadet.age;
        if (cadet.dateOfBirth) cadetData.dateOfBirth = cadet.dateOfBirth;
        if (cadet.position) cadetData.position = cadet.position;
        
        const docRef = await addDoc(collection(db, 'cadets'), cadetData);
        console.log(`✓ Added: ${cadet.lastName}, ${cadet.firstName} (${docRef.id})`);
      } catch (error) {
        console.error(`✗ Failed to add ${cadet.lastName}, ${cadet.firstName}:`, error);
      }
    }

    console.log(`\nImport complete! Total: ${CADETS.length} cadets imported.`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importCadets();

