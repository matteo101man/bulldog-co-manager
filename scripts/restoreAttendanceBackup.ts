/**
 * Script to restore attendance data from a backup stored in Firestore
 * 
 * Usage:
 * Run: npx tsx scripts/restoreAttendanceBackup.ts [backup-date]
 * 
 * If no date is provided, restores from the 'latest' backup
 * If a date is provided (YYYY-MM-DD), restores from that specific date's backup
 * 
 * Example:
 *   npx tsx scripts/restoreAttendanceBackup.ts
 *   npx tsx scripts/restoreAttendanceBackup.ts 2026-01-20
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, writeBatch, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCK5hwv80v9xQcO7raHcrj4eibS3HGq45c",
  authDomain: "bulldog-co-manager.firebaseapp.com",
  projectId: "bulldog-co-manager",
  storageBucket: "bulldog-co-manager.firebasestorage.app",
  messagingSenderId: "773110288400",
  appId: "1:773110288400:web:8539a42e8031382ba5ba95"
};

async function restoreAttendanceBackup(backupDate?: string) {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const backupDocId = backupDate || 'latest';
    console.log(`\nAttempting to restore from backup: ${backupDocId}`);

    // Get the backup document
    const backupRef = doc(db, 'attendanceBackups', backupDocId);
    const backupSnap = await getDoc(backupRef);

    if (!backupSnap.exists()) {
      console.error(`\n❌ Backup not found: ${backupDocId}`);
      console.log('\nAvailable backups:');
      
      // List available backups
      const backupsRef = collection(db, 'attendanceBackups');
      // Note: We can't list all docs easily without admin SDK, but we can try common dates
      console.log('  - latest (most recent backup)');
      console.log('  - Try a specific date like: 2026-01-20');
      process.exit(1);
    }

    const backupData = backupSnap.data();
    
    if (!backupData || !backupData.attendance || !Array.isArray(backupData.attendance)) {
      console.error('\n❌ Invalid backup format: missing attendance data');
      process.exit(1);
    }

    console.log(`\n✓ Found backup from ${backupData.backupDate || 'unknown date'}`);
    console.log(`  Record count: ${backupData.recordCount || backupData.attendance.length}`);
    console.log(`  Backup timestamp: ${backupData.timestamp?.toDate?.() || backupData.timestamp}`);

    // Confirm restoration
    console.log(`\n⚠️  WARNING: This will overwrite existing attendance records!`);
    console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to continue...`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\nRestoring attendance records...');

    const attendanceRecords = backupData.attendance;
    const BATCH_SIZE = 500; // Firestore batch limit
    let restoredCount = 0;

    // Process in batches
    for (let i = 0; i < attendanceRecords.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchRecords = attendanceRecords.slice(i, i + BATCH_SIZE);

      batchRecords.forEach((record: any) => {
        if (!record.id) {
          console.warn(`Skipping record without id:`, record);
          return;
        }

        const { id, ...data } = record;
        const recordRef = doc(db, 'attendance', id);
        batch.set(recordRef, data);
      });

      await batch.commit();
      restoredCount += batchRecords.length;
      console.log(`  Restored ${restoredCount}/${attendanceRecords.length} records...`);
    }

    console.log(`\n✅ Successfully restored ${restoredCount} attendance records from backup!`);
    console.log(`   Backup date: ${backupData.backupDate || 'unknown'}`);
    
  } catch (error) {
    console.error('\n❌ Error restoring backup:', error);
    process.exit(1);
  }
}

// Get backup date from command line arguments
const backupDate = process.argv[2];
restoreAttendanceBackup(backupDate);
