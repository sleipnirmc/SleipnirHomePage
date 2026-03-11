(function() {
    'use strict';

    function renderDashboard() {
        renderStatCards();
        renderOutstandingTable();
        bindExportButton();
    }

    function renderStatCards() {
        var data = window.MOCK_DATA;
        var pendingOrders = data.orders.filter(function(o) { return o.status === 'pending' || o.status === 'processing'; });

        var stats = [
            {
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
                value: data.members.length,
                label: 'Meðlimir',
                section: 'members'
            },
            {
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2"/><circle cx="12" cy="7" r="4"/></svg>',
                value: data.users.length,
                label: 'Notendur',
                section: 'users'
            },
            {
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
                value: pendingOrders.length,
                label: 'Virkar pantanir',
                section: 'orders'
            }
        ];

        var html = '';
        stats.forEach(function(stat) {
            html += '<div class="stat-card stat-card--clickable" data-navigate="' + stat.section + '">' +
                '<div class="stat-card-icon">' + stat.icon + '</div>' +
                '<div class="stat-card-body">' +
                    '<div class="stat-card-value">' + stat.value + '</div>' +
                    '<div class="stat-card-label">' + stat.label + '</div>' +
                '</div>' +
            '</div>';
        });
        document.getElementById('statCards').innerHTML = html;

        // Bind click handlers
        document.querySelectorAll('.stat-card--clickable').forEach(function(card) {
            card.addEventListener('click', function() {
                var section = this.dataset.navigate;
                if (section && window.AdminApp.switchSection) {
                    window.AdminApp.switchSection(section);
                }
            });
        });
    }

    function renderOutstandingTable() {
        var orders = window.MOCK_DATA.orders.filter(function(o) {
            return o.status !== 'completed' && o.status !== 'cancelled';
        }).sort(function(a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        var html = '';
        orders.forEach(function(order) {
            var items = order.items.map(function(i) {
                return i.productName + (i.quantity > 1 ? ' ×' + i.quantity : '');
            }).join(', ');

            html += '<tr>' +
                '<td>' + order.id.toUpperCase() + '</td>' +
                '<td>' + order.userName + '</td>' +
                '<td>' + items + '</td>' +
                '<td>' + AdminApp.formatPrice(order.totalAmount) + '</td>' +
                '<td>' + AdminApp.formatDate(order.createdAt) + '</td>' +
            '</tr>';
        });

        document.getElementById('outstandingTableBody').innerHTML = html;
    }

    function bindExportButton() {
        var btn = document.getElementById('exportOutstandingBtn');
        if (!btn) return;

        btn.addEventListener('click', function() {
            var orders = window.MOCK_DATA.orders.filter(function(o) {
                return o.status !== 'completed' && o.status !== 'cancelled';
            });

            var csv = 'Pöntun,Viðskiptavinur,Netfang,Vörur,Upphæð,Dagsetning\n';
            orders.forEach(function(order) {
                var items = order.items.map(function(i) {
                    return i.productName + (i.quantity > 1 ? ' x' + i.quantity : '');
                }).join('; ');
                csv += order.id.toUpperCase() + ',' +
                    '"' + order.userName + '",' +
                    order.userEmail + ',' +
                    '"' + items + '",' +
                    order.totalAmount + ',' +
                    order.createdAt + '\n';
            });

            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'oafgreiddar_pantanir.csv';
            link.click();
            URL.revokeObjectURL(link.href);

            AdminApp.showToast('CSV skrá sótt', 'success');
        });
    }

    // Listen for section events
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'dashboard') {
            renderDashboard();
        }
    });

    // Self-init: dashboard is already active before this script loads
    if (document.getElementById('page-dashboard').classList.contains('active')) {
        renderDashboard();
    }

})();
