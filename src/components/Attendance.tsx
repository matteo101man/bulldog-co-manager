import React from 'react';
import { Company } from '../types';

interface AttendanceProps {
  onBack: () => void;
  onSelectCompany: (company: Company) => void;
}

const COMPANIES: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Master'];

export default function Attendance({ onBack, onSelectCompany }: AttendanceProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Attendance
          </h1>
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
        <p className="text-center text-gray-600 mb-6">
          Select a company to handle attendance
        </p>
        <div className="space-y-3">
          {COMPANIES.map((company) => (
            <button
              key={company}
              onClick={() => onSelectCompany(company)}
              className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <span className="text-lg font-semibold text-gray-900">
                {company === 'Master' ? 'Master List' : `${company} Company`}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

