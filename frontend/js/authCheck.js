document.addEventListener('DOMContentLoaded', function() {
    // Check if the current page is login.html or register.html
    const currentPath = window.location.pathname;
    const publicPaths = ['/login.html', '/register.html'];
    const isPublicPage = publicPaths.some(path => currentPath.endsWith(path));
    
    // If not on a public page, check authentication
    if (!isPublicPage) {
        checkAuthentication();
    }
    
    // Add logout functionality if logout button exists
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});


// Check if the user is authenticated
function checkAuthentication() {
    console.log('checkAuthentication function called');
    fetch('/api/auth/user?_=' + new Date().getTime(), {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Not authenticated');
        }
        return response.json();
    })
    .then(user => {
        console.log('Authenticated as:', user);
        
        // Store the current user ID for WebSocket use
        window.currentUserId = user._id || user.id;
        
        // Check if user is banned
        if (user.status === 'banned') {
            // Show ban modal
            showBanModal("Your account has been banned. You cannot access the website.");
        }
        
        // Check if user is suspended
        if (user.status === 'suspended') {
            // Show suspension modal
            showSuspensionModal("Your account has been temporarily suspended.");
        }
    })
    .catch(error => {
        console.error('Auth error:', error);
        window.location.href = 'login.html';
    });
}


// Logout function
function logout() {
    fetch('/api/auth/logout', {
        credentials: 'include'
    })
    .then(() => {
        window.location.href = 'login.html';
    })
    .catch(error => {
        console.error('Logout error:', error);
        window.location.href = 'login.html';
    });
}

// Show ban modal
function showBanModal(message) {
    // Create modal if it doesn't exist
    let banModal = document.getElementById('banModal');
    
    if (!banModal) {
        banModal = document.createElement('div');
        banModal.id = 'banModal';
        banModal.className = 'modal';
        
        banModal.innerHTML = `
            <div class="modal-content ban-modal-content">
                <h2>Account Banned</h2>
                <p id="banMessage">Your account has been banned by an administrator.</p>
                <p>If you believe this was done in error, please contact support.</p>
                <div class="modal-actions">
                    <button id="banConfirmButton" class="confirm-button">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(banModal);
    }
    
    // Set the ban message
    const banMessageElement = document.getElementById('banMessage');
    if (banMessageElement) {
        banMessageElement.textContent = message;
    }
    
    // Force the modal to show and prevent it from being closed
    banModal.classList.add('force-display');
    banModal.style.display = 'block';
    
    // Setup confirm button
    const banConfirmButton = document.getElementById('banConfirmButton');
    if (banConfirmButton) {
        const newButton = banConfirmButton.cloneNode(true);
        banConfirmButton.parentNode.replaceChild(newButton, banConfirmButton);
        
        newButton.addEventListener('click', () => {
            // Logout and redirect to login
            logout();
        });
    }
}

// Show suspension modal
function showSuspensionModal(message) {
    // Similar implementation to ban modal
    // Create modal if it doesn't exist
    let suspensionModal = document.getElementById('suspensionModal');
    
    if (!suspensionModal) {
        suspensionModal = document.createElement('div');
        suspensionModal.id = 'suspensionModal';
        suspensionModal.className = 'modal';
        
        suspensionModal.innerHTML = `
            <div class="modal-content suspension-modal-content">
                <h2>Account Suspended</h2>
                <p id="suspensionMessage">Your account has been temporarily suspended.</p>
                <p>If you believe this was done in error, please contact support.</p>
                <div class="modal-actions">
                    <button id="suspensionConfirmButton" class="confirm-button">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(suspensionModal);
    }
    
    // Set the suspension message
    const suspensionMessageElement = document.getElementById('suspensionMessage');
    if (suspensionMessageElement) {
        suspensionMessageElement.textContent = message;
    }
    
    // Show the modal
    suspensionModal.classList.add('force-display');
    suspensionModal.style.display = 'block';
    
    // Setup confirm button
    const suspensionConfirmButton = document.getElementById('suspensionConfirmButton');
    if (suspensionConfirmButton) {
        const newButton = suspensionConfirmButton.cloneNode(true);
        suspensionConfirmButton.parentNode.replaceChild(newButton, suspensionConfirmButton);
        
        newButton.addEventListener('click', () => {
            // Logout and redirect to login
            logout();
        });
    }
}