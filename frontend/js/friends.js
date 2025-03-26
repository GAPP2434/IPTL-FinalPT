document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const userSearchInput = document.getElementById('userSearchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('search-results');
    const followersList = document.getElementById('followers-list');
    const followingList = document.getElementById('following-list');
    
    // State
    let currentUser = { _id: null };
    
    // Initialize
    function init() {
        setupEventListeners();
        loadFollowers();
        loadFollowing();
        
        // Check if discover tab is active and load recommended users
        const discoverTab = document.querySelector('.tab-button[data-tab="discover"]');
        if (discoverTab && discoverTab.classList.contains('active')) {
            loadRecommendedUsers();
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Add active class to clicked tab
                button.classList.add('active');
                const tabId = button.dataset.tab + '-tab';
                document.getElementById(tabId).classList.add('active');
                
                // Load recommended users when discover tab is clicked
                if (button.dataset.tab === 'discover') {
                    loadRecommendedUsers();
                }
            });
        });
    }

    function loadRecommendedUsers() {
        // Show loading state
        searchResults.innerHTML = '<div class="loading-message">Finding people you might want to follow...</div>';
        
        fetch('/api/users/recommended', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load recommended users');
            }
            return response.json();
        })
        .then(users => {
            renderSearchResults(users);
        })
        .catch(error => {
            console.error('Error loading recommended users:', error);
            searchResults.innerHTML = '<div class="no-results">No recommendations available right now.</div>';
        });
    }
    
    // Load followers
    function loadFollowers() {
        showLoading();
        
        fetch('/api/users/followers', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load followers');
            }
            return response.json();
        })
        .then(followers => {
            hideLoading();
            renderFollowers(followers);
        })
        .catch(error => {
            console.error('Error loading followers:', error);
            hideLoading();
            
            // Show error message
            showMessage('Failed to load followers. Please try again later.', 'error');
        });
    }
    
    // Load following
    function loadFollowing() {
        fetch('/api/users/following', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load following');
            }
            return response.json();
        })
        .then(following => {
            renderFollowing(following);
        })
        .catch(error => {
            console.error('Error loading following:', error);
            
            // Show error message
            showMessage('Failed to load following. Please try again later.', 'error');
        });
    }
    
    // Render followers list
    function renderFollowers(followers) {
        if (followers.length === 0) {
            followersList.innerHTML = '<div class="no-friends-message">No Followers Yet</div>';
            return;
        }
        
        followersList.innerHTML = '';
        
        followers.forEach(follower => {
            const followerElement = createUserElement(follower, 'follower');
            followersList.appendChild(followerElement);
        });
    }
    
    // Render following list
    function renderFollowing(following) {
        if (following.length === 0) {
            followingList.innerHTML = '<div class="no-friends-message">You\'re not following anyone yet</div>';
            return;
        }
        
        followingList.innerHTML = '';
        
        following.forEach(user => {
            const userElement = createUserElement(user, 'following');
            followingList.appendChild(userElement);
        });
    }
    
    // Create user element
    function createUserElement(user, type) {
        const div = document.createElement('div');
        div.classList.add('friend-item');
        
        let actionButton = '';
        if (type === 'follower') {
            // Check if we're following this follower
            actionButton = user.youFollow ? 
                `<button class="unfollow-button" data-user-id="${user._id}">Unfollow</button>` :
                `<button class="follow-button" data-user-id="${user._id}">Follow</button>`;
        } else if (type === 'following') {
            actionButton = `<button class="unfollow-button" data-user-id="${user._id}">Unfollow</button>`;
        } else if (type === 'search') {
            actionButton = user.youFollow ? 
                `<button class="unfollow-button" data-user-id="${user._id}">Unfollow</button>` :
                `<button class="follow-button" data-user-id="${user._id}">Follow</button>`;
        }
        
        div.innerHTML = `
            <div class="friend-profile-link" data-user-id="${user._id}">
                <img src="${user.profilePicture}" alt="${user.name}" class="friend-avatar">
                <div class="friend-info">
                    <div class="friend-name">${user.name}</div>
                    <div class="friend-bio">${user.bio || ''}</div>
                </div>
            </div>
            <div class="friend-action">
                ${actionButton}
            </div>
        `;
        
        // Add event listeners for follow/unfollow buttons
        const followButton = div.querySelector('.follow-button');
        const unfollowButton = div.querySelector('.unfollow-button');
        
        if (followButton) {
            followButton.addEventListener('click', () => {
                followUser(user._id, div);
            });
        }
        
        if (unfollowButton) {
            unfollowButton.addEventListener('click', () => {
                unfollowUser(user._id, div);
            });
        }
        
        // Add event listener for profile link
        const profileLink = div.querySelector('.friend-profile-link');
        if (profileLink) {
            profileLink.addEventListener('click', () => {
                navigateToUserProfile(user._id);
            });
        }
        
        return div;
    }
    
    function navigateToUserProfile(userId) {
        window.location.href = `profile.html?userId=${userId}`;
    }
    
    // Search Function
    window.searchUtils.setupSearch({
        inputElement: userSearchInput,
        buttonElement: searchButton,
        endpoint: '/api/users/search',
        renderResults: (users) => {
            renderSearchResults(users);
        },
        clearResults: () => {
            searchResults.innerHTML = '';
        }
    });

    // Render search results
    function renderSearchResults(users) {
        searchResults.innerHTML = '';
        
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }
        
        users.forEach(user => {
            const userElement = createUserElement(user, 'search');
            searchResults.appendChild(userElement);
        });
    }
    
    // Follow user
    function followUser(userId, elementToUpdate) {
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
            // Update UI
            const followButton = elementToUpdate.querySelector('.follow-button');
            if (followButton) {
                const unfollowButton = document.createElement('button');
                unfollowButton.classList.add('unfollow-button');
                unfollowButton.dataset.userId = userId;
                unfollowButton.textContent = 'Unfollow';
                
                unfollowButton.addEventListener('click', () => {
                    unfollowUser(userId, elementToUpdate);
                });
                
                followButton.replaceWith(unfollowButton);
            }
            
            // Show success message
            showMessage('You are now following this user', 'success');
            
            // Reload following list
            loadFollowing();
        })
        .catch(error => {
            console.error('Error following user:', error);
            showMessage('Failed to follow user. Please try again.', 'error');
        });
    }
    
    // Unfollow user
    function unfollowUser(userId, elementToUpdate) {
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
            // Update UI
            const unfollowButton = elementToUpdate.querySelector('.unfollow-button');
            if (unfollowButton) {
                const followButton = document.createElement('button');
                followButton.classList.add('follow-button');
                followButton.dataset.userId = userId;
                followButton.textContent = 'Follow';
                
                followButton.addEventListener('click', () => {
                    followUser(userId, elementToUpdate);
                });
                
                unfollowButton.replaceWith(followButton);
            }
            
            // Show success message
            showMessage('You have unfollowed this user', 'success');
            
            // Reload following list
            loadFollowing();
        })
        .catch(error => {
            console.error('Error unfollowing user:', error);
            showMessage('Failed to unfollow user. Please try again.', 'error');
        });
    }
    
    // Show loading indicator
    function showLoading() {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = 'flex';
        }
    }
    
    // Hide loading indicator
    function hideLoading() {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }
    
    // Show message
    function showMessage(message, type) {
        const messageContainer = document.getElementById('message-container');
        const messageElement = document.getElementById('message');
        
        messageElement.textContent = message;
        messageElement.className = 'message ' + type;
        messageContainer.style.display = 'block';
        
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }
    
    // Get current user info
    fetch('/api/auth/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(user => {
        currentUser = user;
        init();
    })
    .catch(error => {
        console.error('Error fetching user info:', error);
        init(); // Initialize anyway
    });
});