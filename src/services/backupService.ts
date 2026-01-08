import { collection, getDocs, writeBatch, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface BackupData {
  version: string;
  timestamp: string;
  collections: {
    cadets?: any[];
    attendance?: any[];
    ptPlans?: any[];
    trainingEvents?: any[];
    pushSubscriptions?: any[];
    notificationRequests?: any[];
  };
}

const COLLECTIONS_TO_BACKUP = [
  'cadets',
  'attendance',
  'ptPlans',
  'trainingEvents',
  'pushSubscriptions',
  'notificationRequests'
];

/**
 * Export all Firestore collections to a JSON backup file
 */
export async function exportDatabase(): Promise<BackupData> {
  const backup: BackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    collections: {}
  };

  // Export each collection
  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const documents = querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));
      
      // Convert Firestore Timestamps to ISO strings for JSON serialization
      const serialized = documents.map(doc => {
        const serializedDoc: any = { id: doc.id };
        for (const [key, value] of Object.entries(doc)) {
          if (key === 'id') continue;
          if (value && typeof value === 'object' && 'toDate' in value) {
            // Firestore Timestamp
            serializedDoc[key] = (value as any).toDate().toISOString();
          } else if (value && typeof value === 'object' && value.constructor === Object) {
            // Nested object - recursively serialize
            serializedDoc[key] = serializeValue(value);
          } else {
            serializedDoc[key] = value;
          }
        }
        return serializedDoc;
      });

      (backup.collections as any)[collectionName] = serialized;
    } catch (error) {
      console.error(`Error exporting collection ${collectionName}:`, error);
      // Continue with other collections even if one fails
    }
  }

  return backup;
}

/**
 * Helper function to recursively serialize Firestore Timestamps
 */
function serializeValue(value: any): any {
  if (value && typeof value === 'object') {
    if ('toDate' in value) {
      // Firestore Timestamp
      return (value as any).toDate().toISOString();
    } else if (Array.isArray(value)) {
      return value.map(item => serializeValue(item));
    } else {
      const serialized: any = {};
      for (const [key, val] of Object.entries(value)) {
        serialized[key] = serializeValue(val);
      }
      return serialized;
    }
  }
  return value;
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(backup: BackupData, filename?: string): void {
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import backup from JSON file
 */
export async function importDatabase(backup: BackupData, replaceExisting: boolean = false): Promise<void> {
  if (!backup.collections) {
    throw new Error('Invalid backup file: missing collections');
  }

  const batch = writeBatch(db);
  let batchCount = 0;
  const BATCH_LIMIT = 500; // Firestore batch limit

  // Process each collection
  for (const [collectionName, documents] of Object.entries(backup.collections)) {
    if (!documents || !Array.isArray(documents)) {
      continue;
    }

    // If replacing, delete existing documents first
    if (replaceExisting) {
      try {
        const existingSnapshot = await getDocs(collection(db, collectionName));
        const deleteBatch = writeBatch(db);
        let deleteCount = 0;
        
        existingSnapshot.docs.forEach(docSnapshot => {
          if (deleteCount < BATCH_LIMIT) {
            deleteBatch.delete(docSnapshot.ref);
            deleteCount++;
          }
        });
        
        if (deleteCount > 0) {
          await deleteBatch.commit();
        }
      } catch (error) {
        console.error(`Error deleting existing documents from ${collectionName}:`, error);
      }
    }

    // Import documents
    for (const document of documents) {
      if (!document.id) {
        console.warn(`Skipping document in ${collectionName} without id:`, document);
        continue;
      }

      const docRef = doc(db, collectionName, document.id);
      const { id, ...data } = document;
      
      // Deserialize ISO date strings back to Firestore Timestamps if needed
      const deserializedData = deserializeValue(data);
      
      batch.set(docRef, deserializedData);
      batchCount++;

      // Commit batch if we hit the limit
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  // Commit any remaining writes
  if (batchCount > 0) {
    await batch.commit();
  }
}

/**
 * Helper function to deserialize ISO date strings back to Firestore Timestamps
 * This ensures date fields work correctly with Firestore queries
 */
function deserializeValue(value: any): any {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const deserialized: any = {};
    for (const [key, val] of Object.entries(value)) {
      // Check if it looks like an ISO date string
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        try {
          // Convert ISO string to Firestore Timestamp
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            deserialized[key] = Timestamp.fromDate(date);
          } else {
            deserialized[key] = val; // Keep as string if invalid date
          }
        } catch {
          deserialized[key] = val; // Keep as string if conversion fails
        }
      } else if (Array.isArray(val)) {
        deserialized[key] = val.map(item => deserializeValue(item));
      } else if (val && typeof val === 'object') {
        deserialized[key] = deserializeValue(val);
      } else {
        deserialized[key] = val;
      }
    }
    return deserialized;
  } else if (Array.isArray(value)) {
    return value.map(item => deserializeValue(item));
  }
  return value;
}

/**
 * Read backup file from File object
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const backup = JSON.parse(text) as BackupData;
        
        // Validate backup structure
        if (!backup.timestamp || !backup.collections) {
          reject(new Error('Invalid backup file format'));
          return;
        }
        
        resolve(backup);
      } catch (error) {
        reject(new Error(`Failed to parse backup file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read backup file'));
    };
    reader.readAsText(file);
  });
}
