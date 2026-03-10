/**
 * Sleipnir MC -- Navigation Configuration
 * Defines navbar items and dropdown structure.
 */
window.NAV_ITEMS = [
    { i18nKey: 'nav.home', label: 'Heim', href: '/index.html' },
    { i18nKey: 'nav.shop', label: 'Verslun', href: '/pages/shop.html' },
    {
        i18nKey: 'nav.about', label: 'Um Okkur', href: '#',
        children: [
            { i18nKey: 'nav.about.members', label: 'H\u00f3purinn', href: '/pages/about.html' },
            { i18nKey: 'nav.about.story', label: 'Sagan', href: '/pages/sagan.html' },
            {
                i18nKey: 'nav.about.chapters', label: 'Chapterar', href: '#',
                children: [
                    { i18nKey: 'nav.chapters.reykjavik', label: 'Reykjav\u00edk', href: '/pages/reykjavik.html' },
                    { i18nKey: 'nav.chapters.akureyri', label: 'Akureyri', href: '/pages/akureyri.html' }
                ]
            }
        ]
    },
    { i18nKey: 'nav.contact', label: 'Hafa Samband', href: '/pages/contact.html' }
];
