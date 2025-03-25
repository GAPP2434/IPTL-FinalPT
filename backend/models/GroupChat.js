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
    }
});

// Add index for faster queries
GroupChatSchema.index({ members: 1 });

module.exports = mongoose.model("GroupChat", GroupChatSchema);