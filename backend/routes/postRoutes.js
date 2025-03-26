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

router.post('/create', isAuthenticated, upload.single('media'), async (req, res) => {
    try {
        const { content, displayName, reactions } = req.body;
        const userId = req.user._id;

        // Initialize post object
        const newPost = new Post({
            userId,
            content,
            displayName: displayName || undefined,
            timestamp: new Date(),
            reactions: {
                like: reactions?.like || 0,
                love: reactions?.love || 0,
                haha: reactions?.haha || 0,
                wow: reactions?.wow || 0,
                sad: reactions?.sad || 0,
                angry: reactions?.angry || 0,
                favorite: reactions?.favorite || 0
            }
        });

        // If media was uploaded, add its path
        if (req.file) {
            let mediaPath = req.file.path.replace(/\\/g, '/'); // Normalize path
            
            // Extract relevant media path if stored inside 'frontend/'
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

        // Include the post ID in the response data
        const postData = posts.map((post) => ({
            ...post,
            postId: post._id,
            reactions: post.reactions,
          }));
        
        res.json(postData);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;