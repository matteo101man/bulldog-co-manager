import { useEffect, useState } from 'react';
import { Company, DayOfWeek, PTPlan } from '../types';
import { getPTPlansForWeek, savePTPlan, getAllPTPlans, getGenericPTPlans, deleteGenericPTPlan, deletePTPlan, deletePTPlanById } from '../services/ptPlanService';
import { getCurrentWeekStart, getWeekStartByOffset, getWeekDatesForWeek, formatDateWithDay, formatDateWithOrdinal, formatDateFullWithOrdinal } from '../utils/dates';

interface PTPlansProps {
  onBack: () => void;
  onSelectCompany?: (company: Company) => void;
  selectedCompany?: Company | null;
}

const COMPANIES: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Grizzly Company', 'Battalion'];

// Special week: week starting January 19, 2026 (January 19th is a Monday)
const SPECIAL_WEEK_START = '2026-01-19';

function getDaysForCompany(company: Company, weekStartDate?: string): DayOfWeek[] {
  // Special handling for the week starting January 19, 2026
  const isSpecialWeek = weekStartDate === SPECIAL_WEEK_START;
  
  if (company === 'Battalion') {
    // Battalion PT moves to Tuesday for special week
    return isSpecialWeek ? ['tuesday'] : ['wednesday'];
  }
  if (company === 'Ranger') {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }
  if (company === 'Grizzly Company') {
    // Grizzly Company always has their own PT, never Battalion PT
    return ['tuesday', 'wednesday', 'thursday'];
  }
  // For other companies: during special week, they get Tuesday (read-only Battalion), Wednesday, and Thursday
  return isSpecialWeek ? ['tuesday', 'wednesday', 'thursday'] : ['tuesday', 'wednesday', 'thursday'];
}

export default function PTPlans({ onBack, onSelectCompany, selectedCompany }: PTPlansProps) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(selectedCompany || null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getCurrentWeekStart());
  const [plans, setPlans] = useState<Map<DayOfWeek, PTPlan>>(new Map());
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<{ company: Company; weekStartDate: string; day: DayOfWeek } | null>(null);
  const [showGenericPlans, setShowGenericPlans] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<DayOfWeek>>(new Set());

  useEffect(() => {
    if (selectedCompany && selectedCompany !== currentCompany) {
      setCurrentCompany(selectedCompany);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (currentCompany) {
      loadPlans();
    }
  }, [currentCompany, currentWeekStart]);

  async function loadPlans() {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const plansMap = await getPTPlansForWeek(currentCompany, currentWeekStart);
      const isSpecialWeek = currentWeekStart === SPECIAL_WEEK_START;
      
      // For non-Battalion companies, load Battalion plan for the appropriate day
      if (currentCompany !== 'Battalion') {
        const battalionPlans = await getPTPlansForWeek('Battalion', currentWeekStart);
        
        if (isSpecialWeek) {
          // Special week: load Battalion Tuesday plan for Tuesday (read-only for companies)
          const battalionTuesdayPlan = battalionPlans.get('tuesday');
          if (battalionTuesdayPlan) {
            plansMap.set('tuesday', battalionTuesdayPlan);
          }
        } else {
          // Normal week: load Battalion Wednesday plan for Wednesday
          const battalionWednesdayPlan = battalionPlans.get('wednesday');
          if (battalionWednesdayPlan && getDaysForCompany(currentCompany, currentWeekStart).includes('wednesday')) {
            plansMap.set('wednesday', battalionWednesdayPlan);
          }
        }
      }
      
      setPlans(plansMap);
    } catch (error) {
      console.error('Error loading PT plans:', error);
      alert(`Error loading PT plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  function handlePreviousWeek() {
    const previousWeek = getWeekStartByOffset(currentWeekStart, -1);
    setCurrentWeekStart(previousWeek);
  }

  function handleNextWeek() {
    const nextWeek = getWeekStartByOffset(currentWeekStart, 1);
    setCurrentWeekStart(nextWeek);
  }

  function handleCurrentWeek() {
    setCurrentWeekStart(getCurrentWeekStart());
  }

  if (showGenericPlans) {
    return (
      <GenericPlansView
        onBack={() => setShowGenericPlans(false)}
      />
    );
  }

  if (!currentCompany) {
    return (
      <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              PT Plans
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
          <p className="text-center text-gray-600 mb-6">
            Select a company to view PT plans
          </p>
          <div className="space-y-3">
            {COMPANIES.map((company) => (
              <button
                key={company}
                onClick={() => {
                  setCurrentCompany(company);
                  if (onSelectCompany) {
                    onSelectCompany(company);
                  }
                }}
                className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                <span className="text-lg font-semibold text-gray-900">
                  {company === 'Battalion' ? 'Battalion' : company.endsWith('Company') ? company : `${company} Company`}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowGenericPlans(true)}
            className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation mt-4"
            style={{ minHeight: '44px' }}
          >
            <span className="text-lg font-semibold text-gray-900">
              All Plans
            </span>
          </button>
        </main>
      </div>
    );
  }

  const weekDates = getWeekDatesForWeek(currentWeekStart);
  const currentWeek = getCurrentWeekStart();
  const isCurrentWeek = currentWeekStart === currentWeek;

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            PT Plans - {currentCompany}
          </h1>
          <button
            onClick={() => setCurrentCompany(null)}
            className="text-sm text-blue-600 font-medium touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Back
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Week Navigation */}
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

        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading...</div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            {getDaysForCompany(currentCompany, currentWeekStart).map((day) => {
              const plan = plans.get(day);
              const date = weekDates[day];
              const isSpecialWeek = currentWeekStart === SPECIAL_WEEK_START;
              
              // Check if this is a Battalion-managed day for a non-Battalion company (read-only)
              // Special week: Tuesday is Battalion day; Normal week: Wednesday is Battalion day
              const isReadOnly = currentCompany !== 'Battalion' && (
                (isSpecialWeek && day === 'tuesday') || 
                (!isSpecialWeek && day === 'wednesday')
              );
              const isBattalionPlan = isReadOnly && plan?.company === 'Battalion';
              
              return (
                <PTPlanCard
                  key={day}
                  company={currentCompany}
                  weekStartDate={currentWeekStart}
                  day={day}
                  date={date}
                  plan={plan}
                  isReadOnly={isReadOnly}
                  isBattalionPlan={isBattalionPlan}
                  onEdit={() => {
                    if (!isReadOnly) {
                      setEditingPlan({ company: currentCompany, weekStartDate: currentWeekStart, day });
                    }
                  }}
                  onSave={async (planData) => {
                    if (isReadOnly) return; // Should not be called, but safety check
                    // Save the plan to the company/week/day (so it shows in company view)
                    await savePTPlan({
                      company: currentCompany,
                      weekStartDate: currentWeekStart,
                      day,
                      ...planData,
                    });
                    
                    await loadPlans();
                    setEditingPlan(null);
                  }}
                  onCancel={() => setEditingPlan(null)}
                  onNoPT={async () => {
                    if (isReadOnly) return; // Should not be called, but safety check
                    await savePTPlan({
                      company: currentCompany,
                      weekStartDate: currentWeekStart,
                      day,
                      title: 'No PT',
                      firstFormation: '',
                      workouts: '',
                      location: '',
                      uniform: 'Summer PTs',
                    });
                    await loadPlans();
                  }}
                  onDelete={async () => {
                    if (isReadOnly || !plan) return; // Should not be called, but safety check
                    if (!confirm('Are you sure you want to delete this plan?')) return;
                    
                    // Delete from current company/week/day
                    await deletePTPlan(currentCompany, currentWeekStart, day);
                    
                    // Check for duplicates in All Plans
                    const allPlans = await getAllPTPlans();
                    const duplicatePlans = allPlans.filter(p => 
                      p.id !== plan.id &&
                      !p.isGeneric &&
                      p.title === plan.title &&
                      p.firstFormation === plan.firstFormation &&
                      p.workouts === plan.workouts &&
                      p.location === plan.location
                    );
                    
                    // If no duplicates exist, delete all plans with same content
                    if (duplicatePlans.length === 0) {
                      const plansWithSameContent = allPlans.filter(p =>
                        p.title === plan.title &&
                        p.firstFormation === plan.firstFormation &&
                        p.workouts === plan.workouts &&
                        p.location === plan.location
                      );
                      // Delete all plans with the same content
                      for (const p of plansWithSameContent) {
                        await deletePTPlanById(p.id);
                      }
                    }
                    
                    await loadPlans();
                  }}
                  isEditing={!isReadOnly && editingPlan?.company === currentCompany && editingPlan?.weekStartDate === currentWeekStart && editingPlan?.day === day}
                  isExpanded={expandedDays.has(day)}
                  onToggleExpand={() => {
                    const newExpanded = new Set(expandedDays);
                    if (newExpanded.has(day)) {
                      newExpanded.delete(day);
                    } else {
                      newExpanded.add(day);
                    }
                    setExpandedDays(newExpanded);
                  }}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

interface PTPlanCardProps {
  company: Company;
  weekStartDate: string;
  day: DayOfWeek;
  date: string;
  plan: PTPlan | undefined;
  isReadOnly?: boolean;
  isBattalionPlan?: boolean;
  onEdit: () => void;
  onSave: (planData: { title: string; firstFormation: string; workouts: string; location: string; uniform: string }) => Promise<void>;
  onCancel: () => void;
  onNoPT: () => Promise<void>;
  onDelete: () => Promise<void>;
  isEditing: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function PTPlanCard({ day, date, plan, isReadOnly = false, isBattalionPlan = false, onEdit, onSave, onCancel, onDelete, onNoPT, isEditing, isExpanded = false, onToggleExpand }: PTPlanCardProps) {
  const [title, setTitle] = useState(plan?.title || '');
  const [firstFormation, setFirstFormation] = useState(plan?.firstFormation || '0600');
  const [workouts, setWorkouts] = useState(plan?.workouts || '');
  const [location, setLocation] = useState(plan?.location || '');
  const [uniform, setUniform] = useState(plan?.uniform || 'Summer PTs');
  const [saving, setSaving] = useState(false);
  const [allPlans, setAllPlans] = useState<PTPlan[]>([]);
  const [loadingAllPlans, setLoadingAllPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [originalValues, setOriginalValues] = useState<{ title: string; firstFormation: string; workouts: string; location: string; uniform: string } | null>(null);

  useEffect(() => {
    if (plan) {
      setTitle(plan.title);
      setFirstFormation(plan.firstFormation);
      setWorkouts(plan.workouts);
      setLocation(plan.location);
      setUniform(plan.uniform || 'Summer PTs');
    } else {
      setTitle('');
      setFirstFormation('0600');
      setWorkouts('');
      setLocation('');
      setUniform('Summer PTs');
    }
    setSelectedPlanId('');
    // Store original values when editing starts
    if (isEditing) {
      setOriginalValues({
        title: plan?.title || '',
        firstFormation: plan?.firstFormation || '0600',
        workouts: plan?.workouts || '',
        location: plan?.location || '',
        uniform: plan?.uniform || 'Summer PTs',
      });
    } else {
      setOriginalValues(null);
    }
  }, [plan, isEditing]);

  useEffect(() => {
    if (isEditing && allPlans.length === 0) {
      loadAllPlans();
    }
  }, [isEditing]);

  async function loadAllPlans() {
    setLoadingAllPlans(true);
    try {
      const plans = await getAllPTPlans();
      
      // Deduplicate plans with same content - keep only one instance of each unique plan
      const seenPlans = new Map<string, PTPlan>();
      const deduplicatedPlans: PTPlan[] = [];
      
      for (const plan of plans) {
        // Skip "No PT" plans - they shouldn't appear in the dropdown
        if (plan.title === 'No PT') {
          continue;
        }
        
        // Create a key based on plan content (for non-generic plans)
        if (!plan.isGeneric && plan.company && plan.weekStartDate && plan.day) {
          const contentKey = `${plan.title}|${plan.firstFormation}|${plan.workouts}|${plan.location}`;
          if (!seenPlans.has(contentKey)) {
            seenPlans.set(contentKey, plan);
            deduplicatedPlans.push(plan);
          }
        } else {
          // Generic plans - keep all (they're already unique by design)
          deduplicatedPlans.push(plan);
        }
      }
      
      // Sort by weekStartDate descending (most recent first), then by company
      // Generic plans (without weekStartDate) go to the end
      deduplicatedPlans.sort((a, b) => {
        // Generic plans go to the end
        if (a.isGeneric && !b.isGeneric) return 1;
        if (!a.isGeneric && b.isGeneric) return -1;
        if (a.isGeneric && b.isGeneric) {
          // Both generic - sort by title
          return a.title.localeCompare(b.title);
        }
        // Both non-generic - sort by date then company
        const dateCompare = (b.weekStartDate || '').localeCompare(a.weekStartDate || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.company || '').localeCompare(b.company || '');
      });
      setAllPlans(deduplicatedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      alert(`Error loading plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingAllPlans(false);
    }
  }

  function handlePlanSelect(planId: string) {
    if (!planId) return;
    const selectedPlan = allPlans.find(p => p.id === planId);
    if (selectedPlan) {
      setTitle(selectedPlan.title);
      setFirstFormation(selectedPlan.firstFormation);
      setWorkouts(selectedPlan.workouts);
      setLocation(selectedPlan.location);
      setUniform(selectedPlan.uniform || 'Summer PTs');
      // Don't update originalValues - keep the original plan values for comparison
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Please enter a title for the workout');
      return;
    }
    
    if (!uniform.trim()) {
      alert('Please enter a uniform');
      return;
    }
    
    // Check if values have changed from original
    if (originalValues) {
      const hasChanges = 
        title !== originalValues.title ||
        firstFormation !== originalValues.firstFormation ||
        workouts !== originalValues.workouts ||
        location !== originalValues.location ||
        uniform !== originalValues.uniform;
      
      if (!hasChanges) {
        // No changes made, just close the editor without saving
        onCancel();
        return;
      }
    }
    
    setSaving(true);
    try {
      await onSave({ title, firstFormation, workouts, location, uniform });
    } catch (error) {
      console.error('Error saving plan:', error);
      alert(`Error saving plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  const dayName = day.charAt(0).toUpperCase() + day.slice(1);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{dayName}</h3>
          <p className="text-sm text-gray-600">{formatDateWithDay(date)}</p>
          {isReadOnly && isBattalionPlan && (
            <p className="text-xs text-blue-600 mt-1 font-medium">Battalion Plan (Read-Only)</p>
          )}
        </div>
        {!isEditing && onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation ml-2"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workout Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Cardio & Strength"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Formation
            </label>
            <input
              type="text"
              value={firstFormation}
              onChange={(e) => setFirstFormation(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workouts
            </label>
            <textarea
              value={workouts}
              onChange={(e) => setWorkouts(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the workout activities..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Main Field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uniform *
            </label>
            <input
              type="text"
              value={uniform}
              onChange={(e) => setUniform(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Summer PTs"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Load Plan
            </label>
            {loadingAllPlans ? (
              <div className="text-sm text-gray-600 py-2">Loading plans...</div>
            ) : (
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  handlePlanSelect(e.target.value);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a plan to load...</option>
                {allPlans
                  .filter(plan => !plan.isGeneric && plan.company && plan.weekStartDate && plan.day) // Only show non-generic plans with all required fields
                  .map((plan) => {
                    const weekDates = getWeekDatesForWeek(plan.weekStartDate!);
                    const planDate = weekDates[plan.day!];
                    return (
                      <option key={plan.id} value={plan.id}>
                        {plan.title} ({plan.company}/{formatDateFullWithOrdinal(planDate)})
                      </option>
                    );
                  })}
                {allPlans
                  .filter(plan => plan.isGeneric)
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} (Generic Plan)
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !uniform.trim()}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium text-white touch-manipulation ${
                saving || !title.trim() || !uniform.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {plan ? (
            <>
              {isExpanded ? (
                <div className="space-y-2 pt-3 border-t border-gray-200">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Title: </span>
                    <span className="text-sm text-gray-900">{plan.title}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">First Formation: </span>
                    <span className="text-sm text-gray-900">{plan.firstFormation}</span>
                  </div>
                  {plan.workouts && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Workouts: </span>
                      <div className="text-sm text-gray-900 whitespace-pre-wrap mt-1">{plan.workouts}</div>
                    </div>
                  )}
                  {plan.location && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Location: </span>
                      <span className="text-sm text-gray-900">{plan.location}</span>
                    </div>
                  )}
                  {plan.uniform && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Uniform: </span>
                      <span className="text-sm text-gray-900">{plan.uniform}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-900">{plan.title}</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 italic pt-3 border-t border-gray-200">No plan created yet</div>
          )}
          {!isReadOnly && (
            <div className="mt-3 space-y-2">
              <button
                onClick={onEdit}
                className="w-full py-2 px-4 rounded-md text-sm font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 active:bg-blue-100 touch-manipulation"
              >
                {plan ? 'Edit Plan' : 'Create Plan'}
              </button>
              <button
                onClick={onNoPT}
                className="w-full py-2 px-4 rounded-md text-sm font-medium text-red-600 border border-red-600 hover:bg-red-50 active:bg-red-100 touch-manipulation"
              >
                No PT
              </button>
              {plan && (
                <button
                  onClick={onDelete}
                  className="w-full py-2 px-4 rounded-md text-sm font-medium text-red-600 border border-red-600 hover:bg-red-50 active:bg-red-100 touch-manipulation"
                >
                  Delete Plan
                </button>
              )}
            </div>
          )}
          {isReadOnly && (
            <div className="mt-3">
              <div className="text-sm text-gray-500 italic text-center py-2">
                This plan is managed by Battalion and cannot be edited here.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface GenericPlansViewProps {
  onBack: () => void;
}

function GenericPlansView({ onBack }: GenericPlansViewProps) {
  const [plans, setPlans] = useState<PTPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PTPlan | null>(null);
  const [title, setTitle] = useState('');
  const [firstFormation, setFirstFormation] = useState('0600');
  const [workouts, setWorkouts] = useState('');
  const [location, setLocation] = useState('');
  const [uniform, setUniform] = useState('Summer PTs');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const allPlans = await getAllPTPlans();
      
      // Deduplicate plans with same content - keep only one instance of each unique plan
      const seenPlans = new Map<string, PTPlan>();
      const deduplicatedPlans: PTPlan[] = [];
      
      for (const plan of allPlans) {
        // Skip "No PT" plans - they shouldn't appear in All Plans
        if (plan.title === 'No PT') {
          continue;
        }
        
        // Create a key based on plan content (for non-generic plans)
        if (!plan.isGeneric && plan.company && plan.weekStartDate && plan.day) {
          const contentKey = `${plan.title}|${plan.firstFormation}|${plan.workouts}|${plan.location}`;
          if (!seenPlans.has(contentKey)) {
            seenPlans.set(contentKey, plan);
            deduplicatedPlans.push(plan);
          }
        } else {
          // Generic plans - keep all (they're already unique by design)
          deduplicatedPlans.push(plan);
        }
      }
      
      // Sort chronologically: plans with dates first (newest first), then generic plans
      deduplicatedPlans.sort((a, b) => {
        const aHasDate = !a.isGeneric && a.weekStartDate;
        const bHasDate = !b.isGeneric && b.weekStartDate;
        
        // Plans with dates come before plans without dates
        if (aHasDate && !bHasDate) return -1;
        if (!aHasDate && bHasDate) return 1;
        
        // Both have dates - sort chronologically (newest first)
        if (aHasDate && bHasDate) {
          const dateCompare = (b.weekStartDate || '').localeCompare(a.weekStartDate || '');
          if (dateCompare !== 0) return dateCompare;
          // If same date, sort by company
          return (a.company || '').localeCompare(b.company || '');
        }
        
        // Both don't have dates (generic plans) - sort by title
        return a.title.localeCompare(b.title);
      });
      setPlans(deduplicatedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      alert(`Error loading plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(plan: PTPlan) {
    setEditingPlan(plan);
    setTitle(plan.title);
    setFirstFormation(plan.firstFormation);
    setWorkouts(plan.workouts);
    setLocation(plan.location);
    setUniform(plan.uniform || 'Summer PTs');
    setShowAddForm(true);
  }

  function handleCancel() {
    setShowAddForm(false);
    setEditingPlan(null);
    setTitle('');
    setFirstFormation('0600');
    setWorkouts('');
    setLocation('');
    setUniform('Summer PTs');
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Please enter a title for the workout');
      return;
    }
    if (!uniform.trim()) {
      alert('Please enter a uniform');
      return;
    }
    setSaving(true);
    try {
      // If editing an existing plan, preserve its type and properties
      if (editingPlan) {
        await savePTPlan({
          id: editingPlan.id,
          isGeneric: editingPlan.isGeneric || false,
          company: editingPlan.company,
          weekStartDate: editingPlan.weekStartDate,
          day: editingPlan.day,
          title,
          firstFormation,
          workouts,
          location,
          uniform,
        });
      } else {
        // New plan - create as generic
        await savePTPlan({
          isGeneric: true,
          title,
          firstFormation,
          workouts,
          location,
          uniform,
        });
      }
      await loadPlans();
      handleCancel();
    } catch (error) {
      console.error('Error saving plan:', error);
      alert(`Error saving plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: PTPlan) {
    if (!confirm('Are you sure you want to delete this plan?')) {
      return;
    }
    setDeletingId(plan.id);
    try {
      if (plan.isGeneric) {
        await deleteGenericPTPlan(plan.id);
      } else {
        if (!plan.company || !plan.weekStartDate || !plan.day) {
          throw new Error('Cannot delete plan: missing required fields');
        }
        await deletePTPlan(plan.company, plan.weekStartDate, plan.day);
      }
      await loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert(`Error deleting plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            PT Plans
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
        {!showAddForm ? (
          <>
            <button
              onClick={() => {
                setEditingPlan(null);
                setTitle('');
                setFirstFormation('0600');
                setWorkouts('');
                setLocation('');
                setUniform('Summer PTs');
                setShowAddForm(true);
              }}
              className="w-full mb-4 py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              Add New Plan
            </button>

            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading...</div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No plans yet. Click "Add New Plan" to create one.
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => {
                  let planInfo = '';
                  if (plan.isGeneric) {
                    planInfo = 'Generic Plan';
                  } else if (plan.company && plan.weekStartDate && plan.day) {
                    const weekDates = getWeekDatesForWeek(plan.weekStartDate);
                    const planDate = weekDates[plan.day];
                    planInfo = `${plan.company} - ${formatDateFullWithOrdinal(planDate)}`;
                  }
                  const isExpanded = expandedPlans.has(plan.id);
                  
                  return (
                    <div
                      key={plan.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{plan.title}</h3>
                          {planInfo && (
                            <p className="text-sm text-gray-600 mt-1">{planInfo}</p>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedPlans);
                              if (isExpanded) {
                                newExpanded.delete(plan.id);
                              } else {
                                newExpanded.add(plan.id);
                              }
                              setExpandedPlans(newExpanded);
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(plan)}
                            className="text-sm text-blue-600 hover:text-blue-700 touch-manipulation"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(plan)}
                            disabled={deletingId === plan.id}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 touch-manipulation"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            {deletingId === plan.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-gray-200">
                          <div>
                            <span className="text-sm font-medium text-gray-700">First Formation: </span>
                            <span className="text-sm text-gray-900">{plan.firstFormation}</span>
                          </div>
                          {plan.workouts && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Workouts: </span>
                              <div className="text-sm text-gray-900 whitespace-pre-wrap mt-1">{plan.workouts}</div>
                            </div>
                          )}
                          {plan.location && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Location: </span>
                              <span className="text-sm text-gray-900">{plan.location}</span>
                            </div>
                          )}
                          {plan.uniform && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Uniform: </span>
                              <span className="text-sm text-gray-900">{plan.uniform}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPlan ? 'Edit Plan' : 'Add New Plan'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workout Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Field Circuit Training"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Formation
                </label>
                <input
                  type="text"
                  value={firstFormation}
                  onChange={(e) => setFirstFormation(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workouts
                </label>
                <textarea
                  value={workouts}
                  onChange={(e) => setWorkouts(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the workout activities..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Main Field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uniform *
                </label>
                <input
                  type="text"
                  value={uniform}
                  onChange={(e) => setUniform(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Summer PTs"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim() || !uniform.trim()}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium text-white touch-manipulation ${
                    saving || !title.trim() || !uniform.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

