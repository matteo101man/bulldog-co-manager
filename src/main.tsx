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
  // Check for updates when page becomes visible (user reopens app)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Check for updates
        await registration.update();
        
        // If there's a waiting service worker, reload to get the new version
        if (registration.waiting) {
          // Force hard refresh by bypassing cache
          window.location.reload();
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
  });

  // Also check on initial load
  navigator.serviceWorker.ready.then(async (registration) => {
    // Check for updates
    await registration.update();
    
    // If there's a waiting service worker, reload immediately
    if (registration.waiting) {
      window.location.reload();
    }
    
    // Listen for new service worker installation
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          // When new service worker is installed and we have an active controller
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Force hard refresh to get the new version
            window.location.reload();
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

