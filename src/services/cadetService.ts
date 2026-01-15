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
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Cadet, Company } from '../types';
import { cacheService } from './cacheService';

const CADETS_COLLECTION = 'cadets';
const CACHE_MAX_AGE = 2 * 60 * 1000; // 2 minutes

/**
 * Get all cadets for a specific company
 * Uses cache first, then fetches from Firestore if cache is stale
 */
export async function getCadetsByCompany(company: Company, bypassCache: boolean = false): Promise<Cadet[]> {
  // If bypassing cache, fetch directly from Firestore
  if (bypassCache) {
    return fetchAndCacheCadets(company);
  }
  
  // Try cache first
  const cacheKey = company === 'Master' ? 'cadets_all' : `cadets_${company}`;
  const isStale = await cacheService.isCacheStale(cacheKey, CACHE_MAX_AGE);
  
  if (!isStale) {
    const cached = await cacheService.getCachedCadets(company);
    if (cached) {
      // Return cached data immediately, but still fetch in background
      fetchAndCacheCadets(company).catch(err => 
        console.error('Background fetch error:', err)
      );
      return cached as Cadet[];
    }
  }

  // Fetch from Firestore
  return fetchAndCacheCadets(company);
}

/**
 * Fetch cadets from Firestore and update cache
 */
async function fetchAndCacheCadets(company: Company): Promise<Cadet[]> {
  let cadets: Cadet[];
  
  if (company === 'Master') {
    // Get all cadets, excluding Grizzly Company
    const q = query(collection(db, CADETS_COLLECTION));
    const querySnapshot = await getDocs(q);
    cadets = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Cadet))
      .filter(cadet => cadet.company !== 'Grizzly Company');
  } else {
    // Get cadets for specific company
    const q = query(
      collection(db, CADETS_COLLECTION),
      where('company', '==', company)
    );
    const querySnapshot = await getDocs(q);
    cadets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Cadet)).sort((a, b) => {
      // Sort by last name, then first name
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }

  // Cache the results
  await cacheService.cacheCadets(cadets);
  
  return cadets;
}

/**
 * Subscribe to real-time updates for cadets
 * Returns an unsubscribe function that should be called when done listening
 */
export function subscribeToCadets(
  company: Company,
  onUpdate: (cadets: Cadet[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  let q;
  
  if (company === 'Master') {
    q = query(collection(db, CADETS_COLLECTION));
  } else {
    q = query(
      collection(db, CADETS_COLLECTION),
      where('company', '==', company)
    );
  }
  
  return onSnapshot(
    q,
    async (querySnapshot) => {
      let cadets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Cadet));
      
      // Filter out Grizzly Company for Master list
      if (company === 'Master') {
        cadets = cadets.filter(cadet => cadet.company !== 'Grizzly Company');
      }
      
      // Sort if not Master
      if (company !== 'Master') {
        cadets.sort((a, b) => {
          const lastNameCompare = a.lastName.localeCompare(b.lastName);
          if (lastNameCompare !== 0) return lastNameCompare;
          return a.firstName.localeCompare(b.firstName);
        });
      }
      
      // Update cache
      await cacheService.cacheCadets(cadets);
      
      onUpdate(cadets);
    },
    (error) => {
      console.error('Error in cadets subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
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

