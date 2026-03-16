/**
 * One-time migration script: Move address/phone data from `users` to `shippingInfo` collection.
 *
 * Usage:
 *   Run: node scripts/migrate-shipping-info.js
 *
 * This script is idempotent — it checks if a shippingInfo doc already exists before creating one.
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

async function migrate() {
    console.log('Starting shipping info migration...\n');

    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} user documents.\n`);

    let migrated = 0;
    let skipped = 0;
    let noAddress = 0;
    let errors = 0;

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const data = userDoc.data();

        const hasAddress = !!(data.address || data.city || data.postalCode || data.phone);

        if (!hasAddress) {
            // No address data — just set shippingInfoComplete: false if not already set
            if (data.shippingInfoComplete === undefined) {
                try {
                    await db.collection('users').doc(userId).update({
                        shippingInfoComplete: false
                    });
                    console.log(`  [${userId}] Set shippingInfoComplete: false (no address data)`);
                } catch (err) {
                    console.error(`  [${userId}] Error setting shippingInfoComplete:`, err.message);
                    errors++;
                }
            }
            noAddress++;
            continue;
        }

        // Check if shippingInfo doc already exists (idempotent)
        const existingShipping = await db.collection('shippingInfo').doc(userId).get();
        if (existingShipping.exists) {
            console.log(`  [${userId}] shippingInfo already exists — skipping`);
            skipped++;
            continue;
        }

        // Create shippingInfo document
        const shippingData = {
            address: data.address || '',
            city: data.city || '',
            postalCode: data.postalCode || '',
            phone: data.phone || '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Determine if shipping info is "complete" (has at least an address)
        const isComplete = !!(data.address && data.address.trim());

        try {
            const batch = db.batch();

            // Create shippingInfo doc
            batch.set(db.collection('shippingInfo').doc(userId), shippingData);

            // Update user doc: set flag and remove address fields
            batch.update(db.collection('users').doc(userId), {
                shippingInfoComplete: isComplete,
                address: admin.firestore.FieldValue.delete(),
                city: admin.firestore.FieldValue.delete(),
                postalCode: admin.firestore.FieldValue.delete(),
                phone: admin.firestore.FieldValue.delete()
            });

            await batch.commit();

            console.log(`  [${userId}] Migrated (${data.email || 'no email'}) → shippingInfoComplete: ${isComplete}`);
            migrated++;
        } catch (err) {
            console.error(`  [${userId}] Error migrating:`, err.message);
            errors++;
        }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('Migration complete!');
    console.log(`  Migrated:   ${migrated}`);
    console.log(`  Skipped:    ${skipped} (already had shippingInfo)`);
    console.log(`  No address: ${noAddress}`);
    console.log(`  Errors:     ${errors}`);
    console.log('═══════════════════════════════════════');
}

migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
