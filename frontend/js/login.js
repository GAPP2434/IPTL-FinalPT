document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    // Check if user is already logged in
    if (isLoggedIn()) {
        redirectToHome();
    }
    
    // Handle form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }
        
        // Send login request to server
        fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Invalid credentials');
                });
            }
            return response.json();
        })
        .then(data => {
            // Store token in localStorage
            localStorage.setItem('token', data.token);
            
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to home page after 1 second
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        })
        .catch(error => {
            showMessage(error.message || 'Login failed. Please check your credentials.', 'error');
        });
    });
    
    // Message display function
    function showMessage(message, type) {
        const messageContainer = document.getElementById('message-container');
        const messageElement = document.getElementById('message');
        
        messageElement.textContent = message;
        messageElement.className = 'message ' + type;
        messageContainer.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }
});

// Google Sign-In handler
function handleGoogleSignIn(response) {
    console.log("Google response received:", response);
    
    if (!response || !response.credential) {
        showMessage('Google authentication failed: Invalid response', 'error');
        return;
    }
    
    try {
        // Decode the JWT credential returned from Google
        const credential = parseJwt(response.credential);
        
        console.log("Google Sign-In successful", credential);
        
        // Send Google credential to your backend for verification/login
        fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                token: response.credential,
                email: credential.email,
                name: credential.name || credential.email.split('@')[0],
                picture: credential.picture
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Google authentication failed on server');
                });
            }
            return response.json();
        })
        .then(data => {
            // Store token in localStorage
            localStorage.setItem('token', data.token);
            
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to home page after 1 second
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        })
        .catch(error => {
            showMessage(error.message || 'Google authentication failed', 'error');
            console.error('Google auth server error:', error);
        });
    } catch (error) {
        showMessage('Failed to process Google authentication', 'error');
        console.error('Google auth processing error:', error);
    }
}

// Helper function to parse JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) throw new Error('Invalid token format');
        
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT token:', error);
        return null;
    }
}

// Check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem('token');
    return !!token;
}

// Redirect to home page
function redirectToHome() {
    window.location.href = 'index.html';
}

// Message display function for Google Sign-In
function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    const messageElement = document.getElementById('message');
    
    messageElement.textContent = message;
    messageElement.className = 'message ' + type;
    messageContainer.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}

// Update the Google Sign-In button click handler
document.getElementById('googleSignInBtn').addEventListener('click', function(e) {
    e.preventDefault();
    
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    
    // Set up a global flag to detect successful authentication
    window.googleAuthSuccess = false;
    
    // Parameters for the OAuth 2.0 request
    const params = {
        client_id: '712516669615-rg0nuespsi624h26glc18hia85g0emj2.apps.googleusercontent.com',
        redirect_uri: window.location.origin + '/oauth-callback.html',
        response_type: 'token',
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        include_granted_scopes: 'true',
        state: 'pass-through-value'
    };
    
    // Build the URL with query parameters
    const url = oauth2Endpoint + '?' + Object.keys(params).map(key => 
        key + '=' + encodeURIComponent(params[key])
    ).join('&');
    
    // Open the OAuth 2.0 endpoint in a popup window
    const popup = window.open(url, 'googleSignIn', 'width=600,height=700');
    
    // Track if authentication has been completed
    let authCompleted = false;
    
    // Check for successful authentication and popup closure
    const authCheckInterval = setInterval(() => {
        // First check if our success flag was set
        if (window.googleAuthSuccess === true) {
            clearInterval(authCheckInterval);
            authCompleted = true;
            window.googleAuthSuccess = false; // Reset flag
            
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to home page after success
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
        // Then check if popup was closed
        else if (popup.closed) {
            clearInterval(authCheckInterval);
            
            // Only check for token if not already completed
            if (!authCompleted) {
                // Check if token was stored directly
                if (localStorage.getItem('token')) {
                    showMessage('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }
            }
        }
    }, 500); // Check more frequently for better UX
});