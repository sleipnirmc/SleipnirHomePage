// Authentication Security Module
// Implements rate limiting, brute force protection, and security hardening

import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    query, 
    where, 
    orderBy,
    getDocs,
    serverTimestamp,
    increment,
    Timestamp
} from 'firebase/firestore';

// Security configuration
const SECURITY_CONFIG = {
    // Rate limiting
    registration: {
        maxAttempts: 5,
        windowHours: 1,
        collectionName: 'registrationAttempts'
    },
    login: {
        maxAttempts: 10,
        windowHours: 1,
        collectionName: 'loginAttempts'
    },
    // Brute force protection
    bruteForce: {
        baseDelay: 1000, // 1 second
        maxDelay: 300000, // 5 minutes
        backoffMultiplier: 2,
        lockoutThreshold: 20, // Lock after 20 failed attempts
        lockoutDuration: 3600000 // 1 hour
    },
    // Session security
    session: {
        tokenRefreshInterval: 3600000, // 1 hour
        maxSessionDuration: 86400000, // 24 hours
        inactivityTimeout: 1800000, // 30 minutes
        fingerprintComponents: ['userAgent', 'language', 'timezone', 'screenResolution']
    },
    // CAPTCHA
    captcha: {
        enabled: true,
        threshold: 3, // Show CAPTCHA after 3 failed attempts
        siteKey: process.env.RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Test key
        secretKey: process.env.RECAPTCHA_SECRET_KEY // Server-side only
    },
    // Email enumeration protection
    enumeration: {
        genericDelay: 1000, // Consistent delay for all responses
        genericMessage: {
            is: 'Ógild innskráning. Vinsamlegast athugaðu upplýsingarnar.',
            en: 'Invalid credentials. Please check your information.'
        }
    }
};

// Client fingerprinting (alternative to IP tracking)
class DeviceFingerprint {
    static async generate() {
        const components = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages.join(','),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
            deviceMemory: navigator.deviceMemory || 0,
            touchSupport: 'ontouchstart' in window,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            plugins: this.getPlugins()
        };
        
        // Create hash of components
        const fingerprintString = JSON.stringify(components);
        const hash = await this.hashString(fingerprintString);
        
        return {
            hash,
            components,
            timestamp: Date.now()
        };
    }
    
    static getPlugins() {
        if (!navigator.plugins) return [];
        
        const plugins = [];
        for (let i = 0; i < navigator.plugins.length; i++) {
            plugins.push(navigator.plugins[i].name);
        }
        return plugins.slice(0, 10); // Limit to 10 plugins
    }
    
    static async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
}

// 1. Rate limiting for registration attempts
export async function checkRegistrationRateLimit(email) {
    try {
        const fingerprint = await DeviceFingerprint.generate();
        const deviceId = fingerprint.hash;
        
        // Get attempts for this device in the last hour
        const attemptsRef = doc(db, SECURITY_CONFIG.registration.collectionName, deviceId);
        const attemptsDoc = await getDoc(attemptsRef);
        
        const now = Date.now();
        const windowStart = now - (SECURITY_CONFIG.registration.windowHours * 60 * 60 * 1000);
        
        if (attemptsDoc.exists()) {
            const data = attemptsDoc.data();
            const recentAttempts = (data.attempts || []).filter(
                attempt => attempt.timestamp > windowStart
            );
            
            if (recentAttempts.length >= SECURITY_CONFIG.registration.maxAttempts) {
                const oldestAttempt = Math.min(...recentAttempts.map(a => a.timestamp));
                const resetTime = oldestAttempt + (SECURITY_CONFIG.registration.windowHours * 60 * 60 * 1000);
                const minutesUntilReset = Math.ceil((resetTime - now) / 60000);
                
                return {
                    allowed: false,
                    reason: 'rate_limit_exceeded',
                    message: {
                        is: `Of margar skráningartilraunir. Vinsamlegast reyndu aftur eftir ${minutesUntilReset} mínútur.`,
                        en: `Too many registration attempts. Please try again in ${minutesUntilReset} minutes.`
                    },
                    resetTime,
                    requiresCaptcha: true
                };
            }
        }
        
        return {
            allowed: true,
            attemptsRemaining: SECURITY_CONFIG.registration.maxAttempts - 
                (attemptsDoc.exists() ? attemptsDoc.data().attempts?.filter(a => a.timestamp > windowStart).length || 0 : 0)
        };
        
    } catch (error) {
        console.error('Error checking registration rate limit:', error);
        // Fail open to avoid blocking legitimate users
        return { allowed: true };
    }
}

// Record registration attempt
export async function recordRegistrationAttempt(email, success = false) {
    try {
        const fingerprint = await DeviceFingerprint.generate();
        const deviceId = fingerprint.hash;
        
        const attemptsRef = doc(db, SECURITY_CONFIG.registration.collectionName, deviceId);
        const attempt = {
            email: await hashEmail(email),
            timestamp: Date.now(),
            success,
            fingerprint: fingerprint.components
        };
        
        const attemptsDoc = await getDoc(attemptsRef);
        
        if (attemptsDoc.exists()) {
            await updateDoc(attemptsRef, {
                attempts: [...(attemptsDoc.data().attempts || []), attempt],
                lastAttempt: serverTimestamp()
            });
        } else {
            await setDoc(attemptsRef, {
                deviceId,
                attempts: [attempt],
                createdAt: serverTimestamp(),
                lastAttempt: serverTimestamp()
            });
        }
        
    } catch (error) {
        console.error('Error recording registration attempt:', error);
    }
}

// 2. Rate limiting for login attempts
export async function checkLoginRateLimit(email) {
    try {
        const emailHash = await hashEmail(email);
        const attemptsRef = doc(db, SECURITY_CONFIG.login.collectionName, emailHash);
        const attemptsDoc = await getDoc(attemptsRef);
        
        const now = Date.now();
        const windowStart = now - (SECURITY_CONFIG.login.windowHours * 60 * 60 * 1000);
        
        if (attemptsDoc.exists()) {
            const data = attemptsDoc.data();
            
            // Check if account is locked out
            if (data.lockedUntil && data.lockedUntil.toMillis() > now) {
                const minutesRemaining = Math.ceil((data.lockedUntil.toMillis() - now) / 60000);
                
                return {
                    allowed: false,
                    reason: 'account_locked',
                    message: {
                        is: `Aðgangur læstur vegna of margra tilrauna. Reyndu aftur eftir ${minutesRemaining} mínútur.`,
                        en: `Account locked due to too many attempts. Try again in ${minutesRemaining} minutes.`
                    },
                    lockedUntil: data.lockedUntil.toMillis(),
                    requiresCaptcha: true
                };
            }
            
            // Check rate limit
            const recentAttempts = (data.attempts || []).filter(
                attempt => attempt.timestamp > windowStart && !attempt.success
            );
            
            if (recentAttempts.length >= SECURITY_CONFIG.login.maxAttempts) {
                // Lock the account
                await updateDoc(attemptsRef, {
                    lockedUntil: Timestamp.fromMillis(now + SECURITY_CONFIG.bruteForce.lockoutDuration)
                });
                
                return {
                    allowed: false,
                    reason: 'rate_limit_exceeded',
                    message: SECURITY_CONFIG.enumeration.genericMessage,
                    requiresCaptcha: true
                };
            }
            
            // Calculate exponential backoff
            const failedAttempts = data.consecutiveFailures || 0;
            if (failedAttempts > 0) {
                const delay = Math.min(
                    SECURITY_CONFIG.bruteForce.baseDelay * Math.pow(SECURITY_CONFIG.bruteForce.backoffMultiplier, failedAttempts - 1),
                    SECURITY_CONFIG.bruteForce.maxDelay
                );
                
                return {
                    allowed: true,
                    delay,
                    requiresCaptcha: failedAttempts >= SECURITY_CONFIG.captcha.threshold,
                    attemptsRemaining: SECURITY_CONFIG.login.maxAttempts - recentAttempts.length
                };
            }
        }
        
        return {
            allowed: true,
            attemptsRemaining: SECURITY_CONFIG.login.maxAttempts
        };
        
    } catch (error) {
        console.error('Error checking login rate limit:', error);
        // Fail open
        return { allowed: true };
    }
}

// Record login attempt
export async function recordLoginAttempt(email, success = false) {
    try {
        const emailHash = await hashEmail(email);
        const fingerprint = await DeviceFingerprint.generate();
        
        const attemptsRef = doc(db, SECURITY_CONFIG.login.collectionName, emailHash);
        const attempt = {
            timestamp: Date.now(),
            success,
            deviceId: fingerprint.hash,
            fingerprint: fingerprint.components
        };
        
        const attemptsDoc = await getDoc(attemptsRef);
        
        if (attemptsDoc.exists()) {
            const data = attemptsDoc.data();
            const updates = {
                attempts: [...(data.attempts || []), attempt],
                lastAttempt: serverTimestamp()
            };
            
            if (success) {
                updates.consecutiveFailures = 0;
                updates.lockedUntil = null;
            } else {
                updates.consecutiveFailures = increment(1);
            }
            
            await updateDoc(attemptsRef, updates);
        } else {
            await setDoc(attemptsRef, {
                emailHash,
                attempts: [attempt],
                consecutiveFailures: success ? 0 : 1,
                createdAt: serverTimestamp(),
                lastAttempt: serverTimestamp()
            });
        }
        
    } catch (error) {
        console.error('Error recording login attempt:', error);
    }
}

// 3. Brute force protection with exponential backoff
export async function enforceBackoffDelay(email) {
    const rateLimit = await checkLoginRateLimit(email);
    
    if (rateLimit.delay) {
        console.log(`Enforcing backoff delay: ${rateLimit.delay}ms`);
        await new Promise(resolve => setTimeout(resolve, rateLimit.delay));
    }
    
    return rateLimit;
}

// 4. Email enumeration protection
export async function protectAgainstEnumeration(operation, actualDelay = 0) {
    // Always introduce a consistent delay to prevent timing attacks
    const targetDelay = SECURITY_CONFIG.enumeration.genericDelay;
    const remainingDelay = Math.max(0, targetDelay - actualDelay);
    
    if (remainingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }
    
    // Return generic error message
    return SECURITY_CONFIG.enumeration.genericMessage;
}

// Hash email for storage
async function hashEmail(email) {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// 5. Session security with token refresh
export class SecureSession {
    constructor(user, userData) {
        this.user = user;
        this.userData = userData;
        this.sessionId = this.generateSessionId();
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
        this.tokenRefreshTimer = null;
        this.inactivityTimer = null;
        this.fingerprint = null;
    }
    
    async initialize() {
        // Generate device fingerprint
        this.fingerprint = await DeviceFingerprint.generate();
        
        // Store session
        await this.storeSession();
        
        // Start timers
        this.startTokenRefresh();
        this.startInactivityTimer();
        
        // Monitor activity
        this.monitorActivity();
    }
    
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    async storeSession() {
        const sessionData = {
            sessionId: this.sessionId,
            userId: this.user.uid,
            createdAt: this.createdAt,
            lastActivity: this.lastActivity,
            fingerprint: this.fingerprint.hash,
            expiresAt: this.createdAt + SECURITY_CONFIG.session.maxSessionDuration
        };
        
        try {
            sessionStorage.setItem('sleipnir_secure_session', JSON.stringify(sessionData));
            
            // Also store in Firestore for server-side validation
            await setDoc(doc(db, 'activeSessions', this.sessionId), {
                ...sessionData,
                createdAt: Timestamp.fromMillis(this.createdAt),
                lastActivity: serverTimestamp(),
                deviceInfo: this.fingerprint.components
            });
        } catch (error) {
            console.error('Error storing session:', error);
        }
    }
    
    async validateSession() {
        try {
            // Check session expiry
            if (Date.now() > this.createdAt + SECURITY_CONFIG.session.maxSessionDuration) {
                throw new Error('Session expired');
            }
            
            // Check inactivity
            if (Date.now() - this.lastActivity > SECURITY_CONFIG.session.inactivityTimeout) {
                throw new Error('Session inactive');
            }
            
            // Validate fingerprint
            const currentFingerprint = await DeviceFingerprint.generate();
            if (currentFingerprint.hash !== this.fingerprint.hash) {
                console.warn('Device fingerprint mismatch');
                // Could be stricter here and invalidate session
            }
            
            // Validate against Firestore
            const sessionDoc = await getDoc(doc(db, 'activeSessions', this.sessionId));
            if (!sessionDoc.exists()) {
                throw new Error('Session not found');
            }
            
            return { valid: true };
            
        } catch (error) {
            console.error('Session validation failed:', error);
            return { valid: false, reason: error.message };
        }
    }
    
    startTokenRefresh() {
        // Refresh token periodically
        this.tokenRefreshTimer = setInterval(async () => {
            try {
                // Get fresh token
                const idToken = await this.user.getIdToken(true);
                console.log('Token refreshed successfully');
                
                // Update session
                await this.updateActivity();
            } catch (error) {
                console.error('Token refresh failed:', error);
                this.destroy();
            }
        }, SECURITY_CONFIG.session.tokenRefreshInterval);
    }
    
    startInactivityTimer() {
        // Reset timer on activity
        const resetTimer = () => {
            clearTimeout(this.inactivityTimer);
            
            this.inactivityTimer = setTimeout(() => {
                console.log('Session inactive, logging out...');
                this.destroy();
                // Trigger logout
                if (window.logout) {
                    window.logout();
                }
            }, SECURITY_CONFIG.session.inactivityTimeout);
        };
        
        resetTimer();
        
        // Monitor events
        ['click', 'keypress', 'mousemove', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
                resetTimer();
            });
        });
    }
    
    async updateActivity() {
        this.lastActivity = Date.now();
        
        try {
            await updateDoc(doc(db, 'activeSessions', this.sessionId), {
                lastActivity: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating session activity:', error);
        }
    }
    
    monitorActivity() {
        // Detect suspicious activity
        let rapidActions = 0;
        let lastActionTime = Date.now();
        
        document.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastActionTime < 100) {
                rapidActions++;
                
                if (rapidActions > 20) {
                    console.warn('Suspicious rapid activity detected');
                    // Could implement additional security measures
                }
            } else {
                rapidActions = 0;
            }
            lastActionTime = now;
        });
    }
    
    async destroy() {
        // Clear timers
        if (this.tokenRefreshTimer) {
            clearInterval(this.tokenRefreshTimer);
        }
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        // Clear session data
        sessionStorage.removeItem('sleipnir_secure_session');
        
        // Remove from Firestore
        try {
            await deleteDoc(doc(db, 'activeSessions', this.sessionId));
        } catch (error) {
            console.error('Error removing session:', error);
        }
    }
}

// 6. CAPTCHA integration
export class CaptchaManager {
    static scriptLoaded = false;
    static scriptLoading = false;
    
    static async load() {
        if (this.scriptLoaded) return;
        if (this.scriptLoading) {
            // Wait for script to load
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (this.scriptLoaded) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }
        
        this.scriptLoading = true;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?render=${SECURITY_CONFIG.captcha.siteKey}`;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                this.scriptLoaded = true;
                this.scriptLoading = false;
                resolve();
            };
            
            script.onerror = (error) => {
                this.scriptLoading = false;
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }
    
    static async execute(action) {
        if (!SECURITY_CONFIG.captcha.enabled) {
            return { token: 'disabled', score: 1.0 };
        }
        
        try {
            await this.load();
            
            return new Promise((resolve, reject) => {
                window.grecaptcha.ready(() => {
                    window.grecaptcha.execute(SECURITY_CONFIG.captcha.siteKey, { action })
                        .then(token => resolve({ token, action }))
                        .catch(reject);
                });
            });
        } catch (error) {
            console.error('CAPTCHA execution failed:', error);
            // Don't block on CAPTCHA failure
            return { token: 'error', score: 0.5 };
        }
    }
    
    static async verify(token, action) {
        // Note: Verification must be done server-side
        // This is just a placeholder for the API call
        console.log('CAPTCHA verification requires server-side implementation');
        
        return {
            success: true,
            score: 0.7,
            action: action,
            challenge_ts: new Date().toISOString(),
            hostname: window.location.hostname
        };
    }
}

// Security middleware for auth operations
export async function secureAuthOperation(operation, email, options = {}) {
    const startTime = Date.now();
    
    try {
        // Check rate limiting
        const rateLimit = operation === 'register' 
            ? await checkRegistrationRateLimit(email)
            : await checkLoginRateLimit(email);
        
        if (!rateLimit.allowed) {
            return {
                success: false,
                error: rateLimit.reason,
                message: rateLimit.message,
                requiresCaptcha: rateLimit.requiresCaptcha
            };
        }
        
        // Check if CAPTCHA is required
        if (rateLimit.requiresCaptcha || options.forceCaptcha) {
            const captchaResult = await CaptchaManager.execute(operation);
            
            if (!captchaResult.token) {
                return {
                    success: false,
                    error: 'captcha_required',
                    message: {
                        is: 'CAPTCHA staðfesting krafist',
                        en: 'CAPTCHA verification required'
                    }
                };
            }
            
            options.captchaToken = captchaResult.token;
        }
        
        // Enforce backoff delay for login
        if (operation === 'login' && rateLimit.delay) {
            await enforceBackoffDelay(email);
        }
        
        // Execute the operation
        const result = await options.execute();
        
        // Record attempt
        if (operation === 'register') {
            await recordRegistrationAttempt(email, result.success);
        } else if (operation === 'login') {
            await recordLoginAttempt(email, result.success);
        }
        
        // Create secure session on successful login
        if (operation === 'login' && result.success && result.user) {
            const session = new SecureSession(result.user, result.userData);
            await session.initialize();
            result.session = session;
        }
        
        // Apply enumeration protection delay
        const elapsed = Date.now() - startTime;
        await protectAgainstEnumeration(operation, elapsed);
        
        return result;
        
    } catch (error) {
        console.error(`Secure auth operation failed:`, error);
        
        // Apply enumeration protection even on error
        const elapsed = Date.now() - startTime;
        await protectAgainstEnumeration(operation, elapsed);
        
        return {
            success: false,
            error: 'security_error',
            message: SECURITY_CONFIG.enumeration.genericMessage
        };
    }
}

// Clean up old attempts (run periodically)
export async function cleanupOldAttempts() {
    try {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        
        // Clean registration attempts
        const regAttemptsSnapshot = await getDocs(collection(db, SECURITY_CONFIG.registration.collectionName));
        
        for (const doc of regAttemptsSnapshot.docs) {
            const data = doc.data();
            const recentAttempts = (data.attempts || []).filter(a => a.timestamp > cutoffTime);
            
            if (recentAttempts.length === 0) {
                await deleteDoc(doc.ref);
            } else if (recentAttempts.length < data.attempts.length) {
                await updateDoc(doc.ref, { attempts: recentAttempts });
            }
        }
        
        // Clean login attempts
        const loginAttemptsSnapshot = await getDocs(collection(db, SECURITY_CONFIG.login.collectionName));
        
        for (const doc of loginAttemptsSnapshot.docs) {
            const data = doc.data();
            const recentAttempts = (data.attempts || []).filter(a => a.timestamp > cutoffTime);
            
            if (recentAttempts.length === 0 && !data.lockedUntil) {
                await deleteDoc(doc.ref);
            } else if (recentAttempts.length < data.attempts.length) {
                await updateDoc(doc.ref, { attempts: recentAttempts });
            }
        }
        
        console.log('Cleaned up old security attempts');
        
    } catch (error) {
        console.error('Error cleaning up attempts:', error);
    }
}

// Export configuration for external use
export { SECURITY_CONFIG, DeviceFingerprint };