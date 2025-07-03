import { auth } from './firebase-config.js';
import { 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  inMemoryPersistence,
  sendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  checkActionCode
} from 'firebase/auth';

// Auth persistence settings
export const AUTH_PERSISTENCE = {
  LOCAL: browserLocalPersistence,    // Persists even when browser closed
  SESSION: browserSessionPersistence, // Cleared when tab closed
  NONE: inMemoryPersistence          // Cleared on page refresh
};

// Action code settings configuration
export const getActionCodeSettings = (continueUrl = window.location.origin) => ({
  // URL to redirect back to after email action
  url: continueUrl,
  
  // This must be true for email link sign-in
  handleCodeInApp: true,
  
  // iOS app configuration
  iOS: {
    bundleId: 'com.sleipnir.app'
  },
  
  // Android app configuration
  android: {
    packageName: 'com.sleipnir.app',
    installApp: true,
    minimumVersion: '12'
  },
  
  // Whether to open link in mobile app or browser
  dynamicLinkDomain: 'sleipnir.page.link'
});

// Email template configuration
export const EMAIL_TEMPLATES = {
  verifyEmail: {
    subject: 'Staðfestu netfangið þitt fyrir Sleipnir',
    senderName: 'Sleipnir Mótorhjólaklúbbur',
    customMessage: 'Takk fyrir að skrá þig í Sleipnir. Vinsamlegast staðfestu netfangið þitt.'
  },
  resetPassword: {
    subject: 'Endurstilla lykilorð fyrir Sleipnir',
    senderName: 'Sleipnir Mótorhjólaklúbbur',
    customMessage: 'Þú hefur beðið um að endurstilla lykilorðið þitt.'
  },
  emailChange: {
    subject: 'Netfangi breytt fyrir Sleipnir aðgang',
    senderName: 'Sleipnir Mótorhjólaklúbbur',
    customMessage: 'Netfangið þitt hefur verið breytt.'
  }
};

// Configure auth persistence
export async function setAuthPersistence(persistenceType = AUTH_PERSISTENCE.LOCAL) {
  try {
    await setPersistence(auth, persistenceType);
    console.log('Auth persistence set successfully');
    return true;
  } catch (error) {
    console.error('Error setting auth persistence:', error);
    return false;
  }
}

// Send email verification with custom settings
export async function sendVerificationEmail(user, customContinueUrl = null) {
  try {
    const actionCodeSettings = getActionCodeSettings(
      customContinueUrl || `${window.location.origin}/verify-email`
    );
    
    await sendEmailVerification(user, actionCodeSettings);
    console.log('Verification email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

// Send password reset email with custom settings
export async function sendPasswordReset(email, customContinueUrl = null) {
  try {
    const actionCodeSettings = getActionCodeSettings(
      customContinueUrl || `${window.location.origin}/reset-password`
    );
    
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    console.log('Password reset email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

// Handle email verification
export async function handleEmailVerification(actionCode) {
  try {
    await applyActionCode(auth, actionCode);
    console.log('Email verified successfully');
    return { success: true };
  } catch (error) {
    console.error('Error verifying email:', error);
    return { success: false, error: error.message };
  }
}

// Handle password reset confirmation
export async function handlePasswordReset(actionCode, newPassword) {
  try {
    // Verify the password reset code is valid
    const email = await verifyPasswordResetCode(auth, actionCode);
    
    // Confirm the password reset
    await confirmPasswordReset(auth, actionCode, newPassword);
    
    console.log('Password reset successfully for:', email);
    return { success: true, email };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message };
  }
}

// Check action code and get info
export async function getActionCodeInfo(actionCode) {
  try {
    const info = await checkActionCode(auth, actionCode);
    return {
      success: true,
      operation: info.operation,
      data: info.data
    };
  } catch (error) {
    console.error('Error checking action code:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to handle auth action URLs
export async function handleAuthAction(mode, actionCode, continueUrl) {
  switch (mode) {
    case 'resetPassword':
      // Redirect to password reset page with code
      window.location.href = `/reset-password?oobCode=${actionCode}&continueUrl=${continueUrl}`;
      break;
      
    case 'verifyEmail':
      const verifyResult = await handleEmailVerification(actionCode);
      if (verifyResult.success) {
        window.location.href = continueUrl || '/';
      }
      return verifyResult;
      
    case 'recoverEmail':
      // Handle email recovery
      const info = await getActionCodeInfo(actionCode);
      if (info.success) {
        // Apply the action code to recover the email
        const result = await applyActionCode(auth, actionCode);
        return { success: true, email: info.data.email };
      }
      return info;
      
    default:
      return { success: false, error: 'Invalid action mode' };
  }
}

// Configure auth settings on app initialization
export function initializeAuthSettings() {
  // Set default persistence to LOCAL
  setAuthPersistence(AUTH_PERSISTENCE.LOCAL);
  
  // Add auth state observer
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('User authenticated:', user.email);
      
      // Check if email is verified
      if (!user.emailVerified) {
        console.log('Email not verified. Consider prompting user to verify.');
      }
    } else {
      console.log('User not authenticated');
    }
  });
  
  // Configure auth language (Icelandic)
  auth.languageCode = 'is';
  
  console.log('Auth settings initialized');
}

// Get current auth persistence type
export function getCurrentPersistence() {
  const persistence = auth.persistenceManager?.persistence?.type;
  
  switch (persistence) {
    case 'LOCAL':
      return 'browserLocalPersistence';
    case 'SESSION':
      return 'browserSessionPersistence';
    case 'NONE':
      return 'inMemoryPersistence';
    default:
      return 'unknown';
  }
}

// Export auth instance for convenience
export { auth };