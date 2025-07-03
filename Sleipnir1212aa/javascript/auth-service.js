// Authentication Service Layer
// Provides clean API for auth operations with error handling and atomic operations

import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  deleteUser,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { getActionCodeSettings, getAuthErrorMessage } from './firebase-auth-config.js';

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2
};

// Create user account atomically with Firebase Auth and Firestore profile
export async function createUserAccount(email, password, userData) {
  let user = null;
  
  try {
    // Step 1: Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;
    
    // Step 2: Create Firestore profile atomically
    try {
      await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Check if profile already exists (shouldn't happen, but be safe)
        const userDoc = await transaction.get(userDocRef);
        if (userDoc.exists()) {
          throw new Error('User profile already exists');
        }
        
        // Create user profile
        const userProfile = {
          uid: user.uid,
          email: user.email,
          fullName: userData.fullName || '',
          address: userData.address || '',
          city: userData.city || '',
          postalCode: userData.postalCode || '',
          role: 'customer',
          isMember: false,
          memberRequestPending: userData.requestMembership || false,
          emailVerified: false,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        };
        
        transaction.set(userDocRef, userProfile);
      });
      
      // Step 3: Send verification email with retry
      await sendVerificationEmailWithRetry(user);
      
      return {
        success: true,
        user: user,
        message: 'Account created successfully'
      };
      
    } catch (firestoreError) {
      // If Firestore fails, delete the Firebase Auth account
      console.error('Firestore profile creation failed:', firestoreError);
      await deleteUser(user);
      throw new Error('Failed to create user profile. Account creation rolled back.');
    }
    
  } catch (error) {
    console.error('Account creation error:', error);
    
    // If we created a user but something failed, ensure cleanup
    if (user) {
      try {
        await deleteUser(user);
      } catch (deleteError) {
        console.error('Failed to cleanup auth account:', deleteError);
      }
    }
    
    return {
      success: false,
      error: error.code || 'auth/unknown-error',
      message: getAuthErrorMessage(error.code) || error.message
    };
  }
}

// Login user with orphaned account detection and handling
export async function loginUser(email, password) {
  try {
    // Check if email exists in Firebase Auth
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    if (signInMethods.length === 0) {
      return {
        success: false,
        error: 'auth/user-not-found',
        message: getAuthErrorMessage('auth/user-not-found')
      };
    }
    
    // Attempt to sign in
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check for Firestore profile
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Orphaned account detected
      console.warn('Orphaned account detected:', user.uid);
      
      // Attempt to create missing profile
      const repairResult = await repairOrphanedAccount(user);
      if (!repairResult.success) {
        // If repair fails, sign out and cleanup
        await auth.signOut();
        await cleanupOrphanedAccount(email);
        
        return {
          success: false,
          error: 'auth/profile-missing',
          message: 'Account profile missing. Please register again.'
        };
      }
    }
    
    // Update last login
    await updateLastLogin(user.uid);
    
    return {
      success: true,
      user: user,
      profile: userDoc.exists() ? userDoc.data() : null,
      message: 'Login successful'
    };
    
  } catch (error) {
    console.error('Login error:', error);
    
    return {
      success: false,
      error: error.code || 'auth/unknown-error',
      message: getAuthErrorMessage(error.code) || error.message
    };
  }
}

// Send verification email with retry logic
export async function sendVerificationEmailWithRetry(user, customActionCodeSettings = null) {
  const actionCodeSettings = customActionCodeSettings || getActionCodeSettings();
  let lastError = null;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      await sendEmailVerification(user, actionCodeSettings);
      
      console.log(`Verification email sent successfully on attempt ${attempt}`);
      return {
        success: true,
        attempts: attempt,
        message: 'Verification email sent'
      };
      
    } catch (error) {
      lastError = error;
      console.warn(`Email send attempt ${attempt} failed:`, error.message);
      
      if (attempt < RETRY_CONFIG.maxAttempts) {
        // Calculate delay with exponential backoff
        const delay = RETRY_CONFIG.delayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // All attempts failed
  console.error('All email send attempts failed:', lastError);
  return {
    success: false,
    error: lastError.code || 'email/send-failed',
    message: 'Failed to send verification email after multiple attempts',
    attempts: RETRY_CONFIG.maxAttempts
  };
}

// Cleanup orphaned Firebase Auth account without Firestore profile
export async function cleanupOrphanedAccount(email) {
  try {
    // First, check if the account exists
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    if (signInMethods.length === 0) {
      return {
        success: true,
        message: 'No account found to cleanup'
      };
    }
    
    // We need to be signed in as the user to delete the account
    // This is a limitation of Firebase Auth client SDK
    // In production, this would be handled by Cloud Functions
    
    console.warn('Orphaned account cleanup requires admin privileges or Cloud Functions');
    
    return {
      success: false,
      error: 'auth/requires-admin',
      message: 'Account cleanup requires administrator action'
    };
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return {
      success: false,
      error: error.code || 'cleanup/failed',
      message: 'Failed to cleanup orphaned account'
    };
  }
}

// Repair orphaned account by creating missing Firestore profile
async function repairOrphanedAccount(user) {
  try {
    const userProfile = {
      uid: user.uid,
      email: user.email,
      fullName: user.displayName || '',
      address: '',
      city: '',
      postalCode: '',
      role: 'customer',
      isMember: false,
      memberRequestPending: false,
      emailVerified: user.emailVerified,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      repairedAccount: true
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    console.log('Orphaned account repaired:', user.uid);
    return { success: true };
    
  } catch (error) {
    console.error('Failed to repair orphaned account:', error);
    return { success: false, error: error.message };
  }
}

// Update user's last login timestamp
async function updateLastLogin(userId) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      lastLogin: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
}

// Sleep utility for retry delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Error handling utilities
export const AuthError = {
  // Check if error is authentication related
  isAuthError(error) {
    return error && error.code && error.code.startsWith('auth/');
  },
  
  // Check if error is network related
  isNetworkError(error) {
    return error && (
      error.code === 'auth/network-request-failed' ||
      error.message.includes('network') ||
      error.message.includes('fetch')
    );
  },
  
  // Check if error is permission related
  isPermissionError(error) {
    return error && (
      error.code === 'permission-denied' ||
      error.code === 'auth/unauthorized-domain' ||
      error.code === 'auth/operation-not-allowed'
    );
  },
  
  // Get user-friendly error message
  getUserMessage(error, lang = 'is') {
    if (!error) {
      return lang === 'is' ? 'Óþekkt villa' : 'Unknown error';
    }
    
    // First check for auth-specific errors
    if (this.isAuthError(error)) {
      return getAuthErrorMessage(error.code, lang);
    }
    
    // Network errors
    if (this.isNetworkError(error)) {
      return lang === 'is' 
        ? 'Nettenging virðist vera rofin. Vinsamlegast athugaðu tengingu þína.'
        : 'Network connection appears to be offline. Please check your connection.';
    }
    
    // Permission errors
    if (this.isPermissionError(error)) {
      return lang === 'is'
        ? 'Þú hefur ekki heimild til að framkvæma þessa aðgerð.'
        : 'You do not have permission to perform this action.';
    }
    
    // Generic error
    return lang === 'is'
      ? 'Villa kom upp. Vinsamlegast reyndu aftur.'
      : 'An error occurred. Please try again.';
  },
  
  // Log error with context
  log(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      code: error?.code,
      message: error?.message,
      stack: error?.stack
    };
    
    console.error(`[AuthService ${context}]`, errorInfo);
    
    // In production, this would send to error tracking service
    if (window.location.hostname !== 'localhost') {
      // Send to error tracking (e.g., Sentry, LogRocket)
    }
  }
};

// Validate user data before account creation
export function validateUserData(userData) {
  const errors = [];
  
  if (!userData.email || !userData.email.includes('@')) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }
  
  if (!userData.password || userData.password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  }
  
  if (!userData.fullName || userData.fullName.trim().length < 2) {
    errors.push({ field: 'fullName', message: 'Full name is required' });
  }
  
  if (!userData.address || userData.address.trim().length < 3) {
    errors.push({ field: 'address', message: 'Address is required' });
  }
  
  if (!userData.city || userData.city.trim().length < 2) {
    errors.push({ field: 'city', message: 'City is required' });
  }
  
  if (!userData.postalCode || !/^\d{3}$/.test(userData.postalCode)) {
    errors.push({ field: 'postalCode', message: 'Valid 3-digit postal code is required' });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Check if user exists in both Auth and Firestore
export async function checkUserExists(email) {
  try {
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    return {
      exists: signInMethods.length > 0,
      hasPassword: signInMethods.includes('password')
    };
  } catch (error) {
    console.error('Error checking user existence:', error);
    return { exists: false, hasPassword: false };
  }
}

// Export auth instance for convenience
export { auth };