import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database';
import { EmailService } from '../services/emailService';

const router = express.Router();

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Query user from database
    const result = await pool.query(
      'SELECT id, email, username, role, password_hash, client_id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password - support both bcrypt and PBKDF2 formats
    let isValidPassword = false;
    
    if (user.password_hash.startsWith('pbkdf2:')) {
      // Handle PBKDF2 format from Flask
      const parts = user.password_hash.split('$');
      if (parts.length === 4) {
        const algorithm = parts[0].split(':')[1]; // sha256
        const iterations = parseInt(parts[1]); // 1000000
        const salt = parts[2];
        const hash = parts[3];
        
        const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, algorithm);
        const derivedHash = derivedKey.toString('hex');
        isValidPassword = derivedHash === hash;
      }
    } else {
      // Handle bcrypt format
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Set session with remember me functionality
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.clientId = user.client_id;
    
    // Configure session cookie based on remember me
    if (rememberMe) {
      // Set cookie to expire in 30 days
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      // Default session (expires when browser closes)
      req.session.cookie.maxAge = null;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        client_id: user.client_id
      },
      rememberMe: rememberMe || false
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true });
  });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await pool.query(
      `SELECT id, email, username, role, client_id, first_name, last_name, phone, 
              created_at, last_login, timezone, language, notifications_enabled, profile_picture_url 
       FROM users WHERE id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Get current user
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    let isValidPassword = false;
    
    if (user.password_hash.startsWith('pbkdf2:')) {
      // Handle PBKDF2 format from Flask
      const parts = user.password_hash.split('$');
      if (parts.length === 4) {
        const algorithm = parts[0].split(':')[1]; // sha256
        const iterations = parseInt(parts[1]); // 1000000
        const salt = parts[2];
        const hash = parts[3];
        
        const derivedKey = crypto.pbkdf2Sync(currentPassword, salt, iterations, 32, algorithm);
        const derivedHash = derivedKey.toString('hex');
        isValidPassword = derivedHash === hash;
      }
    } else {
      // Handle bcrypt format
      isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate and send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    otpStore.set(email, {
      otp,
      expiresAt,
      attempts: 0
    });

    // Send OTP email
    const emailService = new EmailService();
    const emailSent = await emailService.sendEmail({
      to: [email],
      subject: 'WeTechForU Login OTP',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2E86AB;">WeTechForU Healthcare Marketing Platform</h2>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h3 style="color: #2E86AB; margin-bottom: 20px;">Your Login OTP</h3>
            <div style="background: #2E86AB; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666; margin-bottom: 10px;">This OTP is valid for 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>This email was sent from info@wetechforu.com</p>
            <p>WeTechForU Healthcare Marketing Platform</p>
          </div>
        </div>
      `,
      textContent: `Your WeTechForU login OTP is: ${otp}. This OTP is valid for 10 minutes.`
    });

    if (emailSent) {
      res.json({
        success: true,
        message: 'OTP sent successfully to your email'
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP email' });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (new Date() > storedOtp.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedOtp.attempts >= 3) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'Too many failed attempts' });
    }

    if (storedOtp.otp !== otp) {
      storedOtp.attempts++;
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP is valid, get user and create session
    const result = await pool.query(
      'SELECT id, email, username, role, client_id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    // Clean up OTP
    otpStore.delete(email);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
