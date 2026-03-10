(function() {
    'use strict';

    var currentTab = 'all';
    var expandedOrder = null;

    var statusLabels = {
        pending: 'Í bið',
        processing: 'Í vinnslu',
        completed: 'Kláruð',
        cancelled: 'Afturkölluð'
    };

    var statusClasses = {
        pending: 'badge--pending',
        processing: 'badge--processing',
        completed: 'badge--completed',
        cancelled: 'badge--cancelled'
    };

    function renderOrders() {
        var data = window.MOCK_DATA.orders;

        var filtered = data.filter(function(o) {
            return currentTab === 'all' || o.status === currentTab;
        });

        // Sort by date descending (newest first)
        filtered.sort(function(a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        var tbody = document.getElementById('ordersTableBody');

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#888;">Engar pantanir fundust</td></tr>';
            return;
        }

        var html = '';
        filtered.forEach(function(order) {
            var orderId = order.id.slice(-6).toUpperCase();
            var itemsStr = order.items.map(function(item) {
                return item.productName + ' (' + item.size + ') \u00D7' + item.quantity;
            }).join(', ');
            var isExpanded = expandedOrder === order.id;
            var canComplete = order.status === 'pending' || order.status === 'processing';

            html += '<tr class="order-row' + (isExpanded ? ' expanded' : '') + '" onclick="OrdersModule.toggleRow(\'' + order.id + '\')" style="cursor:pointer;">' +
                '<td style="font-family:\'Cinzel\',serif;font-weight:600;color:#cf2342;">#' + orderId + '</td>' +
                '<td>' + escapeHTML(order.userName) + '</td>' +
                '<td style="color:#aaa;font-size:0.9rem;">' + escapeHTML(order.userEmail) + '</td>' +
                '<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHTML(itemsStr) + '</td>' +
                '<td style="font-weight:600;white-space:nowrap;">' + AdminApp.formatPrice(order.totalAmount) + '</td>' +
                '<td style="white-space:nowrap;">' + AdminApp.formatDate(order.createdAt) + '</td>' +
                '<td><span class="badge ' + (statusClasses[order.status] || '') + '">' + (statusLabels[order.status] || order.status) + '</span></td>' +
                '<td style="white-space:nowrap;">' +
                    (canComplete
                        ? '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();OrdersModule.markComplete(\'' + order.id + '\')" style="font-size:0.75rem;">' +
                            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Klára' +
                          '</button>'
                        : '') +
                '</td>' +
            '</tr>';

            // Expanded detail row
            if (isExpanded) {
                html += '<tr class="order-detail-row">' +
                    '<td colspan="8" style="padding:16px 24px;background:rgba(255,255,255,0.02);border-top:none;">' +
                        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">' +
                            '<div>' +
                                '<h4 style="color:#cf2342;margin:0 0 10px;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;">Pöntunarupplýsingar</h4>' +
                                '<div style="color:#b3b2b2;font-size:0.9rem;line-height:1.8;">' +
                                    '<div><strong>Pöntun #:</strong> ' + order.id + '</div>' +
                                    '<div><strong>Viðskiptavinur:</strong> ' + escapeHTML(order.userName) + '</div>' +
                                    '<div><strong>Netfang:</strong> ' + escapeHTML(order.userEmail) + '</div>' +
                                    '<div><strong>Staða:</strong> ' + (statusLabels[order.status] || order.status) + '</div>' +
                                    '<div><strong>Pöntunardagur:</strong> ' + AdminApp.formatDate(order.createdAt) + '</div>' +
                                    (order.completedAt ? '<div><strong>Kláruð:</strong> ' + AdminApp.formatDate(order.completedAt) + '</div>' : '') +
                                '</div>' +
                            '</div>' +
                            '<div>' +
                                '<h4 style="color:#cf2342;margin:0 0 10px;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;">Vörur</h4>' +
                                '<table style="width:100%;font-size:0.9rem;color:#b3b2b2;">' +
                                    '<thead><tr style="color:#888;border-bottom:1px solid rgba(255,255,255,0.08);">' +
                                        '<th style="text-align:left;padding:4px 8px;font-weight:600;">Vara</th>' +
                                        '<th style="text-align:left;padding:4px 8px;font-weight:600;">Stærð</th>' +
                                        '<th style="text-align:center;padding:4px 8px;font-weight:600;">Magn</th>' +
                                    '</tr></thead>' +
                                    '<tbody>' +
                                        order.items.map(function(item) {
                                            return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">' +
                                                '<td style="padding:6px 8px;">' + escapeHTML(item.productName) + '</td>' +
                                                '<td style="padding:6px 8px;">' + item.size + '</td>' +
                                                '<td style="padding:6px 8px;text-align:center;">' + item.quantity + '</td>' +
                                            '</tr>';
                                        }).join('') +
                                    '</tbody>' +
                                '</table>' +
                                '<div style="text-align:right;margin-top:10px;font-weight:700;color:#e0e0e0;font-size:1rem;">' +
                                    'Samtals: ' + AdminApp.formatPrice(order.totalAmount) +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                '</tr>';
            }
        });

        tbody.innerHTML = html;
    }

    function setupTabs() {
        var tabBtns = document.querySelectorAll('#page-orders .toolbar-tabs [data-tab]');
        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                tabBtns.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                currentTab = this.dataset.tab;
                expandedOrder = null;
                renderOrders();
            });
        });
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Public API
    window.OrdersModule = {
        toggleRow: function(id) {
            expandedOrder = (expandedOrder === id) ? null : id;
            renderOrders();
        },

        markComplete: function(id) {
            var order = window.MOCK_DATA.orders.find(function(o) { return o.id === id; });
            if (!order) return;

            AdminApp.openModal('Klára pöntun',
                '<p style="color:#b3b2b2;font-size:1.1rem;">Merkja pöntun <strong>#' + id.slice(-6).toUpperCase() + '</strong> frá <strong>' + escapeHTML(order.userName) + '</strong> sem kláraða?</p>' +
                '<p style="color:#888;margin-top:8px;">Samtals: ' + AdminApp.formatPrice(order.totalAmount) + '</p>',
                '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">Hætta við</button>' +
                '<button class="btn btn-primary" onclick="OrdersModule.confirmComplete(\'' + id + '\')">Klára</button>'
            );
        },

        confirmComplete: function(id) {
            var idx = window.MOCK_DATA.orders.findIndex(function(o) { return o.id === id; });
            if (idx === -1) return;
            window.MOCK_DATA.orders[idx].status = 'completed';
            window.MOCK_DATA.orders[idx].completedAt = new Date().toISOString().split('T')[0];
            AdminApp.closeModal();
            AdminApp.showToast('Pöntun kláruð', 'success');
            renderOrders();
        }
    };

    // Initialize
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'orders') {
            setupTabs();
            renderOrders();
        }
    });

})();
