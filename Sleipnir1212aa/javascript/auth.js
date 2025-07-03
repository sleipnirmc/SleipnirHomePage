// Authentication Handler
// 
// Email Verification Strategy:
// 1. Centralized verification check in checkEmailVerification() with 5-minute caching
// 2. Login page only ensures user profile exists in Firestore
// 3. Register page sends verification email once and redirects
// 4. Auth state observer in this file handles all verification redirects
// 5. Verification status is cached to avoid redundant Firestore queries
//
// User Data Caching Strategy:
// 1. User data is cached in sessionStorage on login
// 2. Cache includes user profile data and a timestamp
// 3. Cache is validated for 30 minutes before refresh
// 4. Cache is cleared on logout or when data changes
//
// User Profile Strategy (Simplified):
// 1. New users MUST register through register.html to create profiles
// 2. NO automatic profile creation for Firebase Auth users without Firestore profiles
// 3. Users with Firebase Auth but no profile are treated as logged out
// 4. This prevents circular logic and ensures proper user onboarding
//
let currentUser = null;
let currentUserData = null;

// Email verification cache
const emailVerificationCache = {
    checked: false,
    needsVerification: false,
    lastCheck: null,
    cacheTimeout: 5 * 60 * 1000 // 5 minutes cache
};

// User data cache configuration
const userDataCache = {
    timeout: 30 * 60 * 1000, // 30 minutes cache
    storageKey: 'sleipnir_user_data'
};

// Cache helper functions
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
    } catch (error) {
        console.error('Error clearing user data cache:', error);
    }
}

// Get user data with caching
async function getUserData(uid, forceRefresh = false) {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
        const cachedData = getCachedUserData(uid);
        if (cachedData) {
            console.log('Using cached user data');
            return cachedData;
        }
    }
    
    // Fetch from Firestore
    try {
        console.log('Fetching user data from Firestore');
        const userDoc = await firebase.firestore().collection('users').doc(uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Cache the data
            setCachedUserData(uid, userData);
            return userData;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching user data:', error);
        // Try to return cached data on error
        return getCachedUserData(uid);
    }
}

// Main auth state observer - Single source of truth
auth.onAuthStateChanged(async (user) => {
    const memberPortal = document.querySelector('.member-portal');
    
    if (user) {
        currentUser = user;
        
        try {
            // Get user data with caching
            currentUserData = await getUserData(user.uid);
            
            // Only check for new users who just registered
            // Existing Firebase Auth users without Firestore profiles should not be auto-created
            if (!currentUserData) {
                console.log('No Firestore profile found for user:', user.email);
                // Don't create profile automatically - user should register properly
                // This prevents circular logic and unauthorized profile creation
                currentUserData = null;
            }
            
            // Update UI based on available data
            if (currentUserData) {
                updateUIForLoggedInUser();
            } else {
                // User has Firebase Auth but no profile - treat as logged out
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
            }
            
        } catch (error) {
            console.error('Error in auth state change:', error);
            updateUIForLoggedOutUser();
        }
    } else {
        // User logged out
        currentUser = null;
        currentUserData = null;
        clearUserDataCache();
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
                auth.signOut();
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

// Protected route check
async function checkProtectedRoute(requiredRole = null) {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();

            if (!user) {
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
                        // No user data found
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

// Centralized email verification check
async function checkEmailVerification(user, forceCheck = false) {
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
            if (!user.emailVerified) {
                try {
                    await user.sendEmailVerification();
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

// Logout function
function logout() {
    // Clear all caches on logout
    emailVerificationCache.checked = false;
    emailVerificationCache.needsVerification = false;
    emailVerificationCache.lastCheck = null;
    clearUserDataCache();
    
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
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

// Refresh user data manually (useful after profile updates)
async function refreshUserData() {
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
        console.error('Error refreshing user data:', error);
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

// Note: Admin page protection is now handled directly in admin.html for better security