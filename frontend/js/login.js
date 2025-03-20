document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    // Check if user is already logged in
    if (isLoggedIn()) {
        redirectToHome();
    }
    
    // Update the login form submission handler
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include' // Important! This sends cookies with the request
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Login failed');
                });
            }
            return response.json();
        })
        .then(data => {
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

    // Check if user is logged in
    function isLoggedIn() {
        const token = localStorage.getItem('token');
        return !!token;
    }

    // Redirect to home page
    function redirectToHome() {
        window.location.href = 'index.html';
    }

    // Update the Google Sign-In icon click handler
    document.getElementById('googleSignInIcon').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Redirect to the backend Google auth route
        window.location.href = '/api/auth/google';
    });
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