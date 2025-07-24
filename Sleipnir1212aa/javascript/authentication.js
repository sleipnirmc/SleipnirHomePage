// Firebase Authentication System for Sleipnir MC
// Handles user registration, login, and membership management

// Auth state management
let currentUser = null;
let userDocument = null;

// Initialize Firebase Auth
const auth = firebase.auth();

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    
    if (user) {
        // User is signed in
        console.log('User signed in:', user.email);
        console.log('Email verified:', user.emailVerified);
        
        await loadUserDocument(user.uid);
        
        // Update email verification status in Firestore if changed
        if (userDocument && userDocument.emailVerified !== user.emailVerified) {
            await db.collection('users').doc(user.uid).update({
                emailVerified: user.emailVerified,
                emailVerifiedAt: user.emailVerified ? firebase.firestore.FieldValue.serverTimestamp() : null
            });
            userDocument.emailVerified = user.emailVerified;
        }
        
        updateUIForAuthenticatedUser();
        
        // Show email verification prompt if not verified
        if (!user.emailVerified) {
            showEmailVerificationPrompt();
        }
    } else {
        // User is signed out
        console.log('User signed out');
        userDocument = null;
        updateUIForUnauthenticatedUser();
    }
    
    // Trigger custom event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { user: currentUser, userDoc: userDocument } 
    }));
});

// Load user document from Firestore
async function loadUserDocument(userId) {
    console.log('loadUserDocument: Loading document for user', userId);
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            userDocument = { id: doc.id, ...doc.data() };
            console.log('loadUserDocument: User document loaded', {
                userId: userDocument.id,
                email: userDocument.email,
                role: userDocument.role,
                members: userDocument.members
            });
        } else {
            console.log('loadUserDocument: No document exists, creating new one');
            // Create user document if it doesn't exist (for legacy users)
            userDocument = await createUserDocument(userId, currentUser);
        }
    } catch (error) {
        console.error('Error loading user document:', error);
    }
}

// Create user document in Firestore
async function createUserDocument(userId, authUser, additionalData = {}) {
    const userData = {
        email: authUser.email,
        displayName: authUser.displayName || additionalData.fullName || '',
        members: false, // Default to non-member
        emailVerified: authUser.emailVerified || false,
        verificationEmailSent: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        ...additionalData
    };
    
    try {
        await db.collection('users').doc(userId).set(userData);
        return { id: userId, ...userData };
    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
}

// Sign up new user
async function signUp(email, password, additionalData = {}) {
    try {
        // Create auth user
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update display name if provided
        if (additionalData.fullName) {
            await credential.user.updateProfile({
                displayName: additionalData.fullName
            });
        }
        
        // Send email verification
        try {
            await credential.user.sendEmailVerification({
                url: 'https://sleipnirmc.com/Sleipnir1212aa/login.html',
                handleCodeInApp: false
            });
            console.log('Verification email sent to:', credential.user.email);
        } catch (verificationError) {
            console.error('Error sending verification email:', verificationError);
        }
        
        // Create user document with verification status
        await createUserDocument(credential.user.uid, credential.user, {
            ...additionalData,
            verificationEmailSent: true,
            verificationEmailSentAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { 
            success: true, 
            user: credential.user,
            emailVerificationSent: true,
            message: {
                is: 'Aðgangur stofnaður! Staðfestingarpóstur hefur verið sendur á ' + email,
                en: 'Account created! A verification email has been sent to ' + email
            }
        };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Sign in existing user
async function signIn(email, password) {
    try {
        const credential = await auth.signInWithEmailAndPassword(email, password);
        
        // Check if user document exists
        const userDoc = await db.collection('users').doc(credential.user.uid).get();
        
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            await createUserDocument(credential.user.uid, credential.user);
        } else {
            // Update last login
            await db.collection('users').doc(credential.user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return { success: true, user: credential.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Sign out
async function signOut() {
    try {
        await auth.signOut();
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// Social login - Google
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await auth.signInWithPopup(provider);
        
        // Check if user document exists
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        if (!userDoc.exists) {
            // Create user document for new Google users
            await createUserDocument(result.user.uid, result.user);
        } else {
            // Update last login
            await db.collection('users').doc(result.user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Google sign in error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Social login - Facebook
async function signInWithFacebook() {
    const provider = new firebase.auth.FacebookAuthProvider();
    
    try {
        const result = await auth.signInWithPopup(provider);
        
        // Check if user document exists
        const userDoc = await db.collection('users').doc(result.user.uid).get();
        if (!userDoc.exists) {
            // Create user document for new Facebook users
            await createUserDocument(result.user.uid, result.user);
        } else {
            // Update last login
            await db.collection('users').doc(result.user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Facebook sign in error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Password reset
async function sendPasswordResetEmail(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: getAuthErrorMessage(error.code) };
    }
}

// Get user membership status
function isUserMember() {
    if (!userDocument || userDocument.members === undefined) {
        return false;
    }
    
    // Check for multiple possible formats
    return userDocument.members === true || 
           userDocument.members === 'true' || 
           userDocument.members === 1 ||
           userDocument.members === '1';
}

// Check if user's email is verified
function isEmailVerified() {
    return currentUser && currentUser.emailVerified;
}

// Resend verification email
async function resendVerificationEmail() {
    if (!currentUser) {
        return { success: false, error: 'No user signed in' };
    }
    
    if (currentUser.emailVerified) {
        return { 
            success: false, 
            error: {
                is: 'Netfang hefur þegar verið staðfest',
                en: 'Email is already verified'
            }
        };
    }
    
    try {
        await currentUser.sendEmailVerification({
            url: 'https://sleipnirmc.com/Sleipnir1212aa/login.html',
            handleCodeInApp: false
        });
        
        // Update user document
        await db.collection('users').doc(currentUser.uid).update({
            verificationEmailSent: true,
            verificationEmailResentAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { 
            success: true,
            message: {
                is: 'Staðfestingarpóstur hefur verið sendur aftur',
                en: 'Verification email has been resent'
            }
        };
    } catch (error) {
        console.error('Error resending verification email:', error);
        return { 
            success: false, 
            error: getAuthErrorMessage(error.code) 
        };
    }
}

// Show email verification prompt
function showEmailVerificationPrompt() {
    // Check if prompt already exists
    if (document.getElementById('email-verification-prompt')) {
        return;
    }
    
    const currentLang = localStorage.getItem('language') || 'is';
    
    const promptHTML = `
        <div id="email-verification-prompt" style="
            position: fixed;
            top: 70px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 400px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                        ${currentLang === 'is' ? 'Staðfestu netfangið þitt' : 'Verify your email'}
                    </h4>
                    <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.5;">
                        ${currentLang === 'is' 
                            ? 'Vinsamlegast staðfestu netfangið þitt til að fá fullan aðgang að öllum eiginleikum.' 
                            : 'Please verify your email address to access all features.'}
                    </p>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="sleipnirAuth.resendVerificationEmail().then(result => {
                            if (result.success) {
                                sleipnirAuth.showAuthMessage(result.message, false);
                            } else {
                                sleipnirAuth.showAuthMessage(result.error, true);
                            }
                        })" style="
                            background: #721c24;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                        ">
                            ${currentLang === 'is' ? 'Senda aftur' : 'Resend email'}
                        </button>
                        <button onclick="document.getElementById('email-verification-prompt').remove()" style="
                            background: transparent;
                            color: #721c24;
                            border: 1px solid #721c24;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                        ">
                            ${currentLang === 'is' ? 'Loka' : 'Close'}
                        </button>
                    </div>
                </div>
                <button onclick="document.getElementById('email-verification-prompt').remove()" style="
                    background: transparent;
                    border: none;
                    color: #721c24;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 10px;
                    line-height: 1;
                ">&times;</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', promptHTML);
}

// Check if user is admin
function isUserAdmin() {
    const isAdmin = userDocument && userDocument.role === 'admin';
    console.log('isUserAdmin check:', {
        hasUserDocument: !!userDocument,
        userRole: userDocument?.role,
        isAdmin: isAdmin
    });
    return isAdmin;
}

// Get current user data
function getCurrentUserData() {
    return {
        auth: currentUser,
        userData: userDocument,
        isMember: isUserMember(),
        isAdmin: isUserAdmin(),
        isEmailVerified: isEmailVerified()
    };
}

// Check if user can access restricted features
function canAccessRestrictedFeatures() {
    // User must be signed in and have verified email
    return currentUser && currentUser.emailVerified;
}

// Require email verification for certain actions
function requireEmailVerification() {
    if (!currentUser) {
        showAuthMessage({
            is: 'Vinsamlegast skráðu þig inn',
            en: 'Please sign in'
        }, true);
        window.location.href = '/login.html';
        return false;
    }
    
    if (!currentUser.emailVerified) {
        showAuthMessage({
            is: 'Vinsamlegast staðfestu netfangið þitt til að halda áfram',
            en: 'Please verify your email to continue'
        }, true);
        showEmailVerificationPrompt();
        return false;
    }
    
    return true;
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
    // Check if email is verified before granting full access
    const isVerified = currentUser && currentUser.emailVerified;
    
    // Update navigation links
    const loginLinks = document.querySelectorAll('.login-link');
    const userMenus = document.querySelectorAll('.user-menu');
    const adminLinks = document.querySelectorAll('.admin-link');
    
    if (isVerified) {
        // Full access for verified users
        loginLinks.forEach(link => link.style.display = 'none');
        userMenus.forEach(menu => {
            menu.style.display = 'block';
            // Update user name display
            const nameDisplay = menu.querySelector('.user-name');
            if (nameDisplay) {
                nameDisplay.textContent = userDocument?.displayName || currentUser.email;
            }
        });
        
        // Show/hide admin links based on role
        if (isUserAdmin()) {
            adminLinks.forEach(link => link.style.display = 'block');
        } else {
            adminLinks.forEach(link => link.style.display = 'none');
        }
    } else {
        // Limited access for unverified users - show login links
        loginLinks.forEach(link => link.style.display = 'block');
        userMenus.forEach(menu => menu.style.display = 'none');
        adminLinks.forEach(link => link.style.display = 'none');
        
        // Show verification prompt
        showEmailVerificationPrompt();
    }
    
    // Update member badge
    updateMemberBadge();
}

// Update UI for unauthenticated user
function updateUIForUnauthenticatedUser() {
    const loginLinks = document.querySelectorAll('.login-link');
    const userMenus = document.querySelectorAll('.user-menu');
    const adminLinks = document.querySelectorAll('.admin-link');
    
    loginLinks.forEach(link => link.style.display = 'block');
    userMenus.forEach(menu => menu.style.display = 'none');
    adminLinks.forEach(link => link.style.display = 'none');
    
    // Remove member badge
    updateMemberBadge();
}

// Update member badge display
function updateMemberBadge() {
    const memberBadges = document.querySelectorAll('.member-status-badge');
    
    memberBadges.forEach(badge => {
        // Only show member status for verified users
        if (currentUser && currentUser.emailVerified) {
            if (isUserMember()) {
                badge.innerHTML = '<span class="badge-member">Member</span>';
                badge.style.display = 'inline-flex';
                badge.style.removeProperty('color'); // Let CSS handle the color
            } else {
                // Simple guest indicator for verified non-members
                badge.innerHTML = '<span class="badge-non-member">Guest</span>';
                badge.style.display = 'inline-flex';
                badge.style.removeProperty('color'); // Let CSS handle the color
            }
        } else {
            // Hide badge for unverified or unauthenticated users
            badge.style.display = 'none';
        }
    });
}

// Get auth error message
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': {
            is: 'Þetta netfang er þegar í notkun',
            en: 'This email is already in use'
        },
        'auth/invalid-email': {
            is: 'Ógilt netfang',
            en: 'Invalid email address'
        },
        'auth/operation-not-allowed': {
            is: 'Aðgerð ekki leyfð',
            en: 'Operation not allowed'
        },
        'auth/weak-password': {
            is: 'Lykilorð er of veikt. Notaðu að minnsta kosti 6 stafi',
            en: 'Password is too weak. Use at least 6 characters'
        },
        'auth/user-disabled': {
            is: 'Þessi aðgangur hefur verið gerður óvirkur',
            en: 'This account has been disabled'
        },
        'auth/user-not-found': {
            is: 'Lykilorð eða netfang er rangt',
            en: 'Password or email is incorrect'
        },
        'auth/wrong-password': {
            is: 'Lykilorð eða netfang er rangt',
            en: 'Password or email is incorrect'
        },
        'auth/popup-closed-by-user': {
            is: 'Innskráning hætt við',
            en: 'Sign in cancelled'
        },
        'auth/account-exists-with-different-credential': {
            is: 'Aðgangur með þetta netfang er þegar til með annarri innskráningaraðferð',
            en: 'An account with this email already exists with a different sign-in method'
        },
        'auth/network-request-failed': {
            is: 'Nettenging mistókst. Athugaðu tengingu þína',
            en: 'Network error. Please check your connection'
        },
        'auth/too-many-requests': {
            is: 'Of margar tilraunir. Reyndu aftur síðar',
            en: 'Too many attempts. Please try again later'
        }
    };
    
    return errorMessages[errorCode] || {
        is: 'Lykilorð eða netfang er rangt',
        en: 'Password or email is incorrect'
    };
}

// Utility function to show auth messages
function showAuthMessage(message, isError = false) {
    // Create or get message container
    let messageContainer = document.getElementById('auth-message');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'auth-message';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(messageContainer);
    }
    
    // Style based on error or success
    messageContainer.style.backgroundColor = isError ? '#dc3545' : '#28a745';
    messageContainer.style.color = 'white';
    
    // Set message based on current language
    const currentLang = localStorage.getItem('language') || 'is';
    messageContainer.textContent = typeof message === 'object' ? message[currentLang] : message;
    
    // Show message
    messageContainer.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}

// Admin functions for managing users
async function getAllUsers() {
    if (!isUserAdmin()) {
        console.error('Unauthorized: Admin access required');
        return [];
    }
    
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
}

// Toggle user membership status (admin only)
async function toggleUserMembership(userId, newStatus) {
    if (!isUserAdmin()) {
        console.error('Unauthorized: Admin access required');
        return { success: false, error: 'Unauthorized' };
    }
    
    try {
        await db.collection('users').doc(userId).update({
            members: newStatus,
            membershipUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating membership:', error);
        return { success: false, error: error.message };
    }
}

// Delete user account (admin only)
async function deleteUser(userId, archiveData = true) {
    console.log('deleteUser: Starting deletion process', { userId, archiveData });
    
    if (!isUserAdmin()) {
        console.error('Unauthorized: Admin access required');
        return { success: false, error: 'Unauthorized' };
    }
    
    // Additional client-side validation
    if (!userId) {
        return { success: false, error: 'User ID is required' };
    }
    
    if (userId === currentUser.uid) {
        return { success: false, error: 'Cannot delete your own account' };
    }
    
    try {
        // First validate admin access with server
        const validateAdmin = firebase.functions().httpsCallable('validateAdminAction');
        const validation = await validateAdmin({ 
            action: 'deleteUser',
            details: { targetUserId: userId }
        });
        
        if (!validation.data.adminVerified) {
            throw new Error('Admin validation failed');
        }
        
        // Call the delete user function
        const deleteUserFn = firebase.functions().httpsCallable('deleteUser');
        const result = await deleteUserFn({ 
            userId: userId,
            archiveData: archiveData 
        });
        
        console.log('deleteUser: Server response', result.data);
        
        if (result.data.success) {
            return { 
                success: true, 
                message: result.data.message,
                ordersHandled: result.data.ordersHandled,
                dataArchived: result.data.dataArchived
            };
        } else {
            throw new Error(result.data.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to delete user' 
        };
    }
}

// Admin Session Management
let adminSessionTimeout = null;
const ADMIN_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const ADMIN_ACTIVITY_LOG = 'adminActivityLog';

// Enhanced admin authentication with security checks
async function verifyAdminAccess() {
    console.log('verifyAdminAccess: Starting verification', {
        hasCurrentUser: !!currentUser,
        userEmail: currentUser?.email
    });
    
    if (!currentUser) {
        return { success: false, error: 'Not authenticated' };
    }
    
    if (!isUserAdmin()) {
        // Log unauthorized access attempt
        await logAdminActivity('unauthorized_access_attempt', {
            userId: currentUser.uid,
            email: currentUser.email,
            timestamp: new Date().toISOString()
        });
        return { success: false, error: 'Unauthorized: Admin access required' };
    }
    
    // Verify admin session is still valid
    const adminSession = localStorage.getItem('adminSession');
    console.log('verifyAdminAccess: Checking admin session', { hasSession: !!adminSession });
    if (!adminSession) {
        console.log('verifyAdminAccess: No admin session found, will create one');
        // Initialize admin session if user is admin but no session exists
        const sessionResult = await initializeAdminSession();
        if (!sessionResult.success) {
            return sessionResult;
        }
        return { success: true };
    }
    
    const sessionData = JSON.parse(adminSession);
    if (new Date().getTime() > sessionData.expiresAt) {
        clearAdminSession();
        return { success: false, error: 'Admin session expired' };
    }
    
    // Refresh session on activity
    refreshAdminSession();
    
    return { success: true };
}

// Initialize admin session after successful authentication
async function initializeAdminSession() {
    if (!isUserAdmin()) {
        return { success: false, error: 'Not an admin user' };
    }
    
    const sessionData = {
        userId: currentUser.uid,
        email: currentUser.email,
        startedAt: new Date().getTime(),
        expiresAt: new Date().getTime() + ADMIN_SESSION_DURATION,
        sessionId: generateSessionId()
    };
    
    localStorage.setItem('adminSession', JSON.stringify(sessionData));
    
    // Log successful admin login
    await logAdminActivity('admin_login', {
        userId: currentUser.uid,
        email: currentUser.email,
        sessionId: sessionData.sessionId,
        timestamp: new Date().toISOString()
    });
    
    // Start session timeout
    startAdminSessionTimeout();
    
    return { success: true, sessionData };
}

// Clear admin session
function clearAdminSession() {
    localStorage.removeItem('adminSession');
    if (adminSessionTimeout) {
        clearTimeout(adminSessionTimeout);
        adminSessionTimeout = null;
    }
}

// Refresh admin session on activity
function refreshAdminSession() {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) return;
    
    const sessionData = JSON.parse(adminSession);
    sessionData.expiresAt = new Date().getTime() + ADMIN_SESSION_DURATION;
    localStorage.setItem('adminSession', JSON.stringify(sessionData));
    
    // Reset timeout
    startAdminSessionTimeout();
}

// Start admin session timeout
function startAdminSessionTimeout() {
    if (adminSessionTimeout) {
        clearTimeout(adminSessionTimeout);
    }
    
    adminSessionTimeout = setTimeout(() => {
        clearAdminSession();
        // Redirect to login page
        window.location.href = 'login.html?session_expired=true';
    }, ADMIN_SESSION_DURATION);
}

// Generate unique session ID
function generateSessionId() {
    return 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Log admin activities
async function logAdminActivity(action, details = {}) {
    try {
        const logEntry = {
            action,
            details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent,
            ip: 'server-side-detection' // This would need server-side implementation
        };
        
        await db.collection(ADMIN_ACTIVITY_LOG).add(logEntry);
        
        // Also store recent activities in localStorage for quick access
        const recentActivities = JSON.parse(localStorage.getItem('recentAdminActivities') || '[]');
        recentActivities.unshift({
            ...logEntry,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 activities
        if (recentActivities.length > 50) {
            recentActivities.pop();
        }
        
        localStorage.setItem('recentAdminActivities', JSON.stringify(recentActivities));
    } catch (error) {
        console.error('Error logging admin activity:', error);
    }
}

// Enhanced admin sign in with additional security
async function adminSignIn(email, password) {
    try {
        // First, perform regular sign in
        const result = await signIn(email, password);
        
        if (!result.success) {
            return result;
        }
        
        // Wait for user document to load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify admin role
        if (!isUserAdmin()) {
            await signOut();
            return { success: false, error: 'Not authorized for admin access' };
        }
        
        // Initialize admin session
        const sessionResult = await initializeAdminSession();
        
        if (!sessionResult.success) {
            await signOut();
            return sessionResult;
        }
        
        return { 
            success: true, 
            user: result.user,
            sessionData: sessionResult.sessionData
        };
    } catch (error) {
        console.error('Admin sign in error:', error);
        return { success: false, error: error.message };
    }
}

// Sign out with admin session cleanup
async function adminSignOut() {
    try {
        // Log admin logout
        const adminSession = localStorage.getItem('adminSession');
        if (adminSession) {
            const sessionData = JSON.parse(adminSession);
            await logAdminActivity('admin_logout', {
                userId: currentUser?.uid,
                email: currentUser?.email,
                sessionId: sessionData.sessionId,
                timestamp: new Date().toISOString()
            });
        }
        
        // Clear admin session
        clearAdminSession();
        
        // Perform regular sign out
        return await signOut();
    } catch (error) {
        console.error('Admin sign out error:', error);
        return { success: false, error: error.message };
    }
}

// Protect admin pages - to be called on admin page load
async function protectAdminPage() {
    console.log('protectAdminPage: Starting protection check', {
        hasCurrentUser: !!currentUser,
        userEmail: currentUser?.email,
        hasUserDocument: !!userDocument
    });
    
    // Check if user is authenticated
    if (!currentUser) {
        console.log('protectAdminPage: No current user, redirecting to login');
        window.location.href = 'login.html?redirect=admin';
        return false;
    }
    
    // Verify admin access
    const verifyResult = await verifyAdminAccess();
    console.log('protectAdminPage: Verification result', verifyResult);
    if (!verifyResult.success) {
        console.log('protectAdminPage: Admin verification failed, redirecting to login');
        window.location.href = 'login.html?error=' + encodeURIComponent(verifyResult.error);
        return false;
    }
    
    // Set up activity tracking
    document.addEventListener('click', () => refreshAdminSession());
    document.addEventListener('keydown', () => refreshAdminSession());
    
    return true;
}

// Diagnostic function to check member status
async function checkMemberStatus() {
    console.log('=== Member Status Diagnostic ===');
    
    if (!currentUser) {
        console.log('No user logged in');
        return null;
    }
    
    console.log('Current User:', {
        uid: currentUser.uid,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified
    });
    
    // Check local userDocument
    console.log('Local userDocument:', userDocument);
    console.log('isUserMember() result:', isUserMember());
    
    // Fetch fresh data from Firestore
    try {
        const freshDoc = await db.collection('users').doc(currentUser.uid).get();
        if (freshDoc.exists) {
            const freshData = freshDoc.data();
            console.log('Fresh Firestore data:', {
                email: freshData.email,
                members: freshData.members,
                membersType: typeof freshData.members,
                role: freshData.role,
                displayName: freshData.displayName
            });
            
            // Check if user exists in displayMembers
            const displayMemberQuery = await db.collection('displayMembers')
                .where('userId', '==', currentUser.uid)
                .get();
            
            console.log('DisplayMembers collection:', {
                hasProfile: !displayMemberQuery.empty,
                profileCount: displayMemberQuery.size
            });
            
            return {
                uid: currentUser.uid,
                email: currentUser.email,
                localMemberStatus: userDocument?.members,
                firestoreMemberStatus: freshData.members,
                isRecognizedAsMember: isUserMember(),
                hasDisplayProfile: !displayMemberQuery.empty
            };
        } else {
            console.log('No user document found in Firestore!');
            return null;
        }
    } catch (error) {
        console.error('Error checking member status:', error);
        return null;
    }
}

// Function to fix member status
async function fixMemberStatus(makeMember = true) {
    console.log('=== Fixing Member Status ===');
    
    if (!currentUser) {
        console.error('No user logged in');
        return { success: false, error: 'Not logged in' };
    }
    
    try {
        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            members: makeMember,
            memberStatusFixed: firebase.firestore.FieldValue.serverTimestamp(),
            memberStatusFixReason: 'Manual fix via diagnostic function'
        });
        
        console.log(`Member status updated to: ${makeMember}`);
        
        // Reload user document
        await loadUserDocument(currentUser.uid);
        
        // Trigger auth state change event
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { user: currentUser, userDoc: userDocument } 
        }));
        
        console.log('Member status fixed successfully');
        return { success: true, newStatus: makeMember };
    } catch (error) {
        console.error('Error fixing member status:', error);
        return { success: false, error: error.message };
    }
}

// Protect pages that require email verification
async function protectVerifiedPage(redirectUrl = '/login.html') {
    // Wait a bit for auth state to be established
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!currentUser) {
        // Not authenticated at all
        window.location.href = redirectUrl + '?error=' + encodeURIComponent('Please sign in to continue');
        return false;
    }
    
    if (!currentUser.emailVerified) {
        // Authenticated but not verified
        showAuthMessage({
            is: 'Vinsamlegast staðfestu netfangið þitt til að fá aðgang að þessari síðu',
            en: 'Please verify your email to access this page'
        }, true);
        
        showEmailVerificationPrompt();
        
        // Redirect to login after a delay
        setTimeout(() => {
            window.location.href = redirectUrl + '?error=' + encodeURIComponent('Email verification required');
        }, 3000);
        
        return false;
    }
    
    return true;
}

// Export functions for use in other scripts
window.sleipnirAuth = {
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithFacebook,
    sendPasswordResetEmail,
    getCurrentUserData,
    isUserMember,
    isUserAdmin,
    isEmailVerified,
    canAccessRestrictedFeatures,
    requireEmailVerification,
    resendVerificationEmail,
    showAuthMessage,
    showEmailVerificationPrompt,
    getAllUsers,
    toggleUserMembership,
    deleteUser,
    verifyAdminAccess,
    adminSignIn,
    adminSignOut,
    protectAdminPage,
    protectVerifiedPage,
    logAdminActivity,
    initializeAdminSession,
    clearAdminSession,
    checkMemberStatus,
    fixMemberStatus
};