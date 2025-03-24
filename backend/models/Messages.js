const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    },
    conversationId: {
        type: String,
        required: true
    }
});

// Create a compound index on senderId and recipientId for faster queries
MessageSchema.index({ senderId: 1, recipientId: 1 });

// Create a method to generate a unique conversation ID between two users
MessageSchema.statics.generateConversationId = function(userId1, userId2) {
    // Sort the IDs to ensure the same conversation ID regardless of who sends the message
    return [userId1, userId2].sort().join('_');
};

module.exports = mongoose.model("Message", MessageSchema);