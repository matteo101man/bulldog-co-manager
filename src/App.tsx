import React, { useState, useEffect } from 'react';
import CompanySelector from './components/CompanySelector';
import CompanyRoster from './components/CompanyRoster';
import Settings from './components/Settings';
import Issues from './components/Issues';
import CadetsList from './components/CadetsList';
import CadetProfile from './components/CadetProfile';
import AddCadet from './components/AddCadet';
import TrainingSchedule from './components/TrainingSchedule';
import TrainingEventDetail from './components/TrainingEventDetail';
import AddTrainingEvent from './components/AddTrainingEvent';
import { Company } from './types';

type View = 'companies' | 'issues' | 'cadets' | 'settings' | 'cadet-profile' | 'add-cadet' | 'training-schedule' | 'training-event-detail' | 'add-training-event';

function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentView, setCurrentView] = useState<View>('companies');
  const [selectedCadetId, setSelectedCadetId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rosterRefreshKey, setRosterRefreshKey] = useState(0);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

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

  if (selectedCompany && currentView !== 'cadet-profile') {
    return (
      <CompanyRoster 
        key={`${selectedCompany}-${rosterRefreshKey}`}
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

  if (currentView === 'training-schedule') {
    return (
      <TrainingSchedule
        key={scheduleRefreshKey}
        onSelectEvent={(eventId) => {
          setSelectedEventId(eventId);
          setCurrentView('training-event-detail');
        }}
        onAddEvent={() => setCurrentView('add-training-event')}
        onBack={() => setCurrentView('companies')}
      />
    );
  }

  if (currentView === 'add-training-event') {
    return (
      <AddTrainingEvent
        onBack={() => setCurrentView('training-schedule')}
        onSuccess={() => {
          setScheduleRefreshKey(prev => prev + 1);
          setCurrentView('training-schedule');
        }}
      />
    );
  }

  if (currentView === 'training-event-detail' && selectedEventId) {
    return (
      <TrainingEventDetail
        eventId={selectedEventId}
        onBack={() => {
          setSelectedEventId(null);
          setCurrentView('training-schedule');
        }}
        onRefresh={() => {
          setScheduleRefreshKey(prev => prev + 1);
        }}
      />
    );
  }

  if (currentView === 'cadet-profile' && selectedCadetId) {
    return (
      <CadetProfile
        cadetId={selectedCadetId}
        onBack={() => {
          // If we came from a company, go back to that company
          if (selectedCompany) {
            setCurrentView('companies');
            // Don't clear selectedCompany so we can return to it
          } else {
            setCurrentView('cadets');
          }
        }}
        onDelete={() => {
          if (selectedCompany) {
            setSelectedCompany(null);
            setCurrentView('companies');
          } else {
            setCurrentView('cadets');
          }
          setSelectedCadetId(null);
        }}
        onCompanyChange={(oldCompany, newCompany) => {
          // Refresh the roster if we're viewing the old or new company
          if (selectedCompany === oldCompany || selectedCompany === newCompany) {
            setRosterRefreshKey(prev => prev + 1);
          }
        }}
      />
    );
  }

  return (
    <CompanySelector 
      onSelect={setSelectedCompany} 
      onSettings={() => setCurrentView('settings')}
      onIssues={() => setCurrentView('issues')}
      onCadets={() => setCurrentView('cadets')}
      onTrainingSchedule={() => setCurrentView('training-schedule')}
    />
  );
}

export default App;

