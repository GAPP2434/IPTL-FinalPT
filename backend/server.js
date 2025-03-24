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
global.wss = wss;
require("./passportSetup");

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
mongoose.connect(process.env.MONGO_URI)
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
    
    // Extract user ID from session cookie
    const cookies = req.headers.cookie;
    if (cookies) {
        const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
        if (sessionCookie) {
            try {
                // Parse session cookie to extract user ID - this is simplified
                // In a real app, you'd need to decode the session properly
                const session = JSON.parse(Buffer.from(sessionCookie.split('=')[1], 'base64').toString());
                if (session.passport && session.passport.user) {
                    ws.userId = session.passport.user;
                    console.log('WebSocket authenticated for user:', ws.userId);
                }
            } catch (err) {
                console.error('Error parsing session:', err);
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
    });
});

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
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/messages', require('./routes/messagesRoutes'));

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