#!/bin/bash

# Sleipnir MC Homepage - Setup Script
# ===================================
# This script installs all required dependencies for the project

echo "🏍️  Sleipnir MC Homepage Setup Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

# Check for required tools
echo "Checking system requirements..."
echo ""

# Check for Git
if command_exists git; then
    echo -e "${GREEN}✓${NC} Git is installed ($(git --version))"
else
    echo -e "${RED}✗${NC} Git is not installed"
    echo -e "${YELLOW}Please install Git from: https://git-scm.com/${NC}"
fi

# Check for Python 3
if command_exists python3; then
    echo -e "${GREEN}✓${NC} Python 3 is installed ($(python3 --version))"
else
    echo -e "${RED}✗${NC} Python 3 is not installed"
    echo -e "${YELLOW}Please install Python 3 from: https://www.python.org/${NC}"
fi

# Check for Node.js
if command_exists node; then
    echo -e "${GREEN}✓${NC} Node.js is installed ($(node --version))"
else
    echo -e "${RED}✗${NC} Node.js is not installed"
    echo ""
    echo "Installing Node.js via NVM..."
    
    # Check if NVM is installed
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        # Load NVM
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # Install Node.js using .nvmrc
        if [ -f ".nvmrc" ]; then
            nvm install
            nvm use
            print_status "Node.js installed via NVM"
        else
            echo -e "${YELLOW}No .nvmrc file found. Installing latest LTS...${NC}"
            nvm install --lts
            nvm use --lts
            print_status "Node.js LTS installed via NVM"
        fi
    else
        echo -e "${YELLOW}NVM not found. Installing NVM...${NC}"
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        
        # Load NVM
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # Install Node.js
        nvm install --lts
        nvm use --lts
        print_status "NVM and Node.js installed"
    fi
fi

echo ""
echo "Installing project dependencies..."
echo ""

# Install npm dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "Installing npm packages..."
    npm install
    print_status "npm packages installed"
else
    echo -e "${YELLOW}No package.json found in current directory${NC}"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file for Firebase configuration..."
    cat > .env.example << 'EOF'
# Firebase Configuration
# Copy this file to .env and fill in your Firebase project details
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
EOF
    echo -e "${GREEN}✓${NC} Created .env.example file"
    echo -e "${YELLOW}Note: Copy .env.example to .env and add your Firebase credentials${NC}"
fi

# Set up Git hooks (optional)
if [ -d ".git" ]; then
    echo ""
    echo "Setting up Git hooks..."
    mkdir -p .git/hooks
    
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook to check for common issues

# Check for console.log statements
if git diff --cached --name-only | grep -E '\.(js|jsx)$' | xargs grep -E 'console\.(log|debug|info)' > /dev/null; then
    echo "Warning: console.log statements found in staged files"
    echo "Consider removing them before committing"
fi

# Check for TODO comments
if git diff --cached --name-only | grep -E '\.(js|jsx|html|css)$' | xargs grep -i 'TODO' > /dev/null; then
    echo "Info: TODO comments found in staged files"
fi
EOF
    chmod +x .git/hooks/pre-commit
    echo -e "${GREEN}✓${NC} Git hooks configured"
fi

echo ""
echo "Setup complete! 🎉"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and add your Firebase credentials"
echo "2. Run 'npm start' or 'python3 -m http.server 8000' to start the development server"
echo "3. Open http://localhost:8000 in your browser"
echo ""
echo "Available commands:"
echo "  npm start     - Start development server"
echo "  npm install   - Install dependencies"
echo "  npm test      - Run tests (when configured)"
echo ""
echo "Happy coding! 🏍️"