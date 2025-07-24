# Sleipnir MC Backend Scripts

This directory contains scripts for deploying and managing the Sleipnir MC backend infrastructure.

## Available Scripts

### 🚀 deploy.sh
Automated deployment script for Cloud Functions and Security Rules.

```bash
./scripts/deploy.sh
```

Features:
- Checks Firebase CLI installation
- Verifies Firebase authentication
- Installs function dependencies
- Deploys Cloud Functions
- Deploys Firestore Security Rules
- Deploys Firestore indexes (if present)

### 🔐 setup-admin.js
Interactive script to create admin users with custom claims.

```bash
./scripts/setup-admin.js
```

Features:
- Creates Firebase Auth user
- Sets admin custom claim
- Creates Firestore user document
- Logs admin creation
- Supports both emulator and production

**Note**: Requires service account key for production use. Download from Firebase Console > Project Settings > Service Accounts.

### 🧪 test-functions.sh
Basic testing script for deployed Cloud Functions.

```bash
./scripts/test-functions.sh
```

Features:
- Tests function connectivity
- Supports both emulator and production URLs
- Lists all deployed functions
- Provides testing guidance

## Quick Start

1. **Deploy everything**:
   ```bash
   ./scripts/deploy.sh
   ```

2. **Create admin user**:
   ```bash
   ./scripts/setup-admin.js
   ```

3. **Test deployment**:
   ```bash
   ./scripts/test-functions.sh
   ```

## Using with Emulator

1. Start emulator:
   ```bash
   firebase emulators:start
   ```

2. Access emulator UI: http://localhost:4000

3. Run scripts - they will automatically detect and use emulator

## Production Setup

1. Download service account key from Firebase Console
2. Save as `scripts/serviceAccountKey.json`
3. Add to `.gitignore` (never commit!)
4. Run scripts as normal

## Security Notes

- Never commit service account keys
- Limit admin account creation
- Regularly review admin activity logs
- Use strong passwords for admin accounts