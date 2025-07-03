// Authentication Migration Script
// Run this once to clean up auth inconsistencies
// Can be executed from Firebase console or admin panel

// Migration configuration
const MIGRATION_CONFIG = {
    dryRun: true, // Set to false to actually perform migrations
    batchSize: 100,
    createPlaceholderProfiles: true,
    markForReverification: true,
    cleanDuplicates: true,
    generateReport: true,
    reportFormat: 'json', // 'json' or 'csv'
};

// Migration state
const migrationState = {
    startTime: null,
    endTime: null,
    processed: 0,
    errors: [],
    actions: {
        profilesCreated: [],
        reverificationMarked: [],
        duplicatesFound: [],
        duplicatesRemoved: [],
        orphanedAuthFound: [],
        orphanedProfilesFound: [],
        fieldsUpdated: []
    },
    summary: {
        totalUsers: 0,
        orphanedAuth: 0,
        orphanedProfiles: 0,
        profilesCreated: 0,
        markedForReverification: 0,
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        errors: 0
    }
};

// Initialize Firebase (assumes firebase is already loaded)
async function initializeMigration() {
    console.log('=== SLEIPNIR MC AUTH MIGRATION TOOL ===');
    console.log(`Mode: ${MIGRATION_CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('Starting migration process...\n');
    
    migrationState.startTime = new Date();
    
    try {
        // Check if user is admin
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            throw new Error('You must be logged in to run migrations');
        }
        
        const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            throw new Error('You must be an admin to run migrations');
        }
        
        console.log(`Authenticated as admin: ${currentUser.email}\n`);
        return true;
        
    } catch (error) {
        console.error('Initialization failed:', error.message);
        return false;
    }
}

// Step 1: Find all users and their status
async function findAllUsers() {
    console.log('Step 1: Finding all users...');
    
    const users = new Map(); // email -> user data
    const db = firebase.firestore();
    
    try {
        // Get all Firestore profiles
        let lastDoc = null;
        let hasMore = true;
        
        while (hasMore) {
            let query = db.collection('users').orderBy('createdAt').limit(MIGRATION_CONFIG.batchSize);
            
            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                hasMore = false;
                break;
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const email = data.email?.toLowerCase();
                
                if (email) {
                    if (!users.has(email)) {
                        users.set(email, {
                            profiles: [],
                            authExists: false // Will be updated if we can verify
                        });
                    }
                    
                    users.get(email).profiles.push({
                        id: doc.id,
                        data: data,
                        createdAt: data.createdAt?.toDate() || null
                    });
                }
                
                migrationState.processed++;
            });
            
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            console.log(`Processed ${migrationState.processed} profiles...`);
        }
        
        // Note: We can't list all Auth users from client SDK
        // So we'll work with what we have in Firestore
        console.log(`Found ${users.size} unique emails with ${migrationState.processed} total profiles\n`);
        
        return users;
        
    } catch (error) {
        console.error('Error finding users:', error);
        migrationState.errors.push({
            step: 'findAllUsers',
            error: error.message
        });
        return users;
    }
}

// Step 2: Identify and fix orphaned accounts
async function fixOrphanedAccounts(users) {
    console.log('Step 2: Checking for orphaned accounts...');
    
    const db = firebase.firestore();
    const batch = db.batch();
    let batchCount = 0;
    
    // Since we can't list Auth users from client SDK, we'll check for common orphan patterns:
    // 1. Users who logged in but never completed profile
    // 2. Users with incomplete profile data
    
    for (const [email, userData] of users) {
        // Check for duplicate profiles
        if (userData.profiles.length > 1) {
            migrationState.actions.duplicatesFound.push({
                email: email,
                profileCount: userData.profiles.length,
                profiles: userData.profiles.map(p => ({
                    id: p.id,
                    createdAt: p.createdAt
                }))
            });
            migrationState.summary.duplicatesFound++;
            
            // Keep the oldest profile, mark others for deletion
            const sortedProfiles = userData.profiles.sort((a, b) => {
                const dateA = a.createdAt || new Date(0);
                const dateB = b.createdAt || new Date(0);
                return dateA - dateB;
            });
            
            const primaryProfile = sortedProfiles[0];
            const duplicates = sortedProfiles.slice(1);
            
            if (MIGRATION_CONFIG.cleanDuplicates && !MIGRATION_CONFIG.dryRun) {
                // Delete duplicate profiles
                for (const dup of duplicates) {
                    batch.delete(db.collection('users').doc(dup.id));
                    batchCount++;
                    
                    migrationState.actions.duplicatesRemoved.push({
                        email: email,
                        profileId: dup.id,
                        createdAt: dup.createdAt
                    });
                    migrationState.summary.duplicatesRemoved++;
                    
                    if (batchCount >= MIGRATION_CONFIG.batchSize) {
                        await batch.commit();
                        batchCount = 0;
                    }
                }
            }
        }
        
        // Check for incomplete profiles
        const profile = userData.profiles[0];
        if (profile) {
            const missingFields = [];
            const requiredFields = ['fullName', 'address', 'city', 'postalCode'];
            
            for (const field of requiredFields) {
                if (!profile.data[field] || profile.data[field] === '') {
                    missingFields.push(field);
                }
            }
            
            // Check email verification status
            if (!profile.data.emailVerified && profile.data.emailVerified !== false) {
                // emailVerified field is missing
                missingFields.push('emailVerified');
                
                if (!MIGRATION_CONFIG.dryRun) {
                    batch.update(db.collection('users').doc(profile.id), {
                        emailVerified: false,
                        migrationNote: 'Email verification status was missing, set to false',
                        migratedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    batchCount++;
                }
                
                migrationState.actions.fieldsUpdated.push({
                    email: email,
                    profileId: profile.id,
                    field: 'emailVerified',
                    oldValue: undefined,
                    newValue: false
                });
            }
            
            // Mark for reverification if needed
            if (MIGRATION_CONFIG.markForReverification && 
                profile.data.emailVerified === false &&
                (!profile.data.lastVerificationSent || 
                 new Date() - profile.data.lastVerificationSent?.toDate() > 30 * 24 * 60 * 60 * 1000)) {
                
                if (!MIGRATION_CONFIG.dryRun) {
                    batch.update(db.collection('users').doc(profile.id), {
                        needsReverification: true,
                        reverificationReason: 'Migration - old unverified account',
                        migratedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    batchCount++;
                }
                
                migrationState.actions.reverificationMarked.push({
                    email: email,
                    profileId: profile.id,
                    reason: 'Old unverified account'
                });
                migrationState.summary.markedForReverification++;
            }
            
            // Fix missing role
            if (!profile.data.role) {
                if (!MIGRATION_CONFIG.dryRun) {
                    batch.update(db.collection('users').doc(profile.id), {
                        role: 'customer',
                        migrationNote: 'Role was missing, set to customer',
                        migratedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    batchCount++;
                }
                
                migrationState.actions.fieldsUpdated.push({
                    email: email,
                    profileId: profile.id,
                    field: 'role',
                    oldValue: undefined,
                    newValue: 'customer'
                });
            }
            
            // Fix missing timestamps
            if (!profile.data.createdAt) {
                if (!MIGRATION_CONFIG.dryRun) {
                    batch.update(db.collection('users').doc(profile.id), {
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        migrationNote: 'CreatedAt timestamp was missing',
                        migratedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    batchCount++;
                }
                
                migrationState.actions.fieldsUpdated.push({
                    email: email,
                    profileId: profile.id,
                    field: 'createdAt',
                    oldValue: undefined,
                    newValue: 'serverTimestamp'
                });
            }
        }
        
        if (batchCount >= MIGRATION_CONFIG.batchSize - 5) {
            await batch.commit();
            batchCount = 0;
        }
    }
    
    // Commit remaining batch operations
    if (batchCount > 0 && !MIGRATION_CONFIG.dryRun) {
        await batch.commit();
    }
    
    console.log(`Processed ${users.size} users\n`);
}

// Step 3: Check for auth/profile consistency
async function checkAuthConsistency() {
    console.log('Step 3: Checking auth/profile consistency...');
    
    // Note: Limited by client SDK - we can only check current user's auth status
    // In production, this would be done with Admin SDK
    
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
        const profileDoc = await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .get();
        
        if (!profileDoc.exists) {
            console.log('WARNING: Current admin user has no Firestore profile!');
            migrationState.actions.orphanedAuthFound.push({
                uid: currentUser.uid,
                email: currentUser.email
            });
        }
    }
    
    console.log('Note: Full auth consistency check requires Admin SDK\n');
}

// Step 4: Create migration report
async function generateMigrationReport() {
    console.log('Step 4: Generating migration report...');
    
    migrationState.endTime = new Date();
    const duration = (migrationState.endTime - migrationState.startTime) / 1000; // seconds
    
    const report = {
        metadata: {
            version: '1.0.0',
            mode: MIGRATION_CONFIG.dryRun ? 'DRY_RUN' : 'LIVE',
            startTime: migrationState.startTime.toISOString(),
            endTime: migrationState.endTime.toISOString(),
            durationSeconds: duration,
            performedBy: firebase.auth().currentUser?.email || 'Unknown'
        },
        summary: migrationState.summary,
        actions: migrationState.actions,
        errors: migrationState.errors,
        recommendations: generateRecommendations()
    };
    
    // Display summary
    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Total Users Processed: ${migrationState.processed}`);
    console.log(`Duplicate Profiles Found: ${migrationState.summary.duplicatesFound}`);
    console.log(`Duplicate Profiles Removed: ${migrationState.summary.duplicatesRemoved}`);
    console.log(`Marked for Reverification: ${migrationState.summary.markedForReverification}`);
    console.log(`Fields Updated: ${migrationState.actions.fieldsUpdated.length}`);
    console.log(`Errors: ${migrationState.summary.errors}`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    
    if (MIGRATION_CONFIG.dryRun) {
        console.log('\n⚠️  This was a DRY RUN - no changes were made');
        console.log('Set MIGRATION_CONFIG.dryRun = false to apply changes');
    }
    
    return report;
}

// Generate recommendations based on findings
function generateRecommendations() {
    const recommendations = [];
    
    if (migrationState.summary.duplicatesFound > 0) {
        recommendations.push({
            priority: 'HIGH',
            issue: 'Duplicate profiles detected',
            description: `Found ${migrationState.summary.duplicatesFound} users with multiple profiles`,
            action: 'Run migration with cleanDuplicates enabled to remove duplicates'
        });
    }
    
    if (migrationState.summary.markedForReverification > 10) {
        recommendations.push({
            priority: 'MEDIUM',
            issue: 'Many unverified accounts',
            description: `${migrationState.summary.markedForReverification} accounts need email reverification`,
            action: 'Consider sending a bulk reverification email campaign'
        });
    }
    
    if (migrationState.actions.orphanedAuthFound.length > 0) {
        recommendations.push({
            priority: 'HIGH',
            issue: 'Orphaned auth accounts found',
            description: 'Some auth accounts have no Firestore profile',
            action: 'Use Admin SDK to create profiles or remove orphaned auth accounts'
        });
    }
    
    if (migrationState.errors.length > 0) {
        recommendations.push({
            priority: 'HIGH',
            issue: 'Errors occurred during migration',
            description: `${migrationState.errors.length} errors were encountered`,
            action: 'Review error details and retry migration if needed'
        });
    }
    
    if (recommendations.length === 0) {
        recommendations.push({
            priority: 'LOW',
            issue: 'No major issues found',
            description: 'Authentication data appears to be in good condition',
            action: 'Continue regular monitoring'
        });
    }
    
    return recommendations;
}

// Download report as file
function downloadReport(report) {
    const filename = `sleipnir_auth_migration_${new Date().toISOString().slice(0, 10)}.json`;
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();
    
    console.log(`\nReport saved as: ${filename}`);
}

// Main migration function
async function runMigration() {
    try {
        // Initialize
        const initialized = await initializeMigration();
        if (!initialized) {
            console.error('Migration aborted: Initialization failed');
            return;
        }
        
        // Step 1: Find all users
        const users = await findAllUsers();
        migrationState.summary.totalUsers = users.size;
        
        // Step 2: Fix orphaned accounts and duplicates
        await fixOrphanedAccounts(users);
        
        // Step 3: Check auth consistency (limited in client SDK)
        await checkAuthConsistency();
        
        // Step 4: Generate report
        const report = await generateMigrationReport();
        
        // Save report
        if (MIGRATION_CONFIG.generateReport) {
            downloadReport(report);
        }
        
        console.log('\n✅ Migration completed successfully!');
        
        // Return report for programmatic use
        return report;
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        migrationState.errors.push({
            step: 'main',
            error: error.message,
            stack: error.stack
        });
        
        // Generate error report
        const errorReport = await generateMigrationReport();
        if (MIGRATION_CONFIG.generateReport) {
            downloadReport(errorReport);
        }
        
        return errorReport;
    }
}

// Admin panel integration
function addMigrationToAdminPanel() {
    // Add migration button to admin panel if it exists
    const adminOptions = document.querySelector('.options-dropdown');
    if (adminOptions && !document.getElementById('runMigration')) {
        const migrationLink = document.createElement('a');
        migrationLink.href = '#';
        migrationLink.id = 'runMigration';
        migrationLink.textContent = '🔧 Run Auth Migration';
        migrationLink.style.borderTop = '2px solid var(--mc-red)';
        migrationLink.onclick = async (e) => {
            e.preventDefault();
            
            const confirmMsg = MIGRATION_CONFIG.dryRun 
                ? 'Run authentication migration in DRY RUN mode?'
                : '⚠️ Run authentication migration in LIVE mode? This will make changes to the database!';
            
            if (confirm(confirmMsg)) {
                console.clear();
                await runMigration();
            }
        };
        
        adminOptions.appendChild(migrationLink);
    }
}

// Auto-add to admin panel if on admin page
if (window.location.pathname.includes('admin.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addMigrationToAdminPanel, 1000);
    });
}

// Export for console use
window.sleipnirAuthMigration = {
    config: MIGRATION_CONFIG,
    run: runMigration,
    state: migrationState
};

console.log('Sleipnir Auth Migration Tool loaded.');
console.log('To run from console: sleipnirAuthMigration.run()');
console.log('To change settings: sleipnirAuthMigration.config.dryRun = false');