#!/bin/bash

# Sleipnir MC Functions Test Script
# Tests deployed Cloud Functions

echo "🧪 Testing Sleipnir MC Cloud Functions..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project ID
PROJECT_ID=$(firebase use | grep -oP '(?<=Active Project: )\S+')

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}No active Firebase project. Run 'firebase use <project-id>' first.${NC}"
    exit 1
fi

echo -e "${BLUE}Testing functions for project: ${PROJECT_ID}${NC}\n"

# Function to test a cloud function
test_function() {
    local FUNCTION_NAME=$1
    local DATA=$2
    local DESCRIPTION=$3
    
    echo -e "${YELLOW}Testing: ${DESCRIPTION}${NC}"
    echo "Function: ${FUNCTION_NAME}"
    echo "Data: ${DATA}"
    
    # Test with emulator if running, otherwise test deployed function
    if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
        URL="http://localhost:5001/${PROJECT_ID}/us-central1/${FUNCTION_NAME}"
        echo "Using emulator URL: ${URL}"
    else
        URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}"
        echo "Using production URL: ${URL}"
    fi
    
    # Make the request
    RESPONSE=$(curl -s -X POST "${URL}" \
        -H "Content-Type: application/json" \
        -d "${DATA}" 2>&1)
    
    echo "Response: ${RESPONSE}"
    
    # Check if response contains error
    if [[ $RESPONSE == *"error"* ]] || [[ $RESPONSE == *"Error"* ]]; then
        echo -e "${RED}✗ Test failed${NC}\n"
    else
        echo -e "${GREEN}✓ Test passed${NC}\n"
    fi
}

# Test 1: Validate Admin Action (should fail without auth)
test_function "validateAdminAction" \
    '{"data":{"action":"test_action"}}' \
    "Validate Admin Action (no auth - should fail)"

# Test 2: Test Email Verification (should fail without auth)
test_function "testEmailVerification" \
    '{"data":{}}' \
    "Test Email Verification (no auth - should fail)"

# Check if emulator is running
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✓ Emulator is running${NC}"
    echo -e "${YELLOW}For authenticated tests, use the Firebase Emulator UI${NC}"
    echo -e "${BLUE}Emulator UI: http://localhost:4000${NC}"
else
    echo -e "${YELLOW}ℹ Firebase emulator is not running${NC}"
    echo "To test with emulator: firebase emulators:start"
fi

echo -e "\n${BLUE}Additional Testing Steps:${NC}"
echo "1. Start emulator: firebase emulators:start"
echo "2. Create test users in Auth emulator"
echo "3. Set admin claims using setup-admin.js"
echo "4. Test from your frontend application"

# List all deployed functions
echo -e "\n${BLUE}Deployed Functions:${NC}"
firebase functions:list

echo -e "\n${GREEN}Basic connectivity tests complete!${NC}"
echo -e "${YELLOW}Note: Full testing requires authentication and should be done through the frontend or emulator UI${NC}"