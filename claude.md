# Sleipnir MC Reykjavík - Website Project

## Overview

A bilingual (Icelandic/English) website for Sleipnir MC Reykjavík, a motorcycle club founded in 2015. The site features a Norse/Viking-inspired design with a complete e-commerce system, member management, and admin panel.

**Club Motto**: "NO DRUGS, NO ATTITUDE"  
**Established**: 2015  
**Theme**: motorcycle culture

## Technology Stack

### Frontend
- **HTML5**: Semantic structure with bilingual content
- **CSS3**: Custom styling with Norse-inspired design
- **JavaScript (ES6+)**: Dynamic functionality and Firebase integration
- **Responsive Design**: Mobile-first approach

### Backend & Services
- **Firebase Authentication**: User login/registration system
- **Firestore Database**: Real-time NoSQL database
- **Firebase Storage**: Image and media storage
- **Firebase Security Rules**: Access control and data protection

### Fonts & Typography
- **Primary**: Cormorant Garamond (serif body text)
- **Headers**: Cinzel (display font for titles)
- **Accent**: Iceland (Norse-style decorative text)
- **Symbols**: Norse runes (ᚠᚢᚦᚨᚱᚲ etc.)

## Project Structure

```
Sleipnir1212aa/
├── index.html              # Homepage with hero section
├── shop.html               # E-commerce store
├── about.html              # Club information and member gallery
├── contact.html            # Contact form and information
├── admin.html              # Admin management panel
├── login.html              # User authentication
├── register.html           # User registration
├── orders.html             # Order management for users
├── verify-email.html       # Email verification page
├── auth-action.html        # Firebase auth actions handler
├── forgot-password.html    # Password reset
├── styles.css              # Main stylesheet
├── javascript/
│   ├── firebase-config.js  # Firebase configuration
│   ├── auth.js            # Authentication logic
│   ├── admin.js           # Admin panel functionality
│   ├── shop.js            # E-commerce functionality
│   └── language.js        # Bilingual support
├── Images/
│   ├── SleipnirLogo.png   # Club logo
│   └── HopMynd.png        # Group photo
├── firestore.rules        # Database security rules
└── storage.rules          # Storage security rules
```

## Key Features

### 🏠 Homepage (index.html)
- **Full-screen hero section** with Northern Lights animation
- **Club motto display** with the clubs styling
- **Call-to-action buttons** for shop and membership
- **Responsive design** with mobile optimization

### 🛒 E-commerce System (shop.html)
- **Product catalog** with category filtering
- **Image galleries** with lazy loading and navigation
- **Size selection** and inventory management
- **Shopping cart** with local storage
- **Member-only products** with access control
- **Pagination** for large product lists
- **Order placement** with Firebase integration

### 👥 Member Management
- **User registration** with membership requests
- **Email verification** system
- **Admin approval** workflow for new members
- **Member directory** with photos and details
- **Role-based access** (admin, member, customer)

### 🔧 Admin Panel (admin.html)
- **Product management** (add, edit, delete)
- **Member approval** system
- **Order management** with status updates
- **User search** and management
- **Display member** management for About page
- **Data export** functionality (CSV)
- **Image upload** with drag-and-drop

### 🌍 Bilingual Support
- **Icelandic (IS)** - Primary language
- **English (EN)** - Secondary language
- **Dynamic switching** with localStorage persistence
- **Page title updates** based on language
- **Content localization** throughout the site

## Design System

### Color Palette
``` css
--pure-black: #000000         /* Primary background */
--midnight-black: #0a0a0a     /* Secondary background */
--norse-black: #1a1a1a        /* Card backgrounds */
--charcoal: #2a2a2a           /* Borders and accents */
--mc-red: #cf2342             /* Brand primary */
--mc-red-hover: #e63856       /* Interactive states */
--dark-red: #990000           /* Dark accent */
--white: #ffffff              /* Primary text */
--gray: #888888               /* Secondary text */
```

### Typography Hierarchy
- **Hero Titles**: 72px Cinzel, uppercase, letter-spacing: 4px
- **Section Titles**: 48px Cinzel, uppercase, letter-spacing: 3px
- **Product Names**: 24px Cinzel, uppercase, letter-spacing: 2px
- **Body Text**: 16-18px Cormorant Garamond
- **UI Elements**: 14px Iceland, uppercase, letter-spacing: 2px

### Component Library
- **Buttons**: Red with hover animations and shadows
- **Cards**: Dark backgrounds with red accent borders
- **Forms**: Dark inputs with red focus states
- **Navigation**: Fixed header with backdrop blur
- **Modals**: Full-screen overlays with blur backgrounds

## Database Schema

### Collections

#### `products`
``` javascript
{
  nameIs: string,           // Icelandic name
  nameEn: string,           // English name
  description: string,      // Product description
  category: string,         // tshirt, hoodie, jacket, jeans, other
  price: number,            // Price in ISK
  images: array,            // Product images
  availableSizes: array,    // Available sizes
  membersOnly: boolean,     // Member-only product
  isNew: boolean,          // New product flag
  isPopular: boolean,      // Popular product flag
  createdAt: timestamp
}
```

#### `users`
``` javascript
{
  fullName: string,
  email: string,
  address: string,
  city: string,
  postalCode: string,
  role: string,             // 'customer', 'admin'
  isMember: boolean,
  memberRequestPending: boolean,
  emailVerified: boolean,
  createdAt: timestamp
}
```

#### `orders`
``` javascript
{
  userId: string,
  userEmail: string,
  userName: string,
  items: array,            // Order items with details
  totalAmount: number,     // Total in ISK
  status: string,          // 'pending', 'processing', 'completed'
  createdAt: timestamp
}
```

#### `displayMembers`
``` javascript
{
  name: string,
  role: string,            // Optional role (President, etc.)
  motorcycleType: string,
  joinDate: timestamp,
  photoUrl: string,
  isActive: boolean,
  displayOrder: number,
  createdAt: timestamp
}
```

## Authentication Flow

### Registration Process
1. **User fills registration form** with personal details
2. **Optional membership request** checkbox
3. **Firebase Auth account creation** with email/password
4. **Firestore profile creation** with additional data
5. **Email verification sent** automatically
6. **Redirect to verification page** with instructions

### Login Process
1. **Email/password authentication** via Firebase
2. **Firestore profile verification** (must exist)
3. **Email verification check** for protected pages
4. **Role-based redirects** (admin to admin panel)
5. **Session management** with cached user data

### Member Approval Workflow
1. **User registers** with membership request
2. **Admin reviews** in admin panel
3. **Admin approves/rejects** membership
4. **User gains access** to member-only content
5. **Member appears** in public directory (if added to displayMembers)

## E-commerce Features

### Product Management
- **Category-based organization** (T-shirts, Hoodies, Jeans, etc.)
- **Size variations** with availability tracking
- **Image galleries** with lazy loading
- **Member-only products** with access control
- **Inventory management** through admin panel

### Shopping Cart
- **Add to cart** with size selection
- **Quantity management** (increase/decrease)
- **Persistent storage** during session
- **Real-time total calculation** with ISK formatting
- **Cart sidebar** with floating cart button

### Order Processing
1. **Cart review** and checkout initiation
2. **User authentication** verification
3. **Order creation** in Firestore
4. **Email notification** (placeholder for cloud function)
5. **Order confirmation** with order number
6. **Admin notification** for processing

## Admin Features

### Product Management
- **Add new products** with multiple images
- **Edit existing products** with image updates
- **Delete products** with confirmation
- **Toggle popular status** for featured items
- **Bulk operations** and filtering

### Member Management
- **Approve membership requests** from registration
- **Remove member status** when needed
- **Manage display members** for About page
- **User search** across all accounts
- **Role management** and permissions

### Order Management
- **View pending orders** with customer details
- **Mark orders complete** when fulfilled
- **Export order data** to CSV
- **Delete orders** when necessary
- **Customer communication** tracking

## Security Implementation

### Firestore Rules
``` javascript
// Products: Read for all, write for admins only
match /products/{document=**} {
  allow read: if true;
  allow write: if isAdmin();
}

// Users: Read own profile, admins read all
match /users/{userId} {
  allow read: if request.auth.uid == userId || isAdmin();
  allow write: if request.auth.uid == userId || isAdmin();
}

// Orders: Users see own orders, admins see all
match /orders/{orderId} {
  allow read: if resource.data.userId == request.auth.uid || isAdmin();
  allow create: if request.auth != null;
  allow update, delete: if isAdmin();
}
```

### Authentication Security
- **Email verification** required for shop access
- **Role-based access control** throughout application
- **Admin route protection** with server-side verification
- **CSRF protection** via Firebase SDK
- **Input validation** on all forms

## Deployment & Configuration

### Firebase Setup
1. **Create Firebase project** in console
2. **Enable Authentication** with email/password
3. **Create Firestore database** with security rules
4. **Enable Storage** for images
5. **Configure custom domain** (optional)

### Environment Variables
```javascript
// firebase-config.js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Hosting Options
- **Firebase Hosting**: Integrated with Firebase services
- **GitHub Pages**: Static hosting for demo purposes
- **Netlify**: Easy deployment with form handling
- **Custom Server**: For advanced backend requirements

## Development Guidelines

### Code Style
- **Semantic HTML**: Use proper elements for accessibility
- **BEM CSS**: Block-Element-Modifier naming convention
- **ES6+ JavaScript**: Modern syntax with async/await
- **Mobile-first**: Responsive design approach
- **Performance**: Lazy loading and optimization

### File Organization
- **Separate concerns**: HTML, CSS, JS in appropriate files
- **Modular JavaScript**: Feature-based file organization
- **Asset optimization**: Compressed images and minified code
- **Documentation**: Inline comments for complex logic

### Testing Considerations
- **Cross-browser compatibility**: Chrome, Firefox, Safari, Edge
- **Mobile responsiveness**: iOS Safari, Android Chrome
- **Authentication flows**: Registration, login, password reset
- **E-commerce functionality**: Cart, checkout, orders
- **Admin panel operations**: CRUD operations, permissions

## Maintenance & Updates

### Regular Tasks
- **Security updates**: Firebase SDK and dependencies
- **Content updates**: Product catalog and member photos
- **Performance monitoring**: Load times and user experience
- **Backup procedures**: Firestore exports and image backups

### Feature Roadmap
- **Email notifications**: Cloud Functions for order emails
- **Payment integration**: Stripe or PayPal for online payments
- **Inventory management**: Stock tracking and low-stock alerts
- **Member portal**: Private member-only section
- **Event management**: Club events and motorcycle rallies

## Contact & Support

**Club Information:**
- **Location**: Reykjavík, Iceland
- **Email**: sleipnirmcreykjavik@gmail.com
- **Phone**: +354 581-2345
- **Facebook**: @sleipnirmcreykjavik

**Development Notes:**


---

