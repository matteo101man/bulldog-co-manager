# Firestore Indexes Required for Performance

To ensure optimal performance with multiple concurrent users, you need to create the following composite indexes in Firestore.

## How to Create Indexes

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Enter the collection name and fields as specified below
4. Click "Create"

Alternatively, Firestore will automatically prompt you to create indexes when you run queries that need them. You can click the link in the error message to create them automatically.

## Required Indexes

### 1. Attendance Collection

#### Index 1: Week-based queries
- **Collection ID**: `attendance`
- **Fields to index**:
  - `weekStartDate` (Ascending)
- **Query scope**: Collection

#### Index 2: Cadet-based queries  
- **Collection ID**: `attendance`
- **Fields to index**:
  - `cadetId` (Ascending)
- **Query scope**: Collection

#### Index 3: Week and Cadet composite (for efficient lookups)
- **Collection ID**: `attendance`
- **Fields to index**:
  - `weekStartDate` (Ascending)
  - `cadetId` (Ascending)
- **Query scope**: Collection

### 2. Cadets Collection

#### Index 1: Company-based queries
- **Collection ID**: `cadets`
- **Fields to index**:
  - `company` (Ascending)
- **Query scope**: Collection

#### Index 2: MS Level queries
- **Collection ID**: `cadets`
- **Fields to index**:
  - `militaryScienceLevel` (Ascending)
- **Query scope**: Collection

### 3. Training Events Collection

#### Index 1: Date-based queries (already exists if using orderBy)
- **Collection ID**: `trainingEvents`
- **Fields to index**:
  - `date` (Descending)
- **Query scope**: Collection

## Performance Benefits

These indexes will:
- **Reduce query latency** from seconds to milliseconds
- **Support concurrent users** without performance degradation
- **Enable efficient filtering** without full collection scans
- **Reduce Firestore read costs** by making queries more efficient

## Automatic Index Creation

Firestore will automatically create single-field indexes, but composite indexes (multiple fields) must be created manually. The app will work without these indexes, but queries will be slower and may hit rate limits with multiple concurrent users.

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
