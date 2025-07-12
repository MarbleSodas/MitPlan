# MitPlan Development Setup Guide

## Overview
This guide provides step-by-step instructions for setting up a complete development environment for MitPlan. Follow these instructions to get the application running locally with all features enabled.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Bun**: Latest version (recommended package manager)
- **Git**: For version control
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Code Editor**: VS Code recommended with extensions

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "styled-components.vscode-styled-components",
    "ms-vscode.vscode-json"
  ]
}
```

## Installation Steps

### 1. Clone the Repository
```bash
# Clone the repository
git clone https://github.com/MarbleSodas/MitPlan.git

# Navigate to project directory
cd MitPlan

# Check current branch
git branch
```

### 2. Install Bun (if not already installed)
```bash
# Install Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Install Bun (Windows)
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify installation
bun --version
```

### 3. Install Dependencies
```bash
# Install all project dependencies
bun install

# Verify installation
bun run --help
```

## Firebase Configuration

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "mitplan-dev")
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Firebase Services
```bash
# In Firebase Console, enable these services:
# 1. Authentication
#    - Go to Authentication > Sign-in method
#    - Enable Email/Password
#    - Enable Anonymous authentication

# 2. Realtime Database
#    - Go to Realtime Database
#    - Create database in test mode
#    - Choose location (us-central1 recommended)

# 3. Analytics (optional)
#    - Already enabled if selected during project creation
```

### 3. Get Firebase Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" > Web app icon
4. Register app with nickname (e.g., "mitplan-web")
5. Copy the configuration object

### 4. Environment Variables Setup
```bash
# Create environment file
touch .env.local

# Add Firebase configuration to .env.local
cat > .env.local << EOF
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com/
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
EOF
```

### 5. Firebase Security Rules
```javascript
// Set up Realtime Database rules
// Go to Realtime Database > Rules tab
{
  "rules": {
    "plans": {
      "$planId": {
        ".read": true,
        ".write": "auth != null || auth.uid == 'anonymous'",
        "collaboration": {
          "activeUsers": {
            "$sessionId": {
              ".write": "$sessionId == auth.uid || auth.uid == 'anonymous'"
            }
          }
        }
      }
    }
  }
}
```

## Development Server Setup

### 1. Start Development Server
```bash
# Start the development server
bun run dev

# Server will start on http://localhost:5173
# Open browser and navigate to the URL
```

### 2. Verify Setup
Check that the following features work:
- [ ] Application loads without errors
- [ ] Theme toggle works (light/dark mode)
- [ ] Job selection interface appears
- [ ] Boss selection works
- [ ] Firebase connection established (check browser console)

### 3. Test Firebase Integration
```bash
# Test authentication
# 1. Try creating an account
# 2. Try anonymous mode
# 3. Check Firebase Console > Authentication > Users

# Test database
# 1. Create a plan
# 2. Check Firebase Console > Realtime Database
# 3. Verify data appears in database
```

## Testing Setup

### 1. Run Tests
```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

### 2. Test Configuration
The project uses Vitest for testing. Configuration is in `vite.config.js`:
```javascript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    globals: true
  }
})
```

## Build and Deployment

### 1. Production Build
```bash
# Build for production
bun run build

# Preview production build locally
bun run preview
```

### 2. Build Verification
```bash
# Check build output
ls -la dist/

# Verify build size
du -sh dist/

# Test production build
bun run preview
```

### 3. Deployment to Vercel
```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy to Vercel
vercel

# Follow prompts to link project
```

## Development Workflow

### 1. Daily Development
```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
bun install

# Start development server
bun run dev

# Make changes and test
# Commit changes
git add .
git commit -m "feat: description of changes"
git push origin feature-branch
```

### 2. Code Quality Checks
```bash
# Run linting
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format

# Type checking (if TypeScript)
bun run type-check
```

## Environment-Specific Configuration

### Development Environment
```bash
# .env.local (development)
VITE_FIREBASE_API_KEY=dev_api_key
VITE_FIREBASE_PROJECT_ID=mitplan-dev
# ... other dev config
```

### Production Environment
```bash
# Environment variables in Vercel dashboard
VITE_FIREBASE_API_KEY=prod_api_key
VITE_FIREBASE_PROJECT_ID=mitplan-prod
# ... other prod config
```

## Debugging Setup

### 1. Browser DevTools
```javascript
// Enable debug logging in development
localStorage.setItem('debug', 'mitplan:*');

// Check Firebase connection
console.log('Firebase config:', import.meta.env);
```

### 2. VS Code Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "request": "launch",
      "type": "chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### 3. Network Debugging
```bash
# Monitor Firebase operations
# Open browser DevTools > Network tab
# Filter by "firebase" to see all Firebase requests
```

## Common Commands Reference

```bash
# Package management
bun install                 # Install dependencies
bun add <package>          # Add new dependency
bun remove <package>       # Remove dependency
bun update                 # Update all dependencies

# Development
bun run dev                # Start development server
bun run build              # Build for production
bun run preview            # Preview production build
bun run test               # Run tests
bun run lint               # Run linting
bun run format             # Format code

# Git workflow
git checkout -b feature/new-feature  # Create feature branch
git add .                           # Stage changes
git commit -m "feat: description"   # Commit changes
git push origin feature/new-feature # Push to remote
```

## Next Steps

After completing the setup:
1. Read the [Architecture Overview](./03-architecture-overview.md) to understand the codebase
2. Review the [Technical Implementation](./02-technical-implementation.md) for development details
3. Check the [Contributing Guide](./08-contributing.md) for development standards
4. Refer to the [Troubleshooting Guide](./07-troubleshooting.md) if you encounter issues

## Verification Checklist

- [ ] Repository cloned successfully
- [ ] Bun installed and working
- [ ] Dependencies installed without errors
- [ ] Firebase project created and configured
- [ ] Environment variables set correctly
- [ ] Development server starts without errors
- [ ] Application loads in browser
- [ ] Firebase connection working
- [ ] Tests pass
- [ ] Build process works
- [ ] Code quality tools configured

If all items are checked, your development environment is ready!
