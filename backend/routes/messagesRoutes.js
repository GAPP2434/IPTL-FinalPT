const express = require('express');
const router = express.Router();
const Message = require('../models/Messages');
const GroupChat = require('../models/GroupChat');
const User = require('../models/Users');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../frontend/uploads/messages');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        // Keep original filename but ensure uniqueness with timestamp prefix
        // Clean the original filename to remove invalid characters
        const originalName = file.originalname.replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const uniquePrefix = Date.now() + '-';
        cb(null, uniquePrefix + originalName);
    }
});

const upload = multer({ storage: storage });

const messageUpload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).array('attachments', 5);

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.user) {
        return next();
    }
    res.status(401).json({ message: 'Not authenticated' });
}

function formatLastMessageWithAttachments(content, attachments, attachmentTypes) {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
        return content || '';
    }
    
    const attachmentType = attachmentTypes && attachmentTypes[0];
    
    if (attachmentType === 'image') {
        return content ? `📷 ${content}` : "📷 Sent a photo";
    } else if (attachmentType === 'video') {
        return content ? `🎥 ${content}` : "🎥 Sent a video";
    } else {
        return content ? `📎 ${content}` : "📎 Sent an attachment";
    }
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
                    lastMessageAttachments: { $first: "$attachments" },
                    lastMessageAttachmentTypes: { $first: "$attachmentTypes" },
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
                    profilePicture: group.profilePicture || 'avatars/group-default.png',
                    lastMessage: formatLastMessageWithAttachments(msg.lastMessage, msg.lastMessageAttachments, msg.lastMessageAttachmentTypes),
                    timestamp: msg.timestamp,
                    unreadCount: msg.unreadCount,
                    isGroup: true,
                    members: group.members,
                    hasAttachments: msg.lastMessageAttachments && msg.lastMessageAttachments.length > 0,
                    lastAttachmentType: msg.lastMessageAttachmentTypes && msg.lastMessageAttachmentTypes[0]
                };
            } else {
                // Regular user-to-user conversation
                // Determine the other user in the conversation
                const otherUserId = msg.senderId.equals(new mongoose.Types.ObjectId(userId)) 
                    ? msg.recipientId 
                    : msg.senderId;
                
                // Get user data
                const otherUser = await User.findById(otherUserId);
                
                // In the /conversations endpoint
                return {
                    conversationId: msg._id,
                    userId: otherUserId,
                    name: otherUser ? otherUser.name : 'Unknown User',
                    profilePicture: otherUser ? otherUser.profilePicture : 'avatars/Avatar_Default_Anonymous.webp',
                    lastMessage: formatLastMessageWithAttachments(msg.lastMessage, msg.lastMessageAttachments, msg.lastMessageAttachmentTypes),
                    // Add this field to identify if the last message is from the current user
                    lastMessageIsFromYou: msg.senderId.equals(new mongoose.Types.ObjectId(userId)),
                    timestamp: msg.timestamp,
                    unreadCount: msg.unreadCount,
                    isGroup: false,
                    hasAttachments: msg.lastMessageAttachments && msg.lastMessageAttachments.length > 0,
                    lastAttachmentType: msg.lastMessageAttachmentTypes && msg.lastMessageAttachmentTypes[0],
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
                
                // Add this check for attachments in latestMessage
                const hasAttachments = latestMessage && latestMessage.attachments && latestMessage.attachments.length > 0;
                const formattedLastMessage = latestMessage ? 
                    formatLastMessageWithAttachments(
                        latestMessage.content, 
                        latestMessage.attachments, 
                        latestMessage.attachmentTypes
                    ) : 'New group created';
                    
                    return {
                        conversationId: conversationId,
                        userId: group._id.toString(),
                        name: group.name,
                        profilePicture: group.profilePicture || 'avatars/group-default.png',
                        lastMessage: formattedLastMessage,
                        timestamp: latestMessage ? latestMessage.timestamp : group.timestamp,
                        unreadCount: 0,
                        isGroup: true,
                        members: group.members,
                        hasAttachments: hasAttachments,
                        lastAttachmentType: hasAttachments ? latestMessage.attachmentTypes[0] : null
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
router.post('/send', isAuthenticated, (req, res) => {
    messageUpload(req, res, async function(err) {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: 'File upload error: ' + err.message });
        }

        try {
            const { recipientId, content} = req.body;
            
            console.log("Received message data:", {
                recipientId,
                contentLength: content ? content.length : 0,
            });

            if (!recipientId) {
                return res.status(400).json({ message: 'Recipient ID is required' });
            }
            
            const senderId = req.user._id;

            // Handle file uploads
            const attachments = req.files || [];
            const attachmentUrls = attachments.map(file => '/uploads/messages/' + file.filename);
            const attachmentTypes = attachments.map(file => 
                file.mimetype.startsWith('image/') ? 'image' :
                file.mimetype.startsWith('video/') ? 'video' : 'file'
            );
            
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
                content: content || '',
                conversationId,
                timestamp: new Date(),
                read: false,
                isGroupMessage: isGroup,
                attachments: attachmentUrls,
                attachmentTypes: attachmentTypes
            });
            
            await newMessage.save();
            
            // Modify the response for the sender
            const senderMessageData = {
                ...newMessage.toObject(),
                isCurrentUser: true,
            };

            // Broadcast using WebSocket
            if (global.wss) {
                // Create the message data to send - include attachments
                const messageData = {
                    type: 'new_message',
                    message: {
                        _id: newMessage._id,
                        senderId: senderId.toString(),
                        recipientId: recipientId.toString(),
                        content: content || '',
                        timestamp: newMessage.timestamp,
                        conversationId: conversationId,
                        read: false,
                        isGroupMessage: isGroup,
                        attachments: attachmentUrls,
                        attachmentTypes: attachmentTypes,
                    }
                };
                
                // For group messages, add sender information
                if (isGroup) {
                    const sender = await User.findById(senderId).select('name profilePicture');
                    if (sender) {
                        messageData.message.senderName = sender.name;
                        messageData.message.senderAvatar = sender.profilePicture;
                    }
                    
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
            
            // Send back senderMessageData instead of newMessage
            res.status(201).json(senderMessageData);
            
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });
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
        const currentUserId = req.user._id;
        const groupId = req.params.groupId;
        
        // Check if group exists
        const group = await GroupChat.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        
        // Check if user is a member of the group
        if (!group.members.includes(currentUserId)) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }
        
        // Get member details
        const members = await User.find({
            _id: { $in: group.members }
        }).select('_id name profilePicture');
        
        // Mark the creator
        const membersWithRole = members.map(member => {
            const memberObj = member.toObject();
            memberObj.isCreator = group.createdBy.equals(member._id);
            return memberObj;
        });
        
        res.json(membersWithRole);
        
    } catch (error) {
        console.error('Error fetching group members:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update group picture route
router.post('/group/:groupId/update-picture', isAuthenticated, (req, res) => {
    // Use the same upload middleware as the other routes, but configured for a single file
    const upload = multer({
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
    }).single('groupPicture');

    upload(req, res, async function(err) {
        if (err) {
            console.error('Error uploading group picture:', err);
            return res.status(400).json({ message: 'File upload error: ' + err.message });
        }

        try {
            const groupId = req.params.groupId;
            const currentUserId = req.user._id;
            
            // Check if group exists
            const group = await GroupChat.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }
            
            // Check if user is a member of the group
            if (!group.members.includes(currentUserId)) {
                return res.status(403).json({ message: 'You are not a member of this group' });
            }
            
            // If no file was uploaded
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }
            
            // Update the group's profile picture - use absolute URL path from root
            const profilePicture = `/uploads/messages/${req.file.filename}`;
            group.profilePicture = profilePicture;
            
            await group.save();
            
            // Create a system message about the picture update
            const sender = await User.findById(currentUserId).select('name');
            const systemMessage = new Message({
                senderId: currentUserId,
                recipientId: groupId,
                content: `${sender.name} changed the group picture`,
                conversationId: `group:${groupId}`,
                isGroupMessage: true,
                isSystemMessage: true,
                timestamp: new Date(),
                read: false
            });
            
            await systemMessage.save();
            
            // Notify group members via WebSocket
            if (global.wss) {
                group.members.forEach(memberId => {
                    if (memberId.toString() !== currentUserId.toString()) {
                        const message = {
                            type: 'group_updated',
                            groupId: groupId,
                            message: `${sender.name} changed the group picture`,
                            updatedField: 'profilePicture',
                            newValue: profilePicture
                        };
                        
                        global.wss.clients.forEach(client => {
                            if (client.userId === memberId.toString()) {
                                client.send(JSON.stringify(message));
                            }
                        });
                    }
                });
            }
            
            res.json({
                message: 'Group picture updated successfully',
                profilePicture: profilePicture
            });
            
        } catch (error) {
            console.error('Error updating group picture:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });
});

// Update group name route
router.post('/group/:groupId/update-name', isAuthenticated, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { name } = req.body;
        const currentUserId = req.user._id;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }
        
        // Check if group exists
        const group = await GroupChat.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        
        // Check if user is a member of the group
        if (!group.members.includes(currentUserId)) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }
        
        // Update group name
        const oldName = group.name;
        group.name = name.trim();
        
        await group.save();
        
        // Create a system message about the name change
        const sender = await User.findById(currentUserId).select('name');
        const systemMessage = new Message({
            senderId: currentUserId,
            recipientId: groupId,
            content: `${sender.name} changed the group name from "${oldName}" to "${name}"`,
            conversationId: `group:${groupId}`,
            isGroupMessage: true,
            isSystemMessage: true,
            timestamp: new Date(),
            read: false
        });
        
        await systemMessage.save();
        
        // Notify group members via WebSocket
        if (global.wss) {
            group.members.forEach(memberId => {
                if (memberId.toString() !== currentUserId.toString()) {
                    const message = {
                        type: 'group_updated',
                        groupId: groupId,
                        message: `${sender.name} changed the group name to "${name}"`,
                        updatedField: 'name',
                        newValue: name
                    };
                    
                    global.wss.clients.forEach(client => {
                        if (client.userId === memberId.toString()) {
                            client.send(JSON.stringify(message));
                        }
                    });
                }
            });
        }
        
        res.json({
            message: 'Group name updated successfully',
            name: name
        });
        
    } catch (error) {
        console.error('Error updating group name:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add member to group route
router.post('/group/:groupId/add-member', isAuthenticated, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { memberId } = req.body;
        const currentUserId = req.user._id;
        
        if (!memberId) {
            return res.status(400).json({ message: 'Member ID is required' });
        }
        
        // Check if group exists
        const group = await GroupChat.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        
        // Check if user is a member of the group
        if (!group.members.includes(currentUserId)) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }
        
        // Check if new member already exists in the group
        if (group.members.includes(memberId)) {
            return res.status(400).json({ message: 'User is already a member of this group' });
        }
        
        // Check if new member exists
        const newMember = await User.findById(memberId);
        if (!newMember) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Add member to group
        group.members.push(memberId);
        await group.save();
        
        // Create a system message about the new member
        const sender = await User.findById(currentUserId).select('name');
        const systemMessage = new Message({
            senderId: currentUserId,
            recipientId: groupId,
            content: `${sender.name} added ${newMember.name} to the group`,
            conversationId: `group:${groupId}`,
            isGroupMessage: true,
            isSystemMessage: true,
            timestamp: new Date(),
            read: false
        });
        
        await systemMessage.save();
        
        // Notify group members via WebSocket
        if (global.wss) {
            // Notify existing members
            group.members.forEach(gMemberId => {
                if (gMemberId.toString() !== currentUserId.toString() && 
                    gMemberId.toString() !== memberId) {
                    const message = {
                        type: 'group_member_added',
                        groupId: groupId,
                        message: `${sender.name} added ${newMember.name} to the group`,
                        newMemberId: memberId,
                        newMemberName: newMember.name
                    };
                    
                    global.wss.clients.forEach(client => {
                        if (client.userId === gMemberId.toString()) {
                            client.send(JSON.stringify(message));
                        }
                    });
                }
            });
            
            // Notify new member that they've been added
            const addedMessage = {
                type: 'added_to_group',
                groupId: groupId,
                groupName: group.name,
                addedBy: sender.name
            };
            
            global.wss.clients.forEach(client => {
                if (client.userId === memberId.toString()) {
                    client.send(JSON.stringify(addedMessage));
                }
            });
        }
        
        res.json({
            message: 'Member added successfully',
            member: {
                _id: newMember._id,
                name: newMember.name,
                profilePicture: newMember.profilePicture
            }
        });
        
    } catch (error) {
        console.error('Error adding member to group:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove member from group route
router.post('/group/:groupId/remove-member', isAuthenticated, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { memberId } = req.body;
        const currentUserId = req.user._id;
        
        if (!memberId) {
            return res.status(400).json({ message: 'Member ID is required' });
        }
        
        // Check if group exists
        const group = await GroupChat.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        
        // Check if user is a member of the group
        if (!group.members.includes(currentUserId)) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }
        
        // Can't remove the group creator
        if (group.createdBy.toString() === memberId) {
            return res.status(403).json({ message: 'Cannot remove the group creator' });
        }
        
        // Check if member is in the group
        if (!group.members.includes(memberId)) {
            return res.status(400).json({ message: 'User is not a member of this group' });
        }
        
        // Remove member from group
        group.members = group.members.filter(id => id.toString() !== memberId.toString());
        await group.save();
        
        // Get names for the message
        const sender = await User.findById(currentUserId).select('name');
        const removedUser = await User.findById(memberId).select('name');
        
        // Create a system message about the removed member
        const systemMessage = new Message({
            senderId: currentUserId,
            recipientId: groupId,
            content: `${sender.name} removed ${removedUser.name} from the group`,
            conversationId: `group:${groupId}`,
            isGroupMessage: true,
            isSystemMessage: true,
            timestamp: new Date(),
            read: false
        });
        
        await systemMessage.save();
        
        // Notify remaining members via WebSocket
        if (global.wss) {
            group.members.forEach(gMemberId => {
                if (gMemberId.toString() !== currentUserId.toString()) {
                    const message = {
                        type: 'group_member_removed',
                        groupId: groupId,
                        message: `${sender.name} removed ${removedUser.name} from the group`,
                        removedMemberId: memberId,
                        removedMemberName: removedUser.name
                    };
                    
                    global.wss.clients.forEach(client => {
                        if (client.userId === gMemberId.toString()) {
                            client.send(JSON.stringify(message));
                        }
                    });
                }
            });
            
            // Notify removed user
            const removedMessage = {
                type: 'removed_from_group',
                groupId: groupId,
                groupName: group.name,
                removedBy: sender.name
            };
            
            global.wss.clients.forEach(client => {
                if (client.userId === memberId.toString()) {
                    client.send(JSON.stringify(removedMessage));
                }
            });
        }
        
        res.json({
            message: 'Member removed successfully'
        });
        
    } catch (error) {
        console.error('Error removing member from group:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;