import React, { useState, useEffect, useRef } from 'react';
import { addTrainingEvent, updateTrainingEvent } from '../services/trainingEventService';
import { getCadetsByCompany } from '../services/cadetService';
import { TrainingEvent, PlanningStatus, Cadet } from '../types';

interface AddTrainingEventProps {
  eventId?: string; // If provided, we're editing
  onBack: () => void;
  onSuccess: () => void;
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

  // Filter cadets based on search query
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
    
    // If user clears the input, clear the selection
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

export default function AddTrainingEvent({ eventId, onBack, onSuccess }: AddTrainingEventProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hitTime, setHitTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [oicId, setOicId] = useState('');
  const [ncoicId, setNcoicId] = useState('');
  const [ao, setAo] = useState('');
  const [uniform, setUniform] = useState('');
  const [mission, setMission] = useState('');
  const [planningStatus, setPlanningStatus] = useState<PlanningStatus>('in-progress');
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(!!eventId);

  useEffect(() => {
    async function loadCadets() {
      try {
        const cadetsData = await getCadetsByCompany('Master');
        setCadets(cadetsData.sort((a, b) => {
          const lastNameCompare = a.lastName.localeCompare(b.lastName);
          if (lastNameCompare !== 0) return lastNameCompare;
          return a.firstName.localeCompare(b.firstName);
        }));
      } catch (error) {
        console.error('Error loading cadets:', error);
      }
    }
    loadCadets();

    if (eventId) {
      // Load existing event data if editing
      // This would require getTrainingEventById, but for now we'll just set defaults
      setLoading(false);
    }
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim() || !date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Build event data object with only required fields
      // Optional fields are omitted (not set to undefined) since Firestore doesn't accept undefined
      const eventData: Omit<TrainingEvent, 'id'> = {
        name: name.trim(),
        date,
        planningStatus,
        ...(endDate && { endDate }),
        ...(hitTime && { hitTime }),
        ...(endTime && { endTime }),
        ...(oicId && { oicId }),
        ...(ncoicId && { ncoicId }),
        ...(ao.trim() && { ao: ao.trim() }),
        ...(uniform.trim() && { uniform: uniform.trim() }),
        ...(mission.trim() && { mission: mission.trim() })
      };

      if (eventId) {
        await updateTrainingEvent(eventId, eventData);
      } else {
        await addTrainingEvent(eventData);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving event:', error);
      alert(`Error saving event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
            {eventId ? 'Edit Event' : 'Add Event'}
          </h1>
          <button
            onClick={onBack}
            className="text-sm text-gray-600 font-medium touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Cancel
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter event name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date (Optional - for multi-day events)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={date || undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hit Time (Optional)
            </label>
            <input
              type="time"
              value={hitTime}
              onChange={(e) => setHitTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time (Optional - if not set, event will only show start time)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <SearchableSelect
            value={oicId}
            onChange={setOicId}
            cadets={cadets}
            placeholder="Type to search for OIC..."
            label="OIC (Optional)"
          />

          <SearchableSelect
            value={ncoicId}
            onChange={setNcoicId}
            cadets={cadets}
            placeholder="Type to search for NCOIC..."
            label="NCOIC (Optional)"
          />

          {/* AO (Location), Uniform, and Mission fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AO (Area of Operations / Location) (Optional)
            </label>
            <input
              type="text"
              value={ao}
              onChange={(e) => setAo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter area of operations"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uniform (Optional)
            </label>
            <input
              type="text"
              value={uniform}
              onChange={(e) => setUniform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter uniform requirement"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mission (Optional)
            </label>
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter mission description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Planning Status
            </label>
            <select
              value={planningStatus}
              onChange={(e) => setPlanningStatus(e.target.value as PlanningStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="not-started">Not Started ○</option>
              <option value="in-progress">In Progress ◐</option>
              <option value="issues">Issues !</option>
              <option value="complete">Complete ✓</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 touch-manipulation min-h-[44px]"
            >
              {eventId ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

