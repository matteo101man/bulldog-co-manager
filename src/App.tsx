import React, { useState, useEffect } from 'react';
import CompanySelector from './components/CompanySelector';
import CompanyRoster from './components/CompanyRoster';
import Settings from './components/Settings';
import Issues from './components/Issues';
import CadetsList from './components/CadetsList';
import CadetProfile from './components/CadetProfile';
import AddCadet from './components/AddCadet';
import { Company } from './types';

type View = 'companies' | 'issues' | 'cadets' | 'settings' | 'cadet-profile' | 'add-cadet';

function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentView, setCurrentView] = useState<View>('companies');
  const [selectedCadetId, setSelectedCadetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Handle cadet profile view even when coming from company roster
  if (currentView === 'cadet-profile' && selectedCadetId) {
    return (
      <CadetProfile
        cadetId={selectedCadetId}
        onBack={() => {
          // If we came from a company, go back to that company
          if (selectedCompany) {
            setCurrentView('companies');
          } else {
            setCurrentView('cadets');
          }
        }}
        onDelete={() => {
          if (selectedCompany) {
            setCurrentView('companies');
          } else {
            setCurrentView('cadets');
          }
          setSelectedCadetId(null);
        }}
      />
    );
  }

  if (selectedCompany) {
    return (
      <CompanyRoster 
        company={selectedCompany} 
        onBack={() => setSelectedCompany(null)}
        onSelectCadet={(cadetId) => {
          setSelectedCadetId(cadetId);
          setCurrentView('cadet-profile');
        }}
      />
    );
  }

  if (currentView === 'settings') {
    return <Settings onBack={() => setCurrentView('companies')} />;
  }

  if (currentView === 'issues') {
    return <Issues onBack={() => setCurrentView('companies')} />;
  }

  if (currentView === 'cadets') {
    return (
      <CadetsList
        onSelectCadet={(cadetId) => {
          setSelectedCadetId(cadetId);
          setCurrentView('cadet-profile');
        }}
        onBack={() => setCurrentView('companies')}
        onAddCadet={() => setCurrentView('add-cadet')}
      />
    );
  }

  if (currentView === 'add-cadet') {
    return (
      <AddCadet
        onBack={() => setCurrentView('cadets')}
        onSuccess={() => setCurrentView('cadets')}
      />
    );
  }

  return (
    <CompanySelector 
      onSelect={setSelectedCompany} 
      onSettings={() => setCurrentView('settings')}
      onIssues={() => setCurrentView('issues')}
      onCadets={() => setCurrentView('cadets')}
    />
  );
}

export default App;

