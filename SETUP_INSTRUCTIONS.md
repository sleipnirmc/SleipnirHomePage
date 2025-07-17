# Sleipnir MC Shop - MVP Setup Instructions

## Quick Start Guide

### Prerequisites
1. Firebase account
2. Web server or Firebase Hosting

### 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. The project `sleipnirmcshop` should already be configured
3. Ensure Firestore Database is enabled
4. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 2. Create First Admin User
1. Open `Sleipnir1212aa/setup-admin.html` in your browser
2. Enter admin credentials:
   - Email
   - Password (min 6 characters)
   - Display Name
3. Click "Create Admin Account"
4. **IMPORTANT**: Delete `setup-admin.html` after creating the admin

### 3. Testing the System

#### Admin Functions:
1. Go to `/admin.html`
2. Login with admin credentials
3. Test features:
   - **View Users**: See all registered users
   - **Manage Members**: Toggle member status for users
   - **Manage Products**: Add/Edit/Delete products with images
   - **View Orders**: See pending and completed orders
   - **Complete Orders**: Mark orders as delivered

#### User Functions:
1. Go to `/shop.html`
2. Create a regular user account
3. Test:
   - Browse products
   - Add to cart
   - Place order

#### Member Functions:
1. Admin makes user a member from admin panel
2. Member can now see member-only products
3. Test ordering member-only items

### 4. Deploy to Firebase Hosting

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting (if not done)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### 5. Current Features

✅ **Authentication**
- User signup/login
- Email verification
- Admin authentication

✅ **Member Management**
- Admin can approve members
- Members see exclusive products

✅ **Product Management**
- Add products with multiple images
- Edit/Delete products
- Size options
- Member-only products

✅ **Order System**
- Shopping cart
- Order placement
- Admin order management
- Order completion tracking

✅ **Security**
- Firebase security rules
- Admin-only access control
- Secure authentication

## Important Files

- `/admin.html` - Admin panel (secure)
- `/shop.html` - Shop page
- `/login.html` - Login/Signup page
- `/javascript/authentication.js` - Auth system
- `/javascript/shop.js` - Shopping functionality
- `/javascript/admin.js` - Admin functions
- `/firestore.rules` - Security rules

## Notes

- Orders are stored in Firestore, email notifications would require Cloud Functions (not included in MVP)
- Product images are stored as base64 in Firestore (suitable for small club, not scalable)
- This is a basic MVP - additional features like payment processing would need to be added

## Troubleshooting

1. **Can't access admin panel**: Make sure you're logged in as admin
2. **Products not showing**: Check Firebase security rules are deployed
3. **Orders not saving**: Ensure user is logged in before ordering

## Next Steps

For production use:
1. Set up Firebase Cloud Functions for email notifications
2. Use Firebase Storage for images instead of base64
3. Add payment processing
4. Implement proper error handling and loading states
5. Add order history for users