# ROTC Overhaul - Project Context

## Overview
**Bulldog CO Manager** - A mobile-first Progressive Web App (PWA) for tracking ROTC cadet attendance across multiple companies. Built with React + TypeScript, deployed to GitHub Pages.

**Live Site:** https://matteo101man.github.io/bulldog-co-manager/

## Tech Stack
- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Database:** Firebase Firestore
- **Styling:** Tailwind CSS
- **PWA:** vite-plugin-pwa (for mobile installation)
- **Deployment:** GitHub Pages (auto-deploy on push to main)

## Project Structure
```
src/
├── App.tsx                 # Main app router/navigation logic
├── components/             # React components
│   ├── CompanySelector.tsx # Company selection screen
│   ├── CompanyRoster.tsx   # Company attendance view
│   ├── CadetsList.tsx      # All cadets list view
│   ├── CadetProfile.tsx    # Individual cadet details
│   ├── AddCadet.tsx        # Add new cadet form
│   ├── Settings.tsx        # App settings
│   ├── Issues.tsx          # Issues/bug reporting
│   └── StatsPanel.tsx      # Statistics display
├── services/               # Firebase data operations
│   ├── cadetService.ts     # CRUD for cadets
│   └── attendanceService.ts # Attendance tracking logic
├── types/index.ts          # TypeScript type definitions
├── firebase/config.ts      # Firebase initialization
└── utils/                  # Helper functions (dates, stats)

scripts/
└── importCadets.ts         # Script to import cadets to Firestore
```

## Core Data Models

### Companies
- `Alpha`, `Bravo`, `Charlie`, `Ranger`, `Master` (Master shows all cadets)

### Cadet
```typescript
{
  id: string
  company: Company
  firstName: string
  lastName: string
  militaryScienceLevel: string  // "MS1", "MS2", "MS3", "MS4"
  phoneNumber: string
  email: string
  age?: number
  position?: string
}
```

### Attendance Record
```typescript
{
  cadetId: string
  ptTuesday: AttendanceStatus      // PT = Physical Training
  ptWednesday: AttendanceStatus
  ptThursday: AttendanceStatus
  labThursday: AttendanceStatus    // Lab only on Thursday
  weekStartDate: string            // ISO date (Monday of week)
}
```

### Attendance Status
- `'present'` (Green)
- `'excused'` (Yellow)
- `'unexcused'` (Red)
- `null` (Not marked)

## Key Features
1. **Company-based attendance tracking** - Select company → view roster → mark attendance
2. **Weekly attendance** - Tracks Tuesday/Wednesday/Thursday PT + Thursday Lab
3. **Statistics** - Day/week stats, unexcused absence tracking
4. **Cadet management** - Add, edit, delete cadets; view profiles
5. **Master List** - View all cadets across companies
6. **Mobile PWA** - Installable on iPhone home screen

## Navigation Flow
```
CompanySelector (home)
  ├─→ CompanyRoster (select company)
  │     └─→ CadetProfile (select cadet)
  ├─→ CadetsList (all cadets)
  │     ├─→ CadetProfile
  │     └─→ AddCadet
  ├─→ Settings
  └─→ Issues
```

## Firebase Collections
- **`cadets`** - All cadet records
- **`attendance`** - Attendance records (doc ID format: `{weekStartDate}_{cadetId}`)

## Important Implementation Details
1. **Week calculation** - Uses Monday as week start date (ISO format)
2. **Attendance updates** - Single source of truth in Firestore; all views read from same DB
3. **Legacy support** - Attendance service handles migration from old field names (`tuesday` → `ptTuesday`)
4. **Batch queries** - Firestore 'in' queries limited to 10 items, so attendance service batches them
5. **PWA base path** - Configured for GitHub Pages subdirectory (`/bulldog-co-manager/`)

## Development Commands
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run deploy       # Build + deploy to GitHub Pages
npm run import-cadets # Import cadets to Firestore
```

## Firebase Config
- Project ID: `bulldog-co-manager`
- Firestore enabled (no authentication required)
- Collections: `cadets`, `attendance`

## Key Files to Understand
- `src/App.tsx` - Main routing/navigation logic
- `src/types/index.ts` - All TypeScript types
- `src/services/attendanceService.ts` - Core attendance business logic
- `src/services/cadetService.ts` - Cadet CRUD operations
- `src/firebase/config.ts` - Firebase initialization

