/**
 * Sleipnir MC -- Shared Components (Navbar + Footer)
 * Generates and injects navbar/footer HTML into #navbar-root and #footer-root.
 * Rebuilds on langchange so translated text stays current.
 */
(function () {
    'use strict';

    var t = window.SleipnirI18n.t;
    var getLang = window.SleipnirI18n.getLang;

    /* -------------------------------------------------------------------
       Helper: determine if a path matches the current page
       ------------------------------------------------------------------- */
    function isActive(href) {
        var path = window.location.pathname;
        // Normalize path
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        if (href === '/' || href === '/index.html') {
            return path === '/' || path === '/index.html';
        }
        return path === href;
    }

    /* -------------------------------------------------------------------
       Build nav link list items from NAV_ITEMS config (recursive)
       ------------------------------------------------------------------- */
    function buildNavItems(items) {
        var html = '';
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var label = t(item.i18nKey, item.label);
            var activeClass = isActive(item.href) ? ' class="active"' : '';

            if (item.children && item.children.length) {
                html += '<li class="nav-dropdown">';
                html += '<a href="' + item.href + '">' + label + '</a>';
                html += '<ul class="dropdown-menu">';

                for (var j = 0; j < item.children.length; j++) {
                    var child = item.children[j];
                    var childLabel = t(child.i18nKey, child.label);
                    var childActive = isActive(child.href) ? ' class="active"' : '';

                    if (child.children && child.children.length) {
                        html += '<li class="nav-dropdown-nested">';
                        html += '<a href="' + child.href + '">' + childLabel + '</a>';
                        html += '<ul class="dropdown-menu-nested">';
                        for (var k = 0; k < child.children.length; k++) {
                            var nested = child.children[k];
                            var nestedLabel = t(nested.i18nKey, nested.label);
                            var nestedActive = isActive(nested.href) ? ' class="active"' : '';
                            html += '<li><a href="' + nested.href + '"' + nestedActive + '>' + nestedLabel + '</a></li>';
                        }
                        html += '</ul>';
                        html += '</li>';
                    } else {
                        html += '<li><a href="' + child.href + '"' + childActive + '>' + childLabel + '</a></li>';
                    }
                }

                html += '</ul>';
                html += '</li>';
            } else {
                html += '<li><a href="' + item.href + '"' + activeClass + '>' + label + '</a></li>';
            }
        }
        return html;
    }

    /* -------------------------------------------------------------------
       Read cached auth state from localStorage for instant initial render
       ------------------------------------------------------------------- */
    function getCachedAuth() {
        try {
            var raw = localStorage.getItem('sleipnir_auth_cache');
            if (!raw) return null;
            var data = JSON.parse(raw);
            // Expire cache after 24 hours
            if (Date.now() - data.timestamp > 86400000) {
                localStorage.removeItem('sleipnir_auth_cache');
                return null;
            }
            return data;
        } catch (e) { return null; }
    }

    /* -------------------------------------------------------------------
       Build the full navbar HTML
       ------------------------------------------------------------------- */
    function buildNavbar() {
        var lang = getLang();
        var langToggleLabel = lang === 'is' ? t('nav.lang.toggle.is', 'EN') : t('nav.lang.toggle.en', 'IS');
        var cartLabel = t('nav.cart', 'Karfa');
        var logoutLabel = t('nav.logout', '\u00datskr\u00e1');
        var ordersLabel = t('nav.orders', 'Pantanir m\u00ednar');
        var outstandingLabel = t('nav.outstanding', '\u00d3afgreiddar pantanir');
        var adminLabel = t('nav.admin', 'Stj\u00f3rnbor\u00f0');
        var accountLabel = t('nav.account', 'Minn a\u00f0gangur');

        // Read cached auth state for instant initial render
        var cached = getCachedAuth();
        var initialAuth = cached && cached.isLoggedIn ? 'logged-in' : 'logged-out';
        var cachedName = (cached && cached.displayName) ? cached.displayName : '';

        var html = '';
        html += '<header>';
        html += '<nav>';

        // Logo
        html += '<div class="logo">';
        html += '<a href="/" class="logo-link">';
        html += '<span class="logo-text">SLEIPNIR MC</span>';
        html += '<span class="location">REYKJAV\u00cdK</span>';
        html += '</a>';
        html += '</div>';

        // Nav links
        html += '<ul class="nav-links">';
        html += buildNavItems(window.NAV_ITEMS);
        html += '</ul>';

        // Nav controls
        html += '<div class="nav-controls nav-controls-ghost">';

        // Language toggle
        html += '<div class="language-toggle">';
        html += '<button class="ghost-btn language-ghost" onclick="toggleLanguage()">';
        html += langToggleLabel;
        html += '</button>';
        html += '</div>';

        // Cart toggle
        html += '<div class="cart-toggle">';
        html += '<button class="ghost-btn cart-ghost" id="cartBtn">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
        html += '<path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z"/>';
        html += '<path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z"/>';
        html += '<path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"/>';
        html += '</svg>';
        html += '<span class="cart-text">' + cartLabel + '</span>';
        html += '<span class="cart-count" id="cartCount">0</span>';
        html += '</button>';
        html += '</div>';

        // Account icon (persistent — no auth-loading dance)
        var loginLabel = t('nav.login', 'Innskrá');

        html += '<div class="account-menu" data-auth="' + initialAuth + '">';
        html += '<button class="ghost-btn account-icon-btn" aria-label="' + accountLabel + '" data-i18n-aria="nav.account">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
        html += '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>';
        html += '<circle cx="12" cy="7" r="4"/>';
        html += '</svg>';
        html += '</button>';
        // Logged-in dropdown
        html += '<div class="account-dropdown account-dropdown-logged-in">';
        html += '<div class="account-dropdown-header">';
        html += '<div class="account-user-name">' + cachedName + '</div>';
        html += '<div class="member-status-badge"></div>';
        html += '</div>';
        html += '<a href="#" class="orders-link">' + ordersLabel + '</a>';
        html += '<a href="#" class="outstanding-orders-link">' + outstandingLabel + '</a>';
        html += '<a href="/admin" class="admin-link" style="display: none;">' + adminLabel + '</a>';
        html += '<a href="#" class="logout-btn">' + logoutLabel + '</a>';
        html += '</div>';
        // Logged-out dropdown
        html += '<div class="account-dropdown account-dropdown-logged-out">';
        html += '<a href="/login" class="login-link">' + loginLabel + '</a>';
        html += '</div>';
        html += '</div>';

        html += '</div>'; // .nav-controls
        html += '</nav>';
        html += '</header>';

        return html;
    }

    /* -------------------------------------------------------------------
       Build the footer HTML
       ------------------------------------------------------------------- */
    function buildFooter() {
        var html = '';
        html += '<footer>';
        html += '<div class="footer-content">';
        html += '<div class="footer-section">';
        html += '<h4>Sleipnir MC Reykjav\u00edk</h4>';
        html += '<p data-i18n="footer.tagline">' + t('footer.tagline', 'R\u00ed\u00f0um \u00ed gegnum lj\u00f3san\u00f3tt s\u00ed\u00f0an 2015') + '</p>';
        html += '</div>';
        html += '<div class="social-links">';
        html += '<a href="https://www.facebook.com/sleipnirmcreykjavik" target="_blank" rel="noopener noreferrer" aria-label="Facebook">\u27E8f\u27E9</a>';
        html += '<a href="#" aria-label="Instagram">\u27E8\u16C1\u27E9</a>';
        html += '<a href="mailto:sleipnirmcreykjavik@gmail.com" aria-label="Email">\u27E8@\u27E9</a>';
        html += '</div>';
        html += '<div class="footer-bottom">';
        html += '<p>&copy; 2025 Sleipnir MC Reykjav\u00edk. <span data-i18n="footer.rights">' + t('footer.rights', 'Allur r\u00e9ttur \u00e1skilinn.') + '</span></p>';
        html += '</div>';
        html += '</div>';
        html += '</footer>';

        return html;
    }

    /* -------------------------------------------------------------------
       Inject components into the page
       ------------------------------------------------------------------- */
    function inject() {
        var navRoot = document.getElementById('navbar-root');
        var footerRoot = document.getElementById('footer-root');

        if (navRoot) {
            navRoot.innerHTML = buildNavbar();
        }

        if (footerRoot) {
            footerRoot.innerHTML = buildFooter();
        }

        // Re-attach interactive handlers
        if (typeof window.reinitNavbar === 'function') {
            window.reinitNavbar();
        }

        // Notify other scripts that navbar is ready
        window.dispatchEvent(new CustomEvent('navbarRendered'));
    }

    /* -------------------------------------------------------------------
       Initial render on DOMContentLoaded
       ------------------------------------------------------------------- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }

    /* -------------------------------------------------------------------
       Re-render on language change
       ------------------------------------------------------------------- */
    window.addEventListener('langchange', function () {
        inject();
    });
})();
