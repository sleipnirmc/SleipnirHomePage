(function() {
    'use strict';

    // =============================================
    // HELPERS
    // =============================================

    window.AdminApp = {
        formatPrice: function(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr.';
        },
        formatDate: function(dateStr) {
            if (!dateStr) return '\u2014';
            var d = new Date(dateStr);
            return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric' });
        },
        formatDateTime: function(dateStr) {
            if (!dateStr) return '\u2014';
            var d = new Date(dateStr);
            return d.toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        },
        generateInitials: function(name) {
            if (!name) return '?';
            return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
        },
        generateAvatarColor: function(name) {
            var hash = 0;
            for (var i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            var colors = [
                '#cf2342', '#8b1a30', '#a0213c', '#6b1525', '#d4365a',
                '#922040', '#7a1832', '#b52548', '#993344', '#cc2244'
            ];
            return colors[Math.abs(hash) % colors.length];
        },

        // =============================================
        // TOAST SYSTEM
        // =============================================

        showToast: function(message, type, duration) {
            type = type || 'info';
            duration = duration || 3000;
            var container = document.getElementById('toastContainer');
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
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalBody').innerHTML = bodyHTML;
            document.getElementById('modalFooter').innerHTML = footerHTML || '';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        closeModal: function() {
            var overlay = document.getElementById('modalOverlay');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    // =============================================
    // SIDEBAR NAVIGATION
    // =============================================

    var sidebarLinks = document.querySelectorAll('.sidebar-link');
    var pages = document.querySelectorAll('.admin-page');
    var breadcrumb = document.getElementById('breadcrumbSection');

    var sectionNames = {
        dashboard: 'Dashboard',
        members: 'Me\u00F0limir',
        users: 'Notendur',
        products: 'V\u00F6rur',
        events: 'Vi\u00F0bur\u00F0ir',
        orders: 'Pantanir',
        export: 'G\u00F6gn og \u00DAtflutningur'
    };

    // Section initialization tracking
    var initialized = {};

    window.AdminApp.switchSection = function(section) {
        // Update sidebar active state
        sidebarLinks.forEach(function(link) {
            link.classList.toggle('active', link.dataset.section === section);
        });

        // Update pages
        pages.forEach(function(page) {
            page.classList.toggle('active', page.id === 'page-' + section);
        });

        // Update breadcrumb
        breadcrumb.textContent = sectionNames[section] || section;

        // Trigger section init if first time
        if (!initialized[section]) {
            initialized[section] = true;
            var event = new CustomEvent('sectionInit', { detail: { section: section } });
            document.dispatchEvent(event);
        }

        // Always trigger section show (for re-renders)
        var showEvent = new CustomEvent('sectionShow', { detail: { section: section } });
        document.dispatchEvent(showEvent);
    };

    sidebarLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var section = this.dataset.section;
            window.AdminApp.switchSection(section);

            // Close mobile sidebar
            document.querySelector('.admin-sidebar').classList.remove('open');
        });
    });

    // =============================================
    // SIDEBAR COLLAPSE
    // =============================================

    var layout = document.querySelector('.admin-layout');
    var collapseBtn = document.getElementById('sidebarCollapseBtn');

    if (collapseBtn) {
        collapseBtn.addEventListener('click', function() {
            layout.classList.toggle('collapsed');
            // Rotate the arrow icon
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
    var sidebar = document.querySelector('.admin-sidebar');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }

    // =============================================
    // MODAL CLOSE HANDLERS
    // =============================================

    document.getElementById('modalCloseBtn').addEventListener('click', AdminApp.closeModal);
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
        if (e.target === this) AdminApp.closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') AdminApp.closeModal();
    });

    // =============================================
    // INITIALIZE DASHBOARD ON LOAD
    // =============================================

    // Dashboard is the default active section
    initialized['dashboard'] = true;
    document.dispatchEvent(new CustomEvent('sectionInit', { detail: { section: 'dashboard' } }));
    document.dispatchEvent(new CustomEvent('sectionShow', { detail: { section: 'dashboard' } }));

})();