import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

async function checkAndRemove() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  const snapshot = await getDocs(collection(db, 'cadets'));
  const toRemove = ['William Brewer', 'Lexis Van Meter'];
  
  console.log('Searching for cadets to remove...\n');
  
  let found = 0;
  snapshot.forEach((docSnap) => {
    const cadet = docSnap.data();
    const fullName = `${cadet.firstName} ${cadet.lastName}`;
    
    if (toRemove.includes(fullName)) {
      console.log(`Found: ${fullName} (ID: ${docSnap.id})`);
      found++;
      
      // Remove them
      deleteDoc(doc(db, 'cadets', docSnap.id)).then(() => {
        console.log(`✓ Removed: ${fullName}`);
      }).catch(err => {
        console.error(`✗ Failed to remove ${fullName}:`, err);
      });
    }
  });
  
  if (found === 0) {
    console.log('No matching cadets found. They may have already been removed or have different names.');
  }
}

checkAndRemove();
