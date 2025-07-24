v# Backend Deployment Guide - Sleipnir MC

This guide covers the deployment of Cloud Functions, Security Rules, and initial admin setup for the Sleipnir MC website.

## Prerequisites

1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Authenticated with Firebase (`firebase login`)
3. Firebase project created and selected

## Step 1: Initialize Firebase Project

If not already done, initialize your Firebase project:

```bash
firebase init
```

Select the following features:
- Firestore
- Functions
- Hosting

## Step 2: Deploy Cloud Functions

The following Cloud Functions are implemented and ready for deployment:

### Admin Functions
- `validateAdminAction` - Validates admin permissions with comprehensive logging
- `deleteUser` - Comprehensive user deletion with data archival options
- `setAdminClaim` - Manages admin custom claims
- `syncAdminClaims` - Syncs Firestore roles with custom claims

### Monitoring Functions
- `logAuthEvents` - Logs user creation events
- `logUserDeletion` - Logs user deletion events
- `testEmailVerification` - Tests email verification flow
- `checkEmailDeliveryHealth` - Scheduled health check for email delivery

### Deploy Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Step 3: Deploy Security Rules

Deploy the comprehensive Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

The rules include:
- Admin token verification (`hasAdminToken()`)
- Role-based access control
- User data protection
- Audit logging protection

## Step 4: Test with Firebase Emulator

Before deploying to production, test with the emulator suite:

```bash
# Start all emulators
firebase emulators:start

# Or start specific emulators
firebase emulators:start --only functions,firestore,auth
```

### Test Admin Functions

1. Create a test user in the Auth emulator
2. Set admin custom claim using the emulator UI or Admin SDK
3. Test function calls from your frontend

## Step 5: Create Initial Admin User

### Option 1: Using Firebase Console

1. Go to Firebase Console > Authentication
2. Create a new user
3. Note the user's UID
4. Run the following script to set admin claim

### Option 2: Using Admin SDK Script

Create `scripts/setupAdmin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setupInitialAdmin(email, password) {
  try {
    // Create user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true
    });
    
    console.log('User created:', userRecord.uid);
    
    // Set admin custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true
    });
    
    // Create Firestore user document
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'admin',
      members: true,
      adminClaimSet: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Admin user setup complete');
    
  } catch (error) {
    console.error('Error setting up admin:', error);
  }
}

// Usage
setupInitialAdmin('admin@sleipnirmc.com', 'secure-password-here');
```

Run the script:
```bash
node scripts/setupAdmin.js
```

## Step 6: Verify Deployment

### Check Functions Deployment
```bash
firebase functions:list
```

### Test Admin Functions

Use the Firebase Console or your frontend to test:

1. **Validate Admin Action**
   - Should succeed for users with admin claim
   - Should log unauthorized attempts

2. **Delete User**
   - Should delete non-admin users
   - Should archive data if requested
   - Should prevent self-deletion and admin deletion

3. **Set Admin Claim**
   - Should allow initial setup or admin-only updates
   - Should sync with Firestore

## Security Best Practices

1. **Admin Management**
   - Limit number of admin accounts
   - Regularly audit admin activity logs
   - Use strong passwords and 2FA

2. **Monitoring**
   - Check `adminActivityLog` collection regularly
   - Monitor `email_logs` for authentication issues
   - Review scheduled function logs

3. **Data Protection**
   - Enable backup for Firestore
   - Test user deletion with archival
   - Verify security rules with emulator

## Troubleshooting

### Functions Not Deploying
- Check Node.js version compatibility
- Verify `package.json` dependencies
- Check Firebase project permissions

### Security Rules Errors
- Test rules in Firebase Console Rules Playground
- Check for syntax errors
- Verify function names match

### Admin Claims Not Working
- Ensure custom claims are set correctly
- Check token refresh (may take up to 1 hour)
- Force token refresh in frontend

## Production Checklist

- [ ] All functions deployed successfully
- [ ] Security rules tested and deployed
- [ ] Initial admin user created
- [ ] Email verification tested
- [ ] Admin functions tested
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review function logs: `firebase functions:log`
3. Test with emulator suite
4. Check adminActivityLog collection for security events