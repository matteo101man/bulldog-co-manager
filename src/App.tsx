import React, { useState, useEffect } from 'react';
import CompanySelector from './components/CompanySelector';
import CompanyRoster from './components/CompanyRoster';
import Settings from './components/Settings';
import Issues from './components/Issues';
import CadetsList from './components/CadetsList';
import CadetProfile from './components/CadetProfile';
import AddCadet from './components/AddCadet';
import TrainingLanding from './components/TrainingLanding';
import TrainingSchedule from './components/TrainingSchedule';
import TrainingEventDetail from './components/TrainingEventDetail';
import AddTrainingEvent from './components/AddTrainingEvent';
import Attendance from './components/Attendance';
import TacticsAttendance from './components/TacticsAttendance';
import PTPlans from './components/PTPlans';
import WeatherData from './components/WeatherData';
import NotificationPrompt from './components/NotificationPrompt';
import { Company } from './types';
import { 
  requestNotificationPermission, 
  isNotificationSupported,
  getNotificationPermission,
  onMessageListener 
} from './services/notificationService';

type View = 'companies' | 'issues' | 'cadets' | 'settings' | 'cadet-profile' | 'add-cadet' | 'training-landing' | 'training-schedule' | 'training-event-detail' | 'add-training-event' | 'attendance' | 'attendance-company' | 'tactics-attendance' | 'pt-plans' | 'weather-data';

function App() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [currentView, setCurrentView] = useState<View>('companies');
  const [selectedCadetId, setSelectedCadetId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendanceCompany, setAttendanceCompany] = useState<Company | null>(null);
  const [ptCompany, setPTCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rosterRefreshKey, setRosterRefreshKey] = useState(0);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const [fromTactics, setFromTactics] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    setIsLoading(false);
    
    // Initialize notifications on app load
    initializeNotifications();
  }, []);

  async function initializeNotifications() {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Check if notifications are supported
    if (!isNotificationSupported()) {
      console.log('Notifications not supported in this browser');
      return;
    }

    // If permission is already granted, register the token automatically
    const permission = getNotificationPermission();
    if (permission === 'granted') {
      try {
        // Request token to register this device
        await requestNotificationPermission();
        console.log('Notification token registered');
        
        // Set up listener for foreground messages
        onMessageListener()
          .then((payload) => {
            if (payload) {
              console.log('Foreground message received:', payload);
              // Show notification even when app is in foreground
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(payload.notification?.title || 'Bulldog CO Manager', {
                  body: payload.notification?.body || payload.data?.message,
                  icon: '/web-app-manifest-192x192.png',
                  tag: 'bulldog-notification'
                });
              }
            }
          })
          .catch((err) => {
            console.error('Error setting up message listener:', err);
          });
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (attendanceCompany && currentView === 'attendance-company') {
    return (
      <CompanyRoster 
        key={`${attendanceCompany}-${rosterRefreshKey}`}
        company={attendanceCompany} 
        onBack={() => {
          setAttendanceCompany(null);
          setCurrentView('attendance');
        }}
        onSelectCadet={(cadetId) => {
          setSelectedCadetId(cadetId);
          setCurrentView('cadet-profile');
        }}
      />
    );
  }

  if (selectedCompany && currentView !== 'cadet-profile' && currentView !== 'attendance' && currentView !== 'pt-plans' && currentView !== 'attendance-company') {
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
    return <Issues onBack={() => setCurrentView('attendance')} />;
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

  if (currentView === 'training-landing') {
    return (
      <TrainingLanding
        onTrainingSchedule={() => setCurrentView('training-schedule')}
        onWeatherData={() => setCurrentView('weather-data')}
        onBack={() => setCurrentView('companies')}
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
        onBack={() => setCurrentView('training-landing')}
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

  if (currentView === 'weather-data') {
    return (
      <WeatherData
        onBack={() => setCurrentView('training-landing')}
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

  if (currentView === 'attendance') {
    return (
      <Attendance
        onBack={() => setCurrentView('companies')}
        onSelectCompany={(company) => {
          setAttendanceCompany(company);
          setCurrentView('attendance-company');
        }}
        onTactics={() => setCurrentView('tactics-attendance')}
        onIssues={() => setCurrentView('issues')}
      />
    );
  }

  if (currentView === 'tactics-attendance') {
    return (
      <TacticsAttendance
        onBack={() => {
          setFromTactics(false);
          setCurrentView('attendance');
        }}
        onSelectCadet={(cadetId) => {
          setSelectedCadetId(cadetId);
          setFromTactics(true);
          setCurrentView('cadet-profile');
        }}
      />
    );
  }

  if (currentView === 'pt-plans') {
    return (
      <PTPlans
        onBack={() => {
          setPTCompany(null);
          setCurrentView('companies');
        }}
        onSelectCompany={(company) => setPTCompany(company)}
        selectedCompany={ptCompany}
      />
    );
  }

  if (currentView === 'cadet-profile' && selectedCadetId) {
    return (
      <CadetProfile
        cadetId={selectedCadetId}
        onBack={() => {
          // If we came from attendance, go back to attendance
          if (attendanceCompany) {
            setCurrentView('attendance-company');
            // Don't clear attendanceCompany so we can return to it
          } else if (fromTactics) {
            setFromTactics(false);
            setCurrentView('tactics-attendance');
          } else if (selectedCompany) {
            setCurrentView('companies');
            // Don't clear selectedCompany so we can return to it
          } else {
            setCurrentView('cadets');
          }
        }}
        onDelete={() => {
          if (attendanceCompany) {
            setAttendanceCompany(null);
            setCurrentView('attendance');
          } else if (selectedCompany) {
            setSelectedCompany(null);
            setCurrentView('companies');
          } else {
            setCurrentView('cadets');
          }
          setSelectedCadetId(null);
        }}
        onCompanyChange={(oldCompany, newCompany) => {
          // Refresh the roster if we're viewing the old or new company
          if (selectedCompany === oldCompany || selectedCompany === newCompany || attendanceCompany === oldCompany || attendanceCompany === newCompany) {
            setRosterRefreshKey(prev => prev + 1);
          }
        }}
      />
    );
  }

  return (
    <>
      <CompanySelector 
        onSelect={(company) => {
          setSelectedCompany(company);
          setCurrentView('companies');
        }}
        onSettings={() => setCurrentView('settings')}
        onCadets={() => setCurrentView('cadets')}
        onTrainingSchedule={() => setCurrentView('training-landing')}
        onAttendance={() => setCurrentView('attendance')}
        onPT={() => setCurrentView('pt-plans')}
      />
      <NotificationPrompt />
    </>
  );
}

export default App;

