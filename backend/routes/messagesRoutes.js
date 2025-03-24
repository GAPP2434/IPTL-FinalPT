const express = require('express');
const router = express.Router();
const Message = require('../models/Messages');
const User = require('../models/Users');
const mongoose = require('mongoose');
const WebSocket = require('ws');

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.user) {
        return next();
    }
    res.status(401).json({ message: 'Not authenticated' });
}

// Get all conversations for the current user
router.get('/conversations', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find all messages where the user is either sender or recipient
        const messages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: new mongoose.Types.ObjectId(userId) },
                        { recipientId: new mongoose.Types.ObjectId(userId) }
                    ]
                }
            },
            // Sort by timestamp descending
            { $sort: { timestamp: -1 } },
            // Group by conversation
            {
                $group: {
                    _id: "$conversationId",
                    lastMessage: { $first: "$content" },
                    timestamp: { $first: "$timestamp" },
                    senderId: { $first: "$senderId" },
                    recipientId: { $first: "$recipientId" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ["$recipientId", new mongoose.Types.ObjectId(userId)] },
                                    { $eq: ["$read", false] }
                                ]},
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);
        
        // Get user details for each conversation
        const conversations = await Promise.all(messages.map(async (msg) => {
            // Determine the other user in the conversation
            const otherUserId = msg.senderId.equals(new mongoose.Types.ObjectId(userId)) 
                ? msg.recipientId 
                : msg.senderId;
            
            // Get user data
            const otherUser = await User.findById(otherUserId);
            
            return {
                conversationId: msg._id,
                userId: otherUserId,
                name: otherUser ? otherUser.name : 'Unknown User',
                profilePicture: otherUser ? otherUser.profilePicture : 'avatars/Avatar_Default_Anonymous.webp',
                lastMessage: msg.lastMessage,
                timestamp: msg.timestamp,
                unreadCount: msg.unreadCount
            };
        }));
        
        res.json(conversations);
        
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get messages for a specific conversation
router.get('/conversation/:userId', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const otherUserId = req.params.userId;
        
        // Generate conversation ID
        const conversationId = Message.generateConversationId(currentUserId.toString(), otherUserId);
        
        // Get messages for this conversation
        const messages = await Message.find({ conversationId })
            .sort({ timestamp: 1 });
        
        // Update read status for messages
        await Message.updateMany(
            { 
                conversationId, 
                recipientId: currentUserId,
                read: false
            },
            { $set: { read: true } }
        );
        
        res.json(messages);
        
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send a new message
router.post('/send', isAuthenticated, async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        
        if (!recipientId || !content) {
            return res.status(400).json({ message: 'Recipient ID and content are required' });
        }
        
        const senderId = req.user._id;
        
        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }
        
        // Generate conversation ID
        const conversationId = Message.generateConversationId(senderId.toString(), recipientId);
        
        // Create new message
        const newMessage = new Message({
            senderId,
            recipientId,
            content,
            conversationId,
            timestamp: new Date(),
            read: false
        });
        
        await newMessage.save();
        
        // Broadcast using WebSocket - REPLACE THIS SECTION with your new code
        if (global.wss) {
            global.wss.clients.forEach((client) => {
                if (client.userId === recipientId.toString() && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'new_message',
                        message: {
                            _id: newMessage._id,
                            senderId: senderId.toString(),
                            recipientId: recipientId.toString(),
                            content: content,
                            timestamp: new Date(),
                            conversationId: conversationId,
                            read: false
                        },
                        recipientId: recipientId.toString()
                    }));
                }
            });
        }
        
        res.status(201).json(newMessage);
        
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search users
router.get('/search', isAuthenticated, async (req, res) => {
    try {
        const query = req.query.q || '';
        const currentUserId = req.user._id;
        
        if (!query) {
            return res.json([]);
        }
        
        // Search for users by name or email
        const users = await User.find({
            $and: [
                { _id: { $ne: currentUserId } }, // Exclude current user
                {
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }).select('_id name email profilePicture');
        
        res.json(users);
        
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add this new route
router.get('/online-users', isAuthenticated, (req, res) => {
    try {
        // If global.onlineUsers is available, return it as an array
        const onlineUserIds = global.onlineUsers ? Array.from(global.onlineUsers) : [];
        res.json(onlineUserIds);
    } catch (error) {
        console.error('Error fetching online users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add this new route to messagesRoutes.js
router.put('/mark-read/:senderId', isAuthenticated, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const senderId = req.params.senderId;
        
        // Generate conversation ID
        const conversationId = Message.generateConversationId(currentUserId.toString(), senderId);
        
        // Update read status for messages
        const result = await Message.updateMany(
            { 
                conversationId, 
                recipientId: currentUserId,
                read: false
            },
            { $set: { read: true } }
        );
        
        res.json({ success: true, updated: result.nModified });
        
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;