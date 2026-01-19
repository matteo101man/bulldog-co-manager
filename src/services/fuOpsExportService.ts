import { getAllTrainingEvents } from './trainingEventService';
import { getCadetById } from './cadetService';
import { TrainingEvent, Cadet } from '../types';

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
 * Format date for display (e.g., "18 SEP 2025")
 */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${day} ${monthNames[month - 1]} ${year}`;
}

/**
 * Format time (e.g., "0600" or "14:30" -> "0600")
 */
function formatTime(time?: string): string {
  if (!time || time.trim() === '' || time === '0' || time === '00' || time === '0000') return 'TBD';
  const cleaned = time.replace(':', '').trim().toUpperCase();
  if (cleaned === '' || cleaned === 'TBD' || cleaned === '0TBD') return 'TBD';
  return cleaned.padStart(4, '0');
}

/**
 * Get cadet name from ID or return the ID if it's not a valid cadet ID
 */
async function getCadetName(oicId?: string, ncoicId?: string): Promise<{ oic: string; ncoic: string }> {
  let oic = 'TBD';
  let ncoic = 'TBD';
  
  if (oicId) {
    try {
      const cadet = await getCadetById(oicId);
      if (cadet) {
        oic = `CDT ${cadet.lastName.toUpperCase()}`;
      } else {
        // If not found as cadet ID, use the value as-is (might be a name already)
        oic = oicId;
      }
    } catch {
      oic = oicId;
    }
  }
  
  if (ncoicId) {
    try {
      const cadet = await getCadetById(ncoicId);
      if (cadet) {
        ncoic = `CDT ${cadet.lastName.toUpperCase()}`;
      } else {
        ncoic = ncoicId;
      }
    } catch {
      ncoic = ncoicId;
    }
  }
  
  return { oic, ncoic };
}

/**
 * Generate FU-Ops (Future Operations) PDF
 */
export async function exportFUOps(): Promise<void> {
  try {
    const { jsPDF } = await loadJsPDF();
    
    // Get all training events
    const allEvents = await getAllTrainingEvents();
    
    // Filter future events (events from today onwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureEvents = allEvents
      .filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 20); // Limit to 20 events for display
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });
    
    const pageWidth = 279; // Letter width in landscape (mm)
    const pageHeight = 216; // Letter height in landscape (mm)
    const margin = 10;
    
    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('FUTURE OPERATIONS (FU-OPS)', pageWidth / 2, margin + 10, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('UGA Bulldog Battalion', pageWidth / 2, margin + 18, { align: 'center' });
    
    const tableStartY = margin + 25;
    const tableStartX = margin;
    const tableWidth = pageWidth - (2 * margin);
    
    // Column widths
    const colWidths = [
      35,  // Operation
      30,  // Date
      25,  // Time
      30,  // Location
      30,  // OIC
      30,  // Status
      30,  // Planning Phase
      30,  // Resources
      30   // Notes
    ];
    
    const headerHeight = 10;
    const rowHeight = 8;
    
    // Header row with gradient-like brown background
    pdf.setFillColor(139, 90, 43); // Brown
    pdf.rect(tableStartX, tableStartY, tableWidth, headerHeight, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    
    const headers = ['Operation', 'Date', 'Time', 'Location', 'OIC', 'Status', 'Phase', 'Resources', 'Notes'];
    let currentX = tableStartX;
    
    headers.forEach((header, idx) => {
      pdf.text(header, currentX + colWidths[idx] / 2, tableStartY + headerHeight / 2 + 2, { align: 'center' });
      currentX += colWidths[idx];
    });
    
    // Draw header border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(tableStartX, tableStartY, tableWidth, headerHeight);
    
    // Data rows
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    let currentY = tableStartY + headerHeight;
    let pageNum = 1;
    
    for (let i = 0; i < futureEvents.length; i++) {
      const event = futureEvents[i];
      
      // Check if we need a new page
      if (currentY + rowHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
        pageNum++;
        
        // Redraw header on new page
        pdf.setFillColor(139, 90, 43);
        pdf.rect(tableStartX, currentY, tableWidth, headerHeight, 'F');
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        currentX = tableStartX;
        headers.forEach((header, idx) => {
          pdf.text(header, currentX + colWidths[idx] / 2, currentY + headerHeight / 2 + 2, { align: 'center' });
          currentX += colWidths[idx];
        });
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(tableStartX, currentY, tableWidth, headerHeight);
        currentY += headerHeight;
        
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
      }
      
      // Alternate row background
      if (i % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
      }
      
      // Get cadet names
      const { oic } = await getCadetName(event.oicId, event.ncoicId);
      
      // Determine status color based on planning status
      let statusColor = [200, 200, 200]; // Gray - not started
      let statusText = 'NOT STARTED';
      
      if (event.planningStatus === 'complete') {
        statusColor = [0, 128, 0]; // Green
        statusText = 'COMPLETE';
      } else if (event.planningStatus === 'in-progress') {
        statusColor = [255, 255, 0]; // Yellow
        statusText = 'IN PROGRESS';
      } else if (event.planningStatus === 'issues') {
        statusColor = [255, 165, 0]; // Orange
        statusText = 'ISSUES';
      }
      
      // Fill data
      const rowData = [
        event.name.length > 20 ? event.name.substring(0, 17) + '...' : event.name,
        formatDate(event.date),
        formatTime(event.hitTime),
        event.ao || 'TBD',
        oic.length > 15 ? oic.substring(0, 12) + '...' : oic,
        statusText,
        getPlanningPhase(event.date),
        event.conop?.resources ? 'Yes' : 'No',
        event.mission ? (event.mission.length > 15 ? event.mission.substring(0, 12) + '...' : event.mission) : ''
      ];
      
      currentX = tableStartX;
      rowData.forEach((data, idx) => {
        // Status column with color indicator
        if (idx === 5) {
          pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
          pdf.rect(currentX + 1, currentY + 1, colWidths[idx] - 2, rowHeight - 2, 'F');
        }
        
        pdf.text(data, currentX + 2, currentY + rowHeight / 2 + 2);
        currentX += colWidths[idx];
      });
      
      // Draw row border
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.1);
      pdf.rect(tableStartX, currentY, tableWidth, rowHeight);
      
      currentY += rowHeight;
    }
    
    // Draw vertical lines
    currentX = tableStartX;
    pdf.setLineWidth(0.1);
    for (let i = 0; i <= colWidths.length; i++) {
      pdf.line(currentX, tableStartY, currentX, currentY);
      if (i < colWidths.length) {
        currentX += colWidths[i];
      }
    }
    
    // Legend
    const legendY = pageHeight - margin - 15;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Legend:', margin, legendY);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    
    const legendItems = [
      { color: [0, 128, 0], text: 'COMPLETE' },
      { color: [255, 255, 0], text: 'IN PROGRESS' },
      { color: [255, 165, 0], text: 'ISSUES' },
      { color: [200, 200, 200], text: 'NOT STARTED' }
    ];
    
    let legendX = margin + 20;
    legendItems.forEach(item => {
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.rect(legendX, legendY - 3, 5, 5, 'F');
      pdf.text(item.text, legendX + 7, legendY);
      legendX += 40;
    });
    
    // Save PDF
    const fileName = `FU_OPS_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating FU-Ops:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(`Error generating FU-Ops: ${errorMessage}`);
    throw error;
  }
}

/**
 * Determine planning phase based on date
 */
function getPlanningPhase(eventDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 7) {
    return 'Execution';
  } else if (daysDiff < 30) {
    return 'Final Prep';
  } else if (daysDiff < 90) {
    return 'Planning';
  } else {
    return 'Initial';
  }
}
