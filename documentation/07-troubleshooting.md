# MitPlan Troubleshooting Guide

## Overview
This guide covers common issues encountered during MitPlan development and their solutions. Issues are organized by category with step-by-step resolution instructions.

## Development Environment Issues

### Bun Installation Problems

#### Issue: Bun command not found
```bash
# Error: bun: command not found
```

**Solution:**
```bash
# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc

# Add Bun to PATH manually
export PATH="$HOME/.bun/bin:$PATH"

# Verify installation
which bun
bun --version
```

#### Issue: Permission denied during Bun installation
```bash
# Error: Permission denied
```

**Solution:**
```bash
# Install without sudo (recommended)
curl -fsSL https://bun.sh/install | bash

# If still having issues, check directory permissions
ls -la ~/.bun/
chmod +x ~/.bun/bin/bun
```

### Dependency Installation Issues

#### Issue: Package installation fails
```bash
# Error: Failed to install dependencies
```

**Solution:**
```bash
# Clear Bun cache
bun pm cache rm

# Remove node_modules and lock file
rm -rf node_modules bun.lockb

# Reinstall dependencies
bun install

# If still failing, try with npm as fallback
npm install
```

#### Issue: Version conflicts
```bash
# Error: Conflicting peer dependencies
```

**Solution:**
```bash
# Check for conflicting versions
bun outdated

# Update specific packages
bun update <package-name>

# Force resolution (use carefully)
bun install --force
```

## Firebase Configuration Issues

### Authentication Problems

#### Issue: Firebase Auth not working
```bash
# Error: Firebase Auth is not initialized
```

**Solution:**
```bash
# Check environment variables
echo $VITE_FIREBASE_API_KEY
echo $VITE_FIREBASE_AUTH_DOMAIN

# Verify .env.local file exists and has correct format
cat .env.local

# Restart development server
bun run dev
```

#### Issue: Anonymous authentication fails
```bash
# Error: Anonymous sign-in is disabled
```

**Solution:**
1. Go to Firebase Console > Authentication > Sign-in method
2. Enable "Anonymous" provider
3. Save changes
4. Clear browser cache and retry

#### Issue: Email/Password authentication not working
```bash
# Error: Email/password sign-in is disabled
```

**Solution:**
1. Go to Firebase Console > Authentication > Sign-in method
2. Enable "Email/Password" provider
3. Optionally enable "Email link (passwordless sign-in)"
4. Save changes

### Database Connection Issues

#### Issue: Realtime Database connection fails
```bash
# Error: Permission denied
```

**Solution:**
```bash
# Check database rules in Firebase Console
# Go to Realtime Database > Rules
# Ensure rules allow read/write access:
{
  "rules": {
    "plans": {
      "$planId": {
        ".read": true,
        ".write": "auth != null || auth.uid == 'anonymous'"
      }
    }
  }
}
```

#### Issue: Database URL incorrect
```bash
# Error: Invalid database URL
```

**Solution:**
```bash
# Check database URL format in .env.local
# Should be: https://PROJECT_ID-default-rtdb.REGION.firebasedatabase.app/
# Example: https://mitplan-dev-default-rtdb.us-central1.firebasedatabase.app/

# Verify in Firebase Console > Project Settings > General
```

### Real-time Collaboration Issues

#### Issue: Real-time updates not working
```bash
# Error: Changes not syncing between users
```

**Solution:**
```bash
# Check browser console for WebSocket errors
# Open DevTools > Console

# Verify Firebase connection
console.log('Firebase database:', database);

# Check network connectivity
# DevTools > Network > WS (WebSocket) tab

# Clear browser cache and localStorage
localStorage.clear();
location.reload();
```

#### Issue: Session management problems
```bash
# Error: User sessions not cleaning up
```

**Solution:**
```bash
# Check session cleanup in Firebase Console
# Go to Realtime Database > Data > plans > [planId] > collaboration > activeUsers

# Manual cleanup (development only)
# Delete stale sessions from Firebase Console

# Restart development server
bun run dev
```

## Build and Deployment Issues

### Build Failures

#### Issue: Build process fails
```bash
# Error: Build failed with errors
```

**Solution:**
```bash
# Check for TypeScript errors
bun run type-check

# Check for linting errors
bun run lint

# Clear build cache
rm -rf dist/
rm -rf node_modules/.vite/

# Rebuild
bun run build
```

#### Issue: Environment variables not available in build
```bash
# Error: import.meta.env.VITE_* is undefined
```

**Solution:**
```bash
# Ensure environment variables start with VITE_
# Check .env.local file format:
VITE_FIREBASE_API_KEY=your_key_here

# For production, set variables in Vercel dashboard
# Project Settings > Environment Variables
```

### Deployment Issues

#### Issue: Vercel deployment fails
```bash
# Error: Build failed on Vercel
```

**Solution:**
```bash
# Check build logs in Vercel dashboard
# Common issues:
# 1. Missing environment variables
# 2. Build command incorrect
# 3. Node.js version mismatch

# Set correct build settings in vercel.json:
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "installCommand": "bun install"
}
```

#### Issue: Firebase configuration in production
```bash
# Error: Firebase not working in production
```

**Solution:**
```bash
# Set environment variables in Vercel:
# 1. Go to Project Settings > Environment Variables
# 2. Add all VITE_FIREBASE_* variables
# 3. Set for Production environment
# 4. Redeploy
```

## Performance Issues

### Slow Loading

#### Issue: Application loads slowly
```bash
# Symptoms: Long initial load times
```

**Solution:**
```bash
# Check bundle size
bun run build
du -sh dist/

# Analyze bundle
bun add -D rollup-plugin-visualizer
# Add to vite.config.js and rebuild

# Optimize images
# Compress images in public/ directory
# Use WebP format where possible

# Enable code splitting
# Check for dynamic imports in components
```

#### Issue: Firebase operations slow
```bash
# Symptoms: Slow database reads/writes
```

**Solution:**
```bash
# Check Firebase usage in console
# Go to Firebase Console > Usage

# Optimize database structure
# Minimize nested data
# Use appropriate indexing

# Implement caching
# Check cooldown cache implementation
# Use React.memo for expensive components
```

### Memory Issues

#### Issue: Memory leaks in development
```bash
# Symptoms: Browser becomes slow over time
```

**Solution:**
```bash
# Check for memory leaks
# DevTools > Memory tab > Take heap snapshot

# Common causes:
# 1. Event listeners not cleaned up
# 2. Firebase listeners not unsubscribed
# 3. Timers not cleared

# Check useEffect cleanup:
useEffect(() => {
  const unsubscribe = onValue(ref, callback);
  return () => unsubscribe();
}, []);
```

## Browser Compatibility Issues

### Cross-Browser Problems

#### Issue: Features not working in Safari
```bash
# Symptoms: Drag and drop not working
```

**Solution:**
```bash
# Check for Safari-specific issues
# Test in Safari Technology Preview

# Common fixes:
# 1. Add webkit prefixes for CSS
# 2. Use polyfills for missing features
# 3. Test touch events on mobile Safari
```

#### Issue: Internet Explorer compatibility
```bash
# Note: IE is not officially supported
```

**Solution:**
```bash
# Recommend modern browser
# Add browser detection and warning
# Consider polyfills only if absolutely necessary
```

## Debugging Techniques

### Console Debugging

#### Enable Debug Logging
```javascript
// In browser console
localStorage.setItem('debug', 'mitplan:*');

// Check specific modules
localStorage.setItem('debug', 'mitplan:collaboration');
localStorage.setItem('debug', 'mitplan:cooldown');
```

#### Firebase Debugging
```javascript
// Check Firebase connection
console.log('Firebase app:', app);
console.log('Firebase auth:', auth);
console.log('Firebase database:', database);

// Monitor auth state
onAuthStateChanged(auth, (user) => {
  console.log('Auth state changed:', user);
});
```

### Network Debugging

#### Monitor Firebase Requests
```bash
# Open DevTools > Network tab
# Filter by "firebase" or "googleapis"
# Check for failed requests or slow responses
```

#### WebSocket Debugging
```bash
# Open DevTools > Network > WS tab
# Monitor WebSocket connections for real-time features
# Check for connection drops or errors
```

### Performance Debugging

#### React DevTools
```bash
# Install React DevTools browser extension
# Use Profiler tab to identify slow components
# Check for unnecessary re-renders
```

#### Lighthouse Audit
```bash
# Open DevTools > Lighthouse tab
# Run performance audit
# Follow recommendations for optimization
```

## Getting Help

### Internal Resources
1. Check [Technical Implementation](./02-technical-implementation.md) for code details
2. Review [Architecture Overview](./03-architecture-overview.md) for system design
3. Consult [Database Schema](./05-database-schema.md) for data issues

### External Resources
- **Firebase Documentation**: https://firebase.google.com/docs
- **React Documentation**: https://react.dev
- **Vite Documentation**: https://vitejs.dev
- **Bun Documentation**: https://bun.sh/docs

### Community Support
- **Discord**: Use in-app Discord button for community help
- **GitHub Issues**: Report bugs and request features
- **Stack Overflow**: Search for similar issues

### Creating Bug Reports
When reporting issues, include:
1. **Environment**: OS, browser, Node.js version
2. **Steps to reproduce**: Detailed reproduction steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Console errors**: Any error messages
6. **Screenshots**: Visual issues
7. **Code samples**: Relevant code snippets

This troubleshooting guide should help resolve most common issues. If you encounter a problem not covered here, consider adding it to help future developers.
