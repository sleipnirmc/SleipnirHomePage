# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sleipnir MC Reykjavík — a motorcycle club website with e-commerce shop and admin dashboard. Static frontend (vanilla HTML/CSS/JS) backed by Firebase (Auth + Firestore). Deployed to Firebase Hosting at sleipnirmc.com.

## Development Commands

```bash
# Start local dev server (serves from Sleipnir1212aa/, auto-opens browser, caching disabled)
cd Sleipnir1212aa && python3 server.py
# → http://localhost:8080

# Deploy to production (from Sleipnir1212aa/)
cd Sleipnir1212aa && firebase deploy
# Firebase project: sleipnirmcshop

# Node version (if needed)
nvm use   # reads .nvmrc → v24.3.0
```

No build step, no bundler, no test framework, no linter. Files are served as-is.

## Architecture

All application code lives in `Sleipnir1212aa/`. The root `index.html` is a landing page that redirects into the app.

### JavaScript Modules (loaded via `<script>` tags, no ES modules)

- **`javascript/firebase-config.js`** — Firebase init, Firestore `db` global, offline persistence. Must load first.
- **`javascript/authentication.js`** (~1,100 lines) — Auth flows (email/password, Google, Facebook OAuth), user role management, admin session control (30-min timeout). Exports via `window.sleipnirAuth`.
- **`javascript/shop.js`** (~1,100 lines) — Product catalog, cart, filtering, pagination (8/page), lazy image loading via IntersectionObserver, member-only product restrictions.
- **`javascript/admin.js`** (~1,000 lines) — Dashboard stats, user/product/order/event CRUD, image upload with drag-drop, activity logging. Protected by `protectAdminPage()`.
- **`javascript/language.js`** — Bilingual toggle (Icelandic default / English). Persists to localStorage.

### Inter-module Communication

Auth state changes dispatch a custom `authStateChanged` event on `document`. Other modules listen for this to update UI (shop checks membership, admin verifies role).

### Firestore Collections

`users` · `products` · `orders` · `events` · `displayMembers` · `adminActivityLog` · `email_logs`

### Firebase Deployment

Deployment config lives in `Sleipnir1212aa/` (`firebase.json`, `.firebaserc`). The `public/` subdirectory contains Firebase Hosting entry files (`index.html`, `404.html`). Security rules in `firestore.rules` use helper functions (`isAdmin()`, `isMember()`, `isAuthenticated()`) — admins have full access to all collections.

### HTML Pages

`index.html` (home) · `shop.html` · `admin.html` · `login.html` · `about.html` (members) · `sagan.html` (history) · `contact.html` (map via Leaflet) · `Reykjavík.html` · `Akureyri.html`

## Key Conventions

- **Bilingual content**: Use `<span class="is">Íslenska</span><span class="en">English</span>` pattern. Icelandic is the default language.
- **Dark theme**: Black background (#000/#1a1a1a) with MC red (#cf2342) accents. Use CSS variables defined in `styles.css`.
- **Firebase SDK v8** (compat/namespaced): `firebase.auth()`, `firebase.firestore()` — not the modular v9+ API.
- **No frameworks**: Pure vanilla JS with DOM manipulation. Do not introduce React/Vue/etc.
- **Globals**: `db` (Firestore), `firebase` (SDK), `window.sleipnirAuth` (auth API), `currentLang` (language state).
- **Custom font**: `fonts/VIKING-N.woff` used for headings and branding elements.
- **Admin protection**: Admin pages must call `protectAdminPage()` and verify role before rendering.
