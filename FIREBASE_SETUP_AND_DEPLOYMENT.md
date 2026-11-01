# SufiSnapShare – Firebase & Telegram Integration Guide

This guide provides full instructions for configuring, provisioning, and deploying **SufiSnapShare** to Firebase, Cloud Run, or any Node.js environment.

---

## 1. Architecture Overview

- **Frontend**: Mobile-first React + TypeScript app with camera API, real `/s/:id` short-link routing, and glassmorphic UI.
- **Server Backend**: Express.js server (`server.ts`) handling secure uploads, short ID generation, rate-limiting, and direct Telegram delivery without exposing bot credentials to the browser.
- **Database (Firestore Structure)**:
  - Collection: `/photos/{photoId}`
    - `id` (string): 7-8 alphanumeric character unique key (e.g., `A7kP92x`)
    - `imageUrl` (string): Direct storage / CDN URL to the original high-resolution photo
    - `createdAt` (timestamp / ISO string): Server timestamp of upload
    - `status` (string): `"active"` | `"deleted"`
    - `mimeType` (string): `"image/jpeg"`, `"image/png"`, `"image/webp"`
    - `size` (number): File size in bytes
    - `views` (number): Total view counter
    - `telegramSent` (boolean): `true` when Telegram bot successfully delivers photo & short link
    - `telegramTimestamp` (string): Timestamp of Telegram delivery

---

## 2. Firebase Security Rules

### Firestore Security (`firebase/firestore.rules`)
- Read permission is public for documents where `status == "active"`.
- Modifying documents is restricted: viewers can only increment `views`.
- Write/Delete operations require administrator authentication (`request.auth.token.admin == true`).
- Max payload size is strictly validated.

### Firebase Storage Security (`firebase/storage.rules`)
- Public read access for images.
- Strict upload validation: maximum file size 25MB and verified image MIME types (`image/jpeg`, `image/png`, `image/webp`).

---

## 3. Telegram Bot Configuration

### Credentials
- **Bot Token**: `8791640895:AAEgYDc4ZlEsAqUdE5vqKohYq0rnj4-BHqU`
- **Target Chat ID**: `8851455020`

### Security Rule
- **Bot tokens must NEVER be placed in client-side React bundles, HTML, or public GitHub repositories.**
- In SufiSnapShare, the bot token is consumed exclusively by `server.ts` or the Firebase Cloud Function.
- The server performs two separate Telegram API calls:
  1. `sendPhoto` with the high-resolution file and photo metadata caption.
  2. `sendMessage` with the formatted short share link.

---

## 4. Deployment Instructions

### Option A: Running on Cloud Run / Node.js (Live Environment)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the client bundle:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start
   ```
   The application will automatically listen on `0.0.0.0:3000` and handle both the API endpoints and the frontend routing.

### Option B: Deploying to Firebase
1. Log in to Firebase CLI:
   ```bash
   firebase login
   firebase init
   ```
2. Configure Cloud Functions secrets:
   ```bash
   firebase functions:config:set telegram.bot_token="8791640895:AAEgYDc4ZlEsAqUdE5vqKohYq0rnj4-BHqU" telegram.chat_id="8851455020"
   ```
3. Deploy Firestore rules, Storage rules, Functions, and Hosting:
   ```bash
   firebase deploy
   ```
4. The rewrite rule in `firebase/firebase.json` ensures that direct navigation and page reloads on `/s/:id` route directly to `index.html` without 404 errors.

---

## 5. Short Link Routing (`/s/:id`)
- Short IDs are generated using an unambiguous 54-character alphanumeric charset (`23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`).
- Collision checks run prior to saving any record.
- Links look like: `https://your-domain.com/s/A7kP92x`.
- When opened, the app reads the ID from `window.location.pathname`, retrieves the record, and displays the image untouched with `object-fit: contain`.
