/**
 * Sleipnir MC -- Main Script
 * Consolidated inline scripts: account menu toggle, logout, auth state listener.
 * Uses EVENT DELEGATION on document so handlers survive navbar re-renders.
 */
(function () {
    'use strict';

    /* -------------------------------------------------------------------
       Account menu toggle (event delegation)
       ------------------------------------------------------------------- */
    document.addEventListener('click', function (e) {
        // Toggle account menu when clicking the account icon button
        var iconBtn = e.target.closest('.account-icon-btn');
        if (iconBtn) {
            e.stopPropagation();
            var menu = iconBtn.closest('.account-menu');
            if (menu) {
                var authState = menu.getAttribute('data-auth');
                if (authState === 'logged-in') {
                    // Toggle dropdown
                    menu.classList.toggle('active');
                } else {
                    // Navigate to login
                    if (window.sleipnirRouter) {
                        window.sleipnirRouter.navigate('/login');
                    } else {
                        window.location.href = '/login';
                    }
                }
            }
            return;
        }

        // Close account menu when clicking outside
        var openMenu = document.querySelector('.account-menu.active');
        if (openMenu && !openMenu.contains(e.target)) {
            openMenu.classList.remove('active');
        }
    });

    /* -------------------------------------------------------------------
       Logout handler (event delegation)
       ------------------------------------------------------------------- */
    document.addEventListener('click', function (e) {
        var logoutBtn = e.target.closest('.logout-btn');
        if (!logoutBtn) return;

        e.preventDefault();

        if (typeof window.sleipnirAuth !== 'undefined' && window.sleipnirAuth.signOut) {
            window.sleipnirAuth.signOut().then(function (result) {
                if (result.success) {
                    if (window.sleipnirRouter) {
                        window.sleipnirRouter.navigate('/');
                    } else {
                        window.location.href = '/';
                    }
                }
            });
        }
    });

    /* -------------------------------------------------------------------
       Auth state change listener
       ------------------------------------------------------------------- */
    window.addEventListener('authStateChanged', function (event) {
        var detail = event.detail || {};
        var user = detail.user;
        var userDoc = detail.userDoc;

        if (user && userDoc) {
            var userNameElements = document.querySelectorAll('.account-menu .account-user-name');
            var displayName = userDoc.displayName || user.email.split('@')[0];
            for (var i = 0; i < userNameElements.length; i++) {
                userNameElements[i].textContent = displayName;
            }
        }
    });

    /* -------------------------------------------------------------------
       reinitNavbar -- re-attach any event listeners after navbar re-render.
       With event delegation, most handlers survive re-renders automatically.
       This function exists as a hook for other scripts that need notification.
       ------------------------------------------------------------------- */
    window.reinitNavbar = function () {
        // Event delegation handles click events automatically.
        // This hook is available for other modules that need to
        // re-bind after a navbar re-render (e.g., shop cart button).
    };
})();
