# Bulldog CO Manager

ROTC Attendance Tracking System - A mobile-first web app for tracking cadet attendance across companies.

**Live Site:** https://matteo101man.github.io/bulldog-co-manager/

## Features

- Company selection (Alpha, Bravo, Charlie, Ranger, Master)
- Attendance tracking for Tuesday, Wednesday, Thursday
- Status marking: Present (Green), Excused (Yellow), Unexcused (Red)
- Statistics and reporting by day and week
- Filtered lists by Military Science Level
- PWA support for iPhone home screen installation

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Import cadets to Firestore
npm run import-cadets
```

## Deployment

Deployment to GitHub Pages happens automatically on every push to `main` branch via GitHub Actions.

Manual deployment (if needed):
```bash
npm run deploy
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Firebase Firestore
- Tailwind CSS
- PWA Support

