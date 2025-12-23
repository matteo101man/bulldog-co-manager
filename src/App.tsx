import React, { useState, useEffect } from 'react';
import CompanySelector from './components/CompanySelector';
import CompanyRoster from './components/CompanyRoster';
import { Company } from './types';

function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
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

  if (!selectedCompany) {
    return <CompanySelector onSelect={setSelectedCompany} />;
  }

  return (
    <CompanyRoster 
      company={selectedCompany} 
      onBack={() => setSelectedCompany(null)} 
    />
  );
}

export default App;

