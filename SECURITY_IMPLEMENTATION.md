# Security Implementation Guide

This guide explains the security hardening changes implemented for the Sleipnir MC website.

## Overview

Three major security enhancements have been implemented:

1. **Server-side Admin Validation** - Token-based authentication using Firebase Custom Claims
2. **Enhanced Firestore Security Rules** - Dual validation with tokens and roles
3. **Environment Configuration** - Secure handling of Firebase configuration

## 1. Server-Side Admin Validation

### New Firebase Functions

#### `validateAdminAction`
- Validates admin actions using custom claims (`context.auth.token.admin`)
- Logs all admin activities and unauthorized access attempts
- Returns success only for token-verified admins

Usage example:
```javascript
const validateAdmin = firebase.functions().httpsCallable('validateAdminAction');
const result = await validateAdmin({ 
  action: 'updateProduct',
  details: { productId: 'xyz' }
});
```

#### `setAdminClaim`
- Sets or removes admin custom claims for users
- Allows initial setup when no admins exist
- Requires existing admin privileges after initial setup

Usage example:
```javascript
const setAdmin = firebase.functions().httpsCallable('setAdminClaim');
await setAdmin({ 
  targetUserId: 'user123',
  setAdmin: true 
});
```

#### `syncAdminClaims`
- Migrates existing Firestore role-based admins to custom claims
- One-time migration tool for existing deployments

## 2. Enhanced Firestore Security Rules

### Key Changes

- **`isAdmin()`** - Now checks both custom claims and Firestore roles
- **`hasAdminToken()`** - Strict validation for admin token only
- **User document updates** - Enhanced to prevent privilege escalation

### Security Flow

1. Regular users can update their own data (except role/member status)
2. Only token-verified admins can modify sensitive fields
3. Backward compatibility maintained for existing role-based admins

## 3. Environment Configuration

### Setup Instructions

1. Copy `.env.template` to `.env`:
   ```bash
   cp .env.template .env
   ```

2. Fill in your Firebase configuration values in `.env`

3. Choose implementation approach in `firebase-config.js`:
   - **Option 1**: Direct configuration (current, suitable for public apps)
   - **Option 2**: Build-time injection (requires bundler)
   - **Option 3**: Runtime loading (for dynamic environments)

### Security Best Practices

- Never commit `.env` files to version control
- Use Firebase Security Rules as primary security layer
- Client-side API keys are public by design - security comes from rules
- Keep service account keys server-side only

## Migration Steps for Existing Deployments

1. Deploy the updated Firebase Functions
2. Deploy the updated Firestore Security Rules
3. Run the `syncAdminClaims` function to migrate existing admins
4. Test admin functionality with new token-based validation
5. Update client-side code to use `validateAdminAction` for sensitive operations

## Testing Admin Access

```javascript
// Check if current user has admin token
const idTokenResult = await firebase.auth().currentUser.getIdTokenResult();
const isAdmin = idTokenResult.claims.admin === true;

// Validate admin action
if (isAdmin) {
  const validate = firebase.functions().httpsCallable('validateAdminAction');
  const result = await validate({ action: 'testAccess' });
  console.log('Admin validated:', result.data);
}
```

## Security Monitoring

Admin activities are logged to the `adminActivityLog` collection:
- Successful admin actions
- Unauthorized access attempts
- Admin claim grants/revocations
- Sync operations

Review these logs regularly for security monitoring.