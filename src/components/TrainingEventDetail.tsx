import React, { useState, useEffect } from 'react';
import { 
  getTrainingEventById, 
  updateTrainingEvent 
} from '../services/trainingEventService';
import { getCadetsByCompany } from '../services/cadetService';
import { TrainingEvent, Cadet, PlanningStatus, ConopData } from '../types';

interface TrainingEventDetailProps {
  eventId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export default function TrainingEventDetail({ 
  eventId, 
  onBack, 
  onRefresh 
}: TrainingEventDetailProps) {
  const [event, setEvent] = useState<TrainingEvent | null>(null);
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'conop'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Partial<TrainingEvent>>({});

  useEffect(() => {
    loadData();
  }, [eventId]);

  async function loadData() {
    setLoading(true);
    try {
      const [eventData, cadetsData] = await Promise.all([
        getTrainingEventById(eventId),
        getCadetsByCompany('Master')
      ]);
      if (eventData) {
        setEvent(eventData);
        setEditedEvent(eventData);
      }
      setCadets(cadetsData.sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
      }));
    } catch (error) {
      console.error('Error loading event:', error);
      alert(`Error loading event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!event) return;
    try {
      await updateTrainingEvent(eventId, editedEvent);
      await loadData();
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving event:', error);
      alert(`Error saving event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function getCadetName(cadetId?: string): string {
    if (!cadetId) return '';
    const cadet = cadets.find(c => c.id === cadetId);
    return cadet ? `${cadet.lastName}, ${cadet.firstName}` : '';
  }

  function formatDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day.toString().padStart(2, '0')}${months[month - 1]}${year}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Event not found</div>
      </div>
    );
  }

  const currentData = isEditing ? editedEvent : event;

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedEvent(event);
                  }}
                  className="text-sm text-gray-600 font-medium touch-manipulation"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="text-sm text-blue-600 font-medium touch-manipulation"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 font-medium touch-manipulation"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  Edit
                </button>
                <button
                  onClick={onBack}
                  className="text-sm text-gray-600 font-medium touch-manipulation"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
              activeTab === 'info'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Info
          </button>
          <button
            onClick={() => setActiveTab('conop')}
            className={`flex-1 py-3 text-sm font-medium touch-manipulation ${
              activeTab === 'conop'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            CONOP
          </button>
        </div>
      </div>

      <main className="px-4 py-4">
        {activeTab === 'info' ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEvent.name || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="text-gray-900">{event.name}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedEvent.date || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="text-gray-900">{new Date(event.date).toLocaleDateString()}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OIC</label>
              {isEditing ? (
                <select
                  value={editedEvent.oicId || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, oicId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select OIC</option>
                  {cadets.map(cadet => (
                    <option key={cadet.id} value={cadet.id}>
                      {cadet.lastName}, {cadet.firstName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-900">{getCadetName(event.oicId) || 'Not assigned'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NCOIC</label>
              {isEditing ? (
                <select
                  value={editedEvent.ncoicId || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, ncoicId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select NCOIC</option>
                  {cadets.map(cadet => (
                    <option key={cadet.id} value={cadet.id}>
                      {cadet.lastName}, {cadet.firstName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-900">{getCadetName(event.ncoicId) || 'Not assigned'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AO (Area of Operations)</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEvent.ao || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, ao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="text-gray-900">{event.ao || 'Not specified'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uniform</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEvent.uniform || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, uniform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="text-gray-900">{event.uniform || 'Not specified'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mission</label>
              {isEditing ? (
                <textarea
                  value={editedEvent.mission || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, mission: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="text-gray-900 whitespace-pre-wrap">{event.mission || 'Not specified'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Planning Status</label>
              {isEditing ? (
                <select
                  value={editedEvent.planningStatus || 'in-progress'}
                  onChange={(e) => setEditedEvent({ ...editedEvent, planningStatus: e.target.value as PlanningStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="complete">Complete ✓</option>
                  <option value="in-progress">In Progress ◐</option>
                  <option value="issues">Issues !</option>
                </select>
              ) : (
                <div className="text-gray-900">
                  {event.planningStatus === 'complete' && '✓ Complete'}
                  {event.planningStatus === 'in-progress' && '◐ In Progress'}
                  {event.planningStatus === 'issues' && '! Issues'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ConopTab 
            event={event} 
            editedEvent={editedEvent}
            setEditedEvent={setEditedEvent}
            isEditing={isEditing}
            cadets={cadets}
            formatDate={formatDate}
          />
        )}
      </main>
    </div>
  );
}

interface ConopTabProps {
  event: TrainingEvent;
  editedEvent: Partial<TrainingEvent>;
  setEditedEvent: (event: Partial<TrainingEvent>) => void;
  isEditing: boolean;
  cadets: Cadet[];
  formatDate: (date: string) => string;
}

function ConopTab({ event, editedEvent, setEditedEvent, isEditing, cadets, formatDate }: ConopTabProps) {
  const conop = isEditing ? (editedEvent.conop || {}) : (event.conop || {});
  
  function updateConop(field: keyof ConopData, value: any) {
    setEditedEvent({
      ...editedEvent,
      conop: {
        ...conop,
        [field]: value
      }
    });
  }

  function updateSituation(field: string, value: string) {
    updateConop('situation', {
      ...conop.situation,
      [field]: value
    });
  }

  function updateConceptPhase(phase: string, value: string) {
    updateConop('conceptOfOperation', {
      ...conop.conceptOfOperation,
      [phase]: value
    });
  }

  function updateConceptPhaseLabel(phaseLabel: string, value: string) {
    updateConop('conceptOfOperation', {
      ...conop.conceptOfOperation,
      [phaseLabel]: value
    });
  }

  function updateResources(classNum: string, value: string) {
    updateConop('resources', {
      ...conop.resources,
      [classNum]: value
    });
  }

  function updateCommsPace(type: string, value: string) {
    updateConop('commsPace', {
      ...conop.commsPace,
      [type]: value
    });
  }

  function updateStaffDuty(section: string, value: string) {
    updateConop('staffDuties', {
      ...conop.staffDuties,
      [section]: value
    });
  }

  function updateAttachedAppendix(appendix: string, value: string) {
    updateConop('attachedAppendices', {
      ...conop.attachedAppendices,
      [appendix]: value
    });
  }

  function updateResourceStatus(resource: string, status: PlanningStatus) {
    updateConop('resourceStatus', {
      ...conop.resourceStatus,
      [resource]: status
    });
  }

  function updateWeeklyTask(week: string, value: string) {
    updateConop('weeklyTasks', {
      ...conop.weeklyTasks,
      [week]: value
    });
  }

  return (
    <div className="space-y-4">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Image - AO View */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">AREA OF OPERATIONS</h3>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={conop.imageUrl || ''}
                  onChange={(e) => updateConop('imageUrl', e.target.value)}
                  placeholder="Enter image URL..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {conop.imageUrl && (
                  <img 
                    src={conop.imageUrl} 
                    alt="Area of Operations" 
                    className="w-full h-auto rounded border border-gray-200 max-h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            ) : (
              <div>
                {conop.imageUrl ? (
                  <img 
                    src={conop.imageUrl} 
                    alt="Area of Operations" 
                    className="w-full h-auto rounded border border-gray-200 max-h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                    No image provided
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Purpose */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">PURPOSE (WHY?)</h3>
            {isEditing ? (
              <textarea
                value={conop.purpose || ''}
                onChange={(e) => updateConop('purpose', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter purpose..."
              />
            ) : (
              <div className="text-gray-700 min-h-[60px]">{conop.purpose || ''}</div>
            )}
          </div>

      {/* Mission */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-2">MISSION (WHO, WHAT, WHEN, & WHERE?, AKA MISSION STATEMENT)</h3>
        <p className="text-xs text-gray-600 mb-2">Include alt. location & time</p>
        {isEditing ? (
          <textarea
            value={conop.mission || ''}
            onChange={(e) => updateConop('mission', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter mission statement..."
          />
        ) : (
          <div className="text-gray-700 min-h-[60px]">{conop.mission || ''}</div>
        )}
      </div>

      {/* Situation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-2">SITUATION</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">OIC:</label>
            {isEditing ? (
              <select
                value={conop.situation?.oic || ''}
                onChange={(e) => updateSituation('oic', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                {cadets.map(c => (
                  <option key={c.id} value={`${c.lastName}, ${c.firstName}`}>
                    {c.lastName}, {c.firstName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-700">{conop.situation?.oic || ''}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">NCOIC:</label>
            {isEditing ? (
              <select
                value={conop.situation?.ncoic || ''}
                onChange={(e) => updateSituation('ncoic', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                {cadets.map(c => (
                  <option key={c.id} value={`${c.lastName}, ${c.firstName}`}>
                    {c.lastName}, {c.firstName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-700">{conop.situation?.ncoic || ''}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">DATE:</label>
            {isEditing ? (
              <input
                type="text"
                value={conop.situation?.date || ''}
                onChange={(e) => updateSituation('date', e.target.value)}
                placeholder="e.g., 060023AUG23-070023AUG23"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="text-sm text-gray-700">{conop.situation?.date || ''}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">AO:</label>
            {isEditing ? (
              <input
                type="text"
                value={conop.situation?.ao || ''}
                onChange={(e) => updateSituation('ao', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="text-sm text-gray-700">{conop.situation?.ao || ''}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">UNIFORM:</label>
            {isEditing ? (
              <input
                type="text"
                value={conop.situation?.uniform || ''}
                onChange={(e) => updateSituation('uniform', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="text-sm text-gray-700">{conop.situation?.uniform || ''}</div>
            )}
          </div>
        </div>
      </div>

          {/* End State */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">END STATE</h3>
            {isEditing ? (
              <textarea
                value={conop.endState || ''}
                onChange={(e) => updateConop('endState', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter end state..."
              />
            ) : (
              <div className="text-gray-700 min-h-[60px]">{conop.endState || ''}</div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
              {/* Concept of Operation */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">CONCEPT OF THE OPERATION</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  PHASE I {isEditing ? (
                    <span className="text-gray-400">
                      (<input
                        type="text"
                        value={conop.conceptOfOperation?.phase1Label || 'Location Prep'}
                        onChange={(e) => updateConceptPhaseLabel('phase1Label', e.target.value)}
                        className="inline w-32 px-1 py-0 border-b border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="Label"
                      />):
                    </span>
                  ) : (
                    <span>({conop.conceptOfOperation?.phase1Label || 'Location Prep'}):</span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.conceptOfOperation?.phase1 || ''}
                    onChange={(e) => updateConceptPhase('phase1', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.conceptOfOperation?.phase1 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  PHASE II {isEditing ? (
                    <span className="text-gray-400">
                      (<input
                        type="text"
                        value={conop.conceptOfOperation?.phase2Label || 'Arrival'}
                        onChange={(e) => updateConceptPhaseLabel('phase2Label', e.target.value)}
                        className="inline w-32 px-1 py-0 border-b border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="Label"
                      />):
                    </span>
                  ) : (
                    <span>({conop.conceptOfOperation?.phase2Label || 'Arrival'}):</span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.conceptOfOperation?.phase2 || ''}
                    onChange={(e) => updateConceptPhase('phase2', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.conceptOfOperation?.phase2 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  PHASE III {isEditing ? (
                    <span className="text-gray-400">
                      (<input
                        type="text"
                        value={conop.conceptOfOperation?.phase3Label || 'Mentorship'}
                        onChange={(e) => updateConceptPhaseLabel('phase3Label', e.target.value)}
                        className="inline w-32 px-1 py-0 border-b border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="Label"
                      />):
                    </span>
                  ) : (
                    <span>({conop.conceptOfOperation?.phase3Label || 'Mentorship'}):</span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.conceptOfOperation?.phase3 || ''}
                    onChange={(e) => updateConceptPhase('phase3', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.conceptOfOperation?.phase3 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  PHASE IV {isEditing ? (
                    <span className="text-gray-400">
                      (<input
                        type="text"
                        value={conop.conceptOfOperation?.phase4Label || 'Dismissal'}
                        onChange={(e) => updateConceptPhaseLabel('phase4Label', e.target.value)}
                        className="inline w-32 px-1 py-0 border-b border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="Label"
                      />):
                    </span>
                  ) : (
                    <span>({conop.conceptOfOperation?.phase4Label || 'Dismissal'}):</span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.conceptOfOperation?.phase4 || ''}
                    onChange={(e) => updateConceptPhase('phase4', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.conceptOfOperation?.phase4 || ''}</div>
                )}
              </div>
            </div>
          </div>

              {/* Resources & Supply */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">RESOURCES & SUPPLY (SUPPLY REQUEST)</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">CLASS I (Food, Rations, Water):</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.resources?.class1 || ''}
                    onChange={(e) => updateResources('class1', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.resources?.class1 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CLASS II (Clothing & Equipment):</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.resources?.class2 || ''}
                    onChange={(e) => updateResources('class2', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.resources?.class2 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CLASS V (Ammunition):</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.resources?.class5 || ''}
                    onChange={(e) => updateResources('class5', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.resources?.class5 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CLASS VI (Personal Demand Items):</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.resources?.class6 || ''}
                    onChange={(e) => updateResources('class6', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.resources?.class6 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CLASS VIII (Medical Supplies & Equipment):</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.resources?.class8 || ''}
                    onChange={(e) => updateResources('class8', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.resources?.class8 || ''}</div>
                )}
              </div>
            </div>
          </div>

          {/* Key Dates */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">KEY DATES AND TIMELINE</h3>
            {isEditing ? (
              <textarea
                value={conop.keyDates?.join('\n') || ''}
                onChange={(e) => updateConop('keyDates', e.target.value.split('\n').filter(l => l.trim()))}
                rows={4}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="One date per line"
              />
            ) : (
              <div className="text-sm text-gray-700 space-y-1">
                {conop.keyDates?.map((date, i) => <div key={i}>{date}</div>) || ''}
              </div>
            )}
          </div>

          {/* Attached Appendices */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">ATTACHED APPENDICIES</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">APPENDIX 1:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.attachedAppendices?.appendix1 || ''}
                    onChange={(e) => updateAttachedAppendix('appendix1', e.target.value)}
                    placeholder="e.g., Medivac Plan"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.attachedAppendices?.appendix1 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">APPENDIX 2:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.attachedAppendices?.appendix2 || ''}
                    onChange={(e) => updateAttachedAppendix('appendix2', e.target.value)}
                    placeholder="e.g., Packing List & Add. Items"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.attachedAppendices?.appendix2 || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">APPENDIX 3:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.attachedAppendices?.appendix3 || ''}
                    onChange={(e) => updateAttachedAppendix('appendix3', e.target.value)}
                    placeholder="e.g., Task Org. (If needed, for larger events like CWST)"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.attachedAppendices?.appendix3 || ''}</div>
                )}
              </div>
            </div>
          </div>

          {/* Staff Section Duties */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">STAFF SECTION DUTIES & RESPONSIBILITIES</h3>
            <div className="space-y-2">
              {['s1', 's2', 's3', 's4', 's5', 's6'].map(section => (
                <div key={section}>
                  <label className="block text-xs text-gray-600 mb-1">{section.toUpperCase()}:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={conop.staffDuties?.[section as keyof typeof conop.staffDuties] || ''}
                      onChange={(e) => updateStaffDuty(section, e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-700">{conop.staffDuties?.[section as keyof typeof conop.staffDuties] || ''}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

              {/* Comms PACE Plan */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">COMMS PACE Plan</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">P:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.commsPace?.primary || ''}
                    onChange={(e) => updateCommsPace('primary', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.commsPace?.primary || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">A:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.commsPace?.alternate || ''}
                    onChange={(e) => updateCommsPace('alternate', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.commsPace?.alternate || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">C:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.commsPace?.contingency || ''}
                    onChange={(e) => updateCommsPace('contingency', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.commsPace?.contingency || ''}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">E:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={conop.commsPace?.emergency || ''}
                    onChange={(e) => updateCommsPace('emergency', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm text-gray-700">{conop.commsPace?.emergency || ''}</div>
                )}
              </div>
            </div>
          </div>

          {/* Tasks to Subs */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 mb-2">TASKS TO SUBS</h3>
            {isEditing ? (
              <textarea
                value={conop.tasksToSubs || ''}
                onChange={(e) => updateConop('tasksToSubs', e.target.value)}
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="E.g. - Pre-/post-lab, ruck WP/SP/Pacers, MSIV instructors for lab, etc."
              />
            ) : (
              <div className="text-sm text-gray-700">{conop.tasksToSubs || ''}</div>
            )}
          </div>
        </div>
      </div>

       {/* Planning Status Grid - Bottom Section */}
       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <h3 className="font-bold text-gray-900 mb-4">KEY TASKS FOR EACH WEEK</h3>
         <div className="overflow-x-auto">
           <div className="grid grid-cols-7 gap-2">
             {['t6', 't5', 't4', 't3', 't2', 't1', 'tWeek'].map(week => (
               <div key={week} className="space-y-2">
                 <div className="text-center text-xs font-bold text-gray-700 bg-gray-100 py-2 rounded">
                   {week.toUpperCase()}
                 </div>
                 {isEditing ? (
                   <textarea
                     value={conop.weeklyTasks?.[week as keyof typeof conop.weeklyTasks] || ''}
                     onChange={(e) => updateWeeklyTask(week, e.target.value)}
                     rows={6}
                     className="w-full px-2 py-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
                     placeholder="Enter tasks..."
                   />
                 ) : (
                   <div className="w-full px-2 py-2 text-xs border border-gray-300 rounded bg-gray-50 min-h-[120px] whitespace-pre-wrap">
                     {conop.weeklyTasks?.[week as keyof typeof conop.weeklyTasks] || ''}
                   </div>
                 )}
               </div>
             ))}
           </div>
         </div>
       </div>
    </div>
  );
}

