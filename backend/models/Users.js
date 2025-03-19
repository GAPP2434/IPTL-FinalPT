const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
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
        type: Buffer,
        contentType: String
    },
    password: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("User", UserSchema);
