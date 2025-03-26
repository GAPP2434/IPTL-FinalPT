const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = express();
const port = 5500;
const cookieSession = require('cookie-session');
const passport = require('passport');
const http = require('http');
const WebSocket = require('ws');
const User = require('./models/Users');
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true }); // Changed to noServer: true
const adminWss = new WebSocket.Server({ noServer: true });
const onlineUsers = new Set();
global.wss = wss;
global.adminWss = adminWss;

require("./passportSetup");
const storiesRoutes = require('./routes/storiesRoutes');
const postRoutes = require('./routes/postRoutes');

// Create a single upgrade handler for the server
server.removeAllListeners('upgrade'); // Clear any existing listeners
// Load environment variables
dotenv.config();

// Set headers to enable cross-origin isolation
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB Connection Error:', err));

app.use(
    cookieSession({
        name: "session",
        keys: [process.env.SESSION_SECRET],
        maxAge: 24 * 60 * 60 * 1000,
    })
);

// Add this compatibility middleware for Passport 0.6+ with cookie-session
app.use(function(req, res, next) {
    if (req.session && !req.session.regenerate) {
        req.session.regenerate = (callback) => {
            callback();
        };
    }
    if (req.session && !req.session.save) {
        req.session.save = (callback) => {
            callback();
        };
    }
    next();
});

app.use(passport.initialize());
app.use(passport.session());

// Handle WebSocket connections
wss.on('connection', (ws, req) => {  // Add 'req' parameter here
    console.log('Client connected');
    
    if (ws.userId) {
        // Send the list of currently online users to the new connection
        ws.send(JSON.stringify({
            type: 'online_users_list',
            users: Array.from(onlineUsers)
        }));
    }

    // Extract user ID from session cookie
    const cookies = req.headers.cookie;
    if (cookies) {
        const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
        if (sessionCookie) {
            try {
                // Extract user ID from session
                const sessionData = Buffer.from(sessionCookie.split('=')[1], 'base64').toString('utf-8');
                const sessionJson = JSON.parse(sessionData.split('.')[0]);
                const userId = sessionJson.passport.user;
                
                if (userId) {
                    console.log(`WebSocket connection authenticated for user ${userId}`);
                    ws.userId = userId;
                    onlineUsers.add(userId);
                    
                    // Broadcast online status to all connected clients
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'user_status_update',
                                userId: userId,
                                status: 'online'
                            }));
                        }
                    });
                }
            } catch (error) {
                console.error('Error parsing session data:', error);
            }
        }
    }
    
    // Handle messages from clients
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Broadcast to all connected clients based on the event type
            switch (data.type) {
                case 'new_message':
                    broadcastToUser(data.recipientId, data);
                    break;
                case 'new_story':
                    broadcastToAll(data);
                    break;
                case 'new_reaction':
                    broadcastToAll(data);
                    break;
                case 'new_comment':
                    broadcastToAll(data);
                    break;
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    // Handle disconnections
    ws.on('close', () => {
        console.log('Client disconnected');
        
        if (ws.userId) {
            // Check if user has other active connections
            let userStillOnline = false;
            wss.clients.forEach((client) => {
                if (client !== ws && client.userId === ws.userId && client.readyState === WebSocket.OPEN) {
                    userStillOnline = true;
                }
            });
            
            if (!userStillOnline) {
                // Remove user from online users
                onlineUsers.delete(ws.userId);
                
                // Broadcast offline status
                broadcastToAll({
                    type: 'user_status_update',
                    userId: ws.userId,
                    status: 'offline'
                });
            }
        }
    });
});

// Make onlineUsers available to routes
global.onlineUsers = onlineUsers;

// Utility function to broadcast to specific user
function broadcastToUser(userId, data) {
    wss.clients.forEach((client) => {
        if (client.userId === userId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Utility function to broadcast to all connected clients
function broadcastToAll(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// ADMIN STUFF
// Handle upgrade for WebSocket connections - FIX THE UPGRADE HANDLING
server.on('upgrade', function(request, socket, head) {
    // Parse the URL to get the pathname
    const { pathname } = new URL(request.url, 'http://localhost');

    try {
        if (pathname === '/admin') {
            console.log('Admin WebSocket connection requested');
            adminWss.handleUpgrade(request, socket, head, function(ws) {
                adminWss.emit('connection', ws, request);
            });
        } else if (pathname === '/' || pathname === '/ws') {
            console.log('Regular WebSocket connection requested');
            wss.handleUpgrade(request, socket, head, function(ws) {
                wss.emit('connection', ws, request);
            });
        } else {
            // No handler matched
            console.log(`No WebSocket handler for path: ${pathname}`);
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
        }
    } catch (err) {
        console.error('Error during WebSocket upgrade:', err);
        if (!socket.destroyed) {
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    }
});

// Handle admin WebSocket connections
adminWss.on('connection', (ws, req) => {
    console.log('Admin client connected');
    
    // Extract user ID from session cookie (same as regular WebSocket)
    const cookies = req.headers.cookie;
    if (cookies) {
        const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
        if (sessionCookie) {
            try {
                // Extract user ID from session
                const sessionData = Buffer.from(sessionCookie.split('=')[1], 'base64').toString('utf-8');
                const sessionJson = JSON.parse(sessionData.split('.')[0]);
                const userId = sessionJson.passport.user;
                
                if (userId) {
                    // Verify the user is an admin
                    User.findById(userId).then(user => {
                        if (user && user.role === 'admin') {
                            console.log(`Admin WebSocket authenticated for admin ${user.name}`);
                            ws.userId = userId;
                            ws.isAdmin = true;
                            
                            // Send success auth result
                            ws.send(JSON.stringify({
                                type: 'auth_result',
                                success: true
                            }));
                        } else {
                            console.log('Non-admin tried to connect to admin WebSocket');
                            ws.send(JSON.stringify({
                                type: 'auth_result',
                                success: false,
                                message: 'Admin privileges required'
                            }));
                            ws.close();
                        }
                    }).catch(error => {
                        console.error('Error verifying admin:', error);
                        ws.close();
                    });
                }
            } catch (error) {
                console.error('Error parsing session data for admin WebSocket:', error);
                ws.close();
            }
        } else {
            ws.close();
        }
    } else {
        ws.close();
    }
    
    // Handle messages from admin clients
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Only process messages if the connection is authenticated as admin
            if (!ws.isAdmin) {
                console.log('Ignoring message from non-admin connection');
                return;
            }
            
            // Process admin-specific commands
            switch (data.type) {
                case 'ban_user':
                    handleBanUser(data, ws);
                    break;
                case 'unban_user':
                    handleUnbanUser(data, ws);
                    break;
                case 'suspend_user':
                    handleSuspendUser(data, ws);
                    break;
                default:
                    console.log('Unknown admin command:', data.type);
            }
        } catch (error) {
            console.error('Admin WebSocket message error:', error);
        }
    });
    
    // Handle admin disconnection
    ws.on('close', () => {
        console.log('Admin client disconnected');
    });
});

// Admin command handlers
async function handleBanUser(data, ws) {
    try {
        const { userId, reason } = data;
        
        // Update user status in database
        const user = await User.findByIdAndUpdate(
            userId, 
            { status: 'banned' },
            { new: true }
        );
        
        if (!user) {
            return;
        }
        
        console.log(`User ${user.name} banned by admin ${ws.userId}`);
        
        // Notify other admins
        adminWss.clients.forEach((client) => {
            if (client.isAdmin && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'user_banned',
                    userId: userId,
                    username: user.name,
                    reason: reason,
                    adminId: ws.userId
                }));
            }
        });
        
        // Notify the banned user if they're online
        wss.clients.forEach((client) => {
            if (client.userId === userId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'account_banned',
                    reason: reason || 'Your account has been banned by an administrator.'
                }));
            }
        });
        
        // Add security log
        addSecurityLog({
            action: 'user_banned',
            targetUserId: userId,
            adminId: ws.userId,
            details: reason || 'No reason provided',
            severity: 'critical'
        });
        
    } catch (error) {
        console.error('Error banning user:', error);
    }
}

async function handleUnbanUser(data, ws) {
    try {
        const { userId } = data;
        
        // Update user status in database
        const user = await User.findByIdAndUpdate(
            userId, 
            { status: 'active' },
            { new: true }
        );
        
        if (!user) {
            return;
        }
        
        console.log(`User ${user.name} unbanned by admin ${ws.userId}`);
        
        // Notify other admins
        adminWss.clients.forEach((client) => {
            if (client.isAdmin && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'user_unbanned',
                    userId: userId,
                    username: user.name,
                    adminId: ws.userId
                }));
            }
        });
        
        // Add security log
        addSecurityLog({
            action: 'user_unbanned',
            targetUserId: userId,
            adminId: ws.userId,
            details: 'User account reactivated',
            severity: 'warning'
        });
        
    } catch (error) {
        console.error('Error unbanning user:', error);
    }
}

async function handleSuspendUser(data, ws) {
    try {
        const { userId, reason, duration } = data;
        
        // Special case: if duration is "0h" or empty, treat as immediate reactivation
        if (!duration || duration === '0h' || duration === '0m' || duration === '0d') {
            // Reactivate user immediately
            const user = await User.findByIdAndUpdate(
                userId, 
                { status: 'active' },
                { new: true }
            );
            
            if (!user) return;
            
            console.log(`User ${user.name} reactivated by admin ${ws.userId}`);
            
            // Notify admins
            adminWss.clients.forEach((client) => {
                if (client.isAdmin && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'user_reactivated',
                        userId: userId,
                        username: user.name,
                        adminId: ws.userId
                    }));
                }
            });
            
            // Add security log
            addSecurityLog({
                action: 'user_reactivated',
                targetUserId: userId,
                adminId: ws.userId,
                details: reason || 'User reactivated by admin',
                severity: 'info'
            });
            
            return;
        }
        
        // Parse the duration (e.g., "24h", "3d", "30m")
        let suspensionMs = 0;
        if (duration) {
            const unit = duration.slice(-1);
            const value = parseInt(duration.slice(0, -1));
            
            if (!isNaN(value)) {
                switch (unit) {
                    case 'h': // Hours
                        suspensionMs = value * 60 * 60 * 1000;
                        break;
                    case 'd': // Days
                        suspensionMs = value * 24 * 60 * 60 * 1000;
                        break;
                    case 'm': // Minutes
                        suspensionMs = value * 60 * 1000;
                        break;
                }
            }
        }
        
        // Calculate when suspension ends
        const suspensionEndsAt = new Date(Date.now() + suspensionMs);
        
        // Update user status in database with suspension end time
        const user = await User.findByIdAndUpdate(
            userId, 
            { 
                status: 'suspended',
                suspensionEndsAt: suspensionEndsAt
            },
            { new: true }
        );
        
        if (!user) {
            return;
        }
        
        console.log(`User ${user.name} suspended by admin ${ws.userId} until ${suspensionEndsAt}`);
        
        // Notify other admins
        adminWss.clients.forEach((client) => {
            if (client.isAdmin && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'user_suspended',
                    userId: userId,
                    username: user.name,
                    reason: reason,
                    duration: duration,
                    suspensionEndsAt: suspensionEndsAt,
                    adminId: ws.userId
                }));
            }
        });
        
        // Notify the suspended user if they're online
        wss.clients.forEach((client) => {
            if (client.userId === userId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'account_suspended',
                    reason: reason || 'Your account has been temporarily suspended.',
                    duration: duration || '24h',
                    suspensionEndsAt: suspensionEndsAt
                }));
            }
        });
        
        // Add security log
        addSecurityLog({
            action: 'user_suspended',
            targetUserId: userId,
            adminId: ws.userId,
            details: `${reason || 'No reason provided'} (Duration: ${duration || '24h'})`,
            severity: 'warning'
        });
        
        // Schedule automatic reactivation when suspension period ends
        setTimeout(async () => {
            try {
                // Check if the user is still suspended (they might have been banned or manually reactivated)
                const currentUser = await User.findById(userId);
                if (currentUser && currentUser.status === 'suspended') {
                    // Reactivate the user
                    const updatedUser = await User.findByIdAndUpdate(
                        userId,
                        { status: 'active', suspensionEndsAt: null },
                        { new: true }
                    );
                    
                    console.log(`User ${updatedUser.name} automatically reactivated after suspension period`);
                    
                    // Notify admins about the automatic reactivation
                    adminWss.clients.forEach((client) => {
                        if (client.isAdmin && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'user_reactivated',
                                userId: userId,
                                username: updatedUser.name,
                                reason: 'Suspension period expired',
                                automatic: true
                            }));
                        }
                    });
                    
                    // Add security log
                    addSecurityLog({
                        action: 'user_auto_reactivated',
                        targetUserId: userId,
                        details: 'Suspension period expired',
                        severity: 'info'
                    });
                }
            } catch (error) {
                console.error('Error automatically reactivating user after suspension:', error);
            }
        }, suspensionMs);
        
    } catch (error) {
        console.error('Error suspending user:', error);
    }
}

// Function to add security logs
async function addSecurityLog(logData) {
    try {
        // In a real implementation, you would save this to a SecurityLogs collection
        console.log('Security log:', logData);
        
        // Broadcast to admins
        adminWss.clients.forEach((client) => {
            if (client.isAdmin && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'security_alert',
                    ...logData,
                    timestamp: new Date()
                }));
            }
        });
    } catch (error) {
        console.error('Error adding security log:', error);
    }
}

// Import and use routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/messages', require('./routes/messagesRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/posts', postRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/admin', require('./routes/adminRoute'));

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));

// Catch-all route to handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}/login.html`);
});