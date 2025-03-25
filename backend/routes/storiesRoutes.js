const express = require('express');
const router = express.Router();
const Story = require('../models/Stories');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../frontend/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// Get all stories
router.get('/', async (req, res) => {
    try {
        const stories = await Story.find();
        res.json(stories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new story
router.post('/', upload.single('media'), async (req, res) => {
    const story = new Story({
        title: req.body.title,
        description: req.body.description,
        username: req.body.username,
        mediaUrl: `/uploads/${req.file.filename}`,
        audioStartTime: req.body.audioStartTime
    });

    try {
        const newStory = await story.save();
        res.status(201).json(newStory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;