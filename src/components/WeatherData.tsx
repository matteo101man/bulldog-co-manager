import React, { useState, useEffect } from 'react';
import { getCurrentWeekStart, getFullWeekDates, formatDateShort } from '../utils/dates';
import { getWeatherForecasts, WeatherForecast } from '../services/weatherService';

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

      const forecasts = await getWeatherForecasts(dates);
      
      // Load saved data from localStorage if available
      const savedData = localStorage.getItem('weatherData');
      const savedRows: WeatherRow[] = savedData ? JSON.parse(savedData) : [];

      // Create rows with weather data
      const rows: WeatherRow[] = dates.map((date, index) => {
        const savedRow = savedRows.find(r => r.date === date);
        const forecast = forecasts.get(date);
        
        return {
          date,
          dayLabel: formatDateShort(date),
          high: savedRow?.high || (forecast ? String(forecast.high) : ''),
          low: savedRow?.low || (forecast ? String(forecast.low) : ''),
          wind: savedRow?.wind || (forecast ? String(forecast.wind) : ''),
          precipDay: savedRow?.precipDay || (forecast ? String(forecast.precipDay) : ''),
          precipNight: savedRow?.precipNight || (forecast ? String(forecast.precipNight) : ''),
          events: savedRow?.events || '',
          impact: savedRow?.impact || '',
        };
      });

      setWeatherRows(rows);
    } catch (error) {
      console.error('Error loading weather data:', error);
      alert('Error loading weather data');
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(index: number, field: keyof WeatherRow, value: string) {
    const updated = [...weatherRows];
    updated[index] = { ...updated[index], [field]: value };
    setWeatherRows(updated);
    
    // Save to localStorage
    localStorage.setItem('weatherData', JSON.stringify(updated));
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
                        <input
                          type="text"
                          value={row.high}
                          onChange={(e) => handleFieldChange(index, 'high', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                          placeholder="--"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <input
                          type="text"
                          value={row.low}
                          onChange={(e) => handleFieldChange(index, 'low', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                          placeholder="--"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <input
                          type="text"
                          value={row.wind}
                          onChange={(e) => handleFieldChange(index, 'wind', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                          placeholder="--"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <input
                          type="text"
                          value={row.precipDay}
                          onChange={(e) => handleFieldChange(index, 'precipDay', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                          placeholder="--"
                        />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-300 bg-white">
                        <input
                          type="text"
                          value={row.precipNight}
                          onChange={(e) => handleFieldChange(index, 'precipNight', e.target.value)}
                          className="w-full px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                          placeholder="--"
                        />
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

