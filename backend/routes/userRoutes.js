const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath;
        if (file.fieldname === 'profilePicture') {
            uploadPath = path.join(__dirname, '../../frontend/avatars');
        } else if (file.fieldname === 'coverPhoto') {
            uploadPath = path.join(__dirname, '../../frontend/uploads/covers');
        } else {
            uploadPath = path.join(__dirname, '../../frontend/uploads');
        }
        
        // Create directories if they don't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.user) {
        return next();
    }
    res.status(401).json({ message: 'Not authenticated' });
}

// Endpoint to update user profile
router.post('/profile', isAuthenticated, upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'coverPhoto', maxCount: 1 }
]), async (req, res) => {
    try {
        const userId = req.user._id;
        const updateData = {};
        
        // Handle bio update
        if (req.body.bio !== undefined) {
            updateData.bio = req.body.bio;
        }
        
        // Handle profile picture update
        if (req.files && req.files.profilePicture && req.files.profilePicture.length > 0) {
            const relativePath = 'avatars/' + path.basename(req.files.profilePicture[0].path);
            updateData.profilePicture = relativePath;
        }
        
        // Handle cover photo update
        if (req.files && req.files.coverPhoto && req.files.coverPhoto.length > 0) {
            const relativePath = 'uploads/covers/' + path.basename(req.files.coverPhoto[0].path);
            updateData.coverPhoto = relativePath;
        }
        
        // Update user in database
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Return updated user data
        res.json({
            bio: user.bio,
            profilePicture: user.profilePicture,
            coverPhoto: user.coverPhoto,
            name: user.name
        });
        
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error during profile update' });
    }
});

// Get user profile data
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio || '',
            coverPhoto: user.coverPhoto || ''
        });
        
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error during profile fetch' });
    }
});

// Add this new route to get basic user info
router.get('/basic-info/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Find user by ID
        const user = await User.findById(userId).select('name profilePicture');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Return basic user info
        res.json({
            name: user.name,
            profilePicture: user.profilePicture
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;