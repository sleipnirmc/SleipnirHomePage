(function() {
    'use strict';

    // =============================================
    // ADMIN APP — Core module
    // All other admin modules depend on window.AdminApp
    // =============================================

    var sectionNames = {
        dashboard: function() { return SleipnirI18n.t('admin.nav.dashboard', 'Dashboard'); },
        members:   function() { return SleipnirI18n.t('admin.nav.members', 'Me\u00F0limir'); },
        users:     function() { return SleipnirI18n.t('admin.nav.users', 'Notendur'); },
        products:  function() { return SleipnirI18n.t('admin.nav.products', 'V\u00F6rur'); },
        events:    function() { return SleipnirI18n.t('admin.nav.events', 'Vi\u00F0bur\u00F0ir'); },
        orders:    function() { return SleipnirI18n.t('admin.nav.orders', 'Pantanir'); },
        export:    function() { return SleipnirI18n.t('admin.nav.export', '\u00DAtflutningur'); }
    };

    // Section initialization tracking
    var initialized = {};

    window.AdminApp = {

        // Expose section names for breadcrumb updates (used by admin-init.js on langchange)
        _sectionNames: sectionNames,
        _currentSection: null,

        // =============================================
        // FIREBASE CONVENIENCE
        // =============================================

        db: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore() : null,

        // =============================================
        // FORMATTING HELPERS
        // =============================================

        formatPrice: function(num) {
            if (num == null) return '0 kr.';
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr.';
        },

        formatDate: function(dateStr) {
            if (!dateStr) return '\u2014';
            var d = new Date(dateStr);
            if (isNaN(d.getTime())) return '\u2014';
            return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric' });
        },

        formatDateTime: function(dateStr) {
            if (!dateStr) return '\u2014';
            var d = new Date(dateStr);
            if (isNaN(d.getTime())) return '\u2014';
            return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        },

        formatFirestoreDate: function(val) {
            if (!val) return '\u2014';
            var d = (val && val.toDate) ? val.toDate() : new Date(val);
            if (isNaN(d.getTime())) return '\u2014';
            return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric' });
        },

        formatFirestoreDateTime: function(val) {
            if (!val) return '\u2014';
            var d = (val && val.toDate) ? val.toDate() : new Date(val);
            if (isNaN(d.getTime())) return '\u2014';
            return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        },

        // =============================================
        // AVATAR / INITIALS
        // =============================================

        generateInitials: function(name) {
            if (!name) return '?';
            return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
        },

        generateAvatarColor: function(name) {
            var hash = 0;
            var str = name || '';
            for (var i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            var colors = [
                '#cf2342', '#8b1a30', '#a0213c', '#6b1525', '#d4365a',
                '#922040', '#7a1832', '#b52548', '#993344', '#cc2244'
            ];
            return colors[Math.abs(hash) % colors.length];
        },

        // =============================================
        // SANITIZATION UTILITIES
        // =============================================

        escapeHTML: function(str) {
            var div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        escapeAttr: function(str) {
            return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },

        // =============================================
        // UTILITY FUNCTIONS
        // =============================================

        debounce: function(fn, delay) {
            var timer = null;
            return function() {
                var context = this;
                var args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function() {
                    fn.apply(context, args);
                }, delay);
            };
        },

        // =============================================
        // ACTIVITY LOGGING
        // =============================================

        logActivity: function(action, details) {
            try {
                firebase.firestore().collection('adminActivityLog').add({
                    action: action,
                    details: details || '',
                    userId: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown',
                    userEmail: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'unknown',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    userAgent: navigator.userAgent
                });
            } catch (e) {
                console.error('Error logging activity:', e);
            }
        },

        // =============================================
        // LOADING HELPERS
        // =============================================

        showLoading: function(container) {
            if (!container) return;
            container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></div>';
        },

        hideLoading: function(container) {
            // Caller replaces innerHTML after this
        },

        // =============================================
        // TOAST SYSTEM
        // =============================================

        showToast: function(message, type, duration) {
            type = type || 'info';
            duration = duration || 3000;
            var container = document.getElementById('toastContainer');
            if (!container) return;

            var toast = document.createElement('div');
            toast.className = 'toast toast--' + type;

            var icons = {
                success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
                error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
                info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            };

            toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span class="toast-message">' + message + '</span>';
            toast.style.setProperty('--toast-duration', duration + 'ms');
            container.appendChild(toast);

            requestAnimationFrame(function() {
                toast.classList.add('show');
            });

            setTimeout(function() {
                toast.classList.remove('show');
                setTimeout(function() { toast.remove(); }, 400);
            }, duration);
        },

        // =============================================
        // MODAL SYSTEM
        // =============================================

        openModal: function(title, bodyHTML, footerHTML) {
            var overlay = document.getElementById('modalOverlay');
            var titleEl = document.getElementById('modalTitle');
            var bodyEl = document.getElementById('modalBody');
            var footerEl = document.getElementById('modalFooter');
            if (!overlay || !titleEl || !bodyEl || !footerEl) return;

            titleEl.textContent = title;
            bodyEl.innerHTML = bodyHTML;
            footerEl.innerHTML = footerHTML || '';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        closeModal: function() {
            var overlay = document.getElementById('modalOverlay');
            if (!overlay) return;
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        },

        // =============================================
        // TEMPLATE MODAL HELPERS
        // =============================================

        openTemplateModal: function() {
            var overlay = document.getElementById('templateModalOverlay');
            if (overlay) overlay.classList.add('active');
        },

        closeTemplateModal: function() {
            var overlay = document.getElementById('templateModalOverlay');
            if (overlay) overlay.classList.remove('active');
        },

        // =============================================
        // BULK MEMBER MODAL HELPERS
        // =============================================

        openBulkMemberModal: function() {
            var overlay = document.getElementById('bulkMemberModalOverlay');
            if (overlay) overlay.classList.add('active');
        },

        closeBulkMemberModal: function() {
            var overlay = document.getElementById('bulkMemberModalOverlay');
            if (overlay) overlay.classList.remove('active');
        },

        // =============================================
        // SECTION SWITCHING
        // =============================================

        switchSection: function(section) {
            // Cache DOM queries each call (SPA may inject new elements)
            var sidebarLinks = document.querySelectorAll('.sidebar-link');
            var pages = document.querySelectorAll('.admin-page');
            var breadcrumb = document.getElementById('breadcrumbSection');

            // Update sidebar active state
            sidebarLinks.forEach(function(link) {
                link.classList.toggle('active', link.dataset.section === section);
            });

            // Update pages
            pages.forEach(function(page) {
                page.classList.toggle('active', page.id === 'page-' + section);
            });

            // Update breadcrumb
            if (breadcrumb) {
                var nameFn = sectionNames[section];
                breadcrumb.textContent = nameFn ? nameFn() : section;
            }

            // Track current section
            AdminApp._currentSection = section;

            // Trigger section init if first time
            if (!initialized[section]) {
                initialized[section] = true;
                document.dispatchEvent(new CustomEvent('sectionInit', { detail: { section: section } }));
            }

            // Always trigger section show (for re-renders)
            document.dispatchEvent(new CustomEvent('sectionShow', { detail: { section: section } }));
        }
    };

    // =============================================
    // SIDEBAR NAVIGATION — click handlers
    // =============================================

    // Use event delegation on the sidebar so it works even if
    // sidebar links are injected after this script loads.
    var sidebarEl = document.querySelector('.admin-sidebar');
    if (sidebarEl) {
        sidebarEl.addEventListener('click', function(e) {
            var link = e.target.closest('.sidebar-link');
            if (!link) return;
            e.preventDefault();
            var section = link.dataset.section;
            if (section) {
                AdminApp.switchSection(section);
                // Close mobile sidebar
                sidebarEl.classList.remove('open');
            }
        });
    }

    // =============================================
    // SIDEBAR COLLAPSE
    // =============================================

    var layout = document.querySelector('.admin-layout');
    var collapseBtn = document.getElementById('sidebarCollapseBtn');

    if (collapseBtn && layout) {
        collapseBtn.addEventListener('click', function() {
            layout.classList.toggle('collapsed');
            this.classList.toggle('rotated');
            localStorage.setItem('sidebarCollapsed', layout.classList.contains('collapsed'));
        });

        // Restore state
        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            layout.classList.add('collapsed');
            collapseBtn.classList.add('rotated');
        }
    }

    // =============================================
    // MOBILE HAMBURGER
    // =============================================

    var hamburger = document.getElementById('hamburgerBtn');
    if (hamburger && sidebarEl) {
        hamburger.addEventListener('click', function() {
            sidebarEl.classList.toggle('open');
        });
    }

    // =============================================
    // MODAL CLOSE HANDLERS
    // =============================================

    var modalCloseBtn = document.getElementById('modalCloseBtn');
    var modalOverlay = document.getElementById('modalOverlay');

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', function() {
            AdminApp.closeModal();
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) AdminApp.closeModal();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            AdminApp.closeModal();
            AdminApp.closeTemplateModal();
            AdminApp.closeBulkMemberModal();
        }
    });

    // NOTE: Dashboard initialization is NOT auto-fired here.
    // admin-init.js triggers AdminApp.switchSection('dashboard')
    // after authentication succeeds.

})();
