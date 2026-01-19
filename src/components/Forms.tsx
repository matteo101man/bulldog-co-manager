import React, { useState } from 'react';
import { generateFRAGO } from '../services/fragoService';

interface FormsProps {
  onExpenseRequest: () => void;
  onBack: () => void;
}

export default function Forms({ onExpenseRequest, onBack }: FormsProps) {
  const [isGeneratingFRAGO, setIsGeneratingFRAGO] = useState(false);

  async function handleGenerateFRAGO() {
    setIsGeneratingFRAGO(true);
    try {
      await generateFRAGO();
    } catch (error) {
      console.error('Error generating FRAGO:', error);
      alert('Error generating FRAGO. Please try again.');
    } finally {
      setIsGeneratingFRAGO(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Forms</h1>
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
          Select a form
        </p>
        <div className="space-y-3">
          <button
            onClick={handleGenerateFRAGO}
            disabled={isGeneratingFRAGO}
            className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '44px' }}
          >
            <span className="text-lg font-semibold text-gray-900">
              {isGeneratingFRAGO ? 'Generating FRAGO...' : 'Generate FRAGO'}
            </span>
          </button>
          <button
            onClick={onExpenseRequest}
            className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <span className="text-lg font-semibold text-gray-900">
              Submit An Expense Request
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
