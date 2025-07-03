// Email Templates Configuration for Firebase Auth
// Note: These templates must be configured in Firebase Console or via Admin SDK
// This file provides the configuration and content for custom email templates

// Email Configuration Settings
export const emailConfig = {
  // Sender configuration
  senderName: 'Sleipnir MC Reykjavík',
  senderEmail: 'noreply@sleipnirmc.is', // Custom domain email
  replyToEmail: 'sleipnirmcreykjavik@gmail.com',
  supportEmail: 'support@sleipnirmc.is',
  
  // SMTP Settings for custom domain (Blaze plan required)
  smtp: {
    host: 'smtp.gmail.com', // Or your SMTP provider
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, // Store in environment variables
      pass: process.env.SMTP_PASS  // Store in environment variables
    },
    // Performance optimization for Blaze plan
    pool: true, // Use connection pooling
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000, // Rate limiting
    rateLimit: 5 // Max 5 messages per second
  },
  
  // Email delivery optimization
  delivery: {
    priority: 'high',
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high'
    },
    // Tracking pixels for open rates (optional)
    trackOpens: true,
    trackClicks: true
  },
  
  // Action URL configuration
  actionCodeSettings: {
    // Custom domain for action URLs
    url: 'https://sleipnirmc.is/auth-action',
    handleCodeInApp: true,
    // iOS app configuration
    iOS: {
      bundleId: 'com.sleipnirmc.reykjavik',
      appStoreId: '123456789' // Your App Store ID
    },
    // Android app configuration
    android: {
      packageName: 'com.sleipnirmc.reykjavik',
      installApp: true,
      minimumVersion: '12'
    },
    // Dynamic links domain (for app deep linking)
    dynamicLinkDomain: 'sleipnirmc.page.link'
  }
};

// Email Template Styles
const emailStyles = `
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    
    /* Main styles */
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      min-width: 100%;
      background-color: #000000;
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1a1a1a;
      border: 2px solid #cf2342;
    }
    
    .header {
      background-color: #000000;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 3px solid #cf2342;
    }
    
    .logo {
      max-width: 200px;
      height: auto;
    }
    
    .content {
      padding: 40px 30px;
      color: #ffffff;
    }
    
    h1 {
      color: #cf2342;
      font-size: 28px;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin: 0 0 20px 0;
      text-align: center;
    }
    
    p {
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    
    .button {
      display: inline-block;
      background-color: #cf2342;
      color: #ffffff;
      text-decoration: none;
      padding: 15px 40px;
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      border: 2px solid #cf2342;
      margin: 20px 0;
    }
    
    .button:hover {
      background-color: #e63856;
      border-color: #e63856;
    }
    
    .divider {
      height: 1px;
      background-color: #cf2342;
      margin: 30px 0;
    }
    
    .footer {
      background-color: #0a0a0a;
      padding: 30px 20px;
      text-align: center;
      color: #888888;
      font-size: 14px;
      border-top: 1px solid #2a2a2a;
    }
    
    .social-links {
      margin: 20px 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 10px;
    }
    
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content {
        padding: 20px !important;
      }
      h1 {
        font-size: 24px !important;
      }
    }
  </style>
`;

// Email Verification Template
export const verificationEmailTemplate = {
  subject: {
    is: '🏍️ Staðfestu netfangið þitt - Sleipnir MC Reykjavík',
    en: '🏍️ Verify your email - Sleipnir MC Reykjavík'
  },
  
  // HTML template
  html: (actionUrl, lang = 'is') => {
    const content = lang === 'is' ? {
      preheader: 'Kláraðu skráninguna þína hjá Sleipnir MC Reykjavík',
      greeting: 'Halló rider!',
      headline: 'STAÐFESTU NETFANGIÐ ÞITT',
      message: 'Takk fyrir að skrá þig hjá Sleipnir MC Reykjavík. Smelltu á hnappinn hér að neðan til að staðfesta netfangið þitt og fá aðgang að öllum eiginleikum síðunnar.',
      buttonText: 'STAÐFESTA NETFANG',
      alternative: 'Ef hnappurinn virkar ekki, afritaðu og límdu þennan hlekk í vafrann þinn:',
      expiry: 'Þessi hlekkur rennur út eftir 24 klukkustundir.',
      notYou: 'Ef þú baðst ekki um þessa staðfestingu, vinsamlegast hunsa þennan póst.',
      motto: 'NO DRUGS, NO ATTITUDE',
      signature: 'Kveðja,<br>Sleipnir MC Reykjavík'
    } : {
      preheader: 'Complete your registration with Sleipnir MC Reykjavík',
      greeting: 'Hello rider!',
      headline: 'VERIFY YOUR EMAIL',
      message: 'Thank you for registering with Sleipnir MC Reykjavík. Click the button below to verify your email and gain access to all site features.',
      buttonText: 'VERIFY EMAIL',
      alternative: 'If the button doesn\'t work, copy and paste this link into your browser:',
      expiry: 'This link expires in 24 hours.',
      notYou: 'If you didn\'t request this verification, please ignore this email.',
      motto: 'NO DRUGS, NO ATTITUDE',
      signature: 'Best regards,<br>Sleipnir MC Reykjavík'
    };
    
    return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.headline}</title>
  ${emailStyles}
</head>
<body>
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${content.preheader}
  </div>
  
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <img src="https://sleipnirmc.is/Images/SleipnirLogo.png" alt="Sleipnir MC Logo" class="logo">
          </div>
          
          <!-- Content -->
          <div class="content">
            <p style="font-size: 20px; color: #cf2342;">${content.greeting}</p>
            <h1>${content.headline}</h1>
            <p>${content.message}</p>
            
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${actionUrl}" class="button" style="color: #ffffff;">${content.buttonText}</a>
                </td>
              </tr>
            </table>
            
            <div class="divider"></div>
            
            <p style="color: #888888; font-size: 14px;">${content.alternative}</p>
            <p style="color: #888888; font-size: 12px; word-break: break-all;">${actionUrl}</p>
            
            <p style="color: #cf2342; font-size: 14px; margin-top: 30px;">${content.expiry}</p>
            
            <div style="text-align: center; margin: 40px 0; padding: 20px; border-top: 1px solid #cf2342; border-bottom: 1px solid #cf2342;">
              <p style="color: #ffffff; font-size: 18px; letter-spacing: 3px; margin: 0;">${content.motto}</p>
            </div>
            
            <p style="color: #888888; font-size: 14px;">${content.notYou}</p>
            <p style="margin-top: 30px;">${content.signature}</p>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="social-links">
              <a href="https://facebook.com/sleipnirmcreykjavik" style="color: #cf2342;">Facebook</a>
              <a href="https://instagram.com/sleipnirmcreykjavik" style="color: #cf2342;">Instagram</a>
            </div>
            <p style="margin: 10px 0;">
              Sleipnir MC Reykjavík<br>
              sleipnirmcreykjavik@gmail.com | +354 581-2345
            </p>
            <p style="font-size: 12px; color: #666666;">
              © ${new Date().getFullYear()} Sleipnir MC Reykjavík. All rights reserved.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  },
  
  // Plain text template
  text: (actionUrl, lang = 'is') => {
    const content = lang === 'is' ? {
      greeting: 'Halló rider!',
      headline: 'STAÐFESTU NETFANGIÐ ÞITT',
      message: 'Takk fyrir að skrá þig hjá Sleipnir MC Reykjavík. Smelltu á hlekkinn hér að neðan til að staðfesta netfangið þitt:',
      expiry: 'Þessi hlekkur rennur út eftir 24 klukkustundir.',
      notYou: 'Ef þú baðst ekki um þessa staðfestingu, vinsamlegast hunsa þennan póst.',
      motto: 'NO DRUGS, NO ATTITUDE',
      signature: 'Kveðja,\nSleipnir MC Reykjavík'
    } : {
      greeting: 'Hello rider!',
      headline: 'VERIFY YOUR EMAIL',
      message: 'Thank you for registering with Sleipnir MC Reykjavík. Click the link below to verify your email:',
      expiry: 'This link expires in 24 hours.',
      notYou: 'If you didn\'t request this verification, please ignore this email.',
      motto: 'NO DRUGS, NO ATTITUDE',
      signature: 'Best regards,\nSleipnir MC Reykjavík'
    };
    
    return `
${content.greeting}

${content.headline}

${content.message}

${actionUrl}

${content.expiry}

${content.motto}

${content.notYou}

${content.signature}

---
Sleipnir MC Reykjavík
sleipnirmcreykjavik@gmail.com
+354 581-2345
    `;
  }
};

// Password Reset Template
export const passwordResetTemplate = {
  subject: {
    is: '🔐 Endurstilla lykilorð - Sleipnir MC Reykjavík',
    en: '🔐 Reset password - Sleipnir MC Reykjavík'
  },
  
  html: (actionUrl, lang = 'is') => {
    const content = lang === 'is' ? {
      headline: 'ENDURSTILLA LYKILORÐ',
      message: 'Við fengum beiðni um að endurstilla lykilorðið þitt. Smelltu á hnappinn hér að neðan til að velja nýtt lykilorð.',
      buttonText: 'ENDURSTILLA LYKILORÐ',
      notYou: 'Ef þú baðst ekki um þessa breytingu, vinsamlegast hunsa þennan póst og lykilorðið þitt helst óbreytt.',
      security: 'Af öryggisástæðum rennur þessi hlekkur út eftir 1 klukkustund.'
    } : {
      headline: 'RESET PASSWORD',
      message: 'We received a request to reset your password. Click the button below to choose a new password.',
      buttonText: 'RESET PASSWORD',
      notYou: 'If you didn\'t request this change, please ignore this email and your password will remain unchanged.',
      security: 'For security reasons, this link expires in 1 hour.'
    };
    
    // Use similar template structure as verification email
    return verificationEmailTemplate.html(actionUrl, lang)
      .replace(/{headline}/g, content.headline)
      .replace(/{message}/g, content.message)
      .replace(/{buttonText}/g, content.buttonText);
  },
  
  text: (actionUrl, lang = 'is') => {
    // Similar structure to verification email text
    return passwordResetTemplate.text(actionUrl, lang);
  }
};

// Email Change Template
export const emailChangeTemplate = {
  subject: {
    is: '📧 Staðfestu nýtt netfang - Sleipnir MC Reykjavík',
    en: '📧 Verify new email - Sleipnir MC Reykjavík'
  },
  
  html: (actionUrl, oldEmail, newEmail, lang = 'is') => {
    const content = lang === 'is' ? {
      headline: 'STAÐFESTU NÝTT NETFANG',
      message: `Við fengum beiðni um að breyta netfanginu þínu frá ${oldEmail} í ${newEmail}. Smelltu á hnappinn til að staðfesta breytinguna.`,
      buttonText: 'STAÐFESTA BREYTINGU',
      warning: 'Ef þú gerðir ekki þessa beiðni, hafðu samband við okkur strax.'
    } : {
      headline: 'VERIFY NEW EMAIL',
      message: `We received a request to change your email from ${oldEmail} to ${newEmail}. Click the button to confirm this change.`,
      buttonText: 'CONFIRM CHANGE',
      warning: 'If you didn\'t make this request, please contact us immediately.'
    };
    
    // Reuse template structure
    return verificationEmailTemplate.html(actionUrl, lang)
      .replace(/{headline}/g, content.headline)
      .replace(/{message}/g, content.message)
      .replace(/{buttonText}/g, content.buttonText);
  }
};

// Member Approval Template
export const memberApprovalTemplate = {
  subject: {
    is: '🎉 Meðlimsumsókn samþykkt - Sleipnir MC Reykjavík',
    en: '🎉 Membership approved - Sleipnir MC Reykjavík'
  },
  
  html: (userName, lang = 'is') => {
    const content = lang === 'is' ? {
      headline: 'VELKOMIN/N Í HÓPINN!',
      greeting: `Halló ${userName}!`,
      message: 'Meðlimsumsókn þín hefur verið samþykkt! Þú hefur nú aðgang að öllum meðlimavörum og sérstöku efni á síðunni okkar.',
      benefits: [
        'Aðgangur að meðlimavörum',
        'Sérstök tilboð og afslættir',
        'Fréttir af viðburðum klúbbsins',
        'Aðgangur að meðlimasvæði'
      ],
      buttonText: 'SKOÐA MEÐLIMAVÖRUR',
      closing: 'Við hlökkum til að sjá þig á næsta fundi!'
    } : {
      headline: 'WELCOME TO THE CLUB!',
      greeting: `Hello ${userName}!`,
      message: 'Your membership application has been approved! You now have access to all member products and exclusive content on our site.',
      benefits: [
        'Access to member-only products',
        'Special offers and discounts',
        'Club event notifications',
        'Access to member area'
      ],
      buttonText: 'VIEW MEMBER PRODUCTS',
      closing: 'We look forward to seeing you at the next meeting!'
    };
    
    const benefitsList = content.benefits.map(b => `<li style="margin: 10px 0;">${b}</li>`).join('');
    
    return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.headline}</title>
  ${emailStyles}
</head>
<body>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <img src="https://sleipnirmc.is/Images/SleipnirLogo.png" alt="Sleipnir MC Logo" class="logo">
          </div>
          
          <!-- Content -->
          <div class="content">
            <p style="font-size: 20px; color: #cf2342;">${content.greeting}</p>
            <h1>${content.headline}</h1>
            <p>${content.message}</p>
            
            <div style="background-color: #0a0a0a; padding: 20px; margin: 20px 0; border-left: 4px solid #cf2342;">
              <p style="color: #cf2342; font-weight: bold; margin: 0 0 10px 0;">
                ${lang === 'is' ? 'Þú hefur nú aðgang að:' : 'You now have access to:'}
              </p>
              <ul style="margin: 0; padding-left: 20px;">
                ${benefitsList}
              </ul>
            </div>
            
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="https://sleipnirmc.is/shop.html" class="button" style="color: #ffffff;">
                    ${content.buttonText}
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="margin-top: 30px;">${content.closing}</p>
            
            <div style="text-align: center; margin: 40px 0; padding: 20px; border-top: 1px solid #cf2342; border-bottom: 1px solid #cf2342;">
              <p style="color: #ffffff; font-size: 18px; letter-spacing: 3px; margin: 0;">NO DRUGS, NO ATTITUDE</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p>Sleipnir MC Reykjavík</p>
            <p style="font-size: 12px;">
              © ${new Date().getFullYear()} Sleipnir MC Reykjavík. All rights reserved.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
};

// Cloud Function helper for sending custom emails
export function generateCloudFunctionEmailSender() {
  return `
// Cloud Function for sending custom emails
// Deploy this to Firebase Functions

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const { emailConfig, verificationEmailTemplate, passwordResetTemplate } = require('./email-templates');

// Create reusable transporter object using SMTP
const transporter = nodemailer.createTransport({
  host: emailConfig.smtp.host,
  port: emailConfig.smtp.port,
  secure: emailConfig.smtp.secure,
  auth: {
    user: functions.config().smtp.user,
    pass: functions.config().smtp.pass
  },
  pool: emailConfig.smtp.pool,
  maxConnections: emailConfig.smtp.maxConnections,
  maxMessages: emailConfig.smtp.maxMessages,
  rateDelta: emailConfig.smtp.rateDelta,
  rateLimit: emailConfig.smtp.rateLimit
});

// Send custom verification email
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  const { email, actionUrl, lang = 'is' } = data;
  
  const mailOptions = {
    from: \`"\${emailConfig.senderName}" <\${emailConfig.senderEmail}>\`,
    to: email,
    replyTo: emailConfig.replyToEmail,
    subject: verificationEmailTemplate.subject[lang],
    html: verificationEmailTemplate.html(actionUrl, lang),
    text: verificationEmailTemplate.text(actionUrl, lang),
    priority: emailConfig.delivery.priority,
    headers: emailConfig.delivery.headers
  };
  
  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Email send error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});

// Verify transporter connection on deployment
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});
  `;
}

// Firebase Console configuration instructions
export const firebaseConsoleInstructions = `
FIREBASE CONSOLE EMAIL TEMPLATE CONFIGURATION:

1. Go to Firebase Console > Authentication > Templates

2. For each template type, click "Edit" and:
   - Enable "Custom template"
   - Set "Sender name" to: Sleipnir MC Reykjavík
   - Set "From" to: noreply@sleipnirmc.is
   - Set "Reply to" to: sleipnirmcreykjavik@gmail.com

3. Custom Action URL:
   - Set to: https://sleipnirmc.is/auth-action
   - Or use: https://your-project.firebaseapp.com/__/auth/action if no custom domain

4. For custom SMTP (Blaze plan required):
   - Go to Firebase Console > Project Settings > Service Accounts
   - Generate new private key for Cloud Functions
   - Deploy the Cloud Function from generateCloudFunctionEmailSender()

5. Email Delivery Optimization:
   - Enable "Email enumeration protection" in Firebase Console
   - Configure rate limiting in Security Rules
   - Monitor email delivery in Firebase Console > Authentication > Usage

6. Custom Domain Setup:
   - Verify domain ownership in Firebase Console
   - Configure SPF, DKIM, and DMARC records
   - Set up custom email domain in Authentication settings
`;

// Export all templates and configuration
export default {
  emailConfig,
  verificationEmailTemplate,
  passwordResetTemplate,
  emailChangeTemplate,
  memberApprovalTemplate,
  generateCloudFunctionEmailSender,
  firebaseConsoleInstructions
};