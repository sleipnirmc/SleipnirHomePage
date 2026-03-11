(function() {
    'use strict';

    // =============================================
    // DATA EXPORT MODULE — Firestore-backed export with sorting & CSV
    // Depends on: window.AdminApp, firebase, sleipnirAuth
    // =============================================

    var currentTab = 'orders';
    var sortColumn = null;
    var sortDirection = 'asc';
    var dataCache = {};

    var tabColumns = {
        orders: [
            { key: 'id', label: 'ID', visible: true },
            { key: 'createdAt', label: 'Dagsetning', visible: true },
            { key: 'userName', label: 'Vi\u00F0skiptavinur', visible: true },
            { key: 'userEmail', label: 'Netfang', visible: true },
            { key: 'items', label: 'V\u00F6rur', visible: true },
            { key: 'totalAmount', label: 'Samtals', visible: true },
            { key: 'status', label: 'Sta\u00F0a', visible: true }
        ],
        users: [
            { key: 'displayName', label: 'Nafn', visible: true },
            { key: 'email', label: 'Netfang', visible: true },
            { key: 'role', label: 'Hlutverk', visible: true },
            { key: 'members', label: 'Me\u00F0limur', visible: true },
            { key: 'createdAt', label: 'Skr\u00E1\u00F0ur', visible: true },
            { key: 'lastLogin', label: 'S\u00ED\u00F0asta innskr\u00E1ning', visible: true }
        ],
        members: [
            { key: 'name', label: 'Nafn', visible: true },
            { key: 'role', label: 'Hlutverk', visible: true },
            { key: 'motorcycle', label: 'Hj\u00F3l', visible: true },
            { key: 'chapter', label: 'Deild', visible: true },
            { key: 'joinDate', label: 'Gekk \u00ED kl\u00FAbb', visible: true },
            { key: 'email', label: 'Netfang', visible: true }
        ],
        products: [
            { key: 'nameIs', label: 'Heiti (IS)', visible: true },
            { key: 'nameEn', label: 'Name (EN)', visible: true },
            { key: 'category', label: 'Flokkur', visible: true },
            { key: 'price', label: 'Ver\u00F0', visible: true },
            { key: 'availableSizes', label: 'St\u00E6r\u00F0ir', visible: true },
            { key: 'membersOnly', label: 'Me\u00F0limir eingöngu', visible: true }
        ]
    };

    var categoryLabels = {
        tshirt: 'Bolir', hoodie: 'Hettupeysa', jacket: 'Jakkar', jeans: 'Buxur', other: 'Anna\u00F0'
    };

    var statusLabels = {
        pending: '\u00CD bi\u00F0', processing: '\u00CD vinnslu', completed: 'Kl\u00E1ru\u00F0', cancelled: 'Afturk\u00F6llu\u00F0'
    };

    // =============================================
    // DATA FETCHING
    // =============================================

    function fetchTabData(tab) {
        // Return cached data if available
        if (dataCache[tab]) {
            return Promise.resolve(dataCache[tab]);
        }

        switch (tab) {
            case 'orders':
                return AdminApp.db.collection('orders').get()
                    .then(function(snap) {
                        var data = snap.docs.map(function(d) {
                            var obj = d.data();
                            obj.id = d.id;
                            return obj;
                        });
                        dataCache[tab] = data;
                        return data;
                    });

            case 'users':
                if (typeof sleipnirAuth !== 'undefined' && sleipnirAuth.getAllUsers) {
                    return sleipnirAuth.getAllUsers()
                        .then(function(data) {
                            dataCache[tab] = data;
                            return data;
                        });
                }
                // Fallback: read users collection directly
                return AdminApp.db.collection('users').get()
                    .then(function(snap) {
                        var data = snap.docs.map(function(d) {
                            var obj = d.data();
                            obj.id = d.id;
                            return obj;
                        });
                        dataCache[tab] = data;
                        return data;
                    });

            case 'members':
                return AdminApp.db.collection('displayMembers').get()
                    .then(function(snap) {
                        var data = snap.docs.map(function(d) {
                            var obj = d.data();
                            obj.id = d.id;
                            return obj;
                        });
                        dataCache[tab] = data;
                        return data;
                    });

            case 'products':
                return AdminApp.db.collection('products').get()
                    .then(function(snap) {
                        var data = snap.docs.map(function(d) {
                            var obj = d.data();
                            obj.id = d.id;
                            return obj;
                        });
                        dataCache[tab] = data;
                        return data;
                    });

            default:
                return Promise.resolve([]);
        }
    }

    // =============================================
    // COLUMN HELPERS
    // =============================================

    function getColumns() {
        return tabColumns[currentTab] || [];
    }

    function getVisibleColumns() {
        return getColumns().filter(function(c) { return c.visible; });
    }

    // =============================================
    // CELL VALUE EXTRACTION
    // =============================================

    function formatFirestoreValue(val) {
        if (!val) return '';
        if (val && typeof val.toDate === 'function') {
            return val.toDate().toISOString();
        }
        return String(val);
    }

    function getCellRawValue(row, key) {
        switch (currentTab) {
            case 'orders':
                if (key === 'items') {
                    var items = row.items || [];
                    return items.map(function(i) {
                        return (i.productName || '') + ' (' + (i.size || '') + ') x' + (i.quantity || 1);
                    }).join(', ');
                }
                if (key === 'totalAmount') return row.totalAmount || 0;
                if (key === 'createdAt') return formatFirestoreValue(row.createdAt);
                if (key === 'status') return row.status || '';
                return row[key] || '';

            case 'users':
                if (key === 'members') return row.members ? 'J\u00E1' : 'Nei';
                if (key === 'createdAt' || key === 'lastLogin') return formatFirestoreValue(row[key]);
                return row[key] || '';

            case 'members':
                if (key === 'motorcycle') {
                    var m = row.motorcycle;
                    return m ? ((m.year || '') + ' ' + (m.make || '') + ' ' + (m.model || '')).trim() : '';
                }
                if (key === 'joinDate') return formatFirestoreValue(row.joinDate);
                return row[key] || '';

            case 'products':
                if (key === 'availableSizes') {
                    var sizes = row.availableSizes || [];
                    return sizes.join(', ');
                }
                if (key === 'membersOnly') return row.membersOnly ? 'J\u00E1' : 'Nei';
                if (key === 'price') return row.price || 0;
                return row[key] || '';

            default:
                return row[key] || '';
        }
    }

    function getCellDisplayValue(row, key) {
        var raw = getCellRawValue(row, key);

        switch (currentTab) {
            case 'orders':
                if (key === 'totalAmount') return AdminApp.formatPrice(raw);
                if (key === 'createdAt') return AdminApp.formatFirestoreDate(row.createdAt);
                if (key === 'status') return AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.status.' + raw, statusLabels[raw] || raw));
                return AdminApp.escapeHTML(String(raw));

            case 'users':
                if (key === 'createdAt' || key === 'lastLogin') return AdminApp.formatFirestoreDate(row[key]);
                return AdminApp.escapeHTML(String(raw));

            case 'members':
                if (key === 'joinDate') return AdminApp.formatFirestoreDate(row.joinDate);
                return AdminApp.escapeHTML(String(raw));

            case 'products':
                if (key === 'category') return AdminApp.escapeHTML(categoryLabels[raw] || raw);
                if (key === 'price') return AdminApp.formatPrice(raw);
                return AdminApp.escapeHTML(String(raw));

            default:
                return AdminApp.escapeHTML(String(raw));
        }
    }

    function getCellCsvValue(row, key) {
        var raw = getCellRawValue(row, key);

        switch (currentTab) {
            case 'orders':
                if (key === 'status') return statusLabels[raw] || raw;
                if (key === 'createdAt') return formatFirestoreValue(row.createdAt);
                return String(raw);

            case 'users':
                if (key === 'createdAt' || key === 'lastLogin') return formatFirestoreValue(row[key]);
                return String(raw);

            case 'members':
                if (key === 'joinDate') return formatFirestoreValue(row.joinDate);
                return String(raw);

            case 'products':
                if (key === 'category') return categoryLabels[raw] || raw;
                return String(raw);

            default:
                return String(raw);
        }
    }

    // =============================================
    // DATE FILTERING (orders only)
    // =============================================

    function applyDateFilter(data) {
        if (currentTab !== 'orders') return data;

        var startEl = document.getElementById('exportDateStart');
        var endEl = document.getElementById('exportDateEnd');
        var startDate = startEl ? startEl.value : '';
        var endDate = endEl ? endEl.value : '';

        if (!startDate && !endDate) return data;

        return data.filter(function(row) {
            var dateStr = formatFirestoreValue(row.createdAt);
            var dateOnly = dateStr.split('T')[0];
            if (startDate && dateOnly < startDate) return false;
            if (endDate && dateOnly > endDate) return false;
            return true;
        });
    }

    // =============================================
    // SORTING
    // =============================================

    function sortData(data) {
        if (!sortColumn) return data;

        var sorted = data.slice();
        sorted.sort(function(a, b) {
            var valA = getCellRawValue(a, sortColumn);
            var valB = getCellRawValue(b, sortColumn);
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            var strA = String(valA).toLowerCase();
            var strB = String(valB).toLowerCase();
            if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
            if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }

    // =============================================
    // RENDERING
    // =============================================

    function renderFilters() {
        var container = document.getElementById('exportFilters');
        if (!container) return;

        var filtersHTML = '';

        // Date range filter (for orders only)
        if (currentTab === 'orders') {
            filtersHTML += '<div class="export-date-range">' +
                '<label class="export-date-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.export.from', 'Fr\u00E1')) + ':</label>' +
                '<input type="date" id="exportDateStart" class="filter-input" onchange="ExportModule.refresh()">' +
                '<label class="export-date-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.export.to', 'Til')) + ':</label>' +
                '<input type="date" id="exportDateEnd" class="filter-input" onchange="ExportModule.refresh()">' +
            '</div>';
        }

        // Column visibility checkboxes
        var cols = getColumns();
        filtersHTML += '<div class="export-column-toggles">' +
            '<span class="export-column-label">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.export.columns', 'D\u00E1lkar')) + ':</span>';
        cols.forEach(function(col, idx) {
            filtersHTML += '<label class="export-col-checkbox' + (col.visible ? ' active' : '') + '">' +
                '<input type="checkbox" class="export-col-input" ' + (col.visible ? 'checked' : '') +
                ' onchange="ExportModule.toggleColumn(\'' + AdminApp.escapeAttr(currentTab) + '\',' + idx + ',this.checked)">' +
                '<span class="export-col-check">' +
                    '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</span>' +
                '<span class="export-col-text">' + AdminApp.escapeHTML(col.label) + '</span>' +
            '</label>';
        });
        filtersHTML += '</div>';

        container.innerHTML = filtersHTML;
    }

    function renderTable(data) {
        var visibleCols = getVisibleColumns();

        // Apply date filter and sort
        var filtered = applyDateFilter(data);
        var sorted = sortData(filtered);

        // Render thead
        var headHTML = '<tr>';
        visibleCols.forEach(function(col) {
            var sortIndicator = '';
            if (sortColumn === col.key) {
                sortIndicator = sortDirection === 'asc' ? ' \u25B2' : ' \u25BC';
            }
            headHTML += '<th onclick="ExportModule.sortBy(\'' + AdminApp.escapeAttr(col.key) + '\')" style="cursor:pointer;user-select:none;white-space:nowrap;">' +
                AdminApp.escapeHTML(col.label) + sortIndicator +
            '</th>';
        });
        headHTML += '</tr>';

        var theadEl = document.getElementById('exportTableHead');
        if (theadEl) theadEl.innerHTML = headHTML;

        // Render tbody
        var tbodyEl = document.getElementById('exportTableBody');
        if (!tbodyEl) return;

        if (sorted.length === 0) {
            tbodyEl.innerHTML = '<tr><td colspan="' + visibleCols.length + '" style="text-align:center;padding:40px;color:#888;">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.export.noData', 'Engin g\u00F6gn fundust')) +
            '</td></tr>';
            return;
        }

        var bodyHTML = '';
        sorted.forEach(function(row) {
            bodyHTML += '<tr>';
            visibleCols.forEach(function(col) {
                bodyHTML += '<td>' + getCellDisplayValue(row, col.key) + '</td>';
            });
            bodyHTML += '</tr>';
        });
        tbodyEl.innerHTML = bodyHTML;
    }

    function loadAndRenderTab() {
        var tableContainer = document.getElementById('exportTableBody');
        if (tableContainer && tableContainer.parentElement) {
            AdminApp.showLoading(tableContainer.parentElement.parentElement);
        }

        fetchTabData(currentTab)
            .then(function(data) {
                renderTable(data);
            })
            .catch(function(error) {
                console.error('Error fetching export data:', error);
                AdminApp.showToast(SleipnirI18n.t('admin.export.fetchError', 'Villa vi\u00F0 a\u00F0 s\u00E6kja g\u00F6gn'), 'error');
                var tbodyEl = document.getElementById('exportTableBody');
                if (tbodyEl) {
                    tbodyEl.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#888;">' +
                        AdminApp.escapeHTML(SleipnirI18n.t('admin.export.fetchError', 'Villa vi\u00F0 a\u00F0 s\u00E6kja g\u00F6gn')) +
                    '</td></tr>';
                }
            });
    }

    // =============================================
    // TAB SETUP
    // =============================================

    function setupTabs() {
        var tabBtns = document.querySelectorAll('#page-export .toolbar-tabs [data-tab]');
        if (!tabBtns.length) return;

        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].addEventListener('click', function() {
                var allBtns = document.querySelectorAll('#page-export .toolbar-tabs [data-tab]');
                for (var j = 0; j < allBtns.length; j++) {
                    allBtns[j].classList.remove('active');
                }
                this.classList.add('active');
                currentTab = this.dataset.tab;
                sortColumn = null;
                sortDirection = 'asc';
                renderFilters();
                loadAndRenderTab();
            });
        }
    }

    // =============================================
    // CSV EXPORT
    // =============================================

    function csvEscape(val) {
        var str = String(val);
        if (str.indexOf('"') !== -1 || str.indexOf(',') !== -1 || str.indexOf('\n') !== -1) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function downloadCSV() {
        fetchTabData(currentTab)
            .then(function(data) {
                var visibleCols = getVisibleColumns();
                var filtered = applyDateFilter(data);
                var sorted = sortData(filtered);

                // Header row
                var lines = [];
                lines.push(visibleCols.map(function(c) { return csvEscape(c.label); }).join(','));

                // Data rows
                sorted.forEach(function(row) {
                    var rowValues = visibleCols.map(function(col) {
                        return csvEscape(getCellCsvValue(row, col.key));
                    });
                    lines.push(rowValues.join(','));
                });

                var csv = lines.join('\n');
                var BOM = '\uFEFF'; // UTF-8 BOM for Icelandic character support
                var blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
                var url = URL.createObjectURL(blob);

                var tabNames = {
                    orders: 'pantanir',
                    users: 'notendur',
                    members: 'medlimir',
                    products: 'vorur'
                };
                var filename = 'sleipnir_' + (tabNames[currentTab] || currentTab) + '_' +
                    new Date().toISOString().split('T')[0] + '.csv';

                var link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setTimeout(function() { URL.revokeObjectURL(url); }, 100);

                AdminApp.showToast(SleipnirI18n.t('admin.export.csvSuccess', 'CSV skr\u00E1 s\u00F3tt') + ': ' + filename, 'success');
                AdminApp.logActivity('data_exported', 'CSV export: ' + currentTab + ' (' + sorted.length + ' rows)');
            })
            .catch(function(error) {
                console.error('Error exporting CSV:', error);
                AdminApp.showToast(SleipnirI18n.t('admin.export.csvError', 'Villa vi\u00F0 a\u00F0 flytja \u00FAt CSV'), 'error');
            });
    }

    // =============================================
    // PUBLIC API
    // =============================================

    window.ExportModule = {

        refresh: function() {
            loadAndRenderTab();
        },

        sortBy: function(key) {
            if (sortColumn === key) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = key;
                sortDirection = 'asc';
            }
            loadAndRenderTab();
        },

        toggleColumn: function(tab, colIdx, visible) {
            if (tabColumns[tab] && tabColumns[tab][colIdx] !== undefined) {
                tabColumns[tab][colIdx].visible = visible;
                renderFilters();
                loadAndRenderTab();
            }
        },

        exportCSV: function() {
            downloadCSV();
        }
    };

    // =============================================
    // SECTION EVENTS
    // =============================================

    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section !== 'export') return;

        // Clear cache on section init so data is fresh
        dataCache = {};

        setupTabs();
        renderFilters();
        loadAndRenderTab();

        var csvBtn = document.getElementById('exportCsvBtn');
        if (csvBtn) csvBtn.addEventListener('click', ExportModule.exportCSV);
    });

    document.addEventListener('sectionShow', function(e) {
        if (e.detail.section !== 'export') return;
        // Re-render with cached data
        loadAndRenderTab();
    });

})();
