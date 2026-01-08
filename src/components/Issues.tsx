import React, { useState, useEffect } from 'react';
import { getAllAttendanceForWeek } from '../services/attendanceService';
import { getCadetsByCompany } from '../services/cadetService';
import { getWeekDatesForWeek, formatDateWithOrdinal } from '../utils/dates';
import { Cadet, AttendanceRecord, DayOfWeek, AttendanceType } from '../types';

interface Issue {
  cadetName: string;
  day: DayOfWeek;
  date: string;
  attendanceType: AttendanceType;
}

interface IssuesProps {
  onBack: () => void;
}

/**
 * Get the Monday of the week for a given date
 */
function getWeekStart(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - daysToSubtract);
  
  const weekYear = date.getFullYear();
  const weekMonth = String(date.getMonth() + 1).padStart(2, '0');
  const weekDay = String(date.getDate()).padStart(2, '0');
  return `${weekYear}-${weekMonth}-${weekDay}`;
}

/**
 * Get all week start dates between two dates
 */
function getWeekStartsBetween(startDate: Date, endDate: Date): string[] {
  const weekStarts = new Set<string>();
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const weekStart = getWeekStart(dateStr);
    weekStarts.add(weekStart);
    current.setDate(current.getDate() + 7); // Move to next week
  }
  
  return Array.from(weekStarts).sort();
}

export default function Issues({ onBack }: IssuesProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    setLoading(true);
    try {
      // Get all cadets (Master includes all cadets from all companies)
      const allCadetsList = await getCadetsByCompany('Master');
      
      // Date range: January 20, 2026 to April 22, 2026
      const startDate = new Date('2026-01-20');
      const endDate = new Date('2026-04-22');
      
      // Get all week start dates in the range
      const weekStarts = getWeekStartsBetween(startDate, endDate);
      
      // Find missing attendance across all weeks
      const missingIssues: Issue[] = [];
      
      // Process each week
      for (const weekStart of weekStarts) {
        const weekDates = getWeekDatesForWeek(weekStart);
        const attendanceMap = await getAllAttendanceForWeek(weekStart);
        
        allCadetsList.forEach(cadet => {
          const record = attendanceMap.get(cadet.id);
          
          // Check PT Tuesday
          if (record?.ptTuesday === null || record?.ptTuesday === undefined) {
            missingIssues.push({
              cadetName: `${cadet.firstName} ${cadet.lastName}`,
              day: 'tuesday',
              date: weekDates.tuesday,
              attendanceType: 'PT'
            });
          }
          
          // Check PT Wednesday
          if (record?.ptWednesday === null || record?.ptWednesday === undefined) {
            missingIssues.push({
              cadetName: `${cadet.firstName} ${cadet.lastName}`,
              day: 'wednesday',
              date: weekDates.wednesday,
              attendanceType: 'PT'
            });
          }
          
          // Check PT Thursday
          if (record?.ptThursday === null || record?.ptThursday === undefined) {
            missingIssues.push({
              cadetName: `${cadet.firstName} ${cadet.lastName}`,
              day: 'thursday',
              date: weekDates.thursday,
              attendanceType: 'PT'
            });
          }
          
          // Check Lab Thursday
          if (record?.labThursday === null || record?.labThursday === undefined) {
            missingIssues.push({
              cadetName: `${cadet.firstName} ${cadet.lastName}`,
              day: 'thursday',
              date: weekDates.thursday,
              attendanceType: 'Lab'
            });
          }
          
          // Check Tactics Tuesday (MS3 only)
          if (cadet.militaryScienceLevel === 'MS3') {
            if (record?.tacticsTuesday === null || record?.tacticsTuesday === undefined) {
              missingIssues.push({
                cadetName: `${cadet.firstName} ${cadet.lastName}`,
                day: 'tuesday',
                date: weekDates.tuesday,
                attendanceType: 'Tactics'
              });
            }
          }
        });
      }
      
      // Sort by date, then cadet name, then by attendance type
      missingIssues.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const nameCompare = a.cadetName.localeCompare(b.cadetName);
        if (nameCompare !== 0) return nameCompare;
        return a.attendanceType.localeCompare(b.attendanceType);
      });
      
      setIssues(missingIssues);
    } catch (error) {
      console.error('Error loading issues:', error);
      alert(`Error loading issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Issues</h1>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 font-medium touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Home
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance</h2>
              
              {issues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No missing attendance data from January 20th to April 22nd.
                </div>
              ) : (
                <div className="space-y-2">
                  {issues.map((issue, index) => {
                    const formattedDate = formatDateWithOrdinal(issue.date);
                    return (
                      <div 
                        key={`${issue.cadetName}-${issue.day}-${issue.attendanceType}-${index}`}
                        className="text-red-600 text-sm py-2 border-b border-gray-100 last:border-b-0"
                      >
                        {issue.cadetName} is missing {issue.attendanceType} attendance for {formattedDate}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <button
              onClick={loadIssues}
              className="w-full py-3 px-4 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 touch-manipulation min-h-[44px]"
            >
              Refresh
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

