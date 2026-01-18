import React, { useState } from 'react';
import { Company } from '../types';

interface CompanySelectorProps {
  onSelect: (company: Company) => void;
  onSettings: () => void;
  onCadets: () => void;
  onTrainingSchedule: () => void;
  onAttendance: () => void;
  onPT: () => void;
}

export default function CompanySelector({ onSelect, onSettings, onCadets, onTrainingSchedule, onAttendance, onPT }: CompanySelectorProps) {
  const [activeTab, setActiveTab] = useState<'companies' | 'cadets' | 'settings' | 'training-schedule'>('companies');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8 safe-area-inset">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          Bulldog CO Manager
        </h1>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex-1 min-w-[80px] py-3 text-sm font-medium touch-manipulation ${
              activeTab === 'companies'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Companies
          </button>
          <button
            onClick={() => {
              setActiveTab('cadets');
              onCadets();
            }}
            className={`flex-1 min-w-[80px] py-3 text-sm font-medium touch-manipulation ${
              activeTab === 'cadets'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Cadets
          </button>
          <button
            onClick={() => {
              setActiveTab('training-schedule');
              onTrainingSchedule();
            }}
            className={`flex-1 min-w-[80px] py-3 text-sm font-medium touch-manipulation ${
              activeTab === 'training-schedule'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => {
              setActiveTab('settings');
              onSettings();
            }}
            className={`flex-1 min-w-[80px] py-3 text-sm font-medium touch-manipulation ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'companies' && (
          <div className="space-y-3">
            <button
              onClick={onAttendance}
              className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <span className="text-lg font-semibold text-gray-900">
                Attendance
              </span>
            </button>
            <button
              onClick={onPT}
              className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <span className="text-lg font-semibold text-gray-900">
                PT
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

