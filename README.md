# Bulldog CO Manager

ROTC Attendance Tracking System - A mobile-first web app for tracking cadet attendance across companies.

## Features

- Company selection (Alpha, Bravo, Charlie, Ranger, Master)
- Attendance tracking for Tuesday, Wednesday, Thursday
- Status marking: Present (Green), Excused (Yellow), Unexcused (Red)
- Statistics and reporting
- PWA support for iPhone home screen installation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Copy your Firebase config to `src/firebase/config.ts`
   - Set up Firestore database

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## GitHub Pages Deployment

1. Update `homepage` in `package.json` with your GitHub username/repo
2. Update `base` in `vite.config.ts` to match your repo name
3. Deploy:
```bash
npm run deploy
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Firebase (Firestore)
- Tailwind CSS
- PWA Support

## Mobile Optimization

- iOS safe area support
- Touch-optimized (44px minimum targets)
- Prevents double-tap zoom
- Standalone PWA mode

