document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const settingsMenuItems = document.querySelectorAll('.settings-menu-item');
    const settingsSections = document.querySelectorAll('.settings-section');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordForm = document.getElementById('password-form');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');
    const passwordChangeForm = document.getElementById('password-change-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordMatch = document.getElementById('password-match');
    
    // Fetch and display user account info
    fetchUserInfo();
    initializePrivacySettings();

    // Settings menu navigation
    settingsMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all menu items and sections
            settingsMenuItems.forEach(menuItem => menuItem.classList.remove('active'));
            settingsSections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked menu item
            item.classList.add('active');
            
            // Show corresponding section
            const sectionId = `${item.dataset.section}-section`;
            document.getElementById(sectionId).classList.add('active');
            
            // Hide password form when switching sections
            passwordForm.style.display = 'none';
        });
    });
    
    // Show/hide password change form
    changePasswordBtn.addEventListener('click', () => {
        passwordForm.style.display = 'block';
        // Reset form fields
        passwordChangeForm.reset();
    });
    
    cancelPasswordBtn.addEventListener('click', () => {
        passwordForm.style.display = 'none';
    });
    
    // Password validation
    newPasswordInput.addEventListener('input', validatePasswords);
    confirmPasswordInput.addEventListener('input', validatePasswords);
    
    function validatePasswords() {
        if (confirmPasswordInput.value && newPasswordInput.value !== confirmPasswordInput.value) {
            passwordMatch.classList.add('error');
        } else {
            passwordMatch.classList.remove('error');
        }
    }
    
    // Handle password change form submission
    passwordChangeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            showMessage('Passwords do not match!', 'error');
            return;
        }
        
        // Show loading modal
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) loadingModal.style.display = 'flex';
        
        // Send password change request
        fetch('/api/users/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                currentPassword: document.getElementById('current-password').value,
                newPassword: newPasswordInput.value
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Failed to change password');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide loading modal
            if (loadingModal) loadingModal.style.display = 'none';
            
            // Show success message
            showMessage('Password changed successfully!', 'success');
            
            // Hide password form
            passwordForm.style.display = 'none';
        })
        .catch(error => {
            // Hide loading modal
            if (loadingModal) loadingModal.style.display = 'none';
            
            // Show error message
            showMessage(error.message || 'Failed to change password', 'error');
        });
    });
    
    // Fetch user info
    function fetchUserInfo() {
        fetch('/api/users/profile', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user information');
            }
            return response.json();
        })
        .then(user => {
            // Update user info display
            document.getElementById('username-display').textContent = user.name;
            document.getElementById('email-display').textContent = user.email;
        })
        .catch(error => {
            console.error('Error fetching user info:', error);
            showMessage('Failed to load user information', 'error');
        });
    }
    
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

    // Initialize privacy settings
    function initializePrivacySettings() {
        const toggleProfilePrivacyBtn = document.getElementById('toggle-profile-privacy');
        
        if (toggleProfilePrivacyBtn) {
            toggleProfilePrivacyBtn.addEventListener('click', toggleProfilePrivacy);
            
            // Check current privacy status
            fetch('/api/users/privacy-status', {
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                updatePrivacyToggleButton(data.isPrivate);
            })
            .catch(error => {
                console.error('Error fetching privacy status:', error);
            });
        }
    }

    // Toggle profile privacy
    function toggleProfilePrivacy() {
        const toggleBtn = document.getElementById('toggle-profile-privacy');
        const isCurrentlyPrivate = toggleBtn.classList.contains('active');
        const newPrivacyStatus = !isCurrentlyPrivate;
        
        // Show loading modal
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) loadingModal.style.display = 'flex';
        
        // Send request to update privacy setting
        fetch('/api/users/update-privacy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ isPrivate: newPrivacyStatus })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Failed to update privacy settings');
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide loading modal
            if (loadingModal) loadingModal.style.display = 'none';
            
            // Update button state
            updatePrivacyToggleButton(data.isPrivate);
            
            // Show success message
            const statusText = data.isPrivate ? 'private' : 'public';
            showMessage(`Your profile is now ${statusText}`, 'success');
        })
        .catch(error => {
            // Hide loading modal
            if (loadingModal) loadingModal.style.display = 'none';
            
            // Show error message
            showMessage(error.message || 'Failed to update privacy settings', 'error');
        });
    }

    // Update the toggle button appearance based on current status
    function updatePrivacyToggleButton(isPrivate) {
        const toggleBtn = document.getElementById('toggle-profile-privacy');
        const toggleState = toggleBtn.querySelector('.toggle-state');
        
        if (isPrivate) {
            toggleBtn.classList.add('active');
            toggleState.textContent = 'Make Profile Public';
        } else {
            toggleBtn.classList.remove('active');
            toggleState.textContent = 'Make Profile Private';
        }
    }

});