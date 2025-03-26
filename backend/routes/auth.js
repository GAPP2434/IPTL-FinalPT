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
router.post('/login', (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            return res.status(500).json({ message: 'Authentication error' });
        }
        
        if (!user) {
            return res.status(401).json({ message: info.message || 'Invalid username or password' });
        }
        
        // Check if the user is banned
        if (user.status === 'banned') {
            return res.status(403).json({ message: 'Your account has been banned. Please contact support for more information.' });
        }
        
        // Check if the user is suspended
        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Your account has been temporarily suspended. Please try again later or contact support.' });
        }
        
        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error during login' });
            }
            
            // Include needsEncryptionSetup flag in the response
            return res.json({ 
                success: true, 
                user: {
                    id: user._id, 
                    name: user.name, 
                    email: user.email,
                    profilePicture: user.profilePicture,
                    role: user.role
                },
                needsEncryptionSetup: !user.publicKey
            });
        });
    })(req, res, next);
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
// Get UID of Logged-in User
router.get('/current-user-id', (req, res) => {
    console.log('Reached /current-user-id endpoint');
    console.log('req.isAuthenticated():', req.isAuthenticated());
    console.log('req.user:', req.user);
    if (req.isAuthenticated()) {
      res.set("Content-Type", "application/json");
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

// Admin registration endpoint
router.post('/register-admin', upload.single('profilePicture'), async (req, res) => {
    try {
        const { name, email, password, adminCode } = req.body;
        
        // Validate admin code
        const validAdminCode = process.env.ADMIN_REGISTRATION_CODE || 'lebronjames';
        if (adminCode !== validAdminCode) {
            return res.status(401).json({ message: 'Invalid administrator code' });
        }
        
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        // Check if username already exists
        const existingUsername = await User.findOne({ name });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username already taken' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create new user with admin role
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin'
        });
        
        // Handle profile picture if provided
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
            
            console.log("Admin profile picture path:", profilePicturePath);
            newUser.profilePicture = profilePicturePath;
        } else {
            // Use default admin avatar
            newUser.profilePicture = `avatars/Avatar_Default_Admin.webp`;
        }
        
        // Save user to database
        await newUser.save();
        
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (err) {
        console.error('Admin registration error:', err);
        res.status(500).json({ message: 'Server error during admin registration' });
    }
});
module.exports = router;