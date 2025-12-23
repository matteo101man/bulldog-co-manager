import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Cadet, Company } from '../types';

const CADETS_COLLECTION = 'cadets';

/**
 * Get all cadets for a specific company
 */
export async function getCadetsByCompany(company: Company): Promise<Cadet[]> {
  if (company === 'Master') {
    // Get all cadets
    const q = query(collection(db, CADETS_COLLECTION));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Cadet));
  } else {
    // Get cadets for specific company
    const q = query(
      collection(db, CADETS_COLLECTION),
      where('company', '==', company)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Cadet)).sort((a, b) => {
      // Sort by last name, then first name
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }
}

/**
 * Get a single cadet by ID
 */
export async function getCadetById(cadetId: string): Promise<Cadet | null> {
  const docRef = doc(db, CADETS_COLLECTION, cadetId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Cadet;
  }
  return null;
}

/**
 * Add a new cadet to the database
 */
export async function addCadet(cadet: Omit<Cadet, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, CADETS_COLLECTION), cadet);
  return docRef.id;
}

/**
 * Update an existing cadet
 */
export async function updateCadet(cadetId: string, updates: Partial<Cadet>): Promise<void> {
  const docRef = doc(db, CADETS_COLLECTION, cadetId);
  await updateDoc(docRef, updates);
}

