# Firebase Authentication Setup Guide for Sleipnir MC

## Overview
This guide covers advanced Firebase Authentication configuration for the Sleipnir MC website, including security settings, email customization, and enhanced authentication options.

## Prerequisites
- Firebase project created and configured
- Admin access to Firebase Console
- Blaze (pay-as-you-go) plan for advanced features
- Domain verification completed

---

## 1. Email Enumeration Protection

Email enumeration protection prevents attackers from discovering which email addresses are registered in your system.

### Steps to Enable:

1. **Navigate to Firebase Console**
   ```
   https://console.firebase.google.com/
   ```

2. **Go to Authentication Settings**
   - Select your project
   - Click "Authentication" in the left sidebar
   - Go to "Settings" tab
   - Select "User actions"

3. **Enable Email Enumeration Protection**
   - Find "Email enumeration protection"
   - Toggle ON "Enable email enumeration protection"
   - Click "Save"

4. **Configure Error Messages**
   ```javascript
   // Update your auth error handling to use generic messages
   const genericErrorMessage = {
       is: 'Ógild innskráning. Vinsamlegast athugaðu upplýsingarnar.',
       en: 'Invalid credentials. Please check your information.'
   };
   ```

### Important Notes:
- This changes error messages for `fetchSignInMethodsForEmail`
- Sign-in errors become generic (no "user not found" vs "wrong password")
- Improves security but may reduce user experience
- Consider adding "Forgot password?" prominently

### Verification:
```javascript
// Test enumeration protection
try {
    await firebase.auth().fetchSignInMethodsForEmail('test@example.com');
    // Should not reveal if email exists
} catch (error) {
    console.log(error.code); // Should be generic
}
```

---

## 2. Custom Email Action Handlers

Configure custom pages for email verification, password reset, and other auth actions.

### Step 1: Configure Action URL

1. **In Firebase Console**
   - Authentication → Templates → Edit template
   - Click "Customize action URL"
   - Enter: `https://sleipnirmc.is/auth-action.html`

2. **Update auth-action.html**
   ```javascript
   // Ensure your auth-action.html handles all modes
   const mode = getParameterByName('mode');
   const actionCode = getParameterByName('oobCode');
   const lang = getParameterByName('lang') || 'is';
   
   switch (mode) {
       case 'resetPassword':
           handleResetPassword(actionCode, lang);
           break;
       case 'verifyEmail':
           handleVerifyEmail(actionCode, lang);
           break;
       case 'recoverEmail':
           handleRecoverEmail(actionCode, lang);
           break;
   }
   ```

### Step 2: Customize Email Templates

1. **For Each Template Type**
   - Go to Authentication → Templates
   - Select template (verification, password reset, etc.)
   - Click "Edit template"

2. **Customize Content**
   ```html
   <!-- Email Verification Template -->
   <table width="100%" cellpadding="0" cellspacing="0">
     <tr>
       <td align="center" bgcolor="#000000">
         <img src="https://sleipnirmc.is/Images/SleipnirLogo.png" 
              alt="Sleipnir MC" width="200">
       </td>
     </tr>
     <tr>
       <td style="padding: 40px 30px;">
         <h1 style="color: #cf2342; font-family: Arial, sans-serif;">
           Staðfestu netfangið þitt / Verify Your Email
         </h1>
         <p style="font-size: 16px; line-height: 1.5;">
           Takk fyrir að skrá þig hjá Sleipnir MC Reykjavík.<br>
           Thank you for registering with Sleipnir MC Reykjavík.
         </p>
         <table cellpadding="0" cellspacing="0">
           <tr>
             <td align="center" bgcolor="#cf2342" style="border-radius: 4px;">
               <a href="%LINK%" target="_blank" 
                  style="display: inline-block; padding: 16px 36px; 
                         font-size: 16px; color: #ffffff; 
                         text-decoration: none; border-radius: 4px;">
                 Staðfesta / Verify
               </a>
             </td>
           </tr>
         </table>
       </td>
     </tr>
   </table>
   ```

3. **Add Custom Parameters**
   ```javascript
   // In your sending code
   const actionCodeSettings = {
       url: 'https://sleipnirmc.is/auth-action.html?lang=' + userLang,
       handleCodeInApp: false,
       dynamicLinkDomain: 'sleipnirmc.page.link' // If using Dynamic Links
   };
   ```

### Step 3: Multi-language Support

```javascript
// Email template with language detection
const emailTemplates = {
    is: {
        subject: 'Staðfestu netfangið þitt - Sleipnir MC',
        preheader: 'Smelltu hér til að staðfesta netfangið þitt',
        greeting: 'Halló %USER_NAME%,',
        message: 'Vinsamlegast staðfestu netfangið þitt með því að smella á hnappinn hér að neðan.',
        button: 'Staðfesta Netfang',
        footer: 'Ef þú baðst ekki um þessa staðfestingu, huntsaðu þennan tölvupóst.'
    },
    en: {
        subject: 'Verify Your Email - Sleipnir MC',
        preheader: 'Click here to verify your email address',
        greeting: 'Hello %USER_NAME%,',
        message: 'Please verify your email address by clicking the button below.',
        button: 'Verify Email',
        footer: 'If you didn\'t request this verification, please ignore this email.'
    }
};
```

---

## 3. Email Delivery Settings (Blaze Plan)

### Upgrade to Blaze Plan

1. **Enable Blaze Plan**
   - Firebase Console → Settings → Usage and billing
   - Click "Upgrade" and select Blaze plan
   - Add billing information

2. **Configure Email Quotas**
   - Default: 100 emails/day (Spark plan)
   - Blaze: Unlimited (pay per use)
   - Current rate: ~$0.05-0.10 per 1000 emails

### Monitor Email Usage

1. **Set Up Budget Alerts**
   ```
   Firebase Console → Settings → Budget & alerts
   - Set monthly budget (e.g., $10)
   - Configure alerts at 50%, 90%, 100%
   ```

2. **Track Email Metrics**
   ```javascript
   // Add to Cloud Functions
   exports.trackEmailSent = functions.firestore
       .document('emailTracking/{userId}')
       .onWrite(async (change, context) => {
           const newData = change.after.data();
           const previousData = change.before.data();
           
           if (newData.sentCount > previousData.sentCount) {
               // Log to analytics
               await analytics.logEvent('email_sent', {
                   type: newData.type,
                   user_id: context.params.userId
               });
           }
       });
   ```

### Email Delivery Best Practices

1. **Implement Send Limits**
   ```javascript
   const EMAIL_LIMITS = {
       perUser: {
           hourly: 3,
           daily: 10
       },
       global: {
           hourly: 100,
           daily: 1000
       }
   };
   ```

2. **Queue System for Bulk Emails**
   ```javascript
   // Cloud Function for queued email sending
   exports.processEmailQueue = functions.pubsub
       .schedule('every 5 minutes')
       .onRun(async (context) => {
           const queue = await db.collection('emailQueue')
               .where('status', '==', 'pending')
               .limit(50)
               .get();
           
           for (const doc of queue.docs) {
               await sendEmail(doc.data());
               await doc.ref.update({ status: 'sent' });
           }
       });
   ```

---

## 4. Authorized Domains Configuration

### Add Authorized Domains

1. **Navigate to Settings**
   - Authentication → Settings → Authorized domains

2. **Add Your Domains**
   ```
   Default domains (keep these):
   - localhost
   - *.firebaseapp.com
   - *.web.app
   
   Add your custom domains:
   - sleipnirmc.is
   - www.sleipnirmc.is
   - admin.sleipnirmc.is (if using subdomain)
   ```

3. **Configure OAuth Redirect URIs**
   - For each domain, ensure redirect URIs are set
   - Format: `https://sleipnirmc.is/__/auth/handler`

### Domain Verification

1. **Verify Domain Ownership**
   - Hosting → Add custom domain
   - Follow DNS verification steps
   - Add TXT record to your DNS

2. **SSL Configuration**
   - Firebase automatically provisions SSL
   - Wait 24-48 hours for propagation
   - Check: `https://sleipnirmc.is`

### CORS Configuration

```javascript
// Cloud Function CORS setup
const cors = require('cors')({
    origin: [
        'https://sleipnirmc.is',
        'https://www.sleipnirmc.is',
        'http://localhost:3000' // Development
    ]
});

exports.authEndpoint = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        // Handle request
    });
});
```

---

## 5. Custom SMTP Configuration

### When to Use Custom SMTP

- Brand consistency (from: noreply@sleipnirmc.is)
- Better deliverability
- Email analytics
- Custom headers/footers

### Option 1: SendGrid Integration

1. **Set Up SendGrid**
   ```bash
   npm install @sendgrid/mail
   ```

2. **Configure API Key**
   ```javascript
   // Cloud Function
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(functions.config().sendgrid.key);
   ```

3. **Create Email Function**
   ```javascript
   exports.sendCustomEmail = functions.https.onCall(async (data, context) => {
       const { to, templateId, dynamicData } = data;
       
       const msg = {
           to,
           from: {
               email: 'noreply@sleipnirmc.is',
               name: 'Sleipnir MC Reykjavík'
           },
           templateId,
           dynamicTemplateData: dynamicData,
           trackingSettings: {
               clickTracking: { enable: true },
               openTracking: { enable: true }
           }
       };
       
       try {
           await sgMail.send(msg);
           return { success: true };
       } catch (error) {
           console.error('SendGrid error:', error);
           throw new functions.https.HttpsError('internal', 'Email send failed');
       }
   });
   ```

### Option 2: SMTP Server Setup

1. **Configure SMTP Settings**
   ```javascript
   const nodemailer = require('nodemailer');
   
   const transporter = nodemailer.createTransport({
       host: 'smtp.gmail.com', // Or your SMTP server
       port: 587,
       secure: false,
       auth: {
           user: functions.config().smtp.user,
           pass: functions.config().smtp.password
       }
   });
   ```

2. **Set Firebase Config**
   ```bash
   firebase functions:config:set \
     smtp.user="noreply@sleipnirmc.is" \
     smtp.password="your-password" \
     sendgrid.key="your-api-key"
   ```

### Email Templates with SMTP

```javascript
const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background-color: #000000;
            color: #ffffff;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #cf2342;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #cf2342;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://sleipnirmc.is/Images/SleipnirLogo.png" 
                 alt="Sleipnir MC" width="200">
        </div>
        <h1>{{title}}</h1>
        <p>{{message}}</p>
        <a href="{{actionUrl}}" class="button">{{buttonText}}</a>
    </div>
</body>
</html>
`;
```

---

## 6. Multi-Factor Authentication (MFA)

### Enable MFA Options

1. **In Firebase Console**
   - Authentication → Sign-in method → Advanced

2. **Enable MFA**
   - Toggle "Enable multi-factor authentication"
   - Select allowed factors:
     - ✅ SMS (requires phone auth setup)
     - ✅ Time-based one-time password (TOTP)

### Configure Phone Authentication

1. **Enable Phone Provider**
   - Authentication → Sign-in method
   - Enable "Phone"
   - Add test phone numbers for development

2. **Configure reCAPTCHA**
   ```javascript
   // Initialize reCAPTCHA verifier
   window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
       'size': 'invisible',
       'callback': (response) => {
           // reCAPTCHA solved
       }
   });
   ```

### Implement MFA Enrollment

```javascript
// Check MFA status
async function checkMFAStatus(user) {
    const multiFactorUser = user.multiFactor;
    const enrolledFactors = multiFactorUser.enrolledFactors;
    
    return {
        isEnrolled: enrolledFactors.length > 0,
        factors: enrolledFactors.map(factor => ({
            uid: factor.uid,
            displayName: factor.displayName,
            factorId: factor.factorId,
            enrollmentTime: factor.enrollmentTime
        }))
    };
}

// Enroll phone number for MFA
async function enrollPhoneMFA(user, phoneNumber) {
    try {
        // Get session
        const multiFactorSession = await user.multiFactor.getSession();
        
        // Send verification code
        const phoneAuthCredential = firebase.auth.PhoneAuthProvider.credential(
            phoneNumber,
            window.recaptchaVerifier
        );
        
        const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
        const verificationId = await phoneAuthProvider.verifyPhoneNumber(
            phoneNumber,
            window.recaptchaVerifier
        );
        
        // After user enters code
        const code = prompt('Enter verification code:');
        const credential = firebase.auth.PhoneAuthProvider.credential(
            verificationId,
            code
        );
        
        // Enroll the factor
        const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(credential);
        await user.multiFactor.enroll(multiFactorAssertion, 'My Phone');
        
        alert('MFA enrolled successfully!');
        
    } catch (error) {
        console.error('MFA enrollment error:', error);
    }
}

// Sign in with MFA
async function signInWithMFA(email, password) {
    try {
        const result = await firebase.auth().signInWithEmailAndPassword(email, password);
        return result.user;
        
    } catch (error) {
        if (error.code === 'auth/multi-factor-auth-required') {
            // MFA required
            const resolver = error.resolver;
            const hints = resolver.hints;
            
            // Show factor selection
            console.log('Available factors:', hints);
            
            // For phone factor
            const selectedHint = hints[0]; // Let user select
            const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
            const verificationId = await phoneAuthProvider.verifyPhoneNumber({
                multiFactorHint: selectedHint,
                session: resolver.session
            }, window.recaptchaVerifier);
            
            // Get code from user
            const code = prompt('Enter MFA code:');
            const credential = firebase.auth.PhoneAuthProvider.credential(
                verificationId,
                code
            );
            
            const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(credential);
            const result = await resolver.resolveSignIn(multiFactorAssertion);
            
            return result.user;
        }
        
        throw error;
    }
}
```

### MFA Management UI

```html
<!-- MFA Settings Section -->
<div class="mfa-settings">
    <h3>Two-Factor Authentication</h3>
    <div id="mfa-status">
        <!-- Status will be shown here -->
    </div>
    
    <div id="mfa-enrollment" style="display: none;">
        <p>Add an extra layer of security to your account</p>
        <button onclick="showMFAOptions()">Enable 2FA</button>
    </div>
    
    <div id="mfa-factors" style="display: none;">
        <h4>Enrolled Factors</h4>
        <div id="factors-list">
            <!-- Enrolled factors listed here -->
        </div>
        <button onclick="addNewFactor()">Add Another Factor</button>
    </div>
</div>
```

### Best Practices for MFA

1. **Progressive Enrollment**
   - Don't force MFA immediately
   - Prompt high-value users (admins, members)
   - Offer incentives for enabling

2. **Backup Codes**
   ```javascript
   // Generate backup codes
   function generateBackupCodes() {
       const codes = [];
       for (let i = 0; i < 10; i++) {
           codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
       }
       return codes;
   }
   ```

3. **Recovery Options**
   - Admin override for locked accounts
   - Alternative email verification
   - Security questions as fallback

---

## Security Checklist

- [ ] Email enumeration protection enabled
- [ ] Custom action URLs configured
- [ ] Email templates customized and bilingual
- [ ] Authorized domains added and verified
- [ ] SSL certificates active
- [ ] Blaze plan enabled (if needed)
- [ ] Budget alerts configured
- [ ] SMTP/email service integrated (optional)
- [ ] MFA enabled and tested
- [ ] Phone authentication configured
- [ ] reCAPTCHA implemented
- [ ] Backup codes system ready
- [ ] Admin recovery procedures documented

## Testing

### Test Email Delivery
```javascript
// Test function
async function testEmailDelivery() {
    const user = firebase.auth().currentUser;
    if (user) {
        try {
            await user.sendEmailVerification();
            console.log('Test email sent to:', user.email);
        } catch (error) {
            console.error('Email test failed:', error);
        }
    }
}
```

### Test MFA Flow
1. Create test account
2. Enable MFA
3. Sign out
4. Sign in with MFA
5. Test factor removal
6. Test recovery flow

## Monitoring

### Set Up Alerts
```javascript
// Cloud Function for auth monitoring
exports.monitorAuthEvents = functions.auth.user().onCreate(async (user) => {
    // Log new user
    await db.collection('authLogs').add({
        event: 'user_created',
        userId: user.uid,
        email: user.email,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Check for suspicious patterns
    const recentSignups = await db.collection('authLogs')
        .where('event', '==', 'user_created')
        .where('timestamp', '>', new Date(Date.now() - 3600000))
        .get();
    
    if (recentSignups.size > 50) {
        // Alert admin of potential spam
        console.error('High signup rate detected!');
    }
});
```

---

## Support Resources

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Email Template Best Practices](https://firebase.google.com/docs/auth/custom-email-handler)
- [MFA Implementation Guide](https://firebase.google.com/docs/auth/web/multi-factor)
- [SendGrid Integration](https://sendgrid.com/docs/for-developers/sending-email/firebase/)

For Sleipnir MC specific questions, contact the development team.