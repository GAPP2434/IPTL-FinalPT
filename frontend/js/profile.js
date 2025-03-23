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
    
    // Open modal when Edit Profile button is clicked
    editProfileBtn.addEventListener('click', function() {
        // Get current values for preview
        coverPhotoPreview.src = document.querySelector('.cover-photo-section').style.backgroundImage?.replace(/url\(['"](.+)['"]\)/, '$1') || 'images/mhwi-paper.png';
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
        fetch('/api/user/profile', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Failed to update profile');
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
            }
            
            if (data.coverPhoto) {
                document.querySelector('.cover-photo-section').style.backgroundImage = `url('${data.coverPhoto}')`;
                document.querySelector('.cover-photo-section').style.backgroundSize = 'cover';
                document.querySelector('.cover-photo-section').style.backgroundPosition = 'center';
            }
            
            // Close the modal
            profileEditModal.style.display = 'none';
            
            // Show success message if available
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

// Function to show messages (if message container exists)
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

// Function to fetch user profile data
function fetchUserProfile() {
    fetch('/api/auth/user', {
        credentials: 'include' // Important for sending cookies
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        return response.json();
    })
    .then(user => {
        // Update profile information
        document.getElementById('userName').textContent = user.name || 'User Name';
        
        // Update profile picture if available
        if (user.profilePicture) {
            document.getElementById('profilePicture').src = user.profilePicture;
        }
        
        // Update bio if available (can be added to user model later)
        if (user.bio) {
            document.getElementById('userBio').textContent = user.bio;
        }
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
    });
}

// Function to fetch user posts
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