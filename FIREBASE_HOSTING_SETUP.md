# Firebase Hosting Setup Guide

## ✅ Your site is now live on Firebase Hosting!

**Live URL:** https://bulldog-co-manager.web.app

## Manual Deployment

To deploy manually, run:
```bash
npm run deploy:firebase
```

Or:
```bash
npm run build
firebase deploy --only hosting
```

## Automatic Deployment Setup (GitHub Actions)

To set up automatic deployment when you push to GitHub:

### Step 1: Get Firebase Service Account Token

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `bulldog-co-manager`
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **Generate New Private Key**
6. Click **Generate Key** (this downloads a JSON file)
7. **IMPORTANT:** Keep this file secure - don't commit it to git!

### Step 2: Create GitHub Secret

1. Go to your GitHub repository: https://github.com/matteo101man/bulldog-co-manager
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FIREBASE_SERVICE_ACCOUNT_BULLDOG_CO_MANAGER`
5. Value: Copy the **entire contents** of the JSON file you downloaded
6. Click **Add secret**

### Step 3: Verify Workflow

The workflow file `.github/workflows/firebase-deploy.yml` is already created. Once you add the secret, it will automatically deploy on every push to `main`.

## Deployment Speed Comparison

- **GitHub Pages:** 2-5 minutes
- **Firebase Hosting:** 30-60 seconds ⚡

## Switching Between Hosting Options

You can use both hosting options simultaneously:

- **Firebase Hosting:** https://bulldog-co-manager.web.app (faster updates)
- **GitHub Pages:** https://matteo101man.github.io/bulldog-co-manager/ (backup)

To disable GitHub Pages auto-deploy, rename `.github/workflows/deploy.yml` to `.github/workflows/deploy.yml.disabled`

## Troubleshooting

### Manual deploy works but GitHub Actions fails
- Check that the `FIREBASE_SERVICE_ACCOUNT_BULLDOG_CO_MANAGER` secret is set correctly
- Verify the JSON content is complete (no truncation)
- Check GitHub Actions logs for specific errors

### Site not updating
- Clear browser cache: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check Firebase Console → Hosting → Releases to see deployment status
- Verify the build completed successfully
