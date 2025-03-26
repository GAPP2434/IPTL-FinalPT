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
    
    function checkElementsExist() {
        console.log("Checking critical DOM elements...");
        const elements = [
            { id: 'requests-tab', desc: 'Requests Tab' },
            { id: 'sent-requests-list', desc: 'Sent Requests List' },
            { id: 'received-requests-list', desc: 'Received Requests List' },
            { id: 'followers-tab', desc: 'Followers Tab' },
            { id: 'discover-tab', desc: 'Discover Tab' },
            { id: 'following-tab', desc: 'Following Tab' }
        ];
        
        let allExist = true;
        elements.forEach(el => {
            const domElement = document.getElementById(el.id);
            console.log(`${el.desc} (${el.id}): ${domElement ? 'exists' : 'MISSING'}`);
            if (!domElement) allExist = false;
        });
        
        return allExist;
    }

    // Initialize
    function init() {
        const elementsExist = checkElementsExist();
        if (!elementsExist) {
            console.error("Some critical elements are missing from the DOM");
        }
        setupEventListeners();
        loadFollowers();
        loadFollowing();
        updateRequestsBadge(); // Add this line
        
        // Check if discover tab is active and load recommended users
        const discoverTab = document.querySelector('.tab-button[data-tab="discover"]');
        if (discoverTab && discoverTab.classList.contains('active')) {
            loadRecommendedUsers();
        }
        
        // Check if requests tab is active
        const requestsTab = document.querySelector('.tab-button[data-tab="requests"]');
        if (requestsTab && requestsTab.classList.contains('active')) {
            loadFollowRequests();
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Show panel loading state for requests tab
                if (button.dataset.tab === 'requests') {
                    const receivedList = document.getElementById('received-requests-list');
                    const sentList = document.getElementById('sent-requests-list');
                    
                    if (receivedList) receivedList.innerHTML = '<div class="loading-message">Loading requests...</div>';
                    if (sentList) sentList.innerHTML = '<div class="loading-message">Loading requests...</div>';
                }
                
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Add active class to clicked tab
                button.classList.add('active');
                const tabId = button.dataset.tab + '-tab';
                const tabPanel = document.getElementById(tabId);
                
                if (tabPanel) {
                    tabPanel.classList.add('active');
                    
                    // Load data based on tab
                    if (button.dataset.tab === 'discover') {
                        // Clear search input
                        userSearchInput.value = '';
                        
                        // Check if search input is empty
                        if (!userSearchInput.value.trim()) {
                            loadRecommendedUsers();
                        }
                        // Check if we need to refresh the discover tab
                        else if (button.dataset.needsRefresh === 'true') {
                            loadRecommendedUsers();
                            button.dataset.needsRefresh = 'false';
                        }
                    } else if (button.dataset.tab === 'requests') {
                        // Always reload requests when switching to requests tab
                        loadFollowRequests();
                    }
                } else {
                    console.error(`Tab panel with id ${tabId} not found`);
                }
            });
        });
    }

    function loadFollowRequests() {
        loadReceivedRequests();
        loadSentRequests();
    }

    // Load received follow requests
    function loadReceivedRequests() {
        showLoading();
        
        fetch('/api/users/follow-requests/received', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load follow requests');
            }
            return response.json();
        })
        .then(requests => {
            hideLoading();
            renderReceivedRequests(requests);
        })
        .catch(error => {
            console.error('Error loading follow requests:', error);
            hideLoading();
            showMessage('Failed to load follow requests. Please try again later.', 'error');
        });
    }

    // Load sent follow requests
    function loadSentRequests() {
        console.log("Loading sent follow requests...");
        
        fetch('/api/users/follow-requests/sent', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load sent requests');
            }
            return response.json();
        })
        .then(requests => {
            console.log("Received sent requests:", requests);
            renderSentRequests(requests);
        })
        .catch(error => {
            console.error('Error loading sent requests:', error);
            showMessage('Failed to load sent requests. Please try again later.', 'error');
        });
    }

    // Render received follow requests
    function renderReceivedRequests(requests) {
        const requestsList = document.getElementById('received-requests-list');
        
        if (!requestsList) return;
        
        if (requests.length === 0) {
            requestsList.innerHTML = '<div class="no-requests-message">No pending follow requests</div>';
            return;
        }
        
        requestsList.innerHTML = '';
        
        requests.forEach(user => {
            const requestElement = document.createElement('div');
            requestElement.classList.add('request-item');
            requestElement.dataset.userId = user._id;
            
            // Add private profile indicator if applicable
            const privateIndicator = user.isPrivateProfile ? 
                '<i class="fas fa-lock private-profile-icon" title="Private Profile"></i>' : '';
            
            requestElement.innerHTML = `
                <div class="friend-profile-link" data-user-id="${user._id}">
                    <img src="${user.profilePicture}" alt="${user.name}" class="friend-avatar">
                    <div class="friend-info">
                        <div class="friend-name">
                            ${user.name}
                            ${privateIndicator}
                        </div>
                        <div class="friend-bio">${user.bio || ''}</div>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="accept-button" data-user-id="${user._id}">Accept</button>
                    <button class="decline-button" data-user-id="${user._id}">Decline</button>
                </div>
            `;
            
            // Add click events
            const profileLink = requestElement.querySelector('.friend-profile-link');
            if (profileLink) {
                profileLink.addEventListener('click', () => {
                    navigateToUserProfile(user._id);
                });
            }
            
            const acceptButton = requestElement.querySelector('.accept-button');
            if (acceptButton) {
                acceptButton.addEventListener('click', () => {
                    acceptFollowRequest(user._id, requestElement);
                });
            }
            
            const declineButton = requestElement.querySelector('.decline-button');
            if (declineButton) {
                declineButton.addEventListener('click', () => {
                    declineFollowRequest(user._id, requestElement);
                });
            }
            
            requestsList.appendChild(requestElement);
        });
    }

    // Render sent follow requests
    function renderSentRequests(requests) {
        const requestsList = document.getElementById('sent-requests-list');
        
        if (!requestsList) {
            console.error("sent-requests-list element not found in the DOM");
            return;
        }
        console.log("Rendering sent requests:", requests);
        if (!Array.isArray(requests) || requests.length === 0) {
            requestsList.innerHTML = '<div class="no-requests-message">No sent requests</div>';
            return;
        }
        
        requestsList.innerHTML = '';
        
        requests.forEach(user => {
            if (!user || !user._id) {
                console.error("Invalid user object in sent requests:", user);
                return;
            }
            const requestElement = document.createElement('div');
            requestElement.classList.add('request-item');
            requestElement.dataset.userId = user._id;
            
            // Add private profile indicator if applicable
            const privateIndicator = user.isPrivateProfile ? 
                '<i class="fas fa-lock private-profile-icon" title="Private Profile"></i>' : '';
            
            requestElement.innerHTML = `
                <div class="friend-profile-link" data-user-id="${user._id}">
                    <img src="${user.profilePicture}" alt="${user.name}" class="friend-avatar">
                    <div class="friend-info">
                        <div class="friend-name">
                            ${user.name}
                            ${privateIndicator}
                        </div>
                        <div class="friend-bio">${user.bio || ''}</div>
                    </div>
                </div>
                <div class="request-actions">
                    <span class="request-status">Pending</span>
                    <button class="cancel-button" data-user-id="${user._id}">Cancel</button>
                </div>
            `;
            
            // Add click events
            const profileLink = requestElement.querySelector('.friend-profile-link');
            if (profileLink) {
                profileLink.addEventListener('click', () => {
                    navigateToUserProfile(user._id);
                });
            }
            
            const cancelButton = requestElement.querySelector('.cancel-button');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    cancelFollowRequest(user._id, requestElement);
                });
            }
            
            requestsList.appendChild(requestElement);
        });
    }

    // Accept follow request
    function acceptFollowRequest(userId, element) {
        fetch('/api/users/follow-requests/accept', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ userId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to accept request');
            }
            return response.json();
        })
        .then(data => {
            // Remove request from list
            element.remove();
            
            // Check if the list is now empty
            const requestsList = document.getElementById('received-requests-list');
            if (requestsList && requestsList.children.length === 0) {
                requestsList.innerHTML = '<div class="no-requests-message">No pending follow requests</div>';
            }
            
            // Show success message
            showMessage('Follow request accepted', 'success');
            updateRequestsBadge();
            // Refresh followers list
            loadFollowers();
        })
        .catch(error => {
            console.error('Error accepting follow request:', error);
            showMessage('Failed to accept follow request. Please try again.', 'error');
        });
    }

    // Decline follow request
    function declineFollowRequest(userId, element) {
        fetch('/api/users/follow-requests/decline', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ userId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to decline request');
            }
            return response.json();
        })
        .then(data => {
            // Remove request from list
            element.remove();
            
            // Check if the list is now empty
            const requestsList = document.getElementById('received-requests-list');
            if (requestsList && requestsList.children.length === 0) {
                requestsList.innerHTML = '<div class="no-requests-message">No pending follow requests</div>';
            }
            
            // Show success message
            showMessage('Follow request declined', 'success');
            updateRequestsBadge();
        })
        .catch(error => {
            console.error('Error declining follow request:', error);
            showMessage('Failed to decline follow request. Please try again.', 'error');
        });
    }

    // Cancel follow request
    function cancelFollowRequest(userId, element) {
        fetch('/api/users/follow-requests/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ userId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to cancel request');
            }
            return response.json();
        })
        .then(data => {
            // Remove request from list
            element.remove();
            
            // Check if the list is now empty
            const requestsList = document.getElementById('sent-requests-list');
            if (requestsList && requestsList.children.length === 0) {
                requestsList.innerHTML = '<div class="no-requests-message">No sent requests</div>';
            }
            
            // Show success message
            showMessage('Follow request canceled', 'success');
            updateRequestsBadge();
            // Refresh discover tab to show the user again
            const discoverTab = document.querySelector('.tab-button[data-tab="discover"]');
            if (discoverTab) {
                // If we're on the discover tab, reload it immediately
                if (discoverTab.classList.contains('active')) {
                    loadRecommendedUsers();
                }
                // Otherwise, we'll just mark it for reload when user switches to that tab
                else {
                    discoverTab.dataset.needsRefresh = 'true';
                }
            }
        })
        .catch(error => {
            console.error('Error canceling follow request:', error);
            showMessage('Failed to cancel follow request. Please try again.', 'error');
        });
    }

    function loadRecommendedUsers() {
        // Show loading state
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '<div class="loading-message">Finding people you might want to follow...</div>';
        
        // First get users with pending requests to exclude them
        fetch('/api/users/follow-requests/sent', {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(sentRequests => {
            // Get list of user IDs with pending requests
            const pendingRequestIds = sentRequests.map(user => user._id);
            
            // Now fetch recommended users
            return fetch('/api/users/recommended', {
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load recommended users');
                }
                return response.json();
            })
            .then(users => {
                // Filter out users who have pending requests
                const filteredUsers = users.filter(user => !pendingRequestIds.includes(user._id));
                renderSearchResults(filteredUsers);
            });
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
        
        // Create private profile indicator if applicable
        const privateIndicator = user.isPrivateProfile ? 
            '<i class="fas fa-lock private-profile-icon" title="Private Profile"></i>' : '';
        
        div.innerHTML = `
            <div class="friend-profile-link" data-user-id="${user._id}">
                <img src="${user.profilePicture}" alt="${user.name}" class="friend-avatar">
                <div class="friend-info">
                    <div class="friend-name">
                        ${user.name}
                        ${privateIndicator}
                    </div>
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
            // Load recommended users instead of just clearing
            loadRecommendedUsers();
        },
        // Add a new callback for empty search
        onEmptySearch: () => {
            loadRecommendedUsers();
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
    
    function updateRequestsBadge() {
        // Start with Promise.all to fetch both sent and received requests
        Promise.all([
            fetch('/api/users/follow-requests/sent', { credentials: 'include' }).then(res => res.json()),
            fetch('/api/users/follow-requests/received', { credentials: 'include' }).then(res => res.json())
        ])
        .then(([sentRequests, receivedRequests]) => {
            // Calculate total number of requests
            const totalRequests = sentRequests.length + receivedRequests.length;
            
            // Update the badge on the requests tab
            const requestsTab = document.querySelector('.tab-button[data-tab="requests"]');
            if (requestsTab) {
                if (totalRequests > 0) {
                    // Add or update badge
                    let badge = requestsTab.querySelector('.requests-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'requests-badge';
                        requestsTab.appendChild(badge);
                    }
                    badge.textContent = totalRequests;
                    badge.title = `${sentRequests.length} sent, ${receivedRequests.length} received`;
                } else {
                    // Remove badge if no requests
                    const badge = requestsTab.querySelector('.requests-badge');
                    if (badge) {
                        badge.remove();
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error updating requests badge:', error);
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
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Failed to follow user');
                });
            }
            return response.json();
        })
        .then(data => {
            // Update UI for successful response
            if (data.requestSent) {
                // Follow request for private profile
                replaceWithRequestSentButton(userId, elementToUpdate);
                showMessage('Follow request sent', 'success');
                
                // Load the sent requests to refresh the Requests tab
                loadSentRequests();
            } else {
                // Regular follow for public profile
                replaceWithUnfollowButton(userId, elementToUpdate);
                showMessage('You are now following this user', 'success');
            }
            
            // Cleanup/reload as needed
            updateRequestsBadge();
            handleDiscoverListUpdate(elementToUpdate);
            loadFollowing();
        })
        .catch(error => {
            console.error('Error following user:', error);
            
            // Handle specific error cases
            if (error.message) {
                if (error.message.includes('request already sent')) {
                    // Request was already sent, update UI accordingly
                    replaceWithRequestSentButton(userId, elementToUpdate);
                    showMessage('A follow request was already sent to this user', 'info');
                    return;
                } else if (error.message.includes('Already following')) {
                    // Already following, update UI accordingly
                    replaceWithUnfollowButton(userId, elementToUpdate);
                    showMessage(error.message, 'info');
                    return;
                }
            }
            
            // Default error case
            showMessage('Failed to follow user. Please try again.', 'error');
        });
        
        // Helper function to replace button with Request Sent
        function replaceWithRequestSentButton(userId, container) {
            const followButton = container.querySelector('.follow-button');
            if (followButton) {
                const requestSentButton = document.createElement('button');
                requestSentButton.classList.add('follow-button', 'request-sent-button');
                requestSentButton.dataset.userId = userId;
                requestSentButton.textContent = 'Request Sent';
                requestSentButton.disabled = true;
                followButton.replaceWith(requestSentButton);
            }
        }
        
        // Helper function to replace button with Unfollow
        function replaceWithUnfollowButton(userId, container) {
            const followButton = container.querySelector('.follow-button');
            if (followButton) {
                const unfollowButton = document.createElement('button');
                unfollowButton.classList.add('unfollow-button');
                unfollowButton.dataset.userId = userId;
                unfollowButton.textContent = 'Unfollow';
                
                unfollowButton.addEventListener('click', () => {
                    unfollowUser(userId, container);
                });
                
                followButton.replaceWith(unfollowButton);
            }
        }
        
        // Helper function to handle discover list updates
        function handleDiscoverListUpdate(container) {
            const discoverTab = document.querySelector('.tab-button[data-tab="discover"]');
            if (discoverTab && discoverTab.classList.contains('active')) {
                // Wait a moment before removing to let the user see what happened
                setTimeout(() => {
                    const parentItem = container.closest('.friend-item');
                    if (parentItem) {
                        parentItem.remove();
                        
                        // Check if the list is now empty
                        checkEmptyDiscoverList();
                    }
                }, 1500);
            }
        }
    }

    function checkEmptyDiscoverList() {
        const searchResults = document.getElementById('search-results');
        if (searchResults && searchResults.children.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No users found. Try a different search.</div>';
        }
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