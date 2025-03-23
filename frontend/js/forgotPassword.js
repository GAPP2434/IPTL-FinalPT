document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    forgotPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        
        // Show loading modal
        const loadingModal = document.getElementById('loadingModal');
        const loadingText = document.querySelector('#loadingModal .loading-content p');
        loadingText.textContent = 'Sending reset link to your email...';
        loadingModal.style.display = 'flex';
        
        fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Failed to send reset link');
                });
            }
            return response.json();
        })
        .then(data => {
            loadingModal.style.display = 'none'; // Hide loading modal
            showMessage('Password reset link sent to your email!', 'success');
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