/**
 * Sleipnir MC -- Unified Page Registry
 * Single source of truth for page sections, nav dropdowns, and scripts.
 * Section order here drives both the page layout AND the nav dropdown menus.
 */
window.PAGE_REGISTRY = {
    '/': {
        title: 'Sleipnir MC Reykjavík',
        bodyClass: 'homepage',
        sections: [
            { url: '/pages/home/sections/hero.html' }
        ],
        scripts: ['/js/page-scripts/home.js']
    },
    '/shop': {
        title: 'Sleipnir MC - Verslun',
        sections: [
            { url: '/pages/shop/sections/hero.html' },
            { url: '/pages/shop/sections/member-status.html' },
            { url: '/pages/shop/sections/category-filter.html' },
            { url: '/pages/shop/sections/products-grid.html' },
            { url: '/pages/shop/sections/cart-sidebar.html' },
            { url: '/pages/shop/sections/product-modal.html' }
        ],
        scripts: ['/js/page-scripts/shop.js', '/js/page-scripts/shop-init.js']
    },
    '/about': {
        title: 'Sleipnir MC - Hópurinn',
        sections: [
            { url: '/pages/about/sections/hero.html' },
            { url: '/pages/about/sections/members.html' }
        ],
        scripts: ['/js/page-scripts/about.js']
    },
    '/sagan': {
        title: 'Sleipnir MC - Sagan',
        sections: [
            { url: '/pages/sagan/sections/hero.html' },
            { url: '/pages/sagan/sections/story-content.html' },
            { url: '/pages/sagan/sections/timeline.html' }
        ],
        scripts: ['/js/page-scripts/sagan.js']
    },
    '/contact': {
        title: 'Sleipnir MC - Samband',
        sections: [
            { url: '/pages/contact/sections/hero.html' },
            { url: '/pages/contact/sections/form-and-map.html' }
        ],
        scripts: ['/js/page-scripts/contact.js'],
        styles: ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'],
        externalScripts: ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js']
    },
    '/reykjavik': {
        title: 'Sleipnir MC - Reykjavík',
        sections: [
            { url: '/pages/reykjavik/sections/wip.html' }
        ],
        scripts: []
    },
    '/akureyri': {
        title: 'Sleipnir MC - Akureyri',
        sections: [
            { url: '/pages/akureyri/sections/wip.html' }
        ],
        scripts: []
    },
    '/login': {
        title: 'Sleipnir MC - Login',
        layout: 'bare',
        sections: [
            { url: '/pages/login/sections/login-form.html' }
        ],
        scripts: ['/js/page-scripts/login.js'],
        styles: ['/css/login.css']
    },
    '/admin': {
        title: 'Sleipnir MC - Admin',
        layout: 'admin',
        sections: [
            { url: '/pages/admin/sections/admin-dashboard.html' }
        ],
        externalScripts: [
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-functions-compat.js',
            'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
        ],
        scripts: [
            '/js/page-scripts/admin/admin-app.js',
            '/js/page-scripts/admin/dashboard.js',
            '/js/page-scripts/admin/members.js',
            '/js/page-scripts/admin/users.js',
            '/js/page-scripts/admin/products.js',
            '/js/page-scripts/admin/orders.js',
            '/js/page-scripts/admin/data-export.js',
            '/js/page-scripts/admin/admin-init.js'
        ],
        styles: ['/css/admin.css'],
        protected: true
    }
};

/* Derive NAV_ITEMS for backward compat with components.js */
window.NAV_ITEMS = [
    { i18nKey: 'nav.home', label: 'Heim', href: '/' },
    { i18nKey: 'nav.shop', label: 'Verslun', href: '/shop' },
    {
        i18nKey: 'nav.about', label: 'Um Okkur', href: '/about',
        children: [
            { i18nKey: 'nav.about.members', label: 'Hópurinn', href: '/about' },
            { i18nKey: 'nav.about.story', label: 'Sagan', href: '/sagan' },
            {
                i18nKey: 'nav.about.chapters', label: 'Chapterar', href: '#',
                children: [
                    { i18nKey: 'nav.chapters.reykjavik', label: 'Reykjavík', href: '/reykjavik' },
                    { i18nKey: 'nav.chapters.akureyri', label: 'Akureyri', href: '/akureyri' }
                ]
            }
        ]
    },
    { i18nKey: 'nav.contact', label: 'Hafa Samband', href: '/contact' }
];

/* Helper for skeleton.js to get page config */
window.getPageConfig = function(pagePath) {
    var entry = window.PAGE_REGISTRY[pagePath];
    if (!entry) return null;
    return entry;
};
