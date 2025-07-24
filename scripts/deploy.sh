#!/bin/bash

# Sleipnir MC Backend Deployment Script
# This script deploys Cloud Functions and Security Rules

echo "🚀 Starting Sleipnir MC Backend Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 successful${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Firebase CLI is not installed. Please install it with: npm install -g firebase-tools${NC}"
    exit 1
fi

# Check if user is logged in to Firebase
echo "Checking Firebase authentication..."
firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Not logged in to Firebase. Running firebase login...${NC}"
    firebase login
    check_status "Firebase login"
fi

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}firebase.json not found. Please run firebase init first.${NC}"
    exit 1
fi

# Deploy Functions
echo -e "\n${YELLOW}📦 Installing function dependencies...${NC}"
cd functions
npm install
check_status "Function dependencies installation"
cd ..

echo -e "\n${YELLOW}🔧 Deploying Cloud Functions...${NC}"
firebase deploy --only functions
check_status "Functions deployment"

# Deploy Firestore Rules
echo -e "\n${YELLOW}🛡️ Deploying Firestore Security Rules...${NC}"
firebase deploy --only firestore:rules
check_status "Firestore rules deployment"

# Deploy Firestore Indexes if they exist
if [ -f "firestore.indexes.json" ]; then
    echo -e "\n${YELLOW}📑 Deploying Firestore Indexes...${NC}"
    firebase deploy --only firestore:indexes
    check_status "Firestore indexes deployment"
fi

echo -e "\n${GREEN}✨ Deployment complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Run './scripts/setup-admin.js' to create initial admin user"
echo "2. Test functions with './scripts/test-functions.sh'"
echo "3. Check deployment status in Firebase Console"

# List deployed functions
echo -e "\n${YELLOW}Deployed functions:${NC}"
firebase functions:list