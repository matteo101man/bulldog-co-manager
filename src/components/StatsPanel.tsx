import React, { useState } from 'react';
import { AttendanceRecord, DayOfWeek, Company } from '../types';
import { calculateDayStats, calculateWeekStats, getCadetsByStatusAndLevel } from '../utils/stats';
import { formatDateWithDay } from '../utils/dates';
import { Cadet } from '../types';

interface StatsPanelProps {
  attendanceMap: Map<string, AttendanceRecord>;
  cadets: Cadet[];
  weekDates: { tuesday: string; wednesday: string; thursday: string };
  company: Company;
  onClose: () => void;
}

export default function StatsPanel({ 
  attendanceMap, 
  cadets, 
  weekDates,
  company,
  onClose 
}: StatsPanelProps) {
  const [viewMode, setViewMode] = useState<'summary' | 'excused' | 'unexcused'>('summary');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'week'>('week');

  const records = Array.from(attendanceMap.values());
  const cadetsMap = new Map(cadets.map(c => [c.id, c]));

  const tuesdayStats = calculateDayStats(records, 'tuesday');
  const wednesdayStats = calculateDayStats(records, 'wednesday');
  const thursdayStats = calculateDayStats(records, 'thursday');
  const weekStats = calculateWeekStats(records);

  const excusedByLevel = getCadetsByStatusAndLevel(
    records,
    cadetsMap,
    selectedDay,
    'excused'
  );
  const unexcusedByLevel = getCadetsByStatusAndLevel(
    records,
    cadetsMap,
    selectedDay,
    'unexcused'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end safe-area-inset">
      <div className="bg-white w-full max-h-[90vh] rounded-t-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between safe-area-inset-top">
          <h2 className="text-xl font-bold">Statistics</h2>
          <button
            onClick={onClose}
            className="text-white font-semibold touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setViewMode('summary')}
            className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
              viewMode === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setViewMode('excused')}
            className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
              viewMode === 'excused'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Excused
          </button>
          <button
            onClick={() => setViewMode('unexcused')}
            className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
              viewMode === 'unexcused'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Unexcused
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe-area-inset-bottom">
          {viewMode === 'summary' && (
            <div className="space-y-4">
              {/* Day selector for excused/unexcused lists */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View by Day/Week
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setSelectedDay('week')}
                    className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
                      selectedDay === 'week'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setSelectedDay('tuesday')}
                    className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
                      selectedDay === 'tuesday'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    Tue
                  </button>
                  <button
                    onClick={() => setSelectedDay('wednesday')}
                    className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
                      selectedDay === 'wednesday'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                    }`}
                  >
                    Wed
                  </button>
                  <button
                    onClick={() => setSelectedDay('thursday')}
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

              {/* Daily Stats */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Daily Statistics</h3>
                
                <StatCard
                  day="Tuesday"
                  date={formatDateWithDay(weekDates.tuesday)}
                  stats={tuesdayStats}
                />
                <StatCard
                  day="Wednesday"
                  date={formatDateWithDay(weekDates.wednesday)}
                  stats={wednesdayStats}
                />
                <StatCard
                  day="Thursday"
                  date={formatDateWithDay(weekDates.thursday)}
                  stats={thursdayStats}
                />
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
          )}

          {viewMode === 'excused' && (
            <CadetListByLevel
              cadetsByLevel={excusedByLevel}
              status="Excused"
              selectedDay={selectedDay}
              onDayChange={setSelectedDay}
            />
          )}

          {viewMode === 'unexcused' && (
            <CadetListByLevel
              cadetsByLevel={unexcusedByLevel}
              status="Unexcused"
              selectedDay={selectedDay}
              onDayChange={setSelectedDay}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  day: string;
  date: string;
  stats: { present: number; excused: number; unexcused: number };
}

function StatCard({ day, date, stats }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="font-semibold text-gray-900 mb-2">{day}</div>
      <div className="text-xs text-gray-500 mb-3">{date}</div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-present">{stats.present}</div>
          <div className="text-xs text-gray-600">Present</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-excused">{stats.excused}</div>
          <div className="text-xs text-gray-600">Excused</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-unexcused">{stats.unexcused}</div>
          <div className="text-xs text-gray-600">Unexcused</div>
        </div>
      </div>
    </div>
  );
}

interface CadetListByLevelProps {
  cadetsByLevel: Map<string, Array<{ id: string; name: string; level: string }>>;
  status: 'Excused' | 'Unexcused';
  selectedDay: DayOfWeek | 'week';
  onDayChange: (day: DayOfWeek | 'week') => void;
}

function CadetListByLevel({ cadetsByLevel, status, selectedDay, onDayChange }: CadetListByLevelProps) {
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

