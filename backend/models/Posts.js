// filepath: d:\Github Repos\IPTL-FinalPT\backend\models\Posts.js
const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    media: {
        type: String
    },
    displayName: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    reactions: {
        like: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // Stores user IDs who liked the post
    },
    isRepost: {
        type: Boolean,
        default: false
    },
    originalPostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    },
    repostedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
});

module.exports = mongoose.model("Posts", PostSchema);