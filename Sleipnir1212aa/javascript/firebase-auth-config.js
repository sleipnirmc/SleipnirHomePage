// Firebase Authentication Configuration
// Enhanced settings for Sleipnir MC Reykjavík website

import { auth } from './firebase-config.js';
import { 
  setPersistence, 
  browserLocalPersistence,
  sendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode
} from 'firebase/auth';

// Authentication persistence configuration
export async function configureAuthPersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('Auth persistence configured successfully');
  } catch (error) {
    console.error('Error configuring auth persistence:', error);
  }
}

// Action code settings for email verification and password reset
export function getActionCodeSettings() {
  const currentDomain = window.location.origin;
  
  return {
    // URL to redirect back to after email action
    url: `${currentDomain}/auth-action.html`,
    // This must be true for email link sign-in
    handleCodeInApp: true,
    // Optional iOS settings
    iOS: {
      bundleId: 'com.sleipnirmc.reykjavik'
    },
    // Optional Android settings
    android: {
      packageName: 'com.sleipnirmc.reykjavik',
      installApp: true,
      minimumVersion: '12'
    },
    // Optional dynamic link domain for mobile apps
    dynamicLinkDomain: 'sleipnirmc.page.link'
  };
}

// Email template configuration
export const emailTemplates = {
  verificationEmail: {
    subject: {
      is: 'Staðfestu netfangið þitt - Sleipnir MC Reykjavík',
      en: 'Verify your email - Sleipnir MC Reykjavík'
    },
    greeting: {
      is: 'Halló',
      en: 'Hello'
    },
    message: {
      is: 'Takk fyrir að skrá þig hjá Sleipnir MC Reykjavík. Vinsamlegast staðfestu netfangið þitt með því að smella á hlekkinn hér að neðan.',
      en: 'Thank you for registering with Sleipnir MC Reykjavík. Please verify your email by clicking the link below.'
    },
    buttonText: {
      is: 'Staðfesta netfang',
      en: 'Verify Email'
    },
    footer: {
      is: 'Ef þú baðst ekki um þessa staðfestingu, vinsamlegast hunsa þennan póst.',
      en: 'If you did not request this verification, please ignore this email.'
    }
  },
  passwordReset: {
    subject: {
      is: 'Endurstilla lykilorð - Sleipnir MC Reykjavík',
      en: 'Reset password - Sleipnir MC Reykjavík'
    },
    message: {
      is: 'Við fengum beiðni um að endurstilla lykilorðið þitt. Smelltu á hlekkinn hér að neðan til að velja nýtt lykilorð.',
      en: 'We received a request to reset your password. Click the link below to choose a new password.'
    },
    buttonText: {
      is: 'Endurstilla lykilorð',
      en: 'Reset Password'
    },
    footer: {
      is: 'Ef þú baðst ekki um þessa breytingu, vinsamlegast hunsa þennan póst og lykilorðið þitt helst óbreytt.',
      en: 'If you did not request this change, please ignore this email and your password will remain unchanged.'
    }
  },
  membershipApproval: {
    subject: {
      is: 'Meðlimsumsókn samþykkt - Sleipnir MC Reykjavík',
      en: 'Membership application approved - Sleipnir MC Reykjavík'
    },
    message: {
      is: 'Til hamingju! Meðlimsumsókn þín hefur verið samþykkt. Þú hefur nú aðgang að meðlimavörum og öðru efni eingöngu fyrir meðlimi.',
      en: 'Congratulations! Your membership application has been approved. You now have access to member-only products and content.'
    },
    buttonText: {
      is: 'Skoða meðlimavörur',
      en: 'View Member Products'
    }
  }
};

// Enhanced email verification with custom continue URL
export async function sendVerificationEmail(user, languageCode = 'is') {
  const actionCodeSettings = getActionCodeSettings();
  
  // Add language parameter to continue URL
  actionCodeSettings.url = `${actionCodeSettings.url}?lang=${languageCode}&mode=verifyEmail`;
  
  try {
    await sendEmailVerification(user, actionCodeSettings);
    console.log('Verification email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

// Enhanced password reset with custom continue URL
export async function sendPasswordReset(email, languageCode = 'is') {
  const actionCodeSettings = getActionCodeSettings();
  
  // Add language parameter to continue URL
  actionCodeSettings.url = `${actionCodeSettings.url}?lang=${languageCode}&mode=resetPassword`;
  
  try {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    console.log('Password reset email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

// Handle email action codes (verification, password reset)
export async function handleActionCode(mode, actionCode, continueUrl, lang = 'is') {
  try {
    switch (mode) {
      case 'resetPassword':
        // Verify the password reset code is valid
        const email = await verifyPasswordResetCode(auth, actionCode);
        return { 
          success: true, 
          mode: 'resetPassword', 
          email,
          actionCode 
        };
        
      case 'verifyEmail':
        // Apply the email verification code
        await applyActionCode(auth, actionCode);
        return { 
          success: true, 
          mode: 'verifyEmail',
          message: lang === 'is' ? 'Netfang staðfest!' : 'Email verified!'
        };
        
      case 'recoverEmail':
        // Check the action code validity
        const info = await checkActionCode(auth, actionCode);
        // Apply the action code to recover the email
        await applyActionCode(auth, actionCode);
        return { 
          success: true, 
          mode: 'recoverEmail',
          restoredEmail: info.data.email 
        };
        
      default:
        throw new Error('Invalid action mode');
    }
  } catch (error) {
    console.error('Error handling action code:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
}

// Complete password reset with new password
export async function completePasswordReset(actionCode, newPassword) {
  try {
    await confirmPasswordReset(auth, actionCode, newPassword);
    return { 
      success: true,
      message: 'Password reset successfully' 
    };
  } catch (error) {
    console.error('Error completing password reset:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
}

// Auth state persistence helper
export function getStoredAuthState() {
  try {
    const authState = localStorage.getItem('sleipnir_auth_state');
    return authState ? JSON.parse(authState) : null;
  } catch (error) {
    console.error('Error retrieving auth state:', error);
    return null;
  }
}

// Store auth state helper
export function storeAuthState(user) {
  try {
    if (user) {
      const authState = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        lastLogin: new Date().toISOString()
      };
      localStorage.setItem('sleipnir_auth_state', JSON.stringify(authState));
    } else {
      localStorage.removeItem('sleipnir_auth_state');
    }
  } catch (error) {
    console.error('Error storing auth state:', error);
  }
}

// Clear all auth-related data from storage
export function clearAuthData() {
  try {
    localStorage.removeItem('sleipnir_auth_state');
    localStorage.removeItem('sleipnir_user_data');
    localStorage.removeItem('sleipnir_cart');
    sessionStorage.clear();
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
}

// Check if user should be redirected after auth action
export function getPostAuthRedirect() {
  const redirect = sessionStorage.getItem('sleipnir_auth_redirect');
  if (redirect) {
    sessionStorage.removeItem('sleipnir_auth_redirect');
    return redirect;
  }
  return null;
}

// Store intended destination before auth redirect
export function setPostAuthRedirect(url) {
  sessionStorage.setItem('sleipnir_auth_redirect', url);
}

// Authentication error messages
export const authErrorMessages = {
  'auth/user-not-found': {
    is: 'Notandi fannst ekki. Vinsamlegast athugaðu netfangið.',
    en: 'User not found. Please check your email address.'
  },
  'auth/wrong-password': {
    is: 'Rangt lykilorð. Vinsamlegast reyndu aftur.',
    en: 'Incorrect password. Please try again.'
  },
  'auth/email-already-in-use': {
    is: 'Þetta netfang er þegar í notkun.',
    en: 'This email is already in use.'
  },
  'auth/weak-password': {
    is: 'Lykilorðið þarf að vera að minnsta kosti 6 stafir.',
    en: 'Password should be at least 6 characters.'
  },
  'auth/invalid-email': {
    is: 'Ógilt netfang. Vinsamlegast sláðu inn gilt netfang.',
    en: 'Invalid email. Please enter a valid email address.'
  },
  'auth/operation-not-allowed': {
    is: 'Þessi aðgerð er ekki leyfð. Vinsamlegast hafðu samband við stjórnanda.',
    en: 'This operation is not allowed. Please contact an administrator.'
  },
  'auth/expired-action-code': {
    is: 'Þessi hlekkur er útrunninn. Vinsamlegast biðjið um nýjan.',
    en: 'This link has expired. Please request a new one.'
  },
  'auth/invalid-action-code': {
    is: 'Þessi hlekkur er ógildur. Vinsamlegast biðjið um nýjan.',
    en: 'This link is invalid. Please request a new one.'
  },
  'auth/too-many-requests': {
    is: 'Of margar tilraunir. Vinsamlegast reyndu aftur síðar.',
    en: 'Too many attempts. Please try again later.'
  }
};

// Get localized error message
export function getAuthErrorMessage(errorCode, lang = 'is') {
  const message = authErrorMessages[errorCode];
  if (message) {
    return message[lang] || message['en'];
  }
  return lang === 'is' 
    ? 'Villa kom upp. Vinsamlegast reyndu aftur.' 
    : 'An error occurred. Please try again.';
}

// Initialize auth configuration on import
configureAuthPersistence();

// Export auth instance for convenience
export { auth };