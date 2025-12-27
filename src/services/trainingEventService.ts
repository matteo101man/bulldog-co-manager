import { 
  collection, 
  query, 
  orderBy,
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { TrainingEvent } from '../types';

const TRAINING_EVENTS_COLLECTION = 'trainingEvents';

/**
 * Get all training events
 */
export async function getAllTrainingEvents(): Promise<TrainingEvent[]> {
  const q = query(
    collection(db, TRAINING_EVENTS_COLLECTION),
    orderBy('date', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TrainingEvent));
}

/**
 * Get a single training event by ID
 */
export async function getTrainingEventById(eventId: string): Promise<TrainingEvent | null> {
  const docRef = doc(db, TRAINING_EVENTS_COLLECTION, eventId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as TrainingEvent;
  }
  return null;
}

/**
 * Add a new training event
 */
export async function addTrainingEvent(event: Omit<TrainingEvent, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, TRAINING_EVENTS_COLLECTION), event);
  return docRef.id;
}

/**
 * Update an existing training event
 */
export async function updateTrainingEvent(eventId: string, updates: Partial<TrainingEvent>): Promise<void> {
  const docRef = doc(db, TRAINING_EVENTS_COLLECTION, eventId);
  await updateDoc(docRef, updates);
}

/**
 * Delete a training event
 */
export async function deleteTrainingEvent(eventId: string): Promise<void> {
  const docRef = doc(db, TRAINING_EVENTS_COLLECTION, eventId);
  await deleteDoc(docRef);
}

