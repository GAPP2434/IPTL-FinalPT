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
    const token = localStorage.getItem('token');
    
    if (!token) {
        // No token found, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    // Optional: Verify token with server
    // This adds security but requires an API endpoint
    /* 
    fetch('/api/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Token invalid');
        }
        return response.json();
    })
    .catch(error => {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
    */
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}