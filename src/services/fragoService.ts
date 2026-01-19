import { getCadetsByCompany } from './cadetService';
import { getAllTrainingEvents } from './trainingEventService';
import { getPTPlansForWeek } from './ptPlanService';
import { getWeatherForecasts } from './weatherService';
import { getCurrentWeekStart, getFullWeekDates } from '../utils/dates';
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
  weather: Map<string, { high: number; low: number; precipDay: number }>;
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
 * Get weather data for the week
 */
async function getWeekWeather(dates: string[]): Promise<Map<string, { high: number; low: number; precipDay: number }>> {
  const { forecasts, errors } = await getWeatherForecasts(dates);
  const weather = new Map<string, { high: number; low: number; precipDay: number }>();
  
  for (const date of dates) {
    const forecast = forecasts.get(date);
    if (forecast) {
      weather.set(date, {
        high: forecast.high,
        low: forecast.low,
        precipDay: forecast.precipDay
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
  
  // Determine rank based on MS level and position
  let rank = 'CDT';
  if (cadet.position) {
    const pos = cadet.position.toLowerCase();
    if (pos.includes('bc') || pos.includes('battalion commander')) {
      rank = 'CDT/LTC';
    } else if (pos.includes('xo') || pos.includes('executive officer')) {
      rank = 'CDT/MAJ';
    } else if (pos.includes('co') || pos.includes('commanding officer')) {
      rank = 'CDT/CPT';
    } else if (pos.includes('csm') || pos.includes('command sergeant major')) {
      rank = 'CDT/CSM';
    } else if (pos.includes('s3') || pos.includes('operations officer')) {
      rank = 'CDT/CPT';
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
  if (!time) return '';
  return time.replace(':', '').padStart(4, '0');
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
    return `${day} ${month} ${year}, ${formattedTime}`;
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
    pdf.text(`Effective: ${formatDateRange(data.dates.monday, data.dates.sunday)}`, pageWidth / 2, yPos, { align: 'center' });
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
    
    // Weather summary
    const avgHigh = Array.from(data.weather.values())
      .map(w => w.high)
      .reduce((a, b) => a + b, 0) / data.weather.size;
    const maxHigh = Math.max(...Array.from(data.weather.values()).map(w => w.high));
    const hasPrecip = Array.from(data.weather.values()).some(w => w.precipDay > 30);
    
    let weatherText = `Weather: `;
    if (maxHigh >= 90) {
      weatherText += `Hot (${Math.round(maxHigh)}℉+). Heat mitigation measures in effect.`;
    } else if (avgHigh >= 70) {
      weatherText += `Warm (${Math.round(avgHigh)}℉ average).`;
    } else {
      weatherText += `Moderate (${Math.round(avgHigh)}℉ average).`;
    }
    if (hasPrecip) {
      weatherText += ' Precipitation possible.';
    }
    
    addText(weatherText);
    addBlankLine(1);
    
    // 2. MISSION
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    addText('2. MISSION', 12, true);
    addBlankLine(0.5);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const missionText = `UGA Bulldog Battalion conducts scheduled training and accountability operations ${formatDateRange(data.dates.monday, data.dates.sunday)} in order to establish disciplined routines and maintain cadet readiness.`;
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
      const eventText = `${event.name}: ${formatEventDateTime(event.date, event.hitTime)}${event.ao ? `, ${event.ao}` : ''}`;
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
    
    // Annexes
    addText('ANNEXES (By Reference)', 11, true);
    addBlankLine(0.3);
    addText('Annex A: Weekly Training Schedule', 11, false, 'left', margin + 5);
    addText('Annex B: PT Overview (UGA / GGC / Ranger Challenge)', 11, false, 'left', margin + 5);
    addText('Annex C: Ruck Packing List (If Applicable)', 11, false, 'left', margin + 5);
    addText('Annex D: Uniform Exceptions (If Applicable)', 11, false, 'left', margin + 5);
    
    // Save PDF
    const fileName = `FRAGO_${data.weekStart.replace(/-/g, '')}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Error generating FRAGO:', error);
    alert('Error generating FRAGO. Please try again.');
    throw error;
  }
}
