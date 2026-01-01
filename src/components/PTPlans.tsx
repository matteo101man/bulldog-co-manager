import { useEffect, useState } from 'react';
import { Company, DayOfWeek, PTPlan } from '../types';
import { getPTPlansForWeek, savePTPlan, getAllPTPlans } from '../services/ptPlanService';
import { getCurrentWeekStart, getWeekStartByOffset, getWeekDatesForWeek, formatDateWithDay, formatDateWithOrdinal } from '../utils/dates';

interface PTPlansProps {
  onBack: () => void;
  onSelectCompany?: (company: Company) => void;
  selectedCompany?: Company | null;
}

const COMPANIES: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger'];
const DAYS: DayOfWeek[] = ['tuesday', 'wednesday', 'thursday'];

export default function PTPlans({ onBack, onSelectCompany, selectedCompany }: PTPlansProps) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(selectedCompany || null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getCurrentWeekStart());
  const [plans, setPlans] = useState<Map<DayOfWeek, PTPlan>>(new Map());
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<{ company: Company; weekStartDate: string; day: DayOfWeek } | null>(null);

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
                  {company} Company
                </span>
              </button>
            ))}
          </div>
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
          <div className="space-y-4">
            {DAYS.map((day) => {
              const plan = plans.get(day);
              const date = weekDates[day];
              return (
                <PTPlanCard
                  key={day}
                  company={currentCompany}
                  weekStartDate={currentWeekStart}
                  day={day}
                  date={date}
                  plan={plan}
                  onEdit={() => setEditingPlan({ company: currentCompany, weekStartDate: currentWeekStart, day })}
                  onSave={async (planData) => {
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
                  isEditing={editingPlan?.company === currentCompany && editingPlan?.weekStartDate === currentWeekStart && editingPlan?.day === day}
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
  onEdit: () => void;
  onSave: (planData: { title: string; firstFormation: string; workouts: string; location: string }) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
}

function PTPlanCard({ day, date, plan, onEdit, onSave, onCancel, isEditing }: PTPlanCardProps) {
  const [title, setTitle] = useState(plan?.title || '');
  const [firstFormation, setFirstFormation] = useState(plan?.firstFormation || '0600');
  const [workouts, setWorkouts] = useState(plan?.workouts || '');
  const [location, setLocation] = useState(plan?.location || '');
  const [saving, setSaving] = useState(false);
  const [allPlans, setAllPlans] = useState<PTPlan[]>([]);
  const [loadingAllPlans, setLoadingAllPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  useEffect(() => {
    if (plan) {
      setTitle(plan.title);
      setFirstFormation(plan.firstFormation);
      setWorkouts(plan.workouts);
      setLocation(plan.location);
    } else {
      setTitle('');
      setFirstFormation('0600');
      setWorkouts('');
      setLocation('');
    }
    setSelectedPlanId('');
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
      // Sort by weekStartDate descending (most recent first), then by company
      plans.sort((a, b) => {
        const dateCompare = b.weekStartDate.localeCompare(a.weekStartDate);
        if (dateCompare !== 0) return dateCompare;
        return a.company.localeCompare(b.company);
      });
      setAllPlans(plans);
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
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Please enter a title for the workout');
      return;
    }
    setSaving(true);
    try {
      await onSave({ title, firstFormation, workouts, location });
    } catch (error) {
      console.error('Error saving plan:', error);
      alert(`Error saving plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  const dayName = day.charAt(0).toUpperCase() + day.slice(1);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{dayName}</h3>
        <p className="text-sm text-gray-600">{formatDateWithDay(date)}</p>
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
                {allPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title} - {plan.company} ({plan.day}) - Week of {formatDateWithOrdinal(plan.weekStartDate)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium text-white touch-manipulation ${
                saving || !title.trim()
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
            <div className="space-y-2">
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
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No plan created yet</div>
          )}
          <button
            onClick={onEdit}
            className="mt-3 w-full py-2 px-4 rounded-md text-sm font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 active:bg-blue-100 touch-manipulation"
          >
            {plan ? 'Edit Plan' : 'Create Plan'}
          </button>
        </div>
      )}
    </div>
  );
}

