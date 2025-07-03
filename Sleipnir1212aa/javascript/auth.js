// Enhanced Authentication Handler with Service Integration
// 
// Authentication Architecture:
// 1. Service layer integration for all auth operations
// 2. Automatic consistency checking on app start
// 3. Enhanced session management with configurable timeout
// 4. Retry logic for failed operations
// 5. Comprehensive error handling and recovery
//
// Email Verification Strategy:
// 1. Uses email-verification.js service for all verification operations
// 2. Caching and retry logic built into the service layer
// 3. Automatic reminder system for unverified emails
//
// Session Management:
// 1. Configurable session timeout with warning
// 2. Automatic session refresh on activity
// 3. Secure session storage with encryption support
//

// Import Firebase and services (using dynamic imports for module compatibility)
let authService, emailVerification, authConfig, authConsistency;
let servicesLoaded = false;

// Session configuration
const SESSION_CONFIG = {
    timeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 5 * 60 * 1000, // 5 minutes before timeout
    refreshInterval: 60 * 1000, // Check every minute
    storageKey: 'sleipnir_session'
};

// Retry configuration
const RETRY_CONFIG = {
    maxAttempts: 3,
    delay: 1000,
    backoff: 2
};

// Current auth state
let currentUser = null;
let currentUserData = null;
let sessionTimer = null;
let warningTimer = null;
let lastActivity = Date.now();

// Initialize services dynamically
async function initializeServices() {
    if (servicesLoaded) return;
    
    try {
        // Dynamically import modules
        const modules = await Promise.all([
            import('./auth-service.js'),
            import('./email-verification.js'),
            import('./firebase-auth-config.js'),
            import('./auth-consistency.js')
        ]);
        
        authService = modules[0];
        emailVerification = modules[1];
        authConfig = modules[2];
        authConsistency = modules[3];
        
        servicesLoaded = true;
        console.log('Auth services initialized successfully');
        
        // Configure auth persistence
        await authConfig.configureAuthPersistence();
        
        // Initialize consistency checker
        await authConsistency.initializeConsistencyCheck();
        
    } catch (error) {
        console.error('Failed to initialize auth services:', error);
        // Fallback to basic functionality
        servicesLoaded = false;
    }
}

// Initialize services on page load
if (typeof window !== 'undefined') {
    initializeServices();
}

// Email verification cache (enhanced)
const emailVerificationCache = {
    checked: false,
    needsVerification: false,
    lastCheck: null,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    reminderSent: false
};

// User data cache configuration (enhanced)
const userDataCache = {
    timeout: 30 * 60 * 1000, // 30 minutes
    storageKey: 'sleipnir_user_data',
    encryptionEnabled: false // Set to true in production with encryption key
};

// Enhanced cache helper functions
function getCachedUserData(uid) {
    try {
        const cacheKey = `${userDataCache.storageKey}_${uid}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        
        // Check if cache is still valid
        if (Date.now() - timestamp > userDataCache.timeout) {
            sessionStorage.removeItem(cacheKey);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error reading user data cache:', error);
        return null;
    }
}

function setCachedUserData(uid, data) {
    try {
        const cacheKey = `${userDataCache.storageKey}_${uid}`;
        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error setting user data cache:', error);
    }
}

function clearUserDataCache(uid) {
    try {
        if (uid) {
            const cacheKey = `${userDataCache.storageKey}_${uid}`;
            sessionStorage.removeItem(cacheKey);
        } else {
            // Clear all user data caches
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith(userDataCache.storageKey)) {
                    sessionStorage.removeItem(key);
                }
            });
        }
        
        // Also clear auth state from service
        if (servicesLoaded && authConfig) {
            authConfig.clearAuthData();
        }
    } catch (error) {
        console.error('Error clearing user data cache:', error);
    }
}

// Get user data with retry logic
async function getUserData(uid, forceRefresh = false, attempts = 1) {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
        const cachedData = getCachedUserData(uid);
        if (cachedData) {
            console.log('Using cached user data');
            return cachedData;
        }
    }
    
    // Fetch from Firestore with retry
    try {
        console.log(`Fetching user data from Firestore (attempt ${attempts})`);
        const userDoc = await firebase.firestore().collection('users').doc(uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Cache the data
            setCachedUserData(uid, userData);
            return userData;
        }
        
        return null;
    } catch (error) {
        console.error(`Error fetching user data (attempt ${attempts}):`, error);
        
        // Retry logic
        if (attempts < RETRY_CONFIG.maxAttempts) {
            const delay = RETRY_CONFIG.delay * Math.pow(RETRY_CONFIG.backoff, attempts - 1);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return getUserData(uid, forceRefresh, attempts + 1);
        }
        
        // Final attempt - try to return cached data
        return getCachedUserData(uid);
    }
}

// Session management functions
function startSessionTimer() {
    // Clear existing timers
    stopSessionTimer();
    
    // Update last activity
    lastActivity = Date.now();
    
    // Set warning timer
    warningTimer = setTimeout(() => {
        showSessionWarning();
    }, SESSION_CONFIG.timeout - SESSION_CONFIG.warningTime);
    
    // Set logout timer
    sessionTimer = setTimeout(() => {
        handleSessionTimeout();
    }, SESSION_CONFIG.timeout);
    
    // Save session state
    saveSessionState();
}

function stopSessionTimer() {
    if (sessionTimer) {
        clearTimeout(sessionTimer);
        sessionTimer = null;
    }
    if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
    }
}

function refreshSession() {
    console.log('Refreshing session...');
    lastActivity = Date.now();
    startSessionTimer();
    hideSessionWarning();
}

function showSessionWarning() {
    const lang = localStorage.getItem('selectedLanguage') || 'is';
    const message = lang === 'is' 
        ? 'Þú verður skráð(ur) út eftir 5 mínútur vegna óvirkni. Smelltu hér til að halda áfram.'
        : 'You will be logged out in 5 minutes due to inactivity. Click here to continue.';
    
    // Create warning banner
    const banner = document.createElement('div');
    banner.id = 'session-warning';
    banner.className = 'session-warning';
    banner.innerHTML = `
        <div class="session-warning-content">
            <span>${message}</span>
            <button onclick="refreshSession()" class="session-refresh-btn">
                ${lang === 'is' ? 'Halda áfram' : 'Continue'}
            </button>
        </div>
    `;
    
    document.body.appendChild(banner);
}

function hideSessionWarning() {
    const warning = document.getElementById('session-warning');
    if (warning) {
        warning.remove();
    }
}

function handleSessionTimeout() {
    const lang = localStorage.getItem('selectedLanguage') || 'is';
    alert(lang === 'is' 
        ? 'Þú hefur verið skráð(ur) út vegna óvirkni.' 
        : 'You have been logged out due to inactivity.');
    
    logout();
}

function saveSessionState() {
    try {
        const sessionData = {
            uid: currentUser?.uid,
            lastActivity: lastActivity,
            timestamp: Date.now()
        };
        
        sessionStorage.setItem(SESSION_CONFIG.storageKey, JSON.stringify(sessionData));
    } catch (error) {
        console.error('Error saving session state:', error);
    }
}

function loadSessionState() {
    try {
        const saved = sessionStorage.getItem(SESSION_CONFIG.storageKey);
        if (!saved) return null;
        
        const sessionData = JSON.parse(saved);
        
        // Check if session is still valid
        const elapsed = Date.now() - sessionData.lastActivity;
        if (elapsed > SESSION_CONFIG.timeout) {
            sessionStorage.removeItem(SESSION_CONFIG.storageKey);
            return null;
        }
        
        return sessionData;
    } catch (error) {
        console.error('Error loading session state:', error);
        return null;
    }
}

// Track user activity
document.addEventListener('click', refreshSession);
document.addEventListener('keypress', refreshSession);
document.addEventListener('scroll', refreshSession);
document.addEventListener('mousemove', refreshSession);

// Enhanced auth state observer with edge case handling
auth.onAuthStateChanged(async (user) => {
    const memberPortal = document.querySelector('.member-portal');
    
    if (user) {
        currentUser = user;
        
        try {
            // Load or restore session
            const sessionData = loadSessionState();
            if (sessionData && sessionData.uid === user.uid) {
                console.log('Restoring session...');
            }
            
            // Start session timer
            startSessionTimer();
            
            // Get user data with caching
            currentUserData = await getUserData(user.uid);
            
            // Handle edge cases
            if (!currentUserData) {
                console.log('No Firestore profile found for user:', user.email);
                
                // Check if this is an orphaned account using consistency service
                if (servicesLoaded && authConsistency) {
                    const consistency = await authConsistency.checkAuthConsistency({
                        checkProfiles: true,
                        maxUsers: 1
                    });
                    
                    if (consistency.summary.orphanedAuth > 0) {
                        console.warn('Orphaned auth account detected');
                        // Don't auto-create - user should complete registration
                    }
                }
                
                currentUserData = null;
            }
            
            // Update UI based on available data
            if (currentUserData) {
                updateUIForLoggedInUser();
                
                // Store auth state if using enhanced config
                if (servicesLoaded && authConfig) {
                    authConfig.storeAuthState(user);
                }
            } else {
                // User has Firebase Auth but no profile
                updateUIForLoggedOutUser();
            }
            
            // Handle member portal UI
            if (memberPortal) {
                updateMemberPortalUI(user, currentUserData);
            }
            
            // Check email verification for protected pages
            if (currentUserData) {
                const currentPage = window.location.pathname.split('/').pop();
                await handleEmailVerificationRedirect(user, currentPage);
                
                // Send reminder if needed
                if (servicesLoaded && emailVerification && !user.emailVerified) {
                    const reminder = await emailVerification.checkAndSendVerificationReminder(user);
                    if (reminder.needed !== false && reminder.reminder) {
                        console.log(`Verification reminder sent (${reminder.reminderNumber})`);
                    }
                }
            }
            
        } catch (error) {
            console.error('Error in auth state change:', error);
            
            // Log error if service is available
            if (servicesLoaded && authService) {
                authService.AuthError.log(error, 'auth-state-change');
            }
            
            updateUIForLoggedOutUser();
        }
    } else {
        // User logged out
        currentUser = null;
        currentUserData = null;
        
        // Stop session timer
        stopSessionTimer();
        
        // Clear all caches and session data
        clearUserDataCache();
        sessionStorage.removeItem(SESSION_CONFIG.storageKey);
        
        // Clear verification cache
        emailVerificationCache.checked = false;
        emailVerificationCache.needsVerification = false;
        emailVerificationCache.lastCheck = null;
        emailVerificationCache.reminderSent = false;
        
        updateUIForLoggedOutUser();
        
        // Reset member portal
        if (memberPortal) {
            memberPortal.classList.remove('loading');
            memberPortal.innerHTML = '';
        }
    }
});

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const memberPortal = document.querySelector('.member-portal');
    
    // First check for old-style elements (for backward compatibility)
    const authButton = document.getElementById('authButton');
    const userName = document.getElementById('userName');

    if (authButton && userName) {
        // Old implementation for pages that have these elements
        authButton.style.display = 'none';
        userName.style.display = 'inline-block';
        userName.textContent = currentUserData.fullName || currentUser.email;
        userName.style.cursor = 'pointer';
        userName.title = 'Click to logout';
        userName.onclick = () => {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        };

        if (currentUserData.role === 'admin') {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'admin-link';
            adminLink.style.marginLeft = '20px';
            adminLink.style.color = 'var(--mc-red)';
            adminLink.textContent = 'Admin';
            userName.parentNode.appendChild(adminLink);
        }
    } else if (memberPortal) {
        // New implementation using updateMemberPortalUI
        updateMemberPortalUI(currentUser, currentUserData);
    }
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    const authButton = document.getElementById('authButton');
    const userName = document.getElementById('userName');
    const memberPortal = document.querySelector('.member-portal');

    if (authButton && userName) {
        authButton.style.display = 'inline-block';
        userName.style.display = 'none';

        // Remove admin link if exists
        const adminLink = document.querySelector('.admin-link');
        if (adminLink) {
            adminLink.remove();
        }
    }
    
    // Update member portal for logged out state
    if (memberPortal && !memberPortal.querySelector('#authButton')) {
        memberPortal.innerHTML = `
            <a href="login.html" class="member-btn" id="authButton">
                <span class="is">Innskrá</span>
                <span class="en">Login</span>
            </a>
        `;
    }
    
    // Show standalone language toggle
    const standaloneLangToggle = document.querySelector('nav > .language-toggle');
    if (standaloneLangToggle) {
        standaloneLangToggle.style.display = 'block';
    }
}

// Protected route check with retry
async function checkProtectedRoute(requiredRole = null, attempts = 1) {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();

            if (!user) {
                // Store intended destination
                if (servicesLoaded && authConfig) {
                    authConfig.setPostAuthRedirect(window.location.href);
                }
                window.location.href = 'login.html';
                resolve(false);
                return;
            }

            if (requiredRole) {
                try {
                    const userData = await getUserData(user.uid);
                    if (userData) {
                        if (userData.role !== requiredRole) {
                            alert('You do not have permission to access this page.');
                            window.location.href = 'index.html';
                            resolve(false);
                            return;
                        }
                    } else {
                        // No user data found - retry
                        if (attempts < RETRY_CONFIG.maxAttempts) {
                            console.log(`Retrying protected route check (attempt ${attempts + 1})`);
                            setTimeout(() => {
                                checkProtectedRoute(requiredRole, attempts + 1).then(resolve);
                            }, RETRY_CONFIG.delay);
                            return;
                        }
                        
                        window.location.href = 'index.html';
                        resolve(false);
                        return;
                    }
                } catch (error) {
                    console.error('Error checking user role:', error);
                    window.location.href = 'index.html';
                    resolve(false);
                    return;
                }
            }

            resolve(true);
        });
    });
}

// Enhanced email verification check using service
async function checkEmailVerification(user, forceCheck = false) {
    // Use service if available
    if (servicesLoaded && emailVerification) {
        const status = await emailVerification.checkEmailVerificationStatus(user, forceCheck);
        return !status.verified;
    }
    
    // Fallback to original implementation
    // Return cached result if valid and not forcing a check
    if (!forceCheck && 
        emailVerificationCache.checked && 
        emailVerificationCache.lastCheck && 
        (Date.now() - emailVerificationCache.lastCheck) < emailVerificationCache.cacheTimeout) {
        return emailVerificationCache.needsVerification;
    }

    try {
        // Check if user has verified email
        if (!user.emailVerified) {
            // Get user data using cache
            const userData = await getUserData(user.uid);
            
            if (!userData) {
                // New user - needs verification
                emailVerificationCache.needsVerification = true;
            } else {
                // Existing user - check if emailVerified field is explicitly false
                emailVerificationCache.needsVerification = userData.emailVerified === false;
            }
        } else {
            // Email is verified
            emailVerificationCache.needsVerification = false;
            
            // Update Firestore if needed
            const userData = await getUserData(user.uid);
            if (userData && userData.emailVerified === false) {
                await firebase.firestore().collection('users').doc(user.uid).update({
                    emailVerified: true
                });
                // Clear cache to force refresh with updated data
                clearUserDataCache(user.uid);
            }
        }
        
        // Update cache
        emailVerificationCache.checked = true;
        emailVerificationCache.lastCheck = Date.now();
        
        return emailVerificationCache.needsVerification;
    } catch (error) {
        console.error('Error checking email verification:', error);
        // On error, assume verification is needed for safety
        return true;
    }
}

// Handle email verification redirect
async function handleEmailVerificationRedirect(user, currentPage) {
    const protectedPages = ['shop.html', 'orders.html', 'admin.html'];
    
    if (protectedPages.includes(currentPage)) {
        const needsVerification = await checkEmailVerification(user);
        
        if (needsVerification) {
            // Send verification email if not already sent
            if (!user.emailVerified && servicesLoaded && emailVerification) {
                try {
                    const result = await emailVerification.sendVerificationEmailWithRetry(user);
                    console.log('Verification email sent:', result);
                } catch (error) {
                    console.error('Error sending verification email:', error);
                }
            }
            
            window.location.href = 'verify-email.html';
            return true;
        }
    }
    
    return false;
}

// Enhanced logout function
function logout() {
    // Stop session timer
    stopSessionTimer();
    hideSessionWarning();
    
    // Clear all caches on logout
    emailVerificationCache.checked = false;
    emailVerificationCache.needsVerification = false;
    emailVerificationCache.lastCheck = null;
    emailVerificationCache.reminderSent = false;
    clearUserDataCache();
    
    // Clear session data
    sessionStorage.removeItem(SESSION_CONFIG.storageKey);
    
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
        // Retry once
        setTimeout(() => {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        }, 1000);
    });
}

// Update member portal UI
function updateMemberPortalUI(user, userData) {
    const memberPortal = document.querySelector('.member-portal');
    if (!memberPortal) return;
    
    // Remove loading state
    memberPortal.classList.remove('loading');
    
    if (userData) {
        // Hide standalone language toggle when user is logged in
        const standaloneLangToggle = document.querySelector('nav > .language-toggle');
        if (standaloneLangToggle) {
            standaloneLangToggle.style.display = 'none';
        }
        
        // Hide auth buttons (login button) when user is logged in
        const authButtons = document.querySelector('.auth-buttons');
        if (authButtons) {
            authButtons.style.display = 'none';
        }
        
        const userName = userData.fullName || user.email.split('@')[0];
        const isAdmin = userData.role === 'admin';
        
        memberPortal.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="user-menu" id="userMenu">
                    <div class="user-menu-toggle" onclick="toggleUserMenu()">
                        <span class="user-name">${userName}</span>
                        <span style="color: var(--mc-red);">▼</span>
                    </div>
                    <div class="user-menu-dropdown">
                        <a href="orders.html" class="user-menu-item">
                            <span class="is">Mínar Pantanir</span>
                            <span class="en">My Orders</span>
                        </a>
                        ${isAdmin ? '<a href="admin.html" class="user-menu-item admin-link">Admin Panel</a>' : ''}
                        <div class="user-menu-divider"></div>
                        <a href="#" onclick="logout()" class="user-menu-item">
                            <span class="is">Útskrá</span>
                            <span class="en">Logout</span>
                        </a>
                    </div>
                </div>
                <div class="language-toggle">
                    <button class="lang-btn" onclick="toggleLanguage()">
                        <span class="is">EN</span>
                        <span class="en">IS</span>
                    </button>
                </div>
            </div>
        `;
    }
}

// Add loading class to member portal on page load
document.addEventListener('DOMContentLoaded', () => {
    const memberPortal = document.querySelector('.member-portal');
    if (memberPortal) {
        memberPortal.classList.add('loading');
        // Add skeleton loader
        memberPortal.innerHTML = `
            <div class="skeleton-loader" style="width: 100px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite;"></div>
        `;
    }
});

// Toggle user menu
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.toggle('active');
    }
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userMenu');
    if (userMenu && !userMenu.contains(e.target)) {
        userMenu.classList.remove('active');
    }
});

// Enhanced refresh user data with retry
async function refreshUserData(attempts = 1) {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    
    try {
        // Force refresh from Firestore
        const userData = await getUserData(user.uid, true);
        
        // Update current user data
        if (userData) {
            currentUserData = userData;
            updateUIForLoggedInUser();
        }
        
        return userData;
    } catch (error) {
        console.error(`Error refreshing user data (attempt ${attempts}):`, error);
        
        // Retry logic
        if (attempts < RETRY_CONFIG.maxAttempts) {
            const delay = RETRY_CONFIG.delay * Math.pow(RETRY_CONFIG.backoff, attempts - 1);
            console.log(`Retrying refresh in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return refreshUserData(attempts + 1);
        }
        
        return null;
    }
}

// Make functions globally available
window.toggleUserMenu = toggleUserMenu;
window.logout = logout;
window.checkEmailVerification = checkEmailVerification;
window.handleEmailVerificationRedirect = handleEmailVerificationRedirect;
window.refreshUserData = refreshUserData;
window.getUserData = getUserData;
window.refreshSession = refreshSession;

// Check if user is member
async function checkMemberStatus() {
    const user = firebase.auth().currentUser;
    if (!user) return false;

    try {
        const userData = await getUserData(user.uid);
        return userData && (userData.isMember === true || userData.role === 'admin');
    } catch (error) {
        console.error('Error checking member status:', error);
        return false;
    }
}

// Check if user is admin
async function checkAdminStatus() {
    const user = firebase.auth().currentUser;
    if (!user) return false;

    try {
        const userData = await getUserData(user.uid);
        return userData && userData.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Session warning styles
const sessionStyles = `
<style>
.session-warning {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: var(--mc-red);
    color: white;
    padding: 15px;
    text-align: center;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    animation: slideDown 0.3s ease-out;
}

.session-warning-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    max-width: 800px;
    margin: 0 auto;
}

.session-refresh-btn {
    background: white;
    color: var(--mc-red);
    border: none;
    padding: 8px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s;
}

.session-refresh-btn:hover {
    background: #f0f0f0;
    transform: translateY(-1px);
}

@keyframes slideDown {
    from {
        transform: translateY(-100%);
    }
    to {
        transform: translateY(0);
    }
}
</style>
`;

// Inject session styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('div');
    styleSheet.innerHTML = sessionStyles;
    document.head.appendChild(styleSheet.firstElementChild);
}

// Export functions for module usage
export {
    checkProtectedRoute,
    checkMemberStatus,
    checkAdminStatus,
    refreshUserData,
    getUserData,
    logout
};