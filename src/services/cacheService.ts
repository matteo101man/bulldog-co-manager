/**
 * Client-side caching service using IndexedDB
 * This reduces server load and improves performance by caching frequently accessed data
 */

const DB_NAME = 'ROTC_Cache';
const DB_VERSION = 1;

// Store names
const STORES = {
  CADETS: 'cadets',
  ATTENDANCE: 'attendance',
  TRAINING_EVENTS: 'trainingEvents',
  METADATA: 'metadata'
} as const;

interface CacheMetadata {
  key: string;
  lastUpdated: number;
  version: number;
}

class CacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.CADETS)) {
          const cadetsStore = db.createObjectStore(STORES.CADETS, { keyPath: 'id' });
          cadetsStore.createIndex('company', 'company', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
          const attendanceStore = db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id' });
          attendanceStore.createIndex('weekStartDate', 'weekStartDate', { unique: false });
          attendanceStore.createIndex('cadetId', 'cadetId', { unique: false });
          attendanceStore.createIndex('weekAndCadet', ['weekStartDate', 'cadetId'], { unique: true });
        }

        if (!db.objectStoreNames.contains(STORES.TRAINING_EVENTS)) {
          db.createObjectStore(STORES.TRAINING_EVENTS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get cached cadets by company
   * If company is 'Master', returns all cadets
   */
  async getCachedCadets(company: string): Promise<any[] | null> {
    try {
      await this.init();
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORES.CADETS], 'readonly');
        const store = transaction.objectStore(STORES.CADETS);
        
        let request: IDBRequest;
        
        if (company === 'Master') {
          // Get all cadets
          request = store.getAll();
        } else {
          // Get cadets for specific company
          const index = store.index('company');
          request = index.getAll(company);
        }

        request.onsuccess = () => {
          let cadets = request.result;
          
          resolve(cadets.length > 0 ? cadets : null);
        };

        request.onerror = () => {
          console.error('Error reading cached cadets:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  }

  /**
   * Cache cadets
   */
  async cacheCadets(cadets: any[]): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      const transaction = this.db.transaction([STORES.CADETS], 'readwrite');
      const store = transaction.objectStore(STORES.CADETS);

      // Clear existing cadets for these companies
      const companies = new Set(cadets.map(c => c.company));
      await Promise.all(
        Array.from(companies).map(company =>
          new Promise<void>((resolve) => {
            const index = store.index('company');
            const request = index.openKeyCursor(IDBKeyRange.only(company));
            const keysToDelete: string[] = [];

            request.onsuccess = (e) => {
              const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                keysToDelete.push(cursor.primaryKey as string);
                cursor.continue();
              } else {
                // Delete all keys
                Promise.all(keysToDelete.map(key => {
                  return new Promise<void>((resolve) => {
                    const deleteRequest = store.delete(key);
                    deleteRequest.onsuccess = () => resolve();
                    deleteRequest.onerror = () => resolve();
                  });
                })).then(() => resolve());
              }
            };

            request.onerror = () => resolve();
          })
        )
      );

      // Add new cadets
      await Promise.all(
        cadets.map(cadet =>
          new Promise<void>((resolve, reject) => {
            const request = store.put(cadet);
            request.onsuccess = () => resolve();
            request.onerror = () => {
              console.error('Error caching cadet:', request.error);
              resolve(); // Don't fail on individual errors
            };
          })
        )
      );

      // Update metadata
      await this.updateMetadata('cadets', Date.now());
    } catch (error) {
      console.error('Error caching cadets:', error);
    }
  }

  /**
   * Get cached attendance for a week
   */
  async getCachedAttendance(weekStartDate: string): Promise<Map<string, any> | null> {
    try {
      await this.init();
      if (!this.db) return null;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORES.ATTENDANCE], 'readonly');
        const store = transaction.objectStore(STORES.ATTENDANCE);
        const index = store.index('weekStartDate');
        const request = index.getAll(weekStartDate);

        request.onsuccess = () => {
          const records = request.result;
          if (records.length === 0) {
            resolve(null);
            return;
          }

          const map = new Map<string, any>();
          records.forEach((record: any) => {
            map.set(record.cadetId, record);
          });
          resolve(map);
        };

        request.onerror = () => {
          console.error('Error reading cached attendance:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Cache error:', error);
      return null;
    }
  }

  /**
   * Cache attendance records
   */
  async cacheAttendance(records: Map<string, any>, weekStartDate: string): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      const transaction = this.db.transaction([STORES.ATTENDANCE], 'readwrite');
      const store = transaction.objectStore(STORES.ATTENDANCE);
      const index = store.index('weekStartDate');

      // Clear existing records for this week
      const clearRequest = index.openKeyCursor(IDBKeyRange.only(weekStartDate));
      clearRequest.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          // Add new records
          records.forEach((record, cadetId) => {
            const recordWithId = {
              ...record,
              id: `${weekStartDate}_${cadetId}`,
              weekStartDate,
              cadetId
            };
            store.put(recordWithId);
          });

          // Update metadata
          this.updateMetadata(`attendance_${weekStartDate}`, Date.now());
        }
      };
    } catch (error) {
      console.error('Error caching attendance:', error);
    }
  }

  /**
   * Update cache metadata
   */
  private async updateMetadata(key: string, timestamp: number): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      const transaction = this.db.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      store.put({ key, lastUpdated: timestamp, version: DB_VERSION });
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }

  /**
   * Get cache age for a key
   */
  async getCacheAge(key: string): Promise<number | null> {
    try {
      await this.init();
      if (!this.db) return null;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORES.METADATA], 'readonly');
        const store = transaction.objectStore(STORES.METADATA);
        const request = store.get(key);

        request.onsuccess = () => {
          const metadata = request.result as CacheMetadata | undefined;
          if (metadata) {
            resolve(Date.now() - metadata.lastUpdated);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      const transaction = this.db.transaction(
        [STORES.CADETS, STORES.ATTENDANCE, STORES.TRAINING_EVENTS, STORES.METADATA],
        'readwrite'
      );

      await Promise.all([
        new Promise<void>((resolve) => {
          transaction.objectStore(STORES.CADETS).clear().onsuccess = () => resolve();
        }),
        new Promise<void>((resolve) => {
          transaction.objectStore(STORES.ATTENDANCE).clear().onsuccess = () => resolve();
        }),
        new Promise<void>((resolve) => {
          transaction.objectStore(STORES.TRAINING_EVENTS).clear().onsuccess = () => resolve();
        }),
        new Promise<void>((resolve) => {
          transaction.objectStore(STORES.METADATA).clear().onsuccess = () => resolve();
        })
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Check if cache is stale (older than maxAge milliseconds)
   */
  async isCacheStale(key: string, maxAge: number = 5 * 60 * 1000): Promise<boolean> {
    const age = await this.getCacheAge(key);
    if (age === null) return true;
    return age > maxAge;
  }
}

export const cacheService = new CacheService();
