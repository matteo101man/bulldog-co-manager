import { getAllTrainingEvents } from './trainingEventService';
import { getCadetById } from './cadetService';
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
async function getCadetName(cadetId?: string): Promise<string> {
  if (!cadetId) return 'TBD';
  
  try {
    const cadet = await getCadetById(cadetId);
    if (cadet) {
      return `CDT ${cadet.lastName.toUpperCase()}`;
    } else {
      // If not found as cadet ID, use the value as-is (might be a name already)
      return cadetId;
    }
  } catch {
    return cadetId;
  }
}

/**
 * Get status color based on planning status
 */
function getStatusColor(status: string): number[] {
  switch (status) {
    case 'complete':
      return [0, 128, 0]; // Green
    case 'in-progress':
      return [255, 255, 0]; // Yellow
    case 'issues':
      return [255, 165, 0]; // Orange
    default:
      return [200, 200, 200]; // Gray - not started
  }
}

/**
 * Get status text
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'complete':
      return 'COMPLETE';
    case 'in-progress':
      return 'IN PROGRESS';
    case 'issues':
      return 'ISSUES';
    default:
      return 'NOT STARTED';
  }
}

/**
 * Generate Company Operations Planning PDF
 */
export async function exportCompanyOpsPlanning(): Promise<void> {
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
      .slice(0, 15); // Limit to 15 events for display
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });
    
    const pageWidth = 279; // Letter width in landscape (mm)
    const pageHeight = 216; // Letter height in landscape (mm)
    const margin = 8;
    
    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('COMPANY OPERATIONS PLANNING', pageWidth / 2, margin + 8, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('UGA Bulldog Battalion', pageWidth / 2, margin + 14, { align: 'center' });
    
    const tableStartY = margin + 18;
    const tableStartX = margin;
    const tableWidth = pageWidth - (2 * margin);
    
    // Column definitions with widths
    const columns = [
      { header: 'OPERATION', width: 28 },
      { header: 'LOCATION', width: 20 },
      { header: 'ACTION OFFICER', width: 22 },
      { header: 'METL, AUDIENCE, & INSTRUCTORS', width: 30 },
      { header: 'LAND, AMMO, & RESOURCES', width: 28 },
      { header: 'ISSUE WARNO', width: 18 },
      { header: 'TRAIN THE TRAINERS', width: 22 },
      { header: 'RECON THE SITE', width: 18 },
      { header: 'MAJ CARLSON IPR', width: 18 },
      { header: 'LTC LAYFIELD IPR', width: 18 },
      { header: 'REHEARSAL / PMI / EST', width: 22 },
      { header: 'DEPLOY / REDEPLOY', width: 20 },
      { header: 'BEGIN OP', width: 15 },
      { header: 'END OP', width: 15 },
      { header: 'EVAL. & AAR', width: 18 }
    ];
    
    const headerHeight = 12;
    const rowHeight = 10;
    
    // Header row with gradient-like brown background
    pdf.setFillColor(139, 90, 43); // Brown
    pdf.rect(tableStartX, tableStartY, tableWidth, headerHeight, 'F');
    
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    
    let currentX = tableStartX;
    columns.forEach((col, idx) => {
      // Split header text if needed
      const words = col.header.split(' ');
      if (words.length > 1 && col.width < 20) {
        // Two-line header for narrow columns
        pdf.text(words[0], currentX + col.width / 2, tableStartY + 4, { align: 'center' });
        pdf.text(words.slice(1).join(' '), currentX + col.width / 2, tableStartY + 8, { align: 'center' });
      } else {
        pdf.text(col.header, currentX + col.width / 2, tableStartY + headerHeight / 2 + 2, { align: 'center' });
      }
      currentX += col.width;
    });
    
    // Draw header border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(tableStartX, tableStartY, tableWidth, headerHeight);
    
    // Data rows
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    let currentY = tableStartY + headerHeight;
    let pageNum = 1;
    
    for (let i = 0; i < futureEvents.length; i++) {
      const event = futureEvents[i];
      
      // Check if we need a new page
      if (currentY + rowHeight > pageHeight - margin - 10) {
        pdf.addPage();
        currentY = margin;
        pageNum++;
        
        // Redraw header on new page
        pdf.setFillColor(139, 90, 43);
        pdf.rect(tableStartX, currentY, tableWidth, headerHeight, 'F');
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        currentX = tableStartX;
        columns.forEach((col) => {
          const words = col.header.split(' ');
          if (words.length > 1 && col.width < 20) {
            pdf.text(words[0], currentX + col.width / 2, currentY + 4, { align: 'center' });
            pdf.text(words.slice(1).join(' '), currentX + col.width / 2, currentY + 8, { align: 'center' });
          } else {
            pdf.text(col.header, currentX + col.width / 2, currentY + headerHeight / 2 + 2, { align: 'center' });
          }
          currentX += col.width;
        });
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(tableStartX, currentY, tableWidth, headerHeight);
        currentY += headerHeight;
        
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
      }
      
      // Alternate row background (light gray for operation name row)
      if (i % 2 === 0) {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
      }
      
      // Get cadet names
      const actionOfficer = await getCadetName(event.oicId);
      
      // Calculate row height based on content (some cells may need more space)
      const calculatedRowHeight = Math.max(rowHeight, 12);
      
      // Fill data for each column
      currentX = tableStartX;
      
      // Operation
      const operationText = event.name.length > 25 ? event.name.substring(0, 22) + '...' : event.name;
      pdf.text(operationText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[0].width;
      
      // Location
      const locationText = (event.ao || 'TBD').length > 15 ? (event.ao || 'TBD').substring(0, 12) + '...' : (event.ao || 'TBD');
      pdf.text(locationText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[1].width;
      
      // Action Officer
      const aoText = actionOfficer.length > 18 ? actionOfficer.substring(0, 15) + '...' : actionOfficer;
      pdf.text(aoText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[2].width;
      
      // METL, Audience, & Instructors
      const metlText = event.conop?.situation?.oic || event.conop?.situation?.ncoic 
        ? 'Complete' 
        : 'TBD';
      pdf.text(metlText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[3].width;
      
      // Land, Ammo, & Resources
      const resourcesText = event.conop?.resources 
        ? (Object.keys(event.conop.resources).length > 0 ? 'Requested' : 'TBD')
        : 'TBD';
      pdf.text(resourcesText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[4].width;
      
      // Issue WARNO
      const warnoText = event.conop?.tasksToSubs ? 'Issued' : 'TBD';
      pdf.text(warnoText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[5].width;
      
      // Train the Trainers
      const tttText = event.conop?.conceptOfOperation ? 'Scheduled' : 'TBD';
      pdf.text(tttText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[6].width;
      
      // Recon the Site
      const reconText = event.conop?.imageUrl ? 'Complete' : 'TBD';
      pdf.text(reconText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[7].width;
      
      // MAJ Carlson IPR
      const majCarlsonText = event.conop?.keyDates?.some(d => d.toLowerCase().includes('carlson')) 
        ? formatDate(event.date) 
        : 'TBD';
      pdf.text(majCarlsonText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[8].width;
      
      // LTC Layfield IPR
      const ltcLayfieldText = event.conop?.keyDates?.some(d => d.toLowerCase().includes('layfield')) 
        ? formatDate(event.date) 
        : 'TBD';
      pdf.text(ltcLayfieldText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[9].width;
      
      // Rehearsal / PMI / EST
      const rehearsalText = event.conop?.conceptOfOperation ? 'Scheduled' : 'TBD';
      pdf.text(rehearsalText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[10].width;
      
      // Deploy / Redeploy
      const deployText = formatDate(event.date);
      pdf.text(deployText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[11].width;
      
      // Begin Operation
      const beginOpText = formatTime(event.hitTime);
      pdf.text(beginOpText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[12].width;
      
      // End Operation
      const endOpText = event.endTime ? formatTime(event.endTime) : 'NLT ' + formatTime(event.hitTime);
      pdf.text(endOpText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[13].width;
      
      // Eval. & AAR
      const aarText = event.conop?.endState ? 'Scheduled' : 'TBD';
      pdf.text(aarText, currentX + 2, currentY + calculatedRowHeight / 2 + 1);
      currentX += columns[14].width;
      
      // Draw row border
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.1);
      pdf.rect(tableStartX, currentY, tableWidth, calculatedRowHeight);
      
      currentY += calculatedRowHeight;
    }
    
    // Draw vertical lines
    currentX = tableStartX;
    pdf.setLineWidth(0.1);
    for (let i = 0; i <= columns.length; i++) {
      pdf.line(currentX, tableStartY, currentX, currentY);
      if (i < columns.length) {
        currentX += columns[i].width;
      }
    }
    
    // Legend
    const legendY = pageHeight - margin - 8;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Legend:', margin, legendY);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    
    const legendItems = [
      { color: [0, 128, 0], text: 'COMPLETE' },
      { color: [255, 255, 0], text: 'IN PROGRESS; ON TRACK' },
      { color: [200, 200, 200], text: 'BEHIND SCHEDULE' },
      { color: [255, 0, 0], text: 'NOT STARTED // N/A' }
    ];
    
    let legendX = margin + 15;
    legendItems.forEach(item => {
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.rect(legendX, legendY - 2.5, 4, 4, 'F');
      pdf.text(item.text, legendX + 6, legendY);
      legendX += 50;
    });
    
    // Save PDF
    const fileName = `Company_Ops_Planning_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating Company Operations Planning:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(`Error generating Company Operations Planning: ${errorMessage}`);
    throw error;
  }
}
