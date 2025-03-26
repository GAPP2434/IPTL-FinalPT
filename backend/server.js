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
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const onlineUsers = new Set();
global.wss = wss;
require("./passportSetup");
const storiesRoutes = require('./routes/storiesRoutes');

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

// Import and use routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/messages', require('./routes/messagesRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/stories', storiesRoutes);

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