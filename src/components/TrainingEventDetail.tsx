import React, { useState, useEffect, useRef } from 'react';
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

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  cadets: Cadet[];
  placeholder: string;
  label: string;
}

function SearchableSelect({ value, onChange, cadets, placeholder, label }: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCadet = cadets.find(c => c.id === value);
  // If value is a cadet ID, show cadet name; otherwise show the value as text
  const displayValue = selectedCadet ? `${selectedCadet.lastName}, ${selectedCadet.firstName}` : (value || '');

  const filteredCadets = cadets.filter(cadet => {
    const fullName = `${cadet.lastName}, ${cadet.firstName}`.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return fullName.includes(searchLower) || 
           cadet.firstName.toLowerCase().includes(searchLower) ||
           cadet.lastName.toLowerCase().includes(searchLower);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // If there's a search query and no cadet selected, save it as text
        if (searchQuery && !selectedCadet) {
          onChange(searchQuery);
        } else {
          setSearchQuery('');
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery, selectedCadet, onChange]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);
    if (!query) {
      onChange('');
    } else {
      // Update immediately for free text (not a cadet selection)
      // Check if it matches a cadet exactly
      const exactMatch = cadets.find(c => 
        `${c.lastName}, ${c.firstName}`.toLowerCase() === query.toLowerCase()
      );
      if (!exactMatch) {
        // Allow free text input
        onChange(query);
      }
    }
  }

  function handleSelect(cadetId: string) {
    onChange(cadetId);
    setIsOpen(false);
    setSearchQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && isOpen && filteredCadets.length === 0 && searchQuery) {
      // Save as text if Enter pressed and no cadet matches
      onChange(searchQuery);
      setIsOpen(false);
      setSearchQuery('');
      e.preventDefault();
    }
  }

  function handleFocus() {
    setIsOpen(true);
    if (!value) {
      setSearchQuery('');
    } else if (!selectedCadet) {
      // If it's free text, show it in search query
      setSearchQuery(value);
    }
  }

  function handleBlur() {
    // Small delay to allow dropdown clicks to register
    setTimeout(() => {
      setIsOpen(false);
      if (searchQuery && !selectedCadet) {
        onChange(searchQuery);
      }
      setSearchQuery('');
    }, 200);
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={isOpen && searchQuery !== '' ? searchQuery : displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {isOpen && filteredCadets.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredCadets.map(cadet => (
            <button
              key={cadet.id}
              type="button"
              onClick={() => handleSelect(cadet.id)}
              className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                value === cadet.id ? 'bg-blue-100' : ''
              }`}
            >
              {cadet.lastName}, {cadet.firstName}
            </button>
          ))}
        </div>
      )}
      {isOpen && searchQuery && filteredCadets.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
        >
          <div className="px-3 py-2 text-gray-500 text-sm">
            Press Enter to save as text, or select a cadet above
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchableSelectNameProps {
  value: string;
  onChange: (value: string) => void;
  cadets: Cadet[];
  placeholder: string;
  label: string;
}

function SearchableSelectName({ value, onChange, cadets, placeholder, label }: SearchableSelectNameProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCadets = cadets.filter(cadet => {
    const fullName = `${cadet.lastName}, ${cadet.firstName}`.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return fullName.includes(searchLower) || 
           cadet.firstName.toLowerCase().includes(searchLower) ||
           cadet.lastName.toLowerCase().includes(searchLower);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);
    if (!query) {
      onChange('');
    }
  }

  function handleSelect(fullName: string) {
    onChange(fullName);
    setIsOpen(false);
    setSearchQuery('');
  }

  function handleFocus() {
    setIsOpen(true);
    if (!value) {
      setSearchQuery('');
    }
  }

  return (
    <div className="relative">
      <label className="block text-xs text-gray-600 mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={isOpen && searchQuery !== '' ? searchQuery : value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
      {isOpen && filteredCadets.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredCadets.map(cadet => {
            const fullName = `${cadet.lastName}, ${cadet.firstName}`;
            return (
              <button
                key={cadet.id}
                type="button"
                onClick={() => handleSelect(fullName)}
                className={`w-full text-left px-2 py-1 text-sm hover:bg-blue-50 ${
                  value === fullName ? 'bg-blue-100' : ''
                }`}
              >
                {fullName}
              </button>
            );
          })}
        </div>
      )}
      {isOpen && searchQuery && filteredCadets.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
        >
          <div className="px-2 py-1 text-gray-500 text-xs">No cadets found</div>
        </div>
      )}
    </div>
  );
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
    // If it's a cadet ID, return cadet name; otherwise return the text value
    return cadet ? `${cadet.lastName}, ${cadet.firstName}` : cadetId;
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedEvent.date || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="text-gray-900">{event.date}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedEvent.endDate || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, endDate: e.target.value || undefined })}
                  min={editedEvent.date || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="text-gray-900">
                  {event.endDate ? event.endDate : 'Not set'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hit Time</label>
              {isEditing ? (
                <input
                  type="time"
                  value={editedEvent.hitTime || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, hitTime: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="text-gray-900">
                  {event.hitTime ? (() => {
                    // Format time display - handle both HH:mm and HHmm formats
                    const time = event.hitTime;
                    if (time.includes(':')) {
                      return time;
                    } else if (time.length === 4) {
                      // Format as HH:mm
                      return `${time.substring(0, 2)}:${time.substring(2)}`;
                    }
                    return time;
                  })() : 'Not set'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time (Optional)</label>
              {isEditing ? (
                <input
                  type="time"
                  value={editedEvent.endTime || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, endTime: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Leave empty for start-time only events"
                />
              ) : (
                <div className="text-gray-900">
                  {event.endTime ? (() => {
                    // Format time display - handle both HH:mm and HHmm formats
                    const time = event.endTime;
                    if (time.includes(':')) {
                      return time;
                    } else if (time.length === 4) {
                      // Format as HH:mm
                      return `${time.substring(0, 2)}:${time.substring(2)}`;
                    }
                    return time;
                  })() : 'Not set (event will show start time only)'}
                </div>
              )}
            </div>

            {isEditing ? (
              <>
                <SearchableSelect
                  value={editedEvent.oicId || ''}
                  onChange={(value) => setEditedEvent({ ...editedEvent, oicId: value || undefined })}
                  cadets={cadets}
                  placeholder="Type to search for OIC..."
                  label="OIC"
                />
                <SearchableSelect
                  value={editedEvent.ncoicId || ''}
                  onChange={(value) => setEditedEvent({ ...editedEvent, ncoicId: value || undefined })}
                  cadets={cadets}
                  placeholder="Type to search for NCOIC..."
                  label="NCOIC"
                />
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OIC</label>
                  <div className="text-gray-900">{getCadetName(event.oicId) || 'Not assigned'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NCOIC</label>
                  <div className="text-gray-900">{getCadetName(event.ncoicId) || 'Not assigned'}</div>
                </div>
              </>
            )}

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
                  <option value="not-started">Not Started ○</option>
                  <option value="in-progress">In Progress ◐</option>
                  <option value="issues">Issues !</option>
                  <option value="complete">Complete ✓</option>
                </select>
              ) : (
                <div className="text-gray-900">
                  {event.planningStatus === 'not-started' && '○ Not Started'}
                  {event.planningStatus === 'in-progress' && '◐ In Progress'}
                  {event.planningStatus === 'issues' && '! Issues'}
                  {event.planningStatus === 'complete' && '✓ Complete'}
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

  function updateWeeklyTaskStatus(week: string, status: PlanningStatus) {
    updateConop('weeklyTasks', {
      ...conop.weeklyTasks,
      [week]: {
        ...conop.weeklyTasks?.[week as keyof typeof conop.weeklyTasks],
        status
      }
    });
  }

  function updateWeeklyTaskDescription(week: string, description: string) {
    updateConop('weeklyTasks', {
      ...conop.weeklyTasks,
      [week]: {
        ...conop.weeklyTasks?.[week as keyof typeof conop.weeklyTasks],
        description
      }
    });
  }

  function getStatusColor(status?: PlanningStatus): string {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'issues': return 'bg-orange-500';
      case 'not-started': return 'bg-red-500';
      default: return 'bg-red-500';
    }
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
          {isEditing ? (
            <>
              <SearchableSelectName
                value={conop.situation?.oic || ''}
                onChange={(value) => updateSituation('oic', value)}
                cadets={cadets}
                placeholder="Type to search..."
                label="OIC:"
              />
              <SearchableSelectName
                value={conop.situation?.ncoic || ''}
                onChange={(value) => updateSituation('ncoic', value)}
                cadets={cadets}
                placeholder="Type to search..."
                label="NCOIC:"
              />
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">OIC:</label>
                <div className="text-sm text-gray-700">{conop.situation?.oic || ''}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">NCOIC:</label>
                <div className="text-sm text-gray-700">{conop.situation?.ncoic || ''}</div>
              </div>
            </>
          )}
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
           <table className="w-full border-collapse">
             <thead>
               <tr>
                 {['t6', 't5', 't4', 't3', 't2', 't1', 'tWeek'].map(week => (
                   <th key={week} className="border border-gray-300 px-2 py-2 text-center text-xs font-bold bg-gray-100">
                     {week.toUpperCase()}
                   </th>
                 ))}
               </tr>
             </thead>
             <tbody>
               <tr>
                 {['t6', 't5', 't4', 't3', 't2', 't1', 'tWeek'].map(week => {
                   const weekData = conop.weeklyTasks?.[week as keyof typeof conop.weeklyTasks];
                   const status = (typeof weekData === 'object' && weekData?.status) ? weekData.status : (weekData ? 'not-started' : 'not-started');
                   const description = (typeof weekData === 'object' && weekData?.description) ? weekData.description : '';
                   return (
                     <td key={week} className="border border-gray-300 px-2 py-2">
                       <div className="space-y-1">
                         {isEditing ? (
                           <>
                             <select
                               value={status}
                               onChange={(e) => updateWeeklyTaskStatus(week, e.target.value as PlanningStatus)}
                               className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                             >
                               <option value="complete">✓</option>
                               <option value="in-progress">◐</option>
                               <option value="issues">!</option>
                               <option value="not-started">-</option>
                             </select>
                             <textarea
                               value={description}
                               onChange={(e) => updateWeeklyTaskDescription(week, e.target.value)}
                               rows={3}
                               className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 resize-none"
                               placeholder="Task description..."
                             />
                           </>
                         ) : (
                           <>
                             <div className={`h-6 w-full rounded ${getStatusColor(status)} flex items-center justify-center text-white text-xs font-bold`}>
                               {status === 'complete' && '✓'}
                               {status === 'in-progress' && '◐'}
                               {status === 'issues' && '!'}
                               {status === 'not-started' && '-'}
                             </div>
                             {description && (
                               <div className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                                 {description}
                               </div>
                             )}
                           </>
                         )}
                       </div>
                     </td>
                   );
                 })}
               </tr>
             </tbody>
           </table>
         </div>
         <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-4">
           <div className="flex items-center gap-1">
             <div className="w-4 h-4 rounded bg-green-500"></div>
             <span className="font-medium">COMPLETE</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-4 h-4 rounded bg-yellow-500"></div>
             <span className="font-medium">WORKING</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-4 h-4 rounded bg-orange-500"></div>
             <span className="font-medium">ISSUES</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-4 h-4 rounded bg-red-500"></div>
             <span className="font-medium">NOT STARTED</span>
           </div>
         </div>
       </div>
    </div>
  );
}

