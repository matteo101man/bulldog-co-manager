# Icon Setup Guide

Place the following icon files in this `public` folder:

## Required Icons:

1. **favicon.ico** - 16x16 or 32x32 pixels
   - Browser tab icon (traditional favicon)
   - Format: ICO

2. **favicon-16x16.png** - 16x16 pixels
   - Modern browser favicon
   - Format: PNG

3. **favicon-32x32.png** - 32x32 pixels
   - Modern browser favicon
   - Format: PNG

4. **apple-touch-icon.png** - 180x180 pixels
   - iOS home screen icon (when user adds to home screen)
   - Format: PNG
   - Should have no transparency (iOS requirement)

5. **pwa-192x192.png** - 192x192 pixels
   - PWA icon for Android and other devices
   - Format: PNG

6. **pwa-512x512.png** - 512x512 pixels
   - PWA icon for Android and other devices (high resolution)
   - Format: PNG

## Icon Design Tips:

- Use a simple, recognizable design that works at small sizes
- Ensure good contrast for visibility
- For PWA icons, avoid text (it won't be readable at small sizes)
- Use your brand colors (blue theme: #1e40af)
- Test icons at actual size to ensure they're clear

## Quick Icon Generation:

You can use online tools like:
- https://realfavicongenerator.net/ (generates all sizes from one image)
- https://www.favicon-generator.org/
- https://www.pwabuilder.com/imageGenerator

Or create them manually using:
- Photoshop/GIMP
- Figma
- Canva
- Any image editor

## After Adding Icons:

1. Place all icon files in this `public` folder
2. Restart your dev server (`npm run dev`)
3. The icons will be automatically included in builds
4. Test by checking the browser tab icon and installing the PWA on a mobile device

