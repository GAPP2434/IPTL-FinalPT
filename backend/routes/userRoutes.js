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
        const profileUserId = req.query.userId || userId; // Allow viewing other profiles
        const isOwnProfile = userId.toString() === profileUserId.toString();
        
        const user = await User.findById(profileUserId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if current user follows this profile
        const youFollow = !isOwnProfile ? 
            !!(await User.findOne({ _id: userId, following: profileUserId })) : 
            false;
        
        // Create response object
        const profileData = {
            name: user.name,
            email: isOwnProfile ? user.email : undefined,
            profilePicture: user.profilePicture,
            coverPhoto: user.coverPhoto || '',
            isPrivateProfile: user.isPrivateProfile || false,
            isOwnProfile: isOwnProfile,
            youFollow: youFollow
        };
        
        // Only include these details if profile is public or it's the owner or current user follows private account
        if (!user.isPrivateProfile || isOwnProfile || youFollow) {
            profileData.bio = user.bio || '';
            profileData.followersCount = user.followers ? user.followers.length : 0;
            profileData.followingCount = user.following ? user.following.length : 0;
        }
        
        res.json(profileData);
        
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
        const profileUserId = req.query.userId || currentUserId;
        
        // Find user with populated followers
        const user = await User.findById(profileUserId).populate('followers', '_id name profilePicture bio isPrivateProfile');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if profile is private and not the current user
        if (user.isPrivateProfile && !currentUserId.equals(user._id)) {
            return res.json([]); // Return empty array for private profiles
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
                isPrivateProfile: follower.isPrivateProfile || false,
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
        const profileUserId = req.query.userId || currentUserId;
        
        // Find user with populated following
        const user = await User.findById(profileUserId).populate('following', '_id name profilePicture bio isPrivateProfile');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if profile is private and not the current user
        if (user.isPrivateProfile && !currentUserId.equals(user._id)) {
            return res.json([]); // Return empty array for private profiles
        }
        
        // Check if current user follows each of the users that this user follows
        const followingWithStatus = await Promise.all(user.following.map(async (followed) => {
            const isFollowing = await User.findOne({
                _id: currentUserId,
                following: followed._id
            });
            
            return {
                _id: followed._id,
                name: followed.name,
                profilePicture: followed.profilePicture,
                bio: followed.bio,
                isPrivateProfile: followed.isPrivateProfile || false,
                youFollow: !!isFollowing
            };
        }));
        
        res.json(followingWithStatus);
        
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
        
        // Check for pending follow request
        const pendingRequest = await User.findOne({
            _id: currentUserId,
            followRequestsSent: userId
        });
        
        if (pendingRequest) {
            return res.status(400).json({ message: 'Follow request already sent' });
        }
        
        // If profile is private, send a follow request instead of following directly
        if (userToFollow.isPrivateProfile) {
            console.log(`Sending follow request from ${currentUserId} to private profile ${userId}`);
            
            // Add to followRequestsSent for current user
            const updateResult1 = await User.findByIdAndUpdate(currentUserId, {
                $addToSet: { followRequestsSent: userId }
            }, { new: true });
            
            console.log(`Updated current user followRequestsSent:`, updateResult1.followRequestsSent);
            
            // Add to followRequestsReceived for the other user
            const updateResult2 = await User.findByIdAndUpdate(userId, {
                $addToSet: { followRequestsReceived: currentUserId }
            }, { new: true });
            
            console.log(`Updated target user followRequestsReceived:`, updateResult2.followRequestsReceived);
            
            return res.json({ 
                success: true, 
                requestSent: true,
                message: 'Follow request sent'
            });
        }
        
        // For public profiles, follow directly
        // Add to following for current user
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { following: userId }
        });
        
        // Add to followers for the other user
        await User.findByIdAndUpdate(userId, {
            $addToSet: { followers: currentUserId }
        });
        
        res.json({ 
            success: true,
            requestSent: false,
            message: 'Now following user'
        });
        
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get follow requests received
router.get('/follow-requests/received', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find user with populated follow requests
        const user = await User.findById(userId)
            .populate('followRequestsReceived', '_id name profilePicture bio isPrivateProfile');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const requestsWithInfo = user.followRequestsReceived.map(requester => {
            return {
                _id: requester._id,
                name: requester.name,
                profilePicture: requester.profilePicture,
                bio: requester.bio,
                isPrivateProfile: requester.isPrivateProfile || false
            };
        });
        
        res.json(requestsWithInfo || []);
        
    } catch (error) {
        console.error('Error getting follow requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get follow requests sent
router.get('/follow-requests/sent', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log(`Getting sent requests for user: ${userId}`);
        
        // Find user with populated follow requests
        const user = await User.findById(userId);
        
        if (!user) {
            console.log("User not found when fetching sent requests");
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log(`User has ${user.followRequestsSent.length} sent requests`);
        
        // Populate the sent requests
        const populatedUser = await User.findById(userId)
            .populate('followRequestsSent', '_id name profilePicture bio isPrivateProfile');
            
        if (!populatedUser) {
            console.log("Failed to populate user's sent requests");
            return res.status(500).json({ message: 'Failed to load sent requests' });
        }
        
        const requestsWithInfo = populatedUser.followRequestsSent.map(recipient => {
            return {
                _id: recipient._id,
                name: recipient.name,
                profilePicture: recipient.profilePicture,
                bio: recipient.bio,
                isPrivateProfile: recipient.isPrivateProfile || false
            };
        });
        
        console.log(`Returning ${requestsWithInfo.length} formatted sent requests`);
        res.json(requestsWithInfo || []);
        
    } catch (error) {
        console.error('Error getting sent follow requests:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Accept follow request
router.post('/follow-requests/accept', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        const currentUser = await User.findById(currentUserId);
        
        // Check if request exists
        if (!currentUser.followRequestsReceived.includes(userId)) {
            return res.status(400).json({ message: 'No follow request from this user' });
        }
        
        // Remove from follow requests
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { followRequestsReceived: userId },
            $addToSet: { followers: userId }
        });
        
        // Update the follower's following list and requestsSent
        await User.findByIdAndUpdate(userId, {
            $pull: { followRequestsSent: currentUserId },
            $addToSet: { following: currentUserId }
        });
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error accepting follow request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Decline follow request
router.post('/follow-requests/decline', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Remove from follow requests
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { followRequestsReceived: userId }
        });
        
        // Remove from sender's sent requests
        await User.findByIdAndUpdate(userId, {
            $pull: { followRequestsSent: currentUserId }
        });
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error declining follow request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Cancel sent follow request
router.post('/follow-requests/cancel', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Remove from sent requests
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { followRequestsSent: userId }
        });
        
        // Remove from recipient's received requests
        await User.findByIdAndUpdate(userId, {
            $pull: { followRequestsReceived: currentUserId }
        });
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error canceling follow request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

//Recommended people
router.get('/recommended', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        
        // Find current user with populated following and sent requests
        const currentUser = await User.findById(currentUserId);
        
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Convert the arrays to string IDs for proper comparison
        const followingIds = currentUser.following.map(id => id.toString());
        const requestSentIds = currentUser.followRequestsSent.map(id => id.toString());
        
        // Get users that the current user is not already following and hasn't sent requests to
        const recommendedUsers = await User.find({
            $and: [
                { _id: { $ne: currentUserId } }, // Exclude current user
                { _id: { $nin: followingIds } }, // Exclude users already being followed
                { _id: { $nin: requestSentIds } } // Exclude users with pending requests
            ]
        })
        .select('_id name profilePicture bio isPrivateProfile')
        .limit(10);
        
        // Check if current user follows each of these users (should all be false)
        const usersWithFollowStatus = recommendedUsers.map(user => {
            return {
                _id: user._id,
                name: user.name,
                profilePicture: user.profilePicture,
                bio: user.bio,
                isPrivateProfile: user.isPrivateProfile || false,
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

router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Validate current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        user.password = hashedPassword;
        await user.save();
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Server error during password change' });
    }
});

// Get user privacy status
router.get('/privacy-status', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('isPrivateProfile');
        
        res.json({
            isPrivate: user.isPrivateProfile || false
        });
    } catch (error) {
        console.error('Error fetching privacy status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user privacy settings
router.post('/update-privacy', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const { isPrivate } = req.body;
        
        // Update user privacy setting
        const user = await User.findByIdAndUpdate(
            userId,
            { isPrivateProfile: isPrivate },
            { new: true }
        );
        
        res.json({
            success: true,
            isPrivate: user.isPrivateProfile
        });
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user profile data
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const profileUserId = req.query.userId || userId; // Allow viewing other profiles
        const isOwnProfile = userId.toString() === profileUserId.toString();
        
        const user = await User.findById(profileUserId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if current user follows this profile
        const youFollow = !isOwnProfile ? 
            !!(await User.findOne({ _id: userId, following: profileUserId })) : 
            false;
        
        // Create response object
        const profileData = {
            name: user.name,
            email: isOwnProfile ? user.email : undefined,
            profilePicture: user.profilePicture,
            coverPhoto: user.coverPhoto || '',
            isPrivateProfile: user.isPrivateProfile || false,
            isOwnProfile: isOwnProfile,
            youFollow: youFollow
        };
        
        // Only include these details if profile is public or it's the owner or current user follows private account
        if (!user.isPrivateProfile || isOwnProfile || youFollow) {
            profileData.bio = user.bio || '';
            profileData.followersCount = user.followers ? user.followers.length : 0;
            profileData.followingCount = user.following ? user.following.length : 0;
        }
        
        res.json(profileData);
        
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error during profile fetch' });
    }
});

module.exports = router;