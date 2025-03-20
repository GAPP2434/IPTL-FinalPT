const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = express();
const port = 5500;
const cookieSession = require('cookie-session');
const passport = require('passport');
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

// Import and use routes
app.use('/api/auth', require('./routes/auth'));

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../frontend/uploads')));

// Catch-all route to handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}/login.html`);
});