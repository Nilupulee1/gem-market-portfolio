import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  frontendURL: string = process.env.FRONTEND_URL || 'http://localhost:5173'
) => {
  const resetLink = `${frontendURL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - GemFolio',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi,</p>
        <p>We received a request to reset your password. Click the link below to proceed:</p>
        <p>
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Your Password
          </a>
        </p>
        <p>Or copy this link: <code>${resetLink}</code></p>
        <p style="color: #666;">This link will expire in 1 hour.</p>
        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">&copy; ${new Date().getFullYear()} GemFolio. All rights reserved.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export const sendWelcomeEmail = async (
  email: string,
  name: string
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome to GemFolio!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to GemFolio, ${name}!</h2>
        <p>Thank you for signing up. Your account is now active and ready to use.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse curated gemstone portfolios</li>
          <li>Participate in auctions</li>
          <li>Connect with trusted sellers</li>
        </ul>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">&copy; ${new Date().getFullYear()} GemFolio. All rights reserved.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
