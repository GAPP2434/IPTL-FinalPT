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
        love: { type: Number, default: 0 },
        haha: { type: Number, default: 0 },
        wow: { type: Number, default: 0 },
        sad: { type: Number, default: 0 },
        angry: { type: Number, default: 0 },
        favorite: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model("Posts", PostSchema);