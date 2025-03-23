document.addEventListener('DOMContentLoaded', function() {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordCount = document.getElementById('passwordCount');
    const passwordMatch = document.getElementById('passwordMatch');
    const tokenInput = document.getElementById('token');
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        showMessage('Invalid or missing reset token. Please request a new password reset link.', 'error');
        document.querySelector('.auth-box').innerHTML = '<h1>Invalid Token</h1><p>The password reset link is invalid or has expired. Please request a new password reset link.</p><div class="form-footer"><p><a href="forgotPassword.html">Request New Reset Link</a></p></div>';
        return;
    }
    
    tokenInput.value = token;
    
    // Password validation - only allow alphanumeric, underscore, and dash
    passwordInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9_-]/g, '');
        passwordCount.textContent = `${this.value.length}/20`;
        validatePasswords();
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
    
    resetPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (passwordInput.value !== confirmPasswordInput.value) {
            showMessage('Passwords do not match!', 'error');
            return;
        }
        
        // Show loading modal
        const loadingModal = document.getElementById('loadingModal');
        const loadingText = document.querySelector('#loadingModal .loading-content p');
        loadingText.textContent = 'Resetting your password...';
        loadingModal.style.display = 'flex';
        
        fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: tokenInput.value,
                password: passwordInput.value
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Failed to reset password');
                });
            }
            return response.json();
        })
        .then(data => {
            loadingModal.style.display = 'none'; // Hide loading modal
            showMessage('Password reset successful! Redirecting to login...', 'success');
            setTimeout(() => {
                // Use relative path to ensure correct port
                window.location.href = '/login.html';
            }, 2000);
        })
        .catch(error => {
            loadingModal.style.display = 'none'; // Hide loading modal
            showMessage(error.message || 'An error occurred', 'error');
        });
    });
    
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
});