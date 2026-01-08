import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Unregister service worker in development mode to prevent caching issues
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

// Check for service worker updates and force refresh if needed (production only)
if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  // Use sessionStorage to prevent infinite reload loops
  const RELOAD_KEY = 'sw-reload-attempted';
  let reloadInProgress = false;
  
  function checkAndReload(registration: ServiceWorkerRegistration) {
    // Prevent multiple reload attempts
    if (reloadInProgress || sessionStorage.getItem(RELOAD_KEY)) {
      return;
    }
    
    if (registration.waiting) {
      reloadInProgress = true;
      sessionStorage.setItem(RELOAD_KEY, 'true');
      // Clear the flag after a delay to allow future updates
      setTimeout(() => {
        sessionStorage.removeItem(RELOAD_KEY);
      }, 30000); // Clear after 30 seconds
      window.location.reload();
    }
  }
  
  // Check for updates when page becomes visible (user reopens app)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Check for updates
        await registration.update();
        // Check if we need to reload
        checkAndReload(registration);
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
  });

  // Check on initial load
  navigator.serviceWorker.ready.then(async (registration) => {
    // Check for updates
    await registration.update();
    
    // Check if there's already a waiting service worker
    checkAndReload(registration);
    
    // Listen for new service worker installation
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          // When new service worker is installed and we have an active controller
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            checkAndReload(registration);
          }
        });
      }
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

