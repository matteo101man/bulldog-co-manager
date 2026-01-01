/**
 * Get the current date in EST timezone
 */
function getCurrentDateEST(): Date {
  const now = new Date();
  // Convert to EST (UTC-5) or EDT (UTC-4) depending on daylight saving
  // Using Intl.DateTimeFormat to handle DST automatically
  const estDateStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(estDateStr);
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
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToSubtract);
  monday.setHours(0, 0, 0, 0); // Reset time to start of day
  
  // Format as YYYY-MM-DD in EST
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
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
 * @param weekStartDate - Week start date (Monday) in YYYY-MM-DD format
 */
export function getWeekDatesForWeek(weekStartDate: string): { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string } {
  const [year, month, day] = weekStartDate.split('-').map(Number);
  
  // Monday = weekStartDate, Tuesday = Monday + 1, Wednesday = Monday + 2, Thursday = Monday + 3, Friday = Monday + 4
  const monday = new Date(year, month - 1, day);
  const tuesday = new Date(year, month - 1, day + 1);
  const wednesday = new Date(year, month - 1, day + 2);
  const thursday = new Date(year, month - 1, day + 3);
  const friday = new Date(year, month - 1, day + 4);

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
  };
}

/**
 * Format date with day name (e.g., "Tuesday, Jan 15")
 * Uses EST timezone for consistent display
 */
export function formatDateWithDay(dateString: string): string {
  // Parse the date string (YYYY-MM-DD) and create a date object
  // We need to ensure it's interpreted as a date in EST timezone
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date string in ISO format with EST timezone offset
  // Use noon to avoid timezone boundary issues
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00`;
  const date = new Date(dateStr);
  
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

