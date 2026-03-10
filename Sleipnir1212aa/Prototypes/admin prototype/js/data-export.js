(function() {
    'use strict';

    var currentTab = 'orders';
    var sortColumn = null;
    var sortDirection = 'asc';

    var tabColumns = {
        orders: [
            { key: 'id', label: 'ID', visible: true },
            { key: 'createdAt', label: 'Dagsetning', visible: true },
            { key: 'userName', label: 'Viðskiptavinur', visible: true },
            { key: 'userEmail', label: 'Netfang', visible: true },
            { key: 'items', label: 'Vörur', visible: true },
            { key: 'totalAmount', label: 'Samtals', visible: true },
            { key: 'status', label: 'Staða', visible: true }
        ],
        users: [
            { key: 'displayName', label: 'Nafn', visible: true },
            { key: 'email', label: 'Netfang', visible: true },
            { key: 'role', label: 'Hlutverk', visible: true },
            { key: 'members', label: 'Meðlimur', visible: true },
            { key: 'createdAt', label: 'Skráður', visible: true },
            { key: 'lastLogin', label: 'Síðasta innskráning', visible: true }
        ],
        members: [
            { key: 'name', label: 'Nafn', visible: true },
            { key: 'role', label: 'Hlutverk', visible: true },
            { key: 'motorcycle', label: 'Hjól', visible: true },
            { key: 'chapter', label: 'Deild', visible: true },
            { key: 'joinDate', label: 'Gekk í klúbb', visible: true },
            { key: 'email', label: 'Netfang', visible: true }
        ],
        products: [
            { key: 'nameIs', label: 'Heiti (IS)', visible: true },
            { key: 'nameEn', label: 'Name (EN)', visible: true },
            { key: 'category', label: 'Flokkur', visible: true },
            { key: 'price', label: 'Verð', visible: true },
            { key: 'availableSizes', label: 'Stærðir', visible: true },
            { key: 'membersOnly', label: 'Meðlimir eingöngu', visible: true }
        ]
    };

    var categoryLabels = {
        tshirt: 'Bolur', hoodie: 'Hettupeysа', jacket: 'Jakki', jeans: 'Buxur', other: 'Annað'
    };

    var statusLabels = {
        pending: 'Í bið', processing: 'Í vinnslu', completed: 'Kláruð', cancelled: 'Afturkölluð'
    };

    function getColumns() {
        return tabColumns[currentTab] || [];
    }

    function getVisibleColumns() {
        return getColumns().filter(function(c) { return c.visible; });
    }

    function getData() {
        var data;
        switch (currentTab) {
            case 'orders':
                data = window.MOCK_DATA.orders.slice();
                // Apply date range filter
                var startDate = document.getElementById('exportDateStart');
                var endDate = document.getElementById('exportDateEnd');
                if (startDate && startDate.value) {
                    var start = startDate.value;
                    data = data.filter(function(o) { return o.createdAt >= start; });
                }
                if (endDate && endDate.value) {
                    var end = endDate.value;
                    data = data.filter(function(o) { return o.createdAt <= end; });
                }
                break;
            case 'users':
                data = window.MOCK_DATA.users.slice();
                break;
            case 'members':
                data = window.MOCK_DATA.members.slice();
                break;
            case 'products':
                data = window.MOCK_DATA.products.slice();
                break;
            default:
                data = [];
        }

        // Sort
        if (sortColumn) {
            data.sort(function(a, b) {
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
        }

        return data;
    }

    function getCellRawValue(row, key) {
        switch (currentTab) {
            case 'orders':
                if (key === 'items') {
                    return row.items.map(function(i) { return i.productName + ' (' + i.size + ') x' + i.quantity; }).join(', ');
                }
                if (key === 'totalAmount') return row.totalAmount;
                return row[key] || '';

            case 'users':
                if (key === 'members') return row.members ? 'Já' : 'Nei';
                return row[key] || '';

            case 'members':
                if (key === 'motorcycle') {
                    var m = row.motorcycle;
                    return m ? m.year + ' ' + m.make + ' ' + m.model : '';
                }
                return row[key] || '';

            case 'products':
                if (key === 'availableSizes') return row.availableSizes.join(', ');
                if (key === 'membersOnly') return row.membersOnly ? 'Já' : 'Nei';
                if (key === 'price') return row.price;
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
                if (key === 'createdAt') return AdminApp.formatDate(raw);
                if (key === 'status') return statusLabels[raw] || raw;
                return escapeHTML(String(raw));

            case 'users':
                if (key === 'createdAt' || key === 'lastLogin') return AdminApp.formatDate(raw);
                return escapeHTML(String(raw));

            case 'members':
                if (key === 'joinDate') return AdminApp.formatDate(raw);
                return escapeHTML(String(raw));

            case 'products':
                if (key === 'category') return categoryLabels[raw] || raw;
                if (key === 'price') return AdminApp.formatPrice(raw);
                return escapeHTML(String(raw));

            default:
                return escapeHTML(String(raw));
        }
    }

    function getCellCsvValue(row, key) {
        var raw = getCellRawValue(row, key);

        switch (currentTab) {
            case 'orders':
                if (key === 'status') return statusLabels[raw] || raw;
                return String(raw);

            case 'products':
                if (key === 'category') return categoryLabels[raw] || raw;
                return String(raw);

            default:
                return String(raw);
        }
    }

    function renderFilters() {
        var container = document.getElementById('exportFilters');
        if (!container) return;

        var filtersHTML = '';

        // Date range filter (for orders only)
        if (currentTab === 'orders') {
            filtersHTML += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">' +
                '<label style="color:#b3b2b2;font-size:0.85rem;white-space:nowrap;">Frá:</label>' +
                '<input type="date" id="exportDateStart" class="form-input" style="max-width:160px;" onchange="ExportModule.refresh()">' +
                '<label style="color:#b3b2b2;font-size:0.85rem;white-space:nowrap;">Til:</label>' +
                '<input type="date" id="exportDateEnd" class="form-input" style="max-width:160px;" onchange="ExportModule.refresh()">' +
            '</div>';
        }

        // Column visibility checkboxes
        var cols = getColumns();
        filtersHTML += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
            '<span style="color:#888;font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin-right:4px;align-self:center;">Dálkar:</span>';
        cols.forEach(function(col, idx) {
            filtersHTML += '<label style="display:inline-flex;align-items:center;gap:4px;color:#b3b2b2;font-size:0.85rem;cursor:pointer;">' +
                '<input type="checkbox" ' + (col.visible ? 'checked' : '') +
                ' onchange="ExportModule.toggleColumn(\'' + currentTab + '\',' + idx + ',this.checked)">' +
                ' ' + col.label +
            '</label>';
        });
        filtersHTML += '</div>';

        container.innerHTML = filtersHTML;
    }

    function renderTable() {
        var visibleCols = getVisibleColumns();
        var data = getData();

        // Render thead
        var headHTML = '<tr>';
        visibleCols.forEach(function(col) {
            var sortIndicator = '';
            if (sortColumn === col.key) {
                sortIndicator = sortDirection === 'asc' ? ' \u25B2' : ' \u25BC';
            }
            headHTML += '<th onclick="ExportModule.sortBy(\'' + col.key + '\')" style="cursor:pointer;user-select:none;white-space:nowrap;">' +
                col.label + sortIndicator +
            '</th>';
        });
        headHTML += '</tr>';
        document.getElementById('exportTableHead').innerHTML = headHTML;

        // Render tbody
        if (data.length === 0) {
            document.getElementById('exportTableBody').innerHTML =
                '<tr><td colspan="' + visibleCols.length + '" style="text-align:center;padding:40px;color:#888;">Engin gögn fundust</td></tr>';
            return;
        }

        var bodyHTML = '';
        data.forEach(function(row) {
            bodyHTML += '<tr>';
            visibleCols.forEach(function(col) {
                bodyHTML += '<td>' + getCellDisplayValue(row, col.key) + '</td>';
            });
            bodyHTML += '</tr>';
        });
        document.getElementById('exportTableBody').innerHTML = bodyHTML;
    }

    function setupTabs() {
        var tabBtns = document.querySelectorAll('#page-export .toolbar-tabs [data-tab]');
        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                tabBtns.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                currentTab = this.dataset.tab;
                sortColumn = null;
                sortDirection = 'asc';
                renderFilters();
                renderTable();
            });
        });
    }

    function csvEscape(val) {
        var str = String(val);
        if (str.indexOf('"') !== -1 || str.indexOf(',') !== -1 || str.indexOf('\n') !== -1) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function generateCSV() {
        var visibleCols = getVisibleColumns();
        var data = getData();

        // Header row
        var lines = [];
        lines.push(visibleCols.map(function(c) { return csvEscape(c.label); }).join(','));

        // Data rows
        data.forEach(function(row) {
            var rowValues = visibleCols.map(function(col) {
                return csvEscape(getCellCsvValue(row, col.key));
            });
            lines.push(rowValues.join(','));
        });

        return lines.join('\n');
    }

    function downloadCSV() {
        var csv = generateCSV();
        var BOM = '\uFEFF'; // UTF-8 BOM for proper Icelandic character handling
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

        AdminApp.showToast('CSV skrá sótt: ' + filename, 'success');
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Public API
    window.ExportModule = {
        refresh: function() {
            renderTable();
        },

        sortBy: function(key) {
            if (sortColumn === key) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = key;
                sortDirection = 'asc';
            }
            renderTable();
        },

        toggleColumn: function(tab, colIdx, visible) {
            if (tabColumns[tab] && tabColumns[tab][colIdx] !== undefined) {
                tabColumns[tab][colIdx].visible = visible;
                renderTable();
            }
        },

        exportCSV: function() {
            downloadCSV();
        }
    };

    // Initialize
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'export') {
            setupTabs();
            renderFilters();
            renderTable();
            document.getElementById('exportCsvBtn').addEventListener('click', ExportModule.exportCSV);
        }
    });

})();
