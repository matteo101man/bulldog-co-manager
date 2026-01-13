import { useEffect, useState, useRef } from 'react';
import { Cadet, Company, AttendanceStatus, DayOfWeek, AttendanceRecord, AttendanceType } from '../types';
import { getCadetsByCompany, subscribeToCadets } from '../services/cadetService';
import { getCompanyAttendance, updateAttendance, updateAttendanceRecord, getAllAttendanceForWeek, subscribeToCompanyAttendance, batchUpdateAttendanceRecords } from '../services/attendanceService';
import { getCurrentWeekStart, getWeekDates, formatDateWithDay, getWeekStartByOffset, getWeekDatesForWeek, formatDateWithOrdinal, getCurrentDateStringEST } from '../utils/dates';
import { getTotalUnexcusedAbsencesForCadets } from '../services/attendanceService';
import { calculateDayStats, calculateWeekStats, getCadetsByStatusAndLevel } from '../utils/stats';

interface CompanyRosterProps {
  company: Company;
  onBack: () => void;
  onSelectCadet?: (cadetId: string) => void;
}

export default function CompanyRoster({ company, onBack, onSelectCadet }: CompanyRosterProps) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [localAttendanceMap, setLocalAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'week'>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getCurrentWeekStart());
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('PT');
  const [unexcusedTotalsPT, setUnexcusedTotalsPT] = useState<Map<string, number>>(new Map());
  const [unexcusedTotalsLab, setUnexcusedTotalsLab] = useState<Map<string, number>>(new Map());
  const [contextMenu, setContextMenu] = useState<{ day: DayOfWeek; type: AttendanceType; x: number; y: number } | null>(null);
  const weekDates = getWeekDatesForWeek(currentWeekStart);
  
  // Determine if we should show Monday and Friday (Ranger Company PT only)
  const showMondayFriday = company === 'Ranger' && attendanceType === 'PT';

  useEffect(() => {
    setLoading(true);
    
    // Set up real-time listeners for better performance
    const unsubscribeCadets = subscribeToCadets(
      company,
      (updatedCadets) => {
        setCadets(updatedCadets);
        setLoading(false);
      },
      (error) => {
        console.error('Error in cadets subscription:', error);
        // Fallback to one-time fetch
        getCadetsByCompany(company).then(setCadets).catch(err => {
          console.error('Error loading cadets:', err);
          alert(`Error loading data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }).finally(() => setLoading(false));
      }
    );

    const unsubscribeAttendance = subscribeToCompanyAttendance(
      company,
      currentWeekStart,
      (updatedAttendance) => {
        setAttendanceMap(updatedAttendance);
        // Only update local map if there are no unsaved changes
        setLocalAttendanceMap(prev => {
          const hasChanges = JSON.stringify(Array.from(updatedAttendance.entries()).sort()) !== 
                           JSON.stringify(Array.from(prev.entries()).sort());
          // If no changes, update from server; otherwise keep local changes
          return hasChanges ? prev : new Map(updatedAttendance);
        });
        setLoading(false);
      },
      (error) => {
        console.error('Error in attendance subscription:', error);
        // Fallback to one-time fetch
        getCompanyAttendance(company, currentWeekStart).then(attendance => {
          setAttendanceMap(attendance);
          setLocalAttendanceMap(new Map(attendance));
        }).catch(err => {
          console.error('Error loading attendance:', err);
        }).finally(() => setLoading(false));
      }
    );

    // Initial load (will be fast due to cache)
    Promise.all([
      getCadetsByCompany(company),
      getCompanyAttendance(company, currentWeekStart)
    ]).then(([cadetList, attendance]) => {
      setCadets(cadetList);
      setAttendanceMap(attendance);
      setLocalAttendanceMap(new Map(attendance));
      setLoading(false);
    }).catch(error => {
      console.error('Error loading data:', error);
      alert(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check:\n1. Firestore is enabled in Firebase Console\n2. Internet connection is working\n3. Browser console for more details`);
      setLoading(false);
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeCadets();
      unsubscribeAttendance();
    };
  }, [company, currentWeekStart]);

  useEffect(() => {
    // Load unexcused totals when cadets change
    if (cadets.length > 0) {
      loadUnexcusedTotals();
    }
  }, [cadets]);

  async function loadUnexcusedTotals() {
    try {
      const cadetIds = cadets.map(c => c.id);
      const [totalsPT, totalsLab] = await Promise.all([
        getTotalUnexcusedAbsencesForCadets(cadetIds, 'PT'),
        getTotalUnexcusedAbsencesForCadets(cadetIds, 'Lab')
      ]);
      setUnexcusedTotalsPT(totalsPT);
      setUnexcusedTotalsLab(totalsLab);
    } catch (error) {
      console.error('Error loading unexcused totals:', error);
    }
  }

  function handleStatusChange(cadetId: string, day: DayOfWeek, status: AttendanceStatus, type: AttendanceType) {
    // Update local state immediately for real-time UI update
    setLocalAttendanceMap(prev => {
      const newMap = new Map(prev);
      const existingRecord = newMap.get(cadetId) || {
        cadetId,
        ptMonday: null,
        ptTuesday: null,
        ptWednesday: null,
        ptThursday: null,
        ptFriday: null,
        labThursday: null,
        weekStartDate: currentWeekStart
      };
      
      const updatedRecord: AttendanceRecord = {
        ...existingRecord,
        weekStartDate: currentWeekStart
      };
      
      if (type === 'PT') {
        if (day === 'monday') updatedRecord.ptMonday = status || null;
        else if (day === 'tuesday') updatedRecord.ptTuesday = status || null;
        else if (day === 'wednesday') updatedRecord.ptWednesday = status || null;
        else if (day === 'thursday') updatedRecord.ptThursday = status || null;
        else if (day === 'friday') updatedRecord.ptFriday = status || null;
      } else if (type === 'Lab' && day === 'thursday') {
        updatedRecord.labThursday = status || null;
      }
      
      newMap.set(cadetId, updatedRecord);
      return newMap;
    });
  }

  function handleMarkAllForDay(day: DayOfWeek, type: AttendanceType, status: AttendanceStatus) {
    // Mark all cadets in the company with the specified status for the specified day
    setLocalAttendanceMap(prev => {
      const newMap = new Map(prev);
      cadets.forEach(cadet => {
        const existingRecord = newMap.get(cadet.id) || {
          cadetId: cadet.id,
          ptMonday: null,
          ptTuesday: null,
          ptWednesday: null,
          ptThursday: null,
          ptFriday: null,
          labThursday: null,
          weekStartDate: currentWeekStart
        };
        
        const updatedRecord: AttendanceRecord = {
          ...existingRecord,
          weekStartDate: currentWeekStart
        };
        
        if (type === 'PT') {
          if (day === 'monday') updatedRecord.ptMonday = status;
          else if (day === 'tuesday') updatedRecord.ptTuesday = status;
          else if (day === 'wednesday') updatedRecord.ptWednesday = status;
          else if (day === 'thursday') updatedRecord.ptThursday = status;
          else if (day === 'friday') updatedRecord.ptFriday = status;
        } else if (type === 'Lab' && day === 'thursday') {
          updatedRecord.labThursday = status;
        }
        
        newMap.set(cadet.id, updatedRecord);
      });
      return newMap;
    });
  }

  async function handleMarkAllPresent(day: DayOfWeek, type: AttendanceType) {
    handleMarkAllForDay(day, type, 'present');
  }

  async function handleMarkAllExcused(day: DayOfWeek, type: AttendanceType) {
    handleMarkAllForDay(day, type, 'excused');
  }

  async function handleMarkAllUnexcused(day: DayOfWeek, type: AttendanceType) {
    handleMarkAllForDay(day, type, 'unexcused');
  }

  async function handleClearAll(day: DayOfWeek, type: AttendanceType) {
    handleMarkAllForDay(day, type, null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Get all changes (compare localAttendanceMap with attendanceMap)
      const changes: Array<{ cadetId: string; day: DayOfWeek; status: AttendanceStatus; type: AttendanceType }> = [];
      
      localAttendanceMap.forEach((localRecord, cadetId) => {
        const serverRecord = attendanceMap.get(cadetId);
        
        // Check PT changes
        if (localRecord.ptMonday !== (serverRecord?.ptMonday ?? null)) {
          changes.push({ cadetId, day: 'monday', status: localRecord.ptMonday ?? null, type: 'PT' });
        }
        if (localRecord.ptTuesday !== (serverRecord?.ptTuesday ?? null)) {
          changes.push({ cadetId, day: 'tuesday', status: localRecord.ptTuesday, type: 'PT' });
        }
        if (localRecord.ptWednesday !== (serverRecord?.ptWednesday ?? null)) {
          changes.push({ cadetId, day: 'wednesday', status: localRecord.ptWednesday, type: 'PT' });
        }
        if (localRecord.ptThursday !== (serverRecord?.ptThursday ?? null)) {
          changes.push({ cadetId, day: 'thursday', status: localRecord.ptThursday, type: 'PT' });
        }
        if (localRecord.ptFriday !== (serverRecord?.ptFriday ?? null)) {
          changes.push({ cadetId, day: 'friday', status: localRecord.ptFriday ?? null, type: 'PT' });
        }
        
        // Check Lab changes
        if (localRecord.labThursday !== (serverRecord?.labThursday ?? null)) {
          changes.push({ cadetId, day: 'thursday', status: localRecord.labThursday, type: 'Lab' });
        }
      });

      // Also check for records that exist in server but not in local (shouldn't happen, but be safe)
      attendanceMap.forEach((serverRecord, cadetId) => {
        if (!localAttendanceMap.has(cadetId)) {
          // This shouldn't happen, but handle it
          if (serverRecord.ptMonday !== null && serverRecord.ptMonday !== undefined) {
            changes.push({ cadetId, day: 'monday', status: null, type: 'PT' });
          }
          if (serverRecord.ptTuesday !== null) {
            changes.push({ cadetId, day: 'tuesday', status: null, type: 'PT' });
          }
          if (serverRecord.ptWednesday !== null) {
            changes.push({ cadetId, day: 'wednesday', status: null, type: 'PT' });
          }
          if (serverRecord.ptThursday !== null) {
            changes.push({ cadetId, day: 'thursday', status: null, type: 'PT' });
          }
          if (serverRecord.ptFriday !== null && serverRecord.ptFriday !== undefined) {
            changes.push({ cadetId, day: 'friday', status: null, type: 'PT' });
          }
          if (serverRecord.labThursday !== null) {
            changes.push({ cadetId, day: 'thursday', status: null, type: 'Lab' });
          }
        }
      });

      // Group changes by cadet to update each cadet's record once
      const changesByCadet = new Map<string, AttendanceRecord>();
      
      // Initialize with current local state for each cadet that has changes
      changes.forEach(({ cadetId }) => {
        if (!changesByCadet.has(cadetId)) {
          const localRecord = localAttendanceMap.get(cadetId);
          if (localRecord) {
            changesByCadet.set(cadetId, { ...localRecord });
          } else {
            // Create new record if it doesn't exist locally
            changesByCadet.set(cadetId, {
              cadetId,
              weekStartDate: currentWeekStart,
              ptMonday: null,
              ptTuesday: null,
              ptWednesday: null,
              ptThursday: null,
              ptFriday: null,
              labThursday: null
            });
          }
        }
      });
      
      // Save all changes to the database using batch update for better performance
      // This prevents race conditions when updating multiple days for the same cadet
      const recordsToUpdate = Array.from(changesByCadet.values());
      
      // Use batch update for better performance (especially with multiple users)
      if (recordsToUpdate.length > 1) {
        await batchUpdateAttendanceRecords(recordsToUpdate);
      } else if (recordsToUpdate.length === 1) {
        await updateAttendanceRecord(recordsToUpdate[0]);
      }

      // Update the server attendance map to match local
      setAttendanceMap(new Map(localAttendanceMap));
      
      // Reload unexcused totals in case they changed
      await loadUnexcusedTotals();
      
      // Reload data to refresh company stats for Master List
      if (company === 'Master') {
        await loadData();
      }
      
      // Show success feedback
      if (company === 'Master') {
        alert('Attendance saved successfully! Changes will be reflected in all company rosters.');
      } else {
        alert('Attendance saved successfully!');
      }
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
  const mondayStats = showMondayFriday ? calculateDayStats(records, 'monday', attendanceType) : { present: 0, excused: 0, unexcused: 0 };
  const tuesdayStats = attendanceType === 'PT' ? calculateDayStats(records, 'tuesday', attendanceType) : { present: 0, excused: 0, unexcused: 0 };
  const wednesdayStats = attendanceType === 'PT' ? calculateDayStats(records, 'wednesday', attendanceType) : { present: 0, excused: 0, unexcused: 0 };
  const thursdayStats = calculateDayStats(records, 'thursday', attendanceType);
  const fridayStats = showMondayFriday ? calculateDayStats(records, 'friday', attendanceType) : { present: 0, excused: 0, unexcused: 0 };
  const weekStats = calculateWeekStats(records, attendanceType);
  const excusedByLevel = getCadetsByStatusAndLevel(records, cadetsMap, selectedDay, 'excused', attendanceType);
  const unexcusedByLevel = getCadetsByStatusAndLevel(records, cadetsMap, selectedDay, 'unexcused', attendanceType);
  const unexcusedTotals = attendanceType === 'PT' ? unexcusedTotalsPT : unexcusedTotalsLab;
  
  // Get current day statistics (only show if viewing current week)
  const currentDateEST = getCurrentDateStringEST();
  const actualCurrentWeekStart = getCurrentWeekStart();
  const isViewingCurrentWeek = currentWeekStart === actualCurrentWeekStart;
  
  let currentDayName: DayOfWeek | null = null;
  let currentDayDate = '';
  
  if (isViewingCurrentWeek) {
    // Check if current date matches any day in the displayed week
    if (currentDateEST === weekDates.monday) {
      currentDayName = 'monday';
      currentDayDate = weekDates.monday;
    } else if (currentDateEST === weekDates.tuesday) {
      currentDayName = 'tuesday';
      currentDayDate = weekDates.tuesday;
    } else if (currentDateEST === weekDates.wednesday) {
      currentDayName = 'wednesday';
      currentDayDate = weekDates.wednesday;
    } else if (currentDateEST === weekDates.thursday) {
      currentDayName = 'thursday';
      currentDayDate = weekDates.thursday;
    } else if (currentDateEST === weekDates.friday) {
      currentDayName = 'friday';
      currentDayDate = weekDates.friday;
    }
  }
  
  // Calculate current day stats
  let currentDayStats = { present: 0, excused: 0, unexcused: 0, assigned: cadets.length };
  if (currentDayName) {
    currentDayStats = calculateDayStats(records, currentDayName, attendanceType);
    currentDayStats.assigned = cadets.length;
  }
  
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
            {company === 'Master' ? 'Master List' : `${company} Company`}
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
        {/* PT/Lab Tabs */}
        <div className="flex border-b border-gray-200 mb-4 bg-white rounded-t-lg">
          <button
            onClick={() => setAttendanceType('PT')}
            className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
              attendanceType === 'PT'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600'
            }`}
          >
            PT
          </button>
          <button
            onClick={() => setAttendanceType('Lab')}
            className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
              attendanceType === 'Lab'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600'
            }`}
          >
            Lab
          </button>
        </div>

        {/* Week dates header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 overflow-x-auto">
          <div className={`grid gap-2 text-center min-w-full ${
            showMondayFriday ? 'grid-cols-6' : 
            attendanceType === 'PT' ? 'grid-cols-4' : 'grid-cols-2'
          }`}>
            <div className="font-semibold text-gray-700">Name</div>
            {showMondayFriday && (
              <DayHeader
                date={weekDates.monday}
                day="monday"
                attendanceType={attendanceType}
                company={company}
                onContextMenu={(e, day) => {
                  e.preventDefault();
                  setContextMenu({ day, type: attendanceType, x: e.clientX, y: e.clientY });
                }}
              />
            )}
            {attendanceType === 'PT' && (
              <>
                <DayHeader
                  date={weekDates.tuesday}
                  day="tuesday"
                  attendanceType={attendanceType}
                  company={company}
                  onContextMenu={(e, day) => {
                    e.preventDefault();
                    setContextMenu({ day, type: attendanceType, x: e.clientX, y: e.clientY });
                  }}
                />
                <DayHeader
                  date={weekDates.wednesday}
                  day="wednesday"
                  attendanceType={attendanceType}
                  company={company}
                  onContextMenu={(e, day) => {
                    e.preventDefault();
                    setContextMenu({ day, type: attendanceType, x: e.clientX, y: e.clientY });
                  }}
                />
              </>
            )}
            <DayHeader
              date={weekDates.thursday}
              day="thursday"
              attendanceType={attendanceType}
              company={company}
              onContextMenu={(e, day) => {
                e.preventDefault();
                setContextMenu({ day, type: attendanceType, x: e.clientX, y: e.clientY });
              }}
            />
            {showMondayFriday && (
              <DayHeader
                date={weekDates.friday}
                day="friday"
                attendanceType={attendanceType}
                company={company}
                onContextMenu={(e, day) => {
                  e.preventDefault();
                  setContextMenu({ day, type: attendanceType, x: e.clientX, y: e.clientY });
                }}
              />
            )}
          </div>
        </div>
        
        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onMarkAllPresent={() => {
              handleMarkAllPresent(contextMenu.day, contextMenu.type);
              setContextMenu(null);
            }}
            onMarkAllExcused={() => {
              handleMarkAllExcused(contextMenu.day, contextMenu.type);
              setContextMenu(null);
            }}
            onMarkAllUnexcused={() => {
              handleMarkAllUnexcused(contextMenu.day, contextMenu.type);
              setContextMenu(null);
            }}
            onClearAll={() => {
              handleClearAll(contextMenu.day, contextMenu.type);
              setContextMenu(null);
            }}
          />
        )}

        {/* Cadet list */}
        <div className="space-y-2">
          {company === 'Master' ? (
            // Master List: Group by MS level
            (() => {
              const groupedByLevel = new Map<string, Cadet[]>();
              cadets.forEach(cadet => {
                const level = cadet.militaryScienceLevel;
                if (!groupedByLevel.has(level)) {
                  groupedByLevel.set(level, []);
                }
                groupedByLevel.get(level)!.push(cadet);
              });
              
              // Sort levels (MS1, MS2, MS3, MS4)
              const sortedLevels = Array.from(groupedByLevel.keys()).sort((a, b) => {
                const aNum = parseInt(a.replace('MS', ''));
                const bNum = parseInt(b.replace('MS', ''));
                return aNum - bNum;
              });
              
              return sortedLevels.map(level => (
                <div key={level}>
                  <div className="bg-gray-100 border-b-2 border-gray-300 px-4 py-2 mb-2 rounded-t-lg">
                    <h3 className="font-bold text-gray-900 text-sm">{level}</h3>
                  </div>
                  <div className="space-y-2 mb-4">
                    {groupedByLevel.get(level)!.map((cadet) => {
                      const record = localAttendanceMap.get(cadet.id);
                      return (
                        <CadetRow
                          key={cadet.id}
                          cadet={cadet}
                          attendance={record}
                          onStatusChange={handleStatusChange}
                          onSelectCadet={onSelectCadet}
                          attendanceType={attendanceType}
                          company={company}
                          showMondayFriday={showMondayFriday}
                        />
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          ) : (
            // Regular companies: Simple list
            cadets.map((cadet) => {
              const record = localAttendanceMap.get(cadet.id);
              return (
                <CadetRow
                  key={cadet.id}
                  cadet={cadet}
                  attendance={record}
                  onStatusChange={handleStatusChange}
                  onSelectCadet={onSelectCadet}
                  attendanceType={attendanceType}
                  company={company}
                  showMondayFriday={showMondayFriday}
                />
              );
            })
          )}
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

        {/* Today's Attendance */}
        {cadets.length > 0 && currentDayName && currentDayDate && (
          <div className="mb-4 bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Today's Attendance ({formatDateWithDay(currentDayDate)})</div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900">{currentDayStats.assigned}</div>
                <div className="text-xs text-gray-600">Assigned</div>
              </div>
              <div>
                <div className="text-lg font-bold text-present">{currentDayStats.present}</div>
                <div className="text-xs text-gray-600">Present</div>
              </div>
              <div>
                <div className="text-lg font-bold text-excused">{currentDayStats.excused}</div>
                <div className="text-xs text-gray-600">Excused</div>
              </div>
              <div>
                <div className="text-lg font-bold text-unexcused">{currentDayStats.unexcused}</div>
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

        {/* Statistics Section */}
        {cadets.length > 0 && (
          <StatisticsSection
            company={company}
            cadets={cadets}
            records={records}
            mondayStats={mondayStats}
            tuesdayStats={tuesdayStats}
            wednesdayStats={wednesdayStats}
            thursdayStats={thursdayStats}
            fridayStats={fridayStats}
            weekStats={weekStats}
            weekDates={weekDates}
            excusedByLevel={excusedByLevel}
            unexcusedByLevel={unexcusedByLevel}
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
            unexcusedTotals={unexcusedTotals}
            currentWeekStart={currentWeekStart}
            onWeekChange={setCurrentWeekStart}
            attendanceType={attendanceType}
            showMondayFriday={showMondayFriday}
          />
        )}
      </main>
    </div>
  );
}

interface CadetRowProps {
  cadet: Cadet;
  attendance: AttendanceRecord | undefined;
  onStatusChange: (cadetId: string, day: DayOfWeek, status: AttendanceStatus, type: AttendanceType) => void;
  onSelectCadet?: (cadetId: string) => void;
  attendanceType: AttendanceType;
}

function CadetRow({ 
  cadet, 
  attendance,
  onStatusChange,
  onSelectCadet,
  attendanceType,
  company,
  showMondayFriday
}: CadetRowProps & { company: Company; showMondayFriday: boolean }) {
  const ptMonday = attendance?.ptMonday ?? null;
  const ptTuesday = attendance?.ptTuesday ?? null;
  const ptWednesday = attendance?.ptWednesday ?? null;
  const ptThursday = attendance?.ptThursday ?? null;
  const ptFriday = attendance?.ptFriday ?? null;
  const labThursday = attendance?.labThursday ?? null;

  function getStatusColor(status: AttendanceStatus): string {
    if (status === 'present') return 'border-present text-present';
    if (status === 'excused') return 'border-excused text-excused';
    if (status === 'unexcused') return 'border-unexcused text-unexcused';
    return 'border-gray-300 text-gray-600';
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className={`grid gap-2 p-3 min-w-full ${
        showMondayFriday ? 'grid-cols-6' : 
        attendanceType === 'PT' ? 'grid-cols-4' : 'grid-cols-2'
      }`}>
        <div className="flex items-center">
          <button
            onClick={() => onSelectCadet?.(cadet.id)}
            className="font-medium text-blue-600 hover:text-blue-800 text-sm text-left touch-manipulation"
          >
            {cadet.lastName}, {cadet.firstName}
          </button>
        </div>
        {showMondayFriday && (
          <select
            value={ptMonday || ''}
            onChange={(e) => {
              const value = e.target.value;
              onStatusChange(cadet.id, 'monday', value === '' ? null : (value as AttendanceStatus), 'PT');
            }}
            aria-label={`${cadet.firstName} ${cadet.lastName} Monday PT attendance`}
            className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(ptMonday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">—</option>
            <option value="present">Present</option>
            <option value="excused">Excused</option>
            <option value="unexcused">Unexcused</option>
          </select>
        )}
        {attendanceType === 'PT' && (
          <>
            <select
              value={ptTuesday || ''}
              onChange={(e) => {
                const value = e.target.value;
                onStatusChange(cadet.id, 'tuesday', value === '' ? null : (value as AttendanceStatus), 'PT');
              }}
              aria-label={`${cadet.firstName} ${cadet.lastName} Tuesday PT attendance`}
              className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(ptTuesday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">—</option>
              <option value="present">Present</option>
              <option value="excused">Excused</option>
              <option value="unexcused">Unexcused</option>
            </select>
            <select
              value={ptWednesday || ''}
              onChange={(e) => {
                const value = e.target.value;
                onStatusChange(cadet.id, 'wednesday', value === '' ? null : (value as AttendanceStatus), 'PT');
              }}
              aria-label={`${cadet.firstName} ${cadet.lastName} Wednesday PT attendance`}
              className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(ptWednesday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">—</option>
              <option value="present">Present</option>
              <option value="excused">Excused</option>
              <option value="unexcused">Unexcused</option>
            </select>
          </>
        )}
        <select
          value={(attendanceType === 'PT' ? ptThursday : labThursday) || ''}
          onChange={(e) => {
            const value = e.target.value;
            onStatusChange(cadet.id, 'thursday', value === '' ? null : (value as AttendanceStatus), attendanceType);
          }}
          aria-label={`${cadet.firstName} ${cadet.lastName} Thursday ${attendanceType} attendance`}
          className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(attendanceType === 'PT' ? ptThursday : labThursday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="">—</option>
          <option value="present">Present</option>
          <option value="excused">Excused</option>
          <option value="unexcused">Unexcused</option>
        </select>
        {showMondayFriday && (
          <select
            value={ptFriday || ''}
            onChange={(e) => {
              const value = e.target.value;
              onStatusChange(cadet.id, 'friday', value === '' ? null : (value as AttendanceStatus), 'PT');
            }}
            aria-label={`${cadet.firstName} ${cadet.lastName} Friday PT attendance`}
            className={`border-2 rounded-md px-2 py-2 text-sm font-medium touch-manipulation min-h-[44px] bg-white ${getStatusColor(ptFriday)} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">—</option>
            <option value="present">Present</option>
            <option value="excused">Excused</option>
            <option value="unexcused">Unexcused</option>
          </select>
        )}
      </div>
    </div>
  );
}

interface StatisticsSectionProps {
  company: Company;
  cadets: Cadet[];
  records: AttendanceRecord[];
  mondayStats: { present: number; excused: number; unexcused: number };
  tuesdayStats: { present: number; excused: number; unexcused: number };
  wednesdayStats: { present: number; excused: number; unexcused: number };
  thursdayStats: { present: number; excused: number; unexcused: number };
  fridayStats: { present: number; excused: number; unexcused: number };
  weekStats: { present: number; excused: number; unexcused: number };
  weekDates: { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string };
  excusedByLevel: Map<string, Array<{ id: string; name: string; level: string }>>;
  unexcusedByLevel: Map<string, Array<{ id: string; name: string; level: string }>>;
  selectedDay: DayOfWeek | 'week';
  onDayChange: (day: DayOfWeek | 'week') => void;
  unexcusedTotals: Map<string, number>;
  currentWeekStart: string;
  onWeekChange: (weekStart: string) => void;
  attendanceType: AttendanceType;
  showMondayFriday: boolean;
}

function StatisticsSection({
  company,
  cadets,
  records,
  mondayStats,
  tuesdayStats,
  wednesdayStats,
  thursdayStats,
  fridayStats,
  weekStats,
  weekDates,
  excusedByLevel,
  unexcusedByLevel,
  selectedDay,
  onDayChange,
  unexcusedTotals,
  currentWeekStart,
  onWeekChange,
  attendanceType,
  showMondayFriday
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
        <h2 className="text-lg font-bold text-gray-900">{attendanceType} Attendance Statistics</h2>
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
                company={company}
                cadets={cadets}
                records={records}
                mondayStats={mondayStats}
                tuesdayStats={tuesdayStats}
                wednesdayStats={wednesdayStats}
                thursdayStats={thursdayStats}
                fridayStats={fridayStats}
                weekStats={weekStats}
                weekDates={weekDates}
                unexcusedTotals={unexcusedTotals}
                currentWeekStart={currentWeekStart}
                attendanceType={attendanceType}
                showMondayFriday={showMondayFriday}
                onRecordsUpdate={async () => {
                  // Reload company stats when records are updated (for Master List)
                  if (company === 'Master') {
                    // This will be handled by the useEffect in SummaryStats
                  }
                }}
              />
            )}
            {statsViewMode === 'excused' && (
              <StatusList
                cadetsByLevel={excusedByLevel}
                status="Excused"
                selectedDay={selectedDay}
                onDayChange={onDayChange}
                attendanceType={attendanceType}
                showMondayFriday={showMondayFriday}
              />
            )}
            {statsViewMode === 'unexcused' && (
              <StatusList
                cadetsByLevel={unexcusedByLevel}
                status="Unexcused"
                selectedDay={selectedDay}
                onDayChange={onDayChange}
                attendanceType={attendanceType}
                showMondayFriday={showMondayFriday}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
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

interface SummaryStatsProps {
  company: Company;
  cadets: Cadet[];
  records: AttendanceRecord[];
  mondayStats: { present: number; excused: number; unexcused: number };
  tuesdayStats: { present: number; excused: number; unexcused: number };
  wednesdayStats: { present: number; excused: number; unexcused: number };
  thursdayStats: { present: number; excused: number; unexcused: number };
  fridayStats: { present: number; excused: number; unexcused: number };
  weekStats: { present: number; excused: number; unexcused: number };
  weekDates: { monday: string; tuesday: string; wednesday: string; thursday: string; friday: string };
  unexcusedTotals: Map<string, number>;
  currentWeekStart: string;
  attendanceType: AttendanceType;
  showMondayFriday: boolean;
}

function SummaryStats({ company, cadets, records, mondayStats, tuesdayStats, wednesdayStats, thursdayStats, fridayStats, weekStats, weekDates, unexcusedTotals, currentWeekStart, attendanceType, showMondayFriday }: SummaryStatsProps) {
  const [companyStats, setCompanyStats] = useState<Map<Company, { tuesday: { present: number; excused: number; unexcused: number }; wednesday: { present: number; excused: number; unexcused: number }; thursday: { present: number; excused: number; unexcused: number } }>>(new Map());
  const cadetsMap = new Map(cadets.map(c => [c.id, c]));

  useEffect(() => {
    if (company === 'Master') {
      loadCompanyStats();
    }
  }, [company, currentWeekStart, records, attendanceType]);

  async function loadCompanyStats() {
    try {
      const allRecords = await getAllAttendanceForWeek(currentWeekStart);
      const allCadets = await Promise.all([
        getCadetsByCompany('Alpha'),
        getCadetsByCompany('Bravo'),
        getCadetsByCompany('Charlie'),
        getCadetsByCompany('Ranger'),
        getCadetsByCompany('Headquarters Company')
      ]);
      
      const statsMap = new Map<Company, { tuesday: { present: number; excused: number; unexcused: number }; wednesday: { present: number; excused: number; unexcused: number }; thursday: { present: number; excused: number; unexcused: number } }>();
      
      (['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Headquarters Company'] as Company[]).forEach((comp, idx) => {
        const compCadets = allCadets[idx];
        const compCadetIds = new Set(compCadets.map(c => c.id));
        
        const tuesday = { present: 0, excused: 0, unexcused: 0 };
        const wednesday = { present: 0, excused: 0, unexcused: 0 };
        const thursday = { present: 0, excused: 0, unexcused: 0 };
        
        // Iterate over all records - Map.entries() gives [key, value] pairs
        // The key is the cadetId (set in getAllAttendanceForWeek)
        for (const [cadetId, record] of allRecords.entries()) {
          // Use the Map key (cadetId) directly since that's what we set it to
          if (compCadetIds.has(cadetId)) {
            if (attendanceType === 'PT') {
              // Use PT fields for Tuesday, Wednesday, Thursday PT attendance
              // Note: Monday and Friday are only for Ranger Company and not shown in Master List stats
              if (record.ptTuesday === 'present') tuesday.present++;
              else if (record.ptTuesday === 'excused') tuesday.excused++;
              else if (record.ptTuesday === 'unexcused') tuesday.unexcused++;
              
              if (record.ptWednesday === 'present') wednesday.present++;
              else if (record.ptWednesday === 'excused') wednesday.excused++;
              else if (record.ptWednesday === 'unexcused') wednesday.unexcused++;
              
              if (record.ptThursday === 'present') thursday.present++;
              else if (record.ptThursday === 'excused') thursday.excused++;
              else if (record.ptThursday === 'unexcused') thursday.unexcused++;
            } else if (attendanceType === 'Lab') {
              // Lab is only on Thursday
              if (record.labThursday === 'present') thursday.present++;
              else if (record.labThursday === 'excused') thursday.excused++;
              else if (record.labThursday === 'unexcused') thursday.unexcused++;
            }
          }
        }
        
        statsMap.set(comp, { tuesday, wednesday, thursday });
      });
      
      setCompanyStats(statsMap);
    } catch (error) {
      console.error('Error loading company stats:', error);
    }
  }

      // Helper function to get cadet names for a specific day and status
  const getCadetNames = (day: DayOfWeek, status: 'excused' | 'unexcused'): Array<{ name: string; count?: number }> => {
    return records
      .filter(record => {
        if (attendanceType === 'PT') {
          if (day === 'monday') return record.ptMonday === status;
          if (day === 'tuesday') return record.ptTuesday === status;
          if (day === 'wednesday') return record.ptWednesday === status;
          if (day === 'thursday') return record.ptThursday === status;
          if (day === 'friday') return record.ptFriday === status;
        } else if (attendanceType === 'Lab' && day === 'thursday') {
          return record.labThursday === status;
        }
        return false;
      })
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
      let hasStatus = false;
      if (attendanceType === 'PT') {
        hasStatus = (record.ptMonday === status) ||
                    (record.ptTuesday === status) || 
                    (record.ptWednesday === status) || 
                    (record.ptThursday === status) ||
                    (record.ptFriday === status);
      } else if (attendanceType === 'Lab') {
        hasStatus = record.labThursday === status;
      }
      
      if (hasStatus) {
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
        
        {showMondayFriday && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="font-semibold text-gray-900 mb-2">Monday</div>
            <div className="text-xs text-gray-500 mb-3">{formatDateWithDay(weekDates.monday)}</div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-present">{mondayStats.present}</div>
                <div className="text-xs text-gray-600">Present</div>
              </div>
              <StatWithTooltip
                count={mondayStats.excused}
                label="Excused"
                cadetNames={getCadetNames('monday', 'excused')}
                colorClass="text-excused"
              />
              <StatWithTooltip
                count={mondayStats.unexcused}
                label="Unexcused"
                cadetNames={getCadetNames('monday', 'unexcused')}
                colorClass="text-unexcused"
              />
            </div>
          </div>
        )}
        
        {attendanceType === 'PT' && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2">Tuesday</div>
              <div className="text-xs text-gray-500 mb-3">{formatDateWithDay(weekDates.tuesday)}</div>
              <div className="grid grid-cols-3 gap-3 mb-3">
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
              {company === 'Master' && companyStats.size > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">By Company:</div>
                  <div className="space-y-2">
                    {Array.from(companyStats.entries()).map(([comp, stats]) => (
                      <div key={comp} className="flex justify-between text-xs">
                        <span className="text-gray-600">{comp}:</span>
                        <span className="text-gray-900">
                          P:{stats.tuesday.present} E:{stats.tuesday.excused} U:{stats.tuesday.unexcused}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2">Wednesday</div>
              <div className="text-xs text-gray-500 mb-3">{formatDateWithDay(weekDates.wednesday)}</div>
              <div className="grid grid-cols-3 gap-3 mb-3">
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
              {company === 'Master' && companyStats.size > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">By Company:</div>
                  <div className="space-y-2">
                    {Array.from(companyStats.entries()).map(([comp, stats]) => (
                      <div key={comp} className="flex justify-between text-xs">
                        <span className="text-gray-600">{comp}:</span>
                        <span className="text-gray-900">
                          P:{stats.wednesday.present} E:{stats.wednesday.excused} U:{stats.wednesday.unexcused}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="font-semibold text-gray-900 mb-2">Thursday</div>
          <div className="text-xs text-gray-500 mb-3">{formatDateWithDay(weekDates.thursday)}</div>
          <div className="grid grid-cols-3 gap-3 mb-3">
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
          {company === 'Master' && companyStats.size > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2">By Company:</div>
              <div className="space-y-2">
                {Array.from(companyStats.entries()).map(([comp, stats]) => (
                  <div key={comp} className="flex justify-between text-xs">
                    <span className="text-gray-600">{comp}:</span>
                    <span className="text-gray-900">
                      P:{stats.thursday.present} E:{stats.thursday.excused} U:{stats.thursday.unexcused}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {showMondayFriday && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="font-semibold text-gray-900 mb-2">Friday</div>
            <div className="text-xs text-gray-500 mb-3">{formatDateWithDay(weekDates.friday)}</div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-present">{fridayStats.present}</div>
                <div className="text-xs text-gray-600">Present</div>
              </div>
              <StatWithTooltip
                count={fridayStats.excused}
                label="Excused"
                cadetNames={getCadetNames('friday', 'excused')}
                colorClass="text-excused"
              />
              <StatWithTooltip
                count={fridayStats.unexcused}
                label="Unexcused"
                cadetNames={getCadetNames('friday', 'unexcused')}
                colorClass="text-unexcused"
              />
            </div>
          </div>
        )}
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
      // Add click outside listener to close tooltip when clicking elsewhere
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
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {count}
      </div>
      <div className={size === 'large' ? 'text-sm text-gray-600' : 'text-xs text-gray-600'}>{label}</div>
      {showTooltip && cadetNames.length > 0 && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-white text-gray-900 text-xs rounded-lg shadow-lg border border-gray-300 p-3 max-h-64 overflow-y-auto">
          <div className="font-semibold mb-2 text-gray-900">{label} Cadets:</div>
          <div className="space-y-1">
            {cadetNames.map((item, index) => (
              <div key={index} className="text-gray-700">
                {item.name}{item.count !== undefined ? ` (${item.count})` : ''}
              </div>
            ))}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
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
  attendanceType: AttendanceType;
  showMondayFriday?: boolean;
}

function StatusList({ cadetsByLevel, status, selectedDay, onDayChange, attendanceType, showMondayFriday = false }: StatusListProps) {
  const levels = Array.from(cadetsByLevel.keys()).sort();
  const totalCount = Array.from(cadetsByLevel.values()).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          View by Day/Week
        </label>
        <div className={`grid gap-2 ${
          showMondayFriday ? 'grid-cols-6' : 
          attendanceType === 'PT' ? 'grid-cols-4' : 'grid-cols-2'
        }`}>
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
          {showMondayFriday && (
            <button
              onClick={() => onDayChange('monday')}
              className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
                selectedDay === 'monday'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              Mon
            </button>
          )}
          {attendanceType === 'PT' && (
            <>
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
            </>
          )}
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
          {showMondayFriday && (
            <button
              onClick={() => onDayChange('friday')}
              className={`py-2 px-3 rounded-md text-sm font-medium touch-manipulation ${
                selectedDay === 'friday'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              Fri
            </button>
          )}
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

interface DayHeaderProps {
  date: string;
  day: DayOfWeek;
  attendanceType: AttendanceType;
  company: Company;
  onContextMenu: (e: React.MouseEvent, day: DayOfWeek) => void;
}

function DayHeader({ date, day, attendanceType, company, onContextMenu }: DayHeaderProps) {
  // Only show context menu for company views (not Master List)
  const showContextMenu = company !== 'Master';
  
  const handleClick = (e: React.MouseEvent) => {
    if (showContextMenu) {
      e.preventDefault();
      onContextMenu(e, day);
    }
  };
  
  return (
    <div
      className={`font-semibold text-gray-700 text-sm ${
        showContextMenu ? 'cursor-pointer hover:bg-gray-50 rounded px-2 py-1 touch-manipulation' : ''
      }`}
      onContextMenu={showContextMenu ? (e) => {
        e.preventDefault();
        onContextMenu(e, day);
      } : undefined}
      onClick={showContextMenu ? handleClick : undefined}
    >
      {formatDateWithDay(date)}
    </div>
  );
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onMarkAllPresent: () => void;
  onMarkAllExcused: () => void;
  onMarkAllUnexcused: () => void;
  onClearAll: () => void;
}

function ContextMenu({ x, y, onClose, onMarkAllPresent, onMarkAllExcused, onMarkAllUnexcused, onClearAll }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Add listener after a short delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[180px]"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
    >
      <button
        onClick={() => {
          onMarkAllPresent();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
      >
        Mark All Present
      </button>
      <button
        onClick={() => {
          onMarkAllExcused();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
      >
        Mark All Excused
      </button>
      <button
        onClick={() => {
          onMarkAllUnexcused();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
      >
        Mark All Unexcused
      </button>
      <div className="border-t border-gray-200 my-1"></div>
      <button
        onClick={() => {
          onClearAll();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
      >
        Clear All
      </button>
    </div>
  );
}

