import { collection, doc, getDoc, getDocs, query, setDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PTPlan, Company, DayOfWeek } from '../types';

const PT_PLANS_COLLECTION = 'ptPlans';

/**
 * Get document ID for a PT plan
 */
function getPTPlanDocId(company: Company, weekStartDate: string, day: DayOfWeek): string {
  return `${company}_${weekStartDate}_${day}`;
}

/**
 * Generate a unique ID for a generic plan
 */
function getGenericPlanDocId(): string {
  return `generic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get PT plan for a specific company, week, and day
 */
export async function getPTPlan(
  company: Company,
  weekStartDate: string,
  day: DayOfWeek
): Promise<PTPlan | null> {
  const docId = getPTPlanDocId(company, weekStartDate, day);
  const docRef = doc(db, PT_PLANS_COLLECTION, docId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as PTPlan;
  }

  return null;
}

/**
 * Get all PT plans for a company and week
 */
export async function getPTPlansForWeek(
  company: Company,
  weekStartDate: string
): Promise<Map<DayOfWeek, PTPlan>> {
  const plansMap = new Map<DayOfWeek, PTPlan>();
  
  const q = query(
    collection(db, PT_PLANS_COLLECTION),
    where('company', '==', company),
    where('weekStartDate', '==', weekStartDate)
  );
  
  const querySnapshot = await getDocs(q);
  
  querySnapshot.forEach((doc) => {
    const plan = { id: doc.id, ...doc.data() } as PTPlan;
    plansMap.set(plan.day, plan);
  });

  return plansMap;
}

/**
 * Save or update a PT plan
 */
export async function savePTPlan(plan: Omit<PTPlan, 'id'> & { id?: string }): Promise<void> {
  if (plan.isGeneric) {
    // For generic plans, generate a new ID if not provided
    const docId = plan.id || getGenericPlanDocId();
    const docRef = doc(db, PT_PLANS_COLLECTION, docId);
    
    await setDoc(docRef, {
      isGeneric: true,
      title: plan.title,
      firstFormation: plan.firstFormation,
      workouts: plan.workouts,
      location: plan.location,
    }, { merge: true });
  } else {
    // For regular plans, require company, weekStartDate, and day
    if (!plan.company || !plan.weekStartDate || !plan.day) {
      throw new Error('Company, weekStartDate, and day are required for non-generic plans');
    }
    const docId = getPTPlanDocId(plan.company, plan.weekStartDate, plan.day);
    const docRef = doc(db, PT_PLANS_COLLECTION, docId);
    
    await setDoc(docRef, {
      company: plan.company,
      weekStartDate: plan.weekStartDate,
      day: plan.day,
      title: plan.title,
      firstFormation: plan.firstFormation,
      workouts: plan.workouts,
      location: plan.location,
      isGeneric: false,
    }, { merge: true });
  }
}

/**
 * Delete a PT plan
 */
export async function deletePTPlan(
  company: Company,
  weekStartDate: string,
  day: DayOfWeek
): Promise<void> {
  const docId = getPTPlanDocId(company, weekStartDate, day);
  const docRef = doc(db, PT_PLANS_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Get all PT plans across all companies, weeks, and days
 * Used for loading old plans
 */
export async function getAllPTPlans(): Promise<PTPlan[]> {
  const q = query(collection(db, PT_PLANS_COLLECTION));
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as PTPlan));
}

/**
 * Get all generic PT plans (not tied to specific company/date)
 */
export async function getGenericPTPlans(): Promise<PTPlan[]> {
  const q = query(
    collection(db, PT_PLANS_COLLECTION),
    where('isGeneric', '==', true)
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as PTPlan));
}

/**
 * Delete a generic PT plan by ID
 */
export async function deleteGenericPTPlan(planId: string): Promise<void> {
  const docRef = doc(db, PT_PLANS_COLLECTION, planId);
  await deleteDoc(docRef);
}

/**
 * Delete a PT plan by document ID
 */
export async function deletePTPlanById(planId: string): Promise<void> {
  const docRef = doc(db, PT_PLANS_COLLECTION, planId);
  await deleteDoc(docRef);
}

