const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const Message = require('../models/Messages');
const mongoose = require('mongoose');

// Middleware to check if user is authenticated and is an admin
function isAdmin(req, res, next) {
    // First check if user is authenticated
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'You must be logged in' });
    }
    
    // Then check if user is an admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin privileges required' });
    }
    
    next();
}

// Get all users
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({})
            .select('_id name email role status profilePicture createdAt')
            .sort({ createdAt: -1 });
            
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get security logs (failed login attempts)
router.get('/security-logs', isAdmin, async (req, res) => {
    try {
        // This would normally come from a security logs collection
        // For now, return empty array as we haven't implemented this yet
        res.json([]);
    } catch (error) {
        console.error('Error fetching security logs:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get analytics data
router.get('/analytics', isAdmin, async (req, res) => {
    try {
        // Get total users count
        const totalUsers = await User.countDocuments();
        
        // Get users created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newUsers = await User.countDocuments({ createdAt: { $gte: today } });
        
        // Get active users (users currently online)
        const activeUsers = global.onlineUsers ? global.onlineUsers.size : 0;
        
        // Get flagged users (users that need review - for example, reported users)
        // This would normally come from a reports collection
        const flaggedUsers = 0;
        
        res.json({
            totalUsers,
            activeUsers,
            newUsers,
            flaggedUsers
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user status (suspend, ban, reactivate)
router.post('/user/:userId/status', isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        
        // Validate status
        if (!['active', 'suspended', 'banned'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        // Update user status
        const user = await User.findByIdAndUpdate(
            userId, 
            { status }, 
            { new: true }
        ).select('_id name status');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;