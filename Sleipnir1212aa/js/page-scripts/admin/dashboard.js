(function() {
    'use strict';

    if (!document.getElementById('page-dashboard')) return;

    // =============================================
    // DASHBOARD MODULE — Firebase-backed stats & outstanding orders
    // =============================================

    var outstandingOrders = [];

    // =============================================
    // STAT CARDS
    // =============================================

    function loadStatCards() {
        try {
            Promise.all([
                AdminApp.db.collection('displayMembers').get(),
                AdminApp.db.collection('users').get(),
                AdminApp.db.collection('orders').get()
            ]).then(function(results) {
                var membersSnap = results[0];
                var usersSnap = results[1];
                var ordersSnap = results[2];

                var activeOrders = 0;
                ordersSnap.docs.forEach(function(doc) {
                    var status = doc.data().status;
                    if (status === 'pending' || status === 'processing' || status === 'paid') {
                        activeOrders++;
                    }
                });

                var stats = [
                    {
                        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
                        value: membersSnap.size,
                        label: SleipnirI18n.t('admin.dashboard.members', 'Me\u00F0limir'),
                        section: 'members'
                    },
                    {
                        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2"/><circle cx="12" cy="7" r="4"/></svg>',
                        value: usersSnap.size,
                        label: SleipnirI18n.t('admin.dashboard.users', 'Notendur'),
                        section: 'users'
                    },
                    {
                        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
                        value: activeOrders,
                        label: SleipnirI18n.t('admin.dashboard.activeOrders', 'Virkar pantanir'),
                        section: 'orders'
                    }
                ];

                renderStatCards(stats);
            }).catch(function(err) {
                console.error('Error loading dashboard stats:', err);
                AdminApp.showToast('Villa vi\u00F0 a\u00F0 hla\u00F0a t\u00F6lum', 'error');
            });
        } catch (err) {
            console.error('Error initiating dashboard stats:', err);
        }
    }

    function renderStatCards(stats) {
        var container = document.getElementById('statCards');
        if (!container) return;

        var html = '';
        stats.forEach(function(stat) {
            html += '<div class="stat-card stat-card--clickable" data-navigate="' + AdminApp.escapeAttr(stat.section) + '">' +
                '<div class="stat-card-icon">' + stat.icon + '</div>' +
                '<div class="stat-card-body">' +
                    '<div class="stat-card-value">' + stat.value + '</div>' +
                    '<div class="stat-card-label">' + AdminApp.escapeHTML(stat.label) + '</div>' +
                '</div>' +
            '</div>';
        });
        container.innerHTML = html;

        // Bind click handlers for navigation
        var cards = container.querySelectorAll('.stat-card--clickable');
        for (var i = 0; i < cards.length; i++) {
            cards[i].addEventListener('click', function() {
                var section = this.dataset.navigate;
                if (section && AdminApp.switchSection) {
                    AdminApp.switchSection(section);
                }
            });
        }
    }

    // =============================================
    // OUTSTANDING ORDERS TABLE
    // =============================================

    function loadOutstandingOrders() {
        var tbody = document.getElementById('outstandingTableBody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Hle\u00F0...'  + '</td></tr>';

        try {
            AdminApp.db.collection('orders')
                .orderBy('createdAt', 'desc')
                .get()
                .then(function(snapshot) {
                    outstandingOrders = [];

                    snapshot.docs.forEach(function(doc) {
                        var data = doc.data();
                        var status = data.status || '';
                        if (status !== 'completed' && status !== 'cancelled') {
                            data._id = doc.id;
                            outstandingOrders.push(data);
                        }
                    });

                    renderOutstandingTable();
                })
                .catch(function(err) {
                    console.error('Error loading outstanding orders:', err);
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f44336;">Villa vi\u00F0 a\u00F0 hla\u00F0a p\u00F6ntunum</td></tr>';
                });
        } catch (err) {
            console.error('Error initiating orders query:', err);
        }
    }

    function renderOutstandingTable() {
        var tbody = document.getElementById('outstandingTableBody');
        if (!tbody) return;

        if (outstandingOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">' +
                SleipnirI18n.t('admin.dashboard.noOutstanding', 'Engar \u00F3afgreiddar pantanir') +
                '</td></tr>';
            return;
        }

        var html = '';
        outstandingOrders.forEach(function(order) {
            var orderId = order._id ? order._id.slice(-6).toUpperCase() : '\u2014';

            var customerName = order.userName || order.customerName || order.displayName || '\u2014';

            var itemsList = '\u2014';
            if (order.items && order.items.length > 0) {
                itemsList = order.items.map(function(item) {
                    var name = item.productName || item.name || 'V\u00F6ra';
                    return AdminApp.escapeHTML(name) + (item.quantity > 1 ? ' \u00D7' + item.quantity : '');
                }).join(', ');
            }

            var amount = AdminApp.formatPrice(order.totalAmount || order.total || 0);
            var date = AdminApp.formatFirestoreDate(order.createdAt);

            html += '<tr>' +
                '<td style="font-family:monospace;font-weight:600;">' + AdminApp.escapeHTML(orderId) + '</td>' +
                '<td>' + AdminApp.escapeHTML(customerName) + '</td>' +
                '<td>' + itemsList + '</td>' +
                '<td style="font-weight:600;white-space:nowrap;">' + amount + '</td>' +
                '<td style="white-space:nowrap;">' + date + '</td>' +
            '</tr>';
        });

        tbody.innerHTML = html;
    }

    // =============================================
    // EXCEL EXPORT (Outstanding Orders)
    // =============================================

    function bindExportButton() {
        var btn = document.getElementById('exportOutstandingBtn');
        if (!btn) return;

        btn.addEventListener('click', function() {
            if (outstandingOrders.length === 0) {
                AdminApp.showToast('Engar pantanir til a\u00F0 flytja \u00FAt', 'info');
                return;
            }

            var BRAND = {
                mcRed: 'FFCF2342',
                black: 'FF000000',
                norseBlack: 'FF1A1A1A',
                white: 'FFFFFFFF',
                offWhite: 'FFB3B2B2',
                border: 'FF333333'
            };

            var workbook = new ExcelJS.Workbook();
            workbook.creator = 'Sleipnir MC';
            var worksheet = workbook.addWorksheet('\u00D3afgreiddar pantanir', {
                properties: { tabColor: { argb: BRAND.mcRed } }
            });

            // Header row
            var headers = ['P\u00F6ntun', 'Vi\u00F0skiptavinur', 'V\u00F6rur', 'Upph\u00E6\u00F0', 'Dagsetning'];
            worksheet.addRow(headers);

            // Data rows
            outstandingOrders.forEach(function(order) {
                var orderId = order._id ? order._id.slice(-6).toUpperCase() : '';
                var customerName = order.userName || order.customerName || order.displayName || '';
                var items = '';
                if (order.items && order.items.length > 0) {
                    items = order.items.map(function(item) {
                        var name = item.productName || item.name || '';
                        return name + (item.quantity > 1 ? ' x' + item.quantity : '');
                    }).join('; ');
                }
                var amount = order.totalAmount || order.total || 0;
                var date = AdminApp.formatFirestoreDate(order.createdAt);
                worksheet.addRow([orderId, customerName, items, amount, date]);
            });

            // Column widths
            worksheet.getColumn(1).width = 14;
            worksheet.getColumn(2).width = 24;
            worksheet.getColumn(3).width = 36;
            worksheet.getColumn(4).width = 16;
            worksheet.getColumn(4).numFmt = '#,##0 "kr."';
            worksheet.getColumn(4).alignment = { horizontal: 'right', vertical: 'middle' };
            worksheet.getColumn(5).width = 18;

            // Header styling
            var headerRow = worksheet.getRow(1);
            headerRow.height = 28;
            headerRow.eachCell(function(cell) {
                cell.font = { bold: true, size: 11, color: { argb: BRAND.white } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.mcRed } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { bottom: { style: 'medium', color: { argb: BRAND.mcRed } } };
            });

            // Data row styling
            for (var r = 2; r <= outstandingOrders.length + 1; r++) {
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

            worksheet.views = [{ state: 'frozen', ySplit: 1 }];

            var filename = 'oafgreiddar_pantanir_' + new Date().toISOString().slice(0, 10) + '.xlsx';

            workbook.xlsx.writeBuffer().then(function(buffer) {
                var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                link.click();
                URL.revokeObjectURL(link.href);

                AdminApp.showToast(SleipnirI18n.t('admin.dashboard.excelExported', 'Excel skr\u00E1 s\u00F3tt'), 'success');
            }).catch(function(err) {
                console.error('Error exporting Excel:', err);
                AdminApp.showToast('Villa vi\u00F0 a\u00F0 flytja \u00FAt Excel', 'error');
            });
        });
    }

    // =============================================
    // INITIALIZATION
    // =============================================

    function initDashboard() {
        loadStatCards();
        loadOutstandingOrders();
        bindExportButton();
    }

    // Listen for section events
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'dashboard') {
            initDashboard();
        }
    });

    document.addEventListener('sectionShow', function(e) {
        if (e.detail.section === 'dashboard') {
            // Refresh stats each time dashboard is shown
            loadStatCards();
            loadOutstandingOrders();
        }
    });

    // Self-init: dashboard may already be active before this script loads
    var dashboardPage = document.getElementById('page-dashboard');
    if (dashboardPage && dashboardPage.classList.contains('active')) {
        initDashboard();
    }

})();
