import React, { useState } from 'react';
import { clearAllAttendance } from '../services/attendanceService';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [clearing, setClearing] = useState(false);

  async function handleClearDatabase() {
    const confirmed = window.confirm(
      'Are you sure you want to clear all attendance data? This will reset all attendance records to blank (—). This action cannot be undone.'
    );

    if (!confirmed) return;

    setClearing(true);
    try {
      await clearAllAttendance();
      alert('All attendance data has been cleared successfully.');
    } catch (error) {
      console.error('Error clearing database:', error);
      alert(`Error clearing database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Management</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Clear all attendance data. This will reset all attendance records to blank (—) for all cadets and all weeks.
              </p>
              <button
                onClick={handleClearDatabase}
                disabled={clearing}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                  clearing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                }`}
              >
                {clearing ? 'Clearing...' : 'Clear Database'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

