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
    var isRemovalMode = false;
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
                var userEmail = AdminApp.escapeAttr(user.email || '');

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
                } else if (isRemovalMode) {
                    actionHtml = '<div class="delete-checkbox-wrapper">' +
                        '<input type="checkbox" class="delete-user-checkbox" id="delete-' + userId + '" ' +
                            'data-user-id="' + userId + '" data-user-email="' + userEmail + '" ' +
                            'onchange="UsersModule.handleDeleteCheckbox()">' +
                        '<label for="delete-' + userId + '" class="delete-checkbox-label">' +
                            SleipnirI18n.t('admin.users.delete', 'Ey\u00F0a') +
                        '</label>' +
                    '</div>';
                } else {
                    if (user.members === true) {
                        actionHtml = '<button class="btn btn-sm btn-danger" onclick="UsersModule.toggleMember(\'' + userId + '\', false)">' +
                            SleipnirI18n.t('admin.users.removeMember', 'Fjarl\u00E6gja') + '</button>';
                    } else {
                        actionHtml = '<button class="btn btn-sm btn-primary" onclick="UsersModule.toggleMember(\'' + userId + '\', true)">' +
                            SleipnirI18n.t('admin.users.makeMember', 'Gera me\u00F0lim') + '</button>';
                    }
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

        // Update removal mode UI
        updateRemovalModeUI();
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
    // REMOVAL MODE
    // =============================================

    function toggleRemovalMode() {
        var checkbox = document.getElementById('userRemovalMode');
        isRemovalMode = checkbox ? checkbox.checked : !isRemovalMode;
        renderUsers();
    }

    function updateRemovalModeUI() {
        var modeLabel = document.getElementById('modeLabel');
        var bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

        if (modeLabel) {
            if (isRemovalMode) {
                modeLabel.textContent = SleipnirI18n.t('admin.users.mode.removal', 'Ey\u00F0ingarhamur');
                modeLabel.style.color = '#f44336';
            } else {
                modeLabel.textContent = SleipnirI18n.t('admin.users.mode.member', 'Me\u00F0limastj\u00F3rnun');
                modeLabel.style.color = '#4CAF50';
            }
        }

        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = isRemovalMode ? 'inline-block' : 'none';
        }
    }

    function handleDeleteCheckbox() {
        updateBulkDeleteButtonText();
    }

    function updateBulkDeleteButtonText() {
        var selectedCheckboxes = document.querySelectorAll('.delete-user-checkbox:checked');
        var bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (!bulkDeleteBtn) return;

        if (selectedCheckboxes.length > 0) {
            bulkDeleteBtn.textContent = SleipnirI18n.t('admin.users.deleteSelected', 'Ey\u00F0a v\u00F6ldum') + ' (' + selectedCheckboxes.length + ')';
            bulkDeleteBtn.classList.add('delete');
        } else {
            bulkDeleteBtn.textContent = SleipnirI18n.t('admin.users.deleteSelected', 'Ey\u00F0a v\u00F6ldum');
            bulkDeleteBtn.classList.remove('delete');
        }
    }

    // =============================================
    // BULK DELETE
    // =============================================

    function bulkDelete() {
        var selectedCheckboxes = document.querySelectorAll('.delete-user-checkbox:checked');

        if (selectedCheckboxes.length === 0) {
            AdminApp.showToast(SleipnirI18n.t('admin.users.noSelection', 'Engir notendur valdir'), 'info');
            return;
        }

        var selectedUsers = [];
        for (var i = 0; i < selectedCheckboxes.length; i++) {
            selectedUsers.push({
                id: selectedCheckboxes[i].dataset.userId,
                email: selectedCheckboxes[i].dataset.userEmail
            });
        }

        var confirmMsg = SleipnirI18n.t('admin.users.confirmBulkDelete',
            'Ertu viss um a\u00F0 \u00FE\u00FA viljir ey\u00F0a ' + selectedUsers.length + ' notendum varanlega?\n\n\u00DEetta er ekki h\u00E6gt a\u00F0 afturkalla!');

        if (!confirm(confirmMsg)) return;

        var successCount = 0;
        var failedCount = 0;
        var errors = [];
        var processed = 0;

        function onComplete() {
            var message = SleipnirI18n.t('admin.users.deleteComplete', 'Ey\u00F0ing loki\u00F0') + ':\n' +
                '- ' + SleipnirI18n.t('admin.users.deleted', 'Eytt') + ': ' + successCount + '\n' +
                '- ' + SleipnirI18n.t('admin.users.failed', 'Mist\u00F3kst') + ': ' + failedCount;

            if (errors.length > 0) {
                message += '\n\n' + SleipnirI18n.t('admin.users.errors', 'Villur') + ':\n' + errors.join('\n');
            }

            alert(message);

            if (successCount > 0) {
                AdminApp.logActivity('bulk_delete', 'Deleted ' + successCount + ' users');
                loadUsers();
            }
        }

        function processNext(index) {
            if (index >= selectedUsers.length) {
                onComplete();
                return;
            }

            var user = selectedUsers[index];
            try {
                sleipnirAuth.deleteUser(user.id)
                    .then(function(result) {
                        if (result && result.success) {
                            successCount++;
                        } else {
                            failedCount++;
                            errors.push(user.email + ': ' + ((result && result.error) || 'Unknown error'));
                        }
                        processNext(index + 1);
                    })
                    .catch(function(err) {
                        failedCount++;
                        errors.push(user.email + ': ' + err.message);
                        processNext(index + 1);
                    });
            } catch (err) {
                failedCount++;
                errors.push(user.email + ': ' + err.message);
                processNext(index + 1);
            }
        }

        processNext(0);
    }

    // =============================================
    // BULK MEMBER MANAGEMENT
    // =============================================

    function processBulkMembers() {
        var emailsEl = document.getElementById('bulkMemberEmails');
        var domainEl = document.getElementById('memberDomain');
        var emailsText = emailsEl ? emailsEl.value.trim() : '';
        var domain = domainEl ? domainEl.value.trim() : '';

        if (!emailsText && !domain) {
            AdminApp.showToast(SleipnirI18n.t('admin.users.provideEmailsOrDomain', 'Sl\u00E1\u00F0u inn netf\u00F6ng e\u00F0a l\u00E9n'), 'error');
            return;
        }

        var resultsDiv = document.getElementById('bulkMemberResults');
        var resultsContent = document.getElementById('bulkMemberResultsContent');
        if (resultsDiv) resultsDiv.style.display = 'block';
        if (resultsContent) resultsContent.innerHTML = '<p style="color:#888;">Vinnu\u2026</p>';

        try {
            sleipnirAuth.getAllUsers().then(function(fetchedUsers) {
                var results = {
                    updated: [],
                    notFound: [],
                    failed: [],
                    alreadyMembers: []
                };

                // Parse emails
                var emails = [];
                if (emailsText) {
                    emails = emailsText.split('\n')
                        .map(function(e) { return e.trim().toLowerCase(); })
                        .filter(function(e) { return e && e.indexOf('@') !== -1; });
                }

                // Collect domain users
                var domainUsers = [];
                if (domain) {
                    var domainLower = domain.toLowerCase();
                    domainUsers = fetchedUsers.filter(function(u) {
                        return u.email && u.email.toLowerCase().indexOf(domainLower) !== -1 && u.members !== true;
                    });
                }

                // Build processing queue: each item is { email, user }
                var queue = [];

                emails.forEach(function(email) {
                    var user = fetchedUsers.find(function(u) {
                        return u.email && u.email.toLowerCase() === email;
                    });
                    if (!user) {
                        results.notFound.push(email);
                    } else if (user.members === true) {
                        results.alreadyMembers.push(email);
                    } else {
                        queue.push({ email: email, user: user });
                    }
                });

                domainUsers.forEach(function(u) {
                    // Avoid duplicates from email list
                    var alreadyQueued = queue.some(function(q) { return q.user.id === u.id; });
                    if (!alreadyQueued) {
                        queue.push({ email: u.email, user: u });
                    }
                });

                function processQueue(index) {
                    if (index >= queue.length) {
                        displayBulkResults(results, resultsContent);
                        if (results.updated.length > 0) {
                            loadUsers();
                        }
                        return;
                    }

                    var item = queue[index];
                    try {
                        sleipnirAuth.toggleUserMembership(item.user.id, true)
                            .then(function(result) {
                                if (result && result.success) {
                                    results.updated.push(item.email);
                                } else {
                                    results.failed.push({ email: item.email, error: (result && result.error) || 'Unknown' });
                                }
                                processQueue(index + 1);
                            })
                            .catch(function(err) {
                                results.failed.push({ email: item.email, error: err.message });
                                processQueue(index + 1);
                            });
                    } catch (err) {
                        results.failed.push({ email: item.email, error: err.message });
                        processQueue(index + 1);
                    }
                }

                processQueue(0);

            }).catch(function(err) {
                console.error('Error fetching users for bulk member:', err);
                if (resultsContent) {
                    resultsContent.innerHTML = '<p style="color:#f44336;">Villa: ' + AdminApp.escapeHTML(err.message) + '</p>';
                }
            });
        } catch (err) {
            console.error('Error initiating bulk member processing:', err);
        }
    }

    function displayBulkResults(results, container) {
        if (!container) return;

        var html = '';

        if (results.updated.length > 0) {
            html += '<div style="color:#4CAF50;margin-bottom:15px;">' +
                '<strong>' + SleipnirI18n.t('admin.users.bulkUpdated', 'Uppf\u00E6rt') + ' (' + results.updated.length + '):</strong><br>' +
                results.updated.map(function(e) { return AdminApp.escapeHTML(e); }).join('<br>') +
            '</div>';
        }

        if (results.alreadyMembers.length > 0) {
            html += '<div style="color:#FF9800;margin-bottom:15px;">' +
                '<strong>' + SleipnirI18n.t('admin.users.bulkAlready', 'N\u00FA \u00FEegar me\u00F0limir') + ' (' + results.alreadyMembers.length + '):</strong><br>' +
                results.alreadyMembers.map(function(e) { return AdminApp.escapeHTML(e); }).join('<br>') +
            '</div>';
        }

        if (results.notFound.length > 0) {
            html += '<div style="color:#F44336;margin-bottom:15px;">' +
                '<strong>' + SleipnirI18n.t('admin.users.bulkNotFound', 'Finnast ekki') + ' (' + results.notFound.length + '):</strong><br>' +
                results.notFound.map(function(e) { return AdminApp.escapeHTML(e); }).join('<br>') +
            '</div>';
        }

        if (results.failed.length > 0) {
            html += '<div style="color:#F44336;margin-bottom:15px;">' +
                '<strong>' + SleipnirI18n.t('admin.users.bulkFailed', 'Mist\u00F3kst') + ' (' + results.failed.length + '):</strong><br>' +
                results.failed.map(function(f) { return AdminApp.escapeHTML(f.email) + ': ' + AdminApp.escapeHTML(f.error); }).join('<br>') +
            '</div>';
        }

        if (!html) {
            html = '<p style="color:#888;">' + SleipnirI18n.t('admin.users.bulkNoChanges', 'Engar breytingar ger\u00F0ar') + '</p>';
        }

        container.innerHTML = html;
    }

    // =============================================
    // SYNC REAL MEMBERS
    // =============================================

    function syncRealMembers() {
        var confirmMsg = SleipnirI18n.t('admin.users.confirmSync',
            '\u00DEetta mun samstilla me\u00F0limast\u00F6\u00F0u \u00FAt fr\u00E1 displayMembers safninu. Halda \u00E1fram?');

        if (!confirm(confirmMsg)) return;

        try {
            AdminApp.db.collection('displayMembers').get()
                .then(function(snapshot) {
                    var memberUserIds = [];
                    snapshot.docs.forEach(function(doc) {
                        var data = doc.data();
                        if (data.userId) {
                            memberUserIds.push(data.userId);
                        }
                    });

                    if (memberUserIds.length === 0) {
                        AdminApp.showToast(SleipnirI18n.t('admin.users.noProfiles', 'Engin me\u00F0limaprofil fundin'), 'info');
                        return;
                    }

                    var updated = 0;
                    var alreadyMembers = 0;
                    var failed = 0;

                    function processSync(index) {
                        if (index >= memberUserIds.length) {
                            var message = SleipnirI18n.t('admin.users.syncComplete', 'Samstilling loki\u00F0') + ':\n' +
                                '- ' + SleipnirI18n.t('admin.users.syncUpdated', 'Uppf\u00E6rt') + ': ' + updated + '\n' +
                                '- ' + SleipnirI18n.t('admin.users.syncAlready', 'N\u00FA \u00FEegar me\u00F0limir') + ': ' + alreadyMembers + '\n' +
                                '- ' + SleipnirI18n.t('admin.users.syncFailed', 'Mist\u00F3kst') + ': ' + failed + '\n' +
                                '- ' + SleipnirI18n.t('admin.users.syncTotal', 'Samtals pr\u00F3fil') + ': ' + memberUserIds.length;

                            alert(message);

                            if (updated > 0) {
                                AdminApp.logActivity('sync_members', 'Synced ' + updated + ' members from displayMembers');
                                loadUsers();
                            }
                            return;
                        }

                        var userId = memberUserIds[index];
                        try {
                            AdminApp.db.collection('users').doc(userId).get()
                                .then(function(userDoc) {
                                    if (userDoc.exists) {
                                        var userData = userDoc.data();
                                        if (userData.members !== true) {
                                            AdminApp.db.collection('users').doc(userId).update({
                                                members: true,
                                                memberStatusSyncedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                                memberStatusSyncReason: 'Synced from displayMembers collection'
                                            }).then(function() {
                                                updated++;
                                                processSync(index + 1);
                                            }).catch(function() {
                                                failed++;
                                                processSync(index + 1);
                                            });
                                        } else {
                                            alreadyMembers++;
                                            processSync(index + 1);
                                        }
                                    } else {
                                        processSync(index + 1);
                                    }
                                })
                                .catch(function(err) {
                                    console.error('Error checking user ' + userId + ':', err);
                                    failed++;
                                    processSync(index + 1);
                                });
                        } catch (err) {
                            failed++;
                            processSync(index + 1);
                        }
                    }

                    processSync(0);
                })
                .catch(function(err) {
                    console.error('Error loading displayMembers for sync:', err);
                    AdminApp.showToast('Villa vi\u00F0 samstillingu', 'error');
                });
        } catch (err) {
            console.error('Error initiating member sync:', err);
        }
    }

    // =============================================
    // SEARCH, FILTER & SORT BINDINGS
    // =============================================

    function bindControls() {
        var searchEl = document.getElementById('userSearch');
        var filterEl = document.getElementById('userFilter');
        var modeToggle = document.getElementById('userRemovalMode');

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

        if (modeToggle) {
            modeToggle.addEventListener('change', function() {
                toggleRemovalMode();
            });
        }

        // Bulk action buttons
        var bulkAddBtn = document.getElementById('bulkAddMembersBtn');
        var syncBtn = document.getElementById('syncRealMembersBtn');
        var bulkDelBtn = document.getElementById('bulkDeleteBtn');

        if (bulkAddBtn) {
            bulkAddBtn.addEventListener('click', function() {
                AdminApp.openBulkMemberModal();
            });
        }

        if (syncBtn) {
            syncBtn.addEventListener('click', function() {
                syncRealMembers();
            });
        }

        if (bulkDelBtn) {
            bulkDelBtn.addEventListener('click', function() {
                bulkDelete();
            });
        }

        // Process bulk members button inside modal
        var processBulkBtn = document.getElementById('processBulkMembersBtn');
        if (processBulkBtn) {
            processBulkBtn.addEventListener('click', function() {
                processBulkMembers();
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
        },
        bulkDelete: bulkDelete,
        processBulkMembers: processBulkMembers,
        syncRealMembers: syncRealMembers,
        toggleRemovalMode: toggleRemovalMode,
        handleDeleteCheckbox: handleDeleteCheckbox
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
