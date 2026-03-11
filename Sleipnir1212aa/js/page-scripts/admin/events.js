(function() {
    'use strict';

    // =============================================
    // EVENTS MODULE — Firestore-backed event management
    // Depends on: window.AdminApp, firebase
    // =============================================

    var events = [];
    var currentTab = 'upcoming';

    var categoryInfo = {
        ride:        { icon: '\uD83C\uDFCD\uFE0F', label: 'Akstursfer\u00F0' },
        meeting:     { icon: '\uD83D\uDCCB', label: 'Fundur' },
        social:      { icon: '\uD83C\uDF89', label: 'F\u00E9lagsstarf' },
        charity:     { icon: '\u2764\uFE0F', label: 'G\u00F3\u00F0ger\u00F0arm\u00E1l' },
        maintenance: { icon: '\uD83D\uDD27', label: 'Vi\u00F0hald' }
    };

    var monthAbbr = ['jan', 'feb', 'mar', 'apr', 'ma\u00ED', 'j\u00FAn', 'j\u00FAl', '\u00E1g\u00FA', 'sep', 'okt', 'n\u00F3v', 'des'];

    // =============================================
    // DATE HELPERS
    // =============================================

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function normalizeDate(val) {
        if (!val) return '';
        // Firestore Timestamp
        if (val && typeof val.toDate === 'function') {
            return val.toDate().toISOString();
        }
        // Already a string
        return String(val);
    }

    function isUpcoming(dateStr) {
        var normalized = normalizeDate(dateStr);
        if (!normalized) return false;
        return normalized.split('T')[0] >= getToday();
    }

    // =============================================
    // DATA LOADING
    // =============================================

    function loadEvents() {
        var list = document.getElementById('eventList');
        if (!list) return;

        AdminApp.showLoading(list);

        AdminApp.db.collection('events').get()
            .then(function(snapshot) {
                events = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    events.push(data);
                });
                renderEvents();
            })
            .catch(function(error) {
                console.error('Error loading events:', error);
                AdminApp.showToast(SleipnirI18n.t('admin.events.loadError', 'Villa vi\u00F0 a\u00F0 hla\u00F0a vi\u00F0bur\u00F0um'), 'error');
                if (list) list.innerHTML = '<div class="empty-state">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.loadError', 'Villa vi\u00F0 a\u00F0 hla\u00F0a vi\u00F0bur\u00F0um')) + '</div>';
            });
    }

    // =============================================
    // RENDERING
    // =============================================

    function renderEvents() {
        var list = document.getElementById('eventList');
        if (!list) return;

        var catFilterEl = document.getElementById('eventCategoryFilter');
        var catFilter = catFilterEl ? catFilterEl.value : 'all';

        var filtered = events.filter(function(evt) {
            var dateStr = normalizeDate(evt.date);
            var matchTab = (currentTab === 'upcoming') ? isUpcoming(evt.date) : !isUpcoming(evt.date);
            var matchCat = catFilter === 'all' || evt.category === catFilter;
            return matchTab && matchCat;
        });

        // Sort: upcoming ascending, past descending
        filtered.sort(function(a, b) {
            var da = new Date(normalizeDate(a.date));
            var db = new Date(normalizeDate(b.date));
            return currentTab === 'upcoming' ? da - db : db - da;
        });

        if (filtered.length === 0) {
            var emptyMsg = currentTab === 'upcoming'
                ? SleipnirI18n.t('admin.events.noUpcoming', 'Engir v\u00E6ntanlegir vi\u00F0bur\u00F0ir')
                : SleipnirI18n.t('admin.events.noPast', 'Engir li\u00F0nir vi\u00F0bur\u00F0ir');
            list.innerHTML = '<div class="empty-state">' + AdminApp.escapeHTML(emptyMsg) + '</div>';
            return;
        }

        var html = '';
        filtered.forEach(function(evt) {
            var dateNorm = normalizeDate(evt.date);
            var d = new Date(dateNorm);
            var day = d.getDate();
            var month = monthAbbr[d.getMonth()] || '';
            var info = categoryInfo[evt.category] || { icon: '\uD83D\uDCC5', label: evt.category || '' };
            var timeStr = '';
            try {
                timeStr = d.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                timeStr = '';
            }

            var attendees = (typeof evt.attendees === 'number') ? evt.attendees : 0;

            html += '<div class="event-card" style="display:flex;gap:20px;padding:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:12px;align-items:flex-start;">' +
                '<div class="event-date-badge" style="min-width:60px;text-align:center;background:rgba(207,35,66,0.1);border-radius:8px;padding:10px 8px;">' +
                    '<div style="font-size:0.75rem;text-transform:uppercase;color:#cf2342;font-weight:700;letter-spacing:1px;">' + AdminApp.escapeHTML(month) + '</div>' +
                    '<div style="font-size:1.6rem;font-weight:700;color:#e0e0e0;line-height:1.2;">' + day + '</div>' +
                '</div>' +
                '<div class="event-info" style="flex:1;min-width:0;">' +
                    '<div class="event-name" style="font-size:1.1rem;font-weight:600;color:#e0e0e0;">' + AdminApp.escapeHTML(evt.nameIs || '') + '</div>' +
                    '<div class="event-name-en" style="color:#888;font-size:0.85rem;margin-top:2px;">' + AdminApp.escapeHTML(evt.nameEn || '') + '</div>' +
                    '<div class="event-description" style="color:#aaa;font-size:0.9rem;margin-top:6px;">' + AdminApp.escapeHTML(evt.description || '') + '</div>' +
                    '<div class="event-meta" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:10px;">' +
                        '<span style="display:inline-flex;align-items:center;gap:4px;color:#b3b2b2;font-size:0.85rem;">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' +
                            AdminApp.escapeHTML(evt.location || '') +
                        '</span>' +
                        (timeStr
                            ? '<span style="display:inline-flex;align-items:center;gap:4px;color:#b3b2b2;font-size:0.85rem;">' +
                                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' +
                                AdminApp.escapeHTML(timeStr) +
                              '</span>'
                            : '') +
                        '<span class="badge badge--' + AdminApp.escapeAttr(evt.category || '') + '" style="font-size:0.8rem;">' + info.icon + ' ' + AdminApp.escapeHTML(info.label) + '</span>' +
                        '<span style="color:#888;font-size:0.8rem;">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg> ' +
                            attendees + ' ' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.attendees', '\u00FE\u00E1tttakendur')) +
                        '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="event-actions" style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">' +
                    '<button class="btn btn-sm btn-secondary" onclick="EventsModule.editEvent(\'' + AdminApp.escapeAttr(evt.id) + '\')">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ' +
                        AdminApp.escapeHTML(SleipnirI18n.t('admin.events.edit', 'Breyta')) +
                    '</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="EventsModule.deleteEvent(\'' + AdminApp.escapeAttr(evt.id) + '\')">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> ' +
                        AdminApp.escapeHTML(SleipnirI18n.t('admin.events.delete', 'Ey\u00F0a')) +
                    '</button>' +
                '</div>' +
            '</div>';
        });

        list.innerHTML = html;
    }

    // =============================================
    // FORM HTML
    // =============================================

    function getEventFormHTML(evt) {
        var e = evt || { nameIs: '', nameEn: '', description: '', date: '', location: '', category: 'ride' };

        // Format date for datetime-local input
        var dateVal = '';
        if (e.date) {
            var normalized = normalizeDate(e.date);
            dateVal = normalized.length > 16 ? normalized.substring(0, 16) : normalized;
        }

        return '<form id="eventForm" class="admin-form">' +
            '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                '<div class="form-group">' +
                    '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.nameIs', 'Heiti (\u00CDslenska)')) + '</label>' +
                    '<input type="text" class="form-input" name="nameIs" value="' + AdminApp.escapeAttr(e.nameIs) + '" required>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.nameEn', 'Name (English)')) + '</label>' +
                    '<input type="text" class="form-input" name="nameEn" value="' + AdminApp.escapeAttr(e.nameEn) + '" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.description', 'L\u00FDsing')) + '</label>' +
                '<textarea class="form-textarea" name="description" rows="3">' + AdminApp.escapeHTML(e.description || '') + '</textarea>' +
            '</div>' +
            '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
                '<div class="form-group">' +
                    '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.dateTime', 'Dagsetning og t\u00EDmi')) + '</label>' +
                    '<input type="datetime-local" class="form-input" name="date" value="' + AdminApp.escapeAttr(dateVal) + '" required>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.location', 'Sta\u00F0setning')) + '</label>' +
                    '<input type="text" class="form-input" name="location" value="' + AdminApp.escapeAttr(e.location) + '" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label class="form-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.category', 'Flokkur')) + '</label>' +
                '<select class="form-select" name="category">' +
                    '<option value="ride"' + (e.category === 'ride' ? ' selected' : '') + '>\uD83C\uDFCD\uFE0F Akstursfer\u00F0</option>' +
                    '<option value="meeting"' + (e.category === 'meeting' ? ' selected' : '') + '>\uD83D\uDCCB Fundur</option>' +
                    '<option value="social"' + (e.category === 'social' ? ' selected' : '') + '>\uD83C\uDF89 F\u00E9lagsstarf</option>' +
                    '<option value="charity"' + (e.category === 'charity' ? ' selected' : '') + '>\u2764\uFE0F G\u00F3\u00F0ger\u00F0arm\u00E1l</option>' +
                    '<option value="maintenance"' + (e.category === 'maintenance' ? ' selected' : '') + '>\uD83D\uDD27 Vi\u00F0hald</option>' +
                '</select>' +
            '</div>' +
        '</form>';
    }

    // =============================================
    // FORM DATA COLLECTION
    // =============================================

    function collectEventFormData() {
        var form = document.getElementById('eventForm');
        if (!form) return null;

        var nameIs = form.querySelector('[name="nameIs"]').value.trim();
        var nameEn = form.querySelector('[name="nameEn"]').value.trim();
        if (!nameIs || !nameEn) {
            AdminApp.showToast(SleipnirI18n.t('admin.events.nameRequired', 'Vinsamlegast fylltu \u00FAt heiti vi\u00F0bur\u00F0ar'), 'error');
            return null;
        }

        var date = form.querySelector('[name="date"]').value;
        if (!date) {
            AdminApp.showToast(SleipnirI18n.t('admin.events.dateRequired', 'Vinsamlegast veldu dagsetningu'), 'error');
            return null;
        }

        var location = form.querySelector('[name="location"]').value.trim();
        if (!location) {
            AdminApp.showToast(SleipnirI18n.t('admin.events.locationRequired', 'Vinsamlegast sl\u00E1\u00F0u inn sta\u00F0setningu'), 'error');
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

    // =============================================
    // TAB SETUP
    // =============================================

    function setupTabs() {
        var tabBtns = document.querySelectorAll('#page-events .toolbar-tabs [data-tab]');
        if (!tabBtns.length) return;

        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].addEventListener('click', function() {
                var allBtns = document.querySelectorAll('#page-events .toolbar-tabs [data-tab]');
                for (var j = 0; j < allBtns.length; j++) {
                    allBtns[j].classList.remove('active');
                }
                this.classList.add('active');
                currentTab = this.dataset.tab;
                renderEvents();
            });
        }
    }

    // =============================================
    // PUBLIC API
    // =============================================

    window.EventsModule = {

        // --- Add Event ---
        addEvent: function() {
            var bodyHTML = getEventFormHTML(null);
            var footerHTML = '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cancel', 'H\u00E6tta vi\u00F0')) +
                '</button>' +
                '<button class="btn btn-primary" onclick="EventsModule.saveNew()">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.events.add', 'B\u00E6ta vi\u00F0')) +
                '</button>';

            AdminApp.openModal(SleipnirI18n.t('admin.events.newEvent', 'N\u00FDr vi\u00F0bur\u00F0ur'), bodyHTML, footerHTML);
        },

        saveNew: function() {
            var data = collectEventFormData();
            if (!data) return;

            data.attendees = 0;
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();

            AdminApp.db.collection('events').add(data)
                .then(function() {
                    AdminApp.closeModal();
                    AdminApp.showToast(SleipnirI18n.t('admin.events.addSuccess', 'Vi\u00F0bur\u00F0i b\u00E6tt vi\u00F0'), 'success');
                    AdminApp.logActivity('event_added', data.nameIs + ' / ' + data.nameEn);
                    loadEvents();
                })
                .catch(function(error) {
                    console.error('Error adding event:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.events.addError', 'Villa vi\u00F0 a\u00F0 b\u00E6ta vi\u00F0 vi\u00F0bur\u00F0'), 'error');
                });
        },

        // --- Edit Event ---
        editEvent: function(id) {
            var evt = null;
            for (var i = 0; i < events.length; i++) {
                if (events[i].id === id) { evt = events[i]; break; }
            }
            if (!evt) return;

            var bodyHTML = getEventFormHTML(evt);
            var footerHTML = '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cancel', 'H\u00E6tta vi\u00F0')) +
                '</button>' +
                '<button class="btn btn-primary" onclick="EventsModule.saveEdit(\'' + AdminApp.escapeAttr(id) + '\')">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.events.saveChanges', 'Vista breytingar')) +
                '</button>';

            AdminApp.openModal(SleipnirI18n.t('admin.events.editEvent', 'Breyta vi\u00F0bur\u00F0i'), bodyHTML, footerHTML);
        },

        saveEdit: function(id) {
            var data = collectEventFormData();
            if (!data) return;

            // Preserve attendees from the original event
            var originalEvt = null;
            for (var i = 0; i < events.length; i++) {
                if (events[i].id === id) { originalEvt = events[i]; break; }
            }
            if (originalEvt && typeof originalEvt.attendees === 'number') {
                data.attendees = originalEvt.attendees;
            }

            AdminApp.db.collection('events').doc(id).update(data)
                .then(function() {
                    AdminApp.closeModal();
                    AdminApp.showToast(SleipnirI18n.t('admin.events.editSuccess', 'Vi\u00F0bur\u00F0ur uppf\u00E6r\u00F0ur'), 'success');
                    AdminApp.logActivity('event_updated', data.nameIs + ' / ' + data.nameEn);
                    loadEvents();
                })
                .catch(function(error) {
                    console.error('Error updating event:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.events.editError', 'Villa vi\u00F0 a\u00F0 uppf\u00E6ra vi\u00F0bur\u00F0'), 'error');
                });
        },

        // --- Delete Event ---
        deleteEvent: function(id) {
            var evt = null;
            for (var i = 0; i < events.length; i++) {
                if (events[i].id === id) { evt = events[i]; break; }
            }
            if (!evt) return;

            AdminApp.openModal(
                SleipnirI18n.t('admin.events.deleteTitle', 'Ey\u00F0a vi\u00F0bur\u00F0i'),
                '<p style="color:#b3b2b2;font-size:1.1rem;">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.deleteConfirm', 'Ertu viss um a\u00F0 \u00FE\u00FA viljir ey\u00F0a')) + ' <strong>' + AdminApp.escapeHTML(evt.nameIs) + '</strong>?</p>' +
                '<p style="color:#888;margin-top:8px;">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cannotUndo', '\u00DEessa a\u00F0ger\u00F0 er ekki h\u00E6gt a\u00F0 afturkalla.')) + '</p>',
                '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cancel', 'H\u00E6tta vi\u00F0')) + '</button>' +
                '<button class="btn btn-danger" onclick="EventsModule.confirmDelete(\'' + AdminApp.escapeAttr(id) + '\')">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.events.delete', 'Ey\u00F0a')) + '</button>'
            );
        },

        confirmDelete: function(id) {
            var evt = null;
            for (var i = 0; i < events.length; i++) {
                if (events[i].id === id) { evt = events[i]; break; }
            }

            AdminApp.db.collection('events').doc(id).delete()
                .then(function() {
                    AdminApp.closeModal();
                    AdminApp.showToast(SleipnirI18n.t('admin.events.deleteSuccess', 'Vi\u00F0bur\u00F0i eytt'), 'success');
                    AdminApp.logActivity('event_deleted', evt ? (evt.nameIs + ' / ' + evt.nameEn) : id);
                    loadEvents();
                })
                .catch(function(error) {
                    console.error('Error deleting event:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.events.deleteError', 'Villa vi\u00F0 a\u00F0 ey\u00F0a vi\u00F0bur\u00F0i'), 'error');
                });
        }
    };

    // =============================================
    // SECTION EVENTS
    // =============================================

    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section !== 'events') return;

        setupTabs();

        var addBtn = document.getElementById('addEventBtn');
        var catFilter = document.getElementById('eventCategoryFilter');

        if (addBtn) addBtn.addEventListener('click', EventsModule.addEvent);
        if (catFilter) catFilter.addEventListener('change', renderEvents);

        loadEvents();
    });

    document.addEventListener('sectionShow', function(e) {
        if (e.detail.section !== 'events') return;
        renderEvents();
    });

})();
