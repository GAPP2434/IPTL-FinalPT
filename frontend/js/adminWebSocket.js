document.addEventListener('DOMContentLoaded', function() {
    // Initialize the admin WebSocket connection
    let adminSocket = null;
    const adminEvents = {};

    // Connect to WebSocket for admin-related communications
    function connectAdminWebSocket() {
        if (adminSocket && adminSocket.readyState !== WebSocket.CLOSED) {
            console.log('Admin WebSocket already connected');
            return;
        }
        
       // Create WebSocket connection with explicit admin path
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        adminSocket = new WebSocket(`${wsProtocol}//${window.location.host}/admin`);
        
        // Connection opened
        adminSocket.addEventListener('open', () => {
            console.log('Admin WebSocket connection established');
            
            // Verify admin status
            if (adminSocket.readyState === WebSocket.OPEN) {
                try {
                    adminSocket.send(JSON.stringify({ type: 'admin_auth' }));
                } catch (e) {
                    console.error('Error sending admin auth:', e);
                }
            }
        });
        
        // Listen for messages
        adminSocket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("Admin WebSocket received:", data.type);
                
                // Handle different message types
                switch (data.type) {
                    case 'auth_result':
                        handleAuthResult(data);
                        break;
                    case 'user_banned':
                        handleUserBanned(data);
                        break;
                    case 'user_unbanned':
                        handleUserUnbanned(data);
                        break;
                    case 'user_suspended':
                        handleUserSuspended(data);
                        break;
                    case 'security_alert':
                        handleSecurityAlert(data);
                        break;
                    default:
                        console.log("Unhandled admin message type:", data.type);
                }
                
                // Trigger any registered event listeners
                if (adminEvents[data.type]) {
                    adminEvents[data.type].forEach(callback => callback(data));
                }
            } catch (error) {
                console.error("Error handling Admin WebSocket message:", error);
            }
        });
        
        // Handle WebSocket errors
        adminSocket.addEventListener('error', (error) => {
            console.error('Admin WebSocket error:', error);
        });
        
        // Handle WebSocket closure and reconnect
        adminSocket.addEventListener('close', (event) => {
            console.log('Admin WebSocket connection closed. Attempting reconnect...');
            // Try to reconnect after 5 seconds
            setTimeout(connectAdminWebSocket, 5000);
        });
    }
    
    // Handle authentication result
    function handleAuthResult(data) {
        if (data.success) {
            console.log("Admin WebSocket authenticated successfully");
        } else {
            console.error("Admin WebSocket authentication failed:", data.message);
            // Disconnect if not authenticated
            adminSocket.close();
        }
    }
    
    // Handle user banned event
    function handleUserBanned(data) {
        console.log("User banned:", data);
        
        // If this is the current user that got banned, show the ban modal
        if (data.userId === window.currentUserId) {
            showBanModal(data.reason || "Your account has been banned by an administrator.");
        }
        
        // If on admin panel, update the user list
        if (window.location.pathname.includes('adminPanel.html')) {
            if (typeof window.updateUserStatus === 'function') {
                window.updateUserStatus(data.userId, 'banned');
            }
        }
    }
    
    // Handle user unbanned event
    function handleUserUnbanned(data) {
        console.log("User unbanned:", data);
        
        // If on admin panel, update the user list
        if (window.location.pathname.includes('adminPanel.html')) {
            if (typeof window.updateUserStatus === 'function') {
                window.updateUserStatus(data.userId, 'active');
            }
        }
    }
    
    // Handle user suspended event
    function handleUserSuspended(data) {
        console.log("User suspended:", data);
        
        // If this is the current user that got suspended, show the suspension modal
        if (data.userId === window.currentUserId) {
            showSuspensionModal(data.reason || "Your account has been temporarily suspended.");
        }
        
        // If on admin panel, update the user list
        if (window.location.pathname.includes('adminPanel.html')) {
            if (typeof window.updateUserStatus === 'function') {
                window.updateUserStatus(data.userId, 'suspended');
            }
        }
    }
    
    // Handle security alerts
    function handleSecurityAlert(data) {
        console.log("Security alert:", data);
        
        // If on admin panel, add to security logs
        if (window.location.pathname.includes('adminPanel.html')) {
            if (typeof window.addSecurityLog === 'function') {
                window.addSecurityLog(data);
            }
        }
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
                fetch('/api/auth/logout', {
                    credentials: 'include'
                })
                .finally(() => {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                });
            });
        }
    }
    
    // Show suspension modal
    function showSuspensionModal(message) {
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
                fetch('/api/auth/logout', {
                    credentials: 'include'
                })
                .finally(() => {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                });
            });
        }
    }
    
    // Send ban user message
    function banUser(userId, reason) {
        if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
            adminSocket.send(JSON.stringify({
                type: 'ban_user',
                userId: userId,
                reason: reason || 'Banned by administrator'
            }));
        } else {
            console.error('Admin WebSocket not connected');
        }
    }
    
    // Send unban user message
    function unbanUser(userId) {
        if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
            adminSocket.send(JSON.stringify({
                type: 'unban_user',
                userId: userId
            }));
        } else {
            console.error('Admin WebSocket not connected');
        }
    }
    
    // Send suspend user message
    function suspendUser(userId, reason, duration) {
        if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
            adminSocket.send(JSON.stringify({
                type: 'suspend_user',
                userId: userId,
                reason: reason || 'Suspended by administrator',
                duration: duration || '24h'
            }));
        } else {
            console.error('Admin WebSocket not connected');
        }
    }
    
    // Add event listener for admin WebSocket events
    function addAdminEventListener(eventType, callback) {
        if (!adminEvents[eventType]) {
            adminEvents[eventType] = [];
        }
        adminEvents[eventType].push(callback);
    }
    
    // Remove event listener for admin WebSocket events
    function removeAdminEventListener(eventType, callback) {
        if (adminEvents[eventType]) {
            adminEvents[eventType] = adminEvents[eventType].filter(cb => cb !== callback);
        }
    }
    
    // Check if the user is an admin before connecting
    fetch('/api/auth/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(user => {
        if (user && user.role === 'admin') {
            connectAdminWebSocket();
        }
    })
    .catch(error => {
        console.error('Error checking admin role:', error);
    });
    
    // Export functions for other modules to use
    window.adminWs = {
        connect: connectAdminWebSocket,
        banUser: banUser,
        unbanUser: unbanUser,
        suspendUser: suspendUser,
        addListener: addAdminEventListener,
        removeListener: removeAdminEventListener
    };
});