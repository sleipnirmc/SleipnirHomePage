# User Deletion Feature Documentation

## Overview

The admin panel now includes a comprehensive user deletion feature with two operational modes:
1. **Member Management Mode** (default) - Manage member status
2. **User Removal Mode** - Permanently delete user accounts

## Security Implementation

### Backend Security (`functions/index.js`)

The `deleteUser` function implements multiple security layers:

1. **Token-based Authentication**: Requires admin custom claim (`context.auth.token.admin`)
2. **Self-deletion Prevention**: Admins cannot delete their own accounts
3. **Admin Protection**: Admin users cannot be deleted
4. **Activity Logging**: All deletion attempts and successful deletions are logged
5. **Data Archival**: User data and orders are archived before deletion

### Data Handling Strategy

When a user is deleted:
1. User data is archived to `archivedUsers` collection
2. User orders are archived to `archivedOrders` collection
3. Original orders are either deleted (if archived) or anonymized
4. User is removed from Firebase Authentication
5. All actions are logged with timestamps and admin details

## Frontend Implementation

### UI Components (`admin.html`)

1. **Toggle Switch**: Located in the Users section header
   - Green (unchecked): Member Management Mode
   - Red (checked): User Removal Mode

2. **Action Buttons**:
   - Member Mode: "Make Member" / "Remove Member" buttons
   - Removal Mode: "Remove User" button (red)

3. **Visual Indicators**:
   - Mode label changes color based on selection
   - Admin users show "Admin User" instead of action buttons

### Safety Features

1. **Double Confirmation**:
   - Initial warning dialog with detailed consequences
   - Email verification requirement (must type user's email)

2. **Loading States**: Button shows "Deleting..." during operation

3. **Error Handling**: Comprehensive error messages in both languages

## Usage Instructions

### For Admins

1. Navigate to Admin Panel → Users section
2. Toggle the switch to "User Removal Mode"
3. Click "Remove User" button next to the target user
4. Read the warning message carefully
5. Type the user's email address to confirm
6. User will be deleted and data archived

### Important Notes

- Admin users cannot be deleted
- You cannot delete your own account
- All deletions are permanent
- User data is archived for compliance/recovery
- All actions are logged for audit trails

## Technical Details

### Firebase Functions

```javascript
// Call hierarchy:
validateAdminAction() → deleteUser() → 
  - Archive user data
  - Archive orders
  - Delete from Firestore
  - Delete from Auth
  - Log activity
```

### Client-Side Functions

```javascript
// Authentication flow:
deleteUserAccount() → sleipnirAuth.deleteUser() → 
  - Validate admin
  - Call Firebase function
  - Handle response
  - Update UI
```

## Monitoring

Check the following Firestore collections for audit logs:
- `adminActivityLog`: All admin actions including deletions
- `archivedUsers`: Deleted user profiles
- `archivedOrders`: Orders from deleted users

## Error Scenarios

1. **Unauthorized Access**: Non-admins attempting deletion
2. **Self-Deletion**: Admin trying to delete own account
3. **Admin Deletion**: Attempting to delete another admin
4. **Network Errors**: Connection issues during deletion
5. **Partial Failure**: Auth deletion fails after Firestore deletion

All scenarios are handled with appropriate error messages and logging.