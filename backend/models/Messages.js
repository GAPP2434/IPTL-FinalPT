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
        required: function() {
            // Content is required ONLY if there are no attachments
            return !(this.attachments && this.attachments.length > 0);
        },
        default: ''
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
    },
    // Add these fields for group messages
    isGroupMessage: {
        type: Boolean,
        default: false
    },
    isSystemMessage: {
        type: Boolean,
        default: false
    },
    attachments: {
        type: [String],
        default: []
    },
    attachmentTypes: {
        type: [String],
        default: []
    },
    publicKey: {
        type: Object,  // Store the entire JWK object
        default: null
    },
    encryptionType: {
        type: String,
        enum: ['direct', 'group', null],
        default: null
    },
    originalPlainText: {
        type: String,
        default: null
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