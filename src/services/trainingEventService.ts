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
  Timestamp,
  onSnapshot,
  Unsubscribe
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
 * Subscribe to real-time updates for all training events
 * Returns an unsubscribe function that should be called when done listening
 */
export function subscribeToTrainingEvents(
  onUpdate: (events: TrainingEvent[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, TRAINING_EVENTS_COLLECTION),
    orderBy('date', 'desc')
  );
  
  return onSnapshot(
    q,
    (querySnapshot) => {
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TrainingEvent));
      onUpdate(events);
    },
    (error) => {
      console.error('Error in training events subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
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
 * Helper function to remove undefined values from an object
 * Firestore doesn't accept undefined values
 */
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * Add a new training event
 */
export async function addTrainingEvent(event: Omit<TrainingEvent, 'id'>): Promise<string> {
  const cleanEvent = removeUndefined(event);
  const docRef = await addDoc(collection(db, TRAINING_EVENTS_COLLECTION), cleanEvent);
  return docRef.id;
}

/**
 * Update an existing training event
 */
export async function updateTrainingEvent(eventId: string, updates: Partial<TrainingEvent>): Promise<void> {
  const docRef = doc(db, TRAINING_EVENTS_COLLECTION, eventId);
  const cleanUpdates = removeUndefined(updates);
  await updateDoc(docRef, cleanUpdates);
}

/**
 * Delete a training event
 */
export async function deleteTrainingEvent(eventId: string): Promise<void> {
  const docRef = doc(db, TRAINING_EVENTS_COLLECTION, eventId);
  await deleteDoc(docRef);
}

