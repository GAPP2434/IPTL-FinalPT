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

// Check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem('token');
    return !!token;
}

// Redirect to home page
function redirectToHome() {
    window.location.href = 'index.html';
}