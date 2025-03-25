const express = require('express');
const router = express.Router();
const Message = require('../models/Messages');
const GroupChat = require('../models/GroupChat');
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
                    isGroupMessage: { $first: "$isGroupMessage" },
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
            // Check if this is a group conversation
            const isGroupChat = msg._id.startsWith('group:');
            
            if (isGroupChat) {
                // Extract group ID from the conversation ID
                const groupId = msg._id.replace('group:', '');
                
                // Fetch group details
                const group = await GroupChat.findById(groupId);
                
                if (!group) {
                    return null; // Skip if group doesn't exist
                }
                
                return {
                    conversationId: msg._id,
                    userId: groupId,
                    name: group.name,
                    profilePicture: 'avatars/group-default.png',
                    lastMessage: msg.lastMessage,
                    timestamp: msg.timestamp,
                    unreadCount: msg.unreadCount,
                    isGroup: true,
                    members: group.members
                };
            } else {
                // Regular user-to-user conversation
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
                    unreadCount: msg.unreadCount,
                    isGroup: false
                };
            }
        }));
        
        // IMPORTANT ADDITION: Find all groups the user is a member of but might not have messages yet
        const userGroups = await GroupChat.find({
            members: userId
        });
        
        // For each group, check if it's already in conversations list
        const additionalGroupConversations = await Promise.all(
            userGroups.map(async (group) => {
                const conversationId = `group:${group._id}`;
                
                // Skip if this group is already in the conversations list
                if (conversations.some(conv => conv && conv.conversationId === conversationId)) {
                    return null;
                }
                
                // Find the latest message for this group if any
                const latestMessage = await Message.findOne({
                    conversationId
                }).sort({ timestamp: -1 });
                
                return {
                    conversationId: conversationId,
                    userId: group._id.toString(),
                    name: group.name,
                    profilePicture: 'avatars/group-default.png',
                    lastMessage: latestMessage ? latestMessage.content : 'New group created',
                    timestamp: latestMessage ? latestMessage.timestamp : group.timestamp,
                    unreadCount: 0,
                    isGroup: true,
                    members: group.members
                };
            })
        );
        
        // Filter out null entries and combine with regular conversations
        const allConversations = [
            ...conversations.filter(conv => conv !== null),
            ...additionalGroupConversations.filter(conv => conv !== null)
        ];
        
        // Sort by timestamp (newest first)
        allConversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(allConversations);
        
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
        
        // Check if this is a group chat
        const isGroupChat = await GroupChat.findById(otherUserId);
        
        // Generate conversation ID
        let conversationId;
        let isGroup = false;
        
        if (isGroupChat) {
            // For group chats, use group:{groupId} format
            conversationId = `group:${otherUserId}`;
            isGroup = true;
            
            // Check if the current user is a member of this group - convert to string for proper comparison
            const memberIds = isGroupChat.members.map(id => id.toString());
            if (!memberIds.includes(currentUserId.toString())) {
                return res.status(403).json({ message: 'You are not a member of this group' });
            }
        } else {
            // For direct messages, use the regular pattern
            conversationId = Message.generateConversationId(currentUserId.toString(), otherUserId);
        }
        
        // Get messages for this conversation
        const messages = await Message.find({ conversationId })
            .sort({ timestamp: 1 });
            
        // Add sender information to each message for better display
        const enhancedMessages = await Promise.all(messages.map(async (message) => {
            const messageObj = message.toObject();
            
            // Add isCurrentUser flag for easier client-side rendering
            messageObj.isCurrentUser = message.senderId.toString() === currentUserId.toString();
            messageObj.isGroup = isGroup;
            
            if (isGroup && !message.isSystemMessage) {
                // For group messages, add sender name
                const sender = await User.findById(message.senderId).select('name profilePicture');
                if (sender) {
                    messageObj.senderName = sender.name;
                    messageObj.senderAvatar = sender.profilePicture;
                }
            }
            
            return messageObj;
        }));
        
        // Update read status for messages
        await Message.updateMany(
            { 
                conversationId, 
                recipientId: currentUserId,
                read: false
            },
            { $set: { read: true } }
        );
        
        res.json(enhancedMessages);
        
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
        
        // Check if this is a group chat
        const isGroupChat = await GroupChat.findById(recipientId);
        const isGroup = !!isGroupChat;
        
        if (!isGroup) {
            // Regular user-to-user message
            // Check if recipient exists
            const recipient = await User.findById(recipientId);
            if (!recipient) {
                return res.status(404).json({ message: 'Recipient not found' });
            }
        } else {
            // Group chat - check if sender is a member
            if (!isGroupChat.members.includes(senderId)) {
                return res.status(403).json({ message: 'You are not a member of this group' });
            }
        }
        
        // Generate conversation ID
        const conversationId = isGroup ? 
            `group:${recipientId}` : 
            Message.generateConversationId(senderId.toString(), recipientId);
        
        // Create new message
        const newMessage = new Message({
            senderId,
            recipientId,
            content,
            conversationId,
            timestamp: new Date(),
            read: false,
            isGroupMessage: isGroup
        });
        
        await newMessage.save();
        
        // Broadcast using WebSocket
        if (global.wss) {
            // Create the message data to send
            const messageData = {
                type: 'new_message',
                message: {
                    _id: newMessage._id,
                    senderId: senderId.toString(),
                    recipientId: recipientId.toString(),
                    content: content,
                    timestamp: newMessage.timestamp,
                    conversationId: conversationId,
                    read: false,
                    isGroupMessage: isGroup
                }
            };
            
            if (isGroup) {
                // For group chats, send to all group members except the sender
                isGroupChat.members.forEach(memberId => {
                    const memberIdStr = memberId.toString();
                    
                    // Don't send to the sender
                    if (memberIdStr !== senderId.toString()) {
                        global.wss.clients.forEach(client => {
                            if (client.userId === memberIdStr && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(messageData));
                            }
                        });
                    }
                });
            } else {
                // For direct messages, just send to the recipient
                global.wss.clients.forEach(client => {
                    if (client.userId === recipientId.toString() && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(messageData));
                    }
                });
            }
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

// Create group chat
router.post('/create-group', isAuthenticated, async (req, res) => {
    try {
        const { name, members } = req.body;
        const currentUserId = req.user._id;
        
        if (!name || !members || !Array.isArray(members) || members.length < 2) {
            return res.status(400).json({ message: 'Group name and at least 2 members are required' });
        }
        
        // Create group chat
        const newGroupChat = new GroupChat({
            name,
            createdBy: currentUserId,
            members: [...members, currentUserId], // Include current user in the group
            timestamp: new Date()
        });
        
        await newGroupChat.save();
        
        // Get creator's name for the message
        const creator = await User.findById(currentUserId).select('name');
        
        // Create welcome message
        const welcomeMessage = `${creator.name} created the group "${name}"`;

        // Send confirmation message in the group
        const message = new Message({
            senderId: currentUserId,
            recipientId: newGroupChat._id,
            content: welcomeMessage,
            conversationId: `group:${newGroupChat._id}`,
            isGroupMessage: true,
            isSystemMessage: true,
            timestamp: new Date(),
            read: false
        });
        
        await message.save();
        
        // Get list of user names to include in the added message
        const addedUsers = await User.find({ _id: { $in: members } }).select('name');
        const memberNames = addedUsers.map(user => user.name).join(', ');
        
        // Create "users added" message
        const addedMessage = `${creator.name} added ${memberNames} to the group`;
        
        const addedNotification = new Message({
            senderId: currentUserId,
            recipientId: newGroupChat._id,
            content: addedMessage,
            conversationId: `group:${newGroupChat._id}`,
            isGroupMessage: true,
            isSystemMessage: true,
            timestamp: new Date(),
            read: false
        });
        
        await addedNotification.save();
        
        // Notify all users that they've been added to the group (via WebSocket)
        // *** FIX: Use global.wss instead of req.app.get('wss') ***
        if (global.wss) {
            members.forEach(memberId => {
                const message = {
                    type: 'group-added',
                    groupId: newGroupChat._id.toString(),
                    groupName: name,
                    addedBy: creator.name
                };
                
                global.wss.clients.forEach(client => {
                    if (client.userId === memberId.toString()) {
                        client.send(JSON.stringify(message));
                    }
                });
            });
        }
        
        res.status(201).json(newGroupChat);
        
    } catch (error) {
        console.error('Error creating group chat:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a new route to get group members
router.get('/group-members/:groupId', isAuthenticated, async (req, res) => {
    try {
        const { groupId } = req.params;
        const currentUserId = req.user._id;
        
        // Find the group
        const group = await GroupChat.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        
        // Check if current user is a member
        if (!group.members.includes(currentUserId)) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }
        
        // Get all members with their details
        const members = await User.find({ _id: { $in: group.members } })
            .select('_id name profilePicture');
        
        // Add isCreator flag to each member
        const membersWithRoles = members.map(member => ({
            _id: member._id,
            name: member.name,
            profilePicture: member.profilePicture,
            isCreator: member._id.toString() === group.createdBy.toString()
        }));
        
        res.json(membersWithRoles);
    } catch (error) {
        console.error('Error getting group members:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;