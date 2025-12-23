import React, { useState, useEffect } from 'react';
import CompanySelector from './components/CompanySelector';
import CompanyRoster from './components/CompanyRoster';
import Settings from './components/Settings';
import { Company } from './types';

type View = 'companies' | 'settings';

function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentView, setCurrentView] = useState<View>('companies');
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

  if (selectedCompany) {
    return (
      <CompanyRoster 
        company={selectedCompany} 
        onBack={() => setSelectedCompany(null)} 
      />
    );
  }

  if (currentView === 'settings') {
    return <Settings onBack={() => setCurrentView('companies')} />;
  }

  return <CompanySelector onSelect={setSelectedCompany} onSettings={() => setCurrentView('settings')} />;
}

export default App;

