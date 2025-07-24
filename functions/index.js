const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  log,
  info,
  debug,
  warn,
  error,
} = require("firebase-functions/logger");

admin.initializeApp();

// Log authentication events
exports.logAuthEvents = functions.auth.user().onCreate(async (user) => {
  info("New user created", {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    creationTime: user.metadata.creationTime,
  });
  
  // Log to Firestore for tracking
  try {
    await admin.firestore().collection('email_logs').add({
      type: 'user_created',
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    error("Failed to log to Firestore", err);
  }
  
  return null;
});

// Log when user is deleted
exports.logUserDeletion = functions.auth.user().onDelete(async (user) => {
  info("User deleted", {
    uid: user.uid,
    email: user.email,
  });
  
  return null;
});

// HTTP function to trigger test email
exports.testEmailVerification = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const uid = context.auth.uid;
  const user = await admin.auth().getUser(uid);
  
  info("Test email verification requested", {
    uid: uid,
    email: user.email,
    emailVerified: user.emailVerified,
    requestTime: new Date().toISOString(),
  });
  
  // Log the attempt
  try {
    await admin.firestore().collection('email_logs').add({
      type: 'verification_requested',
      uid: uid,
      email: user.email,
      emailVerified: user.emailVerified,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: context.rawRequest.headers['user-agent'],
    });
    
    return {
      success: true,
      message: 'Email verification request logged',
      emailVerified: user.emailVerified,
    };
  } catch (err) {
    error("Failed to log email verification request", err);
    throw new functions.https.HttpsError('internal', 'Failed to log request');
  }
});

// Security Hardening - Server-side admin validation
exports.validateAdminAction = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if user has admin custom claim
  if (!context.auth.token.admin) {
    // Log unauthorized access attempt
    try {
      await admin.firestore().collection('adminActivityLog').add({
        type: 'unauthorized_admin_attempt',
        userId: context.auth.uid,
        email: context.auth.token.email,
        action: data.action || 'unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: context.rawRequest.ip,
        userAgent: context.rawRequest.headers['user-agent']
      });
    } catch (logError) {
      error("Failed to log unauthorized attempt", logError);
    }
    
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  // Log successful admin action
  try {
    await admin.firestore().collection('adminActivityLog').add({
      type: 'admin_action',
      userId: context.auth.uid,
      email: context.auth.token.email,
      action: data.action,
      details: data.details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: context.rawRequest.ip,
      userAgent: context.rawRequest.headers['user-agent']
    });
  } catch (logError) {
    error("Failed to log admin action", logError);
  }

  // Return success with admin verification
  return {
    success: true,
    adminVerified: true,
    userId: context.auth.uid,
    timestamp: new Date().toISOString()
  };
});

// Set or remove admin custom claim
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // This function should only be callable by existing admins or during initial setup
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if this is the initial setup (no admins exist yet)
  const adminsSnapshot = await admin.firestore()
    .collection('users')
    .where('role', '==', 'admin')
    .limit(1)
    .get();
  
  const isInitialSetup = adminsSnapshot.empty;
  
  // If not initial setup, require admin claim
  if (!isInitialSetup && !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can set admin claims');
  }

  const { targetUserId, setAdmin } = data;
  
  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Target user ID is required');
  }

  try {
    // Set custom claim
    await admin.auth().setCustomUserClaims(targetUserId, {
      admin: setAdmin === true
    });

    // Update Firestore user document to maintain consistency
    await admin.firestore().collection('users').doc(targetUserId).update({
      role: setAdmin ? 'admin' : 'user',
      adminClaimSet: setAdmin,
      adminClaimUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminClaimUpdatedBy: context.auth.uid
    });

    // Log the action
    await admin.firestore().collection('adminActivityLog').add({
      type: setAdmin ? 'admin_claim_granted' : 'admin_claim_revoked',
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email,
      targetUserId: targetUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isInitialSetup: isInitialSetup
    });

    info(`Admin claim ${setAdmin ? 'granted' : 'revoked'} for user ${targetUserId}`);

    return {
      success: true,
      message: `Admin claim ${setAdmin ? 'granted' : 'revoked'} successfully`,
      targetUserId: targetUserId
    };
  } catch (err) {
    error("Failed to set admin claim", err);
    throw new functions.https.HttpsError('internal', 'Failed to update admin claim');
  }
});

// Sync admin claims with Firestore roles (migration helper)
exports.syncAdminClaims = functions.https.onCall(async (data, context) => {
  // Only admins can sync claims
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    // Get all users with admin role in Firestore
    const adminUsers = await admin.firestore()
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    const updates = [];
    
    for (const doc of adminUsers.docs) {
      const userId = doc.id;
      const userData = doc.data();
      
      // Set admin custom claim
      updates.push(
        admin.auth().setCustomUserClaims(userId, { admin: true })
          .then(() => {
            info(`Synced admin claim for user ${userId} (${userData.email})`);
            return { userId, success: true };
          })
          .catch(err => {
            error(`Failed to sync admin claim for user ${userId}`, err);
            return { userId, success: false, error: err.message };
          })
      );
    }

    const results = await Promise.all(updates);
    
    // Log the sync operation
    await admin.firestore().collection('adminActivityLog').add({
      type: 'admin_claims_sync',
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email,
      results: results,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: `Synced ${results.length} admin claims`,
      results: results
    };
  } catch (err) {
    error("Failed to sync admin claims", err);
    throw new functions.https.HttpsError('internal', 'Failed to sync admin claims');
  }
});

// Delete user account - comprehensive user removal with data handling
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Security: Require authenticated admin with token claim
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  if (!context.auth.token.admin) {
    // Log unauthorized attempt
    try {
      await admin.firestore().collection('adminActivityLog').add({
        type: 'unauthorized_delete_attempt',
        userId: context.auth.uid,
        email: context.auth.token.email,
        targetUserId: data.userId || 'unknown',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: context.rawRequest.ip,
        userAgent: context.rawRequest.headers['user-agent']
      });
    } catch (logError) {
      error("Failed to log unauthorized delete attempt", logError);
    }
    
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { userId, archiveData } = data;
  
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
  }

  // Prevent self-deletion
  if (context.auth.uid === userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot delete your own account');
  }

  try {
    // Get user data before deletion for archival
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    
    // Prevent deletion of admin users
    if (userData.role === 'admin') {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot delete admin users');
    }

    // Archive user data if requested
    if (archiveData) {
      // Archive user information
      await admin.firestore().collection('archivedUsers').doc(userId).set({
        ...userData,
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        archivedBy: context.auth.uid,
        archivedByEmail: context.auth.token.email,
        originalUserId: userId
      });

      // Archive associated orders
      const ordersSnapshot = await admin.firestore()
        .collection('orders')
        .where('userId', '==', userId)
        .get();
      
      const archivePromises = [];
      ordersSnapshot.forEach(doc => {
        archivePromises.push(
          admin.firestore().collection('archivedOrders').doc(doc.id).set({
            ...doc.data(),
            archivedAt: admin.firestore.FieldValue.serverTimestamp(),
            originalOrderId: doc.id,
            originalUserId: userId
          })
        );
      });
      
      await Promise.all(archivePromises);
      info(`Archived ${ordersSnapshot.size} orders for user ${userId}`);
    }

    // Delete user orders (or anonymize them)
    const ordersToDelete = await admin.firestore()
      .collection('orders')
      .where('userId', '==', userId)
      .get();
    
    const deleteOrdersPromises = [];
    ordersToDelete.forEach(doc => {
      if (archiveData) {
        // If archived, delete original
        deleteOrdersPromises.push(doc.ref.delete());
      } else {
        // If not archived, anonymize instead
        deleteOrdersPromises.push(doc.ref.update({
          userId: 'deleted_user',
          userEmail: 'deleted@user.com',
          userName: 'Deleted User',
          anonymizedAt: admin.firestore.FieldValue.serverTimestamp()
        }));
      }
    });
    
    await Promise.all(deleteOrdersPromises);

    // Delete user document from Firestore
    await admin.firestore().collection('users').doc(userId).delete();

    // Delete user from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
      info(`Deleted auth account for user ${userId}`);
    } catch (authError) {
      // If auth deletion fails, log but continue (user might already be deleted from auth)
      error(`Failed to delete auth account for user ${userId}`, authError);
    }

    // Log the deletion
    await admin.firestore().collection('adminActivityLog').add({
      type: 'user_deleted',
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email,
      deletedUserId: userId,
      deletedUserEmail: userData.email,
      archiveData: archiveData,
      ordersHandled: ordersToDelete.size,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: context.rawRequest.ip,
      userAgent: context.rawRequest.headers['user-agent']
    });

    info(`User ${userId} (${userData.email}) deleted by admin ${context.auth.uid}`);

    return {
      success: true,
      message: 'User deleted successfully',
      deletedUserId: userId,
      ordersHandled: ordersToDelete.size,
      dataArchived: archiveData
    };
  } catch (err) {
    error("Failed to delete user", err);
    throw new functions.https.HttpsError('internal', 'Failed to delete user: ' + err.message);
  }
});

// Monitor Firestore user creation
exports.onUserDocCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data();
    const userId = context.params.userId;
    
    info("User document created in Firestore", {
      userId: userId,
      email: userData.email,
      emailVerified: userData.emailVerified,
      timestamp: new Date().toISOString(),
    });
    
    return null;
  });

// Scheduled function to check email verification status
exports.checkEmailDeliveryHealth = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    info("Running email delivery health check");
    
    try {
      // Get recent email logs
      const recentLogs = await admin.firestore()
        .collection('email_logs')
        .where('timestamp', '>', new Date(Date.now() - 3600000)) // Last hour
        .get();
      
      const stats = {
        total: recentLogs.size,
        verified: 0,
        unverified: 0,
      };
      
      recentLogs.forEach(doc => {
        const data = doc.data();
        if (data.emailVerified) {
          stats.verified++;
        } else {
          stats.unverified++;
        }
      });
      
      info("Email delivery stats", stats);
      
      // Alert if no emails in last hour
      if (stats.total === 0) {
        warn("No email verification attempts in the last hour");
      }
      
    } catch (err) {
      error("Failed to check email delivery health", err);
    }
    
    return null;
  });