(function() {
    'use strict';

    // =============================================
    // ADMIN INIT — Auth gate & initialization orchestrator
    // Loads LAST after all other admin modules.
    // =============================================

    var authInitialized = false;

    function handleAuthState(detail) {
        if (authInitialized) return;
        authInitialized = true;

        var user = detail.user;
        var userDoc = detail.userDoc;

        if (!user || !userDoc || userDoc.role !== 'admin') {
            redirectToLogin();
            return;
        }

        // Additional protection via auth system
        (function() {
            var checkAuth = function() {
                try {
                    var verifyPromise;
                    if (typeof sleipnirAuth !== 'undefined' && sleipnirAuth.protectVerifiedPage) {
                        verifyPromise = sleipnirAuth.protectVerifiedPage('/login');
                    } else {
                        verifyPromise = Promise.resolve(true);
                    }

                    verifyPromise.then(function(isVerified) {
                        if (!isVerified) return;

                        var adminPromise;
                        if (typeof protectAdminPage === 'function') {
                            adminPromise = protectAdminPage();
                        } else {
                            adminPromise = Promise.resolve(true);
                        }

                        return adminPromise;
                    }).then(function(isAuthorized) {
                        if (!isAuthorized) return;
                        initializeAdmin(user, userDoc);
                    }).catch(function(error) {
                        console.error('Admin authentication error:', error);
                        redirectToLogin();
                    });
                } catch (error) {
                    console.error('Admin authentication error:', error);
                    redirectToLogin();
                }
            };
            checkAuth();
        })();
    }

    function redirectToLogin() {
        if (window.sleipnirRouter) {
            window.sleipnirRouter.navigate('/login?redirect=admin');
        } else {
            window.location.href = '/login?redirect=admin';
        }
    }

    // =============================================
    // Listen for auth state changes
    // =============================================

    window.addEventListener('authStateChanged', function(event) {
        handleAuthState(event.detail);
    });

    // =============================================
    // Handle case where authStateChanged already fired
    // before this script loaded (late-load scenario)
    // =============================================

    if (!authInitialized && typeof firebase !== 'undefined' && firebase.auth) {
        var currentUser = firebase.auth().currentUser;
        if (currentUser) {
            // User already signed in — fetch their doc and proceed
            firebase.firestore().collection('users').doc(currentUser.uid).get()
                .then(function(doc) {
                    if (doc.exists) {
                        handleAuthState({
                            user: currentUser,
                            userDoc: doc.data()
                        });
                    } else {
                        redirectToLogin();
                    }
                })
                .catch(function(error) {
                    console.error('Admin init: Error fetching user doc:', error);
                    redirectToLogin();
                });
        }
    }

    // =============================================
    // Timeout fallback — redirect if auth never resolves
    // =============================================

    setTimeout(function() {
        if (!authInitialized) {
            console.log('Admin panel: Auth state timeout');
            redirectToLogin();
        }
    }, 5000);

    // =============================================
    // ADMIN PANEL INITIALIZATION
    // =============================================

    function initializeAdmin(user, userDoc) {
        // Populate topbar user info
        var nameEl = document.getElementById('adminUserName');
        var avatarEl = document.getElementById('adminUserAvatar');
        var displayName = userDoc.displayName || user.email;

        if (nameEl) nameEl.textContent = displayName;
        if (avatarEl) {
            avatarEl.textContent = AdminApp.generateInitials(displayName);
            avatarEl.style.backgroundColor = AdminApp.generateAvatarColor(displayName);
        }

        // Hide loading overlay
        var loadingOverlay = document.getElementById('adminLoadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';

        // Setup logout button
        var logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                if (typeof sleipnirAuth !== 'undefined' && sleipnirAuth.adminSignOut) {
                    sleipnirAuth.adminSignOut().then(function() {
                        if (window.sleipnirRouter) {
                            window.sleipnirRouter.navigate('/');
                        } else {
                            window.location.href = '/';
                        }
                    });
                } else if (typeof firebase !== 'undefined' && firebase.auth) {
                    firebase.auth().signOut().then(function() {
                        if (window.sleipnirRouter) {
                            window.sleipnirRouter.navigate('/');
                        } else {
                            window.location.href = '/';
                        }
                    });
                }
            });
        }

        // Setup language toggle
        var langToggle = document.getElementById('adminLangToggle');
        var langLabel = document.getElementById('adminLangLabel');
        if (langToggle) {
            // Set initial label
            var currentLang = (window.SleipnirI18n && window.SleipnirI18n.getLang) ? window.SleipnirI18n.getLang() : 'is';
            if (langLabel) langLabel.textContent = currentLang === 'is' ? 'IS' : 'EN';

            langToggle.addEventListener('click', function() {
                var lang = window.SleipnirI18n.getLang() === 'is' ? 'en' : 'is';
                window.SleipnirI18n.setLang(lang);
                if (langLabel) langLabel.textContent = lang === 'is' ? 'IS' : 'EN';
            });
        }

        // Listen for language changes to re-render active section
        document.addEventListener('langchange', function() {
            // Re-apply translations to static elements
            if (window.SleipnirI18n && window.SleipnirI18n.applyTranslations) {
                window.SleipnirI18n.applyTranslations();
            }

            // Update breadcrumb
            var breadcrumb = document.getElementById('breadcrumbSection');
            if (breadcrumb && AdminApp._currentSection) {
                var names = AdminApp._sectionNames;
                if (names && names[AdminApp._currentSection]) {
                    breadcrumb.textContent = names[AdminApp._currentSection]();
                }
            }

            // Trigger re-render of current section
            if (AdminApp._currentSection) {
                document.dispatchEvent(new CustomEvent('sectionShow', { detail: { section: AdminApp._currentSection } }));
            }
        });

        // Initialize dashboard (default section)
        AdminApp.switchSection('dashboard');

        // Log admin login
        AdminApp.logActivity('admin_panel_opened', 'Admin panel accessed');
    }

})();
