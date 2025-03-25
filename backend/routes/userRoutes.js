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
            coverPhoto: user.coverPhoto || '',
            followersCount: user.followers ? user.followers.length : 0,
            followingCount: user.following ? user.following.length : 0
        });
        
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error during profile fetch' });
    }
});

// Search users
router.get('/search', isAuthenticated, async (req, res) => {
    try {
        const query = req.query.q || '';
        const currentUserId = req.user._id;
        
        if (!query) {
            return res.json([]);
        }
        
        // Search for users by name or email
        const users = await User.find({
            $and: [
                { _id: { $ne: currentUserId } }, // Exclude current user
                {
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }).select('_id name email profilePicture bio');
        
        // Check if current user follows each of these users
        const usersWithFollowStatus = await Promise.all(users.map(async (user) => {
            const isFollowing = await User.findOne({
                _id: currentUserId,
                following: user._id
            });
            
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
                bio: user.bio,
                youFollow: !!isFollowing
            };
        }));
        
        res.json(usersWithFollowStatus);
        
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get followers
router.get('/followers', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        
        // Find current user with populated followers
        const user = await User.findById(currentUserId).populate('followers', '_id name profilePicture bio');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if current user follows each of their followers
        const followersWithStatus = await Promise.all(user.followers.map(async (follower) => {
            const isFollowing = await User.findOne({
                _id: currentUserId,
                following: follower._id
            });
            
            return {
                _id: follower._id,
                name: follower.name,
                profilePicture: follower.profilePicture,
                bio: follower.bio,
                youFollow: !!isFollowing
            };
        }));
        
        res.json(followersWithStatus);
        
    } catch (error) {
        console.error('Error getting followers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get following
router.get('/following', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        
        // Find current user with populated following
        const user = await User.findById(currentUserId).populate('following', '_id name profilePicture bio');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user.following);
        
    } catch (error) {
        console.error('Error getting following:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Follow user
router.post('/follow', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userId } = req.body;
        
        // Validate that userId is provided
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Check if userId is valid
        const userToFollow = await User.findById(userId);
        if (!userToFollow) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if already following
        const alreadyFollowing = await User.findOne({
            _id: currentUserId,
            following: userId
        });
        
        if (alreadyFollowing) {
            return res.status(400).json({ message: 'Already following this user' });
        }
        
        // Add to following for current user
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { following: userId }
        });
        
        // Add to followers for the other user
        await User.findByIdAndUpdate(userId, {
            $addToSet: { followers: currentUserId }
        });
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

//Recommended people
router.get('/recommended', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        
        // Find current user with populated following
        const currentUser = await User.findById(currentUserId);
        
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Get users that the current user is not already following
        // Use $and to combine multiple conditions for the same field (_id)
        const recommendedUsers = await User.find({
            $and: [
                { _id: { $ne: currentUserId } }, // Exclude current user
                { _id: { $nin: currentUser.following } } // Exclude users already being followed
            ]
        })
        .select('_id name profilePicture bio')
        .limit(10);
        
        // Check if current user follows each of these users (should all be false)
        const usersWithFollowStatus = recommendedUsers.map(user => {
            return {
                _id: user._id,
                name: user.name,
                profilePicture: user.profilePicture,
                bio: user.bio,
                youFollow: false
            };
        });
        
        res.json(usersWithFollowStatus);
        
    } catch (error) {
        console.error('Error getting recommended users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Unfollow user
router.post('/unfollow', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userId } = req.body;
        
        // Validate that userId is provided
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Check if userId is valid
        const userToUnfollow = await User.findById(userId);
        if (!userToUnfollow) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Remove from following for current user
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { following: userId }
        });
        
        // Remove from followers for the other user
        await User.findByIdAndUpdate(userId, {
            $pull: { followers: currentUserId }
        });
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ message: 'Server error' });
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