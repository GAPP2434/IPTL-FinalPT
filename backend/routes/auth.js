const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const User = require('../models/Users');
const axios = require('axios');
const passport = require('passport');

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '../../frontend/uploads');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
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
            const profilePicturePath = req.file.path.replace('\\', '/').split('frontend/')[1];
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
module.exports = router;