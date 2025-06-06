# Security Documentation

## 🚨 Security Incident Report

**Date**: June 5, 2025  
**Severity**: HIGH  
**Status**: RESOLVED

### Issue Identified
Firebase configuration with sensitive API keys was hardcoded in `src/config/firebase.js` and committed to the git repository since June 3, 2025.

### Sensitive Data Exposed
- Firebase API Key: `AIzaSyBSfsBbrunA3aejnWlsMe0z1NiwJUvRNPU`
- Firebase Project ID: `xivmit`
- Firebase App ID: `1:1056456049686:web:a269ab0a6d59da09462137`
- Firebase Measurement ID: `G-834J53ZVFF`
- Email credentials in `.env` files

### Actions Taken

#### 1. Immediate Security Measures
- ✅ Enhanced `.gitignore` with comprehensive security rules
- ✅ Moved Firebase configuration to environment variables
- ✅ Created secure configuration templates
- ✅ Removed sensitive files from working directory
- ✅ Committed security improvements

#### 2. Required Actions (URGENT)
- 🔄 **REGENERATE ALL EXPOSED CREDENTIALS**
- 🔄 **Rotate Firebase API keys**
- 🔄 **Update production environment variables**
- 🔄 **Clean git history (if repository is public)**

## 🔐 Secure Configuration Setup

### Environment Variables Required

Create `.env.local` file with your actual Firebase configuration:

```bash
# Copy from .env.example and fill in your values
cp .env.example .env.local
```

Required variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### Firebase Security Configuration

1. **Regenerate API Keys**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to Project Settings > General
   - Delete the exposed web app configuration
   - Create a new web app with fresh credentials

2. **Update Security Rules**:
   - Review and update Firestore security rules
   - Review and update Realtime Database rules
   - Review and update Storage security rules

3. **Enable Security Features**:
   - Enable App Check for additional security
   - Configure CORS settings appropriately
   - Set up proper authentication rules

## 🛡️ Security Best Practices

### Development
- ✅ Never commit `.env` files
- ✅ Use environment variables for all sensitive data
- ✅ Use `.env.example` templates for documentation
- ✅ Regularly audit dependencies for vulnerabilities
- ✅ Use HTTPS in production

### Production
- ✅ Use separate Firebase projects for dev/staging/production
- ✅ Implement proper CORS policies
- ✅ Enable Firebase App Check
- ✅ Monitor Firebase usage and security events
- ✅ Implement rate limiting
- ✅ Use Firebase Security Rules effectively

### Git Repository
- ✅ Comprehensive `.gitignore` rules
- ✅ Regular security audits
- ✅ No sensitive data in commit messages
- ✅ Use signed commits for critical changes

## 🔍 Security Monitoring

### Firebase Console Monitoring
- Monitor authentication events
- Review database access patterns
- Check for unusual API usage
- Monitor storage access

### Application Monitoring
- Implement error tracking (Sentry)
- Monitor API response times
- Track authentication failures
- Log security-relevant events

## 🚨 Incident Response Plan

### If Credentials Are Compromised
1. **Immediate**: Rotate all affected credentials
2. **Immediate**: Review access logs for unauthorized usage
3. **Within 24h**: Audit all related systems
4. **Within 48h**: Implement additional security measures
5. **Within 1 week**: Complete security review

### If Repository Is Public
1. **Immediate**: Make repository private if possible
2. **Immediate**: Clean git history using BFG Repo-Cleaner
3. **Immediate**: Force push cleaned history
4. **Immediate**: Notify all contributors
5. **Within 24h**: Regenerate all exposed credentials

## 🔧 Git History Cleanup (If Needed)

If the repository is public or shared, clean the git history:

### Using BFG Repo-Cleaner (Recommended)
```bash
# Install BFG Repo-Cleaner
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Create a fresh clone
git clone --mirror https://github.com/MarbleSodas/MitPlan.git

# Remove sensitive data
bfg --delete-files firebase.js MitPlan.git
bfg --replace-text passwords.txt MitPlan.git

# Clean up and push
cd MitPlan.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### Using git filter-branch (Alternative)
```bash
# Remove specific file from all commits
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch src/config/firebase.js' \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote
git push --force --all
git push --force --tags
```

## 📋 Security Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] No sensitive data in source code
- [ ] Security rules tested
- [ ] HTTPS enabled
- [ ] CORS properly configured

### Post-Deployment
- [ ] Monitor Firebase console for unusual activity
- [ ] Verify authentication flows work correctly
- [ ] Test security rules in production
- [ ] Monitor error rates and performance

### Regular Maintenance
- [ ] Monthly security audit
- [ ] Quarterly credential rotation
- [ ] Annual security review
- [ ] Keep dependencies updated

## 🔗 Resources

- [Firebase Security Documentation](https://firebase.google.com/docs/rules)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Git Security Best Practices](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work)

---

**Last Updated**: June 5, 2025  
**Next Review**: July 5, 2025  
**Responsible**: Development Team
