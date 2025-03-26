const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Posts');

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
            .sort({ timestamp: -1 })
            .limit(50); // Limit to 50 posts for performance
        
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// WHAT??????????

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


module.exports = router;