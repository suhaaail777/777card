# CardVault — Complete GitHub Pages Edition

A local-first, installable PWA for storing identity, membership, loyalty and other cards. No account or backend is required.

## Features
- Add, edit, search, filter, favourite and delete cards
- Card front/back camera capture and image upload
- OCR-assisted text reading (requires internet to load the OCR library)
- QR/barcode scanning on supported browsers
- Offline app shell and locally stored card data/photos
- Dark/light theme
- Optional 6-digit PIN access lock
- Encrypted backup/restore using PBKDF2 and AES-256-GCM
- Expiry check and browser notification permission
- Optional cloud sync is reserved for a future connected backend; it is not active in this static build

## Publish on GitHub Pages
1. Create a repository (e.g. `cardvault`).
2. Upload the contents of this folder to the repository root. Keep `index.html`, `manifest.webmanifest`, and `sw.js` at the root.
3. Open **Settings → Pages**. Choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
4. Open the published HTTPS URL on your phone.

## Install
- Android: open in Chrome and choose Install app / Add to Home screen.
- iPhone: open in Safari → Share → Add to Home Screen.

## Security notes
- The optional PIN is an access lock, not encryption of the live browser database. Anyone with direct access to the browser profile or developer tools may be able to access locally stored data. Use device-level security as well.
- Encrypted backup protects the exported backup file with AES-256-GCM. Use a strong, unique passphrase and keep it safe; it cannot be recovered if lost.
- Browser notifications are best-effort and may only work while the app is open; this build does not include server push notifications.
- Camera access requires HTTPS and user permission. OCR and some scanning features may require internet or browser API support.
- Cloud sync is intentionally optional and not configured in the static GitHub Pages version. A backend/provider integration is required before multi-device sync can work.

## Data safety
Cards and images are stored in this browser on this device. Create encrypted backups regularly before clearing browser data, changing devices, or reinstalling the app.
