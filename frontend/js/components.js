document.addEventListener('DOMContentLoaded', function() {
    // Load header - update path to point to root instead of components folder
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('header.header').innerHTML = data;
            
            // Highlight the active page in the navigation
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'messages.html') {
                document.querySelector('.messages-button').classList.add('active');
            } else if (currentPage === 'index.html' || currentPage === '') {
                document.querySelector('.home-button').classList.add('active');
            } else if (currentPage === 'profile.html') {
                document.querySelector('.profile-button').classList.add('active');
            }
            
            // Add event listeners for logout and profile buttons
            document.getElementById('logoutButton').addEventListener('click', function() {
                // Handle logout
                fetch('/api/auth/logout', {
                    credentials: 'include'
                })
                .then(() => {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                })
                .catch(error => {
                    console.error('Logout error:', error);
                    window.location.href = 'login.html';
                });
            });
            
            document.getElementById('profileButton').addEventListener('click', function() {
                document.getElementById('profileDropdown').classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            window.addEventListener('click', function(event) {
                if (!event.target.matches('.profile-button')) {
                    const dropdowns = document.getElementsByClassName('dropdown-content');
                    for (let i = 0; i < dropdowns.length; i++) {
                        const openDropdown = dropdowns[i];
                        if (openDropdown.classList.contains('show')) {
                            openDropdown.classList.remove('show');
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Failed to load header:', error);
        });
    
    // Load footer - update path to point to root instead of components folder
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('footer.footer').innerHTML = data;
        })
        .catch(error => {
            console.error('Failed to load footer:', error);
        });
});

function followUser(userId, button, callbacks = {}) {
    fetch('/api/users/follow', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to follow user');
        }
        return response.json();
    })
    .then(data => {
        // Create unfollow button to replace the follow button
        const unfollowButton = document.createElement('button');
        unfollowButton.classList.add('follow-button', 'unfollow-button');
        unfollowButton.dataset.userId = userId;
        unfollowButton.textContent = 'Unfollow';
        
        unfollowButton.addEventListener('click', function() {
            unfollowUser(userId, this, callbacks);
        });
        
        button.replaceWith(unfollowButton);
        
        // Show success message
        showMessage('You are now following this user', 'success');
        
        // Call the success callback if provided
        if (callbacks.onSuccess) {
            callbacks.onSuccess(data);
        }
    })
    .catch(error => {
        console.error('Error following user:', error);
        showMessage('Failed to follow user. Please try again.', 'error');
        
        if (callbacks.onError) {
            callbacks.onError(error);
        }
    });
}

// Function to unfollow a user
function unfollowUser(userId, button, callbacks = {}) {
    fetch('/api/users/unfollow', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to unfollow user');
        }
        return response.json();
    })
    .then(data => {
        // Create follow button
        const followButton = document.createElement('button');
        followButton.classList.add('follow-button');
        followButton.dataset.userId = userId;
        followButton.textContent = 'Follow';
        
        followButton.addEventListener('click', function() {
            followUser(userId, this, callbacks);
        });
        
        button.replaceWith(followButton);
        
        // Show success message
        showMessage('You have unfollowed this user', 'success');
        
        // Call the success callback if provided
        if (callbacks.onSuccess) {
            callbacks.onSuccess(data);
        }
    })
    .catch(error => {
        console.error('Error unfollowing user:', error);
        showMessage('Failed to unfollow user. Please try again.', 'error');
        
        if (callbacks.onError) {
            callbacks.onError(error);
        }
    });
}

// Function to show messages
function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        console.log(message); // Fallback if no message container
        return;
    }
    
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = 'message ' + type;
    messageContainer.style.display = 'block';
    
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}

// Make functions globally available
window.userInteractions = {
    followUser,
    unfollowUser,
    showMessage
};

// Reusable debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Reusable search function
function setupSearch(options) {
    const {
        inputElement,       // Search input element
        buttonElement,      // Search button element
        endpoint,           // API endpoint to call
        minChars = 2,       // Minimum characters to trigger search
        debounceTime = 300, // Debounce time in ms
        renderResults,      // Function to render results
        clearResults        // Function to clear results
    } = options;
    
    // Input event with debounce
    inputElement.addEventListener('input', debounce(function() {
        const query = inputElement.value.trim();
        if (query.length >= minChars) {
            searchUsers(query);
        } else if (query.length === 0) {
            clearResults();
        }
    }, debounceTime));
    
    // Button click
    if (buttonElement) {
        buttonElement.addEventListener('click', () => {
            const query = inputElement.value.trim();
            if (query) {
                searchUsers(query);
            }
        });
    }
    
    // Enter key press
    inputElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = inputElement.value.trim();
            if (query) {
                searchUsers(query);
            }
        }
    });
    
    // Search function
    function searchUsers(query) {
        if (!query.trim()) return;
        
        fetch(`${endpoint}?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Search failed');
            }
            return response.json();
        })
        .then(results => {
            renderResults(results);
        })
        .catch(error => {
            console.error('Error searching users:', error);
            // Let the component handle the error display
            renderResults([]);
        });
    }
}

// Make these available globally
window.searchUtils = {
    debounce,
    setupSearch
};

// Check if the user is an admin and show admin panel button
function checkAdminAccess() {
    fetch('/api/auth/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(user => {
        const adminButton = document.getElementById('adminPanelButton');
        if (adminButton) {
            adminButton.style.display = user && user.role === 'admin' ? 'inline-block' : 'none';
        }
    })
    .catch(error => {
        console.error('Error checking admin access:', error);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(checkAdminAccess, 100); // Small delay to ensure header has loaded
});