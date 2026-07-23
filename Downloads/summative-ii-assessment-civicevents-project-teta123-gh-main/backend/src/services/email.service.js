import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a reusable transporter object using SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password',
    },
});

/**
 * Sends an email
 * @param {Object} options - Mail options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text version
 * @param {string} [options.html] - HTML version
 */
export const sendMail = async ({ to, subject, text, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"CivicEvents+" <${process.env.SMTP_FROM || 'no-reply@example.com'}>`,
            to,
            subject,
            text,
            html,
        });

        console.log('Email sent: %s', info.messageId);
        return info;
    } catch (err) {
        console.error('Error sending email:', err);
        throw new Error('Failed to send email');
    }
};
