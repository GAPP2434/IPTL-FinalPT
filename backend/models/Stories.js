const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    title: String,
    description: String,
    username: String,
    mediaUrl: String,
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Story', storySchema);
