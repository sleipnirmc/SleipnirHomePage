// Authentication Migration - Admin SDK Functions
// Deploy these as Cloud Functions for operations requiring Admin SDK
// This complements migrate-auth.js with server-side capabilities

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const auth = admin.auth();
const db = admin.firestore();

// Configuration
const BATCH_SIZE = 100;

/**
 * Cloud Function: Complete Auth Migration
 * Performs full migration with Admin SDK capabilities
 */
exports.runAuthMigration = functions
    .runWith({ timeoutSeconds: 540, memory: '1GB' })
    .https.onCall(async (data, context) => {
        // Verify admin
        if (!context.auth || context.auth.token.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }

        const { dryRun = true, options = {} } = data;
        const startTime = Date.now();

        const report = {
            mode: dryRun ? 'DRY_RUN' : 'LIVE',
            startTime: new Date().toISOString(),
            performedBy: context.auth.token.email,
            actions: {
                orphanedAuthFound: [],
                orphanedProfilesFound: [],
                profilesCreated: [],
                authAccountsDeleted: [],
                duplicatesResolved: [],
                fieldsFixed: []
            },
            summary: {
                totalAuthUsers: 0,
                totalProfiles: 0,
                orphanedAuth: 0,
                orphanedProfiles: 0,
                profilesCreated: 0,
                authDeleted: 0,
                errors: 0
            },
            errors: []
        };

        try {
            // Step 1: Get all auth users
            console.log('Step 1: Fetching all auth users...');
            const authUsers = await getAllAuthUsers();
            report.summary.totalAuthUsers = authUsers.length;

            // Step 2: Get all Firestore profiles
            console.log('Step 2: Fetching all Firestore profiles...');
            const profiles = await getAllProfiles();
            report.summary.totalProfiles = profiles.size;

            // Step 3: Find orphaned auth accounts
            console.log('Step 3: Finding orphaned accounts...');
            for (const authUser of authUsers) {
                const profileExists = profiles.has(authUser.uid);
                
                if (!profileExists) {
                    report.actions.orphanedAuthFound.push({
                        uid: authUser.uid,
                        email: authUser.email,
                        createdAt: authUser.metadata.creationTime,
                        lastSignIn: authUser.metadata.lastSignInTime
                    });
                    report.summary.orphanedAuth++;

                    // Create placeholder profile if requested
                    if (options.createProfiles && !dryRun) {
                        try {
                            await createPlaceholderProfile(authUser);
                            report.actions.profilesCreated.push({
                                uid: authUser.uid,
                                email: authUser.email
                            });
                            report.summary.profilesCreated++;
                        } catch (error) {
                            report.errors.push({
                                action: 'createProfile',
                                uid: authUser.uid,
                                error: error.message
                            });
                        }
                    }
                }
            }

            // Step 4: Find orphaned profiles (profile exists but no auth)
            console.log('Step 4: Finding orphaned profiles...');
            const authUidSet = new Set(authUsers.map(u => u.uid));
            
            for (const [uid, profile] of profiles) {
                if (!authUidSet.has(uid)) {
                    report.actions.orphanedProfilesFound.push({
                        uid: uid,
                        email: profile.email,
                        createdAt: profile.createdAt?.toDate()
                    });
                    report.summary.orphanedProfiles++;

                    // Delete orphaned profile if requested
                    if (options.deleteOrphanedProfiles && !dryRun) {
                        try {
                            await db.collection('users').doc(uid).delete();
                            report.actions.authAccountsDeleted.push({
                                uid: uid,
                                type: 'profile'
                            });
                        } catch (error) {
                            report.errors.push({
                                action: 'deleteProfile',
                                uid: uid,
                                error: error.message
                            });
                        }
                    }
                }
            }

            // Step 5: Fix email verification mismatches
            console.log('Step 5: Fixing verification status...');
            for (const authUser of authUsers) {
                const profile = profiles.get(authUser.uid);
                
                if (profile && authUser.emailVerified !== profile.emailVerified) {
                    if (!dryRun) {
                        try {
                            await db.collection('users').doc(authUser.uid).update({
                                emailVerified: authUser.emailVerified,
                                verificationSyncedAt: admin.firestore.FieldValue.serverTimestamp()
                            });
                            
                            report.actions.fieldsFixed.push({
                                uid: authUser.uid,
                                field: 'emailVerified',
                                oldValue: profile.emailVerified,
                                newValue: authUser.emailVerified
                            });
                        } catch (error) {
                            report.errors.push({
                                action: 'updateVerification',
                                uid: authUser.uid,
                                error: error.message
                            });
                        }
                    }
                }
            }

            // Step 6: Handle duplicate accounts by email
            console.log('Step 6: Checking for duplicate accounts...');
            const emailToUsers = new Map();
            
            for (const authUser of authUsers) {
                const email = authUser.email?.toLowerCase();
                if (email) {
                    if (!emailToUsers.has(email)) {
                        emailToUsers.set(email, []);
                    }
                    emailToUsers.get(email).push(authUser);
                }
            }

            for (const [email, users] of emailToUsers) {
                if (users.length > 1) {
                    // Sort by last sign in, keep most recent
                    users.sort((a, b) => {
                        const dateA = new Date(a.metadata.lastSignInTime || 0);
                        const dateB = new Date(b.metadata.lastSignInTime || 0);
                        return dateB - dateA;
                    });

                    const primaryUser = users[0];
                    const duplicates = users.slice(1);

                    report.actions.duplicatesResolved.push({
                        email: email,
                        primaryUid: primaryUser.uid,
                        duplicateUids: duplicates.map(u => u.uid)
                    });

                    // Delete duplicate auth accounts if requested
                    if (options.deleteDuplicateAuth && !dryRun) {
                        for (const dup of duplicates) {
                            try {
                                await auth.deleteUser(dup.uid);
                                await db.collection('users').doc(dup.uid).delete();
                                report.summary.authDeleted++;
                            } catch (error) {
                                report.errors.push({
                                    action: 'deleteDuplicate',
                                    uid: dup.uid,
                                    error: error.message
                                });
                            }
                        }
                    }
                }
            }

            // Complete report
            report.endTime = new Date().toISOString();
            report.durationMs = Date.now() - startTime;
            report.summary.errors = report.errors.length;

            // Save report to Firestore
            if (!dryRun) {
                await db.collection('migrationReports').add({
                    ...report,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return report;

        } catch (error) {
            console.error('Migration error:', error);
            throw new functions.https.HttpsError('internal', error.message);
        }
    });

/**
 * Cloud Function: Send bulk verification emails
 */
exports.sendBulkVerificationEmails = functions
    .runWith({ timeoutSeconds: 540 })
    .https.onCall(async (data, context) => {
        // Verify admin
        if (!context.auth || context.auth.token.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }

        const { userIds = [], includeAll = false } = data;
        const results = {
            sent: [],
            failed: [],
            total: 0
        };

        try {
            let targetUsers = [];

            if (includeAll) {
                // Get all unverified users
                const unverifiedSnapshot = await db.collection('users')
                    .where('emailVerified', '==', false)
                    .get();

                targetUsers = unverifiedSnapshot.docs.map(doc => ({
                    uid: doc.id,
                    email: doc.data().email
                }));
            } else {
                // Get specific users
                for (const uid of userIds) {
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists) {
                        targetUsers.push({
                            uid: uid,
                            email: userDoc.data().email
                        });
                    }
                }
            }

            results.total = targetUsers.length;

            // Send verification emails
            for (const user of targetUsers) {
                try {
                    const link = await auth.generateEmailVerificationLink(user.email, {
                        url: 'https://sleipnirmc.is/verify-email.html'
                    });

                    // Here you would integrate with your email service
                    // For now, we'll just track it
                    await db.collection('emailTracking').doc(user.uid).set({
                        email: user.email,
                        lastSent: admin.firestore.FieldValue.serverTimestamp(),
                        sentCount: admin.firestore.FieldValue.increment(1),
                        status: 'sent',
                        type: 'verification',
                        link: link // Remove in production
                    }, { merge: true });

                    results.sent.push({
                        uid: user.uid,
                        email: user.email
                    });

                } catch (error) {
                    results.failed.push({
                        uid: user.uid,
                        email: user.email,
                        error: error.message
                    });
                }
            }

            return results;

        } catch (error) {
            console.error('Bulk email error:', error);
            throw new functions.https.HttpsError('internal', error.message);
        }
    });

/**
 * Cloud Function: Clean specific orphaned account
 */
exports.cleanOrphanedAccount = functions.https.onCall(async (data, context) => {
    // Verify admin
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { uid, action } = data; // action: 'delete' or 'create_profile'

    try {
        // Check if auth exists
        let authUser;
        try {
            authUser = await auth.getUser(uid);
        } catch (error) {
            // Auth doesn't exist
        }

        // Check if profile exists
        const profileDoc = await db.collection('users').doc(uid).get();
        const profileExists = profileDoc.exists;

        if (authUser && !profileExists && action === 'create_profile') {
            // Create missing profile
            await createPlaceholderProfile(authUser);
            return { success: true, action: 'profile_created' };

        } else if (!authUser && profileExists && action === 'delete') {
            // Delete orphaned profile
            await db.collection('users').doc(uid).delete();
            return { success: true, action: 'profile_deleted' };

        } else if (authUser && profileExists && action === 'delete') {
            // Delete both
            await auth.deleteUser(uid);
            await db.collection('users').doc(uid).delete();
            return { success: true, action: 'both_deleted' };

        } else {
            return { success: false, message: 'Invalid state or action' };
        }

    } catch (error) {
        console.error('Clean orphaned account error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Helper functions

async function getAllAuthUsers() {
    const users = [];
    let pageToken;

    do {
        const listResult = await auth.listUsers(BATCH_SIZE, pageToken);
        users.push(...listResult.users);
        pageToken = listResult.pageToken;
    } while (pageToken);

    return users;
}

async function getAllProfiles() {
    const profiles = new Map();
    const snapshot = await db.collection('users').get();
    
    snapshot.forEach(doc => {
        profiles.set(doc.id, {
            ...doc.data(),
            _id: doc.id
        });
    });

    return profiles;
}

async function createPlaceholderProfile(authUser) {
    const profile = {
        uid: authUser.uid,
        email: authUser.email,
        fullName: authUser.displayName || 'User',
        address: '',
        city: '',
        postalCode: '',
        role: 'customer',
        isMember: false,
        memberRequestPending: false,
        emailVerified: authUser.emailVerified,
        createdAt: admin.firestore.Timestamp.fromDate(new Date(authUser.metadata.creationTime)),
        migrationCreated: true,
        migrationNote: 'Profile created during auth migration',
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(authUser.uid).set(profile);
    return profile;
}

// Scheduled function to run weekly consistency check
exports.scheduledAuthConsistencyCheck = functions.pubsub
    .schedule('every sunday 03:00')
    .timeZone('Atlantic/Reykjavik')
    .onRun(async (context) => {
        console.log('Running scheduled auth consistency check...');
        
        try {
            // Run migration in dry-run mode
            const report = await runAuthMigrationInternal({ dryRun: true });
            
            // If issues found, notify admin
            if (report.summary.orphanedAuth > 0 || report.summary.orphanedProfiles > 0) {
                // Send notification email to admin
                // You would implement email sending here
                console.log('Consistency issues found:', {
                    orphanedAuth: report.summary.orphanedAuth,
                    orphanedProfiles: report.summary.orphanedProfiles
                });
            }
            
            // Save report
            await db.collection('consistencyReports').add({
                ...report,
                scheduled: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
        } catch (error) {
            console.error('Scheduled consistency check error:', error);
        }
    });

// Internal migration function for scheduled use
async function runAuthMigrationInternal(options) {
    // Similar to runAuthMigration but without context check
    // Implementation would be the same core logic
    return {
        summary: { orphanedAuth: 0, orphanedProfiles: 0 },
        // ... rest of report
    };
}