/**
 * Sleipnir MC -- Main Script
 * Consolidated inline scripts: user menu toggle, logout, auth state listener.
 * Uses EVENT DELEGATION on document so handlers survive navbar re-renders.
 */
(function () {
    'use strict';

    /* -------------------------------------------------------------------
       User menu toggle (event delegation)
       ------------------------------------------------------------------- */
    document.addEventListener('click', function (e) {
        // Toggle user menu when clicking the toggle button
        var toggle = e.target.closest('.user-menu-toggle');
        if (toggle) {
            e.stopPropagation();
            var menu = toggle.closest('.user-menu');
            if (menu) {
                menu.classList.toggle('active');
            }
            return;
        }

        // Close user menu when clicking outside
        var openMenu = document.querySelector('.user-menu.active');
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
                    window.location.href = '/index.html';
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
            var userNameElements = document.querySelectorAll('.user-menu .user-name');
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
