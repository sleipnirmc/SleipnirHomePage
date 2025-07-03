# Sleipnir MC Authentication Migration Guide

## Overview

This migration system helps clean up authentication inconsistencies in the Sleipnir MC website, including:
- Orphaned auth accounts (auth exists but no Firestore profile)
- Orphaned profiles (profile exists but no auth)
- Duplicate accounts
- Missing or incorrect field values
- Email verification status mismatches

## Components

### 1. Client-Side Migration (`migrate-auth.js`)

**Location**: `/migrate-auth.js`
**Usage**: Run from admin panel or browser console

#### Features:
- Find duplicate profiles
- Fix missing fields (emailVerified, role, createdAt)
- Mark old unverified accounts for reverification
- Generate detailed migration report
- Dry-run mode for safety

#### How to Use:

1. **From Admin Panel**:
   - Log in as admin
   - Click "Options" → "🔧 Run Auth Migration"
   - Confirm to run in dry-run mode

2. **From Browser Console**:
   ```javascript
   // Check current configuration
   sleipnirAuthMigration.config
   
   // Run in dry-run mode (default)
   await sleipnirAuthMigration.run()
   
   // Run in live mode (makes actual changes)
   sleipnirAuthMigration.config.dryRun = false
   await sleipnirAuthMigration.run()
   ```

#### Configuration Options:
```javascript
MIGRATION_CONFIG = {
    dryRun: true,              // Set to false to apply changes
    batchSize: 100,            // Firestore batch size
    createPlaceholderProfiles: true,  // Create profiles for orphaned auth
    markForReverification: true,      // Mark old unverified accounts
    cleanDuplicates: true,            // Remove duplicate profiles
    generateReport: true,             // Download JSON report
    reportFormat: 'json'              // Report format
}
```

### 2. Server-Side Migration (`migrate-auth-admin.js`)

**Location**: `/migrate-auth-admin.js`
**Usage**: Deploy as Firebase Cloud Functions

#### Features:
- Full auth user listing (requires Admin SDK)
- Delete orphaned auth accounts
- Create missing profiles for auth accounts
- Send bulk verification emails
- Scheduled consistency checks

#### Deployment:
```bash
# Copy to functions directory
cp migrate-auth-admin.js functions/

# Deploy functions
firebase deploy --only functions
```

#### Available Functions:

1. **runAuthMigration**
   ```javascript
   // Call from client
   const migration = firebase.functions().httpsCallable('runAuthMigration');
   const result = await migration({ 
       dryRun: true,
       options: {
           createProfiles: true,
           deleteOrphanedProfiles: false,
           deleteDuplicateAuth: false
       }
   });
   ```

2. **sendBulkVerificationEmails**
   ```javascript
   const sendEmails = firebase.functions().httpsCallable('sendBulkVerificationEmails');
   const result = await sendEmails({ 
       includeAll: true  // Send to all unverified users
   });
   ```

3. **cleanOrphanedAccount**
   ```javascript
   const clean = firebase.functions().httpsCallable('cleanOrphanedAccount');
   const result = await clean({ 
       uid: 'user-id',
       action: 'create_profile'  // or 'delete'
   });
   ```

## Migration Process

### Step 1: Analyze Current State (Dry Run)

1. Log into admin panel
2. Run client-side migration in dry-run mode
3. Review the downloaded report for:
   - Total users and profiles
   - Duplicate accounts
   - Missing fields
   - Unverified accounts

### Step 2: Clean Up Duplicates

1. Review duplicate profiles in the report
2. Verify which profiles to keep (oldest by default)
3. Run migration with `dryRun: false` to remove duplicates

### Step 3: Fix Missing Fields

The migration automatically fixes:
- Missing `emailVerified` field (set to false)
- Missing `role` field (set to 'customer')
- Missing `createdAt` timestamp
- Marks old unverified accounts for reverification

### Step 4: Handle Orphaned Accounts (Requires Cloud Functions)

1. Deploy the admin Cloud Functions
2. Run server-side migration to:
   - Find auth accounts without profiles
   - Create placeholder profiles
   - Delete orphaned profiles

### Step 5: Send Verification Emails

For accounts marked for reverification:
```javascript
// From admin panel console
const sendEmails = firebase.functions().httpsCallable('sendBulkVerificationEmails');
await sendEmails({ includeAll: true });
```

## Report Structure

The migration generates a detailed JSON report:

```json
{
  "metadata": {
    "version": "1.0.0",
    "mode": "DRY_RUN",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T10:01:30Z",
    "durationSeconds": 90,
    "performedBy": "admin@sleipnirmc.is"
  },
  "summary": {
    "totalUsers": 150,
    "duplicatesFound": 5,
    "duplicatesRemoved": 0,
    "markedForReverification": 12,
    "errors": 0
  },
  "actions": {
    "duplicatesFound": [...],
    "reverificationMarked": [...],
    "fieldsUpdated": [...]
  },
  "recommendations": [...]
}
```

## Safety Measures

1. **Always run in dry-run mode first**
2. **Review the report before making changes**
3. **Backup Firestore before live migration**
4. **Test with a small batch first**
5. **Monitor error logs during migration**

## Troubleshooting

### Common Issues:

1. **"You must be logged in to run migrations"**
   - Ensure you're logged in as an admin user

2. **"Permission denied" errors**
   - Check Firestore security rules
   - Ensure admin role is properly set

3. **Timeout errors**
   - Reduce batch size in configuration
   - Run migration in smaller chunks

4. **"Cannot delete auth accounts"**
   - This requires Admin SDK (Cloud Functions)
   - Deploy and use server-side migration

### Monitoring

After migration:
1. Check Email Monitoring section in admin panel
2. Verify user count matches expectations
3. Test login for a few accounts
4. Monitor error logs for failed logins

## Best Practices

1. **Schedule Regular Checks**: Use the scheduled Cloud Function for weekly consistency checks

2. **Document Changes**: Keep migration reports for audit trail

3. **Communicate**: Notify users if they need to reverify emails

4. **Test Authentication**: After migration, test:
   - New user registration
   - Login flow
   - Email verification
   - Password reset

## Emergency Rollback

If issues occur:

1. **Firestore Backup**: Restore from pre-migration backup
2. **Auth Accounts**: Cannot be rolled back (use caution with deletions)
3. **Report Issues**: Check migration report for specific errors
4. **Manual Fixes**: Use Firebase Console for individual account fixes

## Support

For issues or questions:
- Check migration reports in `/migrationReports` collection
- Review browser console for detailed logs
- Contact development team with report file

---

**Important**: This migration tool makes significant changes to authentication data. Always test thoroughly in a development environment before running on production data.