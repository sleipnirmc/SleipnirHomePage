const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');

initializeApp();

// Credentials loaded from functions/.env file
const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail,
        pass: gmailPassword
    }
});

// Recipient email — change this when going to production
const RECIPIENT_EMAIL = 'arnare23@gmail.com';

exports.sendContactEmail = onDocumentCreated(
    { document: 'contactMessages/{messageId}', region: 'europe-west1' },
    async (event) => {
        const data = event.data.data();

        const mailOptions = {
            from: `Sleipnir MC <${gmailEmail}>`,
            to: RECIPIENT_EMAIL,
            replyTo: data.email,
            subject: `[Sleipnir MC] Message from ${data.name}`,
            html: `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #e0e0e0; padding: 30px; border: 1px solid #333;">
                    <h2 style="color: #cf2342; border-bottom: 1px solid #333; padding-bottom: 15px; margin-top: 0;">
                        New Contact Message
                    </h2>
                    <p style="color: #888; margin: 0 0 5px 0;">From: <span style="color: #fff;">${data.name}</span></p>
                    <p style="color: #888; margin: 0 0 20px 0;">Email: <a href="mailto:${data.email}" style="color: #cf2342;">${data.email}</a></p>
                    <div style="padding: 20px; background: #111; border-left: 3px solid #cf2342;">
                        <p style="margin: 0; white-space: pre-wrap; line-height: 1.6; color: #e0e0e0;">${data.message}</p>
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">
                        Sent from sleipnirmc.com contact form
                    </p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            await event.data.ref.update({ emailSent: true });
            console.log('Contact email sent for message:', event.params.messageId);
        } catch (error) {
            console.error('Failed to send email:', error);
            await event.data.ref.update({ emailSent: false, emailError: error.message });
        }
    }
);
