# Sleipnir MC Reykjavík - Official Store

A members-only clothing store website for Sleipnir MC Reykjavík, featuring Norse mythology-inspired design with strict adherence to motorcycle club color traditions (black and red only).

## 🏍️ Project Overview

Sleipnir MC Reykjavík stands apart from typical motorcycle clubs by embracing Icelandic heritage and Norse mythology. Named after Odin's eight-legged horse, the club represents a sophisticated approach to MC culture while maintaining the brotherhood's traditional values.

### Key Features
- **Bilingual Support**: Icelandic (primary) and English
- **Norse Design Elements**: Runic symbols, knotwork patterns
- **Strict MC Colors**: Black and red only (as per MC tradition)
- **Members Portal**: Exclusive access for brotherhood
- **Responsive Design**: Mobile-first approach
- **Cultural Authenticity**: Genuine Icelandic/Norse elements

## 📁 File Structure

```
sleipnir-mc/
│
├── index.html                 # Homepage (rename from Vefsíða.html)
├── contact.html              # Contact page with form
├── styles.css                # Main stylesheet (black & red theme)
│
├── images/
│   ├── SleipnirLogo.png     # Club logo (8-legged horse design)
│   ├── hero/
│   │   └── iceland-bg.jpg   # Hero background (optional)
│   ├── products/
│   │   ├── riders-tunic.jpg
│   │   ├── berserker-denim.jpg
│   │   └── valkyrie-hood.jpg
│   └── textures/
│       ├── leather.png
│       ├── metal.png
│       └── norse-pattern.svg
│
├── js/
│   ├── main.js              # Core functionality
│   └── language.js          # Language toggle (IS/EN)
│
├── members/                  # Members-only area (future)
│   ├── login.html
│   └── dashboard.html
│
├── docs/
│   ├── claude.md            # AI assistant reference
│   └── style-guide.md       # Design specifications2
│
├── favicon.ico              # Sleipnir icon
├── robots.txt              # SEO directives
├── sitemap.xml             # Site structure
└── README.md               # This file
```

## 🎨 Design System

### Color Palette (MANDATORY - MC TRADITION)
``` css
/* BLACK & RED ONLY - NO EXCEPTIONS */
--pure-black: #000000;      /* Primary background */
--midnight-black: #0a0a0a;  /* Secondary background */
--norse-black: #1a1a1a;     /* Card backgrounds */
--mc-red: #ff0000;          /* Primary accent */
--blood-red: #cc0000;       /* Hover states */
--dark-red: #990000;        /* Active states */
--white: #ffffff;           /* Text only */
--gray: #888888;            /* Secondary text only */
```

### Typography
- **Headings**: Cinzel (serif, bold)
- **Body Text**: Cormorant Garamond (serif, elegant)
- **Accents**: Iceland (display, runic-style)

### Components
- Hero section with animated "northern lights" (red tones)
- Product cards with Norse symbol overlays
- Bilingual navigation (Icelandic/English)
- Member portal access button
- Contact form with runic icons

## 🚀 Getting Started

### Prerequisites
- Web server (Apache, Nginx, or local development server)
- Modern web browser
- Text editor for customization

### Installation
1. Clone or download the repository
2. Rename `Vefsíða.html` to `index.html`
3. Place `SleipnirLogo.png` in the images folder
4. Configure your web server to serve the files
5. Update contact form action URL for your backend

### Development Setup
```bash
# If using a simple Python server
python -m http.server 8000

# If using Node.js http-server
npx http-server -p 8000

# Then navigate to
http://localhost:8000
```

## 🔧 Configuration

### Language Toggle
The site supports Icelandic (default) and English. To implement the toggle:
```javascript
// Add to main.js
document.body.classList.toggle('lang-en');
```

### Member Portal
Protected area requires authentication implementation:
- Set up backend authentication
- Configure member access routes
- Implement session management

### Contact Form
Currently uses client-side validation. For production:
1. Set up backend form handler
2. Add CSRF protection
3. Implement email notification
4. Add database storage

## 📱 Responsive Breakpoints
- Desktop: 1024px and up
- Tablet: 768px - 1023px
- Mobile: 480px - 767px
- Small Mobile: Below 480px

## 🛡️ MC Traditions & Guidelines

### Color Rules (STRICT)
- **Black and Red ONLY**: No other colors permitted
- White/gray allowed for text contrast only
- All decorative elements must be black or red
- No blue, green, or other colors (breaks MC tradition)

### Imagery Guidelines
- No typical "outlaw" imagery (skulls, flames)
- Norse symbols and runes preferred
- Eight-legged horse motif as primary symbol
- Weathered textures (leather, metal) in black/red

### Content Tone
- Brotherhood-focused
- Honor and respect emphasized
- Inclusive but exclusive (members-only)
- Cultural sophistication over aggression

## 🔄 Future Enhancements

### Phase 2
- [ ] Full e-commerce integration
- [ ] Member authentication system
- [ ] Order tracking
- [ ] Inventory management
- [ ] Payment gateway

### Phase 3
- [ ] Event calendar
- [ ] Ride planning tools
- [ ] Photo gallery
- [ ] Member forums
- [ ] Blog/saga section

### Phase 4
- [ ] Mobile app
- [ ] Loyalty program
- [ ] International shipping
- [ ] Multi-chapter support

## 📞 Support

For technical support or questions:
- Email: info@sleipnirmc.is
- Phone: +354 666-8123

## 🏴 Brotherhood

Sleipnir MC Reykjavík - Riding through ljósanótt since 2015

*"Where the eight-legged steed carries warriors through the midnight sun"*

---

**Note**: This is a members-only store. Public access is limited to browsing. Full purchasing capabilities require verified membership in Sleipnir MC Reykjavík.

## ⚖️ License

© 2025 Sleipnir MC Reykjavík. All rights reserved.

Unauthorized use of club imagery, logos, or branding is strictly prohibited.