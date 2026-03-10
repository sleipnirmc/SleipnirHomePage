(function() {
    'use strict';

    var currentTab = 'upcoming';
    var TODAY = '2026-03-10';

    var categoryInfo = {
        ride:        { icon: '\uD83C\uDFCD\uFE0F', label: 'Akstursferð' },
        meeting:     { icon: '\uD83D\uDCCB', label: 'Fundur' },
        social:      { icon: '\uD83C\uDF89', label: 'Félagsstarf' },
        charity:     { icon: '\u2764\uFE0F', label: 'Góðgerðarmál' },
        maintenance: { icon: '\uD83D\uDD27', label: 'Viðhald' }
    };

    var monthAbbr = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];

    function isUpcoming(dateStr) {
        return dateStr.split('T')[0] >= TODAY;
    }

    function renderEvents() {
        var data = window.MOCK_DATA.events;
        var catFilter = document.getElementById('eventCategoryFilter').value;

        var filtered = data.filter(function(evt) {
            var matchTab = (currentTab === 'upcoming') ? isUpcoming(evt.date) : !isUpcoming(evt.date);
            var matchCat = catFilter === 'all' || evt.category === catFilter;
            return matchTab && matchCat;
        });

        // Sort: upcoming ascending, past descending
        filtered.sort(function(a, b) {
            var da = new Date(a.date);
            var db = new Date(b.date);
            return currentTab === 'upcoming' ? da - db : db - da;
        });

        var list = document.getElementById('eventList');

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state">' +
                (currentTab === 'upcoming' ? 'Engir væntanlegir viðburðir' : 'Engir liðnir viðburðir') +
            '</div>';
            return;
        }

        var html = '';
        filtered.forEach(function(evt) {
            var d = new Date(evt.date);
            var day = d.getDate();
            var month = monthAbbr[d.getMonth()];
            var info = categoryInfo[evt.category] || { icon: '\uD83D\uDCC5', label: evt.category };
            var timeStr = d.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });

            html += '<div class="event-card" style="display:flex;gap:20px;padding:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:12px;align-items:flex-start;">' +
                '<div class="event-date-badge" style="min-width:60px;text-align:center;background:rgba(207,35,66,0.1);border-radius:8px;padding:10px 8px;">' +
                    '<div style="font-size:0.75rem;text-transform:uppercase;color:#cf2342;font-weight:700;letter-spacing:1px;">' + month + '</div>' +
                    '<div style="font-size:1.6rem;font-weight:700;color:#e0e0e0;line-height:1.2;">' + day + '</div>' +
                '</div>' +
                '<div class="event-info" style="flex:1;min-width:0;">' +
                    '<div class="event-name" style="font-size:1.1rem;font-weight:600;color:#e0e0e0;">' + escapeHTML(evt.nameIs) + '</div>' +
                    '<div class="event-name-en" style="color:#888;font-size:0.85rem;margin-top:2px;">' + escapeHTML(evt.nameEn) + '</div>' +
                    '<div class="event-description" style="color:#aaa;font-size:0.9rem;margin-top:6px;">' + escapeHTML(evt.description) + '</div>' +
                    '<div class="event-meta" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:10px;">' +
                        '<span style="display:inline-flex;align-items:center;gap:4px;color:#b3b2b2;font-size:0.85rem;">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' +
                            escapeHTML(evt.location) +
                        '</span>' +
                        '<span style="display:inline-flex;align-items:center;gap:4px;color:#b3b2b2;font-size:0.85rem;">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' +
                            timeStr +
                        '</span>' +
                        '<span class="badge badge--' + evt.category + '" style="font-size:0.8rem;">' + info.icon + ' ' + info.label + '</span>' +
                        '<span style="color:#888;font-size:0.8rem;">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg> ' +
                            evt.attendees + ' þátttakendur' +
                        '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="event-actions" style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">' +
                    '<button class="btn btn-sm btn-secondary" onclick="EventsModule.editEvent(\'' + evt.id + '\')">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Breyta' +
                    '</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="EventsModule.deleteEvent(\'' + evt.id + '\')">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Eyða' +
                    '</button>' +
                '</div>' +
            '</div>';
        });

        list.innerHTML = html;
    }

    function getEventFormHTML(evt) {
        var e = evt || { nameIs: '', nameEn: '', description: '', date: '', location: '', category: 'ride' };

        // Format date for datetime-local input
        var dateVal = '';
        if (e.date) {
            dateVal = e.date.length > 16 ? e.date.substring(0, 16) : e.date;
        }

        return '<form id="eventForm" class="admin-form">' +
            '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                '<div class="form-group">' +
                    '<label class="form-label">Heiti (Íslenska)</label>' +
                    '<input type="text" class="form-input" name="nameIs" value="' + escapeAttr(e.nameIs) + '" required>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label">Name (English)</label>' +
                    '<input type="text" class="form-input" name="nameEn" value="' + escapeAttr(e.nameEn) + '" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">Lýsing</label>' +
                '<textarea class="form-textarea" name="description" rows="3">' + escapeHTML(e.description || '') + '</textarea>' +
            '</div>' +
            '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                '<div class="form-group">' +
                    '<label class="form-label">Dagsetning og tími</label>' +
                    '<input type="datetime-local" class="form-input" name="date" value="' + dateVal + '" required>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label">Staðsetning</label>' +
                    '<input type="text" class="form-input" name="location" value="' + escapeAttr(e.location) + '" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">Flokkur</label>' +
                '<select class="form-select" name="category">' +
                    '<option value="ride"' + (e.category === 'ride' ? ' selected' : '') + '>\uD83C\uDFCD\uFE0F Akstursferð</option>' +
                    '<option value="meeting"' + (e.category === 'meeting' ? ' selected' : '') + '>\uD83D\uDCCB Fundur</option>' +
                    '<option value="social"' + (e.category === 'social' ? ' selected' : '') + '>\uD83C\uDF89 Félagsstarf</option>' +
                    '<option value="charity"' + (e.category === 'charity' ? ' selected' : '') + '>\u2764\uFE0F Góðgerðarmál</option>' +
                    '<option value="maintenance"' + (e.category === 'maintenance' ? ' selected' : '') + '>\uD83D\uDD27 Viðhald</option>' +
                '</select>' +
            '</div>' +
        '</form>';
    }

    function collectEventFormData() {
        var form = document.getElementById('eventForm');
        if (!form) return null;

        var nameIs = form.querySelector('[name="nameIs"]').value.trim();
        var nameEn = form.querySelector('[name="nameEn"]').value.trim();
        if (!nameIs || !nameEn) {
            AdminApp.showToast('Vinsamlegast fylltu út heiti viðburðar', 'error');
            return null;
        }

        var date = form.querySelector('[name="date"]').value;
        if (!date) {
            AdminApp.showToast('Vinsamlegast veldu dagsetningu', 'error');
            return null;
        }

        var location = form.querySelector('[name="location"]').value.trim();
        if (!location) {
            AdminApp.showToast('Vinsamlegast sláðu inn staðsetningu', 'error');
            return null;
        }

        return {
            nameIs: nameIs,
            nameEn: nameEn,
            description: form.querySelector('[name="description"]').value.trim(),
            date: date,
            location: location,
            category: form.querySelector('[name="category"]').value
        };
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function setupTabs() {
        var tabBtns = document.querySelectorAll('#page-events .toolbar-tabs [data-tab]');
        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                tabBtns.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                currentTab = this.dataset.tab;
                renderEvents();
            });
        });
    }

    // Public API
    window.EventsModule = {
        addEvent: function() {
            var bodyHTML = getEventFormHTML(null);
            var footerHTML = '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">Hætta við</button>' +
                '<button class="btn btn-primary" onclick="EventsModule.saveNew()">Bæta við</button>';
            AdminApp.openModal('Nýr viðburður', bodyHTML, footerHTML);
        },

        saveNew: function() {
            var data = collectEventFormData();
            if (!data) return;
            data.id = 'evt' + Date.now();
            data.attendees = 0;
            window.MOCK_DATA.events.push(data);
            AdminApp.closeModal();
            AdminApp.showToast('Viðburði bætt við', 'success');
            renderEvents();
        },

        editEvent: function(id) {
            var evt = window.MOCK_DATA.events.find(function(e) { return e.id === id; });
            if (!evt) return;

            var bodyHTML = getEventFormHTML(evt);
            var footerHTML = '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">Hætta við</button>' +
                '<button class="btn btn-primary" onclick="EventsModule.saveEdit(\'' + id + '\')">Vista breytingar</button>';

            AdminApp.openModal('Breyta viðburði', bodyHTML, footerHTML);
        },

        saveEdit: function(id) {
            var data = collectEventFormData();
            if (!data) return;
            var idx = window.MOCK_DATA.events.findIndex(function(e) { return e.id === id; });
            if (idx === -1) return;
            // Preserve attendees count
            data.attendees = window.MOCK_DATA.events[idx].attendees;
            Object.assign(window.MOCK_DATA.events[idx], data);
            AdminApp.closeModal();
            AdminApp.showToast('Viðburður uppfærður', 'success');
            renderEvents();
        },

        deleteEvent: function(id) {
            var evt = window.MOCK_DATA.events.find(function(e) { return e.id === id; });
            if (!evt) return;

            AdminApp.openModal('Eyða viðburði',
                '<p style="color:#b3b2b2;font-size:1.1rem;">Ertu viss um að þú viljir eyða <strong>' + escapeHTML(evt.nameIs) + '</strong>?</p>' +
                '<p style="color:#888;margin-top:8px;">Þessa aðgerð er ekki hægt að afturkalla.</p>',
                '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">Hætta við</button>' +
                '<button class="btn btn-danger" onclick="EventsModule.confirmDelete(\'' + id + '\')">Eyða</button>'
            );
        },

        confirmDelete: function(id) {
            window.MOCK_DATA.events = window.MOCK_DATA.events.filter(function(e) { return e.id !== id; });
            AdminApp.closeModal();
            AdminApp.showToast('Viðburði eytt', 'success');
            renderEvents();
        }
    };

    // Initialize
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'events') {
            setupTabs();
            renderEvents();
            document.getElementById('addEventBtn').addEventListener('click', EventsModule.addEvent);
            document.getElementById('eventCategoryFilter').addEventListener('change', renderEvents);
        }
    });

})();
