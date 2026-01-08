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
  
  // Filter dates by day of week for Lab (Thursday = 4) and Tactics (Tuesday = 2)
  const labDates = allDates.filter(dateStr => getDayOfWeek(dateStr) === 4); // Thursdays only
  const tacticsDates = allDates.filter(dateStr => getDayOfWeek(dateStr) === 2); // Tuesdays only
  
  // Create sheets for PT, Lab, and Tactics
  const attendanceTypes: Array<{ type: 'PT' | 'Lab' | 'Tactics', name: string, dates: string[] }> = [
    { type: 'PT', name: 'PT', dates: allDates },
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
