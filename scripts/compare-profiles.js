/**
 * Read-only script to compare Arnar's and Árni's Firestore profiles.
 * Usage: node scripts/compare-profiles.js
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

function formatValue(value) {
    if (value === undefined) return '(missing)';
    if (value === null) return 'null';
    if (value && typeof value === 'object' && value._seconds !== undefined) {
        return new Date(value._seconds * 1000).toISOString();
    }
    return JSON.stringify(value);
}

async function main() {
    const ARNAR_EMAIL = 'arnarfreyre@gmail.com';
    const ARNI_EMAIL = 'arni76@simnet.is';

    console.log('Fetching all users...\n');
    const usersSnapshot = await db.collection('users').get();

    let arnarDoc = null;
    let arniDoc = null;

    for (const doc of usersSnapshot.docs) {
        const data = doc.data();
        const email = (data.email || '').toLowerCase();
        if (email === ARNAR_EMAIL) arnarDoc = { id: doc.id, data };
        if (email === ARNI_EMAIL) arniDoc = { id: doc.id, data };
    }

    if (!arnarDoc) console.error(`Arnar (${ARNAR_EMAIL}) NOT FOUND`);
    if (!arniDoc) console.error(`Árni (${ARNI_EMAIL}) NOT FOUND`);

    if (!arnarDoc || !arniDoc) {
        console.log('\nAll users in collection:');
        usersSnapshot.docs.forEach(doc => {
            const d = doc.data();
            console.log(`  [${doc.id}] ${d.displayName || d.name || '(no name)'} — ${d.email || '(no email)'} — role: ${d.role || '(none)'}`);
        });
        process.exit(1);
    }

    // Collect all unique field names
    const allFields = [...new Set([
        ...Object.keys(arnarDoc.data),
        ...Object.keys(arniDoc.data)
    ])].sort();

    // Print both profiles
    console.log('='.repeat(80));
    console.log('ARNAR (web designer)');
    console.log(`  Document ID: ${arnarDoc.id}`);
    console.log(`  Email: ${ARNAR_EMAIL}`);
    console.log('-'.repeat(80));
    for (const field of allFields) {
        console.log(`  ${field.padEnd(25)} ${formatValue(arnarDoc.data[field])}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('ÁRNI (club member)');
    console.log(`  Document ID: ${arniDoc.id}`);
    console.log(`  Email: ${ARNI_EMAIL}`);
    console.log('-'.repeat(80));
    for (const field of allFields) {
        console.log(`  ${field.padEnd(25)} ${formatValue(arniDoc.data[field])}`);
    }

    // Show differences
    console.log('\n' + '='.repeat(80));
    console.log('FIELD DIFFERENCES');
    console.log('-'.repeat(80));
    console.log(`${'Field'.padEnd(25)} ${'Arnar'.padEnd(35)} Árni`);
    console.log('-'.repeat(80));

    let diffCount = 0;
    for (const field of allFields) {
        const arnarVal = formatValue(arnarDoc.data[field]);
        const arniVal = formatValue(arniDoc.data[field]);
        if (arnarVal !== arniVal) {
            diffCount++;
            console.log(`${field.padEnd(25)} ${arnarVal.padEnd(35)} ${arniVal}`);
        }
    }

    if (diffCount === 0) {
        console.log('  (no differences)');
    } else {
        console.log(`\n${diffCount} field(s) differ.`);
    }

    // Fields Árni is missing that Arnar has
    const arniMissing = allFields.filter(f => arniDoc.data[f] === undefined && arnarDoc.data[f] !== undefined);
    if (arniMissing.length > 0) {
        console.log(`\nFields Árni is MISSING that Arnar has: ${arniMissing.join(', ')}`);
    }

    const arnarMissing = allFields.filter(f => arnarDoc.data[f] === undefined && arniDoc.data[f] !== undefined);
    if (arnarMissing.length > 0) {
        console.log(`Fields Arnar is MISSING that Árni has: ${arnarMissing.join(', ')}`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
