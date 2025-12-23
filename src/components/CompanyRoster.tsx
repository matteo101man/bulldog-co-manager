import React, { useEffect, useState } from 'react';
import { Cadet, Company, AttendanceStatus, DayOfWeek, AttendanceRecord } from '../types';
import { getCadetsByCompany } from '../services/cadetService';
import { getCompanyAttendance, updateAttendance } from '../services/attendanceService';
import { getCurrentWeekStart, getWeekDates, formatDateWithDay } from '../utils/dates';
import StatsPanel from './StatsPanel';

interface CompanyRosterProps {
  company: Company;
  onBack: () => void;
}

export default function CompanyRoster({ company, onBack }: CompanyRosterProps) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
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

  async function handleStatusClick(cadetId: string, day: DayOfWeek) {
    // Cycle through: null -> present -> excused -> unexcused -> null
    const record = attendanceMap.get(cadetId);
    const currentStatus = record?.[day] ?? null;

    let nextStatus: AttendanceStatus;
    if (currentStatus === null) {
      nextStatus = 'present';
    } else if (currentStatus === 'present') {
      nextStatus = 'excused';
    } else if (currentStatus === 'excused') {
      nextStatus = 'unexcused';
    } else {
      nextStatus = null;
    }

    await updateAttendance(cadetId, day, nextStatus, weekStart);
    // Reload to refresh UI
    await loadData();
  }

  function getStatusColor(status: AttendanceStatus): string {
    if (status === 'present') return 'bg-present';
    if (status === 'excused') return 'bg-excused';
    if (status === 'unexcused') return 'bg-unexcused';
    return 'bg-gray-200';
  }

  function getStatusText(status: AttendanceStatus): string {
    if (status === 'present') return 'P';
    if (status === 'excused') return 'E';
    if (status === 'unexcused') return 'U';
    return '';
  }

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStats(true)}
              className="text-sm text-blue-600 font-medium touch-manipulation"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              Stats
            </button>
            <button
              onClick={onBack}
              className="text-sm text-blue-600 font-medium touch-manipulation"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              Change
            </button>
          </div>
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
                onStatusClick={handleStatusClick}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            );
          })}
        </div>

        {cadets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No cadets found for {company} Company
          </div>
        )}
      </main>

      {showStats && (
        <StatsPanel
          attendanceMap={attendanceMap}
          cadets={cadets}
          weekDates={weekDates}
          company={company}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}

interface CadetRowProps {
  cadet: Cadet;
  attendance: AttendanceRecord | undefined;
  onStatusClick: (cadetId: string, day: DayOfWeek) => Promise<void>;
  getStatusColor: (status: AttendanceStatus) => string;
  getStatusText: (status: AttendanceStatus) => string;
}

function CadetRow({ 
  cadet, 
  attendance,
  onStatusClick,
  getStatusColor,
  getStatusText
}: CadetRowProps) {
  const tuesday = attendance?.tuesday ?? null;
  const wednesday = attendance?.wednesday ?? null;
  const thursday = attendance?.thursday ?? null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-4 gap-2 p-3">
        <div className="flex items-center">
          <span className="font-medium text-gray-900 text-sm">
            {cadet.lastName}, {cadet.firstName}
          </span>
        </div>
        <button
          onClick={() => onStatusClick(cadet.id, 'tuesday')}
          className={`${getStatusColor(tuesday)} rounded-md p-2 text-white font-semibold text-sm touch-manipulation min-h-[44px] flex items-center justify-center transition-opacity active:opacity-70`}
        >
          {getStatusText(tuesday) || '—'}
        </button>
        <button
          onClick={() => onStatusClick(cadet.id, 'wednesday')}
          className={`${getStatusColor(wednesday)} rounded-md p-2 text-white font-semibold text-sm touch-manipulation min-h-[44px] flex items-center justify-center transition-opacity active:opacity-70`}
        >
          {getStatusText(wednesday) || '—'}
        </button>
        <button
          onClick={() => onStatusClick(cadet.id, 'thursday')}
          className={`${getStatusColor(thursday)} rounded-md p-2 text-white font-semibold text-sm touch-manipulation min-h-[44px] flex items-center justify-center transition-opacity active:opacity-70`}
        >
          {getStatusText(thursday) || '—'}
        </button>
      </div>
    </div>
  );
}

