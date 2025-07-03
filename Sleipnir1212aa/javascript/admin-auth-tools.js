// Admin Authentication Tools
// Comprehensive admin functions for user management and debugging

import { auth, db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    deleteDoc, 
    updateDoc,
    query, 
    where, 
    orderBy, 
    limit,
    writeBatch,
    serverTimestamp
} from 'firebase/firestore';
import { deleteUser, sendEmailVerification } from 'firebase/auth';
import { checkAuthConsistency, reconcileAuthAccounts, createMissingProfiles } from './auth-consistency.js';
import { sendVerificationEmailWithRetry, getVerificationStats } from './email-verification.js';
import { AuthError } from './auth-service.js';

// Admin tools configuration
const ADMIN_CONFIG = {
    batchSize: 100,
    exportFormats: ['csv', 'json'],
    maxExportSize: 10000,
    emailMonitoringWindow: 24 * 60 * 60 * 1000 // 24 hours
};

// User status types
const UserStatus = {
    ACTIVE: 'active',
    ORPHANED_AUTH: 'orphaned_auth',
    ORPHANED_PROFILE: 'orphaned_profile',
    UNVERIFIED: 'unverified',
    DISABLED: 'disabled',
    PENDING_DELETION: 'pending_deletion'
};

// 1. List all users with auth/profile status
export async function listAllUsersWithStatus(options = {}) {
    const {
        pageSize = 100,
        startAfter = null,
        filterStatus = null,
        includeStats = true
    } = options;
    
    console.log('Fetching users with status...');
    
    try {
        // Get users from Firestore
        let usersQuery = collection(db, 'users');
        
        if (startAfter) {
            usersQuery = query(usersQuery, orderBy('createdAt'), limit(pageSize));
        } else {
            usersQuery = query(usersQuery, orderBy('createdAt'), limit(pageSize));
        }
        
        const usersSnapshot = await getDocs(usersQuery);
        const users = [];
        
        // Process each user
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            // Determine user status
            let status = UserStatus.ACTIVE;
            
            if (!userData.emailVerified) {
                status = UserStatus.UNVERIFIED;
            }
            
            // Get email verification stats if requested
            let verificationStats = null;
            if (includeStats && status === UserStatus.UNVERIFIED) {
                verificationStats = await getVerificationStats(userId);
            }
            
            const userInfo = {
                uid: userId,
                email: userData.email,
                fullName: userData.fullName,
                role: userData.role,
                status: status,
                isMember: userData.isMember,
                memberRequestPending: userData.memberRequestPending,
                emailVerified: userData.emailVerified,
                createdAt: userData.createdAt?.toDate() || null,
                lastLogin: userData.lastLogin?.toDate() || null,
                verificationStats: verificationStats
            };
            
            // Apply status filter if specified
            if (!filterStatus || filterStatus === status) {
                users.push(userInfo);
            }
        }
        
        // Check for orphaned accounts
        const consistencyCheck = await checkAuthConsistency({
            includeDetails: true,
            maxUsers: pageSize
        });
        
        // Add orphaned auth accounts to the list
        if (consistencyCheck.details?.orphanedAuth) {
            for (const orphaned of consistencyCheck.details.orphanedAuth) {
                users.push({
                    uid: orphaned.userId,
                    email: orphaned.email,
                    status: UserStatus.ORPHANED_AUTH,
                    error: 'No Firestore profile'
                });
            }
        }
        
        // Sort by status priority
        users.sort((a, b) => {
            const statusPriority = {
                [UserStatus.ORPHANED_AUTH]: 0,
                [UserStatus.ORPHANED_PROFILE]: 1,
                [UserStatus.UNVERIFIED]: 2,
                [UserStatus.DISABLED]: 3,
                [UserStatus.ACTIVE]: 4
            };
            
            return statusPriority[a.status] - statusPriority[b.status];
        });
        
        return {
            success: true,
            users: users,
            total: users.length,
            hasMore: usersSnapshot.docs.length === pageSize,
            lastDoc: usersSnapshot.docs[usersSnapshot.docs.length - 1],
            summary: {
                active: users.filter(u => u.status === UserStatus.ACTIVE).length,
                unverified: users.filter(u => u.status === UserStatus.UNVERIFIED).length,
                orphaned: users.filter(u => u.status.includes('orphaned')).length,
                members: users.filter(u => u.isMember).length,
                admins: users.filter(u => u.role === 'admin').length
            }
        };
        
    } catch (error) {
        console.error('Error listing users:', error);
        return {
            success: false,
            error: error.message,
            users: []
        };
    }
}

// 2. Fix orphaned accounts in bulk
export async function fixOrphanedAccountsBulk(options = {}) {
    const {
        dryRun = false,
        createProfiles = true,
        removeOrphaned = false,
        maxFix = 100
    } = options;
    
    console.log(`Starting bulk orphaned account fix (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    try {
        // Get consistency report
        const consistency = await checkAuthConsistency({
            includeDetails: true,
            maxUsers: maxFix
        });
        
        if (!consistency.success) {
            throw new Error('Failed to check consistency');
        }
        
        const results = {
            profilesCreated: 0,
            orphanedRemoved: 0,
            errors: [],
            fixed: []
        };
        
        // Fix orphaned auth accounts (auth exists but no profile)
        if (createProfiles && consistency.details.orphanedAuth.length > 0) {
            console.log(`Found ${consistency.details.orphanedAuth.length} orphaned auth accounts`);
            
            if (!dryRun) {
                // Note: This requires user objects which we can't get from client SDK
                // In production, this would be done via Admin SDK
                console.warn('Creating profiles for orphaned accounts requires Admin SDK');
                
                // We can only fix accounts we can access
                for (const orphaned of consistency.details.orphanedAuth) {
                    try {
                        // Create basic profile
                        const profile = {
                            uid: orphaned.userId,
                            email: orphaned.email,
                            fullName: 'Unknown User',
                            address: '',
                            city: '',
                            postalCode: '',
                            role: 'customer',
                            isMember: false,
                            memberRequestPending: false,
                            emailVerified: false,
                            createdAt: serverTimestamp(),
                            recoveredAccount: true,
                            recoveredAt: serverTimestamp()
                        };
                        
                        await setDoc(doc(db, 'users', orphaned.userId), profile);
                        results.profilesCreated++;
                        results.fixed.push({
                            uid: orphaned.userId,
                            action: 'profile_created',
                            email: orphaned.email
                        });
                        
                    } catch (error) {
                        results.errors.push({
                            uid: orphaned.userId,
                            error: error.message
                        });
                    }
                }
            }
        }
        
        // Use reconciliation service
        if (!dryRun) {
            const reconcileResult = await reconcileAuthAccounts({
                dryRun: false,
                fixMissingFields: true,
                fixVerificationStatus: true,
                createMissingProfiles: createProfiles
            });
            
            if (reconcileResult.success) {
                results.profilesCreated += reconcileResult.results.profilesCreated || 0;
                results.fixed = results.fixed.concat(reconcileResult.results.fixed || []);
            }
        }
        
        console.log('Bulk fix complete:', results);
        
        return {
            success: true,
            results,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Error fixing orphaned accounts:', error);
        return {
            success: false,
            error: error.message,
            results: null
        };
    }
}

// 3. Resend verification emails to users
export async function resendVerificationEmails(userIds, options = {}) {
    const {
        includeVerified = false,
        maxRetries = 3,
        language = 'is'
    } = options;
    
    console.log(`Resending verification emails to ${userIds.length} users...`);
    
    const results = {
        sent: [],
        failed: [],
        skipped: []
    };
    
    for (const userId of userIds) {
        try {
            // Get user data
            const userDoc = await getDoc(doc(db, 'users', userId));
            
            if (!userDoc.exists()) {
                results.failed.push({
                    uid: userId,
                    error: 'User not found'
                });
                continue;
            }
            
            const userData = userDoc.data();
            
            // Skip if already verified unless forced
            if (userData.emailVerified && !includeVerified) {
                results.skipped.push({
                    uid: userId,
                    reason: 'Already verified'
                });
                continue;
            }
            
            // Note: Sending email requires the user object from Auth
            // This is a limitation of client SDK
            console.warn(`Cannot send email to ${userData.email} - requires signed-in user or Admin SDK`);
            
            results.failed.push({
                uid: userId,
                error: 'Requires Admin SDK',
                email: userData.email
            });
            
        } catch (error) {
            console.error(`Error processing user ${userId}:`, error);
            results.failed.push({
                uid: userId,
                error: error.message
            });
        }
    }
    
    return {
        success: results.sent.length > 0,
        results,
        summary: {
            total: userIds.length,
            sent: results.sent.length,
            failed: results.failed.length,
            skipped: results.skipped.length
        }
    };
}

// 4. Delete users completely (auth + profile + data)
export async function deleteUsersCompletely(userIds, options = {}) {
    const {
        dryRun = true,
        deleteOrders = true,
        deleteEmailTracking = true,
        requireConfirmation = true
    } = options;
    
    console.log(`Deleting ${userIds.length} users completely (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    if (!dryRun && requireConfirmation) {
        const confirmMsg = `Are you sure you want to permanently delete ${userIds.length} users? This cannot be undone.`;
        if (!confirm(confirmMsg)) {
            return {
                success: false,
                error: 'Deletion cancelled by user'
            };
        }
    }
    
    const results = {
        deleted: [],
        failed: [],
        collections: {
            profiles: 0,
            orders: 0,
            emailTracking: 0
        }
    };
    
    const batch = writeBatch(db);
    let batchCount = 0;
    
    for (const userId of userIds) {
        try {
            // Get user profile
            const userDoc = await getDoc(doc(db, 'users', userId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            if (!dryRun) {
                // Delete Firestore profile
                if (userDoc.exists()) {
                    batch.delete(doc(db, 'users', userId));
                    batchCount++;
                    results.collections.profiles++;
                }
                
                // Delete user orders if requested
                if (deleteOrders) {
                    const ordersQuery = query(
                        collection(db, 'orders'),
                        where('userId', '==', userId)
                    );
                    const ordersSnapshot = await getDocs(ordersQuery);
                    
                    ordersSnapshot.forEach(orderDoc => {
                        if (batchCount < ADMIN_CONFIG.batchSize) {
                            batch.delete(orderDoc.ref);
                            batchCount++;
                            results.collections.orders++;
                        }
                    });
                }
                
                // Delete email tracking if requested
                if (deleteEmailTracking) {
                    const trackingRef = doc(db, 'emailTracking', userId);
                    const trackingDoc = await getDoc(trackingRef);
                    
                    if (trackingDoc.exists() && batchCount < ADMIN_CONFIG.batchSize) {
                        batch.delete(trackingRef);
                        batchCount++;
                        results.collections.emailTracking++;
                    }
                }
                
                // Commit batch if full
                if (batchCount >= ADMIN_CONFIG.batchSize - 10) {
                    await batch.commit();
                    batchCount = 0;
                }
            }
            
            results.deleted.push({
                uid: userId,
                email: userData?.email,
                deletedCollections: ['users', 
                    deleteOrders ? 'orders' : null,
                    deleteEmailTracking ? 'emailTracking' : null
                ].filter(Boolean)
            });
            
        } catch (error) {
            console.error(`Error deleting user ${userId}:`, error);
            results.failed.push({
                uid: userId,
                error: error.message
            });
        }
    }
    
    // Commit remaining batch operations
    if (!dryRun && batchCount > 0) {
        await batch.commit();
    }
    
    // Note: Deleting from Firebase Auth requires Admin SDK
    if (!dryRun) {
        console.warn('Firebase Auth deletion requires Admin SDK - only Firestore data was deleted');
    }
    
    return {
        success: results.deleted.length > 0,
        dryRun,
        results,
        summary: {
            total: userIds.length,
            deleted: results.deleted.length,
            failed: results.failed.length,
            collections: results.collections
        },
        warning: 'Auth account deletion requires Admin SDK'
    };
}

// 5. Export user data for debugging
export async function exportUserData(options = {}) {
    const {
        format = 'json',
        includeOrders = true,
        includeEmailStats = true,
        filterRole = null,
        filterStatus = null,
        maxExport = ADMIN_CONFIG.maxExportSize
    } = options;
    
    console.log(`Exporting user data in ${format} format...`);
    
    try {
        // Get all users with status
        const usersResult = await listAllUsersWithStatus({
            pageSize: maxExport,
            filterStatus: filterStatus,
            includeStats: includeEmailStats
        });
        
        if (!usersResult.success) {
            throw new Error('Failed to fetch users');
        }
        
        let users = usersResult.users;
        
        // Apply role filter if specified
        if (filterRole) {
            users = users.filter(u => u.role === filterRole);
        }
        
        // Fetch additional data if requested
        if (includeOrders) {
            for (const user of users) {
                try {
                    const ordersQuery = query(
                        collection(db, 'orders'),
                        where('userId', '==', user.uid),
                        orderBy('createdAt', 'desc'),
                        limit(10)
                    );
                    
                    const ordersSnapshot = await getDocs(ordersQuery);
                    user.recentOrders = ordersSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate()
                    }));
                    user.totalOrders = ordersSnapshot.size;
                    
                } catch (error) {
                    console.error(`Error fetching orders for ${user.uid}:`, error);
                    user.recentOrders = [];
                    user.totalOrders = 0;
                }
            }
        }
        
        // Format data based on requested format
        let exportData;
        let filename;
        let mimeType;
        
        if (format === 'csv') {
            exportData = convertToCSV(users);
            filename = `sleipnir_users_export_${Date.now()}.csv`;
            mimeType = 'text/csv';
        } else {
            exportData = JSON.stringify({
                exportDate: new Date().toISOString(),
                totalUsers: users.length,
                summary: usersResult.summary,
                filters: {
                    role: filterRole,
                    status: filterStatus
                },
                users: users
            }, null, 2);
            filename = `sleipnir_users_export_${Date.now()}.json`;
            mimeType = 'application/json';
        }
        
        return {
            success: true,
            data: exportData,
            filename: filename,
            mimeType: mimeType,
            recordCount: users.length,
            summary: usersResult.summary
        };
        
    } catch (error) {
        console.error('Error exporting user data:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 6. Monitor email delivery status
export async function monitorEmailDeliveryStatus(options = {}) {
    const {
        timeWindow = ADMIN_CONFIG.emailMonitoringWindow,
        groupBy = 'hour'
    } = options;
    
    console.log('Monitoring email delivery status...');
    
    try {
        const cutoffTime = new Date(Date.now() - timeWindow);
        
        // Get email tracking data
        const trackingSnapshot = await getDocs(collection(db, 'emailTracking'));
        
        const emailStats = {
            total: 0,
            sent: 0,
            verified: 0,
            pending: 0,
            failed: 0,
            byHour: {},
            byType: {
                verification: 0,
                passwordReset: 0,
                memberApproval: 0
            },
            averageDeliveryTime: 0,
            userStats: []
        };
        
        const deliveryTimes = [];
        
        trackingSnapshot.forEach(doc => {
            const data = doc.data();
            const userId = doc.id;
            
            // Only include recent emails
            if (data.lastSent && data.lastSent.toDate() > cutoffTime) {
                emailStats.total++;
                
                if (data.status === 'sent') {
                    emailStats.sent++;
                } else if (data.status === 'verified') {
                    emailStats.verified++;
                    
                    // Calculate delivery time
                    if (data.verifiedAt && data.lastSent) {
                        const deliveryTime = data.verifiedAt.toDate() - data.lastSent.toDate();
                        deliveryTimes.push(deliveryTime);
                    }
                } else {
                    emailStats.pending++;
                }
                
                // Group by hour
                const sentHour = new Date(data.lastSent.toDate());
                sentHour.setMinutes(0, 0, 0);
                const hourKey = sentHour.toISOString();
                
                if (!emailStats.byHour[hourKey]) {
                    emailStats.byHour[hourKey] = {
                        sent: 0,
                        verified: 0,
                        pending: 0
                    };
                }
                
                emailStats.byHour[hourKey].sent++;
                if (data.status === 'verified') {
                    emailStats.byHour[hourKey].verified++;
                } else if (data.status === 'sent') {
                    emailStats.byHour[hourKey].pending++;
                }
                
                // Add to user stats
                emailStats.userStats.push({
                    userId: userId,
                    sentCount: data.sentCount || 0,
                    reminderCount: data.reminderCount || 0,
                    lastSent: data.lastSent?.toDate(),
                    status: data.status,
                    verifiedAt: data.verifiedAt?.toDate()
                });
            }
        });
        
        // Calculate average delivery time
        if (deliveryTimes.length > 0) {
            const avgTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
            emailStats.averageDeliveryTime = Math.round(avgTime / 1000 / 60); // Minutes
        }
        
        // Calculate delivery rate
        emailStats.deliveryRate = emailStats.sent > 0 
            ? Math.round((emailStats.verified / emailStats.sent) * 100) 
            : 0;
        
        // Sort user stats by last sent
        emailStats.userStats.sort((a, b) => 
            (b.lastSent || 0) - (a.lastSent || 0)
        );
        
        return {
            success: true,
            stats: emailStats,
            timeWindow: {
                start: cutoffTime,
                end: new Date(),
                hours: timeWindow / (1000 * 60 * 60)
            },
            recommendations: generateEmailRecommendations(emailStats)
        };
        
    } catch (error) {
        console.error('Error monitoring email delivery:', error);
        return {
            success: false,
            error: error.message,
            stats: null
        };
    }
}

// Helper function to convert data to CSV
function convertToCSV(users) {
    const headers = [
        'UID',
        'Email',
        'Full Name',
        'Role',
        'Status',
        'Member',
        'Member Request',
        'Email Verified',
        'Created At',
        'Last Login',
        'Total Orders',
        'Verification Emails Sent',
        'Verification Reminders'
    ];
    
    const rows = users.map(user => [
        user.uid,
        user.email || '',
        user.fullName || '',
        user.role || 'customer',
        user.status,
        user.isMember ? 'Yes' : 'No',
        user.memberRequestPending ? 'Yes' : 'No',
        user.emailVerified ? 'Yes' : 'No',
        user.createdAt ? new Date(user.createdAt).toISOString() : '',
        user.lastLogin ? new Date(user.lastLogin).toISOString() : '',
        user.totalOrders || 0,
        user.verificationStats?.sentCount || 0,
        user.verificationStats?.reminderCount || 0
    ]);
    
    // Escape CSV values
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');
    
    return csvContent;
}

// Generate email delivery recommendations
function generateEmailRecommendations(stats) {
    const recommendations = [];
    
    if (stats.deliveryRate < 50) {
        recommendations.push({
            priority: 'high',
            message: 'Low email delivery rate. Check spam folder instructions and email content.',
            action: 'Review email templates and add SPF/DKIM records'
        });
    }
    
    if (stats.averageDeliveryTime > 60) {
        recommendations.push({
            priority: 'medium',
            message: 'Slow email verification times. Consider sending reminder emails.',
            action: 'Implement automatic reminder system'
        });
    }
    
    if (stats.pending > stats.verified) {
        recommendations.push({
            priority: 'high',
            message: 'Many pending verifications. Users may not be receiving emails.',
            action: 'Check email delivery settings and consider using a different provider'
        });
    }
    
    const highReminders = stats.userStats.filter(u => u.reminderCount > 2);
    if (highReminders.length > 0) {
        recommendations.push({
            priority: 'medium',
            message: `${highReminders.length} users needed multiple reminders.`,
            action: 'Investigate why initial emails are not being acted upon'
        });
    }
    
    return recommendations;
}

// Admin dashboard summary
export async function getAdminDashboardSummary() {
    try {
        const [
            usersResult,
            emailStats,
            consistencyCheck
        ] = await Promise.all([
            listAllUsersWithStatus({ pageSize: 1000, includeStats: false }),
            monitorEmailDeliveryStatus({ timeWindow: 7 * 24 * 60 * 60 * 1000 }), // 7 days
            checkAuthConsistency({ includeDetails: false })
        ]);
        
        // Get recent orders count
        const recentOrdersQuery = query(
            collection(db, 'orders'),
            where('createdAt', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
            orderBy('createdAt', 'desc')
        );
        const ordersSnapshot = await getDocs(recentOrdersQuery);
        
        return {
            success: true,
            summary: {
                users: usersResult.summary,
                emails: {
                    last7Days: emailStats.stats.total,
                    deliveryRate: emailStats.stats.deliveryRate,
                    pending: emailStats.stats.pending
                },
                consistency: consistencyCheck.summary,
                orders: {
                    last7Days: ordersSnapshot.size
                },
                alerts: [
                    ...emailStats.recommendations,
                    consistencyCheck.summary.total > 0 ? {
                        priority: 'high',
                        message: `${consistencyCheck.summary.total} data inconsistencies found`,
                        action: 'Run consistency fix tool'
                    } : null
                ].filter(Boolean)
            },
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Error generating admin dashboard summary:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Cloud Function generator for server-side operations
export function generateAdminCloudFunctions() {
    return `
// Admin Cloud Functions for User Management
// Deploy to Firebase Functions with Admin SDK

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const auth = admin.auth();
const db = admin.firestore();

// List all auth users with profiles
exports.listAllAuthUsers = functions.https.onCall(async (data, context) => {
    // Verify admin
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    
    const { pageSize = 100, pageToken } = data;
    
    try {
        // List users from Auth
        const listResult = await auth.listUsers(pageSize, pageToken);
        
        // Get profiles for each user
        const users = await Promise.all(
            listResult.users.map(async (user) => {
                const profile = await db.collection('users').doc(user.uid).get();
                
                return {
                    uid: user.uid,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    disabled: user.disabled,
                    createdAt: user.metadata.creationTime,
                    lastSignIn: user.metadata.lastSignInTime,
                    hasProfile: profile.exists,
                    profile: profile.exists ? profile.data() : null
                };
            })
        );
        
        return {
            users,
            pageToken: listResult.pageToken
        };
        
    } catch (error) {
        console.error('Error listing users:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Delete user completely
exports.deleteUserCompletely = functions.https.onCall(async (data, context) => {
    // Verify admin
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    
    const { userId, deleteData = true } = data;
    
    try {
        // Delete from Auth
        await auth.deleteUser(userId);
        
        if (deleteData) {
            // Delete Firestore data
            const batch = db.batch();
            
            // Delete profile
            batch.delete(db.collection('users').doc(userId));
            
            // Delete orders
            const orders = await db.collection('orders')
                .where('userId', '==', userId)
                .get();
            
            orders.forEach(doc => batch.delete(doc.ref));
            
            // Delete email tracking
            batch.delete(db.collection('emailTracking').doc(userId));
            
            await batch.commit();
        }
        
        return { success: true, userId };
        
    } catch (error) {
        console.error('Error deleting user:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Send verification email to any user
exports.sendVerificationEmailAdmin = functions.https.onCall(async (data, context) => {
    // Verify admin
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    
    const { email, actionUrl } = data;
    
    try {
        // Get user by email
        const user = await auth.getUserByEmail(email);
        
        // Generate email link
        const link = await auth.generateEmailVerificationLink(email, {
            url: actionUrl || 'https://sleipnirmc.is/verify-email.html'
        });
        
        // Send email (integrate with your email service)
        // await sendCustomEmail(email, 'verification', { link });
        
        return { success: true, email, link };
        
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
    `;
}

// Export all admin tools
export default {
    listAllUsersWithStatus,
    fixOrphanedAccountsBulk,
    resendVerificationEmails,
    deleteUsersCompletely,
    exportUserData,
    monitorEmailDeliveryStatus,
    getAdminDashboardSummary,
    generateAdminCloudFunctions,
    UserStatus,
    ADMIN_CONFIG
};