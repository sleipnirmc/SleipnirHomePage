// Firebase Configuration
// Note: These API keys are meant to be public and are protected by Firebase Security Rules
// Make sure to configure proper security rules in your Firebase Console
// NEVER commit service account keys or admin SDK credentials


const firebaseConfig = {
      apiKey: "AIzaSyCgtVtb6GarjkcENuditycF-FjlGFmgQWM",
      authDomain: "gervilausnir.firebaseapp.com",
      projectId: "gervilausnir",
      storageBucket: "gervilausnir.firebasestorage.app",
      messagingSenderId: "812038651978",
      appId: "1:812038651978:web:efd41e0bb996d0445b26b3",
      measurementId: "G-9VYW2BNRST"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();
const auth = firebase.auth();

// Set up auth settings
auth.useDeviceLanguage();

// Configure action code settings for email actions
const actionCodeSettings = {
    url: window.location.origin + '/auth-action.html',
    handleCodeInApp: true
};

// Enable offline persistence with multi-tab support
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            // Multiple tabs open, persistence already enabled
            console.log('Persistence already enabled in another tab');
        } else if (err.code === 'unimplemented') {
            console.log('The current browser does not support offline persistence');
        }
    });

// Helper function to check if user is admin
async function isAdmin(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.role === 'admin';
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Helper function to check if user is member
async function isMember(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.isMember === true;
        }
        return false;
    } catch (error) {
        console.error('Error checking member status:', error);
        return false;
    }
}

// Create initial admin user (run this once in console with your own credentials)
// Example usage: createInitialAdmin('your-email@example.com', 'your-secure-password', 'Your Name')
async function createInitialAdmin(email, password, fullName) {
    if (!email || !password || !fullName) {
        console.error('Please provide email, password, and full name');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await db.collection('users').doc(user.uid).set({
            fullName: fullName,
            email: email,
            role: 'admin',
            isMember: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Admin user created successfully');
        console.log('IMPORTANT: Please change your password immediately after first login');
    } catch (error) {
        console.error('Error creating admin:', error);
    }
}

// Add some sample products (run this once in console)
async function addSampleProducts() {
    const sampleProducts = [
        {
            nameIs: 'Reiðmanns Kyrtill',
            nameEn: 'Rider\'s Tunic',
            description: 'Woven with threads of midnight sun',
            category: 'tshirt',
            price: 3999,
            membersOnly: true,
            sizes: ['S', 'M', 'L', 'XL', 'XXL'],
            inStock: true
        },
        {
            nameIs: 'Berserkja Buxur',
            nameEn: 'Berserker Denim',
            description: 'Armor for the modern warrior',
            category: 'jeans',
            price: 12999,
            membersOnly: true,
            sizes: ['28', '30', '32', '34', '36', '38'],
            inStock: true
        },
        {
            nameIs: 'Valkyrju Hetta',
            nameEn: 'Valkyrie Hood',
            description: 'Protection from the northern winds',
            category: 'hoodie',
            price: 8999,
            membersOnly: true,
            sizes: ['S', 'M', 'L', 'XL', 'XXL'],
            inStock: true
        },
        {
            nameIs: 'Sleipnir Lykill',
            nameEn: 'Sleipnir Keychain',
            description: 'Eight-legged steed for your keys',
            category: 'other',
            price: 1999,
            membersOnly: false,
            inStock: true
        },
        {
            nameIs: 'Norrænn Krus',
            nameEn: 'Norse Mug',
            description: 'Drink like a warrior',
            category: 'other',
            price: 2999,
            membersOnly: false,
            inStock: true
        }
    ];

    for (const product of sampleProducts) {
        try {
            await db.collection('products').add({
                ...product,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Added product:', product.nameEn);
        } catch (error) {
            console.error('Error adding product:', error);
        }
    }
}

// Uncomment and run these once to set up initial data
// createInitialAdmin();
// addSampleProducts();