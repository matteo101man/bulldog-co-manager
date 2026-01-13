# Bulldog CO Manager

A comprehensive mobile-first Progressive Web App (PWA) for managing ROTC cadet attendance, training events, PT plans, and administrative tasks across multiple companies.

**Live Site:** https://bulldog-co-manager.web.app

## 🎯 Features

### 📋 Attendance Management
- **Company-based tracking** - Select from Alpha, Bravo, Charlie, Ranger, Headquarters Company, or Master List
- **Weekly attendance** - Track PT attendance for Tuesday, Wednesday, Thursday
- **Lab attendance** - Separate tracking for Thursday Lab sessions
- **Status marking** - Mark cadets as Present (Green), Excused (Yellow), or Unexcused (Red)
- **Statistics dashboard** - View attendance stats by day and week with detailed breakdowns
- **Export functionality** - Export attendance data to Excel spreadsheets
- **Tactics attendance** - Specialized attendance tracking for tactics training

### 👥 Cadet Management
- **Cadet profiles** - View detailed cadet information including:
  - Personal details (name, company, MS level, contact info)
  - Attendance history
  - Contracted status
  - Position/role
- **Add/Edit cadets** - Create new cadet records or update existing ones
- **Company assignment** - Assign cadets to companies (Alpha, Bravo, Charlie, Ranger, Headquarters Company)
- **Filtering** - Filter cadets by:
  - Company
  - Military Science Level (MS1, MS2, MS3, MS4)
  - Contracted status
  - Search by name

### 📅 Training Event Management
- **Training schedule** - View all training events in a calendar format
- **Event details** - Detailed view of each training event including:
  - Date and time
  - Location
  - Description
  - Planning status (Not Started, In Progress, Complete)
  - Required equipment
- **Add training events** - Create new training events with full details
- **Event planning** - Track planning status and requirements for each event

### 💪 PT Plans
- **Company-specific plans** - View and manage PT plans for each company
- **Weekly planning** - Plan PT sessions for Monday through Friday
- **Day-specific plans** - Different plans for different days of the week
- **Generic plans** - Reusable PT plan templates

### 📝 Forms & Requests
- **Expense requests** - Submit and track expense request forms
- **Form management** - Access various administrative forms

### 🌤️ Weather Integration
- **Weather data** - View current weather conditions for training planning

### 🔔 Notifications
- **Push notifications** - Send notifications to all users via Firebase Cloud Messaging
- **Permission management** - Request and manage notification permissions
- **Broadcast messaging** - Send important announcements to all cadets

### ⚙️ Settings & Administration
- **Data backup** - Export entire database as JSON backup
- **Data restore** - Import database from backup file
- **Clear attendance** - Reset all attendance data (with confirmation)
- **Export attendance** - Export attendance records to Excel
- **Export last week absences** - Generate spreadsheet of recent absences
- **User authentication** - Secure login system
- **Logout** - Secure session management

### 📊 Reporting & Analytics
- **Attendance statistics** - Comprehensive stats by:
  - Day (Tuesday, Wednesday, Thursday)
  - Week totals
  - Company comparisons
  - MS level breakdowns
- **Unexcused absence tracking** - Track and display total unexcused absences
- **Visual indicators** - Color-coded status displays for quick assessment

### 📱 Progressive Web App (PWA)
- **Mobile-first design** - Optimized for mobile devices
- **Installable** - Add to iPhone/Android home screen
- **Offline support** - Service worker caching for offline access
- **App-like experience** - Full-screen, standalone mode

### 🐛 Issue Reporting
- **Bug reporting** - Report issues directly from the app
- **Feedback system** - Submit feedback and suggestions

## 🚀 Getting Started

### Prerequisites
- Node.js 20 or higher
- npm or yarn
- Firebase project (for database and hosting)

### Installation

```bash
# Clone the repository
git clone https://github.com/matteo101man/bulldog-co-manager.git

# Navigate to project directory
cd bulldog-co-manager

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Data Import

```bash
# Import cadets to Firestore
npm run import-cadets

# Import PT plans
npm run import-pt-plans

# Import training events
npm run import-training-events

# Update company assignments
npm run update-companies

# Update contracted status
npm run update-contracted
```

## 🚢 Deployment

The app is deployed to **Firebase Hosting** with automatic deployment via GitHub Actions.

### Manual Deployment

```bash
# Deploy to Firebase Hosting
npm run deploy:firebase

# Or use Firebase CLI directly
npm run build
firebase deploy --only hosting
```

### Automatic Deployment

Deployment happens automatically when you push to the `main` branch. See [FIREBASE_HOSTING_SETUP.md](./FIREBASE_HOSTING_SETUP.md) for setup instructions.

## 🛠️ Tech Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Database:** Firebase Firestore
- **Hosting:** Firebase Hosting
- **Styling:** Tailwind CSS
- **PWA:** vite-plugin-pwa
- **Notifications:** Firebase Cloud Messaging (FCM)
- **Authentication:** Firebase Authentication
- **Export:** xlsx-js-style for Excel exports

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Attendance.tsx  # Attendance management
│   ├── CompanyRoster.tsx # Company roster view
│   ├── CadetsList.tsx  # All cadets list
│   ├── CadetProfile.tsx # Individual cadet details
│   ├── TrainingSchedule.tsx # Training events
│   ├── PTPlans.tsx     # PT plan management
│   ├── Settings.tsx    # App settings
│   └── ...
├── services/           # Business logic & Firebase operations
│   ├── attendanceService.ts
│   ├── cadetService.ts
│   ├── trainingEventService.ts
│   ├── notificationService.ts
│   └── ...
├── types/              # TypeScript type definitions
├── firebase/           # Firebase configuration
└── utils/              # Helper functions
```

## 🔐 Firebase Collections

- **`cadets`** - Cadet records
- **`attendance`** - Attendance records (format: `{weekStartDate}_{cadetId}`)
- **`trainingEvents`** - Training event records
- **`ptPlans`** - PT plan records
- **`pushSubscriptions`** - FCM push notification subscriptions
- **`notificationRequests`** - Notification request queue

## 📝 Key Features Explained

### Companies
- **Alpha, Bravo, Charlie, Ranger** - Individual companies
- **Headquarters Company** - Headquarters staff
- **Master List** - View all cadets across all companies

### Attendance Status
- **Present** (Green) - Cadet attended
- **Excused** (Yellow) - Cadet had valid excuse
- **Unexcused** (Red) - Cadet absent without excuse
- **Not Marked** - Attendance not yet recorded

### Military Science Levels
- **MS1** - Freshman
- **MS2** - Sophomore
- **MS3** - Junior
- **MS4** - Senior

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 📞 Support

For issues or questions, use the Issues feature within the app or contact the development team.

---

**Built with ❤️ for ROTC cadets and staff**
