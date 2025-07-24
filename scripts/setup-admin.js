#!/usr/bin/env node

/**
 * Sleipnir MC Admin Setup Script
 * Creates initial admin user with custom claims
 */

const admin = require('firebase-admin');
const readline = require('readline');
const { promisify } = require('util');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`)
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

// Initialize Firebase Admin
async function initializeApp() {
  try {
    // Try to initialize with default credentials (for emulator or deployed functions)
    admin.initializeApp();
    log.success('Firebase Admin initialized with default credentials');
  } catch (error) {
    log.warning('Could not initialize with default credentials');
    
    // Check if service account key exists
    const serviceAccountPath = './serviceAccountKey.json';
    const fs = require('fs');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      log.success('Firebase Admin initialized with service account');
    } else {
      log.error('No service account key found. Please download it from Firebase Console:');
      log.info('1. Go to Firebase Console > Project Settings > Service Accounts');
      log.info('2. Click "Generate New Private Key"');
      log.info('3. Save as "serviceAccountKey.json" in the scripts directory');
      process.exit(1);
    }
  }
}

async function checkExistingAdmins() {
  try {
    const adminsSnapshot = await admin.firestore()
      .collection('users')
      .where('role', '==', 'admin')
      .get();
    
    if (!adminsSnapshot.empty) {
      log.warning(`Found ${adminsSnapshot.size} existing admin(s):`);
      adminsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.email} (${doc.id})`);
      });
      
      const proceed = await question('\nDo you want to create another admin? (y/N): ');
      if (proceed.toLowerCase() !== 'y') {
        process.exit(0);
      }
    } else {
      log.info('No existing admins found. This will be the first admin user.');
    }
  } catch (error) {
    log.error(`Error checking existing admins: ${error.message}`);
  }
}

async function createAdminUser() {
  try {
    console.log('\n🔐 Sleipnir MC Admin Setup\n');
    
    // Check for existing admins
    await checkExistingAdmins();
    
    // Get admin details
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 6 characters): ');
    
    if (!email || !password) {
      log.error('Email and password are required');
      process.exit(1);
    }
    
    if (password.length < 6) {
      log.error('Password must be at least 6 characters');
      process.exit(1);
    }
    
    log.info('Creating admin user...');
    
    // Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        emailVerified: true // Admin users are pre-verified
      });
      log.success(`User created with UID: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        log.warning('User already exists, fetching existing user...');
        userRecord = await admin.auth().getUserByEmail(email);
        log.info(`Found existing user with UID: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }
    
    // Set admin custom claim
    log.info('Setting admin custom claim...');
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true
    });
    log.success('Admin custom claim set');
    
    // Create or update Firestore user document
    log.info('Creating Firestore user document...');
    const userDoc = {
      email: email,
      role: 'admin',
      members: true,
      adminClaimSet: true,
      emailVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await admin.firestore().collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
    log.success('Firestore user document created');
    
    // Log admin creation
    await admin.firestore().collection('adminActivityLog').add({
      type: 'admin_created',
      adminEmail: email,
      adminUid: userRecord.uid,
      createdBy: 'setup_script',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('\n' + '='.repeat(50));
    log.success('Admin user setup complete!');
    console.log('='.repeat(50));
    console.log('\nAdmin Details:');
    console.log(`Email: ${email}`);
    console.log(`UID: ${userRecord.uid}`);
    console.log('\n⚡ The user can now log in with admin privileges');
    console.log('\n📝 Note: It may take up to 1 hour for custom claims to propagate.');
    console.log('    Force token refresh in your app for immediate access.');
    
  } catch (error) {
    log.error(`Failed to create admin user: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    await initializeApp();
    await createAdminUser();
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();