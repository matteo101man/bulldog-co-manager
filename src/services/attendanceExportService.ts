import * as XLSX from 'xlsx-js-style';
import { getCadetsByMSLevel } from './cadetService';
import { getAllAttendanceForWeek } from './attendanceService';
import { Cadet, AttendanceStatus, AttendanceRecord } from '../types';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase/config';

interface CadetAttendanceData {
  cadet: Cadet;
  dates: Map<string, AttendanceStatus | null>; // date string -> status
  totalPresent: number;
  totalExcused: number;
  totalUnexcused: number;
}

/**
 * Get all dates between start and end date (inclusive)
 */
function getDatesBetween(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Get the day of week for a date (0 = Sunday, 1 = Monday, etc.)
 */
function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay();
}

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - daysToSubtract);
  
  const weekYear = date.getFullYear();
  const weekMonth = String(date.getMonth() + 1).padStart(2, '0');
  const weekDay = String(date.getDate()).padStart(2, '0');
  return `${weekYear}-${weekMonth}-${weekDay}`;
}

/**
 * Get PT attendance status for a specific date
 */
function getPTAttendanceForDate(
  record: AttendanceRecord | null,
  dateStr: string
): AttendanceStatus | null {
  if (!record) return null;
  
  const dayOfWeek = getDayOfWeek(dateStr);
  
  switch (dayOfWeek) {
    case 1: // Monday
      return record.ptMonday ?? null;
    case 2: // Tuesday
      return record.ptTuesday ?? null;
    case 3: // Wednesday
      return record.ptWednesday ?? null;
    case 4: // Thursday
      return record.ptThursday ?? null;
    case 5: // Friday
      return record.ptFriday ?? null;
    default:
      return null;
  }
}

/**
 * Get Lab attendance status for a specific date (Thursday only)
 */
function getLabAttendanceForDate(
  record: AttendanceRecord | null,
  dateStr: string
): AttendanceStatus | null {
  if (!record) return null;
  
  const dayOfWeek = getDayOfWeek(dateStr);
  
  if (dayOfWeek === 4) { // Thursday
    return record.labThursday ?? null;
  }
  
  return null;
}

/**
 * Get Tactics attendance status for a specific date (Tuesday only, MS3 only)
 */
function getTacticsAttendanceForDate(
  record: AttendanceRecord | null,
  dateStr: string,
  cadetMSLevel?: string
): AttendanceStatus | null {
  if (!record || cadetMSLevel !== 'MS3') return null;
  
  const dayOfWeek = getDayOfWeek(dateStr);
  
  if (dayOfWeek === 2) { // Tuesday
    return record.tacticsTuesday ?? null;
  }
  
  return null;
}

/**
 * Create a worksheet for a specific attendance type
 */
function createAttendanceSheet(
  wsData: any[][],
  cadetAttendanceData: Map<string, CadetAttendanceData>,
  allDates: string[],
  msLevels: string[]
): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Name column
    ...allDates.map(() => ({ wch: 12 })), // Date columns
    { wch: 15 }, // Total Present
    { wch: 15 }, // Total Excused
    { wch: 15 }  // Total Unexcused
  ];
  
  // Apply colors and styling to cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  // Style header row (row 0)
  for (let C = 0; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      fill: { fgColor: { rgb: 'FFD3D3D3' } },
      font: { bold: true, sz: 12, color: { rgb: 'FF000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'FF000000' } },
        bottom: { style: 'thin', color: { rgb: 'FF000000' } },
        left: { style: 'thin', color: { rgb: 'FF000000' } },
        right: { style: 'thin', color: { rgb: 'FF000000' } }
      }
    };
  }
  
  // Build map of row indices to cadet data by matching wsData rows
  const cadetRowMap = new Map<number, Map<string, AttendanceStatus | null>>();
  
  for (let R = 1; R < wsData.length; R++) {
    const row = wsData[R];
    if (!row) continue;
    
    // Skip MS level header rows
    if (msLevels.includes(row[0])) continue;
    
    // Skip empty rows
    if (row[0] === '' || !row[0]) continue;
    
    // Find the cadet data for this row by matching the name
    // Format: "LastName, FirstName"
    const nameParts = row[0].split(', ');
    if (nameParts.length === 2) {
      for (const [cadetId, data] of cadetAttendanceData) {
        if (data.cadet.lastName === nameParts[0] && data.cadet.firstName === nameParts[1]) {
          cadetRowMap.set(R, data.dates);
          break;
        }
      }
    }
  }
  
  // Apply colors to data cells
  for (let R = 1; R <= range.e.r; R++) {
    const row = wsData[R];
    if (!row) continue;
    
    // Style MS level header rows
    if (msLevels.includes(row[0])) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFD3D3D3' } },
          font: { bold: true, sz: 12, color: { rgb: 'FF000000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      }
      continue;
    }
    
    // Skip if not a cadet row
    if (row[0] === '' || !row[0]) continue;
    
    // Get cadet data for this row
    const cadetDates = cadetRowMap.get(R);
    
    // Color date cells based on attendance status
    for (let C = 1; C <= allDates.length; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) continue;
      
      const dateStr = allDates[C - 1];
      const status = cadetDates?.get(dateStr);
      
      // Set cell style based on status
      if (status === 'present') {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FF90EE90' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      } else if (status === 'excused') {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFFFFF00' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      } else if (status === 'unexcused') {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFFF6B6B' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      } else {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFFFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      }
    }
    
    // Style name column
    const nameCellAddress = XLSX.utils.encode_cell({ r: R, c: 0 });
    if (ws[nameCellAddress]) {
      ws[nameCellAddress].s = {
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'FF000000' } },
          bottom: { style: 'thin', color: { rgb: 'FF000000' } },
          left: { style: 'thin', color: { rgb: 'FF000000' } },
          right: { style: 'thin', color: { rgb: 'FF000000' } }
        }
      };
    }
    
    // Style total columns
    for (let C = allDates.length + 1; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      }
    }
  }
  
  return ws;
}

/**
 * Export attendance data to Excel with separate sheets for PT, Lab, and Tactics
 */
export async function exportAttendanceToExcel(): Promise<void> {
  const startDate = new Date('2026-01-20');
  const endDate = new Date('2026-04-23');
  const allDates = getDatesBetween(startDate, endDate);
  
  // Get all cadets grouped by MS level
  const msLevels = ['MS1', 'MS2', 'MS3', 'MS4', 'MS5'];
  const cadetsByLevel = new Map<string, Cadet[]>();
  
  for (const level of msLevels) {
    const cadets = await getCadetsByMSLevel(level);
    // Filter out Grizzly Company cadets
    const filteredCadets = cadets.filter(c => c.company !== 'Grizzly Company');
    if (filteredCadets.length > 0) {
      cadetsByLevel.set(level, filteredCadets);
    }
  }
  
  // Get all unique week start dates in the range
  const weekStarts = new Set<string>();
  for (const dateStr of allDates) {
    weekStarts.add(getWeekStart(dateStr));
  }
  
  // Fetch all attendance records for all weeks at once
  const attendanceRecordsByWeek = new Map<string, Map<string, AttendanceRecord>>();
  for (const weekStart of weekStarts) {
    const weekRecords = await getAllAttendanceForWeek(weekStart);
    attendanceRecordsByWeek.set(weekStart, weekRecords);
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Filter dates by day of week
  // PT: Tuesday (2), Wednesday (3), Thursday (4)
  const ptDates = allDates.filter(dateStr => {
    const dayOfWeek = getDayOfWeek(dateStr);
    return dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4;
  });
  // Lab: Thursday (4) only
  const labDates = allDates.filter(dateStr => getDayOfWeek(dateStr) === 4);
  // Tactics: Tuesday (2) only
  const tacticsDates = allDates.filter(dateStr => getDayOfWeek(dateStr) === 2);
  
  // Create sheets for PT, Lab, and Tactics
  const attendanceTypes: Array<{ type: 'PT' | 'Lab' | 'Tactics', name: string, dates: string[] }> = [
    { type: 'PT', name: 'PT', dates: ptDates },
    { type: 'Lab', name: 'Lab', dates: labDates },
    { type: 'Tactics', name: 'Tactics', dates: tacticsDates }
  ];
  
  for (const { type, name, dates: sheetDates } of attendanceTypes) {
    // Header row for this sheet
    const headerRow = ['Name', ...sheetDates.map(d => {
      const [year, month, day] = d.split('-');
      return `${month}/${day}/${year}`;
    }), 'Total Present', 'Total Excused', 'Total Unexcused'];
    
    // Get attendance data for this type
    const cadetAttendanceData = new Map<string, CadetAttendanceData>();
    
    for (const [level, cadets] of cadetsByLevel) {
      for (const cadet of cadets) {
        // For Tactics, only include MS3 cadets
        if (type === 'Tactics' && cadet.militaryScienceLevel !== 'MS3') {
          continue;
        }
        
        const dateMap = new Map<string, AttendanceStatus | null>();
        let totalPresent = 0;
        let totalExcused = 0;
        let totalUnexcused = 0;
        
        // Get attendance only for relevant dates for this sheet
        for (const dateStr of sheetDates) {
          const weekStart = getWeekStart(dateStr);
          const weekRecords = attendanceRecordsByWeek.get(weekStart);
          const record = weekRecords?.get(cadet.id) ?? null;
          
          let status: AttendanceStatus | null = null;
          
          if (type === 'PT') {
            status = getPTAttendanceForDate(record, dateStr);
          } else if (type === 'Lab') {
            status = getLabAttendanceForDate(record, dateStr);
          } else if (type === 'Tactics') {
            status = getTacticsAttendanceForDate(record, dateStr, cadet.militaryScienceLevel);
          }
          
          dateMap.set(dateStr, status);
          
          if (status === 'present') totalPresent++;
          else if (status === 'excused') totalExcused++;
          else if (status === 'unexcused') totalUnexcused++;
        }
        
        cadetAttendanceData.set(cadet.id, {
          cadet,
          dates: dateMap,
          totalPresent,
          totalExcused,
          totalUnexcused
        });
      }
    }
    
    // Create worksheet data
    const wsData: any[][] = [];
    wsData.push(headerRow);
    
    // Add data for each MS level
    for (const level of msLevels) {
      const cadets = cadetsByLevel.get(level);
      if (!cadets || cadets.length === 0) continue;
      
      // For Tactics, filter to only MS3
      const filteredCadets = type === 'Tactics' 
        ? cadets.filter(c => c.militaryScienceLevel === 'MS3')
        : cadets;
      
      if (filteredCadets.length === 0) continue;
      
      // MS Level header row
      const levelHeaderRow = new Array(headerRow.length).fill('');
      levelHeaderRow[0] = level;
      wsData.push(levelHeaderRow);
      
      // Add cadet rows
      for (const cadet of filteredCadets) {
        const data = cadetAttendanceData.get(cadet.id);
        if (!data) continue;
        
        const row = [
          `${cadet.lastName}, ${cadet.firstName}`,
          ...sheetDates.map(dateStr => {
            // Return empty string - we'll color the cell based on status
            return '';
          }),
          data.totalPresent,
          data.totalExcused,
          data.totalUnexcused
        ];
        wsData.push(row);
      }
    }
    
    // Create and style the worksheet
    const ws = createAttendanceSheet(wsData, cadetAttendanceData, sheetDates, msLevels);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  
  // Generate filename with date range
  const filename = `attendance_export_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Export last week absences to Excel with separate sheets for PT, Lab, and Tactics
 * Only includes cadets who were absent (unexcused or excused) in the last week
 * Shows which specific days they were absent and total absences for the semester
 * Includes Tuesday of the current week
 */
export async function exportLastWeekAbsences(): Promise<void> {
  const semesterStart = new Date('2026-01-20');
  const semesterEnd = new Date('2026-04-23');
  const allSemesterDates = getDatesBetween(semesterStart, semesterEnd);
  
  // Get current week start and last week start
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentWeekStart = getWeekStart(todayStr);
  const [currentYear, currentMonth, currentDay] = currentWeekStart.split('-').map(Number);
  const currentWeekStartDate = new Date(currentYear, currentMonth - 1, currentDay);
  
  // Last week start = current week start - 7 days
  const lastWeekStartDate = new Date(currentWeekStartDate);
  lastWeekStartDate.setDate(lastWeekStartDate.getDate() - 7);
  const lastWeekStart = `${lastWeekStartDate.getFullYear()}-${String(lastWeekStartDate.getMonth() + 1).padStart(2, '0')}-${String(lastWeekStartDate.getDate()).padStart(2, '0')}`;
  
  // Get Tuesday of current week
  const currentTuesday = new Date(currentWeekStartDate);
  currentTuesday.setDate(currentTuesday.getDate() + 1); // Monday + 1 = Tuesday
  const currentTuesdayStr = `${currentTuesday.getFullYear()}-${String(currentTuesday.getMonth() + 1).padStart(2, '0')}-${String(currentTuesday.getDate()).padStart(2, '0')}`;
  
  // Get dates for last week
  const lastWeekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(lastWeekStartDate);
    date.setDate(date.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    lastWeekDates.push(dateStr);
  }
  
  // Filter dates by attendance type
  // PT: Tuesday (2), Wednesday (3), Thursday (4)
  const ptDates = lastWeekDates.filter(dateStr => {
    const dayOfWeek = getDayOfWeek(dateStr);
    return dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4;
  });
  // Lab: Thursday (4) only
  const labDates = lastWeekDates.filter(dateStr => getDayOfWeek(dateStr) === 4);
  // Tactics: Tuesday (2) only
  const tacticsDates = lastWeekDates.filter(dateStr => getDayOfWeek(dateStr) === 2);
  
  // Add current week Tuesday to PT and Tactics
  const ptDatesToShow = [...ptDates, currentTuesdayStr];
  const tacticsDatesToShow = [...tacticsDates, currentTuesdayStr];
  const labDatesToShow = [...labDates]; // Lab doesn't include current week Tuesday
  
  // Get all cadets
  const msLevels = ['MS1', 'MS2', 'MS3', 'MS4', 'MS5'];
  const cadetsByLevel = new Map<string, Cadet[]>();
  
  for (const level of msLevels) {
    const cadets = await getCadetsByMSLevel(level);
    // Filter out Grizzly Company cadets
    const filteredCadets = cadets.filter(c => c.company !== 'Grizzly Company');
    if (filteredCadets.length > 0) {
      cadetsByLevel.set(level, filteredCadets);
    }
  }
  
  // Get all attendance records for last week and semester
  const lastWeekRecords = await getAllAttendanceForWeek(lastWeekStart);
  const currentWeekRecords = await getAllAttendanceForWeek(currentWeekStart);
  
  // Get all week starts in semester
  const semesterWeekStarts = new Set<string>();
  for (const dateStr of allSemesterDates) {
    semesterWeekStarts.add(getWeekStart(dateStr));
  }
  
  // Also include last week and current week (they might be before semester start)
  semesterWeekStarts.add(lastWeekStart);
  semesterWeekStarts.add(currentWeekStart);
  
  // Fetch all attendance records for semester and recent weeks (for display)
  const allSemesterRecords = new Map<string, Map<string, AttendanceRecord>>();
  for (const weekStart of semesterWeekStarts) {
    const weekRecords = await getAllAttendanceForWeek(weekStart);
    allSemesterRecords.set(weekStart, weekRecords);
  }
  
  // Fetch ALL attendance records for total calculation (regardless of date)
  // Get all unique cadet IDs first
  const allCadetIds = new Set<string>();
  for (const [level, cadets] of cadetsByLevel) {
    cadets.forEach(cadet => allCadetIds.add(cadet.id));
  }
  
  // Fetch all attendance records from database
  const allAttendanceRecords = new Map<string, AttendanceRecord[]>();
  const attendanceSnapshot = await getDocs(query(collection(db, 'attendance')));
  
  attendanceSnapshot.forEach(doc => {
    const record = doc.data() as any;
    // Migrate old records if needed
    const migratedRecord: AttendanceRecord = !('ptTuesday' in record) ? {
      cadetId: record.cadetId,
      ptMonday: null,
      ptTuesday: record.tuesday ?? null,
      ptWednesday: record.wednesday ?? null,
      ptThursday: record.thursday ?? null,
      ptFriday: null,
      labThursday: null,
      tacticsTuesday: null,
      weekStartDate: record.weekStartDate
    } : record as AttendanceRecord;
    
    if (allCadetIds.has(migratedRecord.cadetId)) {
      if (!allAttendanceRecords.has(migratedRecord.cadetId)) {
        allAttendanceRecords.set(migratedRecord.cadetId, []);
      }
      allAttendanceRecords.get(migratedRecord.cadetId)!.push(migratedRecord);
    }
  });
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create sheets for PT, Lab, and Tactics
  const attendanceTypes: Array<{ 
    type: 'PT' | 'Lab' | 'Tactics', 
    name: string, 
    dates: string[],
    getStatus: (record: AttendanceRecord | null, dateStr: string, cadetMSLevel?: string) => AttendanceStatus | null,
    getSemesterTotal: (record: AttendanceRecord | null) => number
  }> = [
    { 
      type: 'PT', 
      name: 'PT', 
      dates: ptDatesToShow,
      getStatus: (record, dateStr) => getPTAttendanceForDate(record, dateStr),
      getSemesterTotal: (record) => {
        if (!record) return 0;
        let total = 0;
        if (record.ptTuesday === 'unexcused') total++;
        if (record.ptWednesday === 'unexcused') total++;
        if (record.ptThursday === 'unexcused') total++;
        return total;
      }
    },
    { 
      type: 'Lab', 
      name: 'Lab', 
      dates: labDatesToShow,
      getStatus: (record, dateStr) => getLabAttendanceForDate(record, dateStr),
      getSemesterTotal: (record) => {
        if (!record) return 0;
        return (record.labThursday === 'unexcused') ? 1 : 0;
      }
    },
    { 
      type: 'Tactics', 
      name: 'Tactics', 
      dates: tacticsDatesToShow,
      getStatus: (record, dateStr, cadetMSLevel) => getTacticsAttendanceForDate(record, dateStr, cadetMSLevel),
      getSemesterTotal: (record) => {
        if (!record) return 0;
        return (record.tacticsTuesday === 'unexcused') ? 1 : 0;
      }
    }
  ];
  
  for (const { type, name, dates: sheetDates, getStatus, getSemesterTotal } of attendanceTypes) {
    // Find cadets who were absent in last week for this type
    const absentCadets = new Map<string, {
      cadet: Cadet;
      absences: Map<string, AttendanceStatus>;
      semesterTotalAbsences: number;
    }>();
    
    for (const [level, cadets] of cadetsByLevel) {
      for (const cadet of cadets) {
        // For Tactics, only include MS3 cadets
        if (type === 'Tactics' && cadet.militaryScienceLevel !== 'MS3') {
          continue;
        }
        
        const lastWeekRecord = lastWeekRecords.get(cadet.id);
        const currentWeekRecord = currentWeekRecords.get(cadet.id);
        const absences = new Map<string, AttendanceStatus>();
        let hadAbsence = false;
        
        // Check last week dates for this type - only count unexcused absences
        for (const dateStr of sheetDates) {
          // Skip current week Tuesday if it's not in the last week dates
          if (dateStr === currentTuesdayStr && !lastWeekDates.includes(dateStr)) {
            const status = getStatus(currentWeekRecord, dateStr, cadet.militaryScienceLevel);
            if (status === 'unexcused') {
              absences.set(dateStr, status);
              hadAbsence = true;
            }
          } else if (lastWeekDates.includes(dateStr)) {
            const status = getStatus(lastWeekRecord, dateStr, cadet.militaryScienceLevel);
            if (status === 'unexcused') {
              absences.set(dateStr, status);
              hadAbsence = true;
            }
          }
        }
        
        // Only include if they had at least one absence
        if (hadAbsence) {
          // Calculate total absences for this type - count ALL absences regardless of date
          let semesterTotalAbsences = 0;
          
          // Count unexcused absences from ALL attendance records for this cadet (all weeks, all dates)
          const cadetRecords = allAttendanceRecords.get(cadet.id) || [];
          for (const record of cadetRecords) {
            // Count only unexcused absences for this week based on attendance type
            if (type === 'PT') {
              if (record.ptTuesday === 'unexcused') semesterTotalAbsences++;
              if (record.ptWednesday === 'unexcused') semesterTotalAbsences++;
              if (record.ptThursday === 'unexcused') semesterTotalAbsences++;
            } else if (type === 'Lab') {
              if (record.labThursday === 'unexcused') semesterTotalAbsences++;
            } else if (type === 'Tactics') {
              if (record.tacticsTuesday === 'unexcused') semesterTotalAbsences++;
            }
          }
          
          absentCadets.set(cadet.id, {
            cadet,
            absences,
            semesterTotalAbsences
          });
        }
      }
    }
    
    // Header row
    const headerRow = [
      'Name',
      ...sheetDates.map(d => {
        const [year, month, day] = d.split('-');
        return `${month}/${day}/${year}`;
      }),
      'Total Semester Absences',
      'Contracted'
    ];
    
    // Create worksheet data
    const wsData: any[][] = [];
    const cadetRowMap = new Map<number, Cadet>(); // Track which cadet is in each row
    wsData.push(headerRow);
    
    // Add data for each MS level
    for (const level of msLevels) {
      const cadets = cadetsByLevel.get(level);
      if (!cadets || cadets.length === 0) continue;
      
      // Filter to only absent cadets for this type
      const filteredCadets = type === 'Tactics' 
        ? cadets.filter(c => c.militaryScienceLevel === 'MS3' && absentCadets.has(c.id))
        : cadets.filter(c => absentCadets.has(c.id));
      
      if (filteredCadets.length === 0) continue;
      
      // MS Level header row
      const levelHeaderRow = new Array(headerRow.length).fill('');
      levelHeaderRow[0] = level;
      wsData.push(levelHeaderRow);
      
      // Add cadet rows
      for (const cadet of filteredCadets) {
        const data = absentCadets.get(cadet.id);
        if (!data) continue;
        
        // Get status for each date (including present/excused, not just absences)
        const dateStatuses = sheetDates.map(dateStr => {
          // Check if it's current week Tuesday
          if (dateStr === currentTuesdayStr && !lastWeekDates.includes(dateStr)) {
            const status = getStatus(currentWeekRecords.get(cadet.id) ?? null, dateStr, cadet.militaryScienceLevel);
            return status;
          } else if (lastWeekDates.includes(dateStr)) {
            const status = getStatus(lastWeekRecords.get(cadet.id) ?? null, dateStr, cadet.militaryScienceLevel);
            return status;
          }
          return null;
        });
        
        const row = [
          `${cadet.lastName}, ${cadet.firstName}`,
          ...dateStatuses.map(status => {
            if (status === 'present') return 'P';
            if (status === 'excused') return 'E';
            if (status === 'unexcused') return 'U';
            return '';
          }),
          data.semesterTotalAbsences,
          cadet.contracted === 'Y' ? 'Y' : cadet.contracted === 'N' ? 'N' : ''
        ];
        const rowIndex = wsData.length;
        wsData.push(row);
        cadetRowMap.set(rowIndex, cadet); // Track which cadet is in this row
      }
    }
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Name column
      ...sheetDates.map(() => ({ wch: 12 })), // Date columns
      { wch: 20 }, // Total absences column
      { wch: 12 } // Contracted column
    ];
    
    // Apply styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Style header row
    for (let C = 0; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: 'FFD3D3D3' } },
        font: { bold: true, sz: 12, color: { rgb: 'FF000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'FF000000' } },
          bottom: { style: 'thin', color: { rgb: 'FF000000' } },
          left: { style: 'thin', color: { rgb: 'FF000000' } },
          right: { style: 'thin', color: { rgb: 'FF000000' } }
        }
      };
    }
    
    // Style data rows
    for (let R = 1; R <= range.e.r; R++) {
      const row = wsData[R];
      if (!row) continue;
      
      // Style MS level header rows
      if (msLevels.includes(row[0])) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: 0 });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: 'FFD3D3D3' } },
            font: { bold: true, sz: 12, color: { rgb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'FF000000' } },
              bottom: { style: 'thin', color: { rgb: 'FF000000' } },
              left: { style: 'thin', color: { rgb: 'FF000000' } },
              right: { style: 'thin', color: { rgb: 'FF000000' } }
            }
          };
        }
        continue;
      }
      
      // Style cadet rows
      for (let C = 0; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        
        // Color status cells (present/excused/unexcused)
        if (C > 0 && C <= sheetDates.length) {
          const value = row[C];
          if (value === 'P') {
            // Present - Green
            ws[cellAddress].s = {
              fill: { fgColor: { rgb: 'FF90EE90' } },
              font: { bold: true, color: { rgb: 'FF000000' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: 'FF000000' } },
                bottom: { style: 'thin', color: { rgb: 'FF000000' } },
                left: { style: 'thin', color: { rgb: 'FF000000' } },
                right: { style: 'thin', color: { rgb: 'FF000000' } }
              }
            };
          } else if (value === 'E') {
            // Excused - Yellow
            ws[cellAddress].s = {
              fill: { fgColor: { rgb: 'FFFFFF00' } },
              font: { bold: true, color: { rgb: 'FF000000' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: 'FF000000' } },
                bottom: { style: 'thin', color: { rgb: 'FF000000' } },
                left: { style: 'thin', color: { rgb: 'FF000000' } },
                right: { style: 'thin', color: { rgb: 'FF000000' } }
              }
            };
          } else if (value === 'U') {
            // Unexcused - Red
            ws[cellAddress].s = {
              fill: { fgColor: { rgb: 'FFFF6B6B' } },
              font: { bold: true, color: { rgb: 'FF000000' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: 'FF000000' } },
                bottom: { style: 'thin', color: { rgb: 'FF000000' } },
                left: { style: 'thin', color: { rgb: 'FF000000' } },
                right: { style: 'thin', color: { rgb: 'FF000000' } }
              }
            };
          } else {
            // Empty/Not marked - White
            ws[cellAddress].s = {
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: 'FF000000' } },
                bottom: { style: 'thin', color: { rgb: 'FF000000' } },
                left: { style: 'thin', color: { rgb: 'FF000000' } },
                right: { style: 'thin', color: { rgb: 'FF000000' } }
              }
            };
          }
        } else {
          // Name, total absences, and contracted columns
          const isNameCell = C === 0;
          const isTotalAbsencesCell = C === sheetDates.length + 1;
          const isContractedCell = C === sheetDates.length + 2;
          const cadet = cadetRowMap.get(R);
          
          ws[cellAddress].s = {
            fill: isNameCell && cadet?.contracted === 'Y' ? { fgColor: { rgb: 'FFFFFF00' } } : undefined,
            alignment: { horizontal: isNameCell ? 'left' : 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'FF000000' } },
              bottom: { style: 'thin', color: { rgb: 'FF000000' } },
              left: { style: 'thin', color: { rgb: 'FF000000' } },
              right: { style: 'thin', color: { rgb: 'FF000000' } }
            }
          };
        }
      }
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  
  // Generate filename
  const filename = `last_week_absences_${lastWeekStart}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, filename);
}
