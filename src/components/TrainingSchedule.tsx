import React, { useState, useEffect } from 'react';
import { 
  getAllTrainingEvents, 
  deleteTrainingEvent 
} from '../services/trainingEventService';
import { TrainingEvent, PlanningStatus } from '../types';

interface TrainingScheduleProps {
  onSelectEvent: (eventId: string) => void;
  onAddEvent: () => void;
  onBack: () => void;
}

export default function TrainingSchedule({ 
  onSelectEvent, 
  onAddEvent, 
  onBack 
}: TrainingScheduleProps) {
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const allEvents = await getAllTrainingEvents();
      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading training events:', error);
      alert(`Error loading events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(eventId: string, eventName: string) {
    if (!confirm(`Are you sure you want to delete "${eventName}"?`)) {
      return;
    }
    try {
      await deleteTrainingEvent(eventId);
      await loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(`Error deleting event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatDate(dateString: string): string {
    const date = parseDate(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  const now = startOfDay(new Date());
  const currentEvents = events.filter(e => {
    const eventDate = startOfDay(parseDate(e.date));
    return eventDate.getTime() >= now.getTime();
  });
  const pastEvents = events.filter(e => {
    const eventDate = startOfDay(parseDate(e.date));
    return eventDate.getTime() < now.getTime();
  });

  // Group events by date
  function groupByDate(eventList: TrainingEvent[]) {
    const grouped = new Map<string, TrainingEvent[]>();
    eventList.forEach(event => {
      const dateKey = format(parseISO(event.date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });
    return grouped;
  }

  function getStatusIcon(status: PlanningStatus) {
    switch (status) {
      case 'complete':
        return <span className="text-green-600 text-xl font-bold">✓</span>;
      case 'in-progress':
        return <span className="text-yellow-600 text-xl font-bold">◐</span>;
      case 'issues':
        return <span className="text-red-600 text-xl font-bold">!</span>;
    }
  }

  function renderEventList(eventList: TrainingEvent[], isPast: boolean = false) {
    const grouped = groupByDate(eventList);
    const sortedDates = Array.from(grouped.keys()).sort((a, b) => {
      if (isPast) {
        return b.localeCompare(a); // Descending for past
      }
      return a.localeCompare(b); // Ascending for current
    });

    if (sortedDates.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {isPast ? 'No past events' : 'No upcoming events'}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {sortedDates.map(dateKey => {
          const dateEvents = grouped.get(dateKey)!;
          const displayDate = formatDate(dateKey);
          
          return (
            <div key={dateKey}>
              <div className="bg-gray-100 border-b-2 border-gray-300 px-4 py-2 mb-2 rounded-t-lg">
                <h3 className="font-bold text-gray-900 text-sm">{displayDate}</h3>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {dateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`flex items-center border-b border-gray-100 last:border-b-0 ${
                      isPast ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      onClick={() => onSelectEvent(event.id)}
                      className="flex-1 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                    >
                      <span className="font-medium text-gray-900 block">
                        {event.name}
                      </span>
                    </button>
                    <div className="px-4 py-3 flex items-center justify-center min-w-[50px]">
                      {getStatusIcon(event.planningStatus)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(event.id, event.name);
                      }}
                      className="px-4 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Training Schedule</h1>
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
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="mb-4">
              <button
                onClick={onAddEvent}
                className="w-full py-3 px-4 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 touch-manipulation min-h-[44px]"
              >
                Add Event
              </button>
            </div>

            {currentEvents.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Events</h2>
                {renderEventList(currentEvents, false)}
              </div>
            )}

            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Past Events</h2>
                {renderEventList(pastEvents, true)}
              </div>
            )}

            {currentEvents.length === 0 && pastEvents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No training events. Add one to get started!
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

