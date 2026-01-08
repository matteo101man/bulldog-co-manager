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
 * Get attendance status for a specific date from an attendance record
 */
function getAttendanceForDate(
  record: AttendanceRecord | null,
  dateStr: string,
  cadetMSLevel?: string
): AttendanceStatus | null {
  if (!record) return null;
  
  const dayOfWeek = getDayOfWeek(dateStr);
  
  // Map day of week to attendance field
  // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  switch (dayOfWeek) {
    case 1: // Monday
      return record.ptMonday ?? null;
    case 2: // Tuesday
      // Check tactics for MS3, otherwise PT
      if (cadetMSLevel === 'MS3') {
        return record.tacticsTuesday ?? record.ptTuesday ?? null;
      }
      return record.ptTuesday ?? null;
    case 3: // Wednesday
      return record.ptWednesday ?? null;
    case 4: // Thursday
      // Check both PT and Lab - prioritize Lab if it exists
      const labStatus = record.labThursday ?? null;
      const ptStatus = record.ptThursday ?? null;
      return labStatus ?? ptStatus;
    case 5: // Friday
      return record.ptFriday ?? null;
    default:
      return null;
  }
}

/**
 * Export attendance data to Excel
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
  
  // Get attendance data for all cadets
  const cadetAttendanceData = new Map<string, CadetAttendanceData>();
  
  for (const [level, cadets] of cadetsByLevel) {
    for (const cadet of cadets) {
      const dateMap = new Map<string, AttendanceStatus | null>();
      let totalPresent = 0;
      let totalExcused = 0;
      let totalUnexcused = 0;
      
      // Get attendance for each date
      for (const dateStr of allDates) {
        const dayOfWeek = getDayOfWeek(dateStr);
        // Only check weekdays (Monday-Friday)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const weekStart = getWeekStart(dateStr);
          const weekRecords = attendanceRecordsByWeek.get(weekStart);
          const record = weekRecords?.get(cadet.id) ?? null;
          const status = getAttendanceForDate(record, dateStr, cadet.militaryScienceLevel);
          dateMap.set(dateStr, status);
          
          if (status === 'present') totalPresent++;
          else if (status === 'excused') totalExcused++;
          else if (status === 'unexcused') totalUnexcused++;
        } else {
          dateMap.set(dateStr, null);
        }
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
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create worksheet data
  const wsData: any[][] = [];
  
  // Header row with better formatting
  const headerRow = ['Name', ...allDates.map(d => {
    const [year, month, day] = d.split('-');
    return `${month}/${day}/${year}`;
  }), 'Total Present', 'Total Excused', 'Total Unexcused'];
  wsData.push(headerRow);
  
  // Add data for each MS level
  for (const level of msLevels) {
    const cadets = cadetsByLevel.get(level);
    if (!cadets || cadets.length === 0) continue;
    
    // MS Level header row with better formatting
    const levelHeaderRow = new Array(headerRow.length).fill('');
    levelHeaderRow[0] = level; // MS1, MS2, etc.
    wsData.push(levelHeaderRow);
    
    // Add cadet rows
    for (const cadet of cadets) {
      const data = cadetAttendanceData.get(cadet.id);
      if (!data) continue;
      
      const row = [
        `${cadet.lastName}, ${cadet.firstName}`,
        ...allDates.map(dateStr => {
          const status = data.dates.get(dateStr);
          // Return empty string but we'll color the cell based on status
          return status === null || status === undefined ? '' : '';
        }),
        data.totalPresent,
        data.totalExcused,
        data.totalUnexcused
      ];
      wsData.push(row);
    }
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // NAME column
    ...allDates.map(() => ({ wch: 12 })), // Date columns
    { wch: 15 }, // Total Present
    { wch: 15 }, // Total Excused
    { wch: 15 }  // Total Unexcused
  ];
  
  // Apply colors and styling to cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  // Style header row (row 0) - "Name" and date headers
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
  
  // Build map of row indices to cadet data
  const cadetRowMap = new Map<number, Map<string, AttendanceStatus | null>>();
  let rowIndex = 1; // Start after header row (row 0)
  
  for (const level of msLevels) {
    const cadets = cadetsByLevel.get(level);
    if (!cadets || cadets.length === 0) continue;
    
    rowIndex++; // MS level header row
    
    for (const cadet of cadets) {
      const data = cadetAttendanceData.get(cadet.id);
      if (data) {
        cadetRowMap.set(rowIndex, data.dates);
      }
      rowIndex++;
    }
  }
  
  // Apply colors to data cells
  for (let R = 1; R <= range.e.r; R++) {
    const row = wsData[R];
    if (!row) continue;
    
    // Style MS level header rows (MS1, MS2, etc.)
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
        // Green for present
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FF90EE90' } }, // Light green
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      } else if (status === 'excused') {
        // Yellow for excused
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFFFFF00' } }, // Yellow
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      } else if (status === 'unexcused') {
        // Red for unexcused
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: 'FFFF6B6B' } }, // Light red
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'FF000000' } },
            bottom: { style: 'thin', color: { rgb: 'FF000000' } },
            left: { style: 'thin', color: { rgb: 'FF000000' } },
            right: { style: 'thin', color: { rgb: 'FF000000' } }
          }
        };
      } else {
        // Empty cell - white background
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
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  
  // Generate filename with date range
  const filename = `attendance_export_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, filename);
}
