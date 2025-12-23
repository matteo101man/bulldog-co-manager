import React from 'react';
import { Company } from '../types';

interface CompanySelectorProps {
  onSelect: (company: Company) => void;
}

const COMPANIES: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Master'];

export default function CompanySelector({ onSelect }: CompanySelectorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8 safe-area-inset">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          Bulldog CO Manager
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Select your company
        </p>
        <div className="space-y-3">
          {COMPANIES.map((company) => (
            <button
              key={company}
              onClick={() => onSelect(company)}
              className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
              style={{ minHeight: '44px' }} // iOS touch target
            >
              <span className="text-lg font-semibold text-gray-900">
                {company} {company !== 'Master' && 'Company'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

