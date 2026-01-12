import * as XLSX from 'xlsx-js-style';
import { getCadetsByMSLevel } from './cadetService';
import { getAllAttendanceForWeek } from './attendanceService';
import { Cadet, AttendanceStatus, AttendanceRecord } from '../types';

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
    if (cadets.length > 0) {
      cadetsByLevel.set(level, cadets);
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
 * Export last week absences to Excel
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
  
  // Get dates for last week (Tuesday, Wednesday, Thursday)
  const lastWeekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(lastWeekStartDate);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    // Only include Tuesday (2), Wednesday (3), Thursday (4)
    if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      lastWeekDates.push(dateStr);
    }
  }
  
  // Add current week Tuesday
  const datesToShow = [...lastWeekDates, currentTuesdayStr];
  
  // Get all cadets
  const msLevels = ['MS1', 'MS2', 'MS3', 'MS4', 'MS5'];
  const cadetsByLevel = new Map<string, Cadet[]>();
  
  for (const level of msLevels) {
    const cadets = await getCadetsByMSLevel(level);
    if (cadets.length > 0) {
      cadetsByLevel.set(level, cadets);
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
  
  // Fetch all attendance records for semester
  const allSemesterRecords = new Map<string, Map<string, AttendanceRecord>>();
  for (const weekStart of semesterWeekStarts) {
    const weekRecords = await getAllAttendanceForWeek(weekStart);
    allSemesterRecords.set(weekStart, weekRecords);
  }
  
  // Find cadets who were absent in last week
  const absentCadets = new Map<string, {
    cadet: Cadet;
    absences: Map<string, AttendanceStatus>; // date -> status (excused/unexcused) for all dates to show
    semesterTotalAbsences: number;
  }>();
  
  for (const [level, cadets] of cadetsByLevel) {
    for (const cadet of cadets) {
      const lastWeekRecord = lastWeekRecords.get(cadet.id);
      const currentWeekRecord = currentWeekRecords.get(cadet.id);
      const absences = new Map<string, AttendanceStatus>();
      let hadAbsence = false;
      
      // Check last week dates
      for (const dateStr of lastWeekDates) {
        const dayOfWeek = getDayOfWeek(dateStr);
        let status: AttendanceStatus | null = null;
        
        if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
          status = getPTAttendanceForDate(lastWeekRecord, dateStr);
        }
        
        // Only count excused or unexcused as absences
        if (status === 'excused' || status === 'unexcused') {
          absences.set(dateStr, status);
          hadAbsence = true;
        }
      }
      
      // Check current week Tuesday
      const currentTuesdayStatus = getPTAttendanceForDate(currentWeekRecord, currentTuesdayStr);
      if (currentTuesdayStatus === 'excused' || currentTuesdayStatus === 'unexcused') {
        absences.set(currentTuesdayStr, currentTuesdayStatus);
        // Include in export even if they weren't absent last week but are absent this Tuesday
        if (!hadAbsence) hadAbsence = true;
      }
      
      // Only include if they had at least one absence last week or current Tuesday
      if (hadAbsence) {
        // Calculate total semester absences
        let semesterTotalAbsences = 0;
        for (const [weekStart, weekRecords] of allSemesterRecords) {
          const record = weekRecords.get(cadet.id);
          if (!record) continue;
          
          // Count PT absences (Tuesday, Wednesday, Thursday)
          if (record.ptTuesday === 'excused' || record.ptTuesday === 'unexcused') semesterTotalAbsences++;
          if (record.ptWednesday === 'excused' || record.ptWednesday === 'unexcused') semesterTotalAbsences++;
          if (record.ptThursday === 'excused' || record.ptThursday === 'unexcused') semesterTotalAbsences++;
        }
        
        absentCadets.set(cadet.id, {
          cadet,
          absences,
          semesterTotalAbsences
        });
      }
    }
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Header row
  const headerRow = [
    'Name',
    ...datesToShow.map(d => {
      const [year, month, day] = d.split('-');
      return `${month}/${day}/${year}`;
    }),
    'Total Semester Absences'
  ];
  
  // Create worksheet data
  const wsData: any[][] = [];
  wsData.push(headerRow);
  
  // Add data for each MS level
  for (const level of msLevels) {
    const cadets = cadetsByLevel.get(level);
    if (!cadets || cadets.length === 0) continue;
    
    // Filter to only absent cadets
    const absentCadetsForLevel = cadets.filter(c => absentCadets.has(c.id));
    if (absentCadetsForLevel.length === 0) continue;
    
    // MS Level header row
    const levelHeaderRow = new Array(headerRow.length).fill('');
    levelHeaderRow[0] = level;
    wsData.push(levelHeaderRow);
    
    // Add cadet rows
    for (const cadet of absentCadetsForLevel) {
      const data = absentCadets.get(cadet.id);
      if (!data) continue;
      
      const row = [
        `${cadet.lastName}, ${cadet.firstName}`,
        ...datesToShow.map(dateStr => {
          const absence = data.absences.get(dateStr);
          if (absence === 'unexcused') return 'U';
          if (absence === 'excused') return 'E';
          return '';
        }),
        data.semesterTotalAbsences
      ];
      wsData.push(row);
    }
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Name column
    ...datesToShow.map(() => ({ wch: 12 })), // Date columns
    { wch: 20 } // Total absences column
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
      
      // Color absence cells
      if (C > 0 && C <= datesToShow.length) {
        const value = row[C];
        if (value === 'U') {
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
        } else if (value === 'E') {
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
        } else {
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
        // Name and total columns
        ws[cellAddress].s = {
          alignment: { horizontal: C === 0 ? 'left' : 'center', vertical: 'center' },
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
  XLSX.utils.book_append_sheet(wb, ws, 'Last Week Absences');
  
  // Generate filename
  const filename = `last_week_absences_${lastWeekStart}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, filename);
}
