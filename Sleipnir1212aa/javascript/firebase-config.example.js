// Firebase Configuration Example
// IMPORTANT: Copy this file to firebase-config.js and add your actual Firebase credentials
// DO NOT commit firebase-config.js to version control!

const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();
const auth = firebase.auth();

// Export for module usage
export { db, auth, firebaseConfig };