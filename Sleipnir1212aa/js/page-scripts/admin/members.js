(function() {
    'use strict';

    if (!document.getElementById('page-dashboard')) return;

    // =============================================
    // MEMBERS MODULE — Firebase-backed member management
    // =============================================

    var allMembers = [];
    var currentView = 'grid';
    var currentMemberId = null;
    var selectedTemplate = 'classic';
    var initialized = false;

    var TEMPLATE_NAMES = {
        classic: 'Classic Vertical',
        horizontal: 'Horizontal Layout',
        minimal: 'Minimal Design',
        featured: 'Featured Display',
        badge: 'Badge Style'
    };

    // =============================================
    // LOAD MEMBERS FROM FIRESTORE
    // =============================================

    function loadMembers() {
        var grid = document.getElementById('memberGrid');
        if (!grid) return;

        AdminApp.showLoading(grid);

        try {
            AdminApp.db.collection('displayMembers').get()
                .then(function(snapshot) {
                    allMembers = [];
                    snapshot.docs.forEach(function(doc) {
                        var data = doc.data();
                        data._id = doc.id;
                        allMembers.push(data);
                    });
                    renderMembers();
                })
                .catch(function(err) {
                    console.error('Error loading members:', err);
                    grid.innerHTML = '<div class="empty-state" style="color:#f44336;">Villa vi\u00F0 a\u00F0 hla\u00F0a me\u00F0limum</div>';
                    AdminApp.showToast('Villa vi\u00F0 a\u00F0 hla\u00F0a me\u00F0limum', 'error');
                });
        } catch (err) {
            console.error('Error initiating members query:', err);
        }
    }

    // =============================================
    // FILTER & RENDER
    // =============================================

    function getFilteredMembers() {
        var searchEl = document.getElementById('memberSearch');
        var chapterEl = document.getElementById('memberChapterFilter');
        var search = searchEl ? searchEl.value.toLowerCase() : '';
        var chapter = chapterEl ? chapterEl.value : 'all';

        return allMembers.filter(function(m) {
            // Search filter
            var matchSearch = !search ||
                (m.name && m.name.toLowerCase().indexOf(search) !== -1) ||
                (m.nickname && m.nickname.toLowerCase().indexOf(search) !== -1) ||
                (m.role && m.role.toLowerCase().indexOf(search) !== -1) ||
                getMotorcycleString(m).toLowerCase().indexOf(search) !== -1;

            // Chapter filter
            var matchChapter = chapter === 'all' ||
                (m.chapter && m.chapter.toLowerCase() === chapter.toLowerCase());

            return matchSearch && matchChapter;
        });
    }

    function getMotorcycleString(member) {
        if (member.motorcycleType) {
            return member.motorcycleType;
        }
        if (member.motorcycle) {
            var parts = [];
            if (member.motorcycle.year) parts.push(member.motorcycle.year);
            if (member.motorcycle.make) parts.push(member.motorcycle.make);
            if (member.motorcycle.model) parts.push(member.motorcycle.model);
            if (parts.length > 0) return parts.join(' ');
        }
        return '';
    }

    function getMemberPhoto(member) {
        return member.photoUrl || member.photo || '';
    }

    function renderMembers() {
        var grid = document.getElementById('memberGrid');
        if (!grid) return;

        var filtered = getFilteredMembers();

        grid.className = currentView === 'list' ? 'member-grid list-view' : 'member-grid';

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state">' +
                SleipnirI18n.t('admin.members.noResults', 'Engir me\u00F0limir fundust') +
                '</div>';
            return;
        }

        var html = '';
        filtered.forEach(function(member) {
            var name = AdminApp.escapeHTML(member.name || '');
            var nickname = member.nickname ? AdminApp.escapeHTML(member.nickname) : '';
            var role = AdminApp.escapeHTML(member.role || 'Me\u00F0limur');
            var moto = AdminApp.escapeHTML(getMotorcycleString(member) || SleipnirI18n.t('admin.members.noMotorcycle', 'Ekki tilgreint'));
            var chapter = AdminApp.escapeHTML(member.chapter || '');
            var joinDate = AdminApp.formatFirestoreDate(member.joinDate);
            var photo = getMemberPhoto(member);
            var docId = AdminApp.escapeAttr(member._id);

            var roleClass = 'badge--member';
            if (role === 'Forseti' || role === 'Varaforseti') roleClass = 'badge--admin';

            // Avatar: use photo if available, otherwise initials
            var avatarHtml;
            if (photo) {
                avatarHtml = '<div class="member-avatar member-avatar--photo">' +
                    '<img src="' + AdminApp.escapeAttr(photo) + '" alt="' + AdminApp.escapeAttr(member.name) + '" ' +
                    'onerror="this.parentElement.innerHTML=\'' + AdminApp.generateInitials(member.name) + '\';this.parentElement.style.backgroundColor=\'' + AdminApp.generateAvatarColor(member.name) + '\'">' +
                '</div>';
            } else {
                var initials = AdminApp.generateInitials(member.name);
                var color = AdminApp.generateAvatarColor(member.name);
                avatarHtml = '<div class="member-avatar" style="background-color:' + color + '">' + initials + '</div>';
            }

            html += '<div class="member-card">' +
                avatarHtml +
                '<div class="member-info">' +
                    '<div class="member-name">' + name +
                        (nickname ? ' <span class="member-nickname">"' + nickname + '"</span>' : '') +
                    '</div>' +
                    '<span class="badge ' + roleClass + '">' + role + '</span>' +
                    '<div class="member-motorcycle">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h3l2 4-7 4"/><path d="M9.5 17.5L6 6h3"/></svg> ' +
                        moto +
                    '</div>' +
                    '<div class="member-meta">' +
                        '<span class="member-chapter">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' +
                            chapter +
                        '</span>' +
                        '<span class="member-date">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' +
                            joinDate +
                        '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="member-actions">' +
                    '<button class="btn btn-sm btn-secondary" onclick="MembersModule.editMember(\'' + docId + '\')">' +
                        SleipnirI18n.t('admin.members.edit', 'Breyta') +
                    '</button>' +
                    '<button class="btn btn-sm btn-primary" onclick="MembersModule.selectTemplate(\'' + docId + '\')">' +
                        SleipnirI18n.t('admin.members.template', 'Sni\u00F0m\u00E1t') +
                    '</button>' +
                '</div>' +
            '</div>';
        });

        grid.innerHTML = html;
    }

    // =============================================
    // EDIT MEMBER (placeholder)
    // =============================================

    function editMember(docId) {
        alert(SleipnirI18n.t('admin.members.editComingSoon', 'Breytingar \u00E1 me\u00F0limum ver\u00F0ur \u00FAtf\u00E6rt fr\u00E1br.'));
    }

    // =============================================
    // TEMPLATE SELECTION
    // =============================================

    function selectTemplate(docId) {
        currentMemberId = docId;

        try {
            AdminApp.db.collection('displayMembers').doc(docId).get()
                .then(function(doc) {
                    if (!doc.exists) {
                        AdminApp.showToast('Me\u00F0limur fannst ekki', 'error');
                        return;
                    }

                    var member = doc.data();
                    selectedTemplate = member.cardTemplate || 'classic';

                    // Open template modal
                    AdminApp.openTemplateModal();

                    var templateGrid = document.getElementById('templateGrid');
                    if (!templateGrid) return;

                    templateGrid.innerHTML = '';

                    var templates = ['classic', 'horizontal', 'minimal', 'featured', 'badge'];

                    templates.forEach(function(templateName) {
                        var option = document.createElement('div');
                        option.className = 'template-option' + (templateName === selectedTemplate ? ' selected' : '');
                        option.setAttribute('data-template', templateName);
                        option.onclick = function() {
                            previewTemplate(templateName, this);
                        };

                        // Build preview content
                        var previewHtml = '<div class="template-preview-card">' +
                            '<div style="text-align:center;padding:12px;color:#888;">' +
                                AdminApp.escapeHTML(templateName.charAt(0).toUpperCase() + templateName.slice(1)) +
                            '</div>' +
                        '</div>';

                        // Try to use renderMemberCard if available
                        if (typeof window.renderMemberCard === 'function') {
                            var memberData = {};
                            for (var key in member) {
                                memberData[key] = member[key];
                            }
                            if (!memberData.joinDate) memberData.joinDate = { seconds: Date.now() / 1000 };
                            if (!memberData.motorcycleType && !memberData.motorcycle) memberData.motorcycleType = 'Harley-Davidson';
                            previewHtml = window.renderMemberCard(memberData, templateName);
                        }

                        option.innerHTML = '<h3 class="template-name">' + AdminApp.escapeHTML(TEMPLATE_NAMES[templateName] || templateName) + '</h3>' +
                            '<div class="template-preview">' + previewHtml + '</div>';

                        templateGrid.appendChild(option);
                    });
                })
                .catch(function(err) {
                    console.error('Error loading member for template selection:', err);
                    AdminApp.showToast('Villa vi\u00F0 a\u00F0 hla\u00F0a me\u00F0lim', 'error');
                });
        } catch (err) {
            console.error('Error initiating template selection:', err);
        }
    }

    function previewTemplate(templateName, element) {
        selectedTemplate = templateName;

        // Update selected state on all template options
        var options = document.querySelectorAll('.template-option');
        for (var i = 0; i < options.length; i++) {
            options[i].classList.remove('selected');
        }
        if (element) {
            element.classList.add('selected');
        }
    }

    function saveTemplateSelection() {
        if (!currentMemberId) return;

        try {
            AdminApp.db.collection('displayMembers').doc(currentMemberId).update({
                cardTemplate: selectedTemplate
            }).then(function() {
                AdminApp.showToast(
                    SleipnirI18n.t('admin.members.templateSaved', 'Sni\u00F0m\u00E1t uppf\u00E6rt'),
                    'success'
                );
                AdminApp.closeTemplateModal();
                currentMemberId = null;

                // Reload members to reflect change
                loadMembers();

                AdminApp.logActivity('template_change', 'Template changed to: ' + selectedTemplate);
            }).catch(function(err) {
                console.error('Error saving template selection:', err);
                AdminApp.showToast('Villa vi\u00F0 a\u00F0 vista sni\u00F0m\u00E1t', 'error');
            });
        } catch (err) {
            console.error('Error initiating template save:', err);
        }
    }

    // =============================================
    // VIEW TOGGLE
    // =============================================

    function bindViewToggle() {
        var gridBtn = document.getElementById('memberGridBtn');
        var listBtn = document.getElementById('memberListBtn');

        if (gridBtn) {
            gridBtn.addEventListener('click', function() {
                currentView = 'grid';
                this.classList.add('active');
                if (listBtn) listBtn.classList.remove('active');
                renderMembers();
            });
        }

        if (listBtn) {
            listBtn.addEventListener('click', function() {
                currentView = 'list';
                this.classList.add('active');
                if (gridBtn) gridBtn.classList.remove('active');
                renderMembers();
            });
        }
    }

    // =============================================
    // SEARCH & FILTER
    // =============================================

    function bindSearchAndFilter() {
        var searchEl = document.getElementById('memberSearch');
        var chapterEl = document.getElementById('memberChapterFilter');

        if (searchEl) {
            searchEl.addEventListener('input', AdminApp.debounce(function() {
                renderMembers();
            }, 300));
        }

        if (chapterEl) {
            chapterEl.addEventListener('change', function() {
                renderMembers();
            });
        }
    }

    // =============================================
    // PUBLIC API
    // =============================================

    window.MembersModule = {
        editMember: editMember,
        selectTemplate: selectTemplate,
        previewTemplate: function(templateName) {
            var option = document.querySelector('.template-option[data-template="' + templateName + '"]');
            previewTemplate(templateName, option);
        },
        saveTemplateSelection: saveTemplateSelection
    };

    // =============================================
    // INITIALIZATION
    // =============================================

    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'members' && !initialized) {
            initialized = true;
            bindSearchAndFilter();
            bindViewToggle();

            // Bind template save button
            var saveTemplateBtn = document.getElementById('saveTemplateBtn');
            if (saveTemplateBtn) {
                saveTemplateBtn.addEventListener('click', function() {
                    saveTemplateSelection();
                });
            }

            loadMembers();
        }
    });

    document.addEventListener('sectionShow', function(e) {
        if (e.detail.section === 'members') {
            loadMembers();
        }
    });

})();
