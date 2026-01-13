import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AttendanceRecord, AttendanceStatus, DayOfWeek, Company, AttendanceType } from '../types';
import { getCadetsByCompany } from './cadetService';
import { cacheService } from './cacheService';

const ATTENDANCE_COLLECTION = 'attendance';
const CACHE_MAX_AGE = 2 * 60 * 1000; // 2 minutes

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
    ptMonday: null,
    ptTuesday: null,
    ptWednesday: null,
    ptThursday: null,
    ptFriday: null,
    labThursday: null,
    tacticsTuesday: null,
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
    ptMonday: currentRecord?.ptMonday ?? null,
    ptTuesday: currentRecord?.ptTuesday ?? null,
    ptWednesday: currentRecord?.ptWednesday ?? null,
    ptThursday: currentRecord?.ptThursday ?? null,
    ptFriday: currentRecord?.ptFriday ?? null,
    labThursday: currentRecord?.labThursday ?? null,
    tacticsTuesday: currentRecord?.tacticsTuesday ?? null,
  };
  
  if (attendanceType === 'PT') {
    if (day === 'monday') updateData.ptMonday = status;
    else if (day === 'tuesday') updateData.ptTuesday = status;
    else if (day === 'wednesday') updateData.ptWednesday = status;
    else if (day === 'thursday') updateData.ptThursday = status;
    else if (day === 'friday') updateData.ptFriday = status;
  } else if (attendanceType === 'Lab' && day === 'thursday') {
    updateData.labThursday = status;
  } else if (attendanceType === 'Tactics' && day === 'tuesday') {
    updateData.tacticsTuesday = status;
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
    ptMonday: record.ptMonday ?? null,
    ptTuesday: record.ptTuesday ?? null,
    ptWednesday: record.ptWednesday ?? null,
    ptThursday: record.ptThursday ?? null,
    ptFriday: record.ptFriday ?? null,
    labThursday: record.labThursday ?? null,
    tacticsTuesday: record.tacticsTuesday ?? null,
  }, { merge: true });
  
  // Invalidate cache for this week
  const cacheKey = `attendance_${record.weekStartDate}`;
  // Cache will be updated by real-time listener
}

/**
 * Batch update multiple attendance records at once
 * This is more efficient than updating records one by one
 * Firestore batch limit is 500 operations
 */
export async function batchUpdateAttendanceRecords(
  records: AttendanceRecord[]
): Promise<void> {
  if (records.length === 0) return;
  
  // Firestore batch limit is 500
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchRecords = records.slice(i, i + BATCH_SIZE);
    
    batchRecords.forEach(record => {
      const docId = getAttendanceDocId(record.cadetId, record.weekStartDate);
      const docRef = doc(db, ATTENDANCE_COLLECTION, docId);
      
      batch.set(docRef, {
        cadetId: record.cadetId,
        weekStartDate: record.weekStartDate,
        ptMonday: record.ptMonday ?? null,
        ptTuesday: record.ptTuesday ?? null,
        ptWednesday: record.ptWednesday ?? null,
        ptThursday: record.ptThursday ?? null,
        ptFriday: record.ptFriday ?? null,
        labThursday: record.labThursday ?? null,
        tacticsTuesday: record.tacticsTuesday ?? null,
      }, { merge: true });
    });
    
    await batch.commit();
  }
  
  // Cache will be updated by real-time listeners
}

/**
 * Get all attendance records for a company for a specific week
 * Uses cache first, then fetches from Firestore if cache is stale
 */
export async function getCompanyAttendance(
  company: Company,
  weekStartDate: string
): Promise<Map<string, AttendanceRecord>> {
  // Try cache first
  const cacheKey = `attendance_${weekStartDate}`;
  const isStale = await cacheService.isCacheStale(cacheKey, CACHE_MAX_AGE);
  
  if (!isStale) {
    const cached = await cacheService.getCachedAttendance(weekStartDate);
    if (cached) {
      // Filter by company if needed
      const cadets = await getCadetsByCompany(company);
      const cadetIds = new Set(cadets.map(c => c.id));
      const filtered = new Map<string, AttendanceRecord>();
      
      cached.forEach((record, cadetId) => {
        if (cadetIds.has(cadetId)) {
          filtered.set(cadetId, record);
        }
      });
      
      // Ensure all cadets have a record
      ensureAllCadetsHaveRecords(filtered, cadets, weekStartDate);
      
      // Return cached data immediately, but still fetch in background
      fetchAndCacheAttendance(company, weekStartDate).catch(err => 
        console.error('Background fetch error:', err)
      );
      
      return filtered;
    }
  }

  // Fetch from Firestore
  return fetchAndCacheAttendance(company, weekStartDate);
}

/**
 * Fetch attendance from Firestore and update cache
 */
async function fetchAndCacheAttendance(
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
  ensureAllCadetsHaveRecords(attendanceMap, cadets, weekStartDate);

  // Cache the results
  await cacheService.cacheAttendance(attendanceMap, weekStartDate);

  return attendanceMap;
}

/**
 * Ensure all cadets have attendance records
 */
function ensureAllCadetsHaveRecords(
  attendanceMap: Map<string, AttendanceRecord>,
  cadets: any[],
  weekStartDate: string
): void {
  cadets.forEach(cadet => {
    if (!attendanceMap.has(cadet.id)) {
      attendanceMap.set(cadet.id, {
        cadetId: cadet.id,
        ptMonday: null,
        ptTuesday: null,
        ptWednesday: null,
        ptThursday: null,
        ptFriday: null,
        labThursday: null,
        tacticsTuesday: null,
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
          ptMonday: null,
          ptTuesday: oldRecord.tuesday ?? null,
          ptWednesday: oldRecord.wednesday ?? null,
          ptThursday: oldRecord.thursday ?? null,
          ptFriday: null,
          labThursday: null,
          tacticsTuesday: null,
          weekStartDate
        });
      }
    }
  });
}

/**
 * Subscribe to real-time updates for company attendance
 * Returns an unsubscribe function that should be called when done listening
 */
export function subscribeToCompanyAttendance(
  company: Company,
  weekStartDate: string,
  onUpdate: (attendance: Map<string, AttendanceRecord>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('weekStartDate', '==', weekStartDate)
  );
  
  return onSnapshot(
    q,
    async (querySnapshot) => {
      const records = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);
      const attendanceMap = new Map<string, AttendanceRecord>();
      
      // Get cadets for filtering
      const cadets = await getCadetsByCompany(company);
      const cadetIds = new Set(cadets.map(c => c.id));
      
      // Only include records for cadets in this company
      records.forEach(record => {
        if (cadetIds.has(record.cadetId)) {
          attendanceMap.set(record.cadetId, record);
        }
      });
      
      // Ensure all cadets have a record
      ensureAllCadetsHaveRecords(attendanceMap, cadets, weekStartDate);
      
      // Update cache
      await cacheService.cacheAttendance(attendanceMap, weekStartDate);
      
      onUpdate(attendanceMap);
    },
    (error) => {
      console.error('Error in attendance subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
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
      if (record.ptMonday === 'unexcused') totalUnexcused++;
      if (record.ptTuesday === 'unexcused') totalUnexcused++;
      if (record.ptWednesday === 'unexcused') totalUnexcused++;
      if (record.ptThursday === 'unexcused') totalUnexcused++;
      if (record.ptFriday === 'unexcused') totalUnexcused++;
      // Legacy support
      if (record.tuesday === 'unexcused' && !record.ptTuesday) totalUnexcused++;
      if (record.wednesday === 'unexcused' && !record.ptWednesday) totalUnexcused++;
      if (record.thursday === 'unexcused' && !record.ptThursday && !record.labThursday) totalUnexcused++;
    }
    if (attendanceType === 'Lab' || !attendanceType) {
      if (record.labThursday === 'unexcused') totalUnexcused++;
    }
    if (attendanceType === 'Tactics' || !attendanceType) {
      if (record.tacticsTuesday === 'unexcused') totalUnexcused++;
    }
  });
  
  return totalUnexcused;
}

/**
 * Get specific dates of unexcused absences for a cadet
 * @param cadetId - The cadet ID
 * @param attendanceType - 'PT' for Physical Training, 'Lab' for Lab
 * @returns Array of date strings in YYYY-MM-DD format
 */
export async function getUnexcusedAbsenceDates(
  cadetId: string,
  attendanceType: AttendanceType
): Promise<string[]> {
  // Query all attendance records for this cadet
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('cadetId', '==', cadetId)
  );
  const querySnapshot = await getDocs(q);
  
  const dates: string[] = [];
  
  querySnapshot.docs.forEach(doc => {
    const record = doc.data() as any;
    const weekStartDate = record.weekStartDate;
    
    if (!weekStartDate) return;
    
    // Calculate dates for Tuesday, Wednesday, Thursday based on week start (Monday)
    const [year, month, day] = weekStartDate.split('-').map(Number);
    const tuesday = new Date(year, month - 1, day + 1);
    const wednesday = new Date(year, month - 1, day + 2);
    const thursday = new Date(year, month - 1, day + 3);
    
    const formatDate = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    if (attendanceType === 'PT') {
      // Check PT days
      const monday = new Date(year, month - 1, day);
      const friday = new Date(year, month - 1, day + 4);
      
      if (record.ptMonday === 'unexcused') {
        dates.push(formatDate(monday));
      }
      if (record.ptTuesday === 'unexcused') {
        dates.push(formatDate(tuesday));
      }
      if (record.ptWednesday === 'unexcused') {
        dates.push(formatDate(wednesday));
      }
      if (record.ptThursday === 'unexcused') {
        dates.push(formatDate(thursday));
      }
      if (record.ptFriday === 'unexcused') {
        dates.push(formatDate(friday));
      }
      // Legacy support
      if (record.tuesday === 'unexcused' && !record.ptTuesday) {
        dates.push(formatDate(tuesday));
      }
      if (record.wednesday === 'unexcused' && !record.ptWednesday) {
        dates.push(formatDate(wednesday));
      }
      if (record.thursday === 'unexcused' && !record.ptThursday && !record.labThursday) {
        dates.push(formatDate(thursday));
      }
    } else if (attendanceType === 'Lab') {
      // Check Lab day (Thursday only)
      if (record.labThursday === 'unexcused') {
        dates.push(formatDate(thursday));
      }
    } else if (attendanceType === 'Tactics') {
      // Check Tactics day (Tuesday only)
      if (record.tacticsTuesday === 'unexcused') {
        dates.push(formatDate(tuesday));
      }
    }
  });
  
  // Sort dates chronologically (newest first)
  return dates.sort((a, b) => b.localeCompare(a));
}

/**
 * Get total unexcused absences for multiple cadets
 * Returns a map of cadetId -> total unexcused count
 * @param attendanceType - 'PT' for Physical Training, 'Lab' for Lab, or undefined for both combined
 * 
 * Optimized: Uses client-side processing to reduce server load
 */
export async function getTotalUnexcusedAbsencesForCadets(
  cadetIds: string[],
  attendanceType?: AttendanceType
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  
  // Initialize all cadets with 0
  cadetIds.forEach(id => result.set(id, 0));
  
  if (cadetIds.length === 0) return result;
  
  // Query all attendance records for these cadets
  // Note: Firestore 'in' queries are limited to 10 items, so we'll need to batch
  const batchSize = 10;
  const queries: Promise<any>[] = [];
  
  for (let i = 0; i < cadetIds.length; i += batchSize) {
    const batch = cadetIds.slice(i, i + batchSize);
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('cadetId', 'in', batch)
    );
    queries.push(getDocs(q));
  }
  
  // Execute all queries in parallel for better performance
  const querySnapshots = await Promise.all(queries);
  
  // Process all results client-side (reduces server load)
  querySnapshots.forEach(querySnapshot => {
    querySnapshot.docs.forEach(doc => {
      const record = doc.data() as any;
      const currentCount = result.get(record.cadetId) || 0;
      let unexcusedCount = 0;
      
      if (attendanceType === 'PT' || !attendanceType) {
        if (record.ptMonday === 'unexcused') unexcusedCount++;
        if (record.ptTuesday === 'unexcused') unexcusedCount++;
        if (record.ptWednesday === 'unexcused') unexcusedCount++;
        if (record.ptThursday === 'unexcused') unexcusedCount++;
        if (record.ptFriday === 'unexcused') unexcusedCount++;
        // Legacy support
        if (record.tuesday === 'unexcused' && !record.ptTuesday) unexcusedCount++;
        if (record.wednesday === 'unexcused' && !record.ptWednesday) unexcusedCount++;
        if (record.thursday === 'unexcused' && !record.ptThursday && !record.labThursday) unexcusedCount++;
      }
      if (attendanceType === 'Lab' || !attendanceType) {
        if (record.labThursday === 'unexcused') unexcusedCount++;
      }
      if (attendanceType === 'Tactics' || !attendanceType) {
        if (record.tacticsTuesday === 'unexcused') unexcusedCount++;
      }
      
      result.set(record.cadetId, currentCount + unexcusedCount);
    });
  });
  
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
        ptMonday: null,
        ptTuesday: record.tuesday ?? null,
        ptWednesday: record.wednesday ?? null,
        ptThursday: record.thursday ?? null,
        ptFriday: null,
        labThursday: null,
        tacticsTuesday: null,
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
      ptMonday: null,
      ptTuesday: null,
      ptWednesday: null,
      ptThursday: null,
      ptFriday: null,
      labThursday: null,
      tacticsTuesday: null,
    });
  });
  
  await batch.commit();
}

