(function() {
    'use strict';

    // Authentication is handled by admin.js through protectAdminPage()
    var isAdminAuthenticated = false;

    // User Management Mode (false = Member Management, true = User Removal)
    var isUserRemovalMode = false;

    // Template Selection State
    var currentMemberId = null;
    var selectedTemplate = 'classic';

    // Wait for auth state to be established by admin.js
    window.addEventListener('authStateChanged', function(event) {
        var detail = event.detail;
        var user = detail.user;
        var userDoc = detail.userDoc;
        if (user && userDoc && userDoc.role === 'admin') {
            isAdminAuthenticated = true;

            // Update UI
            var loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            document.body.style.display = 'block';

            var userMenus = document.querySelectorAll('.user-menu');
            userMenus.forEach(function(menu) {
                menu.style.display = 'flex';
                var nameDisplay = menu.querySelector('.user-name');
                if (nameDisplay) {
                    nameDisplay.textContent = userDoc.displayName || user.email;
                }
            });
        }
    });

    // Page-specific initialization (runs immediately since DOM is already ready in SPA)
    (function initPage() {
        // Add event listeners for user search and filter
        var userSearch = document.getElementById('userSearch');
        var userFilter = document.getElementById('userFilter');

        if (userSearch) {
            userSearch.addEventListener('input', debounce(function() {
                if (document.getElementById('usersSection').classList.contains('active')) {
                    loadUsers();
                }
            }, 300));
        }

        if (userFilter) {
            userFilter.addEventListener('change', function() {
                if (document.getElementById('usersSection').classList.contains('active')) {
                    loadUsers();
                }
            });
        }
    })();

    // Debounce function for search input
    function debounce(func, wait) {
        var timeout;
        return function executedFunction() {
            var args = arguments;
            var later = function() {
                clearTimeout(timeout);
                func.apply(null, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Toggle options dropdown
    window.toggleOptions = function() {
        var options = document.getElementById('adminOptions');
        options.classList.toggle('active');
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        var options = document.getElementById('adminOptions');
        if (options && !options.contains(e.target)) {
            options.classList.remove('active');
        }
    });

    // Show section
    window.showSection = function(section) {
        // Verify admin is authenticated
        if (!isAdminAuthenticated) {
            window.location.href = '/login?redirect=admin';
            return;
        }

        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(function(s) { s.classList.remove('active'); });

        // Show selected section
        document.getElementById(section + 'Section').classList.add('active');

        // Close dropdown
        document.getElementById('adminOptions').classList.remove('active');

        // Load section data
        switch(section) {
            case 'members':
                loadMembers();
                break;
            case 'users':
                loadUsers();
                break;
            case 'products':
                loadProducts();
                break;
            case 'events':
                loadEvents();
                break;
            case 'orders':
                loadOrders();
                break;
        }
    };

    // Switch tabs
    window.switchTab = function(tab) {
        // Update tab buttons
        document.querySelectorAll('#productsSection .tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
        event.target.classList.add('active');

        // Update tab content
        document.querySelectorAll('#productsSection .tab-content').forEach(function(content) { content.classList.remove('active'); });
        document.getElementById(tab + 'Tab').classList.add('active');
    };

    window.switchEventTab = function(tab) {
        // Update tab buttons
        document.querySelectorAll('#eventsSection .tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
        event.target.classList.add('active');

        // Update tab content
        document.querySelectorAll('#eventsSection .tab-content').forEach(function(content) { content.classList.remove('active'); });
        document.getElementById(tab + 'Tab').classList.add('active');
    };

    window.switchOrderTab = function(status) {
        // Update tab buttons
        document.querySelectorAll('#ordersSection .tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
        event.target.classList.add('active');

        // Update tab content
        document.querySelectorAll('#ordersSection .tab-content').forEach(function(content) { content.classList.remove('active'); });
        document.getElementById(status + 'OrdersTab').classList.add('active');
    };

    // Load Members
    async function loadMembers() {
        var container = document.getElementById('membersContainer');
        container.innerHTML = '<p style="color: #888;">Loading members...</p>';

        try {
            var snapshot = await firebase.firestore().collection('displayMembers').get();
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p style="color: #888;">No members found.</p>';
                return;
            }

            snapshot.forEach(function(doc) {
                var member = doc.data();
                var memberCard = document.createElement('div');
                memberCard.className = 'member-card';

                // Format motorcycle type for display
                var motorcycleType = 'Not specified';
                if (member.motorcycleType) {
                    motorcycleType = member.motorcycleType;
                } else if (member.motorcycle) {
                    var parts = [];
                    if (member.motorcycle.year) parts.push(member.motorcycle.year);
                    if (member.motorcycle.make) parts.push(member.motorcycle.make);
                    if (member.motorcycle.model) parts.push(member.motorcycle.model);
                    if (parts.length > 0) motorcycleType = parts.join(' ');
                }

                memberCard.innerHTML = '\
                    <img src="' + (member.photoUrl || member.photo || 'https://via.placeholder.com/60') + '" alt="' + member.name + '" class="member-photo-small">\
                    <div class="member-info">\
                        <h3 style="margin: 0; color: var(--white);">' + member.name + '</h3>\
                        <p style="margin: 5px 0; color: var(--gray);">' + (member.role || 'Member') + '</p>\
                        <p style="margin: 5px 0; color: var(--gray);">' + motorcycleType + '</p>\
                        ' + (member.joinDate ? '<p style="margin: 0; font-size: 0.9rem; color: var(--gray);">Member since: ' + new Date(member.joinDate.seconds * 1000).getFullYear() + '</p>' : '') + '\
                        <p style="margin: 5px 0; color: var(--mc-red); font-size: 0.9rem;">Template: ' + (member.cardTemplate || 'classic') + '</p>\
                    </div>\
                    <div class="member-actions">\
                        <button class="admin-btn edit" onclick="editMember(\'' + doc.id + '\')">Edit</button>\
                        <button class="admin-btn secondary" onclick="selectTemplate(\'' + doc.id + '\')">Template</button>\
                    </div>';
                container.appendChild(memberCard);
            });
        } catch (error) {
            console.error('Error loading members:', error);
            container.innerHTML = '<p style="color: #ff0000;">Error loading members. Please try again.</p>';
        }
    }

    // Load Users
    async function loadUsers() {
        var tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888;">Loading users...</td></tr>';

        try {
            // Use authentication system to get all users
            var users = await sleipnirAuth.getAllUsers();
            tbody.innerHTML = '';

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888;">No users found.</td></tr>';
                return;
            }

            // Apply filters
            var filter = document.getElementById('userFilter').value;
            var searchTerm = document.getElementById('userSearch').value.toLowerCase();

            var filteredUsers = users.slice();

            if (filter === 'members') {
                filteredUsers = filteredUsers.filter(function(u) { return u.members === true; });
            } else if (filter === 'non-members') {
                filteredUsers = filteredUsers.filter(function(u) { return u.members !== true; });
            }

            if (searchTerm) {
                filteredUsers = filteredUsers.filter(function(u) {
                    return (u.displayName && u.displayName.toLowerCase().includes(searchTerm)) ||
                        (u.email && u.email.toLowerCase().includes(searchTerm));
                });
            }

            filteredUsers.forEach(function(user) {
                var row = document.createElement('tr');
                row.innerHTML = '\
                    <td style="font-family: monospace; font-size: 12px;">' + user.id.substring(0, 8) + '...</td>\
                    <td>' + (user.displayName || user.name || 'N/A') + '</td>\
                    <td>' + (user.email || 'N/A') + '</td>\
                    <td>' + (user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A') + '</td>\
                    <td>\
                        ' + (user.members ?
                            '<span style="color: #4CAF50; font-weight: bold;">&#10003; Member</span>' :
                            '<span style="color: #888;">Guest</span>') + '\
                        ' + (user.role === 'admin' ? ' <span style="color: var(--mc-red);">[Admin]</span>' : '') + '\
                    </td>\
                    <td>' + (user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleDateString() : 'Never') + '</td>\
                    <td>\
                        ' + (user.role !== 'admin' ?
                            (isUserRemovalMode ?
                                '<div class="delete-checkbox-wrapper">' +
                                    '<input type="checkbox" class="delete-user-checkbox" id="delete-' + user.id + '" data-user-id="' + user.id + '" data-user-email="' + user.email + '" onchange="handleDeleteCheckbox(this)">' +
                                    '<label for="delete-' + user.id + '" class="delete-checkbox-label">Delete</label>' +
                                '</div>' :
                                (user.members ?
                                    '<button class="admin-btn delete" onclick="toggleMemberStatus(\'' + user.id + '\', false)">Remove Member</button>' :
                                    '<button class="admin-btn secondary" onclick="toggleMemberStatus(\'' + user.id + '\', true)">Make Member</button>')
                            )
                            : '<span style="color: #888;">Admin User</span>') + '\
                    </td>';
                tbody.appendChild(row);
            });

            if (filteredUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888;">No users match the current filter.</td></tr>';
            }
        } catch (error) {
            console.error('Error loading users:', error);
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ff0000;">Error loading users. Check admin permissions.</td></tr>';
        }
    }

    // Toggle User Management Mode
    window.toggleUserManagementMode = function() {
        var checkbox = document.getElementById('userManagementMode');
        var modeLabel = document.getElementById('modeLabel');
        var bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

        isUserRemovalMode = checkbox.checked;

        if (isUserRemovalMode) {
            modeLabel.textContent = window.SleipnirI18n.t('admin.users.mode.removal', 'User Removal Mode');
            modeLabel.style.color = '#f44336';
            bulkDeleteBtn.style.display = 'inline-block';
        } else {
            modeLabel.textContent = window.SleipnirI18n.t('admin.users.mode.member', 'Member Management Mode');
            modeLabel.style.color = '#4CAF50';
            bulkDeleteBtn.style.display = 'none';
            // Clear all checkboxes when switching back
            document.querySelectorAll('.delete-user-checkbox').forEach(function(cb) { cb.checked = false; });
        }

        // Update action cells without reloading the entire table
        updateUserActionCells();
    };

    // Update only the action cells in the user table without reloading
    function updateUserActionCells() {
        var tbody = document.getElementById('usersTableBody');
        var rows = tbody.querySelectorAll('tr');

        rows.forEach(function(row) {
            var cells = row.querySelectorAll('td');
            if (cells.length < 7) return; // Skip if not a data row

            var userId = cells[0].textContent.replace('...', '');
            var email = cells[2].textContent;
            var isAdmin = cells[4].textContent.includes('[Admin]');
            var isMember = cells[4].textContent.includes('Member');

            var actionCell = cells[6];
            var fullUserId = '';

            var existingButton = actionCell.querySelector('button');
            var existingCheckbox = actionCell.querySelector('input[type="checkbox"]');

            if (existingButton && existingButton.onclick) {
                var onclickStr = existingButton.onclick.toString();
                var match = onclickStr.match(/toggleMemberStatus\('([^']+)'/);
                if (match) fullUserId = match[1];
            } else if (existingCheckbox) {
                fullUserId = existingCheckbox.dataset.userId;
            }

            if (!fullUserId) return;

            if (isAdmin) {
                actionCell.innerHTML = '<span style="color: #888;">Admin User</span>';
            } else {
                if (isUserRemovalMode) {
                    actionCell.innerHTML = '\
                        <div class="delete-checkbox-wrapper">\
                            <input type="checkbox" class="delete-user-checkbox" id="delete-' + fullUserId + '"\
                                   data-user-id="' + fullUserId + '" data-user-email="' + email + '"\
                                   onchange="handleDeleteCheckbox(this)">\
                            <label for="delete-' + fullUserId + '" class="delete-checkbox-label">Delete</label>\
                        </div>';
                } else {
                    if (isMember) {
                        actionCell.innerHTML = '<button class="admin-btn delete" onclick="toggleMemberStatus(\'' + fullUserId + '\', false)">Remove Member</button>';
                    } else {
                        actionCell.innerHTML = '<button class="admin-btn secondary" onclick="toggleMemberStatus(\'' + fullUserId + '\', true)">Make Member</button>';
                    }
                }
            }
        });
    }

    // Toggle Member Status
    window.toggleMemberStatus = async function(userId, makeMember) {
        if (confirm('Are you sure you want to ' + (makeMember ? 'make this user a member' : 'remove member status') + '?')) {
            try {
                var result = await sleipnirAuth.toggleUserMembership(userId, makeMember);

                if (result.success) {
                    loadUsers();
                    sleipnirAuth.showAuthMessage({
                        is: 'Me\u00f0limast\u00f6\u00f0u ' + (makeMember ? 'veitt' : 'fjarl\u00e6g\u00f0') + ' me\u00f0 g\u00f3\u00f0um \u00e1rangri!',
                        en: 'Member status ' + (makeMember ? 'granted' : 'removed') + ' successfully!'
                    });
                } else {
                    sleipnirAuth.showAuthMessage({
                        is: 'Villa vi\u00f0 a\u00f0 uppf\u00e6ra me\u00f0limast\u00f6\u00f0u',
                        en: 'Error updating member status'
                    }, true);
                }
            } catch (error) {
                console.error('Error updating member status:', error);
                alert('Error updating member status. Please try again.');
            }
        }
    };

    // Edit Member
    window.editMember = function(memberId) {
        alert('Member editing functionality will be implemented soon.');
    };

    // Member Search
    var memberSearchEl = document.getElementById('memberSearch');
    if (memberSearchEl) {
        memberSearchEl.addEventListener('input', function(e) {
            var searchTerm = e.target.value.toLowerCase();
            var memberCards = document.querySelectorAll('#membersContainer .member-card');

            memberCards.forEach(function(card) {
                var text = card.textContent.toLowerCase();
                card.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    }

    // Template Selection Functions
    window.selectTemplate = async function(memberId) {
        currentMemberId = memberId;

        try {
            var doc = await firebase.firestore().collection('displayMembers').doc(memberId).get();
            if (!doc.exists) {
                alert('Member not found');
                return;
            }

            var member = doc.data();
            selectedTemplate = member.cardTemplate || 'classic';

            document.getElementById('templateModal').classList.add('active');

            var templateGrid = document.getElementById('templateGrid');
            templateGrid.innerHTML = '';

            var templates = ['classic', 'horizontal', 'minimal', 'featured', 'badge'];
            var templateNames = {
                classic: 'Classic Vertical',
                horizontal: 'Horizontal Layout',
                minimal: 'Minimal Design',
                featured: 'Featured Display',
                badge: 'Badge Style'
            };

            templates.forEach(function(templateName) {
                var templateOption = document.createElement('div');
                templateOption.className = 'template-option' + (templateName === selectedTemplate ? ' selected' : '');
                templateOption.onclick = function() { window.previewTemplate(templateName); };

                var previewHtml = '<p>Template preview</p>';
                if (typeof renderMemberCard === 'function') {
                    var memberData = Object.assign({}, member, {
                        joinDate: member.joinDate || { seconds: Date.now() / 1000 },
                        motorcycleType: member.motorcycleType || 'Harley-Davidson'
                    });
                    previewHtml = renderMemberCard(memberData, templateName);
                }

                templateOption.innerHTML = '\
                    <h3 class="template-name">' + templateNames[templateName] + '</h3>\
                    <div class="template-preview">' + previewHtml + '</div>';

                templateGrid.appendChild(templateOption);
            });

        } catch (error) {
            console.error('Error loading member for template selection:', error);
            alert('Error loading member data');
        }
    };

    window.previewTemplate = function(templateName) {
        selectedTemplate = templateName;

        document.querySelectorAll('.template-option').forEach(function(option) {
            option.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
    };

    window.closeTemplateModal = function() {
        document.getElementById('templateModal').classList.remove('active');
        currentMemberId = null;
        selectedTemplate = 'classic';
    };

    window.saveTemplateSelection = async function() {
        if (!currentMemberId) return;

        try {
            await firebase.firestore().collection('displayMembers').doc(currentMemberId).update({
                cardTemplate: selectedTemplate
            });

            alert('Template updated successfully!');
            window.closeTemplateModal();
            loadMembers();

        } catch (error) {
            console.error('Error saving template selection:', error);
            alert('Error saving template selection');
        }
    };

    // Show Bulk Member Management Modal
    window.showBulkMemberModal = function() {
        document.getElementById('bulkMemberModal').style.display = 'block';
        document.getElementById('bulkMemberEmails').value = '';
        document.getElementById('memberDomain').value = '';
        document.getElementById('bulkMemberResults').style.display = 'none';
    };

    // Close Bulk Member Management Modal
    window.closeBulkMemberModal = function() {
        document.getElementById('bulkMemberModal').style.display = 'none';
    };

    // Process Bulk Member Updates
    window.processBulkMembers = async function() {
        var emailsText = document.getElementById('bulkMemberEmails').value.trim();
        var domain = document.getElementById('memberDomain').value.trim();

        if (!emailsText && !domain) {
            alert('Please provide either email addresses or a domain.');
            return;
        }

        var resultsDiv = document.getElementById('bulkMemberResults');
        var resultsContent = document.getElementById('bulkMemberResultsContent');
        resultsDiv.style.display = 'block';
        resultsContent.innerHTML = '<p style="color: #888;">Processing...</p>';

        try {
            var allUsers = await sleipnirAuth.getAllUsers();
            var results = {
                updated: [],
                notFound: [],
                failed: [],
                alreadyMembers: []
            };

            if (emailsText) {
                var emails = emailsText.split('\n')
                    .map(function(e) { return e.trim().toLowerCase(); })
                    .filter(function(e) { return e && e.includes('@'); });

                for (var i = 0; i < emails.length; i++) {
                    var email = emails[i];
                    var user = allUsers.find(function(u) { return u.email && u.email.toLowerCase() === email; });

                    if (!user) {
                        results.notFound.push(email);
                    } else if (user.members === true) {
                        results.alreadyMembers.push(email);
                    } else {
                        try {
                            var result = await sleipnirAuth.toggleUserMembership(user.id, true);
                            if (result.success) {
                                results.updated.push(email);
                            } else {
                                results.failed.push({ email: email, error: result.error });
                            }
                        } catch (error) {
                            results.failed.push({ email: email, error: error.message });
                        }
                    }
                }
            }

            if (domain) {
                var domainLower = domain.toLowerCase();
                var domainUsers = allUsers.filter(function(u) {
                    return u.email && u.email.toLowerCase().endsWith(domainLower) && u.members !== true;
                });

                for (var j = 0; j < domainUsers.length; j++) {
                    var domainUser = domainUsers[j];
                    try {
                        var domainResult = await sleipnirAuth.toggleUserMembership(domainUser.id, true);
                        if (domainResult.success) {
                            results.updated.push(domainUser.email);
                        } else {
                            results.failed.push({ email: domainUser.email, error: domainResult.error });
                        }
                    } catch (error) {
                        results.failed.push({ email: domainUser.email, error: error.message });
                    }
                }
            }

            var html = '';

            if (results.updated.length > 0) {
                html += '<div style="color: #4CAF50; margin-bottom: 15px;">' +
                    '<strong>Successfully made members (' + results.updated.length + '):</strong><br>' +
                    results.updated.join('<br>') +
                    '</div>';
            }

            if (results.alreadyMembers.length > 0) {
                html += '<div style="color: #FF9800; margin-bottom: 15px;">' +
                    '<strong>Already members (' + results.alreadyMembers.length + '):</strong><br>' +
                    results.alreadyMembers.join('<br>') +
                    '</div>';
            }

            if (results.notFound.length > 0) {
                html += '<div style="color: #F44336; margin-bottom: 15px;">' +
                    '<strong>Users not found (' + results.notFound.length + '):</strong><br>' +
                    results.notFound.join('<br>') +
                    '</div>';
            }

            if (results.failed.length > 0) {
                html += '<div style="color: #F44336; margin-bottom: 15px;">' +
                    '<strong>Failed to update (' + results.failed.length + '):</strong><br>' +
                    results.failed.map(function(f) { return f.email + ': ' + f.error; }).join('<br>') +
                    '</div>';
            }

            resultsContent.innerHTML = html;

            if (results.updated.length > 0) {
                loadUsers();
                loadDashboardStats();
            }

        } catch (error) {
            console.error('Error processing bulk members:', error);
            resultsContent.innerHTML = '<p style="color: #F44336;">Error: ' + error.message + '</p>';
        }
    };

    // Sync Real Members
    window.syncRealMembers = async function() {
        var confirmMsg = 'This will analyze the displayMembers collection (member profiles) and sync the member status ' +
            'for all users who have profiles there. This ensures real club members are recognized in the system.\n\nContinue?';

        if (!confirm(confirmMsg)) return;

        try {
            var displayMembersSnapshot = await firebase.firestore().collection('displayMembers').get();
            var memberUserIds = new Set();

            displayMembersSnapshot.forEach(function(doc) {
                var data = doc.data();
                if (data.userId) {
                    memberUserIds.add(data.userId);
                }
            });

            if (memberUserIds.size === 0) {
                alert('No member profiles found in displayMembers collection.');
                return;
            }

            var updated = 0;
            var alreadyMembers = 0;
            var failed = 0;

            for (var userId of memberUserIds) {
                try {
                    var userDoc = await firebase.firestore().collection('users').doc(userId).get();

                    if (userDoc.exists) {
                        var userData = userDoc.data();
                        if (userData.members !== true) {
                            await firebase.firestore().collection('users').doc(userId).update({
                                members: true,
                                memberStatusSyncedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                memberStatusSyncReason: 'Synced from displayMembers collection'
                            });
                            updated++;
                        } else {
                            alreadyMembers++;
                        }
                    }
                } catch (error) {
                    console.error('Error updating user ' + userId + ':', error);
                    failed++;
                }
            }

            var message = 'Real Members Sync Complete:\n' +
                '- Updated: ' + updated + ' users\n' +
                '- Already members: ' + alreadyMembers + ' users\n' +
                '- Failed: ' + failed + ' users\n' +
                '- Total profiles: ' + memberUserIds.size;

            alert(message);

            if (updated > 0) {
                loadUsers();
                loadDashboardStats();
            }

        } catch (error) {
            console.error('Error syncing real members:', error);
            alert('Error syncing members: ' + error.message);
        }
    };

    // Handle delete checkbox change
    window.handleDeleteCheckbox = function(checkbox) {
        updateBulkDeleteButtonText();
    };

    // Update bulk delete button text to show count of selected users
    function updateBulkDeleteButtonText() {
        var selectedCheckboxes = document.querySelectorAll('.delete-user-checkbox:checked');
        var bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

        if (selectedCheckboxes.length > 0) {
            bulkDeleteBtn.textContent = 'Delete Selected Users (' + selectedCheckboxes.length + ')';
            bulkDeleteBtn.classList.add('delete');
        } else {
            bulkDeleteBtn.textContent = 'Delete Selected Users';
        }
    }

    // Bulk delete users
    window.bulkDeleteUsers = async function() {
        var selectedCheckboxes = document.querySelectorAll('.delete-user-checkbox:checked');

        if (selectedCheckboxes.length === 0) {
            alert('No users selected for deletion.');
            return;
        }

        var selectedUsers = Array.from(selectedCheckboxes).map(function(cb) {
            return {
                id: cb.dataset.userId,
                email: cb.dataset.userEmail
            };
        });

        var confirmMsg = 'Are you sure you want to permanently delete ' + selectedUsers.length + ' user(s)?\n\n' +
            'This action will:\n- Remove users from Firebase Authentication\n- Delete their user profiles\n' +
            '- Archive their orders and data\n\nThis action CANNOT be undone!';

        if (!confirm(confirmMsg)) {
            return;
        }

        var loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }

        var successCount = 0;
        var failedCount = 0;
        var errors = [];

        try {
            for (var i = 0; i < selectedUsers.length; i++) {
                var user = selectedUsers[i];
                try {
                    var result = await sleipnirAuth.deleteUser(user.id);
                    if (result.success) {
                        successCount++;
                    } else {
                        failedCount++;
                        errors.push(user.email + ': ' + (result.error || 'Unknown error'));
                    }
                } catch (error) {
                    failedCount++;
                    errors.push(user.email + ': ' + error.message);
                }
            }

            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }

            var message = 'Deletion complete:\n- Successfully deleted: ' + successCount + ' users';
            if (failedCount > 0) {
                message += '\n- Failed: ' + failedCount + ' users';
                if (errors.length > 0) {
                    message += '\n\nErrors:\n' + errors.join('\n');
                }
            }

            alert(message);

            document.querySelectorAll('.delete-user-checkbox').forEach(function(cb) { cb.checked = false; });
            updateBulkDeleteButtonText();
            loadUsers();
            loadDashboardStats();

        } catch (error) {
            console.error('Error during bulk deletion:', error);
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            alert('An error occurred during bulk deletion. Please check the console for details.');
        }
    };

})();
