// Global language functionality
let currentLang = localStorage.getItem('language') || 'is';

function toggleLanguage() {
    currentLang = currentLang === 'is' ? 'en' : 'is';
    localStorage.setItem('language', currentLang);
    updateLanguageDisplay();
}

function updateLanguageDisplay() {
    document.documentElement.setAttribute('lang', currentLang);
    document.body.setAttribute('data-lang', currentLang);
    
    // Update page title based on current page
    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    updatePageTitle(pageName);
    
    // Update all language spans
    const isElements = document.querySelectorAll('.is');
    const enElements = document.querySelectorAll('.en');
    
    if (currentLang === 'is') {
        isElements.forEach(el => el.style.display = 'inline');
        enElements.forEach(el => el.style.display = 'none');
    } else {
        isElements.forEach(el => el.style.display = 'none');
        enElements.forEach(el => el.style.display = 'inline');
    }
}

function updatePageTitle(pageName) {
    function updatePageTitle(pageName) {
    const titles = {
        'index.html': {
            is: 'Sleipnir MC Reykjavík - Opinber Verslun',
            en: 'Sleipnir MC Reykjavík - Official Store'
        },
        'shop.html': {
            is: 'Sleipnir MC - Verslun',
            en: 'Sleipnir MC - Shop'
        },
        'about.html': {
            is: 'Sleipnir MC - Hópurinn',
            en: 'Sleipnir MC - Members'
        },
        'sagan.html': {
            is: 'Sleipnir MC - Sagan',
            en: 'Sleipnir MC - Story'
        },
        'contact.html': {
            is: 'Sleipnir MC - Hafa Samband',
            en: 'Sleipnir MC - Contact'
        },
        'register.html': {
            is: 'Sleipnir MC - Skráning',
            en: 'Sleipnir MC - Registration'
        },
        'orders.html': {
            is: 'Sleipnir MC - Pantanir',
            en: 'Sleipnir MC - Orders'
        },
        'admin.html': {
            is: 'Sleipnir MC - Stjórnborð',
            en: 'Sleipnir MC - Admin Panel'
        }
    };

    const pageTitle = titles[pageName] || titles['index.html'];
    document.title = currentLang === 'is' ? pageTitle.is : pageTitle.en;
}
    
    const pageTitle = titles[pageName] || titles['index.html'];
    document.title = currentLang === 'is' ? pageTitle.is : pageTitle.en;
}

// Initialize language on page load
window.addEventListener('DOMContentLoaded', () => {
    updateLanguageDisplay();
});