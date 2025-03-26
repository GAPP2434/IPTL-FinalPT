<<<<<<< Updated upstream
const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    username: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    mediaUrl: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    audioStartTime: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Story", StorySchema);
=======
const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    title: String,
    description: String,
    username: String,
    mediaUrl: String,
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Story', storySchema);
>>>>>>> Stashed changes
