import React, { useState } from 'react';
import CompanySelector from './components/CompanySelector';
import CompanyRoster from './components/CompanyRoster';
import { Company } from './types';

function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

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

