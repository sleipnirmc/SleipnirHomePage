(function() {
    'use strict';

    // =============================================
    // ORDERS MODULE — Firestore-backed order management
    // Depends on: window.AdminApp, firebase
    // =============================================

    var orders = [];
    var currentTab = 'all';
    var expandedOrder = null;

    var statusLabels = {
        pending: '\u00CD bi\u00F0',
        processing: '\u00CD vinnslu',
        paid: 'Greitt',
        completed: 'Kl\u00E1ru\u00F0',
        cancelled: 'Afturk\u00F6llu\u00F0'
    };

    var statusClasses = {
        pending: 'badge--pending',
        processing: 'badge--processing',
        paid: 'badge--paid',
        completed: 'badge--completed',
        cancelled: 'badge--cancelled'
    };

    // =============================================
    // DATA LOADING
    // =============================================

    function loadOrders() {
        var tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        // Show loading inside tbody (not parentElement, which would destroy the tbody element)
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></td></tr>';

        AdminApp.db.collection('orders').orderBy('createdAt', 'desc').get()
            .then(function(snapshot) {
                orders = [];
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    orders.push(data);
                });
                renderOrders();
            })
            .catch(function(error) {
                console.error('Error loading orders:', error);
                AdminApp.showToast(SleipnirI18n.t('admin.orders.loadError', 'Villa vi\u00F0 a\u00F0 hla\u00F0a p\u00F6ntunum'), 'error');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#888;">' +
                        AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.loadError', 'Villa vi\u00F0 a\u00F0 hla\u00F0a p\u00F6ntunum')) +
                    '</td></tr>';
                }
            });
    }

    // =============================================
    // RENDERING
    // =============================================

    function renderOrders() {
        var tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        var filtered = orders.filter(function(o) {
            return currentTab === 'all' || o.status === currentTab;
        });

        // Sort by createdAt descending (newest first)
        filtered.sort(function(a, b) {
            var dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
            var dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
            return dateB - dateA;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#888;">' +
                AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.empty', 'Engar pantanir fundust')) +
            '</td></tr>';
            return;
        }

        var html = '';
        filtered.forEach(function(order) {
            var orderId = order.id.slice(-6).toUpperCase();
            var items = order.items || [];
            var itemsStr = items.map(function(item) {
                return (item.productName || '') + ' (' + (item.size || '') + ') \u00D7' + (item.quantity || 1);
            }).join(', ');
            var isExpanded = expandedOrder === order.id;
            var canMarkPaid = order.status === 'pending' || order.status === 'processing';
            var canComplete = order.status === 'paid';

            var statusLabel = SleipnirI18n.t('admin.orders.status.' + order.status, statusLabels[order.status] || order.status);

            var actionBtn = '';
            if (canMarkPaid) {
                actionBtn = '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();OrdersModule.markPaid(\'' + AdminApp.escapeAttr(order.id) + '\')" style="font-size:0.75rem;">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.paid_btn', 'Greitt')) +
                  '</button>';
            } else if (canComplete) {
                actionBtn = '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();OrdersModule.markComplete(\'' + AdminApp.escapeAttr(order.id) + '\')" style="font-size:0.75rem;">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.complete', 'Kl\u00E1ra')) +
                  '</button>';
            }

            html += '<tr class="order-row' + (isExpanded ? ' expanded' : '') + '" onclick="OrdersModule.toggleRow(\'' + AdminApp.escapeAttr(order.id) + '\')" style="cursor:pointer;">' +
                '<td style="font-family:\'Cinzel\',serif;font-weight:600;color:#cf2342;">#' + AdminApp.escapeHTML(orderId) + '</td>' +
                '<td>' + AdminApp.escapeHTML(order.userName || '') + '</td>' +
                '<td style="color:#aaa;font-size:0.9rem;">' + AdminApp.escapeHTML(order.userEmail || '') + '</td>' +
                '<td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + AdminApp.escapeHTML(itemsStr) + '</td>' +
                '<td style="font-weight:600;white-space:nowrap;">' + AdminApp.formatPrice(order.totalAmount) + '</td>' +
                '<td style="white-space:nowrap;">' + AdminApp.formatFirestoreDate(order.createdAt) + '</td>' +
                '<td><span class="badge ' + (statusClasses[order.status] || '') + '">' + AdminApp.escapeHTML(statusLabel) + '</span></td>' +
                '<td style="white-space:nowrap;">' + actionBtn + '</td>' +
            '</tr>';

            // Expanded detail row
            if (isExpanded) {
                html += renderDetailRow(order);
            }
        });

        tbody.innerHTML = html;
    }

    function renderDetailRow(order) {
        var items = order.items || [];
        var orderId = order.id;
        var statusLabel = SleipnirI18n.t('admin.orders.status.' + order.status, statusLabels[order.status] || order.status);

        var itemsHTML = items.map(function(item) {
            return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">' +
                '<td style="padding:6px 8px;">' + AdminApp.escapeHTML(item.productName || '') + '</td>' +
                '<td style="padding:6px 8px;">' + AdminApp.escapeHTML(item.size || '') + '</td>' +
                '<td style="padding:6px 8px;text-align:center;">' + (item.quantity || 1) + '</td>' +
            '</tr>';
        }).join('');

        var addressHTML = '';
        if (order.userAddress || order.userCity || order.userPostalCode) {
            addressHTML = '<div><strong>' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.address', 'Heimilisfang')) + ':</strong> ' +
                AdminApp.escapeHTML([order.userAddress, order.userPostalCode, order.userCity].filter(Boolean).join(', ')) +
            '</div>';
        }

        return '<tr class="order-detail-row">' +
            '<td colspan="8" style="padding:16px 24px;background:rgba(255,255,255,0.02);border-top:none;">' +
                '<div style="display:grid;grid-template-columns:280px auto;gap:32px;justify-content:start;">' +
                    '<div>' +
                        '<h4 style="color:#cf2342;margin:0 0 10px;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;">' +
                            AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.details', 'P\u00F6ntunaruppl\u00FDsingar')) +
                        '</h4>' +
                        '<div style="color:#b3b2b2;font-size:0.9rem;line-height:1.8;">' +
                            '<div><strong>' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.orderId', 'P\u00F6ntun #')) + ':</strong> ' + AdminApp.escapeHTML(orderId) + '</div>' +
                            '<div><strong>' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.customer', 'Vi\u00F0skiptavinur')) + ':</strong> ' + AdminApp.escapeHTML(order.userName || '') + '</div>' +
                            '<div><strong>' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.email', 'Netfang')) + ':</strong> ' + AdminApp.escapeHTML(order.userEmail || '') + '</div>' +
                            addressHTML +
                            '<div><strong>' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.status', 'Sta\u00F0a')) + ':</strong> ' + AdminApp.escapeHTML(statusLabel) + '</div>' +
                            '<div><strong>' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.orderDate', 'P\u00F6ntunardagur')) + ':</strong> ' + AdminApp.formatFirestoreDate(order.createdAt) + '</div>' +
                            (order.paidAt
                                ? '<div><strong>' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.paidDate', 'Greitt')) + ':</strong> ' + AdminApp.formatFirestoreDate(order.paidAt) + '</div>'
                                : '') +
                            (order.completedAt
                                ? '<div><strong>' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.completedDate', 'Kl\u00E1ru\u00F0')) + ':</strong> ' + AdminApp.formatFirestoreDate(order.completedAt) + '</div>'
                                : '') +
                        '</div>' +
                    '</div>' +
                    '<div style="min-width:320px;max-width:480px;">' +
                        '<h4 style="color:#cf2342;margin:0 0 10px;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;">' +
                            AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.items', 'V\u00F6rur')) +
                        '</h4>' +
                        '<table style="width:100%;font-size:0.9rem;color:#b3b2b2;">' +
                            '<thead><tr style="color:#888;border-bottom:1px solid rgba(255,255,255,0.08);">' +
                                '<th style="text-align:left;padding:4px 8px;font-weight:600;">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.product', 'Vara')) + '</th>' +
                                '<th style="text-align:left;padding:4px 8px;font-weight:600;">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.size', 'St\u00E6r\u00F0')) + '</th>' +
                                '<th style="text-align:center;padding:4px 8px;font-weight:600;">' + AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.quantity', 'Magn')) + '</th>' +
                            '</tr></thead>' +
                            '<tbody>' + itemsHTML + '</tbody>' +
                        '</table>' +
                        '<div style="text-align:right;margin-top:10px;font-weight:700;color:#e0e0e0;font-size:1rem;">' +
                            AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.total', 'Samtals')) + ': ' + AdminApp.formatPrice(order.totalAmount) +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }

    // =============================================
    // TAB SETUP
    // =============================================

    function setupTabs() {
        var tabBtns = document.querySelectorAll('#page-orders .toolbar-tabs [data-tab]');
        if (!tabBtns.length) return;

        for (var i = 0; i < tabBtns.length; i++) {
            tabBtns[i].addEventListener('click', function() {
                var allBtns = document.querySelectorAll('#page-orders .toolbar-tabs [data-tab]');
                for (var j = 0; j < allBtns.length; j++) {
                    allBtns[j].classList.remove('active');
                }
                this.classList.add('active');
                currentTab = this.dataset.tab;
                expandedOrder = null;
                renderOrders();
            });
        }
    }

    // =============================================
    // PUBLIC API
    // =============================================

    window.OrdersModule = {

        toggleRow: function(id) {
            expandedOrder = (expandedOrder === id) ? null : id;
            renderOrders();
        },

        markPaid: function(id) {
            var order = null;
            for (var i = 0; i < orders.length; i++) {
                if (orders[i].id === id) { order = orders[i]; break; }
            }
            if (!order) return;

            AdminApp.openModal(
                SleipnirI18n.t('admin.orders.paid_title', 'Merkja sem greitt'),
                '<p style="color:#b3b2b2;font-size:1.1rem;">' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.paid_confirm', 'Merkja p\u00F6ntun sem greidda')) +
                    ' <strong>#' + AdminApp.escapeHTML(id.slice(-6).toUpperCase()) + '</strong> ' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.from', 'fr\u00E1')) +
                    ' <strong>' + AdminApp.escapeHTML(order.userName || '') + '</strong>?' +
                '</p>' +
                '<p style="color:#888;margin-top:8px;">' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.total', 'Samtals')) + ': ' + AdminApp.formatPrice(order.totalAmount) +
                '</p>',
                '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cancel', 'H\u00E6tta vi\u00F0')) +
                '</button>' +
                '<button class="btn btn-primary" onclick="OrdersModule.confirmPaid(\'' + AdminApp.escapeAttr(id) + '\')">' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.paid_btn', 'Greitt')) +
                '</button>'
            );
        },

        confirmPaid: function(id) {
            AdminApp.db.collection('orders').doc(id).update({
                status: 'paid',
                paidAt: firebase.firestore.FieldValue.serverTimestamp()
            })
                .then(function() {
                    AdminApp.closeModal();
                    AdminApp.showToast(SleipnirI18n.t('admin.orders.paid_success', 'P\u00F6ntun merkt sem greidd'), 'success');
                    AdminApp.logActivity('order_paid', 'Order #' + id.slice(-6).toUpperCase());
                    loadOrders();
                })
                .catch(function(error) {
                    console.error('Error marking order as paid:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.orders.paid_error', 'Villa vi\u00F0 a\u00F0 merkja p\u00F6ntun sem greidda'), 'error');
                });
        },

        markComplete: function(id) {
            var order = null;
            for (var i = 0; i < orders.length; i++) {
                if (orders[i].id === id) { order = orders[i]; break; }
            }
            if (!order) return;

            AdminApp.openModal(
                SleipnirI18n.t('admin.orders.completeTitle', 'Kl\u00E1ra p\u00F6ntun'),
                '<p style="color:#b3b2b2;font-size:1.1rem;">' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.completeConfirm', 'Merkja p\u00F6ntun')) +
                    ' <strong>#' + AdminApp.escapeHTML(id.slice(-6).toUpperCase()) + '</strong> ' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.from', 'fr\u00E1')) +
                    ' <strong>' + AdminApp.escapeHTML(order.userName || '') + '</strong> ' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.asCompleted', 'sem kl\u00E1ra\u00F0a')) + '?' +
                '</p>' +
                '<p style="color:#888;margin-top:8px;">' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.total', 'Samtals')) + ': ' + AdminApp.formatPrice(order.totalAmount) +
                '</p>',
                '<button class="btn btn-secondary" onclick="AdminApp.closeModal()">' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.common.cancel', 'H\u00E6tta vi\u00F0')) +
                '</button>' +
                '<button class="btn btn-primary" onclick="OrdersModule.confirmComplete(\'' + AdminApp.escapeAttr(id) + '\')">' +
                    AdminApp.escapeHTML(SleipnirI18n.t('admin.orders.complete', 'Kl\u00E1ra')) +
                '</button>'
            );
        },

        confirmComplete: function(id) {
            AdminApp.db.collection('orders').doc(id).update({
                status: 'completed',
                completedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
                .then(function() {
                    AdminApp.closeModal();
                    AdminApp.showToast(SleipnirI18n.t('admin.orders.completeSuccess', 'P\u00F6ntun kl\u00E1ru\u00F0'), 'success');
                    AdminApp.logActivity('order_completed', 'Order #' + id.slice(-6).toUpperCase());
                    loadOrders();
                })
                .catch(function(error) {
                    console.error('Error completing order:', error);
                    AdminApp.showToast(SleipnirI18n.t('admin.orders.completeError', 'Villa vi\u00F0 a\u00F0 kl\u00E1ra p\u00F6ntun'), 'error');
                });
        }
    };

    // =============================================
    // SECTION EVENTS
    // =============================================

    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section !== 'orders') return;

        setupTabs();
        loadOrders();
    });

    document.addEventListener('sectionShow', function(e) {
        if (e.detail.section !== 'orders') return;
        renderOrders();
    });

})();
