(function() {
    'use strict';

    var currentView = 'grid';

    function renderMembers() {
        var data = window.MOCK_DATA.members;
        var search = document.getElementById('memberSearch').value.toLowerCase();
        var chapter = document.getElementById('memberChapterFilter').value;

        var filtered = data.filter(function(m) {
            var matchSearch = !search ||
                m.name.toLowerCase().includes(search) ||
                (m.nickname && m.nickname.toLowerCase().includes(search)) ||
                m.role.toLowerCase().includes(search) ||
                (m.motorcycle.make + ' ' + m.motorcycle.model).toLowerCase().includes(search);
            var matchChapter = chapter === 'all' || m.chapter === chapter;
            return matchSearch && matchChapter;
        });

        var grid = document.getElementById('memberGrid');
        grid.className = currentView === 'list' ? 'member-grid list-view' : 'member-grid';

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state">Engir meðlimir fundust</div>';
            return;
        }

        var html = '';
        filtered.forEach(function(member) {
            var initials = AdminApp.generateInitials(member.name);
            var color = AdminApp.generateAvatarColor(member.name);
            var moto = member.motorcycle.year + ' ' + member.motorcycle.make + ' ' + member.motorcycle.model;

            var roleClass = 'badge--member';
            if (member.role === 'Forseti' || member.role === 'Varaforseti') roleClass = 'badge--admin';

            html += '<div class="member-card">' +
                '<div class="member-avatar" style="background-color:' + color + '">' + initials + '</div>' +
                '<div class="member-info">' +
                    '<div class="member-name">' + member.name + (member.nickname ? ' <span class="member-nickname">"' + member.nickname + '"</span>' : '') + '</div>' +
                    '<span class="badge ' + roleClass + '">' + member.role + '</span>' +
                    '<div class="member-motorcycle">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h3l2 4-7 4"/><path d="M9.5 17.5L6 6h3"/></svg> ' +
                        moto +
                    '</div>' +
                    '<div class="member-meta">' +
                        '<span class="member-chapter">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' +
                            member.chapter +
                        '</span>' +
                        '<span class="member-date">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' +
                            AdminApp.formatDate(member.joinDate) +
                        '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });

        grid.innerHTML = html;
    }

    // Event listeners
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'members') {
            renderMembers();

            document.getElementById('memberSearch').addEventListener('input', debounce(renderMembers, 300));
            document.getElementById('memberChapterFilter').addEventListener('change', renderMembers);

            document.getElementById('memberGridBtn').addEventListener('click', function() {
                currentView = 'grid';
                this.classList.add('active');
                document.getElementById('memberListBtn').classList.remove('active');
                renderMembers();
            });

            document.getElementById('memberListBtn').addEventListener('click', function() {
                currentView = 'list';
                this.classList.add('active');
                document.getElementById('memberGridBtn').classList.remove('active');
                renderMembers();
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
