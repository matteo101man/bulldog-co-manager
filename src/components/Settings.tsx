import React, { useState, useEffect, useRef } from 'react';
import { 
  sendNotificationToAll, 
  requestNotificationPermission, 
  isNotificationSupported,
  getNotificationPermission 
} from '../services/notificationService';
import { 
  exportDatabase, 
  downloadBackup, 
  importDatabase, 
  readBackupFile 
} from '../services/backupService';
import { logout } from '../services/authService';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotificationSupported(isNotificationSupported());
    setNotificationPermission(getNotificationPermission());
  }, []);

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

  async function handleExportDatabase() {
    setExporting(true);
    try {
      const backup = await exportDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      downloadBackup(backup, `bulldog-co-manager-backup-${timestamp}.json`);
      alert('Database exported successfully! The backup file has been downloaded.');
    } catch (error) {
      console.error('Error exporting database:', error);
      alert(`Error exporting database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleImportDatabase() {
    if (!fileInputRef.current) return;

    const file = fileInputRef.current.files?.[0];
    if (!file) {
      alert('Please select a backup file to import.');
      return;
    }

    const confirmed = window.confirm(
      'WARNING: This will replace all existing data with the backup data. This action cannot be undone. Are you sure you want to continue?'
    );

    if (!confirmed) {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setImporting(true);
    try {
      const backup = await readBackupFile(file);
      await importDatabase(backup, true);
      alert('Database imported successfully! The page will now reload to show the restored data.');
      // Reload the page to show the restored data
      window.location.reload();
    } catch (error) {
      console.error('Error importing database:', error);
      alert(`Error importing database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleImportButtonClick() {
    fileInputRef.current?.click();
  }

  function handleLogout() {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      logout();
      // Reload the page to trigger authentication check
      window.location.reload();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-area-inset-bottom">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <button
            onClick={onBack}
            className="text-sm text-blue-600 font-medium touch-manipulation min-h-[44px] min-w-[44px]"
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
                Export all database data to a JSON backup file. This includes cadets, attendance records, PT plans, training events, and notifications.
              </p>
              <button
                onClick={handleExportDatabase}
                disabled={exporting}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                  exporting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
                {exporting ? 'Exporting...' : 'Export Database'}
              </button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-2">
                Import a backup file to restore the database. This will replace all existing data with the backup data.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportDatabase}
                className="hidden"
                aria-label="Import database backup file"
                title="Import database backup file"
              />
              <button
                onClick={handleImportButtonClick}
                disabled={importing}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white touch-manipulation min-h-[44px] ${
                  importing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800'
                }`}
              >
                {importing ? 'Importing...' : 'Import Database'}
              </button>
              <p className="text-xs text-red-600 mt-2">
                ⚠️ Warning: Importing will replace all existing data. Make sure to export a backup first if you want to keep current data.
              </p>
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          
          <div className="space-y-4">
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 touch-manipulation min-h-[44px]"
            >
              Log Out
            </button>
            <p className="text-xs text-gray-500">
              Log out of your account. You will need to sign in again to access the application.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

