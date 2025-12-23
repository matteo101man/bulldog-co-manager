import { useEffect, useState, useRef } from 'react';
import { Cadet, Company, AttendanceStatus, DayOfWeek, AttendanceRecord } from '../types';
import { getCadetsByCompany } from '../services/cadetService';
import { getCompanyAttendance, updateAttendance } from '../services/attendanceService';
import { getCurrentWeekStart, getWeekDates, formatDateWithDay, getWeekStartByOffset, getWeekDatesForWeek } from '../utils/dates';
import { getTotalUnexcusedAbsencesForCadets } from '../services/attendanceService';
import { calculateDayStats, calculateWeekStats, getCadetsByStatusAndLevel } from '../utils/stats';

interface CompanyRosterProps {
  company: Company;
  onBack: () => void;
}

export default function CompanyRoster({ company, onBack }: CompanyRosterProps) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [localAttendanceMap, setLocalAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'week'>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getCurrentWeekStart());
  const [unexcusedTotals, setUnexcusedTotals] = useState<Map<string, number>>(new Map());
  const weekDates = getWeekDatesForWeek(currentWeekStart);

  useEffect(() => {
    loadData();
  }, [company, currentWeekStart]);

  useEffect(() => {
    // Load unexcused totals when cadets change
    if (cadets.length > 0) {
      loadUnexcusedTotals();
    }
  }, [cadets]);

  async function loadData() {
    setLoading(true);
    try {
      const [cadetList, attendance] = await Promise.all([
        getCadetsByCompany(company),
        getCompanyAttendance(company, currentWeekStart)
      ]);
      setCadets(cadetList);
      setAttendanceMap(attendance);
      setLocalAttendanceMap(new Map(attendance)); // Initialize local map with server data
    } catch (error) {
      console.error('Error loading data:', error);
      // Show user-friendly error message
      alert(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check:\n1. Firestore is enabled in Firebase Console\n2. Internet connection is working\n3. Browser console for more details`);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnexcusedTotals() {
    try {
      const cadetIds = cadets.map(c => c.id);
      const totals = await getTotalUnexcusedAbsencesForCadets(cadetIds);
      setUnexcusedTotals(totals);
    } catch (error) {
      console.error('Error loading unexcused totals:', error);
    }
  }

  function handleStatusChange(cadetId: string, day: DayOfWeek, status: AttendanceStatus) {
    // Update local state immediately for real-time UI update
    setLocalAttendanceMap(prev => {
      const newMap = new Map(prev);
      const existingRecord = newMap.get(cadetId) || {
        cadetId,
        tuesday: null,
        wednesday: null,
        thursday: null,
        weekStartDate: weekStart
      };
      
      const updatedRecord: AttendanceRecord = {
        ...existingRecord,
        [day]: status || null,
        weekStartDate: currentWeekStart
      };
      
      newMap.set(cadetId, updatedRecord);
      return newMap;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Get all changes (compare localAttendanceMap with attendanceMap)
      const changes: Array<{ cadetId: string; day: DayOfWeek; status: AttendanceStatus }> = [];
      
      localAttendanceMap.forEach((localRecord, cadetId) => {
        const serverRecord = attendanceMap.get(cadetId);
        
        // Check each day for changes
        (['tuesday', 'wednesday', 'thursday'] as DayOfWeek[]).forEach(day => {
          const localStatus = localRecord[day];
          const serverStatus = serverRecord?.[day] ?? null;
          
          if (localStatus !== serverStatus) {
            changes.push({ cadetId, day, status: localStatus });
          }
        });
      });

      // Also check for records that exist in server but not in local (shouldn't happen, but be safe)
      attendanceMap.forEach((serverRecord, cadetId) => {
        if (!localAttendanceMap.has(cadetId)) {
          // This shouldn't happen, but handle it
          (['tuesday', 'wednesday', 'thursday'] as DayOfWeek[]).forEach(day => {
            if (serverRecord[day] !== null) {
              changes.push({ cadetId, day, status: null });
            }
          });
        }
      });

      // Save all changes
      await Promise.all(
        changes.map(({ cadetId, day, status }) =>
          updateAttendance(cadetId, day, status, currentWeekStart)
        )
      );

      // Update the server attendance map to match local
      setAttendanceMap(new Map(localAttendanceMap));
      
      // Reload unexcused totals in case they changed
      await loadUnexcusedTotals();
      
      // Show success feedback
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert(`Error saving attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Reload data to sync with server
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  // Calculate stats using localAttendanceMap for real-time updates
  const records = Array.from(localAttendanceMap.values());
  const cadetsMap = new Map(cadets.map(c => [c.id, c]));
  const tuesdayStats = calculateDayStats(records, 'tuesday');
  const wednesdayStats = calculateDayStats(records, 'wednesday');
  const thursdayStats = calculateDayStats(records, 'thursday');
  const weekStats = calculateWeekStats(records);
  const excusedByLevel = getCadetsByStatusAndLevel(records, cadetsMap, selectedDay, 'excused');
  const unexcusedByLevel = getCadetsByStatusAndLevel(records, cadetsMap, selectedDay, 'unexcused');
  
  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(Array.from(attendanceMap.entries()).sort()) !== 
                            JSON.stringify(Array.from(localAttendanceMap.entries()).sort());


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
            {company} {company !== 'Master' && 'Company'}
          </h1>
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
        {/* Week dates header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="font-semibold text-gray-700">Name</div>
            <div className="font-semibold text-gray-700 text-sm">
              {formatDateWithDay(weekDates.tuesday)}
            </div>
            <div className="font-semibold text-gray-700 text-sm">
              {formatDateWithDay(weekDates.wednesday)}
            </div>
            <div className="font-semibold text-gray-700 text-sm">
              {formatDateWithDay(weekDates.thursday)}
            </div>
          </div>
        </div>

        {/* Cadet list */}
        <div className="space-y-2">
          {cadets.map((cadet) => {
            const record = localAttendanceMap.get(cadet.id);
            return (
              <CadetRow
                key={cadet.id}
                cadet={cadet}
                attendance={record}
                onStatusChange={handleStatusChange}
              />
            );
          })}
        </div>

        {cadets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No cadets found for {company} Company
          </div>
        )}

        {/* Save button */}
        {cadets.length > 0 && (
          <div className="mt-4 mb-4">
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                hasUnsavedChanges && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'All Changes Saved'}
            </button>
          </div>
        )}

        {/* Statistics Section */}
        {cadets.length > 0 && (
          <StatisticsSection
            cadets={cadets}
            records={records}
            tuesdayStats={tuesdayStats}
            wednesdayStats={wednesdayStats}
            thursdayStats={thursdayStats}
            weekStats={weekStats}
            weekDates={weekDates}
            excusedByLevel={excusedByLevel}
            unexcusedByLevel={unexcusedByLevel}
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
            unexcusedTotals={unexcusedTotals}
            currentWeekStart={currentWeekStart}
            onWeekChange={setCurrentWeekStart}
          />
        )}
      </main>
    </div>
  );
}

interface CadetRowProps {
  cadet: Cadet;
  attendance: AttendanceRecord | undefined;
  onStatusChange: (cadetId: string, day: DayOfWeek, status: AttendanceStatus) => void;
}

function CadetRow({ 
  cadet, 
  attendance,
  onStatusChange
}: CadetRowProps) {
  const tuesday = attendance?.tuesday ?? null;
  const wednesday = attendance?.wednesday ?? null;
  const thursday = attendance?.thursday ?? null;

  function getStatusColor(status: AttendanceStatus): string {
    if (status === 'present') return 'border-present text-present';
    if (status === 'excused') return 'border-excused text-excused';
    if (status === 'unexcused') return 'border-unexcused text-unexcused';
    return 'border-gray-300 text-gray-600';
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-4 gap-2 p-3">
        <div className="flex items-center">
          <span className="font-medium text-gray-900 text-sm">
            {cadet.lastName}, {cadet.firstName}
          </span>
        </div>
        <select
          value={tuesday || ''}
          onChange={(e) => {
            const value = e.target.value;
            onStatusChange(cadet.id, 'tuesday', value === '' ? null : (value as AttendanceStatus));
          }}
          aria-label={`${cadet.firstName} ${cadet.lastName} Tuesday attendance`}
          className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(tuesday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="">—</option>
          <option value="present">Present</option>
          <option value="excused">Excused</option>
          <option value="unexcused">Unexcused</option>
        </select>
        <select
          value={wednesday || ''}
          onChange={(e) => {
            const value = e.target.value;
            onStatusChange(cadet.id, 'wednesday', value === '' ? null : (value as AttendanceStatus));
          }}
          aria-label={`${cadet.firstName} ${cadet.lastName} Wednesday attendance`}
          className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(wednesday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="">—</option>
          <option value="present">Present</option>
          <option value="excused">Excused</option>
          <option value="unexcused">Unexcused</option>
        </select>
        <select
          value={thursday || ''}
          onChange={(e) => {
            const value = e.target.value;
            onStatusChange(cadet.id, 'thursday', value === '' ? null : (value as AttendanceStatus));
          }}
          aria-label={`${cadet.firstName} ${cadet.lastName} Thursday attendance`}
          className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(thursday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="">—</option>
          <option value="present">Present</option>
          <option value="excused">Excused</option>
          <option value="unexcused">Unexcused</option>
        </select>
      </div>
    </div>
  );
}

interface StatisticsSectionProps {
  cadets: Cadet[];
  records: AttendanceRecord[];
  tuesdayStats: { present: number; excused: number; unexcused: number };
  wednesdayStats: { present: number; excused: number; unexcused: number };
  thursdayStats: { present: number; excused: number; unexcused: number };
  weekStats: { present: number; excused: number; unexcused: number };
  weekDates: { tuesday: string; wednesday: string; thursday: string };
  excusedByLevel: Map<string, Array<{ id: string; name: string; level: string }>>;
  unexcusedByLevel: Map<string, Array<{ id: string; name: string; level: string }>>;
  selectedDay: DayOfWeek | 'week';
  onDayChange: (day: DayOfWeek | 'week') => void;
  unexcusedTotals: Map<string, number>;
  currentWeekStart: string;
  onWeekChange: (weekStart: string) => void;
}

function StatisticsSection({
  cadets,
  records,
  tuesdayStats,
  wednesdayStats,
  thursdayStats,
  weekStats,
  weekDates,
  excusedByLevel,
  unexcusedByLevel,
  selectedDay,
  onDayChange,
  unexcusedTotals,
  currentWeekStart,
  onWeekChange
}: StatisticsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [statsViewMode, setStatsViewMode] = useState<'summary' | 'excused' | 'unexcused'>('summary');
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
    <div className="mt-6 space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50 touch-manipulation"
      >
        <h2 className="text-lg font-bold text-gray-900">Attendance Statistics</h2>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <>
          {/* Week Navigation */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
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
                  {formatDateWithDay(weekDates.tuesday).split(',')[0]} - {formatDateWithDay(weekDates.thursday).split(',')[0]}
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
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setStatsViewMode('summary')}
              className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
                statsViewMode === 'summary'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setStatsViewMode('excused')}
              className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
                statsViewMode === 'excused'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600'
              }`}
            >
              Excused
            </button>
            <button
              onClick={() => setStatsViewMode('unexcused')}
              className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
                statsViewMode === 'unexcused'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600'
              }`}
            >
              Unexcused
            </button>
          </div>

          <div className="p-4">
            {statsViewMode === 'summary' && (
              <SummaryStats
                cadets={cadets}
                records={records}
                tuesdayStats={tuesdayStats}
                wednesdayStats={wednesdayStats}
                thursdayStats={thursdayStats}
                weekStats={weekStats}
                weekDates={weekDates}
                unexcusedTotals={unexcusedTotals}
              />
            )}
            {statsViewMode === 'excused' && (
              <StatusList
                cadetsByLevel={excusedByLevel}
                status="Excused"
                selectedDay={selectedDay}
                onDayChange={onDayChange}
              />
            )}
            {statsViewMode === 'unexcused' && (
              <StatusList
                cadetsByLevel={unexcusedByLevel}
                status="Unexcused"
                selectedDay={selectedDay}
                onDayChange={onDayChange}
              />
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

interface SummaryStatsProps {
  cadets: Cadet[];
  records: AttendanceRecord[];
  tuesdayStats: { present: number; excused: number; unexcused: number };
  wednesdayStats: { present: number; excused: number; unexcused: number };
  thursdayStats: { present: number; excused: number; unexcused: number };
  weekStats: { present: number; excused: number; unexcused: number };
  weekDates: { tuesday: string; wednesday: string; thursday: string };
  unexcusedTotals: Map<string, number>;
}

function SummaryStats({ cadets, records, tuesdayStats, wednesdayStats, thursdayStats, weekStats, weekDates, unexcusedTotals }: SummaryStatsProps) {
  const cadetsMap = new Map(cadets.map(c => [c.id, c]));

  // Helper function to get cadet names for a specific day and status
  const getCadetNames = (day: DayOfWeek, status: 'excused' | 'unexcused'): Array<{ name: string; count?: number }> => {
    return records
      .filter(record => record[day] === status)
      .map(record => {
        const cadet = cadetsMap.get(record.cadetId);
        if (!cadet) return null;
        const name = `${cadet.lastName}, ${cadet.firstName}`;
        // For unexcused, include total count
        if (status === 'unexcused') {
          const total = unexcusedTotals.get(record.cadetId) || 0;
          return { name, count: total };
        }
        return { name };
      })
      .filter((item): item is { name: string; count?: number } => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Helper function to get cadet names for week totals
  const getWeekCadetNames = (status: 'excused' | 'unexcused'): Array<{ name: string; count?: number }> => {
    const nameMap = new Map<string, number>();
    records.forEach(record => {
      if (record.tuesday === status || record.wednesday === status || record.thursday === status) {
        const cadet = cadetsMap.get(record.cadetId);
        if (cadet) {
          const name = `${cadet.lastName}, ${cadet.firstName}`;
          // For unexcused, track total count
          if (status === 'unexcused') {
            const total = unexcusedTotals.get(record.cadetId) || 0;
            nameMap.set(name, total);
          } else {
            nameMap.set(name, 0);
          }
        }
      }
    });
    return Array.from(nameMap.entries())
      .map(([name, count]) => ({ name, count: status === 'unexcused' ? count : undefined }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <div className="space-y-4">
      {/* Daily Stats */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Daily Statistics</h3>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900 mb-2">Tuesday</div>
          <div className="text-xs text-gray-500 mb-3">{formatDateWithDay(weekDates.tuesday)}</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-present">{tuesdayStats.present}</div>
              <div className="text-xs text-gray-600">Present</div>
            </div>
            <StatWithTooltip
              count={tuesdayStats.excused}
              label="Excused"
              cadetNames={getCadetNames('tuesday', 'excused')}
              colorClass="text-excused"
            />
            <StatWithTooltip
              count={tuesdayStats.unexcused}
              label="Unexcused"
              cadetNames={getCadetNames('tuesday', 'unexcused')}
              colorClass="text-unexcused"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900 mb-2">Wednesday</div>
          <div className="text-xs text-gray-500 mb-3">{formatDateWithDay(weekDates.wednesday)}</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-present">{wednesdayStats.present}</div>
              <div className="text-xs text-gray-600">Present</div>
            </div>
            <StatWithTooltip
              count={wednesdayStats.excused}
              label="Excused"
              cadetNames={getCadetNames('wednesday', 'excused')}
              colorClass="text-excused"
            />
            <StatWithTooltip
              count={wednesdayStats.unexcused}
              label="Unexcused"
              cadetNames={getCadetNames('wednesday', 'unexcused')}
              colorClass="text-unexcused"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900 mb-2">Thursday</div>
          <div className="text-xs text-gray-500 mb-3">{formatDateWithDay(weekDates.thursday)}</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-present">{thursdayStats.present}</div>
              <div className="text-xs text-gray-600">Present</div>
            </div>
            <StatWithTooltip
              count={thursdayStats.excused}
              label="Excused"
              cadetNames={getCadetNames('thursday', 'excused')}
              colorClass="text-excused"
            />
            <StatWithTooltip
              count={thursdayStats.unexcused}
              label="Unexcused"
              cadetNames={getCadetNames('thursday', 'unexcused')}
              colorClass="text-unexcused"
            />
          </div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="mt-6">
        <h3 className="font-semibold text-gray-900 mb-3">Weekly Totals</h3>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-present">{weekStats.present}</div>
              <div className="text-sm text-gray-600">Present</div>
            </div>
            <StatWithTooltip
              count={weekStats.excused}
              label="Excused"
              cadetNames={getWeekCadetNames('excused')}
              colorClass="text-excused"
              size="large"
            />
            <StatWithTooltip
              count={weekStats.unexcused}
              label="Unexcused"
              cadetNames={getWeekCadetNames('unexcused')}
              colorClass="text-unexcused"
              size="large"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatWithTooltipProps {
  count: number;
  label: string;
  cadetNames: Array<{ name: string; count?: number }>;
  colorClass: string;
  size?: 'normal' | 'large';
}

function StatWithTooltip({ count, label, cadetNames, colorClass, size = 'normal' }: StatWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    }

    if (showTooltip) {
      // Use a small delay to avoid immediate closure on click
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showTooltip]);

  if (count === 0) {
    return (
      <div className="text-center">
        <div className={size === 'large' ? 'text-2xl font-bold text-gray-400' : `text-lg font-bold ${colorClass}`}>
          {count}
        </div>
        <div className={size === 'large' ? 'text-sm text-gray-600' : 'text-xs text-gray-600'}>{label}</div>
      </div>
    );
  }

  return (
    <div className="text-center relative" ref={tooltipRef}>
      <div
        className={`${size === 'large' ? 'text-2xl' : 'text-lg'} font-bold ${colorClass} cursor-pointer touch-manipulation`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {count}
      </div>
      <div className={size === 'large' ? 'text-sm text-gray-600' : 'text-xs text-gray-600'}>{label}</div>
      {showTooltip && cadetNames.length > 0 && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
          <div className="font-semibold mb-2 text-white">{label} Cadets:</div>
          <div className="space-y-1">
            {cadetNames.map((item, index) => (
              <div key={index} className="text-white/90">
                {item.name}{item.count !== undefined ? ` (${item.count})` : ''}
              </div>
            ))}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

interface StatusListProps {
  cadetsByLevel: Map<string, Array<{ id: string; name: string; level: string }>>;
  status: 'Excused' | 'Unexcused';
  selectedDay: DayOfWeek | 'week';
  onDayChange: (day: DayOfWeek | 'week') => void;
}

function StatusList({ cadetsByLevel, status, selectedDay, onDayChange }: StatusListProps) {
  const levels = Array.from(cadetsByLevel.keys()).sort();
  const totalCount = Array.from(cadetsByLevel.values()).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          View by Day/Week
        </label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onDayChange('week')}
            className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
              selectedDay === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onDayChange('tuesday')}
            className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
              selectedDay === 'tuesday'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Tue
          </button>
          <button
            onClick={() => onDayChange('wednesday')}
            className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
              selectedDay === 'wednesday'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Wed
          </button>
          <button
            onClick={() => onDayChange('thursday')}
            className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
              selectedDay === 'thursday'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Thu
          </button>
        </div>
      </div>

      {/* Total count */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
        <div className="text-sm text-gray-600">Total {status}</div>
      </div>

      {/* Lists by level */}
      {levels.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No {status.toLowerCase()} cadets found
        </div>
      ) : (
        levels.map(level => {
          const cadets = cadetsByLevel.get(level)!;
          return (
            <div key={level} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2">
                {level} ({cadets.length})
              </div>
              <div className="space-y-1">
                {cadets.map(cadet => (
                  <div key={cadet.id} className="text-sm text-gray-700 py-1">
                    {cadet.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

