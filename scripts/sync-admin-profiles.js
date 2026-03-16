/**
 * Updates both Arnar's and Árni's Firestore profiles:
 *
 * Arnar (arnarfreyre@gmail.com) — web designer, not a real member:
 *   - Remove memberRole (was incorrectly "Forseti")
 *   - Set motorcycleType to "" (empty)
 *   - Keep members: true (temporary, for testing)
 *
 * Árni (arni76@simnet.is) — actual club member:
 *   - Add missing fields: displayName, chapter, memberRole, members, motorcycleType
 *
 * Usage: node scripts/sync-admin-profiles.js
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '..', 'sleipnirmcshop-firebase-adminsdk-fbsvc-93836426b4.json');

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (err) {
    console.error('ERROR: Could not load service account key at', serviceAccountPath);
    process.exit(1);
}

const db = admin.firestore();

async function main() {
    const ARNAR_EMAIL = 'arnarfreyre@gmail.com';
    const ARNI_EMAIL = 'arni76@simnet.is';

    console.log('Fetching users...\n');
    const usersSnapshot = await db.collection('users').get();

    let arnarDoc = null;
    let arniDoc = null;

    for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        const email = (data.email || '').toLowerCase();
        if (email === ARNAR_EMAIL) arnarDoc = { id: doc.id, data };
        if (email === ARNI_EMAIL) arniDoc = { id: doc.id, data };
    }

    if (!arnarDoc || !arniDoc) {
        if (!arnarDoc) console.error(`Arnar (${ARNAR_EMAIL}) NOT FOUND`);
        if (!arniDoc) console.error(`Árni (${ARNI_EMAIL}) NOT FOUND`);
        process.exit(1);
    }

    // ── Arnar updates (web designer cleanup) ──
    console.log('ARNAR — cleaning up web designer profile:');
    const arnarUpdates = {
        motorcycleType: '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const arnarDeletes = {};

    // Delete memberRole field entirely
    if (arnarDoc.data.memberRole) {
        arnarDeletes.memberRole = admin.firestore.FieldValue.delete();
        console.log('  DELETE memberRole (was "Forseti" — not a real member)');
    }
    console.log('  SET motorcycleType: "" (empty)');

    await db.collection('users').doc(arnarDoc.id).update({
        ...arnarUpdates,
        ...arnarDeletes
    });
    console.log('  ✓ Arnar updated\n');

    // ── Árni updates (club member completion) ──
    console.log('ÁRNI — adding missing member fields:');
    const arniUpdates = {};

    if (!arniDoc.data.displayName) {
        arniUpdates.displayName = 'Árni';
        console.log('  SET displayName: "Árni"');
    }

    if (!arniDoc.data.chapter) {
        arniUpdates.chapter = 'Reykjavik';
        console.log('  SET chapter: "Reykjavik"');
    }

    if (!arniDoc.data.memberRole) {
        arniUpdates.memberRole = 'Meðlimur';
        console.log('  SET memberRole: "Meðlimur"');
    }

    if (!arniDoc.data.members) {
        arniUpdates.members = true;
        console.log('  SET members: true');
    }

    if (!arniDoc.data.motorcycleType && arniDoc.data.motorcycleType !== '') {
        arniUpdates.motorcycleType = '';
        console.log('  SET motorcycleType: "" (empty for now)');
    }

    if (Object.keys(arniUpdates).length > 0) {
        arniUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(arniDoc.id).update(arniUpdates);
        console.log(`  ✓ Árni updated (${Object.keys(arniUpdates).length - 1} fields)\n`);
    } else {
        console.log('  No updates needed.\n');
    }

    console.log('Done! Run "node scripts/compare-profiles.js" to verify.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
