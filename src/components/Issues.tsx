import React, { useState, useEffect } from 'react';
import { getAllAttendanceForWeek } from '../services/attendanceService';
import { getCadetsByCompany } from '../services/cadetService';
import { getCurrentWeekStart, getWeekDatesForWeek, formatDateWithOrdinal } from '../utils/dates';
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

export default function Issues({ onBack }: IssuesProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const currentWeekStart = getCurrentWeekStart();
  const weekDates = getWeekDatesForWeek(currentWeekStart);

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    setLoading(true);
    try {
      // Get all cadets (Master includes all cadets from all companies)
      const allCadetsList = await getCadetsByCompany('Master');
      
      // Filter out Grizzly Company cadets
      const filteredCadets = allCadetsList.filter(c => c.company !== 'Grizzly Company');
      
      // Get all attendance records for current week
      const attendanceMap = await getAllAttendanceForWeek(currentWeekStart);
      
      // Find missing attendance
      const missingIssues: Issue[] = [];
      
      filteredCadets.forEach(cadet => {
        const record = attendanceMap.get(cadet.id);
        
        // Check PT attendance (Tuesday, Wednesday, Thursday)
        const dayMap: Record<DayOfWeek, string> = {
          tuesday: weekDates.tuesday,
          wednesday: weekDates.wednesday,
          thursday: weekDates.thursday
        };
        
        // Check PT Tuesday
        if (record?.ptTuesday === null || record?.ptTuesday === undefined) {
          missingIssues.push({
            cadetName: `${cadet.firstName} ${cadet.lastName}`,
            day: 'tuesday',
            date: dayMap.tuesday,
            attendanceType: 'PT'
          });
        }
        
        // Check PT Wednesday
        if (record?.ptWednesday === null || record?.ptWednesday === undefined) {
          missingIssues.push({
            cadetName: `${cadet.firstName} ${cadet.lastName}`,
            day: 'wednesday',
            date: dayMap.wednesday,
            attendanceType: 'PT'
          });
        }
        
        // Check PT Thursday
        if (record?.ptThursday === null || record?.ptThursday === undefined) {
          missingIssues.push({
            cadetName: `${cadet.firstName} ${cadet.lastName}`,
            day: 'thursday',
            date: dayMap.thursday,
            attendanceType: 'PT'
          });
        }
        
        // Check Lab Thursday
        if (record?.labThursday === null || record?.labThursday === undefined) {
          missingIssues.push({
            cadetName: `${cadet.firstName} ${cadet.lastName}`,
            day: 'thursday',
            date: dayMap.thursday,
            attendanceType: 'Lab'
          });
        }
      });
      
      // Sort by cadet name, then by day
      missingIssues.sort((a, b) => {
        const nameCompare = a.cadetName.localeCompare(b.cadetName);
        if (nameCompare !== 0) return nameCompare;
        const dayOrder: Record<DayOfWeek, number> = { tuesday: 1, wednesday: 2, thursday: 3 };
        return dayOrder[a.day] - dayOrder[b.day];
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
                  No missing attendance data for the current week.
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

