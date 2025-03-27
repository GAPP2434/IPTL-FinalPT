document.addEventListener('DOMContentLoaded', function() {
    // Get current user ID
    window.currentUserId = null;
    fetch('/api/auth/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(user => {
        window.currentUserId = user._id;
    })
    .catch(error => {
        console.error('Error fetching current user:', error);
    });

    // Initialize the profile page
    fetchUserProfile();
    fetchUserPosts();

    // Add click event handler for post menus
    document.addEventListener('click', function(event) {
        // Handle menu icon click
        if (event.target.classList.contains('post-menu-icon')) {
            event.stopPropagation();
            const menu = event.target.closest('.post-menu');
            
            // Close all other open menus first
            document.querySelectorAll('.post-menu.active').forEach(openMenu => {
                if (openMenu !== menu) {
                    openMenu.classList.remove('active');
                }
            });
            
            // Toggle this menu
            menu.classList.toggle('active');
        }
        // Handle menu item clicks
        else if (event.target.closest('.post-menu-item')) {
            const menuItem = event.target.closest('.post-menu-item');
            const postId = menuItem.dataset.postId;
            
            if (menuItem.classList.contains('edit-post')) {
                editPost(postId);
            } else if (menuItem.classList.contains('delete-post')) {
                deletePost(postId);
            } else if (menuItem.classList.contains('block-post')) {
                blockPost(postId);
            } else if (menuItem.classList.contains('report-post')) {
                reportPost(postId);
            }
            
            // Close the menu
            const menu = menuItem.closest('.post-menu');
            menu.classList.remove('active');
        }
        // Close menus when clicking elsewhere
        else if (!event.target.closest('.post-menu')) {
            document.querySelectorAll('.post-menu.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
        
    // Profile Edit Modal Functionality
    const profileEditModal = document.getElementById('profileEditModal');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const closeBtn = document.querySelector('.profile-edit-close');
    const profileEditForm = document.getElementById('profileEditForm');
    const changeCoverBtn = document.getElementById('changeCoverBtn');
    const changeProfilePicBtn = document.getElementById('changeProfilePicBtn');
    const coverPhotoInput = document.getElementById('coverPhotoInput');
    const profilePicInput = document.getElementById('profilePicInput');
    const coverPhotoPreview = document.getElementById('coverPhotoPreview');
    const profilePicPreview = document.getElementById('profilePicPreview');
    const bioInput = document.getElementById('bioInput');
    const followModal = document.getElementById('followModal');
    const followModalClose = document.querySelector('.follow-modal-close');
    const followModalTitle = document.getElementById('followModalTitle');
    const followModalList = document.getElementById('followModalList');
    const followersCountLink = document.getElementById('followersCount');
    const followingCountLink = document.getElementById('followingCount');
    
    // Open modal when Edit Profile button is clicked
    editProfileBtn.addEventListener('click', function() {
        // Get current values for preview
        if (document.querySelector('.cover-photo-section').style.backgroundImage) {
            const coverPhotoUrl = document.querySelector('.cover-photo-section').style.backgroundImage.replace(/url\(['"](.+)['"]\)/, '$1');
            if (coverPhotoUrl) coverPhotoPreview.src = coverPhotoUrl;
        }
        
        profilePicPreview.src = document.getElementById('profilePicture').src;
        bioInput.value = document.getElementById('userBio').textContent !== 'No bio available' ? 
            document.getElementById('userBio').textContent : '';
        
        profileEditModal.style.display = 'block';
    });
    
    // Close modal when X is clicked
    closeBtn.addEventListener('click', function() {
        profileEditModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === profileEditModal) {
            profileEditModal.style.display = 'none';
        }
    });

    // Open followers modal when followers count is clicked
    followersCountLink.addEventListener('click', function(e) {
        e.preventDefault();
        openFollowModal('followers');
    });

    // Open following modal when following count is clicked
    followingCountLink.addEventListener('click', function(e) {
        e.preventDefault();
        openFollowModal('following');
    });

    // Close modal when X is clicked
    followModalClose.addEventListener('click', function() {
        followModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === followModal) {
            followModal.style.display = 'none';
        }
    });
    
    // Trigger file inputs when buttons are clicked
    changeCoverBtn.addEventListener('click', function() {
        coverPhotoInput.click();
    });
    
    changeProfilePicBtn.addEventListener('click', function() {
        profilePicInput.click();
    });
    
    // Preview cover photo when selected
    coverPhotoInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                coverPhotoPreview.src = e.target.result;
            }
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Preview profile picture when selected
    profilePicInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePicPreview.src = e.target.result;
            }
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Handle form submission
    profileEditForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Create FormData object to send to server
        const formData = new FormData();
        formData.append('bio', bioInput.value);
        
        if (coverPhotoInput.files.length > 0) {
            formData.append('coverPhoto', coverPhotoInput.files[0]);
        }
        
        if (profilePicInput.files.length > 0) {
            formData.append('profilePicture', profilePicInput.files[0]);
        }
        
        // Show loading modal if available
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            const loadingText = loadingModal.querySelector('.loading-content p');
            if (loadingText) loadingText.textContent = 'Updating profile...';
            loadingModal.style.display = 'flex';
        }
        
        // Send update to server
        fetch('/api/users/profile', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('API endpoint not found. Make sure the backend server is running.');
                }
                return response.json().then(data => {
                    throw new Error(data.message || 'Failed to update profile');
                }).catch(err => {
                    // If the response isn't JSON, throw a generic error
                    if (err instanceof SyntaxError) {
                        throw new Error('Server response was not valid JSON');
                    }
                    throw err;
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide loading modal
            if (loadingModal) loadingModal.style.display = 'none';
            
            // Update UI with new profile data
            if (data.profilePicture) {
                document.getElementById('profilePicture').src = data.profilePicture;
            }
            
            if (data.bio) {
                document.getElementById('userBio').textContent = data.bio;
            } else {
                document.getElementById('userBio').textContent = 'No bio available';
            }
            
            if (data.coverPhoto) {
                document.querySelector('.cover-photo-section').style.backgroundImage = `url('${data.coverPhoto}')`;
                document.querySelector('.cover-photo-section').style.backgroundSize = 'cover';
                document.querySelector('.cover-photo-section').style.backgroundPosition = 'center';
            }
            
            // Close the modal
            profileEditModal.style.display = 'none';
            
            // Show success message
            showMessage('Profile updated successfully!', 'success');
        })
        .catch(error => {
            // Hide loading modal
            if (loadingModal) loadingModal.style.display = 'none';
            
            console.error('Error updating profile:', error);
            showMessage(error.message || 'Failed to update profile', 'error');
        });
    });
});

// Improve fetchUserPosts with better response handling
function fetchUserPosts() {
    console.log('✅ fetchUserPosts started');
    
    const postsContainer = document.getElementById('userPosts');
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    // Show initial loading message
    postsContainer.innerHTML = '<div class="loading-message">Loading posts...</div>';
    
    // Create the endpoint URL
    const apiUrl = userId ? 
        `/api/posts/user/${userId}` : 
        '/api/posts/user';
    
    // Make the request with proper headers
    fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        }
    })
    .then(response => {
        console.log('📝 Posts response status:', response.status);
        
        // Check for auth errors first
        if (response.status === 401 || response.status === 403) {
            throw new Error('auth-check-failed');
        }
        
        // Try to get content type
        const contentType = response.headers.get('content-type');
        console.log('📝 Posts response content-type:', contentType);
        
        // If content type is JSON, parse as JSON
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        
        // If not JSON, inspect the response text and try to convert if possible
        return response.text().then(text => {
            console.log('📄 Posts response preview:', text.substring(0, 100));
            
            // Check if it's HTML (likely login page)
            if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
                throw new Error('auth-check-failed');
            }
            
            // Try to parse as JSON anyway (sometimes Content-Type is wrong)
            try {
                return JSON.parse(text);
            } catch (err) {
                console.error('❌ Failed to parse response as JSON:', err);
                throw new Error('invalid-response-format');
            }
        });
    })
    .then(posts => {
        // Rest of your code to display posts...
        if (!Array.isArray(posts)) {
            console.warn('⚠️ Expected array but got:', typeof posts);
            posts = [];
        }
        
        if (posts.length === 0) {
            postsContainer.innerHTML = '<div class="empty-posts-message">No posts yet</div>';
            return;
        }
        
        // Display the posts
        postsContainer.innerHTML = '';
        posts.forEach(post => {
            const postElement = createPostElement(post);
            if (postElement) {
                postsContainer.appendChild(postElement);
            }
        });
    })
    .catch(error => {
        console.error('❌ Error in posts fetch:', error.message);
        
        // Only show session expired for genuine auth errors
        if (error.message === 'auth-check-failed') {
            postsContainer.innerHTML = `
                <div class="error-message">
                    <p>Please sign in to view posts.</p>
                    <button class="refresh-button" onclick="window.location.href='login.html'">Sign In</button>
                </div>
            `;
        } else {
            postsContainer.innerHTML = `
                <div class="error-message">
                    Could not load posts. <button class="refresh-button" onclick="fetchUserPosts()">Try Again</button>
                </div>
            `;
        }
    });
}

// Function to fetch user posts with improved error handling and fallbacks

window.fetchUserPosts = fetchUserPosts;
window.fetchUserProfile = fetchUserProfile;

function createPostElement(post) {
    if (!post || !post.id) {
        return null;
    }
    
    try {
        const postDate = new Date(post.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const postDiv = document.createElement('div');
        postDiv.className = 'blog-post';
        postDiv.dataset.postId = post.id;
        
        let postHTML = '';
        
        // Add repost indicator if it's a repost
        if (post.isRepost) {
            postHTML += `
                <div class="repost-indicator">
                    <i class="fas fa-retweet"></i> 
                    <span>Reposted</span>
                </div>
            `;
        }
        
        // Add post header with user info AND burger menu
        postHTML += `
            <div class="post-header">
                <img src="${post.profilePicture || 'avatars/Avatar_Default_Anonymous.webp'}" alt="${post.username}" class="post-avatar" onclick="window.location.href='profile.html?userId=${post.userId}'">
                <div>
                    <h5 class="post-username" onclick="window.location.href='profile.html?userId=${post.userId}'">${post.username}</h5>
                    <span class="post-date">${postDate}</span>
                </div>
                <div class="post-menu">
                    <i class="fas fa-ellipsis-v post-menu-icon"></i>
                    <div class="post-menu-dropdown">
                        ${post.userId === window.currentUserId ? `
                            <div class="post-menu-item edit-post" data-post-id="${post.id}">
                                <i class="fas fa-edit"></i> Edit Post
                            </div>
                            <div class="post-menu-item delete-post" data-post-id="${post.id}">
                                <i class="fas fa-trash"></i> Delete Post
                            </div>
                        ` : `
                            <div class="post-menu-item block-post" data-post-id="${post.id}">
                                <i class="fas fa-ban"></i> Hide this post
                            </div>
                            <div class="post-menu-item report-post" data-post-id="${post.id}">
                                <i class="fas fa-flag"></i> Report Post
                            </div>
                        `}
                    </div>
                </div>
            </div>
            <div class="post-content">${post.content || ''}</div>
        `;
        
        // Add image if available
        if (post.imageUrl) {
            postHTML += `
                <div class="post-image-container">
                    <img src="${post.imageUrl}" alt="Post image" class="post-image">
                </div>
            `;
        }
        
        // Add post actions
        postHTML += `
            <div class="post-actions">
                <button class="post-action ${post.userLiked ? 'liked' : ''}" onclick="likePost('${post.id}', this)">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="like-count">${post.likes || 0}</span>
                </button>
                <button class="post-action" onclick="toggleComments('${post.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments || 0}</span>
                </button>
                <button class="post-action" onclick="sharePost('${post.id}')">
                    <i class="fas fa-share"></i>
                    <span>Share</span>
                </button>
                <button class="post-action" onclick="repostPost('${post.id}')">
                    <i class="fas fa-retweet"></i>
                    <span>Repost</span>
                </button>
            </div>
            <div class="post-comments" id="comments-${post.id}" style="display: none;">
                <div class="comments-container" id="comments-container-${post.id}"></div>
                <div class="comment-form">
                    <input type="text" placeholder="Write a comment..." id="comment-input-${post.id}" class="comment-input-field">
                    <button class="send-comment-button" onclick="postComment('${post.id}')">Comment</button>
                </div>
            </div>
        `;
        
        postDiv.innerHTML = postHTML;
        return postDiv;
    } catch (error) {
        console.error('Error creating post element:', error);
        return null;
    }
}

// Add this function to fetch the user's profile information
function fetchUserProfile() {
    console.log('🔍 fetchUserProfile started');
    
    // Get the container elements
    const profilePicture = document.getElementById('profilePicture');
    const userName = document.getElementById('userName');
    const userBio = document.getElementById('userBio');
    const coverPhotoSection = document.querySelector('.cover-photo-section');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const followersCountLink = document.getElementById('followersCount');
    const followingCountLink = document.getElementById('followingCount');

    // Get userId from URL parameter if it exists
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    console.log('🔍 Profile userId from URL:', userId || 'own profile');
    
    // Create API endpoint URL
    const apiUrl = userId ? 
        `/api/users/profile?userId=${userId}` : 
        '/api/users/profile';
    console.log('🔗 Using profile API endpoint:', apiUrl);

    // Show loading indicator if available
    const loadingModal = document.getElementById('loadingModal');
    if (loadingModal) {
        const loadingText = loadingModal.querySelector('.loading-content p');
        if (loadingText) loadingText.textContent = 'Loading profile...';
        loadingModal.style.display = 'flex';
        console.log('🔄 Showing loading modal');
    }
    
    // Fetch profile data with proper error handling
    fetch(apiUrl, {
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        }
    })
    .then(response => {
        console.log('🔍 Profile response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to load profile data');
        }
        
        const contentType = response.headers.get('content-type');
        console.log('🔍 Profile response content-type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
            // If not JSON, try to handle HTML response (likely login page)
            return response.text().then(text => {
                console.log('📄 Non-JSON response preview:', text.substring(0, 100));
                
                if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
                    throw new Error('session-expired');
                }
                
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error('Invalid response format');
                }
            });
        }
        
        return response.json();
    })
    .then(profile => {
        console.log('👤 Profile data received:', profile);
        
        // Hide loading indicator
        if (loadingModal) {
            loadingModal.style.display = 'none';
            console.log('🧹 Hiding loading modal');
        }
        
        // Update profile picture
        if (profile.profilePicture) {
            profilePicture.src = profile.profilePicture;
            console.log('🖼️ Updated profile picture:', profile.profilePicture);
        }
        
        // Update username
        if (profile.name) {
            userName.textContent = profile.name;
            document.title = `${profile.name} - Gathering Hub`;
            console.log('📝 Updated user name:', profile.name);
        }
        
        // Update bio
        if (profile.bio) {
            userBio.textContent = profile.bio;
            console.log('📝 Updated bio:', profile.bio);
        } else {
            userBio.textContent = 'No bio available';
            console.log('📝 No bio available, showing default text');
        }
        
        // Update cover photo if exists
        if (profile.coverPhoto) {
            coverPhotoSection.style.backgroundImage = `url('${profile.coverPhoto}')`;
            coverPhotoSection.style.backgroundSize = 'cover';
            coverPhotoSection.style.backgroundPosition = 'center';
            console.log('🖼️ Updated cover photo:', profile.coverPhoto);
        }
        
        // Update follower/following counts
        if (profile.followersCount !== undefined) {
            followersCountLink.textContent = `${profile.followersCount} Followers`;
            console.log('👥 Updated followers count:', profile.followersCount);
        }
        
        if (profile.followingCount !== undefined) {
            followingCountLink.textContent = `${profile.followingCount} Following`;
            console.log('👥 Updated following count:', profile.followingCount);
        }
        
        // Handle profile ownership UI adjustments
        if (profile.isOwnProfile === false) {
            console.log('🔒 Not own profile, hiding edit button and showing follow/unfollow');
            editProfileBtn.style.display = 'none';
            
            // Add follow/unfollow button if not own profile
            const existingButton = document.querySelector('.follow-button-container');
            if (existingButton) {
                existingButton.remove(); // Remove existing button to avoid duplicates
            }
            
            const followButtonContainer = document.createElement('div');
            followButtonContainer.className = 'follow-button-container';
            
            if (profile.youFollow) {
                console.log('👥 User is being followed, showing unfollow button');
                followButtonContainer.innerHTML = `<button class="follow-button unfollow-button" data-user-id="${userId}">Unfollow</button>`;
            } else {
                console.log('👥 User is not being followed, showing follow button');
                followButtonContainer.innerHTML = `<button class="follow-button" data-user-id="${userId}">Follow</button>`;
            }
            
            // Insert the follow button after the user info section
            const userInfo = document.querySelector('.user-info');
            userInfo.appendChild(followButtonContainer);
            
            // Add event listeners
            attachFollowButtonListeners();
        } else {
            console.log('🔓 Own profile, showing edit button');
            editProfileBtn.style.display = 'block';
            
            // Remove any follow buttons if they exist
            const followButtonContainer = document.querySelector('.follow-button-container');
            if (followButtonContainer) {
                followButtonContainer.remove();
            }
        }
        
        // Store current user ID in window object for easy access
        if (profile.isOwnProfile) {
            window.currentUserId = profile._id || userId;
            console.log('🆔 Set currentUserId:', window.currentUserId);
        }
    })
    .catch(error => {
        // Hide loading indicator
        if (loadingModal) {
            loadingModal.style.display = 'none';
            console.log('🧹 Hiding loading modal after error');
        }
        
        console.error('❌ Error fetching profile data:', error);
        
        // Handle session expired error specially
        if (error.message === 'session-expired') {
            console.log('🔒 Session expired, showing login message');
            
            // Show session expired message where the profile would be
            const profileContainer = document.querySelector('.user-details-section');
            if (profileContainer) {
                profileContainer.innerHTML = `
                <div class="session-expired-error">
                    <p>Your session has expired. Please sign in to view profiles.</p>
                    <button class="refresh-button" onclick="window.location.href='login.html'">Sign In</button>
                </div>`;
            }
        } else {
            // Show general error message
            showMessage('Failed to load profile. Please refresh the page.', 'error');
        }
    });
}

// Function to display messages to the user
function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        // Create message container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = 'message-container';
        newContainer.style.position = 'fixed';
        newContainer.style.top = '20px';
        newContainer.style.right = '20px';
        newContainer.style.zIndex = '1000';
        document.body.appendChild(newContainer);
        
        const messageElement = document.createElement('div');
        messageElement.id = 'message';
        newContainer.appendChild(messageElement);
    }

    const messageElement = document.getElementById('message') || document.createElement('div');
    messageElement.textContent = message;
    messageElement.className = 'message ' + type;
    messageContainer.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}


// Function to open the followers/following modal
function openFollowModal(type) {
    followModalTitle.textContent = type === 'followers' ? 'Followers' : 'Following';
    followModal.style.display = 'block';
    
    // Show loading state
    followModalList.innerHTML = '<div class="loading-message">Loading...</div>';
    
    // Get userId from URL parameter if it exists
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    // Create API endpoint URL based on whether we're viewing another user's profile or our own
    const apiUrl = userId ? 
        `/api/users/${type}?userId=${userId}` : 
        `/api/users/${type}`;
    
    // Fetch and display the data
    fetch(apiUrl, {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load ${type}`);
        }
        return response.json();
    })
    .then(users => {
        renderFollowList(users, type);
    })
    .catch(error => {
        console.error(`Error loading ${type}:`, error);
        followModalList.innerHTML = `<div class="no-follow-message">Failed to load ${type}. Please try again.</div>`;
    });
}

// Function to render the followers/following list
function renderFollowList(users, type) {
    if (users.length === 0) {
        followModalList.innerHTML = `<div class="no-follow-message">No ${type} to display</div>`;
        return;
    }
    
    followModalList.innerHTML = '';
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('follow-item');
        
        let actionButton = '';
        if (type === 'followers' && !user.youFollow) {
            actionButton = `<button class="follow-button" data-user-id="${user._id}">Follow</button>`;
        } else if (user.youFollow || type === 'following') {
            actionButton = `<button class="follow-button unfollow-button" data-user-id="${user._id}">Unfollow</button>`;
        }
        
        // Create private profile indicator if applicable
        const privateIndicator = user.isPrivateProfile ? 
            '<i class="fas fa-lock private-profile-icon" title="Private Profile"></i>' : '';
        
        userElement.innerHTML = `
            <div class="follow-profile-link" data-user-id="${user._id}">
                <img src="${user.profilePicture}" alt="${user.name}" class="follow-avatar">
                <div class="follow-info">
                    <div class="follow-name">
                        ${user.name}
                        ${privateIndicator}
                    </div>
                    <div class="follow-bio">${user.bio || ''}</div>
                </div>
            </div>
            <div class="follow-action">
                ${actionButton}
            </div>
        `;
        
        // Add click event for profile navigation
        const profileLink = userElement.querySelector('.follow-profile-link');
        if (profileLink) {
            profileLink.addEventListener('click', () => {
                window.location.href = `profile.html?userId=${user._id}`;
            });
        }
        
        followModalList.appendChild(userElement);
    });
    
    // Add event listeners for follow/unfollow buttons
    attachFollowButtonListeners();
}

// Attach event listeners to follow/unfollow buttons
function attachFollowButtonListeners() {
    const followButtons = document.querySelectorAll('.follow-button:not(.unfollow-button)');
    const unfollowButtons = document.querySelectorAll('.unfollow-button');
    
    followButtons.forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.userId;
            // Use the shared follow function with callbacks for specific behavior
            window.userInteractions.followUser(userId, this, {
                onSuccess: () => {
                    fetchUserProfile(); // Update follower count after success
                }
            });
        });
    });
    
    unfollowButtons.forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.userId;
            // Get the parent element before doing the operation
            const userElement = this.closest('.follow-item');
            
            // Use the shared unfollow function with callbacks for specific behavior
            window.userInteractions.unfollowUser(userId, this, {
                onSuccess: () => {
                    fetchUserProfile(); // Update follower count after success
                    
                    // Special handling for following list - remove user from list
                    if (followModalTitle.textContent === 'Following' && userElement) {
                        userElement.remove();
                        
                        // If no more following, show message
                        if (followModalList.children.length === 0) {
                            followModalList.innerHTML = '<div class="no-follow-message">You\'re not following anyone</div>';
                        }
                    }
                }
            });
        });
    });

    // Add this function to handle comments properly
window.toggleComments = function(postId) {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    const commentsContainer = document.getElementById(`comments-container-${postId}`);
    
    if (!commentsDiv) {
        console.error(`Comments div not found for post ${postId}`);
        return;
    }
    
    if (commentsDiv.style.display === 'none') {
        commentsDiv.style.display = 'block';
        
        // Display a loading indicator
        commentsContainer.innerHTML = '<div class="loading-comments">Loading comments...</div>';
        
        // Attempt to fetch comments using the fetch API
        fetch(`/api/posts/${postId}/comments`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            // If we get a non-successful response, use a mock empty array
            if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
                console.warn('Received non-JSON or error response, using local comments');
                
                // Use local storage to check if there are comments we've added but not yet retrieved
                const localComments = JSON.parse(localStorage.getItem(`post-${postId}-comments`) || '[]');
                return localComments;
            }
            return response.json();
        })
        .then(comments => {
            // Ensure we have an array
            const commentArray = Array.isArray(comments) ? comments : [];
            
            if (commentArray.length === 0) {
                commentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>';
            } else {
                commentsContainer.innerHTML = '';
                commentArray.forEach(comment => {
                    const commentDiv = document.createElement('div');
                    commentDiv.className = 'comment';
                    commentDiv.innerHTML = `
                        <div class="comment-user">${comment.username}</div>
                        <div class="comment-text">${comment.comment}</div>
                    `;
                    commentsContainer.appendChild(commentDiv);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching comments:', error);
            commentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>';
        });
    } else {
        commentsDiv.style.display = 'none';
    }
};

// Add function to post comments with localStorage fallback
window.postComment = function(postId) {
    const commentInput = document.getElementById(`comment-input-${postId}`);
    const comment = commentInput.value.trim();
    
    if (!comment) return;
    
    fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ comment })
    })
    .then(response => response.json())
    .then(data => {
        // Add new comment to the comments container
        const commentsContainer = document.getElementById(`comments-container-${postId}`);
        
        // Remove "no comments" message if present
        const noComments = commentsContainer.querySelector('.no-comments');
        if (noComments) {
            commentsContainer.removeChild(noComments);
        }
        
        // Create comment element
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';
        commentDiv.innerHTML = `
            <div class="comment-user">${data.username}</div>
            <div class="comment-text">${data.comment}</div>
        `;
        commentsContainer.appendChild(commentDiv);
        
        // Store locally for fallback
        const localComments = JSON.parse(localStorage.getItem(`post-${postId}-comments`) || '[]');
        localComments.push({
            username: data.username,
            comment: data.comment
        });
        localStorage.setItem(`post-${postId}-comments`, JSON.stringify(localComments));
        
        // Clear input
        commentInput.value = '';
        
        // Update comment count
        const commentButton = document.querySelector(`.post-action[onclick="toggleComments('${postId}')"]`);
        const commentCount = commentButton.querySelector('span');
        commentCount.textContent = parseInt(commentCount.textContent) + 1;
    })
    .catch(error => {
        console.error('Error posting comment:', error);
        showMessage('Failed to post comment. Please try again.', 'error');
    });
};

// Also add the like post functionality to ensure it works
window.likePost = function(postId, button) {
    fetch(`/api/posts/like/${postId}`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        const likeButton = button;
        const likeCount = likeButton.querySelector('.like-count');
        
        if (data.message === 'Liked post') {
            likeButton.classList.add('liked');
        } else {
            likeButton.classList.remove('liked');
        }
        
        likeCount.textContent = data.likes;
    })
    .catch(error => {
        console.error('Error liking post:', error);
        showMessage('Failed to like post. Please try again.', 'error');
    });
};

// Add share post function
window.sharePost = function(postId) {
    const postUrl = `${window.location.origin}/post/${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this post on Gathering Hub',
            url: postUrl
        }).catch(err => {
            console.error('Error sharing:', err);
            // Fallback to clipboard copy
            copyToClipboard(postUrl);
        });
    } else {
        // Fallback for browsers that don't support navigator.share
        copyToClipboard(postUrl);
    }
};

// Add repost function
window.repostPost = function(postId) {
    fetch(`/api/posts/repost/${postId}`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to repost');
        }
        return response.json();
    })
    .then(data => {
        showMessage('Post reposted successfully!', 'success');
        // Refresh posts to show the repost
        fetchUserPosts();
    })
    .catch(error => {
        console.error('Error reposting:', error);
        showMessage('Failed to repost. Please try again.', 'error');
    });
};

// Helper function for copying to clipboard
function copyToClipboard(text) {
    // Create a temporary input element
    const input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.opacity = 0;
    input.value = text;
    document.body.appendChild(input);
    
    // Select and copy the text
    input.select();
    document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(input);
    
    // Show success message
    showMessage('Link copied to clipboard!', 'success');
}

}