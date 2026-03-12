(function() {
    'use strict';

    // =============================================
    // DATA EXPORT MODULE — Firestore-backed export with sorting & Excel
    // Depends on: window.AdminApp, firebase, sleipnirAuth, ExcelJS
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
        pending: '\u00CD bi\u00F0', processing: '\u00CD vinnslu', paid: 'Greitt', completed: 'Kl\u00E1ru\u00F0', cancelled: 'Afturk\u00F6llu\u00F0'
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

    function getCellExportValue(row, key) {
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
        var tbodyEl = document.getElementById('exportTableBody');
        var theadEl = document.getElementById('exportTableHead');
        if (tbodyEl) {
            tbodyEl.innerHTML = '<tr><td colspan="' + getVisibleColumns().length + '" style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></td></tr>';
        }
        if (theadEl) {
            theadEl.innerHTML = '';
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
    // EXCEL EXPORT (ExcelJS)
    // =============================================

    var BRAND = {
        mcRed: 'FFCF2342',
        black: 'FF000000',
        norseBlack: 'FF1A1A1A',
        white: 'FFFFFFFF',
        offWhite: 'FFB3B2B2',
        border: 'FF333333'
    };

    function applyExcelStyles(worksheet, visibleCols, rowCount) {
        var priceKeys = { totalAmount: true, price: true };

        // Column widths — estimate from header labels + some padding
        visibleCols.forEach(function(col, idx) {
            var colNum = idx + 1;
            var width = Math.max(col.label.length + 4, 14);
            if (col.key === 'items' || col.key === 'userEmail' || col.key === 'email') width = 36;
            if (col.key === 'id') width = 16;
            worksheet.getColumn(colNum).width = Math.min(width, 42);

            if (priceKeys[col.key]) {
                worksheet.getColumn(colNum).numFmt = '#,##0 "kr."';
                worksheet.getColumn(colNum).alignment = { horizontal: 'right', vertical: 'middle' };
            }
        });

        // Header row styling
        var headerRow = worksheet.getRow(1);
        headerRow.height = 28;
        headerRow.eachCell(function(cell) {
            cell.font = { bold: true, size: 11, color: { argb: BRAND.white } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.mcRed } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                bottom: { style: 'medium', color: { argb: BRAND.mcRed } }
            };
        });

        // Data row styling — alternating dark fills
        for (var r = 2; r <= rowCount + 1; r++) {
            var row = worksheet.getRow(r);
            var isEven = (r % 2 === 0);
            row.eachCell({ includeEmpty: true }, function(cell) {
                cell.font = { size: 10, color: { argb: BRAND.offWhite } };
                cell.fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: isEven ? BRAND.black : BRAND.norseBlack }
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: BRAND.border } },
                    bottom: { style: 'thin', color: { argb: BRAND.border } },
                    left: { style: 'thin', color: { argb: BRAND.border } },
                    right: { style: 'thin', color: { argb: BRAND.border } }
                };
                if (!cell.alignment || !cell.alignment.horizontal) {
                    cell.alignment = { vertical: 'middle' };
                }
            });
        }

        // Freeze header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    function downloadExcel() {
        fetchTabData(currentTab)
            .then(function(data) {
                var visibleCols = getVisibleColumns();
                var filtered = applyDateFilter(data);
                var sorted = sortData(filtered);

                var workbook = new ExcelJS.Workbook();
                workbook.creator = 'Sleipnir MC';

                var sheetNames = {
                    orders: 'Pantanir',
                    users: 'Notendur',
                    members: 'Me\u00F0limir',
                    products: 'V\u00F6rur'
                };
                var worksheet = workbook.addWorksheet(sheetNames[currentTab] || currentTab, {
                    properties: { tabColor: { argb: BRAND.mcRed } }
                });

                // Header row
                var headers = visibleCols.map(function(c) { return c.label; });
                worksheet.addRow(headers);

                // Data rows
                sorted.forEach(function(row) {
                    var values = visibleCols.map(function(col) {
                        var val = getCellExportValue(row, col.key);
                        // Keep numbers as numbers for price columns
                        if (col.key === 'totalAmount' || col.key === 'price') {
                            return Number(getCellRawValue(row, col.key)) || 0;
                        }
                        return val;
                    });
                    worksheet.addRow(values);
                });

                // Apply brand styling
                applyExcelStyles(worksheet, visibleCols, sorted.length);

                var tabFileNames = {
                    orders: 'pantanir',
                    users: 'notendur',
                    members: 'medlimir',
                    products: 'vorur'
                };
                var filename = 'sleipnir_' + (tabFileNames[currentTab] || currentTab) + '_' +
                    new Date().toISOString().split('T')[0] + '.xlsx';

                return workbook.xlsx.writeBuffer().then(function(buffer) {
                    var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    var url = URL.createObjectURL(blob);

                    var link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    setTimeout(function() { URL.revokeObjectURL(url); }, 100);

                    AdminApp.showToast(SleipnirI18n.t('admin.export.excelSuccess', 'Excel skr\u00E1 s\u00F3tt') + ': ' + filename, 'success');
                    AdminApp.logActivity('data_exported', 'Excel export: ' + currentTab + ' (' + sorted.length + ' rows)');
                });
            })
            .catch(function(error) {
                console.error('Error exporting Excel:', error);
                AdminApp.showToast(SleipnirI18n.t('admin.export.excelError', 'Villa vi\u00F0 a\u00F0 flytja \u00FAt Excel'), 'error');
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

        exportExcel: function() {
            downloadExcel();
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

        var excelBtn = document.getElementById('exportExcelBtn');
        if (excelBtn) {
            excelBtn.removeEventListener('click', ExportModule.exportExcel);
            excelBtn.addEventListener('click', ExportModule.exportExcel);
        }
    });

    document.addEventListener('sectionShow', function(e) {
        if (e.detail.section !== 'export') return;
        // Re-render with cached data
        loadAndRenderTab();
    });

})();
