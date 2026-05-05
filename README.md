# Borderless SATPREP

This repository contains the Borderless SATPREP React application with Firebase Auth, Firestore, and Mintesnot AI integration.

## Deployment Options

### 1. GitHub Pages Landing Page
Use this to publish a lightweight landing page at `https://borderless-club-et.github.io`.

1. Create a GitHub repository named exactly `borderless-club-et.github.io`.
2. Push this repo to the `main` branch.
3. Ensure the root `index.html` file is present in the repo root.
4. In GitHub, go to Settings > Pages.
5. Under "Build and deployment," select "Deploy from a branch." Choose `main` and save.
6. Wait 1-2 minutes for the site to go live.

> Note: This repo already contains a lightweight root `index.html` landing page, so GitHub Pages can serve that directly without the React build.

### 2. Firebase Hosting for the React App
Use Firebase Hosting to deploy the full React application and keep Auth/Firestore live.

1. Install Firebase CLI if needed:
   ```bash
   npm install -g firebase-tools
   ```
2. Login to Firebase:
   ```bash
   firebase login
   ```
3. Initialize hosting if not already configured:
   ```bash
   firebase init hosting
   ```
   - Select your existing Firebase project `login-database-b748d`.
   - Set the public directory to `build`.
   - Choose `Yes` for single-page app rewrite.
4. Build the React app:
   ```bash
   npm run build
   ```
5. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```

### Important Notes
- Keep `.env` secret and do not commit it to GitHub.
- If using Firebase hosting, `firebase.json` already points to `build`.
- `npm run deploy-github` deploys the React built app to GitHub Pages for `borderless-club-et.github.io`.

## Local Development

```bash
npm install
npm start
```

## Useful Scripts

- `npm run build` — build production bundle
- `npm run deploy-github` — deploy app to GitHub Pages

## Notes

If you want the app deployed as a landing page in the same repo, the homepage is already set to `https://borderless-club.github.io`.
