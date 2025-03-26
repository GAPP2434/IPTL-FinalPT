document.addEventListener('DOMContentLoaded', function() {
    // Fetch user profile data from the server
    fetchUserProfile();
    
    // Fetch user posts
    fetchUserPosts();
    
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

// Function to fetch user profile data
function fetchUserProfile() {
    fetch('/api/users/profile', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(user => {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userBio').textContent = user.bio || 'No bio available';
        document.getElementById('profilePicture').src = user.profilePicture;
        
        // Update follower/following counts
        document.getElementById('followersCount').textContent = 
            `${user.followersCount || 0} Followers`;
        document.getElementById('followingCount').textContent = 
            `${user.followingCount || 0} Following`;
        
        if (user.coverPhoto) {
            document.querySelector('.cover-photo-section').style.backgroundImage = `url('${user.coverPhoto}')`;
            document.querySelector('.cover-photo-section').style.backgroundSize = 'cover';
            document.querySelector('.cover-photo-section').style.backgroundPosition = 'center';
        }
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
        showMessage('Failed to load profile. Please try refreshing the page.', 'error');
    });
}

// Function to fetch user posts (placeholder)
function fetchUserPosts() {
    // This would be replaced with actual API call when posts are implemented
    const userPosts = []; // Placeholder for user posts
    
    const postsContainer = document.getElementById('userPosts');
    
    if (userPosts.length === 0) {
        // If no posts, show the message (which is already in the HTML)
        return;
    }
    
    // Clear the no posts message
    postsContainer.innerHTML = '';
    
    // Add each post to the container
    userPosts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post-item');
        
        // Create post content (customize based on your post structure)
        postElement.innerHTML = `
            <div class="post-header">
                <span class="post-username">${post.username}</span>
                <span class="post-date">${post.date}</span>
            </div>
            <div class="post-content">${post.content}</div>
        `;
        
        postsContainer.appendChild(postElement);
    });
}

// Function to open the followers/following modal
function openFollowModal(type) {
    followModalTitle.textContent = type === 'followers' ? 'Followers' : 'Following';
    followModal.style.display = 'block';
    
    // Show loading state
    followModalList.innerHTML = '<div class="loading-message">Loading...</div>';
    
    // Fetch and display the data
    fetch(`/api/users/${type}`, {
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
        
        userElement.innerHTML = `
            <img src="${user.profilePicture}" alt="${user.name}" class="follow-avatar">
            <div class="follow-info">
                <div class="follow-name">${user.name}</div>
                <div class="follow-bio">${user.bio || ''}</div>
            </div>
            <div class="follow-action">
                ${actionButton}
            </div>
        `;
        
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
}