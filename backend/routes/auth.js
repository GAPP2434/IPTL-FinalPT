const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const User = require('../models/Users');

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
        const { email, password } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        // Generate JWT token
        const payload = {
            user: {
                id: user._id
            }
        };
        
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error during login' });
    }
});

module.exports = router;