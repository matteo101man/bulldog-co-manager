import { useEffect, useState } from 'react';
import { Cadet, AttendanceStatus, AttendanceRecord } from '../types';
import { getCadetsByMSLevel } from '../services/cadetService';
import { getAttendanceRecord, updateAttendance, getTotalUnexcusedAbsencesForCadets } from '../services/attendanceService';
import { getCurrentWeekStart, getWeekDatesForWeek, formatDateWithDay, getWeekStartByOffset, formatDateWithOrdinal } from '../utils/dates';

interface TacticsAttendanceProps {
  onBack: () => void;
  onSelectCadet?: (cadetId: string) => void;
}

export default function TacticsAttendance({ onBack, onSelectCadet }: TacticsAttendanceProps) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getCurrentWeekStart());
  const [unexcusedTotals, setUnexcusedTotals] = useState<Map<string, number>>(new Map());
  const weekDates = getWeekDatesForWeek(currentWeekStart);

  useEffect(() => {
    loadData();
  }, [currentWeekStart]);

  useEffect(() => {
    if (cadets.length > 0) {
      loadUnexcusedTotals();
    }
  }, [cadets]);

  async function loadData() {
    setLoading(true);
    try {
      // Get all MS3 cadets
      const ms3Cadets = await getCadetsByMSLevel('MS3');
      setCadets(ms3Cadets);
      
      // Get attendance for all cadets for this week
      const attendance = new Map<string, AttendanceRecord>();
      for (const cadet of ms3Cadets) {
        const record = await getAttendanceRecord(cadet.id, currentWeekStart);
        // Ensure tacticsTuesday field exists
        const fullRecord: AttendanceRecord = {
          cadetId: cadet.id,
          ptMonday: record?.ptMonday ?? null,
          ptTuesday: record?.ptTuesday ?? null,
          ptWednesday: record?.ptWednesday ?? null,
          ptThursday: record?.ptThursday ?? null,
          ptFriday: record?.ptFriday ?? null,
          labThursday: record?.labThursday ?? null,
          tacticsTuesday: record?.tacticsTuesday ?? null,
          weekStartDate: currentWeekStart
        };
        attendance.set(cadet.id, fullRecord);
      }
      setAttendanceMap(attendance);
    } catch (error) {
      console.error('Error loading data:', error);
      alert(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }


  async function loadUnexcusedTotals() {
    try {
      const cadetIds = cadets.map(c => c.id);
      const totals = await getTotalUnexcusedAbsencesForCadets(cadetIds, 'Tactics');
      setUnexcusedTotals(totals);
    } catch (error) {
      console.error('Error loading unexcused totals:', error);
    }
  }

  async function handleStatusChange(cadetId: string, status: AttendanceStatus) {
    // Save immediately to database - real-time subscription will update UI
    try {
      await updateAttendance(cadetId, 'tuesday', status, currentWeekStart, 'Tactics');
      
      // Update local state optimistically for immediate UI feedback
      setAttendanceMap(prev => {
        const newMap = new Map(prev);
        const existingRecord = newMap.get(cadetId) || {
          cadetId,
          ptMonday: null,
          ptTuesday: null,
          ptWednesday: null,
          ptThursday: null,
          ptFriday: null,
          labThursday: null,
          tacticsTuesday: null,
          weekStartDate: currentWeekStart
        };
        
        const updatedRecord: AttendanceRecord = {
          ...existingRecord,
          tacticsTuesday: status || null,
          weekStartDate: currentWeekStart
        };
        
        newMap.set(cadetId, updatedRecord);
        return newMap;
      });
      
      // Reload unexcused totals in case they changed
      await loadUnexcusedTotals();
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert(`Error updating attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calculate stats
  const records = Array.from(attendanceMap.values());
  let presentCount = 0;
  let excusedCount = 0;
  let unexcusedCount = 0;
  
  records.forEach(record => {
    if (record.tacticsTuesday === 'present') presentCount++;
    else if (record.tacticsTuesday === 'excused') excusedCount++;
    else if (record.tacticsTuesday === 'unexcused') unexcusedCount++;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Tactics Attendance
          </h1>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 font-medium touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Back
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Week dates header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="grid gap-2 text-center grid-cols-2">
            <div className="font-semibold text-gray-700">Name</div>
            <div className="font-semibold text-gray-700 text-sm">
              {formatDateWithDay(weekDates.tuesday)}
            </div>
          </div>
        </div>
        
        {/* Cadet list */}
        <div className="space-y-2">
          {cadets.map((cadet) => {
            const record = attendanceMap.get(cadet.id);
            const tacticsTuesday = record?.tacticsTuesday ?? null;
            
            return (
              <div key={cadet.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid gap-2 p-3 grid-cols-2">
                  <div className="flex items-center">
                    <button
                      onClick={() => onSelectCadet?.(cadet.id)}
                      className="font-medium text-blue-600 hover:text-blue-800 text-sm text-left touch-manipulation"
                    >
                      {cadet.lastName}, {cadet.firstName}
                    </button>
                  </div>
                  <select
                    value={tacticsTuesday || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleStatusChange(cadet.id, value === '' ? null : (value as AttendanceStatus));
                    }}
                    aria-label={`${cadet.firstName} ${cadet.lastName} Tuesday Tactics attendance`}
                    className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(tacticsTuesday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">—</option>
                    <option value="present">Present</option>
                    <option value="excused">Excused</option>
                    <option value="unexcused">Unexcused</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {cadets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No MS3 cadets found
          </div>
        )}

        {/* Statistics */}
        {cadets.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Statistics</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-present">{presentCount}</div>
                <div className="text-xs text-gray-600">Present</div>
              </div>
              <div>
                <div className="text-lg font-bold text-excused">{excusedCount}</div>
                <div className="text-xs text-gray-600">Excused</div>
              </div>
              <div>
                <div className="text-lg font-bold text-unexcused">{unexcusedCount}</div>
                <div className="text-xs text-gray-600">Unexcused</div>
              </div>
            </div>
          </div>
        )}

        {/* Week Navigation */}
        {cadets.length > 0 && (
          <WeekNavigation
            currentWeekStart={currentWeekStart}
            onWeekChange={setCurrentWeekStart}
          />
        )}
      </main>
    </div>
  );
}

function getStatusColor(status: AttendanceStatus): string {
  if (status === 'present') return 'border-present text-present';
  if (status === 'excused') return 'border-excused text-excused';
  if (status === 'unexcused') return 'border-unexcused text-unexcused';
  return 'border-gray-300 text-gray-600';
}

interface WeekNavigationProps {
  currentWeekStart: string;
  onWeekChange: (weekStart: string) => void;
}

function WeekNavigation({ currentWeekStart, onWeekChange }: WeekNavigationProps) {
  const currentWeek = getCurrentWeekStart();

  function handlePreviousWeek() {
    const previousWeek = getWeekStartByOffset(currentWeekStart, -1);
    onWeekChange(previousWeek);
  }

  function handleNextWeek() {
    const nextWeek = getWeekStartByOffset(currentWeekStart, 1);
    onWeekChange(nextWeek);
  }

  function handleCurrentWeek() {
    onWeekChange(currentWeek);
  }

  const isCurrentWeek = currentWeekStart === currentWeek;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousWeek}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 touch-manipulation transition-colors"
          aria-label="Previous week"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex-1 text-center px-4">
          <div className="text-sm font-medium text-gray-900">
            Week of {formatDateWithOrdinal(currentWeekStart)}
          </div>
          {!isCurrentWeek && (
            <button
              onClick={handleCurrentWeek}
              className="text-xs text-blue-600 hover:text-blue-700 mt-1 touch-manipulation"
            >
              Return to Current Week
            </button>
          )}
        </div>
        
        <button
          onClick={handleNextWeek}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 touch-manipulation transition-colors"
          aria-label="Next week"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

