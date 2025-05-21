import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send verification email
 * @param {string} email - User email
 * @param {string} token - Verification token
 * @returns {Promise} Nodemailer response
 */
const sendVerificationEmail = async (email, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verificationUrl = `${clientUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email - FFXIV Mitigation Planner',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Thank you for registering with FFXIV Mitigation Planner. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
        </div>
        <p>If you did not create an account, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${verificationUrl}</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">FFXIV Mitigation Planner</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} token - Reset token
 * @returns {Promise} Nodemailer response
 */
const sendPasswordResetEmail = async (email, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset Your Password - FFXIV Mitigation Planner',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>You requested a password reset for your FFXIV Mitigation Planner account. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>${resetUrl}</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">FFXIV Mitigation Planner</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send plan sharing notification email
 * @param {string} email - User email
 * @param {Object} plan - Plan data
 * @param {Object} sharedBy - User who shared the plan
 * @returns {Promise} Nodemailer response
 */
const sendPlanSharingEmail = async (email, plan, sharedBy) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const planUrl = `${clientUrl}/plans/${plan.id}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `${sharedBy.username} shared a mitigation plan with you - FFXIV Mitigation Planner`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Mitigation Plan Shared With You</h2>
        <p>${sharedBy.username} has shared a mitigation plan with you:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${plan.title}</h3>
          <p>${plan.description || 'No description provided.'}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${planUrl}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Plan</a>
        </div>
        <p>You can access this plan anytime from your shared plans section.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">FFXIV Mitigation Planner</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send notification email
 * @param {string} email - User email
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @param {string} actionText - Action button text (optional)
 * @param {string} actionUrl - Action button URL (optional)
 * @returns {Promise} Nodemailer response
 */
const sendNotificationEmail = async (email, subject, message, actionText = null, actionUrl = null) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `${subject} - FFXIV Mitigation Planner`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>${message}</p>
        ${actionText && actionUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">${actionText}</a>
          </div>
        ` : ''}
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">FFXIV Mitigation Planner</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

export { sendVerificationEmail, sendPasswordResetEmail, sendPlanSharingEmail, sendNotificationEmail };