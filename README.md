# CardVault — GitHub Pages Edition

A static, installable Progressive Web App (PWA) for keeping cards on your phone.

## Included
- Responsive mobile-first card holder
- Add, edit, view, search, filter and delete cards
- Card front/back photo capture or upload
- Browser-local storage; no account, login, or password required
- QR/barcode camera scanning where supported by the browser
- PWA manifest, icons and service worker for install/offline app shell
- No server or build step required

## Publish on GitHub Pages
1. Create a new GitHub repository, for example `cardvault`.
2. Upload **all files and folders in this package** to the repository root. Keep `index.html`, `manifest.webmanifest`, and `sw.js` at the root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then Save.
6. Wait for the Pages deployment and open the published URL on your phone.

## Install on mobile
- **Android / Chrome:** open the GitHub Pages URL → browser menu → Install app (or Add to Home screen).
- **iPhone / Safari:** open the URL → Share → Add to Home Screen.

GitHub Pages serves over HTTPS, which is required for service workers and camera access. Camera barcode scanning depends on browser support; current Chromium browsers generally provide the `BarcodeDetector` API, while Safari support may vary.

## Important limitations
This GitHub Pages edition is static. It does not include cloud backup or cross-device synchronization. Cards and photos are stored locally in the browser on the device where they are added. Clearing browser site data or losing that device may delete the cards.

## Authentication removed
This build has no account login, vault password, or encryption prompt. Cards and photos are stored in the browser's local storage on the device. Anyone who can open this browser profile may be able to view them. Clearing browser/site data can delete the cards. This GitHub Pages version does not provide cloud backup or cross-device sync.

If you previously used the password-protected CardVault build, its encrypted cards are not automatically imported into this password-free version. Open the older build and unlock it with the original vault password, then manually re-add/export details as needed. Do not delete the old site data until you have recovered anything important.
