// Centralized Navigation Component
// This component manages the shared navigation across all pages
// while maintaining SEO-friendly HTML structure

class NavigationComponent {
    constructor() {
        this.currentPage = window.location.pathname.split('/').pop() || 'index.html';
    }

    // Navigation HTML template
    getNavigationHTML() {
        const isAdminPage = this.currentPage === 'admin.html';
        const logoLocation = isAdminPage ? 'ADMIN' : 'REYKJAVÍK';
        
        return `
            <div class="logo">
                <span class="logo-text">SLEIPNIR MC</span>
                <span class="location">${logoLocation}</span>
            </div>
            <ul class="nav-links">
                ${this.getNavLinks()}
            </ul>
            <div class="member-portal">
                <!-- Auth state will be loaded by auth.js -->
            </div>
            <div class="language-toggle">
                <button class="lang-btn" onclick="toggleLanguage()">
                    <span class="is">EN</span>
                    <span class="en">IS</span>
                </button>
            </div>
        `;
    }

    // Get navigation links based on current page
    getNavLinks() {
        const isAdminPage = this.currentPage === 'admin.html';
        
        // Admin page has different navigation
        if (isAdminPage) {
            return `
                <li><a href="index.html">Home</a></li>
                <li><a href="shop.html">Shop</a></li>
                <li><a href="orders.html">My Orders</a></li>
                <li><a href="#" onclick="logout()">Logout</a></li>
            `;
        }
        
        // Regular pages navigation
        const links = [
            { href: 'index.html', isText: 'Heim', enText: 'Home' },
            { href: 'shop.html', isText: 'Verslun', enText: 'Shop' },
            { href: 'about.html', isText: 'Hópurinn', enText: 'About Us' },
            { href: 'contact.html', isText: 'Hafa Samband', enText: 'Contact' }
        ];
        
        return links.map(link => {
            const isActive = link.href === this.currentPage ? ' class="active"' : '';
            return `<li><a href="${link.href}"${isActive}><span class="is">${link.isText}</span><span class="en">${link.enText}</span></a></li>`;
        }).join('');
    }

    // Initialize navigation
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.render());
        } else {
            this.render();
        }
    }

    // Render navigation
    render() {
        const navElement = document.querySelector('nav');
        if (!navElement) {
            console.error('Navigation element not found');
            return;
        }

        // Check if nav already has content (for SEO fallback)
        // Only replace if nav is empty or has placeholder class
        if (navElement.classList.contains('nav-placeholder') || navElement.children.length === 0) {
            navElement.innerHTML = this.getNavigationHTML();
            navElement.classList.remove('nav-placeholder');
        }
        
        // Set active link based on current page
        this.setActiveLink();
    }

    // Set active link styling
    setActiveLink() {
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            if (linkPage === this.currentPage) {
                link.classList.add('active');
            }
        });
    }
}

// Initialize navigation component
const navigation = new NavigationComponent();
navigation.init();

// Export for use in other scripts if needed
window.NavigationComponent = NavigationComponent;