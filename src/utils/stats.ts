import { AttendanceRecord, AttendanceStatus, DayOfWeek, WeekStats, DayStats, AttendanceType } from '../types';

/**
 * Calculate statistics for a specific day
 */
export function calculateDayStats(
  records: AttendanceRecord[],
  day: DayOfWeek,
  attendanceType: AttendanceType = 'PT'
): DayStats {
  const stats: DayStats = {
    present: 0,
    excused: 0,
    unexcused: 0
  };

  records.forEach(record => {
    let status: AttendanceStatus | null = null;
    if (attendanceType === 'PT') {
      if (day === 'monday') status = record.ptMonday ?? null;
      else if (day === 'tuesday') status = record.ptTuesday;
      else if (day === 'wednesday') status = record.ptWednesday;
      else if (day === 'thursday') status = record.ptThursday;
      else if (day === 'friday') status = record.ptFriday ?? null;
    } else if (attendanceType === 'Lab' && day === 'thursday') {
      status = record.labThursday;
    }
    
    if (status === 'present') stats.present++;
    else if (status === 'excused') stats.excused++;
    else if (status === 'unexcused') stats.unexcused++;
  });

  return stats;
}

/**
 * Calculate weekly statistics
 */
export function calculateWeekStats(
  records: AttendanceRecord[],
  attendanceType: AttendanceType = 'PT'
): WeekStats {
  const stats: WeekStats = {
    present: 0,
    excused: 0,
    unexcused: 0
  };

  records.forEach(record => {
    if (attendanceType === 'PT') {
      // Include Monday and Friday if they exist (for Ranger Company)
      const ptDays = [
        record.ptMonday,
        record.ptTuesday,
        record.ptWednesday,
        record.ptThursday,
        record.ptFriday
      ].filter(status => status !== undefined) as AttendanceStatus[];
      
      ptDays.forEach(status => {
        if (status === 'present') stats.present++;
        else if (status === 'excused') stats.excused++;
        else if (status === 'unexcused') stats.unexcused++;
      });
    } else if (attendanceType === 'Lab') {
      const status = record.labThursday;
      if (status === 'present') stats.present++;
      else if (status === 'excused') stats.excused++;
      else if (status === 'unexcused') stats.unexcused++;
    }
  });

  return stats;
}

/**
 * Get cadets with a specific status for a specific day, grouped by Military Science Level
 */
export function getCadetsByStatusAndLevel(
  records: AttendanceRecord[],
  cadetsMap: Map<string, { firstName: string; lastName: string; militaryScienceLevel: string }>,
  day: DayOfWeek | 'week',
  status: 'excused' | 'unexcused',
  attendanceType: AttendanceType = 'PT'
): Map<string, Array<{ id: string; name: string; level: string }>> {
  const result = new Map<string, Array<{ id: string; name: string; level: string }>>();

  records.forEach(record => {
    const cadet = cadetsMap.get(record.cadetId);
    if (!cadet) return;

    let matches = false;
    if (attendanceType === 'PT') {
      if (day === 'week') {
        // Check if cadet has this status on any PT day
        matches = (record.ptMonday === status) ||
                  (record.ptTuesday === status) || 
                  (record.ptWednesday === status) || 
                  (record.ptThursday === status) ||
                  (record.ptFriday === status);
      } else {
        if (day === 'monday') matches = record.ptMonday === status;
        else if (day === 'tuesday') matches = record.ptTuesday === status;
        else if (day === 'wednesday') matches = record.ptWednesday === status;
        else if (day === 'thursday') matches = record.ptThursday === status;
        else if (day === 'friday') matches = record.ptFriday === status;
      }
    } else if (attendanceType === 'Lab') {
      if (day === 'week' || day === 'thursday') {
        matches = record.labThursday === status;
      }
    }

    if (matches) {
      const level = cadet.militaryScienceLevel;
      if (!result.has(level)) {
        result.set(level, []);
      }
      result.get(level)!.push({
        id: record.cadetId,
        name: `${cadet.lastName}, ${cadet.firstName}`,
        level: cadet.militaryScienceLevel
      });
    }
  });

  // Sort each level's list alphabetically
  result.forEach((list, level) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
  });

  return result;
}

