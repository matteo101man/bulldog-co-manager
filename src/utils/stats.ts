import { AttendanceRecord, AttendanceStatus, DayOfWeek, WeekStats, DayStats } from '../types';

/**
 * Calculate statistics for a specific day
 */
export function calculateDayStats(
  records: AttendanceRecord[],
  day: DayOfWeek
): DayStats {
  const stats: DayStats = {
    present: 0,
    excused: 0,
    unexcused: 0
  };

  records.forEach(record => {
    const status = record[day];
    if (status === 'present') stats.present++;
    else if (status === 'excused') stats.excused++;
    else if (status === 'unexcused') stats.unexcused++;
  });

  return stats;
}

/**
 * Calculate weekly statistics (all 3 days combined)
 */
export function calculateWeekStats(records: AttendanceRecord[]): WeekStats {
  const stats: WeekStats = {
    present: 0,
    excused: 0,
    unexcused: 0
  };

  records.forEach(record => {
    ['tuesday', 'wednesday', 'thursday'].forEach(day => {
      const status = record[day as DayOfWeek];
      if (status === 'present') stats.present++;
      else if (status === 'excused') stats.excused++;
      else if (status === 'unexcused') stats.unexcused++;
    });
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
  status: 'excused' | 'unexcused'
): Map<string, Array<{ id: string; name: string; level: string }>> {
  const result = new Map<string, Array<{ id: string; name: string; level: string }>>();

  records.forEach(record => {
    const cadet = cadetsMap.get(record.cadetId);
    if (!cadet) return;

    let matches = false;
    if (day === 'week') {
      // Check if cadet has this status on any day
      matches = record.tuesday === status || 
                record.wednesday === status || 
                record.thursday === status;
    } else {
      matches = record[day] === status;
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

