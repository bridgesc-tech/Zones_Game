# Zones - Turn-Based Card Game

A strategic turn-based card game built as a Progressive Web App (PWA), optimized for mobile devices.

## Features

- **Player vs AI** and **Player vs Player** game modes
- Multiple card types with unique abilities
- Responsive canvas that adapts to mobile screens
- Touch controls for mobile devices
- Offline functionality via Service Worker
- Installable as a PWA on mobile devices

## Gameplay

- Select characters and play cards to attack enemies or buff allies
- Use strategic card combinations to defeat your opponent
- Manage your hand and deck to control the battlefield

## Setup for GitHub Pages

### 1. Create a GitHub Repository

1. Create a new repository on GitHub (e.g., `zones-game`)
2. Clone it to your local machine
3. Copy all files from this directory to the repository

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose **main** (or **master**) branch and **/ (root)** folder
5. Click **Save**

### 3. Push Your Files

```bash
git add .
git commit -m "Initial commit - Zones PWA"
git push origin main
```

### 4. Access Your Game

After a few minutes, your game will be available at:
`https://[your-username].github.io/[repository-name]/`

## PWA Installation

### On Mobile (iOS/Android):

1. Open the game in your mobile browser
2. Look for the "Add to Home Screen" prompt, or:
   - **iOS Safari**: Tap Share → Add to Home Screen
   - **Android Chrome**: Tap Menu → Add to Home Screen
3. The game will install as a standalone app

### On Desktop:

- **Chrome/Edge**: Click the install icon in the address bar
- **Firefox**: Not yet supported for desktop PWA installation

## Development

### Local Testing

Simply open `index.html` in a web browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server
```

Then visit `http://localhost:8000`

### Service Worker Updates

The app now has **automatic update detection**! When you push updates to GitHub:

1. **For automatic updates**: Simply push your changes. The service worker will detect updates every 60 seconds and prompt users to reload.

2. **For forced cache refresh**: Update the `CACHE_VERSION` constant in `service-worker.js` using semantic versioning (currently set to `"1.1.0"`). This forces all users to get the new version immediately.
   
   **Version format**: `"MAJOR.MINOR.PATCH"` (e.g., `"1.1.0"`, `"1.1.1"`, `"1.2.0"`, `"2.0.0"`)
   - **PATCH** (1.1.0 → 1.1.1): Small bug fixes
   - **MINOR** (1.1.0 → 1.2.0): New features, backward compatible
   - **MAJOR** (1.1.0 → 2.0.0): Breaking changes

**How it works:**
- The service worker checks for updates every 60 seconds
- When a new version is detected, users see a prompt to reload
- The new version automatically replaces the old cached version
- Old caches are automatically cleaned up

## File Structure

```
ZonesGame/
├── index.html          # Main HTML file
├── game.js             # Game logic and rendering
├── manifest.json       # PWA manifest
├── service-worker.js   # Service worker for offline support
└── README.md          # This file
```

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 11.3+)
- Mobile browsers with PWA support

## Notes

- The game uses a fixed logical canvas size (900x700) that scales responsively
- Touch events are automatically converted to mouse events for compatibility
- The service worker caches all game files for offline play

## Future Enhancements

- Add app icons (icon-192.png, icon-512.png)
- Improve mobile UI scaling
- Add haptic feedback for mobile
- Optimize performance for lower-end devices



