document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerAdminForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const adminCodeInput = document.getElementById('adminCode');
    const profilePictureInput = document.getElementById('profilePicture');
    const profilePreview = document.getElementById('profilePreview');
    const chooseProfileBtn = document.getElementById('chooseProfileBtn');
    const usernameCount = document.getElementById('usernameCount');
    const passwordCount = document.getElementById('passwordCount');
    const passwordMatch = document.getElementById('passwordMatch');
    
    // Username validation - only allow alphanumeric, underscore, and dash
    usernameInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9_-]/g, '');
        usernameCount.textContent = `${this.value.length}/15`;
    });
    
    // Password validation - only allow alphanumeric, underscore, and dash
    passwordInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9_-]/g, '');
        passwordCount.textContent = `${this.value.length}/20`;
        validatePasswords();
    });
    
    // Email validation - only allow valid email characters
    emailInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9@._-]/g, '');
    });
    
    // Confirm password validation
    confirmPasswordInput.addEventListener('input', validatePasswords);
    
    function validatePasswords() {
        if (passwordInput.value !== confirmPasswordInput.value) {
            passwordMatch.classList.add('error');
        } else {
            passwordMatch.classList.remove('error');
        }
    }
    
    // Profile picture preview
    chooseProfileBtn.addEventListener('click', function() {
        profilePictureInput.click();
    });
    
    profilePictureInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                profilePreview.src = e.target.result;
            }
            
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Form submission
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (passwordInput.value !== confirmPasswordInput.value) {
            showMessage('Passwords do not match!', 'error');
            return;
        }
        
        // Create form data object to send to server
        const formData = new FormData();
        formData.append('name', usernameInput.value);
        formData.append('email', emailInput.value);
        formData.append('password', passwordInput.value);
        formData.append('adminCode', adminCodeInput.value);
        formData.append('role', 'admin');  // Set role to admin
        
        if (profilePictureInput.files.length > 0) {
            formData.append('profilePicture', profilePictureInput.files[0]);
        }
        
        // Send data to server
        fetch('/api/auth/register-admin', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Registration failed');
                });
            }
            return response.json();
        })
        .then(data => {
            showMessage('Admin registration successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        })
        .catch(error => {
            showMessage(error.message, 'error');
        });
    });
    
    // Message display function
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
});