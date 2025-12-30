import React, { useState, useEffect } from 'react';
import { clearAllAttendance } from '../services/attendanceService';
import { 
  sendNotificationToAll, 
  requestNotificationPermission, 
  isNotificationSupported,
  getNotificationPermission 
} from '../services/notificationService';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [clearing, setClearing] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setNotificationSupported(isNotificationSupported());
    setNotificationPermission(getNotificationPermission());
  }, []);

  async function handleClearDatabase() {
    const confirmed = window.confirm(
      'Are you sure you want to clear all attendance data? This will reset all attendance records to blank (—). This action cannot be undone.'
    );

    if (!confirmed) return;

    setClearing(true);
    try {
      await clearAllAttendance();
      alert('All attendance data has been cleared successfully.');
    } catch (error) {
      console.error('Error clearing database:', error);
      alert(`Error clearing database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setClearing(false);
    }
  }

  async function handleSendNotification() {
    if (!notificationMessage.trim()) {
      alert('Please enter a message to send.');
      return;
    }

    setSending(true);
    try {
      // If notifications are not enabled, try to request permission
      if (notificationPermission !== 'granted' && notificationSupported) {
        try {
          await requestNotificationPermission();
          setNotificationPermission('granted');
        } catch (error) {
          console.warn('Could not request notification permission:', error);
        }
      }

      await sendNotificationToAll(notificationMessage.trim());
      alert('Notification sent successfully!');
      setNotificationMessage('');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`Error sending notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 font-medium touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Home
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Management</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Clear all attendance data. This will reset all attendance records to blank (—) for all cadets and all weeks.
              </p>
              <button
                onClick={handleClearDatabase}
                disabled={clearing}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                  clearing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                }`}
              >
                {clearing ? 'Clearing...' : 'Clear Database'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Notification</h2>
          
          <div className="space-y-4">
            {!notificationSupported && (
              <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                Push notifications are not supported in this browser.
              </p>
            )}
            
            {notificationSupported && notificationPermission === 'denied' && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                Notification permission has been denied. Please enable notifications in your browser settings.
              </p>
            )}

            <div>
              <label htmlFor="notificationMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="notificationMessage"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter your notification message here..."
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
                disabled={sending}
              />
            </div>

            <button
              onClick={handleSendNotification}
              disabled={sending || !notificationMessage.trim()}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                sending || !notificationMessage.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {sending ? 'Sending...' : 'Send Notification'}
            </button>

            <p className="text-xs text-gray-500">
              This will send a push notification to all users who have enabled notifications.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

