# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sleipnir MC Reykjavik — a motorcycle club website with e-commerce shop and admin dashboard. Static frontend (vanilla HTML/CSS/JS) backed by Firebase (Auth + Firestore). Deployed to Firebase Hosting at sleipnirmc.com.

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

No build step, no bundler, no test framework, no linter, no npm. Files are served as-is.

## Project Structure

All application code lives in `Sleipnir1212aa/`. The repo root `index.html` is a legacy landing page.

```
Sleipnir1212aa/
├── index.html                    # Home page (root)
├── pages/                        # All other HTML pages
│   ├── shop.html, admin.html, login.html, about.html
│   ├── sagan.html, contact.html, reykjavik.html, akureyri.html
├── css/styles.css                # Consolidated master stylesheet (~4,200 lines)
├── js/                           # Core JavaScript modules
│   ├── firebase-config.js        # Firebase init, Firestore `db` global
│   ├── authentication.js         # Auth flows, role mgmt (~1,185 lines)
│   ├── i18n.js                   # SleipnirI18n translation engine
│   ├── components.js             # Navbar + footer HTML injection
│   ├── nav-config.js             # Navigation menu structure (NAV_ITEMS)
│   ├── main.js                   # Event delegation: user menu, logout, auth listener
│   ├── translations/             # 9 i18n files: core, home, shop, admin, login, about, sagan, contact, chapters
│   └── page-scripts/
│       ├── shop.js               # Product catalog, cart, filters, pagination (~1,123 lines)
│       └── admin.js              # Dashboard CRUD, image uploads, activity logs (~1,001 lines)
├── assets/
│   ├── images/                   # HopMynd.png, HopMynd1.png, SleipnirLogo.png
│   └── fonts/VIKING-N.woff      # Custom Viking heading font
├── firebase/
│   ├── firestore.rules           # Security rules (isAdmin, isMember, isAuthenticated helpers)
│   └── firestore.indexes.json    # 3 composite indexes
├── public/                       # Firebase Hosting entry files (index.html, 404.html)
├── docs/                         # Project documentation
├── firebase.json                 # Hosting + Firestore config (has URL rewrites for old paths)
├── .firebaserc                   # Firebase project: sleipnirmcshop
└── server.py                     # Python dev server (port 8080, no-cache)
```

## Architecture

### Script Loading Order (critical)

All pages follow this loading order via `<script>` tags (no ES modules):

```
i18n.js → translations/*.js → nav-config.js → components.js → main.js
→ Firebase SDK (app, auth, firestore compat) → firebase-config.js → authentication.js
→ page-scripts/*.js (page-specific, loaded last)
```

### JavaScript Modules

- **`js/i18n.js`** — `SleipnirI18n` IIFE: translation engine, language toggle, localStorage persistence. Default language: Icelandic (`'is'`).
- **`js/translations/*.js`** — 9 translation files registering keys via `SleipnirI18n.registerTranslations()`.
- **`js/components.js`** — Injects navbar into `#navbar-root` and footer into `#footer-root` on each page.
- **`js/nav-config.js`** — `window.NAV_ITEMS` array defining navigation structure with nested dropdowns and i18n keys.
- **`js/main.js`** — Event delegation for user menu toggle, logout handler, auth state listener.
- **`js/firebase-config.js`** — Firebase init, Firestore `db` global, offline persistence. Must load after Firebase SDK CDN scripts.
- **`js/authentication.js`** (~1,185 lines) — Auth flows (email/password, Google, Facebook OAuth), user role management, admin session control (30-min timeout). Exports via `window.sleipnirAuth`.
- **`js/page-scripts/shop.js`** (~1,123 lines) — Product catalog, cart, category filtering, pagination (8/page), lazy image loading via IntersectionObserver, member-only product restrictions.
- **`js/page-scripts/admin.js`** (~1,001 lines) — Dashboard stats, user/product/order/event CRUD, image upload with drag-drop, activity logging. Protected by `protectAdminPage()`.

### Inter-module Communication

- **`authStateChanged`** — Custom event on `document`, fired by `authentication.js` when auth state changes. Shop and admin listen for this.
- **`navbarRendered`** — Custom event on `window`, fired by `components.js` after navbar injection completes.
- **`langchange`** — Custom event fired by i18n engine when language switches.

### HTML Pages

| Page | File | Navbar | Footer | Notes |
|------|------|--------|--------|-------|
| Home | `/index.html` | Injected | Injected | Hero section, CTA buttons |
| Shop | `/pages/shop.html` | Injected | Injected | Product catalog + cart |
| Admin | `/pages/admin.html` | Inline | No | Dashboard, `protectAdminPage()` required |
| Login | `/pages/login.html` | No | No | Split-screen auth form |
| Members | `/pages/about.html` | Injected | Injected | Club members display |
| Story | `/pages/sagan.html` | Injected | Injected | Club history narrative |
| Contact | `/pages/contact.html` | Injected | Injected | Leaflet map + contact form |
| Reykjavik | `/pages/reykjavik.html` | Injected | Injected | Chapter info |
| Akureyri | `/pages/akureyri.html` | Injected | Injected | Chapter info |

### Firestore Collections

`users` · `products` · `orders` · `events` · `displayMembers` · `adminActivityLog` · `email_logs`

### Firebase Deployment

Config lives in `Sleipnir1212aa/`. The `firebase.json` defines URL rewrites mapping old root-level paths (e.g., `/shop.html`) to `/pages/shop.html` for backward compatibility. Security rules in `firebase/firestore.rules` use helper functions (`isAdmin()`, `isMember()`, `isAuthenticated()`) — admins have full access to all collections. Hosting ignore patterns exclude `firebase/`, `docs/`, `server.py`, `public/`, `node_modules/`, and dotfiles.

## Key Conventions

- **Bilingual content (i18n)**: Use `data-i18n="key"` attributes on HTML elements. Translations registered in `js/translations/*.js`. Icelandic is the default language. Additional attributes: `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-aria`.
- **Dark theme**: Black background (#000/#1a1a1a) with MC red (#cf2342) accents. CSS variables defined in `css/styles.css` (e.g., `--pure-black`, `--mc-red`, `--mc-red-hover`, `--dark-red`).
- **Typography**: Cormorant Garamond (body), Cinzel (headings), VIKING-N custom font (branding).
- **Firebase SDK v9.22.0** (compat/namespaced): `firebase.auth()`, `firebase.firestore()` — not the modular v9+ API.
- **No frameworks**: Pure vanilla JS with DOM manipulation. Do not introduce React/Vue/etc.
- **Globals**: `db` (Firestore), `firebase` (SDK), `window.sleipnirAuth` (auth API), `window.SleipnirI18n` (i18n engine), `window.currentLang` (language state), `window.NAV_ITEMS` (nav structure).
- **Component injection**: Navbar and footer are injected by `js/components.js` into `#navbar-root` and `#footer-root` divs. Admin page has an inline navbar. Login page has no navbar.
- **Admin protection**: Admin pages must call `protectAdminPage()` and verify role before rendering.
- **URL paths**: All internal links use `/pages/filename.html`. Old root-level URLs are rewritten via `firebase.json`.
