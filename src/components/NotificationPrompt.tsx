import React, { useState, useEffect } from 'react';
import { 
  requestNotificationPermission, 
  isNotificationSupported,
  getNotificationPermission 
} from '../services/notificationService';

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and permission status
    if (!isNotificationSupported()) {
      return;
    }

    // Check if user dismissed the prompt recently (within last 7 days)
    const dismissedTime = localStorage.getItem('notificationPromptDismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setDismissed(true);
        return;
      }
    }

    const permission = getNotificationPermission();
    
    // Only show prompt if permission is default (not granted or denied)
    // And if user hasn't dismissed it
    if (permission === 'default' && !dismissed) {
      // Wait a bit before showing prompt (better UX)
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  async function handleEnableNotifications() {
    setIsRequesting(true);
    try {
      await requestNotificationPermission();
      setShowPrompt(false);
      // Show success message briefly
      alert('Notifications enabled! You will now receive push notifications.');
    } catch (error) {
      console.error('Error enabling notifications:', error);
      alert(`Could not enable notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRequesting(false);
    }
  }

  function handleDismiss() {
    setShowPrompt(false);
    setDismissed(true);
    // Store dismissal in localStorage so it doesn't show again for a while
    localStorage.setItem('notificationPromptDismissed', Date.now().toString());
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 safe-area-inset-bottom">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Enable Notifications
            </h3>
            <p className="text-xs text-gray-600">
              Get notified about important updates and announcements from Bulldog CO Manager.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 ml-2"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEnableNotifications}
            disabled={isRequesting}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium text-white touch-manipulation min-h-[44px] ${
              isRequesting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isRequesting ? 'Enabling...' : 'Enable Notifications'}
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-4 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 touch-manipulation min-h-[44px]"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

