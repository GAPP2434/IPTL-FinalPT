const express = require('express');
const path = require('path');
const app = express();
const port = 5500;

// Set headers to enable cross-origin isolation
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});