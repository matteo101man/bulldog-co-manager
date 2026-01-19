import { getCadetsByCompany } from './cadetService';
import { getAllTrainingEvents } from './trainingEventService';
import { getPTPlansForWeek } from './ptPlanService';
import { getWeatherForecasts } from './weatherService';
import { getCurrentWeekStart, getFullWeekDates, formatDateShort } from '../utils/dates';
import { Cadet, Company, TrainingEvent, PTPlan } from '../types';

interface Leadership {
  bc?: Cadet;
  xo?: Cadet;
  csm?: Cadet;
  s3?: Cadet;
  alphaCO?: Cadet;
  bravoCO?: Cadet;
  charlieCO?: Cadet;
  rangerCO?: Cadet;
  grizzlyCO?: Cadet;
}

interface WeekData {
  weekStart: string;
  weekEnd: string;
  dates: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  trainingEvents: TrainingEvent[];
  ptPlans: Map<Company, Map<string, PTPlan>>;
  weather: Map<string, { high: number; low: number; wind: number; precipDay: number; precipNight: number; events: string; impact: string }>;
  leadership: Leadership;
}

/**
 * Find cadet by position keywords
 */
function findLeadership(cadets: Cadet[], positionKeywords: string[]): Cadet | null {
  return cadets.find(cadet => {
    const position = (cadet.position || '').toLowerCase().trim();
    return positionKeywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // For short codes like "1sg", "co", "csm", "bc", "xo", "s3", match as whole words only
      if (['1sg', 'co', 'csm', 'bc', 'xo', 's3'].includes(keywordLower)) {
        // Split position by common delimiters and check each word
        const words = position.split(/[\s,;|/]+/).map(w => w.trim()).filter(w => w);
        return words.includes(keywordLower);
      }
      
      // For longer phrases, use includes
      return position.includes(keywordLower);
    });
  }) || null;
}

/**
 * Get all leadership positions
 */
async function getLeadership(): Promise<Leadership> {
  const allCadets = await getCadetsByCompany('Master');
  const hqCadets = allCadets.filter(c => c.company === 'Headquarters Company');
  
  const leadership: Leadership = {};
  
  // Battalion leadership
  leadership.bc = findLeadership(hqCadets, ['bc', 'battalion commander']);
  leadership.xo = findLeadership(hqCadets, ['xo', 'executive officer']);
  leadership.csm = findLeadership(hqCadets, ['csm', 'command sergeant major']);
  leadership.s3 = findLeadership(hqCadets, ['s3', 'operations officer']);
  
  // Company commanders
  const alphaCadets = allCadets.filter(c => c.company === 'Alpha');
  const bravoCadets = allCadets.filter(c => c.company === 'Bravo');
  const charlieCadets = allCadets.filter(c => c.company === 'Charlie');
  const rangerCadets = allCadets.filter(c => c.company === 'Ranger');
  const grizzlyCadets = allCadets.filter(c => c.company === 'Grizzly Company');
  
  leadership.alphaCO = findLeadership(alphaCadets, ['co', 'commanding officer', 'company commander']);
  leadership.bravoCO = findLeadership(bravoCadets, ['co', 'commanding officer', 'company commander']);
  leadership.charlieCO = findLeadership(charlieCadets, ['co', 'commanding officer', 'company commander']);
  leadership.rangerCO = findLeadership(rangerCadets, ['co', 'commanding officer', 'company commander']);
  leadership.grizzlyCO = findLeadership(grizzlyCadets, ['co', 'commanding officer', 'company commander']);
  
  return leadership;
}

/**
 * Get training events for the week
 */
async function getWeekTrainingEvents(weekStart: string, weekEnd: string): Promise<TrainingEvent[]> {
  const allEvents = await getAllTrainingEvents();
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekEnd);
  weekEndDate.setHours(23, 59, 59, 999);
  
  return allEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= weekStartDate && eventDate <= weekEndDate;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get PT plans for the week
 */
async function getWeekPTPlans(weekStart: string): Promise<Map<Company, Map<string, PTPlan>>> {
  const companies: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Grizzly Company'];
  const ptPlans = new Map<Company, Map<string, PTPlan>>();
  
  // Special week: week starting January 19, 2026 - Battalion PT on Tuesday
  const SPECIAL_WEEK_START = '2026-01-19';
  const isSpecialWeek = weekStart === SPECIAL_WEEK_START;
  
  // Get Battalion PT for Tuesday if it's the special week
  let battalionPT: PTPlan | null = null;
  if (isSpecialWeek) {
    const battalionPlans = await getPTPlansForWeek('Battalion' as Company, weekStart);
    battalionPT = battalionPlans.get('tuesday') || null;
  }
  
  for (const company of companies) {
    const plans = await getPTPlansForWeek(company, weekStart);
    
    // For special week, replace Tuesday with Battalion PT for all companies (except Ranger and Grizzly Company)
    // Grizzly Company always has their own PT, never Battalion PT
    if (isSpecialWeek && battalionPT && company !== 'Ranger' && company !== 'Grizzly Company') {
      plans.set('tuesday', battalionPT);
    }
    
    ptPlans.set(company, plans);
  }
  
  return ptPlans;
}

/**
 * Get weather data for the week with events and impact from localStorage
 */
async function getWeekWeather(dates: string[]): Promise<Map<string, { high: number; low: number; wind: number; precipDay: number; precipNight: number; events: string; impact: string }>> {
  const { forecasts, errors } = await getWeatherForecasts(dates);
  const weather = new Map<string, { high: number; low: number; wind: number; precipDay: number; precipNight: number; events: string; impact: string }>();
  
  // Load saved events and impact from localStorage
  const savedData = localStorage.getItem('weatherEventsImpact');
  const savedDataMap: Record<string, { events: string; impact: string }> = savedData ? JSON.parse(savedData) : {};
  
  // Get training events for autofill
  const allEvents = await getAllTrainingEvents();
  const eventsByDate = new Map<string, string>();
  allEvents.forEach(event => {
    eventsByDate.set(event.date, event.name);
  });
  
  for (const date of dates) {
    const forecast = forecasts.get(date);
    const saved = savedDataMap[date];
    const eventName = eventsByDate.get(date);
    
    // Use saved events if available, otherwise use training event name if available
    const eventsValue = saved?.events !== undefined ? saved.events : (eventName || '');
    
    if (forecast) {
      weather.set(date, {
        high: forecast.high,
        low: forecast.low,
        wind: forecast.wind,
        precipDay: forecast.precipDay,
        precipNight: forecast.precipNight,
        events: eventsValue,
        impact: saved?.impact || ''
      });
    }
  }
  
  return weather;
}

/**
 * Collect all data needed for FRAGO
 */
export async function collectWeekData(weekStartDate?: string): Promise<WeekData> {
  const weekStart = weekStartDate || getCurrentWeekStart();
  const dates = getFullWeekDates(weekStart);
  const weekEnd = dates.sunday;
  
  const [leadership, trainingEvents, ptPlans, weather] = await Promise.all([
    getLeadership(),
    getWeekTrainingEvents(weekStart, weekEnd),
    getWeekPTPlans(weekStart),
    getWeekWeather([dates.monday, dates.tuesday, dates.wednesday, dates.thursday, dates.friday, dates.saturday, dates.sunday])
  ]);
  
  return {
    weekStart,
    weekEnd,
    dates,
    trainingEvents,
    ptPlans,
    weather,
    leadership
  };
}

/**
 * Format cadet name for display (e.g., "CDT Fagan" or "FAGAN")
 */
function formatCadetName(cadet: Cadet | null | undefined, format: 'full' | 'last' = 'full'): string {
  if (!cadet) return 'TBD';
  
  if (format === 'last') {
    return cadet.lastName.toUpperCase();
  }
  
  // For succession of command, use simple "CDT LastName" format
  // For signatures, use rank-specific format
  const lastName = cadet.lastName.charAt(0).toUpperCase() + cadet.lastName.slice(1).toLowerCase();
  return `CDT ${lastName}`;
}

/**
 * Format cadet name with rank for signatures (e.g., "CDT/LTC FAGAN")
 */
function formatCadetNameWithRank(cadet: Cadet | null | undefined): string {
  if (!cadet) return 'TBD';
  
  // Determine rank based on specific cadets and position
  const lastName = cadet.lastName.toLowerCase();
  let rank = 'CDT';
  
  if (cadet.position) {
    const pos = cadet.position.toLowerCase();
    
    // Specific cadet assignments
    if (lastName === 'evans' || (pos.includes('bc') || pos.includes('battalion commander'))) {
      rank = 'CDT/LTC';
    } else if (lastName === 'le' || (pos.includes('xo') || pos.includes('executive officer'))) {
      // LE is the XO (Executive Officer) for the battalion
      rank = 'CDT/MAJ';
    } else if (lastName === 'garza' || pos.includes('s3') || pos.includes('operations officer')) {
      rank = 'CDT/MAJ';
    } else if (pos.includes('co') || pos.includes('commanding officer')) {
      rank = 'CDT/CPT';
    } else if (pos.includes('csm') || pos.includes('command sergeant major')) {
      rank = 'CDT/CSM';
    }
  }
  
  return `${rank} ${cadet.lastName.toUpperCase()}`;
}

/**
 * Format date range for FRAGO header (e.g., "18–24 AUG 2025")
 */
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const endDay = endDate.getDate();
  const year = startDate.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ${startMonth} ${year}`;
  } else {
    return `${startDay} ${startMonth}–${endDay} ${endMonth} ${year}`;
  }
}

/**
 * Format time (e.g., "0600" or "14:30" -> "0600" or "1430")
 */
function formatTime(time?: string): string {
  if (!time || time.trim() === '' || time === '0' || time === '00' || time === '0000') return '';
  const cleaned = time.replace(':', '').trim().toUpperCase();
  // Filter out TBD variations
  if (cleaned === '' || cleaned === '0' || cleaned === '00' || cleaned === '0000' || cleaned === 'TBD' || cleaned === '0TBD' || cleaned.startsWith('0TBD')) return '';
  return cleaned.padStart(4, '0');
}

/**
 * Format date with time for events (e.g., "19 AUG 2025, 0830")
 */
function formatEventDateTime(date: string, time?: string): string {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = dateObj.getFullYear();
  
  if (time) {
    const formattedTime = formatTime(time);
    if (formattedTime) {
      return `${day} ${month} ${year}, ${formattedTime}`;
    }
  }
  return `${day} ${month} ${year}`;
}

/**
 * Generate HTML document with PT tables for email
 */
function generatePTHTML(data: WeekData): string {
  const formatDateForDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDateRange = (start: string, end: string): string => {
    return `${formatDateForDisplay(start)}–${formatDateForDisplay(end)}`;
  };

  const weekRange = formatDateRange(data.dates.monday, data.dates.saturday);
  
  const companies: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Grizzly Company'];
  const regularDays: Array<{ key: string; label: string; dateKey: string }> = [
    { key: 'tuesday', label: 'Tuesday', dateKey: 'tuesday' },
    { key: 'wednesday', label: 'Wednesday', dateKey: 'wednesday' },
    { key: 'thursday', label: 'Thursday', dateKey: 'thursday' }
  ];
  const rangerDays: Array<{ key: string; label: string; dateKey: string }> = [
    { key: 'monday', label: 'Monday', dateKey: 'monday' },
    { key: 'tuesday', label: 'Tuesday', dateKey: 'tuesday' },
    { key: 'wednesday', label: 'Wednesday', dateKey: 'wednesday' },
    { key: 'thursday', label: 'Thursday', dateKey: 'thursday' },
    { key: 'friday', label: 'Friday', dateKey: 'friday' }
  ];

  let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PT Schedule - Week of ${weekRange}</title>
</head>
<body>
<div style="font-family: Arial, sans-serif; max-width: 900px; border: 1px solid #e0e0e0; margin: 20px auto; background-color: #ffffff;">
    
    <div style="background-color: #ba0c2f; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; letter-spacing: 1px; font-size: 20px;">UGA ARMY ROTC | PT SCHEDULE</h2>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Week of ${weekRange}</p>
    </div>

    <div style="padding: 30px; line-height: 1.6; color: #333333;">
        
        <p style="font-weight: bold; font-size: 16px;">ALCON,</p>
        
        <p>Please find the Physical Training (PT) schedule for the week of <strong>${weekRange}</strong>. Ensure all personnel are briefed on the uniform requirements and workout details below.</p>`;

  for (const company of companies) {
    const plans = data.ptPlans.get(company);
    const isRanger = company === 'Ranger';
    const daysToShow = isRanger ? rangerDays : regularDays;
    
    let companyDisplayName: string;
    if (company === 'Grizzly Company') {
      companyDisplayName = 'Grizzly Company';
    } else if (company === 'Ranger') {
      companyDisplayName = 'Ranger Challenge';
    } else {
      companyDisplayName = `${company} Company`;
    }

    html += `
        <h3 style="border-bottom: 2px solid #ba0c2f; padding-bottom: 5px; color: #ba0c2f; margin-top: 30px;">${companyDisplayName}</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9f9f9; border: 1px solid #ddd;">
            <thead>
                <tr style="background-color: #ba0c2f; color: #ffffff;">
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Day</th>`;

    daysToShow.forEach((day) => {
      const plan = plans?.get(day.key);
      const dateStr = formatDateForDisplay(data.dates[day.dateKey as keyof typeof data.dates]);
      const timeStr = plan?.firstFormation || '';
      html += `
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${day.label}<br>${dateStr}${timeStr ? `<br>${timeStr}` : ''}</th>`;
    });

    html += `
                </tr>
            </thead>
            <tbody>`;

    // Uniform row
    html += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #ba0c2f; background-color: #fff4f4;">Uniform</td>`;
    daysToShow.forEach((day) => {
      const plan = plans?.get(day.key);
      const uniform = plan?.uniform || 'NONE';
      let uniformText = '';
      if (uniform === 'NONE' || !uniform) {
        uniformText = 'Contracted: NONE<br>Uncontracted: Appropriate Attire';
      } else {
        uniformText = `Contracted: ${uniform}<br>Uncontracted: Appropriate Attire`;
      }
      html += `
                    <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">${uniformText}</td>`;
    });
    html += `
                </tr>`;

    // Location row
    html += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #ba0c2f; background-color: #fff4f4;">Location</td>`;
    daysToShow.forEach((day) => {
      const plan = plans?.get(day.key);
      const location = plan?.location || 'NONE';
      html += `
                    <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">${location}</td>`;
    });
    html += `
                </tr>`;

    // Activity row
    html += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #ba0c2f; background-color: #fff4f4;">Activity</td>`;
    daysToShow.forEach((day) => {
      const plan = plans?.get(day.key);
      const activity = plan?.workouts || 'NONE';
      html += `
                    <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">${activity.replace(/\n/g, '<br>')}</td>`;
    });
    html += `
                </tr>`;

    html += `
            </tbody>
        </table>`;
  }

  html += `
        <div style="margin-top: 30px; padding: 15px; background-color: #fff4f4; border-left: 5px solid #ba0c2f;">
            <strong>Note:</strong> All cadets are expected to attend PT as scheduled. Uniform requirements are listed above for each day. Contracted cadets must wear the specified uniform; uncontracted cadets should wear appropriate workout attire.
        </div>
    </div>
</div>
</body>
</html>`;

  return html;
}

/**
 * Show a confirmation dialog and return a promise that resolves to true/false
 */
function showConfirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Create a modal element
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.style.cssText = 'position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
    
    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-lg shadow-lg border border-gray-200 p-6 mx-4 max-w-md w-full';
    dialog.style.cssText = 'background-color: white; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; padding: 1.5rem; margin: 0 1rem; max-width: 28rem; width: 100%;';
    
    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold text-gray-900 mb-4';
    title.textContent = message;
    title.style.cssText = 'font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 1rem;';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 0.75rem;';
    
    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.className = 'flex-1 py-3 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700';
    yesButton.style.cssText = 'flex: 1; padding: 0.75rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #2563eb; border: none; cursor: pointer; min-height: 44px;';
    yesButton.onmouseover = () => yesButton.style.backgroundColor = '#1d4ed8';
    yesButton.onmouseout = () => yesButton.style.backgroundColor = '#2563eb';
    yesButton.onclick = () => {
      document.body.removeChild(modal);
      resolve(true);
    };
    
    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    noButton.className = 'flex-1 py-3 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300';
    noButton.style.cssText = 'flex: 1; padding: 0.75rem 1rem; border-radius: 0.5rem; font-weight: 600; color: #374151; background-color: #e5e7eb; border: none; cursor: pointer; min-height: 44px;';
    noButton.onmouseover = () => noButton.style.backgroundColor = '#d1d5db';
    noButton.onmouseout = () => noButton.style.backgroundColor = '#e5e7eb';
    noButton.onclick = () => {
      document.body.removeChild(modal);
      resolve(false);
    };
    
    buttonContainer.appendChild(yesButton);
    buttonContainer.appendChild(noButton);
    dialog.appendChild(title);
    dialog.appendChild(buttonContainer);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
  });
}

/**
 * Generate FRAGO PDF
 */
export async function generateFRAGO(weekStartDate?: string): Promise<void> {
  try {
    // Load jsPDF from CDN
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

    // @ts-ignore - jsPDF is loaded from CDN
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { jsPDF } = (window as any).jspdf;
    
    // Collect data
    const data = await collectWeekData(weekStartDate);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });
    
    const pageWidth = 216; // Letter width in mm
    const pageHeight = 279; // Letter height in mm
    const margin = 20;
    const lineHeight = 6;
    let yPos = margin;
    
    // Helper function to add text with word wrap
    const addText = (text: string, fontSize: number = 11, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left', x?: number) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      const xPos = x !== undefined ? x : margin;
      const maxWidth = pageWidth - (2 * margin);
      
      const lines = pdf.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (yPos > pageHeight - margin - lineHeight) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.text(line, xPos, yPos, { align });
        yPos += lineHeight;
      });
    };
    
    // Helper to add a blank line
    const addBlankLine = (count: number = 1) => {
      yPos += lineHeight * count;
    };
    
    // HEADER
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FRAGMENTARY ORDER 01', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 1.5;
    
    pdf.setFontSize(12);
    pdf.text('UGA Bulldog Battalion', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Effective: ${formatDateRange(data.dates.monday, data.dates.saturday)}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight;
    pdf.text('Time Zone: EST', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight;
    pdf.text('Operation: GO DAWGS', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;
    
    // 1. SITUATION
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    addText('1. SITUATION', 12, true);
    addBlankLine(0.5);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    addText('No change to base OPORD.');
    addBlankLine(0.5);
    
    // Weather Table with grid formatting (centered)
    const weekDays = [data.dates.monday, data.dates.tuesday, data.dates.wednesday, data.dates.thursday, data.dates.friday];
    addText('Weather Table:', 11, true);
    addBlankLine(0.3);
    
    // Table structure: Day column + 5 day columns (centered on page)
    const dayColWidth = 25;
    const dayColWidths = [30, 30, 30, 30, 30]; // Equal width for each day
    const totalTableWidth = dayColWidth + dayColWidths.reduce((a, b) => a + b, 0);
    const tableStartX = (pageWidth - totalTableWidth) / 2; // Center the table
    const dayColStarts = [tableStartX + dayColWidth];
    for (let i = 1; i < dayColWidths.length; i++) {
      dayColStarts.push(dayColStarts[i - 1] + dayColWidths[i - 1]);
    }
    const tableEndX = dayColStarts[dayColStarts.length - 1] + dayColWidths[dayColWidths.length - 1];
    
    // Calculate row height based on content
    const calculateRowHeight = (category: any) => {
      if (!category.multiline) return lineHeight * 1.2;
      // For multiline, check max lines needed
      let maxLines = 1;
      weekDays.forEach((date) => {
        const weather = data.weather.get(date);
        const value = category.getValue(weather);
        const cellWidth = dayColWidths[0];
        const lines = pdf.splitTextToSize(value, cellWidth - 4);
        maxLines = Math.max(maxLines, lines.length);
      });
      return Math.max(lineHeight * 1.2, lineHeight * 0.8 * maxLines + lineHeight * 0.4);
    };
    
    let tableStartY = yPos;
    
    // Header row
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const headerRowHeight = lineHeight * 1.2;
    pdf.text('Day', tableStartX + dayColWidth / 2, yPos + headerRowHeight / 2, { align: 'center' });
    const dayLabels = weekDays.map(date => formatDateShort(date));
    dayLabels.forEach((label, idx) => {
      pdf.text(label, dayColStarts[idx] + dayColWidths[idx] / 2, yPos + headerRowHeight / 2, { align: 'center' });
    });
    
    // Draw header row border
    pdf.setLineWidth(0.2);
    pdf.rect(tableStartX, yPos, tableEndX - tableStartX, headerRowHeight);
    yPos += headerRowHeight;
    
    // Category rows: High, Low, Wind, Precip Day, Precip Night, Events, Impact
    const categories = [
      { name: 'High', getValue: (w: any) => w ? `${w.high}°F` : '--', multiline: false },
      { name: 'Low', getValue: (w: any) => w ? `${w.low}°F` : '--', multiline: false },
      { name: 'Wind', getValue: (w: any) => w ? `${w.wind} mph` : '--', multiline: false },
      { name: 'Precip (Day)', getValue: (w: any) => w ? `${w.precipDay}%` : '--', multiline: false },
      { name: 'Precip (Night)', getValue: (w: any) => w ? `${w.precipNight}%` : '--', multiline: false },
      { name: 'Events', getValue: (w: any) => w?.events || 'NONE', multiline: true },
      { name: 'Impact', getValue: (w: any) => w?.impact || 'NONE', multiline: true }
    ];
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    for (const category of categories) {
      const rowHeight = calculateRowHeight(category);
      
      if (yPos > pageHeight - margin - rowHeight * 2) {
        pdf.addPage();
        yPos = margin;
        tableStartY = yPos;
      }
      
      const rowY = yPos;
      const cellPadding = 4;
      
      // Category name (left column)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(category.name, tableStartX + cellPadding, rowY + cellPadding + lineHeight * 0.5);
      
      // Values for each day
      pdf.setFont('helvetica', 'normal');
      weekDays.forEach((date, idx) => {
        const weather = data.weather.get(date);
        const value = category.getValue(weather);
        const cellX = dayColStarts[idx];
        const cellWidth = dayColWidths[idx];
        
        if (category.multiline && value !== 'NONE' && value !== '--') {
          const lines = pdf.splitTextToSize(value, cellWidth - cellPadding * 2);
          let currentY = rowY + cellPadding;
          lines.forEach((line: string) => {
            pdf.text(line, cellX + cellPadding, currentY);
            currentY += lineHeight * 0.6;
          });
        } else {
          pdf.text(value, cellX + cellPadding, rowY + cellPadding + lineHeight * 0.5);
        }
      });
      
      // Draw row border
      pdf.rect(tableStartX, rowY, tableEndX - tableStartX, rowHeight);
      yPos += rowHeight;
    }
    
    // Draw vertical lines
    pdf.setLineWidth(0.2);
    pdf.line(tableStartX + dayColWidth, tableStartY, tableStartX + dayColWidth, yPos);
    dayColStarts.forEach(x => {
      pdf.line(x, tableStartY, x, yPos);
    });
    
    yPos += lineHeight * 0.5;
    
    pdf.setFontSize(11);
    addBlankLine(0.5);
    
    // 2. MISSION
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    addText('2. MISSION', 12, true);
    addBlankLine(0.5);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const missionText = `UGA Bulldog Battalion conducts scheduled training and accountability operations ${formatDateRange(data.dates.monday, data.dates.saturday)} in order to establish disciplined routines and maintain cadet readiness.`;
    addText(missionText);
    addBlankLine(1);
    
    // 3. COMMANDER'S INTENT
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    addText('3. COMMANDER\'S INTENT', 12, true);
    addBlankLine(0.5);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    addText('Purpose: Establish accountability and consistent training at semester start.');
    addBlankLine(0.5);
    addText('Key Tasks:');
    addBlankLine(0.3);
    
    pdf.setFont('helvetica', 'normal');
    addText('• Execute scheduled PT and training events', 11, false, 'left', margin + 5);
    addText('• Conduct leadership labs and training meetings', 11, false, 'left', margin + 5);
    addText('• Maintain 100% cadet accountability', 11, false, 'left', margin + 5);
    addBlankLine(0.5);
    
    addText('End State: Cadets are trained, accounted for, and prepared for upcoming battalion events.');
    addBlankLine(1);
    
    // 4. EXECUTION
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    addText('4. EXECUTION', 12, true);
    addBlankLine(0.5);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    addText('a. Key Events', 11, true);
    addBlankLine(0.3);
    
    // Prompt for weekly events using custom dialog
    const hasLeadershipLab = await showConfirmDialog('Do we have leadership lab this week?');
    const hasTactics = await showConfirmDialog('Do we have tactics this week?');
    const hasTrainingMeeting = await showConfirmDialog('Do we have a training meeting this week?');
    
    // Get Tuesday and Thursday dates for the week
    const tuesdayDate = data.dates.tuesday;
    const thursdayDate = data.dates.thursday;
    
    // Format date for display (e.g., "21 JAN 2026")
    const formatDateForEvent = (dateStr: string): string => {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };
    
    // Format time range in military time
    const formatTimeRange = (startTime: string, endTime: string): string => {
      return `${startTime}-${endTime}`;
    };
    
    // Key Events list
    addText('• BN PT: IAW published schedule', 11, false, 'left', margin + 5);
    
    // Leadership Lab (Thursday, 2:55-5:55PM, OCPs, Water Source)
    if (hasLeadershipLab) {
      const labDate = formatDateForEvent(thursdayDate);
      const labTime = formatTimeRange('1455', '1755'); // 2:55PM-5:55PM in military time
      addText(`• Leadership Lab: ${labDate}, ${labTime}, OCPs, Water Source`, 11, false, 'left', margin + 5);
    }
    
    // Training Meeting (Tuesday, 2:00-2:30PM, OCPs, Water Source)
    if (hasTrainingMeeting) {
      const meetingDate = formatDateForEvent(tuesdayDate);
      const meetingTime = formatTimeRange('1400', '1430'); // 2:00PM-2:30PM in military time
      addText(`• Training Meeting: ${meetingDate}, ${meetingTime}, OCPs, Water Source`, 11, false, 'left', margin + 5);
    }
    
    // Tactics Lab (Tuesday, 3:25-4:15PM, OCPs, Water Source)
    if (hasTactics) {
      const tacticsDate = formatDateForEvent(tuesdayDate);
      const tacticsTime = formatTimeRange('1525', '1615'); // 3:25PM-4:15PM in military time
      addText(`• Tactics Lab: ${tacticsDate}, ${tacticsTime}, OCPs, Water Source`, 11, false, 'left', margin + 5);
    }
    
    // Ranger Challenge Competition - check if it exists in training events
    const rangerChallengeEvent = data.trainingEvents.find(e => 
      e.name.toLowerCase().includes('ranger challenge')
    );
    if (rangerChallengeEvent) {
      const rcDate = formatDateForEvent(rangerChallengeEvent.date);
      addText(`• Ranger Challenge Competition: ${rcDate}, time/location TBD`, 11, false, 'left', margin + 5);
    }
    
    // Other training events (excluding Ranger Challenge)
    for (const event of data.trainingEvents) {
      // Skip Ranger Challenge as it's handled above
      if (event.name.toLowerCase().includes('ranger challenge')) {
        continue;
      }
      
      // Always use the event's actual date from the database
      const eventDate = event.date;
      
      // Format the event - only show time if it's valid (not TBD, 0TBD, etc.)
      const formattedTime = formatTime(event.hitTime);
      let eventText = `• ${event.name}: ${formatEventDateTime(eventDate, formattedTime ? event.hitTime : undefined)}`;
      if (event.ao) {
        eventText += `, ${event.ao}`;
      }
      addText(eventText, 11, false, 'left', margin + 5);
    }
    
    addBlankLine(0.5);
    
    // b. Tasks to Subordinate Units
    addText('b. Tasks to Subordinate Units', 11, true);
    addBlankLine(0.3);
    
    addText('All Companies:', 11, true, 'left', margin + 5);
    addText('• Coordinate with S-4 for pre/post lab logistics', 11, false, 'left', margin + 10);
    addText('• Complete supply tracker NLT 2 weeks prior to scheduled labs', 11, false, 'left', margin + 10);
    addBlankLine(0.3);
    
    // Company-specific tasks
    if (data.leadership.grizzlyCO) {
      addText('Grizzly Company:', 11, true, 'left', margin + 5);
      addText('• Coordinate internally for pre/post lab details', 11, false, 'left', margin + 10);
    }
    
    addBlankLine(0.5);
    
    // c. Coordinating Instructions
    addText('c. Coordinating Instructions', 11, true);
    addBlankLine(0.3);
    
    addText('Uniform:', 11, false, 'left', margin + 5);
    addText('• PT: IAW published schedule', 11, false, 'left', margin + 10);
    if (hasLeadershipLab) {
      addText('• Leadership Lab: OCPs, Water Source', 11, false, 'left', margin + 10);
    }
    if (hasTactics) {
      addText('• Tactics Lab: OCPs, Water Source', 11, false, 'left', margin + 10);
    }
    if (hasTrainingMeeting) {
      addText('• Training Meeting: OCPs, Water Source', 11, false, 'left', margin + 10);
    }
    
    // Risk reduction based on weather
    const weekWeather = weekDays.map(date => data.weather.get(date)).filter(w => w !== undefined);
    const maxHigh = weekWeather.length > 0 
      ? Math.max(...weekWeather.map(w => w!.high)) 
      : 0;
    const hasPrecip = weekWeather.some(w => w!.precipDay > 30);
    
    if (maxHigh >= 90) {
      addText('Risk Reduction: Enforce hydration and heat mitigation', 11, false, 'left', margin + 5);
    } else if (hasPrecip) {
      addText('Risk Reduction: Monitor weather conditions and adjust training as needed', 11, false, 'left', margin + 5);
    } else {
      addText('Risk Reduction: Standard safety protocols in effect', 11, false, 'left', margin + 5);
    }
    
    addText('Accountability: Report absences through COC to BN HQ', 11, false, 'left', margin + 5);
    addBlankLine(1);
    
    // 5. COMMAND & SIGNAL
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    addText('5. COMMAND & SIGNAL', 12, true);
    addBlankLine(0.5);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    addText('a. Succession of Command', 11, true);
    addBlankLine(0.3);
    
    if (data.leadership.bc) {
      addText(`BC: ${formatCadetName(data.leadership.bc)}`, 11, false, 'left', margin + 5);
    }
    if (data.leadership.xo) {
      addText(`XO: ${formatCadetName(data.leadership.xo)}`, 11, false, 'left', margin + 5);
    }
    if (data.leadership.csm) {
      addText(`CSM: ${formatCadetName(data.leadership.csm)}`, 11, false, 'left', margin + 5);
    }
    if (data.leadership.alphaCO) {
      addText(`A CO: ${formatCadetName(data.leadership.alphaCO)}`, 11, false, 'left', margin + 5);
    }
    if (data.leadership.bravoCO) {
      addText(`B CO: ${formatCadetName(data.leadership.bravoCO)}`, 11, false, 'left', margin + 5);
    }
    if (data.leadership.charlieCO) {
      addText(`C CO: ${formatCadetName(data.leadership.charlieCO)}`, 11, false, 'left', margin + 5);
    }
    if (data.leadership.rangerCO) {
      addText(`RC CO: ${formatCadetName(data.leadership.rangerCO)}`, 11, false, 'left', margin + 5);
    }
    if (data.leadership.grizzlyCO) {
      addText(`Grizzly CO: ${formatCadetName(data.leadership.grizzlyCO)}`, 11, false, 'left', margin + 5);
    }
    
    addBlankLine(0.5);
    
    // Emergency contacts (hardcoded based on example)
    addText('b. Emergency Contacts', 11, true);
    addBlankLine(0.3);
    addText('LTC Layfield – (706) 542-0559', 11, false, 'left', margin + 5);
    addText('MAJ Carlson – (706) 542-0557', 11, false, 'left', margin + 5);
    addBlankLine(2);
    
    // Signatures
    if (data.leadership.bc) {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCadetNameWithRank(data.leadership.bc), margin, yPos);
      yPos += lineHeight;
      pdf.setFontSize(10);
      pdf.text('BN CDR', margin, yPos);
      yPos += lineHeight * 1.5;
    }
    
    if (data.leadership.s3) {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('OFFICIAL:', margin, yPos);
      yPos += lineHeight * 1.2;
      pdf.text(formatCadetNameWithRank(data.leadership.s3), margin, yPos);
      yPos += lineHeight;
      pdf.setFontSize(10);
      pdf.text('BN S-3', margin, yPos);
      yPos += lineHeight;
    }
    addBlankLine(1);
    
    // Annexes (By Reference) - show before Annex A
    addText('ANNEXES (By Reference)', 11, true);
    addBlankLine(0.3);
    addText('Annex A: PT Overview (UGA / GGC / Ranger Challenge)', 11, false, 'left', margin + 5);
    addBlankLine(2);
    
    // Annex A: PT Overview (on new page)
    pdf.addPage();
    yPos = margin;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANNEX A: PT OVERVIEW', pageWidth / 2, yPos, { align: 'center' });
    yPos += lineHeight * 1.5;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    // PT Plans by company in table format
    const companies: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Grizzly Company'];
    const regularDays: Array<{ key: string; label: string }> = [
      { key: 'tuesday', label: 'Tue' },
      { key: 'wednesday', label: 'Wed' },
      { key: 'thursday', label: 'Thu' }
    ];
    const rangerDays: Array<{ key: string; label: string }> = [
      { key: 'monday', label: 'Mon' },
      { key: 'tuesday', label: 'Tue' },
      { key: 'wednesday', label: 'Wed' },
      { key: 'thursday', label: 'Thu' },
      { key: 'friday', label: 'Fri' }
    ];
    
    let hasAnyPTData = false;
    for (const company of companies) {
      const plans = data.ptPlans.get(company);
      const isRanger = company === 'Ranger';
      const daysToShow = isRanger ? rangerDays : regularDays;
      
      // Always show all companies, even if they don't have plans
      if (plans && plans.size > 0) {
        hasAnyPTData = true;
      }
      
      if (yPos > pageHeight - margin - lineHeight * 8) {
        pdf.addPage();
        yPos = margin;
      }
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      // Fix "Grizzly Company Company" issue and display Ranger Challenge properly
      let companyDisplayName: string;
      if (company === 'Grizzly Company') {
        companyDisplayName = 'Grizzly Company';
      } else if (company === 'Ranger') {
        companyDisplayName = 'Ranger Challenge';
      } else {
        companyDisplayName = `${company} Company`;
      }
      addText(companyDisplayName, 10, true);
      addBlankLine(0.3);
      
      // PT Table with grid formatting (centered, similar to weather table)
      // Make Ranger Challenge table smaller
      const isRangerTable = isRanger;
      const ptDayColWidth = isRangerTable ? 18 : 20;
      const numDays = daysToShow.length;
      const ptDayColWidths = Array(numDays).fill(isRangerTable ? 35 : 45); // Smaller columns for Ranger
      const totalPtTableWidth = ptDayColWidth + ptDayColWidths.reduce((a, b) => a + b, 0);
      const ptTableStartX = (pageWidth - totalPtTableWidth) / 2; // Center the table
      const ptDayColStarts = [ptTableStartX + ptDayColWidth];
      for (let i = 1; i < ptDayColWidths.length; i++) {
        ptDayColStarts.push(ptDayColStarts[i - 1] + ptDayColWidths[i - 1]);
      }
      const ptTableEndX = ptDayColStarts[ptDayColStarts.length - 1] + ptDayColWidths[ptDayColWidths.length - 1];
      
      // Cell padding constant
      const cellPadding = 4;
        
      // Calculate row height based on content - ensure proper text fitting
      const calculatePTRowHeight = (category: any) => {
        let maxLines = 1;
        daysToShow.forEach((day) => {
          const plan = plans?.get(day.key);
          const value = category.getValue(plan);
          if (value !== 'NONE' && value !== '--') {
            // Use actual cell width minus padding for accurate text wrapping
            const cellWidth = ptDayColWidths[0] - (cellPadding * 2);
            const lines = pdf.splitTextToSize(value, cellWidth);
            maxLines = Math.max(maxLines, lines.length);
          }
        });
        // Ensure minimum row height and add extra space for multi-line content
        const baseHeight = isRangerTable ? lineHeight * 1.2 : lineHeight * 1.5;
        const lineSpacing = isRangerTable ? lineHeight * 0.5 : lineHeight * 0.6;
        const contentHeight = lineSpacing * maxLines + lineHeight * 0.5;
        return Math.max(baseHeight, contentHeight);
      };
      
      let ptTableStartY = yPos;
      
      // Header row - smaller font for Ranger
      pdf.setFontSize(isRangerTable ? 7 : 8);
      pdf.setFont('helvetica', 'bold');
      const ptHeaderRowHeight = lineHeight * 1.3;
      pdf.text('Day', ptTableStartX + ptDayColWidth / 2, yPos + ptHeaderRowHeight / 2, { align: 'center' });
      daysToShow.forEach((day, idx) => {
        const plan = plans?.get(day.key);
        const timeStr = plan?.firstFormation || '';
        if (timeStr) {
          pdf.text(day.label, ptDayColStarts[idx] + ptDayColWidths[idx] / 2, yPos + lineHeight * 0.4, { align: 'center' });
          pdf.text(timeStr, ptDayColStarts[idx] + ptDayColWidths[idx] / 2, yPos + lineHeight * 0.9, { align: 'center' });
        } else {
          pdf.text(day.label, ptDayColStarts[idx] + ptDayColWidths[idx] / 2, yPos + ptHeaderRowHeight / 2, { align: 'center' });
        }
      });
        
      // Draw header row border
      pdf.setLineWidth(0.2);
      pdf.rect(ptTableStartX, yPos, ptTableEndX - ptTableStartX, ptHeaderRowHeight);
      yPos += ptHeaderRowHeight;
      
      // Category rows: Uniform, Location, Activity
      const ptCategories = [
        { 
          name: 'Uniform', 
          getValue: (plan: PTPlan | null) => {
            if (!plan || !plan.uniform || plan.uniform === 'NONE') {
              return 'Contracted: NONE\nUncontracted: Appropriate Attire';
            }
            return `Contracted: ${plan.uniform}\nUncontracted: Appropriate Attire`;
          }, 
          multiline: true 
        },
        { name: 'Location', getValue: (plan: PTPlan | null) => plan?.location || 'NONE', multiline: true },
        { name: 'Activity', getValue: (plan: PTPlan | null) => plan?.workouts || 'NONE', multiline: true }
      ];
      
      pdf.setFontSize(isRangerTable ? 7 : 8);
      pdf.setFont('helvetica', 'normal');
      
      for (const category of ptCategories) {
          const ptRowHeight = calculatePTRowHeight(category);
          
          if (yPos > pageHeight - margin - ptRowHeight * 2) {
            pdf.addPage();
            yPos = margin;
            ptTableStartY = yPos;
          }
          
          const rowY = yPos;
          
          // Category name (left column)
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(isRangerTable ? 7 : 8);
          pdf.text(category.name, ptTableStartX + cellPadding, rowY + cellPadding + lineHeight * 0.5);
          
        // Values for each day - ensure text fits properly
        pdf.setFont('helvetica', 'normal');
        daysToShow.forEach((day, idx) => {
          const plan = plans?.get(day.key);
          const value = category.getValue(plan);
          const cellX = ptDayColStarts[idx];
          const cellWidth = ptDayColWidths[idx];
          const availableWidth = cellWidth - (cellPadding * 2);
          
          if (value !== 'NONE' && value !== '--') {
            // Split text to fit within the available cell width
            const lines = pdf.splitTextToSize(value, availableWidth);
            let currentY = rowY + cellPadding;
            const lineSpacing = isRangerTable ? lineHeight * 0.5 : lineHeight * 0.6;
            lines.forEach((line: string) => {
              // Ensure text doesn't go beyond cell boundaries
              if (currentY < rowY + ptRowHeight - lineSpacing) {
                pdf.text(line, cellX + cellPadding, currentY);
                currentY += lineSpacing;
              }
            });
          } else {
            pdf.text(value, cellX + cellPadding, rowY + cellPadding + lineHeight * 0.5);
          }
        });
        
        // Draw row border
        pdf.rect(ptTableStartX, rowY, ptTableEndX - ptTableStartX, ptRowHeight);
        yPos += ptRowHeight;
      }
      
      // Draw vertical lines
      pdf.setLineWidth(0.2);
      pdf.line(ptTableStartX + ptDayColWidth, ptTableStartY, ptTableStartX + ptDayColWidth, yPos);
      ptDayColStarts.forEach(x => {
        pdf.line(x, ptTableStartY, x, yPos);
      });
      
      yPos += lineHeight * 0.5;
      
      addBlankLine(0.5);
    }
    
    if (!hasAnyPTData) {
      addText('No PT plans available for this week.', 11, false);
      addBlankLine(0.5);
    }
    
    // Save PDF
    const fileName = `FRAGO_${data.weekStart.replace(/-/g, '')}.pdf`;
    pdf.save(fileName);
    
    // Generate and save HTML document with PT tables
    const htmlContent = generatePTHTML(data);
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const htmlLink = document.createElement('a');
    htmlLink.href = htmlUrl;
    htmlLink.download = `PT_Schedule_${data.weekStart.replace(/-/g, '')}.html`;
    document.body.appendChild(htmlLink);
    htmlLink.click();
    document.body.removeChild(htmlLink);
    URL.revokeObjectURL(htmlUrl);
    
  } catch (error) {
    console.error('Error generating FRAGO:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Full error details:', error);
    alert(`Error generating FRAGO: ${errorMessage}\n\nCheck the browser console for more details.`);
    throw error;
  }
}
