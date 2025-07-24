# Member Status Management Guide

## Overview
This guide explains how to manage member status in the Sleipnir MC website system. The system has been enhanced with diagnostic tools, bulk management capabilities, and automatic syncing features to ensure real club members are properly recognized.

## Understanding the Issue
The member status system checks the `members` field in user documents. This field can be stored in different formats:
- Boolean: `true` or `false`
- String: `'true'` or `'false'`
- Number: `1` or `0`
- String number: `'1'` or `'0'`

Real club members may not have their `members` field properly set, preventing them from seeing member-only products.

## Immediate Solutions for Users

### 1. Check Your Member Status
In the browser console (F12 → Console), run:
```javascript
sleipnirAuth.checkMemberStatus()
```

This will display:
- Your user ID and email
- Current member status value and type
- Whether you're recognized as a member
- If you have a profile in displayMembers collection

### 2. Fix Your Member Status
If you're a real member but not recognized:

**Option A - Use the UI:**
- Go to the shop page
- Look for the member status indicator at the top
- Click "Fix Member Status" button

**Option B - Use Console:**
```javascript
sleipnirAuth.fixMemberStatus(true)
```

This will:
- Set your members field to `true`
- Refresh the page automatically
- Grant you access to member-only products

## Admin Management Tools

### 1. Individual Member Management
In the admin panel under "Registered Users":
- Toggle between "Member Management Mode" and "User Removal Mode"
- Click "Make Member" or "Remove Member" for individual users
- Filter by members/non-members
- Search by name or email

### 2. Bulk Member Management
Click "Bulk Member Management" button to:

**Add Members by Email List:**
1. Enter email addresses (one per line)
2. Click "Add Members"
3. System will:
   - Find existing users with those emails
   - Update their member status
   - Show results (updated, not found, already members, failed)

**Add Members by Domain:**
1. Enter email domain (e.g., @sleipnirmc.is)
2. Click "Add Members"
3. All users with that email domain become members

### 3. Sync Real Members
Click "Sync Real Members" button to:
1. Analyze the displayMembers collection (member profiles)
2. Find all users with profiles there
3. Update their member status to `true`
4. Show sync results

This ensures all real club members with profiles are recognized as members.

## Data Structure

### User Document (`users` collection)
```javascript
{
  email: "user@example.com",
  displayName: "John Doe",
  members: true,  // This field determines member status
  role: "user",   // or "admin"
  createdAt: timestamp,
  lastLogin: timestamp,
  // Additional fields for sync tracking:
  memberStatusSyncedAt: timestamp,
  memberStatusSyncReason: "Synced from displayMembers collection"
}
```

### Display Member Profile (`displayMembers` collection)
```javascript
{
  userId: "firebase-user-id",  // Links to users collection
  name: "John Doe",
  title: "Road Captain",
  joinDate: timestamp,
  motorcycleType: "Harley-Davidson",
  // ... other profile fields
}
```

## Best Practices

1. **Regular Syncing**: Run "Sync Real Members" periodically to ensure new members are recognized
2. **Data Consistency**: Always use boolean `true` for the members field
3. **Verification**: After making someone a member, verify they can see member-only products
4. **Documentation**: Keep a list of member email domains for bulk management

## Troubleshooting

### Member Not Recognized
1. Check their member status with diagnostic tool
2. Verify email is correct in system
3. Use fix member status function
4. If still issues, check if they have a displayMembers profile

### Bulk Update Issues
- **Users not found**: Verify email addresses are correct
- **Update failed**: Check Firebase permissions
- **Already members**: No action needed

### Sync Issues
- **No profiles found**: Check displayMembers collection exists
- **Update failed**: Check Firebase rules allow updates
- **Partial success**: Review failed user IDs in console

## Security Considerations

1. Only admins can change member status
2. All member status changes are logged with timestamps
3. Users can only fix their own member status (not others)
4. Bulk operations require admin authentication

## Future Enhancements

Consider implementing:
1. Automatic member status based on email verification
2. Member expiration dates
3. Member tier levels (prospect, full member, officer)
4. Automated welcome emails for new members
5. Integration with payment systems for membership fees