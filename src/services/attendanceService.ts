import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs
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

  // Get all attendance records for this week
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where('weekStartDate', '==', weekStartDate)
  );
  const querySnapshot = await getDocs(q);
  
  const records = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);
  
  // Create a map of cadetId -> attendance record
  records.forEach(record => {
    attendanceMap.set(record.cadetId, record);
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

