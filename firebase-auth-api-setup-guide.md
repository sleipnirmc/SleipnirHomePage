# Firebase Authentication API Setup Guide

## Overview
This guide provides comprehensive instructions for enabling all required Google Cloud APIs for Firebase Authentication in your project.

## Required APIs for Firebase Authentication

### Core APIs (Must Enable)
1. **Identity Toolkit API** - Core authentication service
2. **Firebase Authentication API** - Firebase-specific auth features
3. **Cloud Resource Manager API** - Project management capabilities
4. **Firebase Management API** - Firebase project configuration

### Additional APIs (Based on Features Used)
1. **Google Identity for iOS API** - For iOS app authentication
2. **Google Analytics API** - For Firebase Analytics integration
3. **Cloud Functions API** - For auth triggers and custom authentication
4. **Cloud Firestore API** - For storing user data
5. **Firebase Realtime Database API** - Alternative user data storage
6. **Cloud Storage API** - For storing user profile images

## Step-by-Step Instructions

### Method 1: Via Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **gervilausnir**
3. Navigate to **Authentication** in the left sidebar
4. Click **Get Started** if not already initialized
5. Firebase automatically enables required APIs

### Method 2: Via Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: **gervilausnir** (Project ID: gervilausnir)
3. Navigate to **APIs & Services** > **Dashboard**
4. Click **+ ENABLE APIS AND SERVICES**

#### Enable Each API:
1. **Identity Toolkit API**
   - Search for "Identity Toolkit API"
   - Click on the API
   - Click **ENABLE**

2. **Firebase Authentication API**
   - Search for "Firebase Authentication API"
   - Click on the API
   - Click **ENABLE**

3. **Cloud Resource Manager API**
   - Search for "Cloud Resource Manager API"
   - Click on the API
   - Click **ENABLE**

4. **Firebase Management API**
   - Search for "Firebase Management API"
   - Click on the API
   - Click **ENABLE**

### Method 3: Using gcloud CLI
```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Set your project
gcloud config set project gervilausnir

# Enable required APIs
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable firebaseauth.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable firebase.googleapis.com

# Enable additional APIs if needed
gcloud services enable firestore.googleapis.com
gcloud services enable firebasedatabase.googleapis.com
gcloud services enable storage-component.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
```

## Verifying APIs are Enabled

### Via Google Cloud Console
1. Go to **APIs & Services** > **Dashboard**
2. Look for **Enabled APIs** section
3. Verify the following are listed:
   - Identity Toolkit API
   - Firebase Authentication API
   - Cloud Resource Manager API
   - Firebase Management API

### Via gcloud CLI
```bash
# List all enabled services
gcloud services list --enabled

# Check specific APIs
gcloud services list --enabled | grep identitytoolkit
gcloud services list --enabled | grep firebaseauth
gcloud services list --enabled | grep cloudresourcemanager
gcloud services list --enabled | grep firebase
```

### Via API Request
```javascript
// Check if APIs are working in your app
firebase.auth().currentUser
  .then(() => console.log('Auth API is working'))
  .catch(error => console.error('Auth API error:', error));
```

## Common Troubleshooting Steps

### 1. "Permission Denied" Errors
**Symptom**: Error messages like "Permission denied" or "API not enabled"

**Solutions**:
- Ensure you're using the correct project ID
- Verify billing is enabled for the project
- Check IAM permissions for your account
- Wait 2-5 minutes after enabling APIs for changes to propagate

### 2. "API Key Invalid" Errors
**Symptom**: "API key not valid. Please pass a valid API key"

**Solutions**:
- Verify API key in firebase-config.js matches Firebase Console
- Check API key restrictions in Google Cloud Console
- Ensure the API key has access to required APIs

### 3. "Quota Exceeded" Errors
**Symptom**: "Quota exceeded for quota metric..."

**Solutions**:
- Check quotas in Google Cloud Console > APIs & Services > Quotas
- Enable billing if on free tier limits
- Request quota increases if needed

### 4. "Network Error" Issues
**Symptom**: "A network error has occurred"

**Solutions**:
- Check Firebase project settings for authorized domains
- Add your domain to authorized domains in Firebase Console
- Verify CORS settings if using custom domain

### 5. Authentication Method Not Working
**Symptom**: Specific auth method (email/password, Google, etc.) fails

**Solutions**:
1. **For Email/Password**:
   - Enable in Firebase Console > Authentication > Sign-in method
   - Verify email settings are configured

2. **For Google Sign-In**:
   - Enable in Firebase Console > Authentication > Sign-in method
   - Configure OAuth consent screen in Google Cloud Console
   - Add authorized domains

3. **For Other Providers**:
   - Enable specific provider in Firebase Console
   - Configure provider-specific settings (API keys, secrets)

## Best Practices

1. **Enable Only Required APIs**: Don't enable APIs you won't use to avoid confusion and potential security issues

2. **Monitor API Usage**: Regularly check API usage in Google Cloud Console to detect anomalies

3. **Set Up Alerts**: Configure billing alerts to avoid unexpected charges

4. **Use API Key Restrictions**: Restrict API keys to specific domains and APIs

5. **Regular Security Reviews**: Periodically review enabled APIs and remove unused ones

## Quick Checklist

- [ ] Identity Toolkit API enabled
- [ ] Firebase Authentication API enabled
- [ ] Cloud Resource Manager API enabled
- [ ] Firebase Management API enabled
- [ ] Billing enabled (if needed)
- [ ] Correct project selected
- [ ] API keys configured correctly
- [ ] Authentication methods enabled in Firebase Console
- [ ] Authorized domains configured
- [ ] Test authentication working in app

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google Cloud APIs Documentation](https://cloud.google.com/apis/docs/overview)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Google Cloud Console](https://console.cloud.google.com)
- [Firebase Console](https://console.firebase.google.com)

## Support

If you continue to experience issues after following this guide:
1. Check [Firebase Status](https://status.firebase.google.com/) for service outages
2. Visit [Firebase Support](https://firebase.google.com/support)
3. Post in [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase-authentication) with the firebase-authentication tag
4. Review [Firebase GitHub Issues](https://github.com/firebase/firebase-js-sdk/issues)