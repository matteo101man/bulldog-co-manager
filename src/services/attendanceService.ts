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
import { AttendanceRecord, AttendanceStatus, DayOfWeek, Company, AttendanceType } from '../types';
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
    ptTuesday: null,
    ptWednesday: null,
    ptThursday: null,
    labThursday: null,
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
  weekStartDate: string,
  attendanceType: AttendanceType = 'PT'
): Promise<void> {
  const docId = getAttendanceDocId(cadetId, weekStartDate);
  const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
  
  const currentRecord = await getAttendanceRecord(cadetId, weekStartDate);
  
  // Save the complete record - this will be the authoritative source
  // All companies and Master List read from this same database
  const updateData: any = {
    cadetId,
    weekStartDate,
    ptTuesday: currentRecord?.ptTuesday ?? null,
    ptWednesday: currentRecord?.ptWednesday ?? null,
    ptThursday: currentRecord?.ptThursday ?? null,
    labThursday: currentRecord?.labThursday ?? null,
  };
  
  if (attendanceType === 'PT') {
    if (day === 'tuesday') updateData.ptTuesday = status;
    else if (day === 'wednesday') updateData.ptWednesday = status;
    else if (day === 'thursday') updateData.ptThursday = status;
  } else if (attendanceType === 'Lab' && day === 'thursday') {
    updateData.labThursday = status;
  }
  
  await setDoc(docRef, updateData, { merge: true });
}

/**
 * Update attendance record for a cadet with all days at once
 * This prevents race conditions when updating multiple days
 */
export async function updateAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const docId = getAttendanceDocId(record.cadetId, record.weekStartDate);
  const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
  
  await setDoc(docRef, {
    cadetId: record.cadetId,
    weekStartDate: record.weekStartDate,
    ptTuesday: record.ptTuesday ?? null,
    ptWednesday: record.ptWednesday ?? null,
    ptThursday: record.ptThursday ?? null,
    labThursday: record.labThursday ?? null,
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
        ptTuesday: null,
        ptWednesday: null,
        ptThursday: null,
        labThursday: null,
        weekStartDate
      });
    } else {
      // Ensure existing records have all fields
      const record = attendanceMap.get(cadet.id)!;
      if (!('ptTuesday' in record)) {
        // Migrate old records - check for old field names
        const oldRecord = record as any;
        attendanceMap.set(cadet.id, {
          cadetId: cadet.id,
          ptTuesday: oldRecord.tuesday ?? null,
          ptWednesday: oldRecord.wednesday ?? null,
          ptThursday: oldRecord.thursday ?? null,
          labThursday: null,
          weekStartDate
        });
      }
    }
  });

  return attendanceMap;
}

/**
 * Get total unexcused absences for a cadet across all weeks
 * @param attendanceType - 'PT' for Physical Training, 'Lab' for Lab, or undefined for both combined
 */
export async function getTotalUnexcusedAbsences(
  cadetId: string,
  attendanceType?: AttendanceType
): Promise<number> {
  // Query all attendance records for this cadet
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('cadetId', '==', cadetId)
  );
  const querySnapshot = await getDocs(q);
  
  let totalUnexcused = 0;
  querySnapshot.docs.forEach(doc => {
    const record = doc.data() as any;
    // Handle migration from old format
    if (attendanceType === 'PT' || !attendanceType) {
      if (record.ptTuesday === 'unexcused') totalUnexcused++;
      if (record.ptWednesday === 'unexcused') totalUnexcused++;
      if (record.ptThursday === 'unexcused') totalUnexcused++;
      // Legacy support
      if (record.tuesday === 'unexcused' && !record.ptTuesday) totalUnexcused++;
      if (record.wednesday === 'unexcused' && !record.ptWednesday) totalUnexcused++;
      if (record.thursday === 'unexcused' && !record.ptThursday && !record.labThursday) totalUnexcused++;
    }
    if (attendanceType === 'Lab' || !attendanceType) {
      if (record.labThursday === 'unexcused') totalUnexcused++;
    }
  });
  
  return totalUnexcused;
}

/**
 * Get total unexcused absences for multiple cadets
 * Returns a map of cadetId -> total unexcused count
 * @param attendanceType - 'PT' for Physical Training, 'Lab' for Lab, or undefined for both combined
 */
export async function getTotalUnexcusedAbsencesForCadets(
  cadetIds: string[],
  attendanceType?: AttendanceType
): Promise<Map<string, number>> {
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
      const record = doc.data() as any;
      const currentCount = result.get(record.cadetId) || 0;
      let unexcusedCount = 0;
      
      if (attendanceType === 'PT' || !attendanceType) {
        if (record.ptTuesday === 'unexcused') unexcusedCount++;
        if (record.ptWednesday === 'unexcused') unexcusedCount++;
        if (record.ptThursday === 'unexcused') unexcusedCount++;
        // Legacy support
        if (record.tuesday === 'unexcused' && !record.ptTuesday) unexcusedCount++;
        if (record.wednesday === 'unexcused' && !record.ptWednesday) unexcusedCount++;
        if (record.thursday === 'unexcused' && !record.ptThursday && !record.labThursday) unexcusedCount++;
      }
      if (attendanceType === 'Lab' || !attendanceType) {
        if (record.labThursday === 'unexcused') unexcusedCount++;
      }
      
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
    const record = doc.data() as any;
    // Migrate old records
    if (!('ptTuesday' in record)) {
      attendanceMap.set(record.cadetId, {
        cadetId: record.cadetId,
        ptTuesday: record.tuesday ?? null,
        ptWednesday: record.wednesday ?? null,
        ptThursday: record.thursday ?? null,
        labThursday: null,
        weekStartDate: record.weekStartDate
      });
    } else {
      attendanceMap.set(record.cadetId, record as AttendanceRecord);
    }
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
    batch.update(docSnap.ref, {
      ptTuesday: null,
      ptWednesday: null,
      ptThursday: null,
      labThursday: null,
    });
  });
  
  await batch.commit();
}

