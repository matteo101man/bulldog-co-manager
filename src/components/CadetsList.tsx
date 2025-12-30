import React, { useState, useEffect } from 'react';
import { getCadetsByCompany } from '../services/cadetService';
import { Cadet } from '../types';

interface CadetsListProps {
  onSelectCadet: (cadetId: string) => void;
  onBack: () => void;
  onAddCadet?: () => void;
}

export default function CadetsList({ onSelectCadet, onBack, onAddCadet }: CadetsListProps) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCadets();
  }, []);

  async function loadCadets() {
    setLoading(true);
    try {
      const allCadets = await getCadetsByCompany('Master');
      setCadets(allCadets);
    } catch (error) {
      console.error('Error loading cadets:', error);
      alert(`Error loading cadets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  // Filter cadets based on search query
  const filteredCadets = cadets.filter(cadet => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const fullName = `${cadet.firstName} ${cadet.lastName}`.toLowerCase();
    const lastNameFirst = `${cadet.lastName}, ${cadet.firstName}`.toLowerCase();
    return (
      cadet.firstName.toLowerCase().includes(query) ||
      cadet.lastName.toLowerCase().includes(query) ||
      fullName.includes(query) ||
      lastNameFirst.includes(query)
    );
  });

  // Group cadets by MS level and sort alphabetically
  const groupedByLevel = new Map<string, Cadet[]>();
  filteredCadets.forEach(cadet => {
    const level = cadet.militaryScienceLevel || 'Unknown';
    if (!groupedByLevel.has(level)) {
      groupedByLevel.set(level, []);
    }
    groupedByLevel.get(level)!.push(cadet);
  });

  // Sort each level's cadets alphabetically
  groupedByLevel.forEach((cadetList, level) => {
    cadetList.sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  });

  // Sort levels (MS1, MS2, MS3, MS4)
  const sortedLevels = Array.from(groupedByLevel.keys()).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    const aNum = parseInt(a.replace('MS', ''));
    const bNum = parseInt(b.replace('MS', ''));
    return aNum - bNum;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Cadets</h1>
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
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-3 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 mb-3"
              />
              <button
                onClick={() => onAddCadet?.()}
                className="w-full py-3 px-4 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 touch-manipulation min-h-[44px]"
              >
                Add Cadet
              </button>
            </div>
            <div className="space-y-4">
            {sortedLevels.length > 0 ? (
              sortedLevels.map(level => {
                const levelCadets = groupedByLevel.get(level)!;
                if (levelCadets.length === 0) return null;
                return (
                  <div key={level}>
                    <div className="bg-gray-100 border-b-2 border-gray-300 px-4 py-2 mb-2 rounded-t-lg">
                      <h3 className="font-bold text-gray-900 text-sm">{level}</h3>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {levelCadets.map((cadet) => (
                        <button
                          key={cadet.id}
                          onClick={() => onSelectCadet(cadet.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium text-gray-900">
                            {cadet.lastName}, {cadet.firstName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery.trim() ? 'No cadets found matching your search.' : 'No cadets found.'}
              </div>
            )}
            </div>
            
            {/* Summary Statistics */}
            <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {searchQuery.trim() ? 'Matching Cadets:' : 'Total Cadets:'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{filteredCadets.length}</span>
                </div>
                {!searchQuery.trim() && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Contracted:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {cadets.filter(c => c.contracted === 'Y').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Uncontracted:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {cadets.filter(c => c.contracted !== 'Y').length}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

