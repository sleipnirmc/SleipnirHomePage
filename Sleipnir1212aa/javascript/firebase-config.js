// Firebase Configuration
// Note: These API keys are meant to be public and are protected by Firebase Security Rules
// Make sure to configure proper security rules in your Firebase Console
// NEVER commit service account keys or admin SDK credentials

const firebaseConfig = {
  apiKey: "AIzaSyAsTfqo7_0xku_-7826WAQKuqzZBr4vSRY",
  authDomain: "sleipnirmcshop.firebaseapp.com",
  projectId: "sleipnirmcshop",
  storageBucket: "sleipnirmcshop.firebasestorage.app",
  messagingSenderId: "587097879417",
  appId: "1:587097879417:web:75097887635ff0603c35a8",
  measurementId: "G-148PQ3SX7R"
};


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