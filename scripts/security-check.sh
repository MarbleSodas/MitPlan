#!/bin/bash

# MitPlan Security Check Script
# This script helps verify that no sensitive data is present in the repository

echo "🔍 MitPlan Security Check"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Run this script from the MitPlan root directory${NC}"
    exit 1
fi

echo "📁 Checking for sensitive files..."

# Check for .env files that shouldn't be committed
SENSITIVE_FILES=()
if [ -f ".env" ]; then
    SENSITIVE_FILES+=(".env")
fi
if [ -f ".env.local" ]; then
    SENSITIVE_FILES+=(".env.local")
fi
if [ -f ".env.production" ]; then
    SENSITIVE_FILES+=(".env.production")
fi
if [ -f "src/.env" ]; then
    SENSITIVE_FILES+=("src/.env")
fi

if [ ${#SENSITIVE_FILES[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found sensitive files that should not be committed:${NC}"
    for file in "${SENSITIVE_FILES[@]}"; do
        echo "   - $file"
    done
    echo -e "${YELLOW}   Make sure these are in .gitignore and not committed!${NC}"
else
    echo -e "${GREEN}✅ No sensitive environment files found in working directory${NC}"
fi

echo ""
echo "🔍 Scanning source code for potential secrets..."

# Search for potential API keys or secrets in source code
POTENTIAL_SECRETS=$(grep -r -i --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
    -E "(api[_-]?key|secret|token|password|credential)" src/ | \
    grep -v "// " | \
    grep -v "* " | \
    grep -v "console.log" | \
    grep -v "placeholder" | \
    grep -v "example" | \
    grep -v "your_" | \
    grep -v "YOUR_" | \
    head -10)

if [ -n "$POTENTIAL_SECRETS" ]; then
    echo -e "${YELLOW}⚠️  Found potential secrets in source code:${NC}"
    echo "$POTENTIAL_SECRETS"
    echo -e "${YELLOW}   Please review these findings manually${NC}"
else
    echo -e "${GREEN}✅ No obvious secrets found in source code${NC}"
fi

echo ""
echo "🔍 Checking Firebase configuration..."

# Check if Firebase config uses environment variables
if grep -q "import.meta.env" src/config/firebase.js; then
    echo -e "${GREEN}✅ Firebase configuration uses environment variables${NC}"
else
    echo -e "${RED}❌ Firebase configuration may contain hardcoded values${NC}"
fi

echo ""
echo "📋 Checking .gitignore rules..."

# Check if important patterns are in .gitignore
REQUIRED_PATTERNS=(".env" "*.local" "node_modules" "dist")
MISSING_PATTERNS=()

for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -q "$pattern" .gitignore; then
        MISSING_PATTERNS+=("$pattern")
    fi
done

if [ ${#MISSING_PATTERNS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing important .gitignore patterns:${NC}"
    for pattern in "${MISSING_PATTERNS[@]}"; do
        echo "   - $pattern"
    done
else
    echo -e "${GREEN}✅ Important .gitignore patterns are present${NC}"
fi

echo ""
echo "🔍 Checking for committed sensitive files in git history..."

# Check if sensitive files were ever committed
COMMITTED_SENSITIVE=$(git log --name-only --pretty=format: | grep -E "\.(env|key|secret|credential)$" | sort | uniq)

if [ -n "$COMMITTED_SENSITIVE" ]; then
    echo -e "${RED}❌ Found sensitive files in git history:${NC}"
    echo "$COMMITTED_SENSITIVE"
    echo -e "${RED}   Consider cleaning git history with BFG Repo-Cleaner${NC}"
else
    echo -e "${GREEN}✅ No obvious sensitive files found in git history${NC}"
fi

echo ""
echo "📋 Security Checklist:"
echo "======================"

# Environment setup check
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✅ .env.example template exists${NC}"
else
    echo -e "${RED}❌ .env.example template missing${NC}"
fi

# Security documentation check
if [ -f "docs/SECURITY.md" ]; then
    echo -e "${GREEN}✅ Security documentation exists${NC}"
else
    echo -e "${RED}❌ Security documentation missing${NC}"
fi

# Firebase example config check
if [ -f "src/config/firebase.example.js" ]; then
    echo -e "${GREEN}✅ Firebase configuration example exists${NC}"
else
    echo -e "${RED}❌ Firebase configuration example missing${NC}"
fi

echo ""
echo "🎯 Recommendations:"
echo "==================="
echo "1. Ensure all team members have proper .env.local files"
echo "2. Regularly rotate API keys and credentials"
echo "3. Monitor Firebase console for unusual activity"
echo "4. Review security rules quarterly"
echo "5. Keep dependencies updated"

echo ""
echo "📚 For more information, see docs/SECURITY.md"
echo ""

# Exit with error code if any issues found
if [ ${#SENSITIVE_FILES[@]} -gt 0 ] || [ -n "$COMMITTED_SENSITIVE" ]; then
    echo -e "${RED}🚨 Security issues found! Please address them before proceeding.${NC}"
    exit 1
else
    echo -e "${GREEN}🎉 Security check passed!${NC}"
    exit 0
fi
