(function() {
    'use strict';

    var sortField = 'displayName';
    var sortDir = 'asc';
    var currentPage = 1;
    var perPage = 10;

    function getFilteredUsers() {
        var data = window.MOCK_DATA.users.slice();
        var search = document.getElementById('userSearch').value.toLowerCase();
        var filter = document.getElementById('userFilter').value;

        var filtered = data.filter(function(u) {
            var matchSearch = !search ||
                u.displayName.toLowerCase().includes(search) ||
                u.email.toLowerCase().includes(search);
            var matchFilter = filter === 'all' ||
                (filter === 'members' && u.members) ||
                (filter === 'nonmembers' && !u.members);
            return matchSearch && matchFilter;
        });

        filtered.sort(function(a, b) {
            var aVal = a[sortField] || '';
            var bVal = b[sortField] || '';
            if (typeof aVal === 'boolean') {
                aVal = aVal ? 1 : 0;
                bVal = bVal ? 1 : 0;
            }
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }

    function renderUsers() {
        var filtered = getFilteredUsers();
        var totalPages = Math.ceil(filtered.length / perPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        var start = (currentPage - 1) * perPage;
        var pageData = filtered.slice(start, start + perPage);

        var html = '';
        if (pageData.length === 0) {
            html = '<tr><td colspan="7" class="empty-cell">Engir notendur fundust</td></tr>';
        } else {
            pageData.forEach(function(user) {
                var statusBadge = user.role === 'admin' ? '<span class="badge badge--admin">Admin</span>' :
                    user.members ? '<span class="badge badge--member">Meðlimur</span>' :
                    '<span class="badge badge--guest">Gestur</span>';

                var actionBtn = '';
                if (user.role !== 'admin') {
                    if (user.members) {
                        actionBtn = '<button class="btn btn-sm btn-danger" onclick="UsersModule.toggleMember(\'' + user.id + '\', false)">Fjarlægja</button>';
                    } else {
                        actionBtn = '<button class="btn btn-sm btn-primary" onclick="UsersModule.toggleMember(\'' + user.id + '\', true)">Gera meðlim</button>';
                    }
                }

                html += '<tr>' +
                    '<td>' + user.displayName + '</td>' +
                    '<td>' + user.email + '</td>' +
                    '<td><span class="badge badge--' + user.role + '">' + user.role + '</span></td>' +
                    '<td>' + AdminApp.formatDate(user.createdAt) + '</td>' +
                    '<td>' + AdminApp.formatDate(user.lastLogin) + '</td>' +
                    '<td>' + statusBadge + '</td>' +
                    '<td>' + actionBtn + '</td>' +
                '</tr>';
            });
        }
        document.getElementById('usersTableBody').innerHTML = html;

        var pagHtml = '';
        if (totalPages > 1) {
            pagHtml += '<button class="page-btn" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="UsersModule.goToPage(' + (currentPage - 1) + ')">&laquo;</button>';
            for (var p = 1; p <= totalPages; p++) {
                pagHtml += '<button class="page-btn ' + (p === currentPage ? 'active' : '') + '" onclick="UsersModule.goToPage(' + p + ')">' + p + '</button>';
            }
            pagHtml += '<button class="page-btn" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="UsersModule.goToPage(' + (currentPage + 1) + ')">&raquo;</button>';
        }
        document.getElementById('usersPagination').innerHTML = pagHtml;

        var ths = document.querySelectorAll('#usersTable th[data-sort]');
        ths.forEach(function(th) {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === sortField) {
                th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    // Public API for onclick handlers
    window.UsersModule = {
        toggleMember: function(userId, makeMember) {
            var user = window.MOCK_DATA.users.find(function(u) { return u.id === userId; });
            if (user) {
                user.members = makeMember;
                AdminApp.showToast(
                    user.displayName + (makeMember ? ' gerður meðlimur' : ' fjarlægður sem meðlimur'),
                    'success'
                );
                renderUsers();
            }
        },
        goToPage: function(page) {
            currentPage = page;
            renderUsers();
        }
    };

    // Initialize
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'users') {
            renderUsers();

            document.getElementById('userSearch').addEventListener('input', debounce(function() {
                currentPage = 1;
                renderUsers();
            }, 300));

            document.getElementById('userFilter').addEventListener('change', function() {
                currentPage = 1;
                renderUsers();
            });

            document.querySelectorAll('#usersTable th[data-sort]').forEach(function(th) {
                th.addEventListener('click', function() {
                    var field = this.dataset.sort;
                    if (sortField === field) {
                        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        sortField = field;
                        sortDir = 'asc';
                    }
                    renderUsers();
                });
            });
        }
    });

    function debounce(fn, delay) {
        var timer;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

})();
