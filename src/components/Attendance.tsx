import React, { useState } from 'react';
import { Company } from '../types';
import { exportAttendanceToExcel } from '../services/attendanceExportService';

interface AttendanceProps {
  onBack: () => void;
  onSelectCompany: (company: Company) => void;
  onTactics: () => void;
  onIssues: () => void;
}

const COMPANIES: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Master'];

type Tab = 'companies' | 'tactics' | 'issues' | 'settings';

export default function Attendance({ onBack, onSelectCompany, onTactics, onIssues }: AttendanceProps) {
  const [activeTab, setActiveTab] = useState<Tab>('companies');
  const [exportingAttendance, setExportingAttendance] = useState(false);

  async function handleExportAttendance() {
    setExportingAttendance(true);
    try {
      await exportAttendanceToExcel();
      alert('Attendance exported successfully! The Excel file has been downloaded.');
    } catch (error) {
      console.error('Error exporting attendance:', error);
      alert(`Error exporting attendance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExportingAttendance(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              Attendance
            </h1>
            <button
              onClick={() => setActiveTab('settings')}
              className={`text-sm font-medium touch-manipulation min-h-[44px] px-3 ${
                activeTab === 'settings'
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
          </div>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 font-medium touch-manipulation min-h-[44px] min-w-[44px]"
          >
            Back
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-t border-gray-200">
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex-1 px-4 py-3 text-sm font-medium touch-manipulation min-h-[44px] ${
              activeTab === 'companies'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Companies
          </button>
          <button
            onClick={onTactics}
            className="flex-1 px-4 py-3 text-sm font-medium touch-manipulation min-h-[44px] text-gray-600 hover:text-gray-900"
          >
            Tactics
          </button>
          <button
            onClick={onIssues}
            className="flex-1 px-4 py-3 text-sm font-medium touch-manipulation min-h-[44px] text-gray-600 hover:text-gray-900"
          >
            Issues
          </button>
        </div>
      </header>

      <main className="px-4 py-4">
        {activeTab === 'companies' && (
          <>
            <p className="text-center text-gray-600 mb-6">
              Select a company to handle attendance
            </p>
            <div className="space-y-3">
              {COMPANIES.map((company) => (
                <button
                  key={company}
                  onClick={() => onSelectCompany(company)}
                  className="w-full bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
                >
                  <span className="text-lg font-semibold text-gray-900">
                    {company === 'Master' ? 'Master List' : `${company} Company`}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Attendance</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Export attendance data to an Excel spreadsheet. Includes all cadets grouped by MS level with dates from January 20, 2026 to April 23, 2026.
                </p>
                <button
                  onClick={handleExportAttendance}
                  disabled={exportingAttendance}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                    exportingAttendance
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                  }`}
                >
                  {exportingAttendance ? 'Exporting...' : 'Export Attendance'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

