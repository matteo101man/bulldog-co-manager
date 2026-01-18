import React, { useState, useEffect, Suspense } from 'react';
import CompanySelector from './components/CompanySelector';
import Login from './components/Login';
import PullToRefreshWrapper from './components/PullToRefreshWrapper';
import { Company } from './types';
import { isAuthenticated } from './services/authService';
import { 
  requestNotificationPermission, 
  isNotificationSupported,
  getNotificationPermission,
  onMessageListener 
} from './services/notificationService';

// Lazy load components for code splitting
const CompanyRoster = React.lazy(() => import('./components/CompanyRoster'));
const Settings = React.lazy(() => import('./components/Settings'));
const Issues = React.lazy(() => import('./components/Issues'));
const CadetsList = React.lazy(() => import('./components/CadetsList'));
const CadetProfile = React.lazy(() => import('./components/CadetProfile'));
const AddCadet = React.lazy(() => import('./components/AddCadet'));
const TrainingLanding = React.lazy(() => import('./components/TrainingLanding'));
const TrainingSchedule = React.lazy(() => import('./components/TrainingSchedule'));
const TrainingEventDetail = React.lazy(() => import('./components/TrainingEventDetail'));
const AddTrainingEvent = React.lazy(() => import('./components/AddTrainingEvent'));
const Attendance = React.lazy(() => import('./components/Attendance'));
const TacticsAttendance = React.lazy(() => import('./components/TacticsAttendance'));
const PTPlans = React.lazy(() => import('./components/PTPlans'));
const WeatherData = React.lazy(() => import('./components/WeatherData'));
const Forms = React.lazy(() => import('./components/Forms'));
const ExpenseRequestForm = React.lazy(() => import('./components/ExpenseRequestForm'));
const NotificationPrompt = React.lazy(() => import('./components/NotificationPrompt'));
const CadetSettings = React.lazy(() => import('./components/CadetSettings'));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-gray-600">Loading...</div>
  </div>
);

type View = 'companies' | 'issues' | 'cadets' | 'settings' | 'cadet-profile' | 'add-cadet' | 'cadet-settings' | 'training-landing' | 'training-schedule' | 'training-event-detail' | 'add-training-event' | 'attendance' | 'attendance-company' | 'tactics-attendance' | 'pt-plans' | 'weather-data' | 'forms' | 'expense-request-form';

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
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication status on mount
    setAuthenticated(isAuthenticated());
    setCheckingAuth(false);
    
    // Small delay to ensure DOM is ready
    setIsLoading(false);
    
    // Initialize notifications on app load (only if authenticated)
    if (isAuthenticated()) {
      initializeNotifications();
    }
  }, []);

  const handleLoginSuccess = () => {
    setAuthenticated(true);
    // Initialize notifications after successful login
    initializeNotifications();
  };

  // Handle service worker updates gracefully without forcing refreshes
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    async function checkForUpdates() {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // Check for updates but don't force activation
          // Only check, don't call update() which can trigger immediate activation
          if (registration.installing || registration.waiting) {
            // There's an update available, but we won't force it
            // The service worker will update on next page load naturally
            console.log('Service worker update available (will apply on next page load)');
          }
        }
      } catch (error) {
        console.error('Error checking for service worker updates:', error);
      }
    }

    // Only check when page becomes visible (user returns to tab)
    // This prevents aggressive checking that could cause refreshes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check once on initial load
    checkForUpdates();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  // Show loading while checking authentication
  if (checkingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (attendanceCompany && currentView === 'attendance-company') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
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
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (selectedCompany && currentView !== 'cadet-profile' && currentView !== 'attendance' && currentView !== 'pt-plans' && currentView !== 'attendance-company') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <CompanyRoster 
            key={`${selectedCompany}-${rosterRefreshKey}`}
            company={selectedCompany} 
            onBack={() => setSelectedCompany(null)}
            onSelectCadet={(cadetId) => {
              setSelectedCadetId(cadetId);
              setCurrentView('cadet-profile');
            }}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'settings') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <Settings onBack={() => setCurrentView('companies')} />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'issues') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <Issues onBack={() => setCurrentView('attendance')} />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'cadets') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <CadetsList
            onSelectCadet={(cadetId) => {
              setSelectedCadetId(cadetId);
              setCurrentView('cadet-profile');
            }}
            onBack={() => setCurrentView('companies')}
            onAddCadet={() => setCurrentView('add-cadet')}
            onSettings={() => setCurrentView('cadet-settings')}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'cadet-settings') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <CadetSettings onBack={() => setCurrentView('cadets')} />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'add-cadet') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <AddCadet
            onBack={() => setCurrentView('cadets')}
            onSuccess={() => setCurrentView('cadets')}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'training-landing') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <TrainingLanding
            onTrainingSchedule={() => setCurrentView('training-schedule')}
            onWeatherData={() => setCurrentView('weather-data')}
            onForms={() => setCurrentView('forms')}
            onBack={() => setCurrentView('companies')}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'training-schedule') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <TrainingSchedule
            key={scheduleRefreshKey}
            onSelectEvent={(eventId) => {
              setSelectedEventId(eventId);
              setCurrentView('training-event-detail');
            }}
            onAddEvent={() => setCurrentView('add-training-event')}
            onBack={() => setCurrentView('training-landing')}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'add-training-event') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <AddTrainingEvent
            onBack={() => setCurrentView('training-schedule')}
            onSuccess={() => {
              setScheduleRefreshKey(prev => prev + 1);
              setCurrentView('training-schedule');
            }}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'weather-data') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <WeatherData
            onBack={() => setCurrentView('training-landing')}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'training-event-detail' && selectedEventId) {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
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
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'attendance') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <Attendance
            onBack={() => setCurrentView('companies')}
            onSelectCompany={(company) => {
              setAttendanceCompany(company);
              setCurrentView('attendance-company');
            }}
            onTactics={() => setCurrentView('tactics-attendance')}
            onIssues={() => setCurrentView('issues')}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'tactics-attendance') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
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
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'pt-plans') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <PTPlans
            onBack={() => {
              setPTCompany(null);
              setCurrentView('companies');
            }}
            onSelectCompany={(company) => setPTCompany(company)}
            selectedCompany={ptCompany}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'forms') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <Forms
            onExpenseRequest={() => setCurrentView('expense-request-form')}
            onBack={() => setCurrentView('training-landing')}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'expense-request-form') {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
          <ExpenseRequestForm
            onBack={() => setCurrentView('forms')}
          />
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  if (currentView === 'cadet-profile' && selectedCadetId) {
    return (
      <PullToRefreshWrapper>
        <Suspense fallback={<LoadingFallback />}>
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
        </Suspense>
      </PullToRefreshWrapper>
    );
  }

  return (
    <PullToRefreshWrapper>
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
      <Suspense fallback={null}>
        <NotificationPrompt />
      </Suspense>
    </PullToRefreshWrapper>
  );
}

export default App;

