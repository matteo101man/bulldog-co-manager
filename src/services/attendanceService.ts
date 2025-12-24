import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AttendanceRecord, AttendanceStatus, DayOfWeek, Company } from '../types';
import { getCadetsByCompany } from './cadetService';

const ATTENDANCE_COLLECTION = 'attendance';

/**
 * Get attendance document ID for a cadet and week
 */
function getAttendanceDocId(cadetId: string, weekStartDate: string): string {
  return `${weekStartDate}_${cadetId}`;
}

/**
 * Get attendance record for a cadet for a specific week
 */
export async function getAttendanceRecord(
  cadetId: string,
  weekStartDate: string
): Promise<AttendanceRecord | null> {
  const docId = getAttendanceDocId(cadetId, weekStartDate);
  const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as AttendanceRecord;
  }

  // Return default record if none exists
  return {
    cadetId,
    tuesday: null,
    wednesday: null,
    thursday: null,
    weekStartDate
  };
}

/**
 * Update attendance for a specific cadet, day, and week
 * This is the single source of truth - all changes (from Master List or individual companies) 
 * are saved here and will be reflected everywhere since all views read from the same database.
 */
export async function updateAttendance(
  cadetId: string,
  day: DayOfWeek,
  status: AttendanceStatus,
  weekStartDate: string
): Promise<void> {
  const docId = getAttendanceDocId(cadetId, weekStartDate);
  const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
  
  const currentRecord = await getAttendanceRecord(cadetId, weekStartDate);
  
  // Save the complete record - this will be the authoritative source
  // All companies and Master List read from this same database
  await setDoc(docRef, {
    cadetId,
    weekStartDate,
    tuesday: day === 'tuesday' ? status : (currentRecord?.tuesday ?? null),
    wednesday: day === 'wednesday' ? status : (currentRecord?.wednesday ?? null),
    thursday: day === 'thursday' ? status : (currentRecord?.thursday ?? null),
  }, { merge: true });
}

/**
 * Get all attendance records for a company for a specific week
 */
export async function getCompanyAttendance(
  company: Company,
  weekStartDate: string
): Promise<Map<string, AttendanceRecord>> {
  const cadets = await getCadetsByCompany(company);
  const attendanceMap = new Map<string, AttendanceRecord>();
  
  // Create a set of cadet IDs for this company for quick lookup
  const cadetIds = new Set(cadets.map(c => c.id));

  // Get all attendance records for this week
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('weekStartDate', '==', weekStartDate)
  );
  const querySnapshot = await getDocs(q);
  
  const records = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);
  
  // Only include records for cadets in this company
  records.forEach(record => {
    if (cadetIds.has(record.cadetId)) {
      attendanceMap.set(record.cadetId, record);
    }
  });

  // Ensure all cadets have a record (even if null)
  cadets.forEach(cadet => {
    if (!attendanceMap.has(cadet.id)) {
      attendanceMap.set(cadet.id, {
        cadetId: cadet.id,
        tuesday: null,
        wednesday: null,
        thursday: null,
        weekStartDate
      });
    }
  });

  return attendanceMap;
}

/**
 * Get total unexcused absences for a cadet across all weeks
 */
export async function getTotalUnexcusedAbsences(cadetId: string): Promise<number> {
  // Query all attendance records for this cadet
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('cadetId', '==', cadetId)
  );
  const querySnapshot = await getDocs(q);
  
  let totalUnexcused = 0;
  querySnapshot.docs.forEach(doc => {
    const record = doc.data() as AttendanceRecord;
    if (record.tuesday === 'unexcused') totalUnexcused++;
    if (record.wednesday === 'unexcused') totalUnexcused++;
    if (record.thursday === 'unexcused') totalUnexcused++;
  });
  
  return totalUnexcused;
}

/**
 * Get total unexcused absences for multiple cadets
 * Returns a map of cadetId -> total unexcused count
 */
export async function getTotalUnexcusedAbsencesForCadets(cadetIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  
  // Initialize all cadets with 0
  cadetIds.forEach(id => result.set(id, 0));
  
  // Query all attendance records for these cadets
  // Note: Firestore 'in' queries are limited to 10 items, so we'll need to batch
  const batchSize = 10;
  for (let i = 0; i < cadetIds.length; i += batchSize) {
    const batch = cadetIds.slice(i, i + batchSize);
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('cadetId', 'in', batch)
    );
    const querySnapshot = await getDocs(q);
    
    querySnapshot.docs.forEach(doc => {
      const record = doc.data() as AttendanceRecord;
      const currentCount = result.get(record.cadetId) || 0;
      let unexcusedCount = 0;
      if (record.tuesday === 'unexcused') unexcusedCount++;
      if (record.wednesday === 'unexcused') unexcusedCount++;
      if (record.thursday === 'unexcused') unexcusedCount++;
      result.set(record.cadetId, currentCount + unexcusedCount);
    });
  }
  
  return result;
}

/**
 * Get all attendance records for a specific week (for all companies)
 */
export async function getAllAttendanceForWeek(weekStartDate: string): Promise<Map<string, AttendanceRecord>> {
  const attendanceMap = new Map<string, AttendanceRecord>();
  
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('weekStartDate', '==', weekStartDate)
  );
  const querySnapshot = await getDocs(q);
  
  querySnapshot.docs.forEach(doc => {
    const record = doc.data() as AttendanceRecord;
    attendanceMap.set(record.cadetId, record);
  });
  
  return attendanceMap;
}

/**
 * Clear all attendance data (set all to null)
 */
export async function clearAllAttendance(): Promise<void> {
  const querySnapshot = await getDocs(collection(db, ATTENDANCE_COLLECTION));
  const batch = writeBatch(db);
  
  querySnapshot.docs.forEach(docSnap => {
    const record = docSnap.data() as AttendanceRecord;
    batch.update(docSnap.ref, {
      tuesday: null,
      wednesday: null,
      thursday: null,
    });
  });
  
  await batch.commit();
}

