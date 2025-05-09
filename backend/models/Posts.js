// filepath: d:\Github Repos\IPTL-FinalPT\backend\models\Posts.js
const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    username: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

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
    },
    reports: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        date: Date,
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'dismissed'],
            default: 'pending'
        }
    }],
    comments: [CommentSchema]
});

module.exports = mongoose.model("Post", PostSchema);