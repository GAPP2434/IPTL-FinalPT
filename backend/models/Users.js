const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    googleId: {
        type: String
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    profilePicture: {
        type: String,
        default: 'avatars/Avatar_Default_Anonymous.webp'
    },
    // Add these new fields
    coverPhoto: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Add role field
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    // Add status field for managing user accounts
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },
    password: {
        type: String,
        // Only require password for non-Google users
        required: function() {
            return !this.googleId;
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    isPrivateProfile: {
        type: Boolean,
        default: false
    },

    publicKey: {
        type: Object, // Store the entire JWK object
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

module.exports = mongoose.model("User", UserSchema);