(function() {
    'use strict';

    function renderDashboard() {
        renderStatCards();
        renderOutstandingOrders();
        renderRevenueChart();
        renderActivityFeed();
    }

    function renderStatCards() {
        var data = window.MOCK_DATA;
        var outstandingOrders = data.orders.filter(function(o) { return o.status !== 'completed' && o.status !== 'cancelled'; });
        var completedOrders = data.orders.filter(function(o) { return o.status === 'completed'; });
        var totalRevenue = completedOrders.reduce(function(sum, o) { return sum + o.totalAmount; }, 0);

        var stats = [
            {
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
                value: data.members.length,
                label: 'Meðlimir',
                trend: '+2',
                trendClass: 'trend--up'
            },
            {
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2"/><circle cx="12" cy="7" r="4"/></svg>',
                value: data.users.length,
                label: 'Notendur',
                trend: '+3',
                trendClass: 'trend--up'
            },
            {
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
                value: outstandingOrders.length,
                label: 'Óafgreiddar pantanir',
                trend: outstandingOrders.length > 3 ? '!' : '',
                trendClass: outstandingOrders.length > 3 ? 'trend--down' : 'trend--up'
            },
            {
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
                value: AdminApp.formatPrice(totalRevenue),
                label: 'Heildartekjur',
                trend: '+12%',
                trendClass: 'trend--up'
            }
        ];

        var html = '';
        stats.forEach(function(stat) {
            html += '<div class="stat-card">' +
                '<div class="stat-card-icon">' + stat.icon + '</div>' +
                '<div class="stat-card-body">' +
                    '<div class="stat-card-value">' + stat.value + '</div>' +
                    '<div class="stat-card-label">' + stat.label + '</div>' +
                '</div>' +
                (stat.trend ? '<div class="stat-card-trend ' + stat.trendClass + '">' + stat.trend + '</div>' : '') +
            '</div>';
        });
        document.getElementById('statCards').innerHTML = html;
    }

    function renderOutstandingOrders() {
        var container = document.getElementById('outstandingOrders');
        if (!container) return;

        var orders = window.MOCK_DATA.orders.filter(function(o) {
            return o.status !== 'completed' && o.status !== 'cancelled';
        }).sort(function(a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        var totalAmount = orders.reduce(function(sum, o) { return sum + o.totalAmount; }, 0);
        var pendingCount = orders.filter(function(o) { return o.status === 'pending'; }).length;
        var processingCount = orders.filter(function(o) { return o.status === 'processing'; }).length;

        var statusText = { pending: 'Í bið', processing: 'Í vinnslu' };

        var html = '<div class="outstanding-summary">' +
            '<div class="outstanding-stat">' +
                '<span class="outstanding-stat-value">' + orders.length + '</span>' +
                '<span class="outstanding-stat-label">Samtals</span>' +
            '</div>' +
            '<div class="outstanding-stat">' +
                '<span class="outstanding-stat-value outstanding-stat-pending">' + pendingCount + '</span>' +
                '<span class="outstanding-stat-label">Í bið</span>' +
            '</div>' +
            '<div class="outstanding-stat">' +
                '<span class="outstanding-stat-value outstanding-stat-processing">' + processingCount + '</span>' +
                '<span class="outstanding-stat-label">Í vinnslu</span>' +
            '</div>' +
            '<div class="outstanding-stat">' +
                '<span class="outstanding-stat-value">' + AdminApp.formatPrice(totalAmount) + '</span>' +
                '<span class="outstanding-stat-label">Heildarupphæð</span>' +
            '</div>' +
        '</div>';

        html += '<div class="outstanding-list">';
        orders.forEach(function(order) {
            var items = order.items.map(function(i) {
                return i.productName + (i.quantity > 1 ? ' ×' + i.quantity : '');
            }).join(', ');

            html += '<div class="outstanding-row">' +
                '<div class="outstanding-row-main">' +
                    '<span class="outstanding-order-id">' + order.id.toUpperCase() + '</span>' +
                    '<span class="outstanding-customer">' + order.userName + '</span>' +
                    '<span class="outstanding-items">' + items + '</span>' +
                '</div>' +
                '<div class="outstanding-row-end">' +
                    '<span class="outstanding-amount">' + AdminApp.formatPrice(order.totalAmount) + '</span>' +
                    '<span class="badge badge--' + order.status + '">' + (statusText[order.status] || order.status) + '</span>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';

        container.innerHTML = html;
    }

    function renderRevenueChart() {
        var canvas = document.getElementById('revenueChart');
        if (!canvas) return;

        canvas.width = canvas.parentElement.offsetWidth - 48;
        canvas.height = 220;

        var ctx = canvas.getContext('2d');
        var orders = window.MOCK_DATA.orders.filter(function(o) { return o.status === 'completed'; });
        var products = window.MOCK_DATA.products;

        var categoryRevenue = {};
        var categoryNames = { tshirt: 'Bolir', hoodie: 'Hettupeysur', jacket: 'Jakkar', jeans: 'Buxur', other: 'Annað' };

        orders.forEach(function(order) {
            order.items.forEach(function(item) {
                var product = products.find(function(p) { return p.nameIs === item.productName || p.nameEn === item.productName; });
                var cat = product ? product.category : 'other';
                categoryRevenue[cat] = (categoryRevenue[cat] || 0) + (item.quantity * (product ? product.price : 0));
            });
        });

        var categories = Object.keys(categoryRevenue).sort(function(a, b) { return categoryRevenue[b] - categoryRevenue[a]; });
        var maxRev = Math.max.apply(null, categories.map(function(c) { return categoryRevenue[c]; }));
        if (maxRev === 0) maxRev = 1;

        var padding = { top: 10, right: 20, bottom: 10, left: 100 };
        var chartW = canvas.width - padding.left - padding.right;
        var barH = 28;
        var barGap = 14;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        categories.forEach(function(cat, idx) {
            var y = padding.top + idx * (barH + barGap);
            var w = (categoryRevenue[cat] / maxRev) * chartW;

            ctx.fillStyle = '#b3b2b2';
            ctx.font = '14px "Cormorant Garamond", serif';
            ctx.textAlign = 'right';
            ctx.fillText(categoryNames[cat] || cat, padding.left - 12, y + barH / 2 + 5);

            var grad = ctx.createLinearGradient(padding.left, y, padding.left + w, y);
            grad.addColorStop(0, '#cf2342');
            grad.addColorStop(1, '#e63856');
            ctx.fillStyle = grad;

            var r = 4;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + w - r, y);
            ctx.quadraticCurveTo(padding.left + w, y, padding.left + w, y + r);
            ctx.lineTo(padding.left + w, y + barH - r);
            ctx.quadraticCurveTo(padding.left + w, y + barH, padding.left + w - r, y + barH);
            ctx.lineTo(padding.left, y + barH);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#e0e0e0';
            ctx.font = '12px "Cinzel", serif';
            ctx.textAlign = 'left';
            ctx.fillText(AdminApp.formatPrice(categoryRevenue[cat]), padding.left + w + 10, y + barH / 2 + 4);
        });
    }

    function renderActivityFeed() {
        var orders = window.MOCK_DATA.orders.slice().sort(function(a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }).slice(0, 5);

        var html = '';
        orders.forEach(function(order) {
            var dotClass = 'activity-dot--' + order.status;
            var statusText = {
                pending: 'Í bið',
                processing: 'Í vinnslu',
                completed: 'Kláruð',
                cancelled: 'Afturkölluð'
            };
            html += '<div class="activity-item">' +
                '<span class="activity-dot ' + dotClass + '"></span>' +
                '<span class="activity-text">' +
                    '<strong>' + order.userName + '</strong> — ' +
                    order.items.map(function(i) { return i.productName; }).join(', ') +
                    ' — <span class="badge badge--' + order.status + '">' + (statusText[order.status] || order.status) + '</span>' +
                '</span>' +
                '<span class="activity-amount">' + AdminApp.formatPrice(order.totalAmount) + '</span>' +
                '<span class="activity-time">' + AdminApp.formatDate(order.createdAt) + '</span>' +
            '</div>';
        });
        document.getElementById('activityFeed').innerHTML = html;
    }

    // Listen for section events
    document.addEventListener('sectionInit', function(e) {
        if (e.detail.section === 'dashboard') {
            renderDashboard();
        }
    });

    // Self-init: if dashboard is already active (fixes script load order race)
    if (document.getElementById('page-dashboard').classList.contains('active')) {
        renderDashboard();
    }

    // Re-render charts on window resize (debounced)
    var resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (document.getElementById('page-dashboard').classList.contains('active')) {
                renderRevenueChart();
            }
        }, 250);
    });

})();
