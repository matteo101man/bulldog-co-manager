# Deployment Guide

## Quick Deploy Steps

The changes need to be committed and pushed to GitHub for automatic deployment.

### 1. Check Current Status
```bash
git status
```

### 2. Add All Changes
```bash
git add .
```

### 3. Commit Changes
```bash
git commit -m "Add Send Notification feature to Settings"
```

### 4. Push to GitHub
```bash
git push origin main
```

### 5. Wait for Auto-Deploy
- GitHub Actions will automatically build and deploy
- Check the Actions tab in your GitHub repository
- Deployment usually takes 2-5 minutes
- Your site will be live at: https://matteo101man.github.io/bulldog-co-manager/

## Manual Deploy (Alternative)

If auto-deploy isn't working, you can deploy manually:

```bash
npm run build
npm run deploy
```

## Verify Deployment

1. Go to your live site: https://matteo101man.github.io/bulldog-co-manager/
2. Navigate to **Settings**
3. You should see the new **"Send Notification"** section
4. Try entering a message and clicking "Send Notification"

## Troubleshooting

### Changes Not Showing Up

1. **Clear Browser Cache**: 
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear cache in browser settings

2. **Check GitHub Actions**:
   - Go to your repo → Actions tab
   - Check if the latest workflow run succeeded
   - If it failed, check the error logs

3. **Check Service Worker**:
   - Open DevTools → Application → Service Workers
   - Click "Unregister" to clear old service worker
   - Refresh the page

4. **Verify Files Were Committed**:
   ```bash
   git log --oneline -5
   git show HEAD --name-only
   ```

### Build Errors

If you get build errors:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

## Files That Should Be Deployed

Make sure these files are in your repository:
- ✅ `src/components/Settings.tsx` (updated)
- ✅ `src/services/notificationService.ts` (new)
- ✅ `src/firebase/config.ts` (updated)
- ✅ `public/firebase-messaging-sw.js` (new)
- ✅ `FIREBASE_SETUP.md` (new - setup guide)

