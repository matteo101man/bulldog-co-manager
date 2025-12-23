import { useEffect, useState } from 'react';
import { Cadet, Company, AttendanceStatus, DayOfWeek, AttendanceRecord } from '../types';
import { getCadetsByCompany } from '../services/cadetService';
import { getCompanyAttendance, updateAttendance } from '../services/attendanceService';
import { getCurrentWeekStart, getWeekDates, formatDateWithDay } from '../utils/dates';
import { calculateDayStats, calculateWeekStats, getCadetsByStatusAndLevel } from '../utils/stats';

interface CompanyRosterProps {
  company: Company;
  onBack: () => void;
}

export default function CompanyRoster({ company, onBack }: CompanyRosterProps) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [statsViewMode, setStatsViewMode] = useState<'summary' | 'excused' | 'unexcused'>('summary');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'week'>('week');
  const weekStart = getCurrentWeekStart();
  const weekDates = getWeekDates();

  useEffect(() => {
    loadData();
  }, [company]);

  async function loadData() {
    setLoading(true);
    try {
      const [cadetList, attendance] = await Promise.all([
        getCadetsByCompany(company),
        getCompanyAttendance(company, weekStart)
      ]);
      setCadets(cadetList);
      setAttendanceMap(attendance);
    } catch (error) {
      console.error('Error loading data:', error);
      // Show user-friendly error message
      alert(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check:\n1. Firestore is enabled in Firebase Console\n2. Internet connection is working\n3. Browser console for more details`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(cadetId: string, day: DayOfWeek, status: AttendanceStatus) {
    await updateAttendance(cadetId, day, status, weekStart);
    // Reload to refresh UI
    await loadData();
  }

  // Calculate stats
  const records = Array.from(attendanceMap.values());
  const cadetsMap = new Map(cadets.map(c => [c.id, c]));
  const tuesdayStats = calculateDayStats(records, 'tuesday');
  const wednesdayStats = calculateDayStats(records, 'wednesday');
  const thursdayStats = calculateDayStats(records, 'thursday');
  const weekStats = calculateWeekStats(records);
  const excusedByLevel = getCadetsByStatusAndLevel(records, cadetsMap, selectedDay, 'excused');
  const unexcusedByLevel = getCadetsByStatusAndLevel(records, cadetsMap, selectedDay, 'unexcused');


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
            Change
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
            const record = attendanceMap.get(cadet.id);
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

        {/* Statistics Section */}
        {cadets.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Statistics</h2>
            
            {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                    tuesdayStats={tuesdayStats}
                    wednesdayStats={wednesdayStats}
                    thursdayStats={thursdayStats}
                    weekStats={weekStats}
                    weekDates={weekDates}
                  />
                )}
                {statsViewMode === 'excused' && (
                  <StatusList
                    cadetsByLevel={excusedByLevel}
                    status="Excused"
                    selectedDay={selectedDay}
                    onDayChange={setSelectedDay}
                  />
                )}
                {statsViewMode === 'unexcused' && (
                  <StatusList
                    cadetsByLevel={unexcusedByLevel}
                    status="Unexcused"
                    selectedDay={selectedDay}
                    onDayChange={setSelectedDay}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface CadetRowProps {
  cadet: Cadet;
  attendance: AttendanceRecord | undefined;
  onStatusChange: (cadetId: string, day: DayOfWeek, status: AttendanceStatus) => Promise<void>;
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
          onChange={(e) => onStatusChange(cadet.id, 'tuesday', e.target.value as AttendanceStatus || null)}
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
          onChange={(e) => onStatusChange(cadet.id, 'wednesday', e.target.value as AttendanceStatus || null)}
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
          onChange={(e) => onStatusChange(cadet.id, 'thursday', e.target.value as AttendanceStatus || null)}
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

interface SummaryStatsProps {
  tuesdayStats: { present: number; excused: number; unexcused: number };
  wednesdayStats: { present: number; excused: number; unexcused: number };
  thursdayStats: { present: number; excused: number; unexcused: number };
  weekStats: { present: number; excused: number; unexcused: number };
  weekDates: { tuesday: string; wednesday: string; thursday: string };
}

function SummaryStats({ tuesdayStats, wednesdayStats, thursdayStats, weekStats, weekDates }: SummaryStatsProps) {
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
            <div className="text-center">
              <div className="text-lg font-bold text-excused">{tuesdayStats.excused}</div>
              <div className="text-xs text-gray-600">Excused</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-unexcused">{tuesdayStats.unexcused}</div>
              <div className="text-xs text-gray-600">Unexcused</div>
            </div>
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
            <div className="text-center">
              <div className="text-lg font-bold text-excused">{wednesdayStats.excused}</div>
              <div className="text-xs text-gray-600">Excused</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-unexcused">{wednesdayStats.unexcused}</div>
              <div className="text-xs text-gray-600">Unexcused</div>
            </div>
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
            <div className="text-center">
              <div className="text-lg font-bold text-excused">{thursdayStats.excused}</div>
              <div className="text-xs text-gray-600">Excused</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-unexcused">{thursdayStats.unexcused}</div>
              <div className="text-xs text-gray-600">Unexcused</div>
            </div>
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
            <div>
              <div className="text-2xl font-bold text-excused">{weekStats.excused}</div>
              <div className="text-sm text-gray-600">Excused</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-unexcused">{weekStats.unexcused}</div>
              <div className="text-sm text-gray-600">Unexcused</div>
            </div>
          </div>
        </div>
      </div>
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

