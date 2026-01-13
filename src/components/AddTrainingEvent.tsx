import React, { useState, useEffect } from 'react';
import { addTrainingEvent, updateTrainingEvent } from '../services/trainingEventService';
import { getCadetsByCompany } from '../services/cadetService';
import { TrainingEvent, PlanningStatus, Cadet } from '../types';

interface AddTrainingEventProps {
  eventId?: string; // If provided, we're editing
  onBack: () => void;
  onSuccess: () => void;
}

export default function AddTrainingEvent({ eventId, onBack, onSuccess }: AddTrainingEventProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hitTime, setHitTime] = useState('');
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
              OIC (Optional)
            </label>
            <select
              value={oicId}
              onChange={(e) => setOicId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select OIC</option>
              {cadets.map(cadet => (
                <option key={cadet.id} value={cadet.id}>
                  {cadet.lastName}, {cadet.firstName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NCOIC (Optional)
            </label>
            <select
              value={ncoicId}
              onChange={(e) => setNcoicId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select NCOIC</option>
              {cadets.map(cadet => (
                <option key={cadet.id} value={cadet.id}>
                  {cadet.lastName}, {cadet.firstName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AO (Area of Operations) (Optional)
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
              <option value="complete">Complete ✓</option>
              <option value="in-progress">In Progress ◐</option>
              <option value="issues">Issues !</option>
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

