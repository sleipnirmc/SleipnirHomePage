/**
 * Script to read Arni's current user profile and update it to be
 * compatible with the members display (members: true) while keeping admin privileges.
 *
 * Usage:
 *   node scripts/update-arni-profile.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve(__dirname, '..', 'sleipnirmcshop-firebase-adminsdk-fbsvc-93836426b4.json');

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (err) {
    console.error('ERROR: Could not load service account key at', serviceAccountPath);
    console.error('Download it from Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
    process.exit(1);
}

const db = admin.firestore();

async function main() {
    // Step 1: Find Arni's user document
    console.log('Searching for Arni in the users collection...\n');

    const usersSnapshot = await db.collection('users').get();
    let arniDoc = null;

    for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        const name = (data.displayName || data.name || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        if (name.includes('arni') || name.includes('arnar') || email.includes('arnar')) {
            arniDoc = { id: doc.id, data: data };
            break;
        }
    }

    if (!arniDoc) {
        console.error('Could not find Arni in the users collection.');
        console.log('\nAll users:');
        usersSnapshot.docs.forEach(doc => {
            const d = doc.data();
            console.log(`  [${doc.id}] ${d.displayName || d.name || '(no name)'} — ${d.email || '(no email)'} — role: ${d.role || '(none)'} — members: ${d.members}`);
        });
        process.exit(1);
    }

    console.log('Found Arni:');
    console.log(`  Document ID: ${arniDoc.id}`);
    console.log(`  Current profile:`);
    const current = arniDoc.data;
    for (const [key, value] of Object.entries(current)) {
        if (value && typeof value === 'object' && value._seconds !== undefined) {
            console.log(`    ${key}: ${new Date(value._seconds * 1000).toISOString()}`);
        } else {
            console.log(`    ${key}: ${JSON.stringify(value)}`);
        }
    }

    // Step 2: Update Arni's profile
    console.log('\n\nUpdating Arni\'s profile...\n');

    const updates = {};

    // Ensure members flag is true
    if (current.members !== true) {
        updates.members = true;
        console.log('  Setting members: true');
    } else {
        console.log('  members: true (already set)');
    }

    // Ensure admin role is preserved
    if (current.role !== 'admin') {
        updates.role = 'admin';
        console.log('  Setting role: admin');
    } else {
        console.log('  role: admin (already set)');
    }

    // Ensure displayName is set
    if (!current.displayName) {
        updates.displayName = current.name || 'Arni';
        console.log(`  Setting displayName: ${updates.displayName}`);
    } else {
        console.log(`  displayName: ${current.displayName} (already set)`);
    }

    // Add member-specific fields if missing
    if (!current.chapter) {
        updates.chapter = 'Reykjavik';
        console.log('  Setting chapter: Reykjavik');
    } else {
        console.log(`  chapter: ${current.chapter} (already set)`);
    }

    if (!current.motorcycleType && !current.motorcycle) {
        updates.motorcycleType = 'Harley-Davidson Night Rod Special';
        console.log('  Setting motorcycleType: Harley-Davidson Night Rod Special');
    } else {
        console.log(`  motorcycleType: ${current.motorcycleType || JSON.stringify(current.motorcycle)} (already set)`);
    }

    if (!current.memberRole) {
        updates.memberRole = 'Forseti';
        console.log('  Setting memberRole: Forseti (President)');
    } else {
        console.log(`  memberRole: ${current.memberRole} (already set)`);
    }

    if (Object.keys(updates).length === 0) {
        console.log('\nNo updates needed — Arni\'s profile is already compatible.');
    } else {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(arniDoc.id).update(updates);
        console.log(`\nApplied ${Object.keys(updates).length - 1} updates successfully.`);
    }

    // Step 3: Verify the updated profile
    console.log('\n\nVerified profile after update:');
    const verifyDoc = await db.collection('users').doc(arniDoc.id).get();
    const verified = verifyDoc.data();
    for (const [key, value] of Object.entries(verified)) {
        if (value && typeof value === 'object' && value._seconds !== undefined) {
            console.log(`  ${key}: ${new Date(value._seconds * 1000).toISOString()}`);
        } else {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
    }

    console.log('\nDone!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
