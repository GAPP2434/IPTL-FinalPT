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
    fetch('/api/auth/user', {
        credentials: 'include' // Important! This sends cookies with the request
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Not authenticated');
        }
        return response.json();
    })
    .then(user => {
        // User is authenticated, do nothing
        console.log('Authenticated as:', user);
    })
    .catch(error => {
        console.error('Auth error:', error);
        window.location.href = 'login.html';
    });
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