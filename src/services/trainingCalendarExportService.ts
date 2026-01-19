import { getAllTrainingEvents } from './trainingEventService';
import { TrainingEvent } from '../types';

/**
 * Load jsPDF from CDN
 */
async function loadJsPDF(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf) {
      resolve((window as any).jspdf);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve((window as any).jspdf);
    script.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(script);
  });
}

/**
 * Get the first day of a month (as a Date object)
 */
function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Get the last day of a month
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get day of week for a date (0 = Sunday, 1 = Monday, etc.)
 */
function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

/**
 * Format date for display (e.g., "January 2025")
 */
function formatMonthYear(year: number, month: number): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Get events for a specific date
 */
function getEventsForDate(events: TrainingEvent[], dateStr: string): TrainingEvent[] {
  return events.filter(event => {
    const eventDate = event.date;
    const eventEndDate = event.endDate || event.date;
    
    // Check if date falls within event range
    return dateStr >= eventDate && dateStr <= eventEndDate;
  });
}

/**
 * Generate Training Calendar PDF
 */
export async function exportTrainingCalendar(month?: number, year?: number): Promise<void> {
  try {
    const { jsPDF } = await loadJsPDF();
    
    // Get current date or use provided month/year
    const now = new Date();
    const targetMonth = month || (now.getMonth() + 1);
    const targetYear = year || now.getFullYear();
    
    // Get all training events
    const allEvents = await getAllTrainingEvents();
    
    // Filter events for the target month
    const monthEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      const eventYear = eventDate.getFullYear();
      const eventMonth = eventDate.getMonth() + 1;
      return eventYear === targetYear && eventMonth === targetMonth;
    });
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });
    
    const pageWidth = 279; // Letter width in landscape (mm)
    const pageHeight = 216; // Letter height in landscape (mm)
    const margin = 10;
    
    // Calendar dimensions
    const calendarStartX = margin;
    const calendarStartY = margin + 15;
    const calendarWidth = pageWidth - (2 * margin);
    const calendarHeight = pageHeight - calendarStartY - margin;
    
    // Calculate cell dimensions
    const numCols = 7; // Days of week
    const numRows = 6; // Maximum weeks in a month
    const cellWidth = calendarWidth / numCols;
    const cellHeight = calendarHeight / numRows;
    
    // Header row height
    const headerHeight = 12;
    
    // Day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Draw header row with yellow background
    pdf.setFillColor(255, 255, 0); // Yellow
    pdf.rect(calendarStartX, calendarStartY, calendarWidth, headerHeight, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    
    // Draw day headers
    dayNames.forEach((day, idx) => {
      const x = calendarStartX + (idx * cellWidth);
      pdf.text(day, x + cellWidth / 2, calendarStartY + headerHeight / 2 + 2, { align: 'center' });
    });
    
    // Get first day of month and number of days
    const firstDay = getFirstDayOfMonth(targetYear, targetMonth);
    const lastDay = getLastDayOfMonth(targetYear, targetMonth);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Calculate which week row to start on
    let currentRow = 0;
    let currentDate = 1;
    
    // Draw calendar grid
    for (let row = 0; row < numRows; row++) {
      const rowY = calendarStartY + headerHeight + (row * cellHeight);
      
      // Alternate row background (white and light gray)
      const isGrayRow = row % 2 === 1;
      if (isGrayRow) {
        pdf.setFillColor(240, 240, 240); // Light gray
        pdf.rect(calendarStartX, rowY, calendarWidth, cellHeight, 'F');
      } else {
        pdf.setFillColor(255, 255, 255); // White
        pdf.rect(calendarStartX, rowY, calendarWidth, cellHeight, 'F');
      }
      
      for (let col = 0; col < numCols; col++) {
        const cellX = calendarStartX + (col * cellWidth);
        const cellY = rowY;
        
        // Determine if this cell should have a date
        let shouldShowDate = false;
        let dateNum = 0;
        
        if (row === 0 && col >= startDayOfWeek) {
          // First week - show dates starting from startDayOfWeek
          shouldShowDate = true;
          dateNum = currentDate++;
        } else if (row > 0 && currentDate <= lastDay) {
          // Subsequent weeks - show dates until lastDay
          shouldShowDate = true;
          dateNum = currentDate++;
        }
        
        if (shouldShowDate && dateNum <= lastDay) {
          // Format date string for event lookup
          const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
          const dayEvents = getEventsForDate(monthEvents, dateStr);
          
          // Draw yellow background if there are events
          if (dayEvents.length > 0) {
            pdf.setFillColor(255, 255, 0); // Yellow
            pdf.rect(cellX, cellY, cellWidth, cellHeight, 'F');
          }
          
          // Draw cell border
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.2);
          pdf.rect(cellX, cellY, cellWidth, cellHeight);
          
          // Draw date number
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(String(dateNum), cellX + 3, cellY + 6);
          
          // Draw event names
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          let eventY = cellY + 10;
          const maxEvents = 3; // Limit events shown per day
          
          dayEvents.slice(0, maxEvents).forEach((event, idx) => {
            if (eventY < cellY + cellHeight - 2) {
              // Split event name if too long
              const maxWidth = cellWidth - 6;
              const lines = pdf.splitTextToSize(event.name, maxWidth);
              lines.forEach((line: string) => {
                if (eventY < cellY + cellHeight - 2) {
                  pdf.text(line, cellX + 3, eventY);
                  eventY += 4;
                }
              });
            }
          });
          
          // Show "+X more" if there are more events
          if (dayEvents.length > maxEvents) {
            const remaining = dayEvents.length - maxEvents;
            pdf.setFontSize(6);
            pdf.text(`+${remaining} more`, cellX + 3, cellY + cellHeight - 2);
          }
        } else {
          // Empty cell - just draw border
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.2);
          pdf.rect(cellX, cellY, cellWidth, cellHeight);
        }
      }
    }
    
    // Add title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Training Calendar - ${formatMonthYear(targetYear, targetMonth)}`, pageWidth / 2, margin + 8, { align: 'center' });
    
    // Save PDF
    const fileName = `Training_Calendar_${targetYear}_${String(targetMonth).padStart(2, '0')}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating training calendar:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(`Error generating training calendar: ${errorMessage}`);
    throw error;
  }
}
