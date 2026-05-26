import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { UserRole, JWTPayload } from '../types';
import { sendPasswordResetEmail } from '../utils/emailService';
import crypto from 'crypto';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user
    const user = new User({ name, email: normalizedEmail, password, role });
    await user.save();

    // Generate token
    const payload: JWTPayload = { userId: user._id.toString(), role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const payload: JWTPayload = { userId: user._id.toString(), role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};



// Request password reset
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return res.json({
        message: 'If an account exists, a password reset link will be sent to the email.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiry (1 hour)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Send email
    try {
      await sendPasswordResetEmail(normalizedEmail, resetToken);
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Clear the token if email fails
      user.passwordResetToken = null;
      user.passwordResetExpiry = null;
      await user.save();
      return res.status(500).json({
        message: 'Error sending reset email. Please try again later.'
      });
    }

    res.json({
      message: 'If an account exists, a password reset link will be sent to the email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Reset password with token
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Hash the token to compare
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await user.save();

    res.json({
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};