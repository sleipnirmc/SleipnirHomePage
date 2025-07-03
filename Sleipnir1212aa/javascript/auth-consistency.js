// Authentication Consistency Management
// Tools to maintain database consistency between Firebase Auth and Firestore

import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  deleteUser,
  reload
} from 'firebase/auth';
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';

// Consistency check configuration
const CONSISTENCY_CONFIG = {
  checkInterval: 24 * 60 * 60 * 1000, // 24 hours
  batchSize: 500, // Firestore batch limit
  maxOrphanedAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  autoCheckEnabled: true,
  logInconsistencies: true
};

// Inconsistency types
const InconsistencyType = {
  ORPHANED_AUTH: 'orphaned_auth',
  ORPHANED_PROFILE: 'orphaned_profile',
  MISMATCHED_EMAIL: 'mismatched_email',
  MISMATCHED_VERIFICATION: 'mismatched_verification',
  MISSING_REQUIRED_FIELDS: 'missing_required_fields'
};

// Check authentication consistency across the system
export async function checkAuthConsistency(options = {}) {
  const {
    includeDetails = true,
    maxUsers = 1000,
    checkProfiles = true
  } = options;
  
  console.log('Starting authentication consistency check...');
  
  const inconsistencies = {
    orphanedAuth: [],
    orphanedProfiles: [],
    mismatchedEmails: [],
    mismatchedVerification: [],
    missingFields: []
  };
  
  try {
    // Note: Client-side SDK has limitations
    // In production, this would be done via Admin SDK in Cloud Functions
    
    if (checkProfiles) {
      // Check Firestore profiles
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), limit(maxUsers))
      );
      
      for (const userDoc of usersSnapshot.docs) {
        const profile = userDoc.data();
        const userId = userDoc.id;
        
        // Check for required fields
        const requiredFields = ['email', 'fullName', 'role', 'createdAt'];
        const missingFields = requiredFields.filter(field => !profile[field]);
        
        if (missingFields.length > 0) {
          inconsistencies.missingFields.push({
            userId,
            email: profile.email,
            missingFields,
            type: InconsistencyType.MISSING_REQUIRED_FIELDS
          });
        }
        
        // Check email verification status consistency
        if (auth.currentUser && auth.currentUser.uid === userId) {
          if (profile.emailVerified !== auth.currentUser.emailVerified) {
            inconsistencies.mismatchedVerification.push({
              userId,
              email: profile.email,
              authVerified: auth.currentUser.emailVerified,
              profileVerified: profile.emailVerified,
              type: InconsistencyType.MISMATCHED_VERIFICATION
            });
          }
        }
      }
    }
    
    // Log results
    const totalInconsistencies = 
      inconsistencies.orphanedAuth.length +
      inconsistencies.orphanedProfiles.length +
      inconsistencies.mismatchedEmails.length +
      inconsistencies.mismatchedVerification.length +
      inconsistencies.missingFields.length;
    
    console.log(`Consistency check complete. Found ${totalInconsistencies} inconsistencies.`);
    
    if (CONSISTENCY_CONFIG.logInconsistencies && totalInconsistencies > 0) {
      await logInconsistencies(inconsistencies);
    }
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: totalInconsistencies,
        orphanedAuth: inconsistencies.orphanedAuth.length,
        orphanedProfiles: inconsistencies.orphanedProfiles.length,
        mismatchedEmails: inconsistencies.mismatchedEmails.length,
        mismatchedVerification: inconsistencies.mismatchedVerification.length,
        missingFields: inconsistencies.missingFields.length
      },
      details: includeDetails ? inconsistencies : null
    };
    
  } catch (error) {
    console.error('Error checking auth consistency:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Reconcile authentication accounts and fix inconsistencies
export async function reconcileAuthAccounts(options = {}) {
  const {
    dryRun = false,
    fixMissingFields = true,
    fixVerificationStatus = true,
    createMissingProfiles = true
  } = options;
  
  console.log(`Starting account reconciliation${dryRun ? ' (DRY RUN)' : ''}...`);
  
  const results = {
    profilesCreated: 0,
    fieldsFixed: 0,
    verificationFixed: 0,
    errors: []
  };
  
  try {
    // Check for inconsistencies
    const checkResult = await checkAuthConsistency({ includeDetails: true });
    
    if (!checkResult.success || !checkResult.details) {
      throw new Error('Failed to check consistency');
    }
    
    const { details: inconsistencies } = checkResult;
    
    // Fix missing required fields
    if (fixMissingFields && inconsistencies.missingFields.length > 0) {
      for (const issue of inconsistencies.missingFields) {
        try {
          if (!dryRun) {
            const updates = {};
            
            // Add default values for missing fields
            if (issue.missingFields.includes('role')) {
              updates.role = 'customer';
            }
            if (issue.missingFields.includes('createdAt')) {
              updates.createdAt = serverTimestamp();
            }
            if (issue.missingFields.includes('fullName')) {
              updates.fullName = 'Unknown User';
            }
            
            await updateDoc(doc(db, 'users', issue.userId), updates);
          }
          
          results.fieldsFixed++;
          console.log(`Fixed missing fields for user ${issue.userId}`);
          
        } catch (error) {
          results.errors.push({
            type: 'field_fix_failed',
            userId: issue.userId,
            error: error.message
          });
        }
      }
    }
    
    // Fix verification status mismatches
    if (fixVerificationStatus && inconsistencies.mismatchedVerification.length > 0) {
      for (const issue of inconsistencies.mismatchedVerification) {
        try {
          if (!dryRun && auth.currentUser && auth.currentUser.uid === issue.userId) {
            // Reload auth user to get latest status
            await reload(auth.currentUser);
            
            // Update Firestore to match Auth
            await updateDoc(doc(db, 'users', issue.userId), {
              emailVerified: auth.currentUser.emailVerified,
              lastVerificationSync: serverTimestamp()
            });
          }
          
          results.verificationFixed++;
          console.log(`Fixed verification status for user ${issue.userId}`);
          
        } catch (error) {
          results.errors.push({
            type: 'verification_fix_failed',
            userId: issue.userId,
            error: error.message
          });
        }
      }
    }
    
    console.log('Reconciliation complete:', results);
    
    return {
      success: true,
      dryRun,
      results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error reconciling accounts:', error);
    return {
      success: false,
      error: error.message,
      results,
      timestamp: new Date().toISOString()
    };
  }
}

// Create missing Firestore profiles for existing auth accounts
export async function createMissingProfiles(authUsers = []) {
  console.log(`Creating missing profiles for ${authUsers.length} users...`);
  
  const results = {
    created: 0,
    skipped: 0,
    failed: 0,
    profiles: []
  };
  
  // Process in batches
  const batches = [];
  for (let i = 0; i < authUsers.length; i += CONSISTENCY_CONFIG.batchSize) {
    batches.push(authUsers.slice(i, i + CONSISTENCY_CONFIG.batchSize));
  }
  
  for (const batch of batches) {
    const writeBatchOp = writeBatch(db);
    
    for (const authUser of batch) {
      try {
        // Check if profile already exists
        const profileDoc = await getDoc(doc(db, 'users', authUser.uid));
        
        if (profileDoc.exists()) {
          results.skipped++;
          continue;
        }
        
        // Create default profile
        const profile = {
          uid: authUser.uid,
          email: authUser.email,
          fullName: authUser.displayName || 'Unknown User',
          address: '',
          city: '',
          postalCode: '',
          role: 'customer',
          isMember: false,
          memberRequestPending: false,
          emailVerified: authUser.emailVerified,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          accountRecovered: true,
          recoveredAt: serverTimestamp()
        };
        
        writeBatchOp.set(doc(db, 'users', authUser.uid), profile);
        results.profiles.push(profile);
        results.created++;
        
      } catch (error) {
        console.error(`Failed to create profile for ${authUser.uid}:`, error);
        results.failed++;
      }
    }
    
    // Commit batch
    if (results.created > 0) {
      try {
        await writeBatchOp.commit();
        console.log(`Batch committed: ${results.created} profiles created`);
      } catch (error) {
        console.error('Batch commit failed:', error);
        results.failed += results.created;
        results.created = 0;
      }
    }
  }
  
  console.log('Profile creation complete:', results);
  
  return {
    success: results.failed === 0,
    results,
    timestamp: new Date().toISOString()
  };
}

// Remove orphaned auth accounts (requires admin privileges)
export async function removeOrphanedAuthAccounts(options = {}) {
  const {
    dryRun = true,
    maxAge = CONSISTENCY_CONFIG.maxOrphanedAge,
    requireConfirmation = true
  } = options;
  
  console.warn('⚠️  Orphaned account removal requires admin privileges');
  console.warn('This function provides a report only. Actual deletion must be done server-side.');
  
  const results = {
    identified: [],
    wouldDelete: 0,
    deleted: 0,
    errors: []
  };
  
  try {
    // Get all user profiles
    const profilesSnapshot = await getDocs(collection(db, 'users'));
    const profileIds = new Set(profilesSnapshot.docs.map(doc => doc.id));
    
    // Note: We can't list all Auth users from client-side
    // This would need Admin SDK on server
    
    // For current user only (limited capability)
    if (auth.currentUser) {
      const userId = auth.currentUser.uid;
      
      if (!profileIds.has(userId)) {
        const accountAge = Date.now() - (auth.currentUser.metadata.creationTime 
          ? new Date(auth.currentUser.metadata.creationTime).getTime() 
          : 0);
        
        if (accountAge > maxAge) {
          results.identified.push({
            uid: userId,
            email: auth.currentUser.email,
            created: auth.currentUser.metadata.creationTime,
            ageInDays: Math.floor(accountAge / (1000 * 60 * 60 * 24))
          });
          results.wouldDelete++;
        }
      }
    }
    
    // Generate Cloud Function code for server-side deletion
    const cloudFunctionCode = generateCleanupCloudFunction(results.identified);
    
    return {
      success: true,
      dryRun: true,
      results,
      message: 'Client-side detection only. Use the generated Cloud Function for actual cleanup.',
      cloudFunctionCode,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error identifying orphaned accounts:', error);
    return {
      success: false,
      error: error.message,
      results,
      timestamp: new Date().toISOString()
    };
  }
}

// Automated consistency check on app initialization
export async function initializeConsistencyCheck() {
  if (!CONSISTENCY_CONFIG.autoCheckEnabled) {
    console.log('Automated consistency checks disabled');
    return;
  }
  
  // Check if we should run based on last check time
  const lastCheckKey = 'sleipnir_last_consistency_check';
  const lastCheck = localStorage.getItem(lastCheckKey);
  const now = Date.now();
  
  if (lastCheck) {
    const timeSinceLastCheck = now - parseInt(lastCheck);
    if (timeSinceLastCheck < CONSISTENCY_CONFIG.checkInterval) {
      console.log('Skipping consistency check (too recent)');
      return;
    }
  }
  
  // Run check when auth state is confirmed
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        console.log('Running automated consistency check...');
        
        // Quick check for current user only
        const userProfile = await getDoc(doc(db, 'users', user.uid));
        
        if (!userProfile.exists()) {
          console.warn('Current user missing Firestore profile!');
          
          // Attempt to create profile
          const result = await createMissingProfiles([{
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified
          }]);
          
          if (result.success) {
            console.log('Profile created successfully');
          }
        } else {
          // Check for mismatches
          const profile = userProfile.data();
          
          if (profile.emailVerified !== user.emailVerified) {
            await updateDoc(doc(db, 'users', user.uid), {
              emailVerified: user.emailVerified,
              lastVerificationSync: serverTimestamp()
            });
            console.log('Updated email verification status');
          }
        }
        
        // Update last check time
        localStorage.setItem(lastCheckKey, now.toString());
        
      } catch (error) {
        console.error('Automated consistency check failed:', error);
      }
    }
    
    // Unsubscribe after first check
    unsubscribe();
  });
}

// Log inconsistencies for monitoring
async function logInconsistencies(inconsistencies) {
  try {
    const logEntry = {
      timestamp: serverTimestamp(),
      type: 'consistency_check',
      summary: {
        orphanedAuth: inconsistencies.orphanedAuth.length,
        orphanedProfiles: inconsistencies.orphanedProfiles.length,
        mismatchedEmails: inconsistencies.mismatchedEmails.length,
        mismatchedVerification: inconsistencies.mismatchedVerification.length,
        missingFields: inconsistencies.missingFields.length
      },
      details: inconsistencies
    };
    
    // In production, send to logging service
    console.log('Inconsistencies logged:', logEntry);
    
    // Store locally for debugging
    const logs = JSON.parse(localStorage.getItem('sleipnir_consistency_logs') || '[]');
    logs.push({
      ...logEntry,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 logs
    if (logs.length > 10) {
      logs.splice(0, logs.length - 10);
    }
    
    localStorage.setItem('sleipnir_consistency_logs', JSON.stringify(logs));
    
  } catch (error) {
    console.error('Failed to log inconsistencies:', error);
  }
}

// Generate Cloud Function code for server-side cleanup
function generateCleanupCloudFunction(orphanedAccounts) {
  return `
// Cloud Function for cleaning orphaned auth accounts
// Deploy this to Firebase Functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.cleanupOrphanedAccounts = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  const { orphanedUids, dryRun = true } = data;
  const results = { deleted: 0, errors: [] };
  
  for (const uid of orphanedUids) {
    try {
      // Verify account is truly orphaned
      const profile = await admin.firestore().collection('users').doc(uid).get();
      
      if (!profile.exists && !dryRun) {
        await admin.auth().deleteUser(uid);
        results.deleted++;
      }
    } catch (error) {
      results.errors.push({ uid, error: error.message });
    }
  }
  
  return results;
});

// Orphaned accounts to clean:
${JSON.stringify(orphanedAccounts, null, 2)}
`;
}

// Export configuration for external use
export { CONSISTENCY_CONFIG, InconsistencyType };

// Initialize on import
if (typeof window !== 'undefined') {
  initializeConsistencyCheck();
}