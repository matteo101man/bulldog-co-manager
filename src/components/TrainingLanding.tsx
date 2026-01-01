import React from 'react';

interface TrainingLandingProps {
  onTrainingSchedule: () => void;
  onWeatherData: () => void;
  onBack: () => void;
}

export default function TrainingLanding({ onTrainingSchedule, onWeatherData, onBack }: TrainingLandingProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Training</h1>
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
        <p className="text-center text-gray-600 mb-6">
          Select an option
        </p>
        <div className="space-y-3">
          <button
            onClick={onTrainingSchedule}
            className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <span className="text-lg font-semibold text-gray-900">
              Training Schedule
            </span>
          </button>
          <button
            onClick={onWeatherData}
            className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <span className="text-lg font-semibold text-gray-900">
              Weather Data
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}

