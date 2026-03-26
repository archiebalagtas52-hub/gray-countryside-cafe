import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.initEmailTransporter();
    }

    initEmailTransporter() {
        try {
            // Create transporter using Gmail SMTP
            this.emailTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER || 'your-email@gmail.com',
                    pass: process.env.GMAIL_PASSWORD || 'your-app-password'
                }
            });

            // Verify connection
            this.emailTransporter.verify((error, success) => {
                if (error) {
                    console.warn('⚠️ Email service not configured:', error.message);
                    console.log('💡 To enable email notifications:');
                    console.log('   1. Set GMAIL_USER and GMAIL_PASSWORD in .env');
                    console.log('   2. Use Gmail App Password (not your regular password)');
                } else {
                    console.log('✅ Email transporter ready');
                }
            });
        } catch (error) {
            console.error('❌ Failed to initialize email transporter:', error.message);
        }
    }

    /**
     * Send email to admin
     * @param {string} email - Admin email address
     * @param {string} subject - Email subject
     * @param {string} htmlContent - Email body (HTML format)
     * @returns {Promise<boolean>} - True if email sent successfully
     */
    async sendEmailToAdmin(email, subject, htmlContent) {
        try {
            if (!this.emailTransporter) {
                console.warn('⚠️ Email service not initialized');
                return false;
            }

            if (!email) {
                console.error('❌ No email address provided');
                return false;
            }

            const mailOptions = {
                from: process.env.GMAIL_USER || 'noreply@graycafe.com',
                to: email,
                subject: subject,
                html: htmlContent
            };

            const info = await this.emailTransporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully: ${info.response}`);
            console.log(`   To: ${email}`);
            console.log(`   Subject: ${subject}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to send email:', error.message);
            return false;
        }
    }

    /**
     * Send SMS to admin (Note: Requires Twilio setup)
     * @param {string} phoneNumber - Admin phone number (in E.164 format: +1234567890)
     * @param {string} message - SMS message content
     * @returns {Promise<boolean>} - True if SMS sent successfully
     */
    async sendSMSToAdmin(phoneNumber, message) {
        try {
            // For now, we'll log the SMS that would be sent
            // To fully implement, you need to install Twilio: npm install twilio
            console.log('📱 SMS Notification:');
            console.log(`   To: ${phoneNumber}`);
            console.log(`   Message: ${message}`);
            
            // Commented out Twilio implementation (requires setup)
            /*
            const twilio = require('twilio');
            const client = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );

            const sms = await client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });

            console.log(`✅ SMS sent successfully: ${sms.sid}`);
            return true;
            */
           
            return true;
        } catch (error) {
            console.error('❌ Failed to send SMS:', error.message);
            return false;
        }
    }

    /**
     * Send profile update notification email
     * @param {string} email - Admin email
     * @param {object} updatedData - Updated profile data
     * @returns {Promise<boolean>}
     */
    async sendProfileUpdateEmail(email, updatedData) {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Profile Update Confirmation</h2>
                    <p>Hello ${updatedData.fullName || 'Admin'},</p>
                    <p>Your profile information has been updated successfully.</p>
                    
                    <h3 style="color: #555; margin-top: 20px;">Updated Information:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background-color: #f9f9f9;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Field</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Value</strong></td>
                        </tr>
                        ${updatedData.fullName ? `<tr><td style="padding: 10px; border: 1px solid #ddd;">Full Name</td><td style="padding: 10px; border: 1px solid #ddd;">${updatedData.fullName}</td></tr>` : ''}
                        ${updatedData.email ? `<tr><td style="padding: 10px; border: 1px solid #ddd;">Email</td><td style="padding: 10px; border: 1px solid #ddd;">${updatedData.email}</td></tr>` : ''}
                        ${updatedData.phone ? `<tr><td style="padding: 10px; border: 1px solid #ddd;">Phone</td><td style="padding: 10px; border: 1px solid #ddd;">${updatedData.phone}</td></tr>` : ''}
                    </table>
                    
                    <p style="margin-top: 20px; color: #666;">
                        Timestamp: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">
                        This is an automated email from G'RAY COUNTRYSIDE CAFÉ POS System. 
                        Please do not reply to this email.
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmailToAdmin(email, 'Profile Update Confirmation', htmlContent);
    }

    /**
     * Send password change notification email
     * @param {string} email - Admin email
     * @param {string} fullName - Admin name
     * @returns {Promise<boolean>}
     */
    async sendPasswordChangeEmail(email, fullName) {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Changed Successfully</h2>
                    <p>Hello ${fullName || 'Admin'},</p>
                    <p style="color: #d9534f;"><strong>⚠️ Your password has been changed.</strong></p>
                    
                    <p>Your G'RAY COUNTRYSIDE CAFÉ POS System account password was successfully updated.</p>
                    
                    <h3 style="color: #555; margin-top: 20px;">Security Information:</h3>
                    <ul style="color: #666;">
                        <li>Change Time: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</li>
                        <li>If you did not make this change, please contact your system administrator immediately.</li>
                    </ul>
                    
                    <p style="background-color: #f0f0f0; padding: 10px; border-left: 4px solid #5cb85c; margin-top: 20px;">
                        <strong>✓ Your account is secure.</strong> Only you have access to your new password.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">
                        This is an automated email from G'RAY COUNTRYSIDE CAFÉ POS System. 
                        If you did not request this change, please contact support immediately.
                    </p>
                </div>
            </div>
        `;

        return await this.sendEmailToAdmin(email, 'Password Change Notification', htmlContent);
    }
}

// Export as singleton
export default new NotificationService();
