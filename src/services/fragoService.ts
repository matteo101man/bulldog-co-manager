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
  
  for (const company of companies) {
    const plans = await getPTPlansForWeek(company, weekStart);
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
  const cleaned = time.replace(':', '').trim();
  if (cleaned === '' || cleaned === '0' || cleaned === '00' || cleaned === '0000') return '';
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
    pdf.text(`Effective: ${formatDateRange(data.dates.monday, data.dates.friday)}`, pageWidth / 2, yPos, { align: 'center' });
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
    
    // Weather Table
    const weekDays = [data.dates.monday, data.dates.tuesday, data.dates.wednesday, data.dates.thursday, data.dates.friday];
    addText('Weather Table:', 11, true);
    addBlankLine(0.3);
    
    // Table headers
    const colWidths = [30, 20, 20, 20, 25, 25, 35, 35]; // Day, High, Low, Wind, Precip Day, Precip Night, Events, Impact
    const colStarts = [margin + 5];
    for (let i = 1; i < colWidths.length; i++) {
      colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
    }
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const headerY = yPos;
    pdf.text('Day', colStarts[0], yPos);
    pdf.text('High', colStarts[1], yPos);
    pdf.text('Low', colStarts[2], yPos);
    pdf.text('Wind', colStarts[3], yPos);
    pdf.text('Precip D', colStarts[4], yPos);
    pdf.text('Precip N', colStarts[5], yPos);
    pdf.text('Events', colStarts[6], yPos);
    pdf.text('Impact', colStarts[7], yPos);
    yPos += lineHeight * 1.2;
    
    // Draw header line below text
    pdf.setLineWidth(0.1);
    pdf.line(margin + 5, yPos - lineHeight * 0.3, pageWidth - margin, yPos - lineHeight * 0.3);
    
    // Table rows for Monday-Friday
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    for (const date of weekDays) {
      const weather = data.weather.get(date);
      if (yPos > pageHeight - margin - lineHeight * 3) {
        pdf.addPage();
        yPos = margin;
      }
      
      const dayLabel = formatDateShort(date);
      pdf.text(dayLabel, colStarts[0], yPos);
      
      if (weather) {
        pdf.text(`${weather.high}°F`, colStarts[1], yPos);
        pdf.text(`${weather.low}°F`, colStarts[2], yPos);
        pdf.text(`${weather.wind} mph`, colStarts[3], yPos);
        pdf.text(`${weather.precipDay}%`, colStarts[4], yPos);
        pdf.text(`${weather.precipNight}%`, colStarts[5], yPos);
        
        // Events and Impact with word wrap
        const eventsText = weather.events || 'NONE';
        const impactText = weather.impact || 'NONE';
        const eventsLines = pdf.splitTextToSize(eventsText, colWidths[6] - 2);
        const impactLines = pdf.splitTextToSize(impactText, colWidths[7] - 2);
        const maxLines = Math.max(eventsLines.length, impactLines.length, 1);
        
        let currentY = yPos;
        for (let i = 0; i < maxLines; i++) {
          if (i > 0) {
            currentY += lineHeight * 0.8;
            if (currentY > pageHeight - margin - lineHeight) {
              pdf.addPage();
              currentY = margin;
            }
          }
          pdf.text(eventsLines[i] || '', colStarts[6], currentY);
          pdf.text(impactLines[i] || '', colStarts[7], currentY);
        }
        
        // Draw line below row (after text)
        yPos = currentY + lineHeight * 0.8;
      } else {
        // No weather data - show empty cells
        pdf.text('--', colStarts[1], yPos);
        pdf.text('--', colStarts[2], yPos);
        pdf.text('--', colStarts[3], yPos);
        pdf.text('--', colStarts[4], yPos);
        pdf.text('--', colStarts[5], yPos);
        pdf.text('NONE', colStarts[6], yPos);
        pdf.text('NONE', colStarts[7], yPos);
        yPos += lineHeight * 0.8;
      }
      
      pdf.line(margin + 5, yPos, pageWidth - margin, yPos);
      yPos += lineHeight * 0.5;
    }
    
    pdf.setFontSize(11);
    addBlankLine(0.5);
    
    // 2. MISSION
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    addText('2. MISSION', 12, true);
    addBlankLine(0.5);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const missionText = `UGA Bulldog Battalion conducts scheduled training and accountability operations ${formatDateRange(data.dates.monday, data.dates.friday)} in order to establish disciplined routines and maintain cadet readiness.`;
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
    
    // BN PT
    addText('BN PT: IAW published schedule', 11, false, 'left', margin + 5);
    
    // Training events
    for (const event of data.trainingEvents) {
      let eventText = `${event.name}: ${formatEventDateTime(event.date, event.hitTime)}`;
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
    
    addText('Uniform: OCPs with water source for PT and Leadership Lab', 11, false, 'left', margin + 5);
    
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
    addText('LTC Lyles – (706) 542-0566', 11, false, 'left', margin + 5);
    addText('MAJ Carlson – (706) 542-0557', 11, false, 'left', margin + 5);
    addBlankLine(2);
    
    // Signatures
    if (data.leadership.bc) {
      addText(formatCadetNameWithRank(data.leadership.bc), 11, false, 'left', margin);
      addText('BN CDR', 10, false, 'left', margin);
    }
    addBlankLine(1);
    
    if (data.leadership.s3) {
      addText('OFFICIAL:', 11, true, 'left', margin);
      addBlankLine(0.5);
      addText(formatCadetNameWithRank(data.leadership.s3), 11, false, 'left', margin);
      addText('BN S-3', 10, false, 'left', margin);
    }
    addBlankLine(1);
    
    // Annex B: PT Overview (on main page)
    addBlankLine(1);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANNEX B: PT OVERVIEW', pageWidth / 2, yPos, { align: 'center' });
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
      
      if (plans && plans.size > 0) {
        hasAnyPTData = true;
        if (yPos > pageHeight - margin - lineHeight * 8) {
          pdf.addPage();
          yPos = margin;
        }
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        addText(`${company} Company`, 10, true);
        addBlankLine(0.3);
        
        // PT Table headers
        // For regular companies: Day, Time, Location, Uniform, Title, Workout (6 columns)
        // For Ranger: Day, Time, Location, Uniform, Title, Workout (6 columns - same)
        const ptColWidths = [20, 25, 30, 40, 50, 50]; // Day, Time, Location, Uniform, Title, Workout
        const ptColStarts = [margin + 5];
        for (let i = 1; i < ptColWidths.length; i++) {
          ptColStarts.push(ptColStarts[i - 1] + ptColWidths[i - 1]);
        }
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Day', ptColStarts[0], yPos);
        pdf.text('Time', ptColStarts[1], yPos);
        pdf.text('Location', ptColStarts[2], yPos);
        pdf.text('Uniform', ptColStarts[3], yPos);
        pdf.text('Title', ptColStarts[4], yPos);
        pdf.text('Workout', ptColStarts[5], yPos);
        yPos += lineHeight * 1.2;
        
        // Draw header line below text
        pdf.setLineWidth(0.1);
        pdf.line(margin + 5, yPos - lineHeight * 0.3, pageWidth - margin, yPos - lineHeight * 0.3);
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        
        for (const day of daysToShow) {
          const plan = plans.get(day.key);
          if (plan) {
            if (yPos > pageHeight - margin - lineHeight * 3) {
              pdf.addPage();
              yPos = margin;
            }
            
            const rowStartY = yPos;
            pdf.text(day.label, ptColStarts[0], yPos);
            pdf.text(plan.firstFormation || '', ptColStarts[1], yPos);
            
            const locationLines = pdf.splitTextToSize(plan.location || '', ptColWidths[2] - 2);
            pdf.text(locationLines[0] || '', ptColStarts[2], yPos);
            
            const uniformLines = pdf.splitTextToSize(plan.uniform || '', ptColWidths[3] - 2);
            pdf.text(uniformLines[0] || '', ptColStarts[3], yPos);
            
            const titleLines = pdf.splitTextToSize(plan.title || '', ptColWidths[4] - 2);
            pdf.text(titleLines[0] || '', ptColStarts[4], yPos);
            
            const workoutLines = pdf.splitTextToSize(plan.workouts || '', ptColWidths[5] - 2);
            pdf.text(workoutLines[0] || '', ptColStarts[5], yPos);
            
            // Handle multi-line content
            const maxLines = Math.max(locationLines.length, uniformLines.length, titleLines.length, workoutLines.length, 1);
            let currentY = yPos;
            for (let i = 1; i < maxLines; i++) {
              currentY += lineHeight * 0.7;
              if (currentY > pageHeight - margin - lineHeight) {
                pdf.addPage();
                currentY = margin;
              }
              if (locationLines[i]) pdf.text(locationLines[i], ptColStarts[2], currentY);
              if (uniformLines[i]) pdf.text(uniformLines[i], ptColStarts[3], currentY);
              if (titleLines[i]) pdf.text(titleLines[i], ptColStarts[4], currentY);
              if (workoutLines[i]) pdf.text(workoutLines[i], ptColStarts[5], currentY);
            }
            
            // Draw line below row (after text)
            yPos = currentY + lineHeight * 0.8;
            pdf.line(margin + 5, yPos, pageWidth - margin, yPos);
            yPos += lineHeight * 0.5;
          }
        }
        
        addBlankLine(0.5);
      }
    }
    
    if (!hasAnyPTData) {
      addText('No PT plans available for this week.', 11, false);
      addBlankLine(0.5);
    }
    
    // Annexes
    addBlankLine(1);
    addText('ANNEXES (By Reference)', 11, true);
    addBlankLine(0.3);
    addText('Annex B: PT Overview (UGA / GGC / Ranger Challenge)', 11, false, 'left', margin + 5);
    addText('Annex C: Ruck Packing List (If Applicable)', 11, false, 'left', margin + 5);
    addText('Annex D: Uniform Exceptions (If Applicable)', 11, false, 'left', margin + 5);
    
    // Save PDF
    const fileName = `FRAGO_${data.weekStart.replace(/-/g, '')}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating FRAGO:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Full error details:', error);
    alert(`Error generating FRAGO: ${errorMessage}\n\nCheck the browser console for more details.`);
    throw error;
  }
}
