import React, { useState } from 'react';
import { exportCadetData } from '../services/cadetExportService';

interface CadetSettingsProps {
  onBack: () => void;
}

export default function CadetSettings({ onBack }: CadetSettingsProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExportCadetData() {
    setExporting(true);
    try {
      await exportCadetData();
      alert('Cadet data exported successfully! The Excel file has been downloaded.');
    } catch (error) {
      console.error('Error exporting cadet data:', error);
      alert(`Error exporting cadet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Cadet Settings</h1>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 font-medium touch-manipulation min-h-[44px] min-w-[44px]"
          >
            Back
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Cadet Data</h2>
            
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Export all cadet information to an Excel spreadsheet. Includes a master list of all cadets sorted alphabetically with all available data fields.
              </p>
              <button
                onClick={handleExportCadetData}
                disabled={exporting}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                  exporting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                }`}
              >
                {exporting ? 'Exporting...' : 'Export Cadet Data'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
