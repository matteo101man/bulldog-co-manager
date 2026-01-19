import { DayOfWeek } from '../types';

/**
 * Get the current date in EST timezone
 */
function getCurrentDateEST(): Date {
  const now = new Date();
  // Get EST date components directly without string conversion
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = estFormatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  
  // Create date using local timezone with EST date components
  // This avoids timezone conversion issues
  return new Date(year, month - 1, day);
}

/**
 * Get the Monday of the current week in EST timezone
 * Returns ISO date string (YYYY-MM-DD)
 */
export function getCurrentWeekStart(): string {
  const today = getCurrentDateEST();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Calculate days to subtract to get to Monday
  // If today is Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const daysToSubtract = day === 0 ? 6 : day - 1;
  
  // Create a new date object and work with local date components to avoid timezone issues
  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();
  
  const monday = new Date(year, month, date - daysToSubtract);
  monday.setHours(0, 0, 0, 0); // Reset time to start of day
  
  // Format as YYYY-MM-DD (using local date components to avoid timezone conversion)
  const mondayYear = monday.getFullYear();
  const mondayMonth = String(monday.getMonth() + 1).padStart(2, '0');
  const mondayDate = String(monday.getDate()).padStart(2, '0');
  return `${mondayYear}-${mondayMonth}-${mondayDate}`;
}

/**
 * Get the dates for Tuesday, Wednesday, Thursday of the current week in EST
 * Formula: Tuesday = Monday + 1 day, Wednesday = Monday + 2 days, Thursday = Monday + 3 days
 */
export function getWeekDates(): { tuesday: string; wednesday: string; thursday: string } {
  const mondayStr = getCurrentWeekStart();
  // Parse the date string (YYYY-MM-DD) and work with it directly
  const [year, month, day] = mondayStr.split('-').map(Number);
  
  // Create dates in EST by parsing as local dates (since we're calculating from EST)
  // Note: monday date is already in mondayStr, no need to create a new Date object
  
  // Tuesday = Monday + 1 day
  const tuesday = new Date(year, month - 1, day + 1);
  
  // Wednesday = Monday + 2 days
  const wednesday = new Date(year, month - 1, day + 2);
  
  // Thursday = Monday + 3 days
  const thursday = new Date(year, month - 1, day + 3);

  // Format as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    tuesday: formatDate(tuesday),
    wednesday: formatDate(wednesday),
    thursday: formatDate(thursday),
  };
}

/**
 * Format date for display (e.g., "Jan 15")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date with ordinal suffix (e.g., "Dec 22nd")
 */
export function formatDateWithOrdinal(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  
  // Add ordinal suffix
  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  return `${monthName} ${getOrdinal(day)}`;
}

/**
 * Get week start date (Monday) for a given week start date, offset by weeks
 * @param weekStartDate - Current week start date (YYYY-MM-DD)
 * @param weeksOffset - Number of weeks to offset (negative for past, positive for future)
 * @returns Week start date string (YYYY-MM-DD)
 */
export function getWeekStartByOffset(weekStartDate: string, weeksOffset: number): string {
  const [year, month, day] = weekStartDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + (weeksOffset * 7));
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get week dates for a specific week start date
 * @param weekStartDate - Week start date (Monday) in YYYY-MM-DD format (in EST)
 */
export function getWeekDatesForWeek(weekStartDate: string): { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string } {
  const [year, month, day] = weekStartDate.split('-').map(Number);
  
  // Create dates in EST timezone by using date arithmetic on the EST date
  // We'll work with the date components directly to avoid timezone issues
  const formatDate = (y: number, m: number, d: number): string => {
    // Create a date object in EST by using UTC methods with EST offset
    // But actually, we'll just do simple date arithmetic since we're working with dates, not times
    const date = new Date(Date.UTC(y, m - 1, d));
    const estYear = date.getUTCFullYear();
    const estMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
    const estDay = String(date.getUTCDate()).padStart(2, '0');
    return `${estYear}-${estMonth}-${estDay}`;
  };

  // Calculate dates by adding days (works correctly for date-only values)
  // Monday = weekStartDate
  // Tuesday = Monday + 1, etc.
  return {
    monday: formatDate(year, month, day),
    tuesday: formatDate(year, month, day + 1),
    wednesday: formatDate(year, month, day + 2),
    thursday: formatDate(year, month, day + 3),
    friday: formatDate(year, month, day + 4),
  };
}

/**
 * Get all 7 days of the week (Monday through Sunday) for a specific week start date
 * @param weekStartDate - Week start date (Monday) in YYYY-MM-DD format (in EST)
 */
export function getFullWeekDates(weekStartDate: string): { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; saturday: string; sunday: string } {
  // Parse the date string (YYYY-MM-DD) and work with local date components to avoid timezone issues
  const [year, month, day] = weekStartDate.split('-').map(Number);
  
  // Create dates using local date constructor to avoid timezone conversion
  const monday = new Date(year, month - 1, day);
  const tuesday = new Date(year, month - 1, day + 1);
  const wednesday = new Date(year, month - 1, day + 2);
  const thursday = new Date(year, month - 1, day + 3);
  const friday = new Date(year, month - 1, day + 4);
  const saturday = new Date(year, month - 1, day + 5);
  const sunday = new Date(year, month - 1, day + 6);
  
  // Format as YYYY-MM-DD (using local date components)
  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  return {
    monday: formatDate(monday),
    tuesday: formatDate(tuesday),
    wednesday: formatDate(wednesday),
    thursday: formatDate(thursday),
    friday: formatDate(friday),
    saturday: formatDate(saturday),
    sunday: formatDate(sunday),
  };
}

/**
 * Format date as "Mon Nov 17" style
 */
export function formatDateShort(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  return `${dayName} ${monthName} ${day}`;
}

/**
 * Format date with day name (e.g., "Tuesday, Jan 15")
 * Uses EST timezone for consistent display
 */
export function formatDateWithDay(dateString: string): string {
  // Parse the date string (YYYY-MM-DD)
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create date string in ISO format and explicitly set to EST timezone (UTC-5 or UTC-4)
  // Use noon EST to avoid timezone boundary issues
  // We'll create it as if it's in EST by using a date string that represents EST time
  const estDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00-05:00`;
  const date = new Date(estDateStr);
  
  // Format using EST timezone
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric',
    timeZone: 'America/New_York'
  });
}

/**
 * Format date with full month name and ordinal (e.g., "January 1st, 2026")
 */
export function formatDateFullWithOrdinal(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  
  // Add ordinal suffix
  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  return `${monthName} ${getOrdinal(day)}, ${year}`;
}

/**
 * Get the current day of week in EST (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getCurrentDayEST(): number {
  const today = getCurrentDateEST();
  return today.getDay();
}

/**
 * Get the current date string in EST (YYYY-MM-DD)
 */
export function getCurrentDateStringEST(): string {
  const today = getCurrentDateEST();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Get the day of week name from day number (0 = Sunday, 1 = Monday, etc.)
 * Returns null for Sunday (0) and Saturday (6) as we don't track attendance on those days
 */
export function getDayNameFromNumber(dayNum: number): DayOfWeek | null {
  // For attendance, we only track Mon-Fri
  if (dayNum === 0 || dayNum === 6) return null; // Sunday and Saturday
  
  const dayMap: { [key: number]: DayOfWeek } = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday'
  };
  
  return dayMap[dayNum] || null;
}

