# How This Site Works — Architecture Guide

This explains how Katla Intel's single-page-app-like architecture works, and then shows how to adapt it for a new project where **each page is its own `.html` file** (e.g. `about.html`, `services.html`) instead of `pages/about/index.html` with `sections/` fragments.

---

## Part 1: How Katla Intel Works

### The Core Idea

There is **one single `index.html`** for the entire site. It contains:
- An empty `<div id="navbar-root"></div>` (navbar gets injected here by JS)
- An empty `<main id="main-content"></main>` (page content gets injected here by JS)
- An empty `<div id="footer-root"></div>` (footer gets injected here by JS)
- Script tags that load the system

The navbar, footer, and page content are **never written in `index.html`** — they are all generated or fetched dynamically by JavaScript.

### Script Loading Order (in `index.html`)

```html

<script src="/js/i18n.js"></script>              <!-- 1. i18n engine -->
<script src="/js/translations/core.js"></script>  <!-- 2. Translation dictionaries -->
<script src="/js/translations/home-about.js"></script>
<script src="/js/translations/services.js"></script>
<script src="/js/translations/contact-dynamic.js"></script>
<script src="/js/translations/misc-pages.js"></script>
<script src="/js/nav-sections.js"></script>       <!-- 3. Page registry (routes) -->
<script src="/js/components.js"></script>          <!-- 4. Builds navbar + footer -->
<script src="/js/skeleton.js"></script>            <!-- 5. Loads page content -->
```

Each script depends on the previous ones, so **order matters**.

### Step-by-Step Flow

#### 1. `i18n.js` — The Translation Engine

Creates `window.KatlaI18n` with these methods:
- `registerTranslations(lang, dict)` — adds key-value pairs for a language
- `t(key, fallback)` — returns the translated string for the current language
- `setLang(lang)` — switches language, saves to `localStorage`, fires a `langchange` event
- `applyTranslations()` — scans the DOM for `data-i18n` attributes and replaces text

Language is stored in `localStorage('katla-lang')`. On page load, it reads the saved preference (defaults to `'en'`).

#### 2. Translation Files (`js/translations/*.js`)

Each file is a self-executing IIFE that calls `registerTranslations` twice — once for English, once for Icelandic:

```js
(function () {
  window.KatlaI18n.registerTranslations('en', {
    'nav.home': 'Home',
    'nav.about': 'About',
    // ...
  });
  window.KatlaI18n.registerTranslations('is', {
    'nav.home': 'Heim',
    'nav.about': 'Um okkur',
    // ...
  });
})();
```

Key convention: `domain.section.key` → e.g. `home.hero.title`, `footer.link.blog`

#### 3. `nav-sections.js` — The Page Registry (Router)

This is the **single source of truth** for all pages. It defines `window.PAGE_REGISTRY`:

```js
window.PAGE_REGISTRY = {
  '/': {
    sections: [
      { url: '/pages/home/sections/hero.html' },
      { url: '/pages/home/sections/clients.html' },
      { url: '/pages/home/sections/services-overview.html' },
      // ...
    ],
    scripts: ['/js/main.js', '/js/animations.js']
  },
  '/pages/about/': {
    sections: [
      { url: '/pages/about/sections/header.html' },
      { url: '/pages/about/sections/mission.html', nav: { id: 'mission', name: 'Our Mission', i18nKey: 'navsec.about.mission' } },
      // ...
    ],
    scripts: ['/js/main.js', '/js/animations.js']
  }
};
```

Each page entry has:
- **`sections`**: Array of HTML fragment URLs to fetch and stitch together as the page body
- **`scripts`**: Page-specific JS files to load after the HTML is injected
- **`nav`** (optional on each section): If present, this section appears in the navbar dropdown for that page. Has `id` (anchor target), `name` (fallback label), `i18nKey` (translation key)

It also derives `window.NAV_SECTIONS` — a simplified lookup used by `components.js` to build dropdown menus:
```js
// Becomes: { '/pages/about/': [{id: 'mission', name: 'Our Mission', ...}, ...] }
```

And exposes `window.getPageConfig(path)` — a helper that converts a registry entry into the format `skeleton.js` expects.

#### 4. `components.js` — Navbar & Footer Builder

Reads `window.NAV_SECTIONS` and builds the complete navbar + footer HTML as strings, then injects them into `#navbar-root` and `#footer-root`.

Key behaviors:
- Uses `KatlaI18n.t()` for all visible text (so it's fully translatable)
- If a page has `nav` entries in the registry, it generates a **dropdown menu** for that page in the navbar
- Listens for `langchange` events and **re-renders everything** when the user switches language
- After re-render, calls `window.reinitNavbar()` to re-attach event listeners

The navbar is defined as a simple array:
```js
var navItems = [
  { i18nKey: 'nav.home', label: 'Home', href: '/' },
  { i18nKey: 'nav.about', label: 'About', href: '/pages/about/' },
  { i18nKey: 'nav.services', label: 'Services', href: '/pages/services/' },
  { i18nKey: 'nav.contact', label: 'Contact', href: '/pages/contact/', isCta: true }
];
```

To add/remove pages from the navbar, you edit this array.

#### 5. `skeleton.js` — The Page Content Loader

This is the "router". On every page load:

1. Reads `window.location.pathname`
2. Looks up the matching entry in `PAGE_REGISTRY` via `getPageConfig(path)`
3. Fetches **all section HTML files in parallel** using `Promise.all` + `fetch()`
4. Joins them in order and injects into `<main id="main-content">`
5. Calls `KatlaI18n.applyTranslations()` on the new content
6. Loads page-specific scripts **sequentially** (order matters for dependencies)
7. If the URL has a `#hash`, scrolls to that element

### How HTML Sections Work

Each section is a plain HTML fragment (no `<html>`, `<head>`, or `<body>` tags). Example (`hero.html`):

```html
<section id="hero" class="hero">
  <div class="hero__inner container">
    <h1 data-i18n="home.hero.title">Intelligent AI Solutions</h1>
    <p data-i18n="home.hero.subtitle">We design and build...</p>
    <a href="/pages/services/" class="btn" data-i18n="home.hero.cta1">Explore Services</a>
  </div>
</section>
```

Key points:
- Sections are **just HTML fragments**, not full pages
- Text uses `data-i18n="key"` attributes — the i18n system replaces the text
- The `id` on the `<section>` tag is used for anchor scrolling (`#hero`)

### The i18n Attribute System

| Attribute | What it translates |
|---|---|
| `data-i18n="key"` | `element.textContent` |
| `data-i18n-html="key"` | `element.innerHTML` (for strings with markup) |
| `data-i18n-placeholder="key"` | `element.placeholder` (form inputs) |
| `data-i18n-aria="key"` | `element.aria-label` (accessibility) |

---

## Part 2: Adapting for a New Project (One HTML File Per Page)

Instead of one `index.html` that dynamically loads fragments, your new site will have **separate HTML files** for each page. The navbar, footer, and i18n system still work the same way — they just get loaded on every page.

### New File Structure

```
your-project/
├── index.html                    # Home page
├── about.html                    # About page
├── services.html                 # Services page
├── contact.html                  # Contact page
├── blog.html                     # Blog page
├── css/
│   └── styles.css                # Single global stylesheet
├── assets/
│   └── images/                   # Logo, favicon, etc.
├── js/
│   ├── i18n.js                   # i18n engine (same as Katla)
│   ├── components.js             # Navbar & footer builder (simplified)
│   ├── nav-config.js             # Nav items + dropdown sections
│   ├── main.js                   # Navbar behaviors, smooth scroll
│   ├── animations.js             # Scroll reveal (optional)
│   └── translations/
│       ├── core.js               # Nav, footer, shared strings
│       ├── home.js               # Home page strings
│       ├── about.js              # About page strings
│       └── ...                   # One per page
└── page-scripts/                 # Page-specific logic (optional)
    ├── contact.js                # Contact form logic
    └── blog.js                   # Blog listing logic
```

### Each HTML Page Template

Every page follows this template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About | Your Site</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <!-- JS injects navbar here -->
    <div id="navbar-root"></div>

    <!-- PAGE CONTENT — written directly in this file -->
    <main id="main-content">
        <section id="hero" class="hero">
            <h1 data-i18n="about.hero.title">About Us</h1>
        </section>

        <section id="mission" class="mission">
            <h2 data-i18n="about.mission.title">Our Mission</h2>
            <p data-i18n="about.mission.text">We build things...</p>
        </section>

        <!-- More sections... -->
    </main>

    <!-- JS injects footer here -->
    <div id="footer-root"></div>

    <!-- Core scripts (SAME on every page, in this order) -->
    <script src="/js/i18n.js"></script>
    <script src="/js/translations/core.js"></script>
    <script src="/js/translations/about.js"></script>   <!-- page-specific translations -->
    <script src="/js/nav-config.js"></script>
    <script src="/js/components.js"></script>
    <script src="/js/main.js"></script>

    <!-- Page-specific scripts (only on pages that need them) -->
    <!-- <script src="/page-scripts/contact.js"></script> -->
</body>
</html>
```

**What changed vs Katla Intel:**
- Content is written **directly in each HTML file** instead of fetched from fragments
- No `skeleton.js` needed — there's nothing to fetch
- Translation files can be loaded per-page (only load what you need)
- You still use `data-i18n` attributes exactly the same way

### `nav-config.js` — Simplified Page Registry

Since there's no skeleton loader, this file just defines nav structure for `components.js`:

```js
/**
 * Navigation configuration.
 * - navItems: top-level navbar links
 * - NAV_SECTIONS: dropdown items per page (optional)
 */
window.NAV_ITEMS = [
  { i18nKey: 'nav.home', label: 'Home', href: '/' },
  { i18nKey: 'nav.about', label: 'About', href: '/about.html' },
  { i18nKey: 'nav.services', label: 'Services', href: '/services.html' },
  { i18nKey: 'nav.contact', label: 'Contact', href: '/contact.html', isCta: true }
];

// Dropdown sections for pages (keyed by href)
// Only add entries for pages that need dropdown menus
window.NAV_SECTIONS = {
  '/about.html': [
    { id: 'mission', name: 'Our Mission', i18nKey: 'navsec.about.mission' },
    { id: 'values', name: 'Our Values', i18nKey: 'navsec.about.values' },
    { id: 'team', name: 'Our Team', i18nKey: 'navsec.about.team' }
  ],
  '/services.html': [
    { id: 'web-dev', name: 'Web Development', i18nKey: 'navsec.services.webDev' },
    { id: 'design', name: 'Design', i18nKey: 'navsec.services.design' }
  ]
};
```

### `components.js` — What To Change

The only change is reading `NAV_ITEMS` from the config instead of hardcoding:

```js
(function () {
  var t = window.KatlaI18n ? window.KatlaI18n.t.bind(window.KatlaI18n) : function (k, fb) { return fb || k; };
  var getLang = window.KatlaI18n ? window.KatlaI18n.getLang.bind(window.KatlaI18n) : function () { return 'en'; };
  var navItems = window.NAV_ITEMS || [];

  function buildNavAndFooter() {
    var sections = window.NAV_SECTIONS || {};
    // ... rest is identical to Katla Intel's components.js
    // Build navbar HTML using navItems + sections
    // Build footer HTML
    // Inject into #navbar-root and #footer-root
  }

  buildNavAndFooter();
  window.addEventListener('langchange', function () {
    buildNavAndFooter();
    if (window.reinitNavbar) window.reinitNavbar();
  });
})();
```

### `i18n.js` — No Changes Needed

Copy it as-is. The i18n engine is generic — it doesn't care about the page structure.

After the content is already in the DOM (since it's written directly in each HTML file), the translations get applied automatically when `components.js` or your page script calls `applyTranslations()`.

Add this to the end of your `components.js` `buildNavAndFooter()` function:

```js
// Apply translations to page content already in the DOM
if (window.KatlaI18n) window.KatlaI18n.applyTranslations();
```

### `main.js` — No Changes Needed

Copy it as-is. It handles navbar toggle, smooth scrolling, active link highlighting, and dropdown behavior. All of that is the same regardless of page structure.

### Translation Files — Same Pattern

```js
// js/translations/about.js
(function () {
  window.KatlaI18n.registerTranslations('en', {
    'about.hero.title': 'About Us',
    'about.mission.title': 'Our Mission',
    'about.mission.text': 'We build amazing things...',
  });
  window.KatlaI18n.registerTranslations('is', {
    'about.hero.title': 'Um okkur',
    'about.mission.title': 'Hlutverk okkar',
    'about.mission.text': 'Við byggjum frábæra hluti...',
  });
})();
```

### What You Don't Need

These files from Katla Intel are **not needed** in the per-page approach:

| File | Why not needed |
|---|---|
| `skeleton.js` | No dynamic section loading — content is in each HTML file |
| `PAGE_REGISTRY` in `nav-sections.js` | Replaced by simpler `nav-config.js` |
| `pages/*/sections/*.html` | Content lives directly in each page's HTML |

---

## Part 3: Quick Comparison

| Aspect | Katla Intel (SPA-like) | Per-Page HTML |
|---|---|---|
| HTML files | 1 (`index.html`) | 1 per page (`about.html`, etc.) |
| Page content | Fetched as HTML fragments at runtime | Written directly in each HTML file |
| Routing | `skeleton.js` reads URL, fetches sections | Browser navigates to actual HTML files |
| Navbar/Footer | JS-injected (same) | JS-injected (same) |
| i18n | `data-i18n` attributes (same) | `data-i18n` attributes (same) |
| Nav config | `PAGE_REGISTRY` (complex, has section URLs) | `NAV_ITEMS` + `NAV_SECTIONS` (just nav data) |
| Adding a page | Add to registry + create section HTML files | Create new HTML file, add to `NAV_ITEMS` |
| Page load | 1 HTML + N fetch requests for sections | 1 HTML (everything included) |
| SEO | Harder (content loaded via JS) | Easier (content in source HTML) |
| Shared scripts | Loaded per-page via registry `scripts` array | Included via `<script>` tags in each HTML |

---

## Part 4: Step-by-Step to Create a New Site

1. **Create your project folder** with the structure shown above
2. **Copy `i18n.js`** as-is from Katla Intel
3. **Create `nav-config.js`** with your `NAV_ITEMS` and `NAV_SECTIONS`
4. **Adapt `components.js`** — read from `window.NAV_ITEMS` instead of hardcoded array, and call `applyTranslations()` at the end of `buildNavAndFooter()`
5. **Copy `main.js`** as-is (navbar behaviors)
6. **Create your CSS** (`styles.css`) — copy navbar/footer styles from Katla or write your own
7. **Create translation files** in `js/translations/` — one `core.js` for shared strings (nav, footer), one per page for page-specific strings
8. **Create each page HTML** using the template above — write content directly, use `data-i18n` attributes on translatable elements
9. **For each page**, include the core scripts in order + any page-specific translation files + any page-specific scripts

The key insight: **the navbar, footer, and i18n system are completely independent of whether content is loaded dynamically or written directly in HTML**. You're just removing the dynamic loading layer (`skeleton.js` and section fragments) and putting the content where it naturally belongs — in each page's HTML.
