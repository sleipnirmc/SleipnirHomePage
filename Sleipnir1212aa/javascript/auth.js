// Authentication Handler
let currentUser = null;
let currentUserData = null;

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        // Get user data from Firestore
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUserData = userDoc.data();
                updateUIForLoggedInUser();
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    } else {
        currentUser = null;
        currentUserData = null;
        updateUIForLoggedOutUser();
    }
});

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const authButton = document.getElementById('authButton');
    const userName = document.getElementById('userName');

    if (authButton && userName) {
        // Hide login button
        authButton.style.display = 'none';

        // Show user name
        userName.style.display = 'inline-block';
        userName.textContent = currentUserData.fullName || currentUser.email;

        // Add logout functionality
        userName.style.cursor = 'pointer';
        userName.title = 'Click to logout';
        userName.onclick = () => {
            if (confirm('Are you sure you want to logout?')) {
                auth.signOut();
            }
        };

        // If admin, show admin link
        if (currentUserData.role === 'admin') {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.className = 'admin-link';
            adminLink.style.marginLeft = '20px';
            adminLink.style.color = 'var(--mc-red)';
            adminLink.textContent = 'Admin';
            userName.parentNode.appendChild(adminLink);
        }
    }
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    const authButton = document.getElementById('authButton');
    const userName = document.getElementById('userName');

    if (authButton && userName) {
        authButton.style.display = 'inline-block';
        userName.style.display = 'none';

        // Remove admin link if exists
        const adminLink = document.querySelector('.admin-link');
        if (adminLink) {
            adminLink.remove();
        }
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
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (userData.role !== requiredRole) {
                            alert('You do not have permission to access this page.');
                            window.location.href = 'index.html';
                            resolve(false);
                            return;
                        }
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

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

// Add loading class to member portal on page load
document.addEventListener('DOMContentLoaded', () => {
    const memberPortal = document.querySelector('.member-portal');
    if (memberPortal) {
        memberPortal.classList.add('loading');
    }
});

// Authentication state observer
firebase.auth().onAuthStateChanged(async (user) => {
    const memberPortal = document.querySelector('.member-portal');
    
    if (user) {
        try {
            // Get user data from Firestore
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            
            // Check if user exists in database
            if (!userDoc.exists) {
                // User logged in but not in database - this is a new user or database issue
                // For existing Firebase Auth users not in Firestore, create their profile
                await firebase.firestore().collection('users').doc(user.uid).set({
                    email: user.email,
                    fullName: user.displayName || user.email.split('@')[0],
                    role: 'customer',
                    isMember: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    emailVerified: user.emailVerified
                });
                
                // If email not verified, require verification
                if (!user.emailVerified) {
                    const protectedPages = ['shop.html', 'orders.html', 'admin.html'];
                    const currentPage = window.location.pathname.split('/').pop();
                    
                    if (protectedPages.includes(currentPage)) {
                        // Send verification email
                        await user.sendEmailVerification();
                        window.location.href = 'verify-email.html';
                        return;
                    }
                }
            }
            
            const userData = userDoc.data() || {};
            
            // For users in database, only check verification if they have the emailVerified field set to false
            const protectedPages = ['shop.html', 'orders.html', 'admin.html'];
            const currentPage = window.location.pathname.split('/').pop();
            
            if (!user.emailVerified && protectedPages.includes(currentPage) && userData.emailVerified === false) {
                window.location.href = 'verify-email.html';
                return;
            }

            // Hide header language toggle when user is logged in
            const headerLangToggle = document.querySelector('nav > .language-toggle');
            if (headerLangToggle) {
                headerLangToggle.style.display = 'none';
            }

            // Create user menu
            if (memberPortal) {
                const userName = userData?.fullName || user.email.split('@')[0];
                const isAdmin = userData?.role === 'admin';
                
                memberPortal.innerHTML = `
                    <div class="user-menu" id="userMenu">
                        <div class="user-menu-toggle" onclick="toggleUserMenu()">
                            <span class="user-name">${userName}</span>
                            <span style="color: var(--mc-red);">▼</span>
                        </div>
                        <div class="user-menu-dropdown">
                            ${isAdmin ? '<a href="admin.html"><span class="is">Stjórnborð</span><span class="en">Admin Panel</span></a>' : '<a href="orders.html"><span class="is">Mínar Pantanir</span><span class="en">My Orders</span></a>'}
                            <a href="shop.html"><span class="is">Verslun</span><span class="en">Shop</span></a>
                            <a href="#" onclick="logout()" class="logout-btn"><span class="is">Útskrá</span><span class="en">Logout</span></a>
                            <div class="language-toggle-container">
                                <button class="lang-btn" onclick="toggleLanguage()">
                                    <span class="is">EN</span>
                                    <span class="en">IS</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Store user data in session
            window.currentUser = {
                uid: user.uid,
                email: user.email,
                ...userData
            };

        } catch (error) {
            console.error('Error getting user data:', error);
        }
    } else {
        // User is signed out
        // Show header language toggle again
        const headerLangToggle = document.querySelector('nav > .language-toggle');
        if (headerLangToggle) {
            headerLangToggle.style.display = 'block';
        }
        
        if (memberPortal) {
            memberPortal.innerHTML = `
                <a href="login.html" class="member-btn" id="authButton">
                    <span class="is">Innskrá</span>
                    <span class="en">Login</span>
                </a>
            `;
        }

        window.currentUser = null;
    }
    
    // Remove loading state
    if (memberPortal) {
        memberPortal.classList.remove('loading');
        memberPortal.classList.add('loaded');
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

// Make functions globally available
window.toggleUserMenu = toggleUserMenu;
window.logout = logout;

// Check if user is member
async function checkMemberStatus() {
    const user = firebase.auth().currentUser;
    if (!user) return false;

    try {
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();
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
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        return userData && userData.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Note: Admin page protection is now handled directly in admin.html for better security