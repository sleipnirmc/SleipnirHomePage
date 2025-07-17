#!/bin/bash

echo "🚀 Deploying Sleipnir MC Shop to Firebase..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI is not installed."
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Firebase."
    echo "Please run: firebase login"
    exit 1
fi

# Use the Firebase project
echo "📦 Using Firebase project: sleipnirmcshop"
firebase use sleipnirmcshop

# Deploy Firestore rules
echo ""
echo "📋 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# Deploy hosting
echo ""
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Your site should be available at:"
echo "   https://sleipnirmcshop.web.app"
echo "   https://sleipnirmcshop.firebaseapp.com"
echo ""
echo "📱 Admin panel: https://sleipnirmcshop.web.app/admin.html"
echo "🛒 Shop: https://sleipnirmcshop.web.app/shop.html"
echo ""
echo "⚠️  Remember to:"
echo "   1. Test all features on the live site"
echo "   2. Ensure admin authentication works"
echo "   3. Check that orders are being saved correctly"