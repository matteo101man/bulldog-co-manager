# GitHub Setup Guide

Follow these steps to get your project on GitHub and deploy to GitHub Pages:

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `bulldog-co-manager` (or your preferred name)
3. Description: "ROTC Attendance Tracking System"
4. Choose **Public** (required for free GitHub Pages)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

## Step 2: Update Configuration Files

After creating the repo, update these files with your GitHub username:

1. **package.json** - Update the `homepage` field:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/bulldog-co-manager"
   ```

2. **vite.config.ts** - Update the `base` field:
   ```typescript
   base: '/bulldog-co-manager/'
   ```

Replace `YOUR_USERNAME` and `bulldog-co-manager` with your actual GitHub username and repo name.

## Step 3: Initialize Git and Push

Run these commands in your terminal (from the project root):

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Bulldog CO Manager"

# Add your GitHub repository as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/bulldog-co-manager.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in left sidebar)
3. Under **Source**, select **"gh-pages"** branch
4. Click **Save**

## Step 5: Deploy to GitHub Pages

Run this command to build and deploy:

```bash
npm run deploy
```

This will:
- Build your app
- Create/update the `gh-pages` branch
- Push to GitHub

Your site will be available at:
`https://YOUR_USERNAME.github.io/bulldog-co-manager`

## Future Updates

Whenever you make changes:

```bash
git add .
git commit -m "Your commit message"
git push
npm run deploy
```

## Troubleshooting

- **404 Error**: Make sure the `base` in `vite.config.ts` matches your repo name
- **Build fails**: Run `npm install` first
- **Deploy fails**: Make sure GitHub Pages is enabled in Settings → Pages

