(function() {
    'use strict';

    if (!document.getElementById('page-dashboard')) return;

    // =============================================
    // USERS MODULE — Firebase-backed user management
    // =============================================

    var allUsers = [];
    var sortField = 'displayName';
    var sortDir = 'asc';
    var currentPage = 1;
    var perPage = 10;
    var initialized = false;

    // =============================================
    // LOAD USERS FROM FIREBASE
    // =============================================

    function loadUsers() {
        var tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">Hle\u00F0 notendum...</td></tr>';

        try {
            sleipnirAuth.getAllUsers().then(function(users) {
                allUsers = users || [];
                currentPage = 1;
                renderUsers();
            }).catch(function(err) {
                console.error('Error loading users:', err);
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#f44336;">Villa vi\u00F0 a\u00F0 hla\u00F0a notendum</td></tr>';
                AdminApp.showToast('Villa vi\u00F0 a\u00F0 hla\u00F0a notendum', 'error');
            });
        } catch (err) {
            console.error('Error initiating users load:', err);
        }
    }

    // =============================================
    // FILTER & SORT
    // =============================================

    function getFilteredUsers() {
        var searchEl = document.getElementById('userSearch');
        var filterEl = document.getElementById('userFilter');
        var search = searchEl ? searchEl.value.toLowerCase() : '';
        var filter = filterEl ? filterEl.value : 'all';

        var filtered = allUsers.filter(function(u) {
            // Search filter
            var matchSearch = !search ||
                (u.displayName && u.displayName.toLowerCase().indexOf(search) !== -1) ||
                (u.email && u.email.toLowerCase().indexOf(search) !== -1);

            // Role filter
            var matchFilter = filter === 'all' ||
                (filter === 'members' && u.members === true) ||
                (filter === 'nonmembers' && u.members !== true);

            return matchSearch && matchFilter;
        });

        // Sort
        filtered.sort(function(a, b) {
            var aVal = a[sortField] || '';
            var bVal = b[sortField] || '';

            // Handle booleans
            if (typeof aVal === 'boolean' || typeof bVal === 'boolean') {
                aVal = aVal ? 1 : 0;
                bVal = bVal ? 1 : 0;
            }

            // Handle Firestore Timestamps
            if (aVal && typeof aVal.toDate === 'function') aVal = aVal.toDate().getTime();
            if (bVal && typeof bVal.toDate === 'function') bVal = bVal.toDate().getTime();

            // Handle strings
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }

    // =============================================
    // RENDER TABLE
    // =============================================

    function renderUsers() {
        var tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        var filtered = getFilteredUsers();
        var totalPages = Math.ceil(filtered.length / perPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        var start = (currentPage - 1) * perPage;
        var pageData = filtered.slice(start, start + perPage);

        var html = '';
        if (pageData.length === 0) {
            html = '<tr><td colspan="7" class="empty-cell">' +
                SleipnirI18n.t('admin.users.noResults', 'Engir notendur fundust') +
                '</td></tr>';
        } else {
            pageData.forEach(function(user) {
                var displayName = AdminApp.escapeHTML(user.displayName || user.name || 'N/A');
                var email = AdminApp.escapeHTML(user.email || 'N/A');
                var role = user.role || 'user';
                var createdAt = AdminApp.formatFirestoreDate(user.createdAt);
                var lastLogin = AdminApp.formatFirestoreDate(user.lastLogin);
                var userId = AdminApp.escapeAttr(user.id);

                // Status badge
                var statusBadge;
                if (role === 'admin') {
                    statusBadge = '<span class="badge badge--admin">Admin</span>';
                } else if (user.members === true) {
                    statusBadge = '<span class="badge badge--member">' +
                        SleipnirI18n.t('admin.users.member', 'Me\u00F0limur') + '</span>';
                } else {
                    statusBadge = '<span class="badge badge--guest">' +
                        SleipnirI18n.t('admin.users.guest', 'Gestur') + '</span>';
                }

                // Action column
                var actionHtml = '';
                if (role === 'admin') {
                    actionHtml = '<span style="color:#888;">Admin</span>';
                } else if (user.members === true) {
                    actionHtml = '<button class="btn btn-sm btn-danger" onclick="UsersModule.toggleMember(\'' + userId + '\', false)">' +
                        SleipnirI18n.t('admin.users.removeMember', 'Fjarl\u00E6gja') + '</button>';
                } else {
                    actionHtml = '<button class="btn btn-sm btn-primary" onclick="UsersModule.toggleMember(\'' + userId + '\', true)">' +
                        SleipnirI18n.t('admin.users.makeMember', 'Gera me\u00F0lim') + '</button>';
                }

                html += '<tr>' +
                    '<td>' + displayName + '</td>' +
                    '<td>' + email + '</td>' +
                    '<td><span class="badge badge--' + AdminApp.escapeAttr(role) + '">' + AdminApp.escapeHTML(role) + '</span></td>' +
                    '<td style="white-space:nowrap;">' + createdAt + '</td>' +
                    '<td style="white-space:nowrap;">' + lastLogin + '</td>' +
                    '<td>' + statusBadge + '</td>' +
                    '<td>' + actionHtml + '</td>' +
                '</tr>';
            });
        }

        tbody.innerHTML = html;

        // Render pagination
        renderPagination(totalPages);

        // Update sort indicators on headers
        updateSortIndicators();
    }

    // =============================================
    // PAGINATION
    // =============================================

    function renderPagination(totalPages) {
        var container = document.getElementById('usersPagination');
        if (!container) return;

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        var html = '';
        html += '<button class="page-btn" ' + (currentPage === 1 ? 'disabled' : '') +
            ' onclick="UsersModule.goToPage(' + (currentPage - 1) + ')">&laquo;</button>';

        for (var p = 1; p <= totalPages; p++) {
            html += '<button class="page-btn ' + (p === currentPage ? 'active' : '') +
                '" onclick="UsersModule.goToPage(' + p + ')">' + p + '</button>';
        }

        html += '<button class="page-btn" ' + (currentPage === totalPages ? 'disabled' : '') +
            ' onclick="UsersModule.goToPage(' + (currentPage + 1) + ')">&raquo;</button>';

        container.innerHTML = html;
    }

    // =============================================
    // SORT INDICATORS
    // =============================================

    function updateSortIndicators() {
        var ths = document.querySelectorAll('#usersTable th[data-sort]');
        for (var i = 0; i < ths.length; i++) {
            ths[i].classList.remove('sort-asc', 'sort-desc');
            if (ths[i].dataset.sort === sortField) {
                ths[i].classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }
    }

    // =============================================
    // MEMBER TOGGLE
    // =============================================

    function toggleMember(userId, makeMember) {
        var confirmMsg = makeMember
            ? SleipnirI18n.t('admin.users.confirmMakeMember', 'Ertu viss um a\u00F0 \u00FE\u00FA viljir gera \u00FEennan notanda me\u00F0lim?')
            : SleipnirI18n.t('admin.users.confirmRemoveMember', 'Ertu viss um a\u00F0 \u00FE\u00FA viljir fjarl\u00E6gja me\u00F0limast\u00F6\u00F0u?');

        if (!confirm(confirmMsg)) return;

        try {
            sleipnirAuth.toggleUserMembership(userId, makeMember)
                .then(function(result) {
                    if (result && result.success) {
                        AdminApp.showToast(
                            makeMember
                                ? SleipnirI18n.t('admin.users.memberGranted', 'Me\u00F0limast\u00F6\u00F0u veitt')
                                : SleipnirI18n.t('admin.users.memberRemoved', 'Me\u00F0limast\u00F6\u00F0u fjarl\u00E6g\u00F0'),
                            'success'
                        );
                        AdminApp.logActivity('member_toggle', 'User ' + userId + ' membership ' + (makeMember ? 'granted' : 'removed'));
                        loadUsers();
                    } else {
                        AdminApp.showToast('Villa vi\u00F0 a\u00F0 uppf\u00E6ra me\u00F0limast\u00F6\u00F0u', 'error');
                    }
                })
                .catch(function(err) {
                    console.error('Error toggling membership:', err);
                    AdminApp.showToast('Villa vi\u00F0 a\u00F0 uppf\u00E6ra me\u00F0limast\u00F6\u00F0u', 'error');
                });
        } catch (err) {
            console.error('Error initiating membership toggle:', err);
        }
    }

    // =============================================
    // SEARCH, FILTER & SORT BINDINGS
    // =============================================

    function bindControls() {
        var searchEl = document.getElementById('userSearch');
        var filterEl = document.getElementById('userFilter');

        if (searchEl) {
            searchEl.addEventListener('input', AdminApp.debounce(function() {
                currentPage = 1;
                renderUsers();
            }, 300));
        }

        if (filterEl) {
            filterEl.addEventListener('change', function() {
                currentPage = 1;
                renderUsers();
            });
        }

        // Sort headers
        var ths = document.querySelectorAll('#usersTable th[data-sort]');
        for (var i = 0; i < ths.length; i++) {
            ths[i].addEventListener('click', function() {
                var field = this.dataset.sort;
                if (sortField === field) {
                    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    sortField = field;
                    sortDir = 'asc';
                }
                renderUsers();
            });
        }
    }

    // =============================================
    // PUBLIC API
    // =============================================

    window.UsersModule = {
        toggleMember: toggleMember,
        goToPage: function(page) {
            currentPage = page;
            renderUsers();
        }
    };

    // =============================================
    // INITIALIZATION
    // =============================================

    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'users' && !initialized) {
            initialized = true;
            bindControls();
            loadUsers();
        }
    });

    document.addEventListener('sectionShow', function(e) {
        if (e.detail.section === 'users') {
            loadUsers();
        }
    });

})();
