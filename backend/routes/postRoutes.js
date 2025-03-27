const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Posts');
const User = require('../models/Users');

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.user) {
        return next();
    }
    res.status(401).json({ message: 'Not authenticated' });
}

// Configure multer for post media uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../frontend/uploads/posts');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'post-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Create a new post
router.post('/create', isAuthenticated, upload.single('media'), async (req, res) => {
    try {
        const { content, displayName } = req.body;
        const userId = req.user._id;
        
        // Create a new post
        const newPost = new Post({
            userId,
            content,
            displayName: displayName || undefined, // Use displayName if provided
            timestamp: new Date()
        });
        
        // If media was uploaded, add its path to the post
        if (req.file) {
            let mediaPath = req.file.path;
            
            // Convert backslashes to forward slashes for consistency
            mediaPath = mediaPath.replace(/\\/g, '/');
            
            // Extract just the part after 'frontend/'
            const pathParts = mediaPath.split('frontend/');
            if (pathParts.length > 1) {
                mediaPath = pathParts[1];
            }
            
            newPost.media = mediaPath;
        }
        
        // Save post to database
        await newPost.save();
        
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Server error during post creation' });
    }
});

// Get all posts
router.get('/', async (req, res) => {
    try {
        // Get posts sorted by timestamp (newest first)
        const posts = await Post.find()
            .populate('userId', 'name profilePicture')
            .populate('repostedBy', 'name profilePicture') // Populate the repostedBy field
            .populate({
                path: 'originalPostId',
                populate: {
                    path: 'userId',
                    select: 'name profilePicture'
                }
            }) // Populate the original post's user information
            .sort({ timestamp: -1 })
            .limit(50); // Limit to 50 posts for performance
        
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Like or unlike a post
router.post('/like/:postId', isAuthenticated, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const alreadyLiked = post.reactions.likedBy.includes(userId);

        if (alreadyLiked) {
            // Unlike the post
            post.reactions.likedBy = post.reactions.likedBy.filter(id => id.toString() !== userId.toString());
            post.reactions.like -= 1;
        } else {
            // Like the post
            post.reactions.likedBy.push(userId);
            post.reactions.like += 1;
        }

        await post.save();
        res.json({ message: alreadyLiked ? "Unliked post" : "Liked post", likes: post.reactions.like });

    } catch (error) {
        console.error("Error updating likes:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Repost a post
router.post('/repost/:postId', isAuthenticated, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const originalPost = await Post.findById(postId);
        if (!originalPost) {
            return res.status(404).json({ message: "Post not found" });
        }

        const repost = new Post({
            userId: userId,
            content: originalPost.content,
            media: originalPost.media,
            displayName: req.user.name,
            timestamp: new Date(),
            reactions: {
                like: 0,
                likedBy: []
            },
            isRepost: true,
            originalPostId: originalPost._id,
            repostedBy: userId
        });

        await repost.save();
        res.json({ message: "Post reposted successfully", repost });
    } catch (error) {
        console.error("Error reposting post:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a comment to a post
router.post('/:postId/comments', isAuthenticated, async (req, res) => {
    try {
        const { postId } = req.params;
        const { comment } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const newComment = {
            userId: user._id,
            username: user.name,
            comment: comment
        };

        post.comments.push(newComment);
        await post.save();

        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/following', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log(`[DEBUG] /following - Request from user ID: ${userId}`);
        
        // Get the list of users this person follows
        const currentUser = await User.findById(userId).select('following');
        
        if (!currentUser) {
            console.log(`[DEBUG] /following - User ${userId} not found in database`);
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log(`[DEBUG] /following - User ${userId} follows ${currentUser.following.length} users`);
        console.log(`[DEBUG] /following - Following IDs: ${currentUser.following.join(', ')}`);
        
        // Get posts from followed users AND the user's own posts
        const posts = await Post.find({
            $or: [
                { userId: { $in: currentUser.following } },
                { userId: userId } // Include the user's own posts
            ]
        })
        .sort({ timestamp: -1 })
        .populate('userId', 'name profilePicture')
        .limit(50);
        
        console.log(`[DEBUG] /following - Found ${posts.length} posts from followed users and self`);
        
        // Format posts with better error handling
        const formattedPosts = [];
        
        for (const post of posts) {
            // Skip any null/undefined posts
            if (!post) {
                console.log(`[DEBUG] /following - Encountered null post, skipping`);
                continue;
            }
            
            try {
                console.log(`[DEBUG] /following - Processing post ID: ${post._id}`);
                console.log(`[DEBUG] /following - Post belongs to user: ${post.userId ? post.userId._id : 'unknown'}`);
                console.log(`[DEBUG] /following - Post user details: ${JSON.stringify({
                    name: post.userId ? post.userId.name : 'unknown',
                    profilePicture: post.userId ? post.userId.profilePicture : 'unknown'
                })}`);
                
                formattedPosts.push({
                    id: post._id,
                    content: post.content || '',
                    imageUrl: post.media || null,
                    createdAt: post.timestamp || new Date(),
                    likes: post.reactions && post.reactions.likedBy ? post.reactions.likedBy.length : 0,
                    comments: post.comments ? post.comments.length : 0,
                    userLiked: post.reactions && post.reactions.likedBy ? 
                        post.reactions.likedBy.some(id => id.toString() === userId.toString()) : false,
                    username: post.userId ? post.userId.name : (post.displayName || 'Anonymous'),
                    profilePicture: post.userId && post.userId.profilePicture ? 
                        post.userId.profilePicture : 'avatars/Avatar_Default_Anonymous.webp',
                    userId: post.userId ? post.userId._id : null
                });
            } catch (formatError) {
                console.error(`[DEBUG] /following - Error formatting post ${post._id}:`, formatError);
                // Skip problematic posts instead of returning undefined entries
            }
        }
        
        console.log(`[DEBUG] /following - Successfully formatted ${formattedPosts.length} posts`);
        res.json(formattedPosts);
    } catch (error) {
        console.error('[DEBUG] /following - Error fetching followed posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get posts from users the current user is NOT following (for Explore page)
router.get('/explore', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log(`[DEBUG] /explore - Request from user ID: ${userId}`);
        
        // Get the list of users this person follows
        const currentUser = await User.findById(userId).select('following');
        
        if (!currentUser) {
            console.log(`[DEBUG] /explore - User ${userId} not found in database`);
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log(`[DEBUG] /explore - User ${userId} follows ${currentUser.following.length} users`);
        
        // Create a list of users to exclude (followed users and self)
        const excludeUsers = [...currentUser.following, userId];
        console.log(`[DEBUG] /explore - Excluding ${excludeUsers.length} users from results`);
        
        // Get posts from users NOT being followed
        const posts = await Post.find({
            userId: { $nin: excludeUsers }
        })
        .sort({ timestamp: -1 })
        .populate('userId', 'name profilePicture')
        .limit(50);
        
        console.log(`[DEBUG] /explore - Found ${posts.length} posts from non-followed users`);
        
        // Format posts with better error handling
        const formattedPosts = [];
        
        for (const post of posts) {
            // Skip any null/undefined posts
            if (!post) {
                console.log(`[DEBUG] /explore - Encountered null post, skipping`);
                continue;
            }
            
            try {
                console.log(`[DEBUG] /explore - Processing post ID: ${post._id}`);
                console.log(`[DEBUG] /explore - Post belongs to user: ${post.userId ? post.userId._id : 'unknown'}`);
                console.log(`[DEBUG] /explore - Post user details: ${JSON.stringify({
                    name: post.userId ? post.userId.name : 'unknown',
                    profilePicture: post.userId ? post.userId.profilePicture : 'unknown'
                })}`);
                
                formattedPosts.push({
                    id: post._id,
                    content: post.content || '',
                    imageUrl: post.media || null,
                    createdAt: post.timestamp || new Date(),
                    likes: post.reactions && post.reactions.likedBy ? post.reactions.likedBy.length : 0,
                    comments: post.comments ? post.comments.length : 0,
                    userLiked: post.reactions && post.reactions.likedBy ? 
                        post.reactions.likedBy.some(id => id.toString() === userId.toString()) : false,
                    username: post.userId ? post.userId.name : (post.displayName || 'Anonymous'),
                    profilePicture: post.userId && post.userId.profilePicture ? 
                        post.userId.profilePicture : 'avatars/Avatar_Default_Anonymous.webp',
                    userId: post.userId ? post.userId._id : null
                });
            } catch (formatError) {
                console.error(`[DEBUG] /explore - Error formatting post ${post._id}:`, formatError);
                // Skip problematic posts instead of returning undefined entries
            }
        }
        
        console.log(`[DEBUG] /explore - Successfully formatted ${formattedPosts.length} posts`);
        res.json(formattedPosts);
    } catch (error) {
        console.error('[DEBUG] /explore - Error fetching explore posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;