// Firebase Auth Helper Functions
// Simplified authentication functions without ES6 modules

// Create user account with proper error handling
async function createUserWithProfile(email, password, userData) {
    try {
        // Sign out any existing user first
        await firebase.auth().signOut();
        
        // Create the auth account
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        try {
            // Create Firestore profile
            await firebase.firestore().collection('users').doc(user.uid).set({
                fullName: userData.fullName || '',
                email: email,
                address: userData.address || '',
                city: userData.city || '',
                postalCode: userData.postalCode || '',
                role: 'customer',
                isMember: false,
                memberRequestPending: userData.requestMembership || false,
                emailVerified: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { 
                success: true, 
                user: user,
                message: 'Account created successfully'
            };
            
        } catch (firestoreError) {
            console.error('Firestore error:', firestoreError);
            // If Firestore fails, delete the auth account to maintain consistency
            try {
                await user.delete();
            } catch (deleteError) {
                console.error('Could not delete auth account:', deleteError);
            }
            
            return {
                success: false,
                error: firestoreError,
                code: 'firestore-error',
                message: 'Could not create user profile'
            };
        }
        
    } catch (authError) {
        console.error('Auth error:', authError);
        
        // Handle specific auth errors
        if (authError.code === 'auth/too-many-requests') {
            // This is the rate limiting error
            return {
                success: false,
                error: authError,
                code: authError.code,
                message: 'Too many attempts. Please wait a few minutes and try again.',
                isRateLimit: true
            };
        }
        
        return {
            success: false,
            error: authError,
            code: authError.code,
            message: authError.message
        };
    }
}

// Send verification email with better error handling
async function sendVerificationEmailSafe(user, options = {}) {
    const lang = options.lang || localStorage.getItem('selectedLanguage') || 'is';
    const maxAttempts = options.maxAttempts || 1; // Reduce retry attempts to avoid rate limits
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Configure action code settings
            const actionCodeSettings = {
                url: `${window.location.origin}/auth-action.html?lang=${lang}&mode=verifyEmail`,
                handleCodeInApp: false
            };
            
            // Send the email
            await user.sendEmailVerification(actionCodeSettings);
            
            // Track the email send (optional)
            try {
                await firebase.firestore().collection('emailTracking').doc(user.uid).set({
                    email: user.email,
                    lastSent: firebase.firestore.FieldValue.serverTimestamp(),
                    sentCount: firebase.firestore.FieldValue.increment(1),
                    status: 'sent',
                    type: 'verification'
                }, { merge: true });
            } catch (trackingError) {
                console.warn('Could not track email:', trackingError);
            }
            
            return {
                success: true,
                attempts: attempt,
                message: 'Verification email sent successfully'
            };
            
        } catch (error) {
            console.error(`Email attempt ${attempt} failed:`, error);
            
            if (error.code === 'auth/too-many-requests') {
                return {
                    success: false,
                    error: error,
                    code: error.code,
                    message: 'Too many email requests. Please wait before requesting another email.',
                    isRateLimit: true
                };
            }
            
            // Don't retry if it's a rate limit or other permanent error
            if (attempt === maxAttempts || 
                error.code === 'auth/too-many-requests' ||
                error.code === 'auth/user-not-found') {
                return {
                    success: false,
                    error: error,
                    code: error.code,
                    message: error.message,
                    attempts: attempt
                };
            }
            
            // Wait before retry (only if not the last attempt)
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
}

// Get user-friendly error messages
function getFirebaseErrorMessage(error, lang = 'is') {
    const messages = {
        // Auth errors
        'auth/email-already-in-use': {
            is: 'Þetta netfang er þegar skráð',
            en: 'This email is already registered'
        },
        'auth/invalid-email': {
            is: 'Ógilt netfang',
            en: 'Invalid email address'
        },
        'auth/weak-password': {
            is: 'Lykilorð er of veikt (minnst 6 stafir)',
            en: 'Password is too weak (minimum 6 characters)'
        },
        'auth/user-not-found': {
            is: 'Notandi fannst ekki',
            en: 'User not found'
        },
        'auth/wrong-password': {
            is: 'Rangt lykilorð',
            en: 'Wrong password'
        },
        'auth/too-many-requests': {
            is: 'Of margar tilraunir. Vinsamlegast bíðið í nokkrar mínútur og reynið aftur.',
            en: 'Too many attempts. Please wait a few minutes and try again.'
        },
        'auth/network-request-failed': {
            is: 'Nettenging mistókst. Athugaðu tengingu þína.',
            en: 'Network error. Please check your connection.'
        },
        'auth/user-disabled': {
            is: 'Þessi aðgangur hefur verið óvirkjaður',
            en: 'This account has been disabled'
        },
        'auth/operation-not-allowed': {
            is: 'Þessi aðgerð er ekki leyfð',
            en: 'This operation is not allowed'
        },
        // Firestore errors
        'permission-denied': {
            is: 'Þú hefur ekki heimild til þessarar aðgerðar',
            en: 'You do not have permission for this action'
        },
        'firestore-error': {
            is: 'Villa við að vista gögn. Vinsamlegast reyndu aftur.',
            en: 'Error saving data. Please try again.'
        }
    };
    
    const errorCode = error.code || 'unknown';
    const message = messages[errorCode];
    
    if (message) {
        return message[lang];
    }
    
    // Default message
    return lang === 'is' 
        ? `Villa: ${error.message || 'Óþekkt villa'}`
        : `Error: ${error.message || 'Unknown error'}`;
}

// Check if we're being rate limited
function isRateLimitError(error) {
    return error && (
        error.code === 'auth/too-many-requests' ||
        (error.message && error.message.toLowerCase().includes('too many')) ||
        (error.message && error.message.toLowerCase().includes('rate limit'))
    );
}

// Clear auth-related data from browser storage
async function clearAuthCache() {
    try {
        // Sign out first
        await firebase.auth().signOut();
        
        // Clear localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('firebase') || key.includes('auth') || key.includes('sleipnir'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        console.log('Auth cache cleared');
        return true;
        
    } catch (error) {
        console.error('Error clearing auth cache:', error);
        return false;
    }
}

// Wait function for delays
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export functions for global use
if (typeof window !== 'undefined') {
    window.firebaseAuthHelper = {
        createUserWithProfile,
        sendVerificationEmailSafe,
        getFirebaseErrorMessage,
        isRateLimitError,
        clearAuthCache,
        wait
    };
}