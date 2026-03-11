/**
 * Sleipnir MC -- Skeleton Loader + Client-Side Router
 * Reads PAGE_REGISTRY, fetches section HTML fragments, injects into #content-root.
 * Intercepts internal link clicks for SPA-like navigation.
 */
(function () {
    'use strict';

    /* -------------------------------------------------------------------
       Route aliases: map old/alternate URLs to registry keys
       ------------------------------------------------------------------- */
    var ROUTE_ALIASES = {
        '/index.html': '/',
        '/pages/shop.html': '/shop',
        '/pages/about.html': '/about',
        '/pages/login.html': '/login',
        '/pages/admin.html': '/admin',
        '/pages/sagan.html': '/sagan',
        '/pages/contact.html': '/contact',
        '/pages/reykjavik.html': '/reykjavik',
        '/pages/akureyri.html': '/akureyri',
        '/shop.html': '/shop',
        '/admin.html': '/admin',
        '/login.html': '/login',
        '/about.html': '/about',
        '/sagan.html': '/sagan',
        '/contact.html': '/contact'
    };

    /* -------------------------------------------------------------------
       State
       ------------------------------------------------------------------- */
    var sectionCache = {};
    var currentPageScripts = [];
    var currentPageStyles = [];
    var currentPath = null;

    /* -------------------------------------------------------------------
       Normalize a pathname to a registry key
       ------------------------------------------------------------------- */
    function normalizePath(path) {
        // Strip trailing slash (except root)
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        // Check aliases
        if (ROUTE_ALIASES[path]) {
            return ROUTE_ALIASES[path];
        }
        // Check direct match
        if (window.PAGE_REGISTRY[path]) {
            return path;
        }
        return path;
    }

    /* -------------------------------------------------------------------
       Fetch a section HTML fragment (with in-memory caching)
       ------------------------------------------------------------------- */
    function fetchSection(url) {
        if (sectionCache[url]) {
            return Promise.resolve(sectionCache[url]);
        }
        return fetch(url).then(function (res) {
            if (!res.ok) throw new Error('Failed to fetch ' + url + ': ' + res.status);
            return res.text();
        }).then(function (html) {
            sectionCache[url] = html;
            return html;
        });
    }

    /* -------------------------------------------------------------------
       Fetch all sections for a page entry in parallel
       ------------------------------------------------------------------- */
    function fetchAllSections(entry) {
        var promises = entry.sections.map(function (sec) {
            return fetchSection(sec.url);
        });
        return Promise.all(promises);
    }

    /* -------------------------------------------------------------------
       Remove previously loaded page scripts
       ------------------------------------------------------------------- */
    function unloadScripts() {
        currentPageScripts.forEach(function (script) {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        });
        currentPageScripts = [];
    }

    /* -------------------------------------------------------------------
       Remove previously loaded page styles
       ------------------------------------------------------------------- */
    function unloadStyles() {
        currentPageStyles.forEach(function (link) {
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }
        });
        currentPageStyles = [];
    }

    /* -------------------------------------------------------------------
       Load page-specific styles
       ------------------------------------------------------------------- */
    function loadStyles(entry) {
        var styles = (entry.styles || []);
        styles.forEach(function (href) {
            // Check if already loaded globally
            var existing = document.querySelector('link[href="' + href + '"]');
            if (existing) return;

            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
            currentPageStyles.push(link);
        });
    }

    /* -------------------------------------------------------------------
       Load external scripts (e.g., Leaflet) then page scripts sequentially
       ------------------------------------------------------------------- */
    function loadScripts(entry) {
        var externalScripts = entry.externalScripts || [];
        var pageScripts = entry.scripts || [];

        // Load external scripts first, then page scripts
        return loadScriptSequence(externalScripts).then(function () {
            return loadScriptSequence(pageScripts);
        });
    }

    function loadScriptSequence(urls) {
        var promise = Promise.resolve();
        urls.forEach(function (url) {
            promise = promise.then(function () {
                return loadSingleScript(url);
            });
        });
        return promise;
    }

    function loadSingleScript(url) {
        return new Promise(function (resolve, reject) {
            // Check if an external script is already loaded globally
            var existing = document.querySelector('script[src="' + url + '"]');
            if (existing && url.indexOf('http') === 0) {
                resolve();
                return;
            }

            var script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = function () {
                console.error('Failed to load script: ' + url);
                resolve(); // Don't block on script failure
            };
            document.body.appendChild(script);
            currentPageScripts.push(script);
        });
    }

    /* -------------------------------------------------------------------
       Update layout based on page entry (bare, admin, default)
       ------------------------------------------------------------------- */
    function updateLayout(entry) {
        var navRoot = document.getElementById('navbar-root');
        var footerRoot = document.getElementById('footer-root');
        var layout = entry.layout || 'default';

        if (layout === 'bare') {
            // No navbar, no footer (login page)
            if (navRoot) navRoot.style.display = 'none';
            if (footerRoot) footerRoot.style.display = 'none';
        } else if (layout === 'admin') {
            // Admin has its own inline navbar in the section, hide injected navbar/footer
            if (navRoot) navRoot.style.display = 'none';
            if (footerRoot) footerRoot.style.display = 'none';
        } else {
            // Default: show navbar and footer
            if (navRoot) navRoot.style.display = '';
            if (footerRoot) footerRoot.style.display = '';
        }

        // Update body class
        document.body.className = entry.bodyClass || '';
    }

    /* -------------------------------------------------------------------
       Main page loader
       ------------------------------------------------------------------- */
    function loadPage(path, pushState) {
        // Extract query string before normalization
        var queryString = '';
        var pathOnly = path;
        var qIndex = path.indexOf('?');
        if (qIndex !== -1) {
            queryString = path.substring(qIndex);
            pathOnly = path.substring(0, qIndex);
        }

        var registryPath = normalizePath(pathOnly);
        var entry = window.PAGE_REGISTRY[registryPath];

        if (!entry) {
            // 404 — try loading the 404 page
            var contentRoot = document.getElementById('content-root');
            if (contentRoot) {
                contentRoot.innerHTML = '<div style="text-align:center; padding: 100px 20px;"><h1 style="font-size: 72px; color: #cf2342;">404</h1><p style="color: #ccc; font-size: 1.2rem;">Page not found</p><a href="/" style="color: #cf2342;">Go Home</a></div>';
            }
            return Promise.resolve();
        }

        // Don't reload if same page
        if (currentPath === registryPath && !pushState) {
            return Promise.resolve();
        }

        currentPath = registryPath;

        // Update URL if needed (preserve query string)
        if (pushState) {
            var fullUrl = (registryPath === '/' ? '/' : registryPath) + queryString;
            if (window.location.pathname + window.location.search !== fullUrl) {
                history.pushState({ path: registryPath }, '', fullUrl);
            }
        }

        // Update document title
        document.title = entry.title || 'Sleipnir MC';

        // Unload previous page resources
        unloadScripts();
        unloadStyles();

        // Update layout (navbar/footer visibility)
        updateLayout(entry);

        // Load page-specific styles
        loadStyles(entry);

        // Fetch and inject sections
        return fetchAllSections(entry).then(function (htmlFragments) {
            var contentRoot = document.getElementById('content-root');
            if (contentRoot) {
                contentRoot.innerHTML = htmlFragments.join('\n');
            }

            // Apply i18n translations to new content
            if (window.SleipnirI18n && window.SleipnirI18n.applyTranslations) {
                window.SleipnirI18n.applyTranslations();
            }

            // Update active nav link
            updateActiveNavLink(registryPath);

            // Load page scripts (after DOM content is injected)
            return loadScripts(entry);
        }).then(function () {
            // Scroll to top on navigation
            window.scrollTo(0, 0);

            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('pageLoaded', {
                detail: { path: registryPath, entry: entry }
            }));
        }).catch(function (error) {
            console.error('Error loading page:', error);
            var contentRoot = document.getElementById('content-root');
            if (contentRoot) {
                contentRoot.innerHTML = '<div style="text-align:center; padding: 100px 20px;"><p style="color: #cf2342;">Error loading page. Please try again.</p></div>';
            }
        });
    }

    /* -------------------------------------------------------------------
       Update active state on nav links
       ------------------------------------------------------------------- */
    function updateActiveNavLink(path) {
        var navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(function (link) {
            var href = link.getAttribute('href');
            if (href === path || (path === '/' && href === '/')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /* -------------------------------------------------------------------
       Client-side routing: intercept link clicks
       ------------------------------------------------------------------- */
    document.addEventListener('click', function (e) {
        var link = e.target.closest('a[href]');
        if (!link) return;

        var href = link.getAttribute('href');

        // Skip external links, anchors, javascript:, mailto:, tel:
        if (!href || href.startsWith('http') || href.startsWith('#') ||
            href.startsWith('javascript:') || href.startsWith('mailto:') ||
            href.startsWith('tel:')) {
            return;
        }

        // Skip links with target="_blank"
        if (link.target === '_blank') return;

        // Skip links with download attribute
        if (link.hasAttribute('download')) return;

        // Skip modifier key clicks (open in new tab)
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;

        // Normalize the path (strip query string for registry lookup)
        var hrefPath = href.split('?')[0];
        var normalizedPath = normalizePath(hrefPath);

        // Only handle paths that exist in the registry
        if (!window.PAGE_REGISTRY[normalizedPath]) return;

        e.preventDefault();
        loadPage(href, true);
    });

    /* -------------------------------------------------------------------
       Handle browser back/forward buttons
       ------------------------------------------------------------------- */
    window.addEventListener('popstate', function (e) {
        var path = window.location.pathname;
        loadPage(path, false);
    });

    /* -------------------------------------------------------------------
       Initial page load
       ------------------------------------------------------------------- */
    function init() {
        var path = window.location.pathname;
        var search = window.location.search;
        // Replace current history entry with normalized path (preserve query string)
        var normalizedPath = normalizePath(path);
        if (normalizedPath !== path && normalizedPath !== '/') {
            history.replaceState({ path: normalizedPath }, '', normalizedPath + search);
        }
        loadPage(path + search, false);
    }

    // Expose for external use
    window.sleipnirRouter = {
        navigate: function (path) {
            loadPage(path, true);
        },
        getCurrentPath: function () {
            return currentPath;
        }
    };

    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
