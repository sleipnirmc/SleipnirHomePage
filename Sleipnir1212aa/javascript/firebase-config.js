// Firebase Configuration
// Note: These API keys are meant to be public and are protected by Firebase Security Rules
// Make sure to configure proper security rules in your Firebase Console
// NEVER commit service account keys or admin SDK credentials

// Environment-based configuration
// For production deployments, use environment variables or a build process
// to inject these values securely

// Option 1: Direct configuration (current approach - suitable for public web apps)
const firebaseConfig = {
  apiKey: "AIzaSyAsTfqo7_0xku_-7826WAQKuqzZBr4vSRY",
  authDomain: "sleipnirmcshop.firebaseapp.com",
  projectId: "sleipnirmcshop",
  storageBucket: "sleipnirmcshop.firebasestorage.app",
  messagingSenderId: "587097879417",
  appId: "1:587097879417:web:75097887635ff0603c35a8",
  measurementId: "G-148PQ3SX7R"
};

// Option 2: Environment variables (requires build process)
// Uncomment and use with a bundler like Webpack, Vite, or Parcel
/*
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};
*/

// Option 3: Runtime configuration loading (for dynamic environments)
// This approach loads config from a separate endpoint or config file
/*
let firebaseConfig = {};
async function loadFirebaseConfig() {
  try {
    const response = await fetch('/api/config/firebase');
    firebaseConfig = await response.json();
    initializeFirebase();
  } catch (error) {
    console.error('Failed to load Firebase config:', error);
  }
}
*/


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

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

// Authentication functions removed - to be added back later

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

// Uncomment and run this once to set up initial products
// addSampleProducts();