import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCadetsByCompany, subscribeToCadets } from '../services/cadetService';
import { Cadet, Company } from '../types';

interface CadetsListProps {
  onSelectCadet: (cadetId: string) => void;
  onBack: () => void;
  onAddCadet?: () => void;
  onSettings?: () => void;
}

const COMPANIES: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Headquarters Company', 'Grizzly Company'];

export default function CadetsList({ onSelectCadet, onBack, onAddCadet, onSettings }: CadetsListProps) {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<Company>>(new Set(COMPANIES.filter(c => c !== 'Grizzly Company')));
  const [showContracted, setShowContracted] = useState(true);
  const [showUncontracted, setShowUncontracted] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);

  const loadCadets = useCallback(() => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    setLoading(true);
    
    // Safety timeout: ensure loading never gets stuck for more than 10 seconds
    loadingTimeoutRef.current = window.setTimeout(() => {
      console.warn('Loading timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000);

    // Unsubscribe from previous subscription if it exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Set up real-time listener for better performance
    const unsubscribe = subscribeToCadets(
      'Master',
      (updatedCadets) => {
        setCadets(updatedCadets);
        setLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      },
      (error) => {
        console.error('Error in cadets subscription:', error);
        // Fallback to one-time fetch
        getCadetsByCompany('Master').then(setCadets).catch(err => {
          console.error('Error loading cadets:', err);
          // Don't show alert on background errors, just log
          if (document.visibilityState === 'visible') {
            alert(`Error loading cadets: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }).finally(() => {
          setLoading(false);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
        });
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Initial load (will be fast due to cache)
    getCadetsByCompany('Master').then(setCadets).catch(error => {
      console.error('Error loading cadets:', error);
      // Don't show alert on background errors, just log
      if (document.visibilityState === 'visible') {
        alert(`Error loading cadets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }).finally(() => {
      setLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    loadCadets();

    // Handle visibility change - reload when app comes back to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App came back to foreground, reload data to ensure subscription is active
        console.log('App became visible, reloading cadets');
        loadCadets();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Toggle company filter
  const toggleCompany = (company: Company) => {
    setSelectedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(company)) {
        newSet.delete(company);
      } else {
        newSet.add(company);
      }
      return newSet;
    });
  };

  // Filter cadets based on search query and company (for summary stats)
  const companyFilteredCadets = cadets.filter(cadet => {
    // Company filter
    if (!selectedCompanies.has(cadet.company)) {
      return false;
    }

    // Search query filter
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

  // Filter cadets based on search query, company, and contracted status
  const filteredCadets = companyFilteredCadets.filter(cadet => {
    // Contracted status filter
    const isContracted = cadet.contracted === 'Y';
    if (isContracted && !showContracted) return false;
    if (!isContracted && !showUncontracted) return false;
    return true;
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 font-medium touch-manipulation px-3 py-2 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              Filter
            </button>
            {onSettings && (
              <button
                onClick={onSettings}
                className="text-sm text-blue-600 font-medium touch-manipulation px-3 py-2 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                Settings
              </button>
            )}
            <button
              onClick={onBack}
              className="text-sm text-blue-600 font-medium touch-manipulation"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              Home
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Filter Panel */}
            {showFilters && (
              <div className="mb-4 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-gray-500 hover:text-gray-700 touch-manipulation"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Company Filter */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Company</h3>
                  <div className="space-y-2">
                    {COMPANIES.map(company => (
                      <label
                        key={company}
                        className="flex items-center cursor-pointer touch-manipulation py-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanies.has(company)}
                          onChange={() => toggleCompany(company)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                        <span className="ml-3 text-sm text-gray-900">{company}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Contracted Status Filter */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Contracted Status</h3>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer touch-manipulation py-2">
                      <input
                        type="checkbox"
                        checked={showContracted}
                        onChange={(e) => setShowContracted(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="ml-3 text-sm text-gray-900">Contracted</span>
                    </label>
                    <label className="flex items-center cursor-pointer touch-manipulation py-2">
                      <input
                        type="checkbox"
                        checked={showUncontracted}
                        onChange={(e) => setShowUncontracted(e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="ml-3 text-sm text-gray-900">Uncontracted</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="mb-3">
                <label htmlFor="cadet-search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Cadets
                </label>
                <input
                  id="cadet-search"
                  type="text"
                  placeholder="Type a name to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-3 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                />
              </div>
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
                        {companyFilteredCadets.filter(c => c.contracted === 'Y').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Uncontracted:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {companyFilteredCadets.filter(c => c.contracted !== 'Y').length}
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

