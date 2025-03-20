document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    // Check if user is already logged in
    if (isLoggedIn()) {
        redirectToHome();
    }
    
   // Update the login form submission handler
// Remove JWT token storage from login form submission
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
});

// Update this function to use session-based auth check
function isLoggedIn() {
    // Make a synchronous request to check auth status
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/auth/user', false); // false makes it synchronous
    xhr.withCredentials = true;
    
    try {
        xhr.send();
        return xhr.status === 200;
    } catch (e) {
        return false;
    }
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
    
    // Redirect to the backend Google auth route
    window.location.href = '/api/auth/google';
});