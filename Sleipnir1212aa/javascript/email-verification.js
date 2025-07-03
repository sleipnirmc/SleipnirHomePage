// Email Verification System
// Robust email verification with retry, caching, and reminder functionality

import { auth, db } from './firebase-config.js';
import { 
  sendEmailVerification,
  reload,
  applyActionCode
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Email verification configuration
const VERIFICATION_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 2000,
  backoffMultiplier: 2,
  cacheExpiryMs: 5 * 60 * 1000, // 5 minutes
  reminderDelayHours: 24,
  maxReminders: 3,
  emailDeliveryPriority: 'high'
};

// Cache for verification status
const verificationCache = new Map();

// Custom branded email template builder
export function buildVerificationEmailTemplate(user, lang = 'is') {
  const baseUrl = window.location.origin;
  const logoUrl = `${baseUrl}/Images/SleipnirLogo.png`;
  
  const templates = {
    is: {
      subject: '🏍️ Staðfestu netfangið þitt - Sleipnir MC Reykjavík',
      preheader: 'Kláraðu skráninguna þína hjá Sleipnir MC Reykjavík',
      greeting: `Halló ${user.displayName || 'félagi'}!`,
      headline: 'VELKOMIN/N Í SLEIPNIR MC REYKJAVÍK',
      message: 'Takk fyrir að skrá þig hjá okkur. Eitt skref í viðbót og þú ert klár/klár að versla og skoða meðlimaefni.',
      instruction: 'Smelltu á hnappinn hér að neðan til að staðfesta netfangið þitt:',
      buttonText: 'STAÐFESTA NETFANG',
      alternativeText: 'Eða afritaðu og límdu þennan hlekk í vafrann þinn:',
      expiryWarning: 'Þessi hlekkur rennur út eftir 24 klukkustundir.',
      motto: 'NO DRUGS, NO ATTITUDE',
      footer: 'Ef þú baðst ekki um þessa staðfestingu, vinsamlegast hunsa þennan póst.',
      signature: 'Kveðja,<br>Sleipnir MC Reykjavík'
    },
    en: {
      subject: '🏍️ Verify your email - Sleipnir MC Reykjavík',
      preheader: 'Complete your registration with Sleipnir MC Reykjavík',
      greeting: `Hello ${user.displayName || 'rider'}!`,
      headline: 'WELCOME TO SLEIPNIR MC REYKJAVÍK',
      message: 'Thank you for registering with us. One more step and you\'ll be ready to shop and access member content.',
      instruction: 'Click the button below to verify your email:',
      buttonText: 'VERIFY EMAIL',
      alternativeText: 'Or copy and paste this link into your browser:',
      expiryWarning: 'This link expires in 24 hours.',
      motto: 'NO DRUGS, NO ATTITUDE',
      footer: 'If you did not request this verification, please ignore this email.',
      signature: 'Best regards,<br>Sleipnir MC Reykjavík'
    }
  };
  
  const t = templates[lang] || templates.en;
  
  // Build HTML email template
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.subject}</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #000000; font-family: Arial, sans-serif;">
      <div style="display: none; max-height: 0; overflow: hidden;">
        ${t.preheader}
      </div>
      
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding-bottom: 30px;">
                  <img src="${logoUrl}" alt="Sleipnir MC Logo" width="200" style="display: block; max-width: 100%; height: auto;">
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="background-color: #1a1a1a; border: 2px solid #cf2342; padding: 40px 30px;">
                  <!-- Greeting -->
                  <p style="color: #ffffff; font-size: 18px; margin: 0 0 20px 0;">
                    ${t.greeting}
                  </p>
                  
                  <!-- Headline -->
                  <h1 style="color: #cf2342; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px 0; text-align: center;">
                    ${t.headline}
                  </h1>
                  
                  <!-- Message -->
                  <p style="color: #ffffff; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                    ${t.message}
                  </p>
                  
                  <!-- Instruction -->
                  <p style="color: #ffffff; font-size: 16px; margin: 0 0 30px 0;">
                    ${t.instruction}
                  </p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center">
                        <a href="{{verificationLink}}" style="display: inline-block; background-color: #cf2342; color: #ffffff; text-decoration: none; padding: 15px 40px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border: 2px solid #cf2342; transition: all 0.3s;">
                          ${t.buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Alternative Link -->
                  <p style="color: #888888; font-size: 14px; margin: 30px 0 20px 0;">
                    ${t.alternativeText}
                  </p>
                  <p style="color: #888888; font-size: 12px; word-break: break-all; margin: 0 0 20px 0;">
                    {{verificationLink}}
                  </p>
                  
                  <!-- Expiry Warning -->
                  <p style="color: #cf2342; font-size: 14px; margin: 0 0 30px 0;">
                    ${t.expiryWarning}
                  </p>
                  
                  <!-- Motto -->
                  <p style="color: #ffffff; font-size: 16px; text-align: center; margin: 30px 0; padding: 20px; border-top: 1px solid #cf2342; border-bottom: 1px solid #cf2342; letter-spacing: 3px;">
                    ${t.motto}
                  </p>
                  
                  <!-- Footer -->
                  <p style="color: #888888; font-size: 12px; margin: 20px 0 0 0;">
                    ${t.footer}
                  </p>
                  
                  <!-- Signature -->
                  <p style="color: #ffffff; font-size: 14px; margin: 20px 0 0 0;">
                    ${t.signature}
                  </p>
                </td>
              </tr>
              
              <!-- Contact Info -->
              <tr>
                <td align="center" style="padding: 30px 0;">
                  <p style="color: #888888; font-size: 12px; margin: 0;">
                    Sleipnir MC Reykjavík | sleipnirmcreykjavik@gmail.com | +354 581-2345
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  // Build plain text version
  const textTemplate = `
${t.greeting}

${t.headline}

${t.message}

${t.instruction}

${t.buttonText}: {{verificationLink}}

${t.expiryWarning}

${t.motto}

${t.footer}

${t.signature}

---
Sleipnir MC Reykjavík
sleipnirmcreykjavik@gmail.com
+354 581-2345
  `;
  
  return {
    subject: t.subject,
    htmlTemplate,
    textTemplate
  };
}

// Send verification email with retry mechanism
export async function sendVerificationEmailWithRetry(user, options = {}) {
  const {
    lang = 'is',
    maxAttempts = VERIFICATION_CONFIG.maxRetries,
    priority = VERIFICATION_CONFIG.emailDeliveryPriority
  } = options;
  
  let lastError = null;
  let delay = VERIFICATION_CONFIG.retryDelayMs;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Build custom action code settings
      const actionCodeSettings = {
        url: `${window.location.origin}/auth-action.html?lang=${lang}&mode=verifyEmail`,
        handleCodeInApp: true,
        // iOS and Android settings for mobile app integration
        iOS: {
          bundleId: 'com.sleipnirmc.reykjavik'
        },
        android: {
          packageName: 'com.sleipnirmc.reykjavik',
          installApp: false,
          minimumVersion: '12'
        }
      };
      
      // Add priority header for faster delivery
      if (priority === 'high') {
        actionCodeSettings.dynamicLinkDomain = 'sleipnirmc.page.link';
      }
      
      // Send the email
      await sendEmailVerification(user, actionCodeSettings);
      
      // Log successful send
      await logEmailSend(user.uid, 'verification', 'success', attempt);
      
      // Update verification tracking
      await updateVerificationTracking(user.uid, 'sent');
      
      return {
        success: true,
        attempts: attempt,
        message: lang === 'is' 
          ? 'Staðfestingarpóstur sendur!' 
          : 'Verification email sent!'
      };
      
    } catch (error) {
      lastError = error;
      console.warn(`Email send attempt ${attempt} failed:`, error);
      
      // Log failed attempt
      await logEmailSend(user.uid, 'verification', 'failed', attempt, error.message);
      
      if (attempt < maxAttempts) {
        // Wait before retry with exponential backoff
        await sleep(delay);
        delay *= VERIFICATION_CONFIG.backoffMultiplier;
      }
    }
  }
  
  // All attempts failed
  return {
    success: false,
    error: lastError.code || 'email/send-failed',
    message: lang === 'is' 
      ? 'Ekki tókst að senda staðfestingarpóst' 
      : 'Failed to send verification email',
    attempts: maxAttempts
  };
}

// Check email verification status with caching
export async function checkEmailVerificationStatus(user, forceRefresh = false) {
  if (!user) {
    return { verified: false, cached: false };
  }
  
  const cacheKey = `verification_${user.uid}`;
  const now = Date.now();
  
  // Check cache first
  if (!forceRefresh && verificationCache.has(cacheKey)) {
    const cached = verificationCache.get(cacheKey);
    if (now - cached.timestamp < VERIFICATION_CONFIG.cacheExpiryMs) {
      return { ...cached.data, cached: true };
    }
  }
  
  try {
    // Reload user to get latest verification status
    await reload(user);
    
    const verified = user.emailVerified;
    const data = {
      verified,
      email: user.email,
      lastChecked: new Date().toISOString()
    };
    
    // Update cache
    verificationCache.set(cacheKey, {
      data,
      timestamp: now
    });
    
    // Update Firestore if verification status changed
    if (verified) {
      await updateVerificationTracking(user.uid, 'verified');
    }
    
    return { ...data, cached: false };
    
  } catch (error) {
    console.error('Error checking verification status:', error);
    return { verified: false, cached: false, error: error.message };
  }
}

// Email verification reminder system
export async function checkAndSendVerificationReminder(user) {
  if (!user || user.emailVerified) {
    return { needed: false };
  }
  
  try {
    // Check verification tracking
    const trackingDoc = await getDoc(doc(db, 'emailTracking', user.uid));
    
    if (!trackingDoc.exists()) {
      // No tracking record, send first email
      return await sendVerificationEmailWithRetry(user);
    }
    
    const tracking = trackingDoc.data();
    const lastSentTime = tracking.lastSent?.toDate() || new Date(0);
    const reminderCount = tracking.reminderCount || 0;
    const hoursSinceLastSent = (Date.now() - lastSentTime.getTime()) / (1000 * 60 * 60);
    
    // Check if reminder is needed
    if (hoursSinceLastSent >= VERIFICATION_CONFIG.reminderDelayHours && 
        reminderCount < VERIFICATION_CONFIG.maxReminders) {
      
      // Send reminder
      const result = await sendVerificationEmailWithRetry(user);
      
      if (result.success) {
        // Update reminder count
        await updateDoc(doc(db, 'emailTracking', user.uid), {
          reminderCount: reminderCount + 1,
          lastReminder: serverTimestamp()
        });
      }
      
      return { ...result, reminder: true, reminderNumber: reminderCount + 1 };
    }
    
    return {
      needed: false,
      reason: reminderCount >= VERIFICATION_CONFIG.maxReminders 
        ? 'max_reminders_reached' 
        : 'too_soon'
    };
    
  } catch (error) {
    console.error('Error checking/sending reminder:', error);
    return { needed: false, error: error.message };
  }
}

// Handle email verification action
export async function handleEmailVerificationAction(actionCode) {
  try {
    // Apply the verification code
    await applyActionCode(auth, actionCode);
    
    // Get current user
    const user = auth.currentUser;
    if (user) {
      // Reload user to get updated verification status
      await reload(user);
      
      // Update tracking
      await updateVerificationTracking(user.uid, 'verified');
      
      // Clear cache
      verificationCache.delete(`verification_${user.uid}`);
      
      // Update Firestore profile
      await updateDoc(doc(db, 'users', user.uid), {
        emailVerified: true,
        emailVerifiedAt: serverTimestamp()
      });
    }
    
    return {
      success: true,
      message: 'Email verified successfully'
    };
    
  } catch (error) {
    console.error('Error verifying email:', error);
    return {
      success: false,
      error: error.code,
      message: getVerificationErrorMessage(error.code)
    };
  }
}

// Update verification tracking in Firestore
async function updateVerificationTracking(userId, status) {
  try {
    const trackingRef = doc(db, 'emailTracking', userId);
    const trackingData = {
      lastUpdated: serverTimestamp(),
      status: status
    };
    
    if (status === 'sent') {
      trackingData.lastSent = serverTimestamp();
      trackingData.sentCount = (await getDoc(trackingRef)).data()?.sentCount + 1 || 1;
    } else if (status === 'verified') {
      trackingData.verifiedAt = serverTimestamp();
    }
    
    await setDoc(trackingRef, trackingData, { merge: true });
  } catch (error) {
    console.error('Error updating verification tracking:', error);
  }
}

// Log email send attempts
async function logEmailSend(userId, type, status, attempt, error = null) {
  try {
    const logData = {
      userId,
      type,
      status,
      attempt,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent
    };
    
    if (error) {
      logData.error = error;
    }
    
    // In production, this would go to a logging service
    console.log('Email send log:', logData);
  } catch (err) {
    console.error('Error logging email send:', err);
  }
}

// Get verification error messages
function getVerificationErrorMessage(errorCode, lang = 'is') {
  const messages = {
    'auth/expired-action-code': {
      is: 'Staðfestingarhlekkurinn er útrunninn. Vinsamlegast biðjið um nýjan.',
      en: 'The verification link has expired. Please request a new one.'
    },
    'auth/invalid-action-code': {
      is: 'Staðfestingarhlekkurinn er ógildur. Vinsamlegast biðjið um nýjan.',
      en: 'The verification link is invalid. Please request a new one.'
    },
    'auth/user-disabled': {
      is: 'Þessi reikningur hefur verið gerður óvirkur.',
      en: 'This account has been disabled.'
    },
    'auth/user-not-found': {
      is: 'Enginn reikningur fannst fyrir þetta netfang.',
      en: 'No account found for this email.'
    }
  };
  
  const message = messages[errorCode];
  return message ? message[lang] || message.en : 
    (lang === 'is' ? 'Villa kom upp við staðfestingu.' : 'An error occurred during verification.');
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Clear verification cache
export function clearVerificationCache(userId = null) {
  if (userId) {
    verificationCache.delete(`verification_${userId}`);
  } else {
    verificationCache.clear();
  }
}

// Check if user needs email verification
export function needsEmailVerification(user) {
  return user && !user.emailVerified;
}

// Get verification statistics for admin
export async function getVerificationStats(userId) {
  try {
    const trackingDoc = await getDoc(doc(db, 'emailTracking', userId));
    
    if (!trackingDoc.exists()) {
      return null;
    }
    
    const data = trackingDoc.data();
    return {
      sentCount: data.sentCount || 0,
      reminderCount: data.reminderCount || 0,
      lastSent: data.lastSent?.toDate(),
      verifiedAt: data.verifiedAt?.toDate(),
      status: data.status
    };
    
  } catch (error) {
    console.error('Error getting verification stats:', error);
    return null;
  }
}