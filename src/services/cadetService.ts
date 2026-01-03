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
  deleteDoc,
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
  // Filter out undefined values as Firestore doesn't accept them
  const cadetData = Object.fromEntries(
    Object.entries(cadet).filter(([_, value]) => value !== undefined)
  ) as Omit<Cadet, 'id'>;
  const docRef = await addDoc(collection(db, CADETS_COLLECTION), cadetData);
  return docRef.id;
}

/**
 * Update an existing cadet
 */
export async function updateCadet(cadetId: string, updates: Partial<Cadet>): Promise<void> {
  // Filter out undefined values as Firestore doesn't accept them
  const updateData = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  ) as Partial<Cadet>;
  const docRef = doc(db, CADETS_COLLECTION, cadetId);
  await updateDoc(docRef, updateData);
}

/**
 * Delete a cadet from the database
 */
export async function deleteCadet(cadetId: string): Promise<void> {
  const docRef = doc(db, CADETS_COLLECTION, cadetId);
  await deleteDoc(docRef);
}

/**
 * Get all cadets with a specific MS level
 */
export async function getCadetsByMSLevel(msLevel: string): Promise<Cadet[]> {
  const q = query(
    collection(db, CADETS_COLLECTION),
    where('militaryScienceLevel', '==', msLevel)
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

