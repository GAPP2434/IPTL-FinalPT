document.addEventListener('DOMContentLoaded', function() {
    // Check if the current page is login.html or register.html
    const currentPath = window.location.pathname;
    const publicPaths = ['/login.html', '/register.html'];
    const isPublicPage = publicPaths.some(path => currentPath.endsWith(path));
    
    // If not on a public page, check authentication
    if (!isPublicPage) {
        checkAuthentication();
    }
    
    // Add logout functionality if logout button exists
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});


// Check if the user is authenticated
function checkAuthentication() {
    console.log('checkAuthentication function called');
    fetch('/api/auth/user?_=' + new Date().getTime(), {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Not authenticated');
        }
        return response.json();
    })
    .then(user => {
        console.log('Authenticated as:', user);
        
        // Add this line to always run encryption setup
        if (window.messageEncryption) checkEncryptionSetup();
    })
    .catch(error => {
        console.error('Auth error:', error);
        window.location.href = 'login.html';
    });
}

// Add the checkEncryptionSetup function here
function checkEncryptionSetup() {
    fetch('/api/auth/user', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.needsEncryptionSetup && window.messageEncryption) {
                console.log("Setting up encryption for user...");
                window.messageEncryption.initialize()
                    .then(() => console.log("Encryption setup complete"))
                    .catch(err => console.error("Encryption setup failed:", err));
            } else if (window.messageEncryption && !window.location.pathname.includes('login.html')) {
                // If not a new user but we're on a page that might use encryption,
                // make sure encryption is initialized
                console.log("Ensuring encryption is initialized");
                window.messageEncryption.initialize()
                    .then(() => console.log("Encryption initialized"))
                    .catch(err => console.error("Encryption initialization failed:", err));
            }
        })
        .catch(err => console.error("Error checking encryption status:", err));
}

// Logout function
function logout() {
    fetch('/api/auth/logout', {
        credentials: 'include'
    })
    .then(() => {
        window.location.href = 'login.html';
    })
    .catch(error => {
        console.error('Logout error:', error);
        window.location.href = 'login.html';
    });
}