import React, { useState, useEffect } from 'react';
import { getCurrentWeekStart, getFullWeekDates, formatDateShort } from '../utils/dates';
import { getWeatherForecasts, WeatherForecast, WeatherError } from '../services/weatherService';
import { getAllTrainingEvents } from '../services/trainingEventService';

interface WeatherRow {
  date: string;
  dayLabel: string;
  high: string;
  low: string;
  wind: string;
  precipDay: string;
  precipNight: string;
  events: string;
  impact: string;
}

interface WeatherDataProps {
  onBack: () => void;
}

export default function WeatherData({ onBack }: WeatherDataProps) {
  const [weatherRows, setWeatherRows] = useState<WeatherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeatherData();
  }, []);

  async function loadWeatherData() {
    setLoading(true);
    try {
      const weekStart = getCurrentWeekStart();
      const weekDates = getFullWeekDates(weekStart);
      
      // Fetch weather forecasts
      const dates = [
        weekDates.monday,
        weekDates.tuesday,
        weekDates.wednesday,
        weekDates.thursday,
        weekDates.friday,
        weekDates.saturday,
        weekDates.sunday,
      ];

      const { forecasts, errors } = await getWeatherForecasts(dates);
      
      // Build error message if any errors occurred
      if (errors.size > 0) {
        const errorMessages: string[] = [];
        errors.forEach((err, date) => {
          errorMessages.push(`${date}: ${err.message}${err.details ? ` - ${err.details}` : ''}${err.statusCode ? ` (Status: ${err.statusCode})` : ''}`);
        });
        setError(errorMessages.join('\n'));
      } else {
        setError(null);
      }
      
      // Fetch training events to autofill event names
      const trainingEvents = await getAllTrainingEvents();
      const eventsByDate = new Map<string, string>();
      trainingEvents.forEach(event => {
        eventsByDate.set(event.date, event.name);
      });
      
      // Load saved events and impact from localStorage if available
      const savedData = localStorage.getItem('weatherEventsImpact');
      const savedDataMap: Record<string, { events: string; impact: string }> = savedData ? JSON.parse(savedData) : {};

      // Create rows with weather data
      const rows: WeatherRow[] = dates.map((date) => {
        const forecast = forecasts.get(date);
        const saved = savedDataMap[date];
        const eventName = eventsByDate.get(date);
        
        // Use saved events if available (including empty string), otherwise use training event name if available
        const eventsValue = saved?.events !== undefined ? saved.events : (eventName || '');
        
        return {
          date,
          dayLabel: formatDateShort(date),
          high: forecast ? String(forecast.high) : '',
          low: forecast ? String(forecast.low) : '',
          wind: forecast ? String(forecast.wind) : '',
          precipDay: forecast ? String(forecast.precipDay) : '',
          precipNight: forecast ? String(forecast.precipNight) : '',
          events: eventsValue,
          impact: saved?.impact || '',
        };
      });

      setWeatherRows(rows);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = error instanceof Error ? error.stack : String(error);
      setError(`Error loading weather data: ${errorMessage}\n${errorDetails}`);
      console.error('Error loading weather data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(index: number, field: 'events' | 'impact', value: string) {
    const updated = [...weatherRows];
    updated[index] = { ...updated[index], [field]: value };
    setWeatherRows(updated);
    
    // Save only events and impact to localStorage
    const eventsImpactMap: Record<string, { events: string; impact: string }> = {};
    updated.forEach(row => {
      eventsImpactMap[row.date] = {
        events: row.events,
        impact: row.impact
      };
    });
    localStorage.setItem('weatherEventsImpact', JSON.stringify(eventsImpactMap));
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Weather Data</h1>
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
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading weather data...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Weather Data Error</h2>
            <pre className="text-sm text-red-800 whitespace-pre-wrap break-words">{error}</pre>
          </div>
        ) : weatherRows.length === 0 || weatherRows.every(row => !row.high && !row.low) ? (
          <div className="text-center py-8 text-gray-500">No weather data available</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-white border-b border-gray-300">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Day</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">High (°F)</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Low (°F)</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Wind (mph)</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Precip. Day</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Precip. Night</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Events</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {weatherRows.map((row, index) => (
                    <tr key={row.date} className="border-b border-gray-300 last:border-b-0">
                      <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-300 whitespace-nowrap bg-white">
                        {row.dayLabel}
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <div className="px-2 py-1 text-sm text-gray-900">
                          {row.high || '--'}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <div className="px-2 py-1 text-sm text-gray-900">
                          {row.low || '--'}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <div className="px-2 py-1 text-sm text-gray-900">
                          {row.wind || '--'}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <div className="px-2 py-1 text-sm text-gray-900">
                          {row.precipDay || '--'}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <div className="px-2 py-1 text-sm text-gray-900">
                          {row.precipNight || '--'}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <input
                          type="text"
                          value={row.events}
                          onChange={(e) => handleFieldChange(index, 'events', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                          placeholder="NONE"
                        />
                      </td>
                      <td className="px-3 py-2 bg-white">
                        <input
                          type="text"
                          value={row.impact}
                          onChange={(e) => handleFieldChange(index, 'impact', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                          placeholder="NONE"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

