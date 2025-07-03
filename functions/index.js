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