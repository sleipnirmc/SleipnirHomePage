# Admin Setup Guide for Sleipnir MC Website

## Initial Admin Setup

### Method 1: Using Firebase Console (Recommended for First Admin)

1. **Create the first admin user:**
   - Register a new account on the website normally
   - Note the email address used

2. **Go to Firebase Console:**
   - Navigate to your Firebase project
   - Go to Firestore Database
   - Find the `users` collection
   - Locate the user document by email
   - Click on the document to edit
   - Change the `role` field from `customer` to `admin`
   - Save the changes

3. **Login:**
   - The user can now log in and access the admin panel

### Method 2: Using the Firebase Config Script

1. **Open the browser console** on any page of your website
2. **Run this command** (update email and password):
```javascript
createInitialAdmin();
```
This will create an admin user with:
- Email: admin@sleipnirmc.is
- Password: Admin123! (change immediately after first login)

## Granting Admin Access to Other Users

Once you have at least one admin account:

1. **Log in as an admin**
2. **Go to the Admin Panel** (click your username → Admin Panel)
3. **Scroll to "Admin Management" section**
4. **Enter the email** of the user you want to make an admin
5. **Click "Grant Admin Access"**

### Requirements for granting admin access:
- The user must already have a registered account
- You must know their exact email address
- Only existing admins can grant admin access

## Admin Permissions

Admins have full access to:
- ✓ Product management (add, edit, delete)
- ✓ Order management and status updates
- ✓ Member approval/rejection
- ✓ User management
- ✓ Grant/revoke admin access
- ✓ View all contact messages
- ✓ Access migration tools

## Removing Admin Access

1. **Go to Admin Panel → Admin Management**
2. **Find the admin** in the "Current Admins" list
3. **Click "Remove Admin Access"**
4. **Confirm the action**

**Note:** You cannot remove your own admin access (safety feature)

## Security Best Practices

1. **Limit admin accounts** - Only give admin access to trusted individuals
2. **Use strong passwords** - Require all admins to use secure passwords
3. **Regular audits** - Periodically review who has admin access
4. **Remove unused admins** - Remove admin access when no longer needed

## Troubleshooting

### Can't access admin panel?
- Ensure your account has `role: 'admin'` in Firestore
- Try logging out and back in
- Clear browser cache

### Admin panel not loading?
- Check browser console for errors
- Ensure Firebase Authentication is properly configured
- Verify Firestore security rules allow admin access

### Can't grant admin access?
- Ensure the user exists in the system
- Check you're using the correct email address
- Verify you have admin privileges

## Database Structure

Admin users in Firestore have:
```json
{
  "email": "user@example.com",
  "fullName": "User Name",
  "role": "admin",
  "adminGrantedAt": "timestamp",
  "adminGrantedBy": "uid of granting admin"
}
```

Regular users have:
```json
{
  "email": "user@example.com",
  "fullName": "User Name",
  "role": "customer"
}
```