const mongoose = require("mongoose");

const GroupChatSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    name: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    timestamp: {
        type: Date,
        default: Date.now
    },
    profilePicture: {
        type: String,
        default: 'avatars/group-default.png'
    },
    encryptedKeys: {
        type: Map,
        of: String,
        default: {}
    }
});

// Add index for faster queries
GroupChatSchema.index({ members: 1 });

module.exports = mongoose.model("GroupChat", GroupChatSchema);