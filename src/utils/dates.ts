/**
 * Get the Monday of the current week (ISO week)
 * Returns ISO date string (YYYY-MM-DD)
 */
export function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Calculate days to subtract to get to Monday
  // If today is Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const daysToSubtract = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToSubtract);
  monday.setHours(0, 0, 0, 0); // Reset time to start of day
  return monday.toISOString().split('T')[0];
}

/**
 * Get the dates for Tuesday, Wednesday, Thursday of the current week
 * Formula: Tuesday = Monday + 1 day, Wednesday = Monday + 2 days, Thursday = Monday + 3 days
 */
export function getWeekDates(): { tuesday: string; wednesday: string; thursday: string } {
  const mondayStr = getCurrentWeekStart();
  const monday = new Date(mondayStr);
  
  // Tuesday = Monday + 1 day
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  
  // Wednesday = Monday + 2 days
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  
  // Thursday = Monday + 3 days
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);

  return {
    tuesday: tuesday.toISOString().split('T')[0],
    wednesday: wednesday.toISOString().split('T')[0],
    thursday: thursday.toISOString().split('T')[0],
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
 * Format date with day name (e.g., "Tuesday, Jan 15")
 */
export function formatDateWithDay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

