# Bulldog CO Manager

Mobile-first Progressive Web App for managing ROTC cadet attendance, training events, PT plans, and administrative tasks.

**Live Site:** https://bulldog-co-manager.web.app

## Features

### Attendance Management
- Company-based tracking (Alpha, Bravo, Charlie, Ranger, Headquarters Company, Master List)
- Weekly PT attendance tracking (Tuesday, Wednesday, Thursday)
- Thursday Lab attendance tracking
- Status marking: Present, Excused, Unexcused
- Statistics dashboard with day and week breakdowns
- Excel export functionality
- Tactics attendance tracking

### Cadet Management
- Cadet profiles with personal details, attendance history, contracted status, and position
- Add and edit cadet records
- Company assignment
- Filtering by company, MS level (MS1-MS5), contracted status, and name search

### Training Events
- Training schedule calendar view
- Event details: date, time, location, description, planning status, required equipment
- Create and manage training events
- Track planning status and requirements

### PT Plans
- Company-specific PT plans
- Weekly planning for Monday through Friday
- Day-specific plans
- Generic plan templates

### Forms & Requests
- Expense request forms
- Administrative form management

### Weather Integration
- Current weather conditions for training planning

### Notifications
- Push notifications via Firebase Cloud Messaging
- Broadcast messaging to all users
- Notification permission management

### Administration
- Database backup and restore (JSON)
- Clear attendance data
- Export attendance to Excel
- Export last week absences
- User authentication and session management

### Reporting
- Attendance statistics by day, week, company, and MS level
- Unexcused absence tracking
- Color-coded status indicators

### PWA Features
- Mobile-first design
- Installable on iOS and Android
- Offline support via service worker
- Standalone app experience

### Issue Reporting
- Built-in bug reporting and feedback system

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Firebase project

### Installation

```bash
git clone https://github.com/matteo101man/bulldog-co-manager.git
cd bulldog-co-manager
npm install
```

### Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Data Import Scripts

```bash
npm run import-cadets          # Import cadets to Firestore
npm run import-pt-plans        # Import PT plans
npm run import-training-events  # Import training events
npm run update-companies       # Update company assignments
npm run update-contracted      # Update contracted status
```

## Deployment

Deployed to Firebase Hosting with automatic deployment via GitHub Actions.

### Manual Deployment

```bash
npm run deploy:firebase
```

Or:

```bash
npm run build
firebase deploy --only hosting
```

### Automatic Deployment

Deploys automatically on push to `main`.

## Tech Stack

- React 18 + TypeScript
- Vite
- Firebase Firestore
- Firebase Hosting
- Tailwind CSS
- vite-plugin-pwa
- Firebase Cloud Messaging
- Firebase Authentication
- xlsx-js-style

## Project Structure

```
src/
├── components/     # React components
├── services/       # Business logic & Firebase operations
├── types/          # TypeScript definitions
├── firebase/       # Firebase configuration
└── utils/          # Helper functions
```

## Firebase Collections

- `cadets` - Cadet records
- `attendance` - Attendance records (format: `{weekStartDate}_{cadetId}`)
- `trainingEvents` - Training event records
- `ptPlans` - PT plan records
- `pushSubscriptions` - FCM push notification subscriptions
- `notificationRequests` - Notification request queue

## Reference

### Companies
- Alpha, Bravo, Charlie, Ranger - Individual companies
- Headquarters Company - Headquarters staff
- Master List - All cadets across companies

### Attendance Status
- Present (Green) - Cadet attended
- Excused (Yellow) - Valid excuse
- Unexcused (Red) - Absent without excuse
- Not Marked - Not yet recorded

### Military Science Levels
- MS1 - Freshman
- MS2 - Sophomore
- MS3 - Junior
- MS4 - Senior
- MS5 - Graduate/Extended

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

Use the Issues feature within the app or contact the development team.
