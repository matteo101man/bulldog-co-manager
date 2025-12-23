/**
 * Get the Monday of the current week (ISO week)
 * Returns ISO date string (YYYY-MM-DD)
 */
export function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get the dates for Tuesday, Wednesday, Thursday of the current week
 */
export function getWeekDates(): { tuesday: string; wednesday: string; thursday: string } {
  const monday = new Date(getCurrentWeekStart());
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
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

