# Firestore Indexes Required for Performance

To ensure optimal performance with multiple concurrent users, you need to create the following composite indexes in Firestore.

## How to Create Indexes

### Important: Single-Field vs Composite Indexes

**Single-Field Indexes**: Firestore creates these **automatically** - you don't need to create them manually! The "Automatic index settings" you see in the console shows that single-field indexes are enabled by default.

**Composite Indexes**: These **must be created manually** - these are the ones you need to create.

### Steps to Create Composite Indexes

1. Go to Firebase Console → Firestore Database → Indexes
2. Make sure you're on the **"Composite"** tab (not "Single field")
3. Click "Create Index"
4. Enter the collection name and fields as specified below
5. Click "Create"

**Note**: You can ignore the "Exemptions" section - that's only for advanced use cases where you want to disable automatic indexing for specific fields.

Alternatively, Firestore will automatically prompt you to create composite indexes when you run queries that need them. You can click the link in the error message to create them automatically.

## Required Indexes

**Important**: The single-field indexes (like `weekStartDate`, `cadetId`, `company`, etc.) are created **automatically** by Firestore. You only need to create the **composite indexes** listed below.

### 1. Attendance Collection

#### ⚠️ Single-Field Indexes (Automatic - No Action Needed)
These are created automatically:
- `weekStartDate` (Ascending) - ✅ Automatic
- `cadetId` (Ascending) - ✅ Automatic

#### ✅ Composite Index to Create: Week and Cadet
- **Collection ID**: `attendance`
- **Fields to index**:
  - `weekStartDate` (Ascending)
  - `cadetId` (Ascending)
- **Query scope**: Collection
- **Why**: Needed for efficient queries that filter by both week and cadet

### 2. Cadets Collection

#### ⚠️ Single-Field Indexes (Automatic - No Action Needed)
These are created automatically:
- `company` (Ascending) - ✅ Automatic
- `militaryScienceLevel` (Ascending) - ✅ Automatic

#### ✅ No Composite Indexes Required
The cadets collection only needs single-field indexes, which are automatic.

### 3. Training Events Collection

#### ⚠️ Single-Field Index (Automatic - No Action Needed)
- `date` (Descending) - ✅ Automatic (created when you use `orderBy`)

#### ✅ No Composite Indexes Required
The training events collection only needs single-field indexes, which are automatic.

## Summary: What You Actually Need to Create

**Only 1 composite index needs to be created manually:**
- **Attendance collection**: `weekStartDate` + `cadetId` (composite)

## Performance Benefits

These indexes will:
- **Reduce query latency** from seconds to milliseconds
- **Support concurrent users** without performance degradation
- **Enable efficient filtering** without full collection scans
- **Reduce Firestore read costs** by making queries more efficient

## Understanding Automatic vs Manual Indexes

### Automatic (Single-Field) Indexes
- **Created automatically** by Firestore for all fields
- **No action needed** - they're enabled by default
- Covers: equality queries, single-field sorting, array queries
- The "Automatic index settings" in the console shows these are enabled

### Manual (Composite) Indexes
- **Must be created manually** when queries use multiple fields
- **Action required**: Create the composite index listed above
- Needed for: queries that filter/sort by multiple fields

### About Exemptions
The "Exemptions" section you see is for **advanced use cases only**. You can ignore it - it's used to disable automatic indexing for specific fields if you want to save storage space. For this application, you don't need to use exemptions.

## What Happens Without Composite Indexes

The app will work without the composite index, but:
- Queries will be slower (may take seconds instead of milliseconds)
- May hit rate limits with multiple concurrent users
- Firestore will show an error in the browser console with a link to create the index

## Where to Find Index Error Messages

When a query requires an index that doesn't exist, Firestore will return an error. Here's where to find these messages:

### 1. Browser Console (Most Common)
- **Open**: Press `F12` or right-click → "Inspect" → "Console" tab
- **Look for**: Error messages like:
  ```
  The query requires an index. You can create it here: [link]
  ```
- **Action**: Click the link in the error message to automatically create the index in Firebase Console

### 2. Network Tab (For Failed Queries)
- **Open**: Browser DevTools → "Network" tab
- **Filter**: Look for requests to `firestore.googleapis.com`
- **Check**: Failed requests (red) will show error details
- **Error format**: Usually contains "index" and a link to create it

### 3. Firebase Console Logs
- **Location**: Firebase Console → Firestore → Logs
- **Shows**: Server-side errors and warnings about missing indexes
- **Note**: Less common for client-side queries, but useful for debugging

### 4. Application Error Messages
- **Location**: In-app error alerts (if error handling is implemented)
- **Example**: "Error loading data: The query requires an index..."
- **Action**: Check browser console for the full error with link

### Quick Test
To see if indexes are needed:
1. Open browser console (F12)
2. Navigate to a page that loads cadets or attendance
3. If an index is missing, you'll see an error with a clickable link
4. Click the link to create the index automatically

## Monitoring

Monitor index usage in Firebase Console → Firestore → Usage tab to see which indexes are being used and optimize further if needed.
