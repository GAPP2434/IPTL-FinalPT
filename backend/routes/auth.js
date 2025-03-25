const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const User = require('../models/Users');
const axios = require('axios');
const passport = require('passport');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../frontend/avatars');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profilePicture-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

// Add this configuration for nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Register user
router.post('/register', upload.single('profilePicture'), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create user object
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });
        
        // If profile picture was uploaded, add its info to user object
        if (req.file) {
            // Fix the path processing to handle Windows and Unix paths correctly
            let profilePicturePath = req.file.path;
            
            // Convert backslashes to forward slashes for consistency
            profilePicturePath = profilePicturePath.replace(/\\/g, '/');
            
            // Extract just the part after 'frontend/'
            const pathParts = profilePicturePath.split('frontend/');
            if (pathParts.length > 1) {
                profilePicturePath = pathParts[1];
            }
            
            console.log("Profile picture path:", profilePicturePath);
            newUser.profilePicture = profilePicturePath;
        } else {
            // Assign random default avatar
            const avatarsDir = path.join(__dirname, '../../frontend/avatars');
            const avatarFiles = fs.readdirSync(avatarsDir).filter(file => file.startsWith('Avatar_'));
            const randomAvatar = avatarFiles[Math.floor(Math.random() * avatarFiles.length)];
            newUser.profilePicture = `avatars/${randomAvatar}`;
        }
        
        // Save user to database
        await newUser.save();
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ name: username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }
        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }
        
        // Use passport to login the user (session-based auth)
        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error during login' });
            }
            return res.json({ 
                success: true, 
                user: {
                    id: req.user.id, 
                    name: user.name, 
                    email: user.email,
                    profilePicture: user.profilePicture 
                } 
            });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error during login' });
    }
});


// Update the Google auth routes in your existing auth.js file
router.get("/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

router.get("/google/callback",
    passport.authenticate("google", {
        // Update these redirect URLs to match your application
        successRedirect: "/index.html", // Or wherever you want to redirect after success
        failureRedirect: "/login.html"
    })
);

router.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/login.html");
    });
});

router.get("/user", (req, res) => {
    res.send(req.user || null);
});

// Forgot password - request reset link
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found with this email' });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // Token expires in 1 hour
        
        // Save token to user document
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpires;
        await user.save();
        
        // Create reset URL
        const resetUrl = `${process.env.APP_URL}/resetPassword.html?token=${resetToken}`;
        
        // Send email with reset link
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset</h1>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #a7c957; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>If you didn't request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ message: 'Password reset link sent to email' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Server error during password reset request' });
    }
});

// Get UID of Logged-in User
router.get('/current-user-id', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ userId: req.user.id });
  } else {
    res.status(401).json({ message: 'You are not logged in' });
  }
});

// Reset password - process new password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        
        // Find user with the token and check if it's still valid
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Update user's password and clear reset token fields
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});
module.exports = router;