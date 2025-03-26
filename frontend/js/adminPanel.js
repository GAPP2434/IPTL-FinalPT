document.addEventListener('DOMContentLoaded', function() {
    // Check if the user is an admin
    checkAdminAccess();
    
    // DOM Elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const userSearchInput = document.getElementById('userSearchInput');
    const userSearchButton = document.getElementById('userSearchButton');
    const userStatusFilter = document.getElementById('userStatusFilter');
    const userRoleFilter = document.getElementById('userRoleFilter');
    const securitySearchInput = document.getElementById('securitySearchInput');
    const securitySearchButton = document.getElementById('securitySearchButton');
    const securitySeverityFilter = document.getElementById('securitySeverityFilter');
    
    // State variables
    let users = [];
    let securityLogs = [];
    let analyticsData = {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        flaggedUsers: 0
    };
    
    // Initialize
    function init() {
        setupEventListeners();
        loadUsers();
        loadSecurityLogs();
        loadAnalyticsData();
    }
    
    // Check if the user has admin access
    function checkAdminAccess() {
        fetch('/api/auth/user', {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(user => {
            if (!user || user.role !== 'admin') {
                // Redirect non-admin users to home page
                window.location.href = 'index.html';
                showMessage('Access denied. Admin privileges required.', 'error');
            }
        })
        .catch(error => {
            console.error('Error checking admin access:', error);
            window.location.href = 'login.html';
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Tab switching
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Add active class to clicked tab
                button.classList.add('active');
                const tabId = button.dataset.tab + '-tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // User search
        userSearchButton.addEventListener('click', () => {
            filterUsers();
        });
        
        userSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                filterUsers();
            }
        });
        
        // User filters
        userStatusFilter.addEventListener('change', filterUsers);
        userRoleFilter.addEventListener('change', filterUsers);
        
        // Security log search
        securitySearchButton.addEventListener('click', () => {
            filterSecurityLogs();
        });
        
        securitySearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                filterSecurityLogs();
            }
        });
        
        // Security log filters
        securitySeverityFilter.addEventListener('change', filterSecurityLogs);
    }
    
    // Load users
    function loadUsers() {
        showLoading();
        
        fetch('/api/admin/users', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load users');
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            users = data;
            renderUsers(users);
        })
        .catch(error => {
            hideLoading();
            console.error('Error loading users:', error);
            showMessage('Failed to load users', 'error');
        });
    }
    
    // Load security logs
    function loadSecurityLogs() {
        fetch('/api/admin/security-logs', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load security logs');
            }
            return response.json();
        })
        .then(data => {
            securityLogs = data;
            renderSecurityLogs(securityLogs);
        })
        .catch(error => {
            console.error('Error loading security logs:', error);
            
            // For demonstration, use mock data
            securityLogs = [
                { timestamp: '2023-05-10T15:30:45', ip: '192.168.1.100', user: 'john@example.com', event: 'Failed login attempt', severity: 'warning', details: 'Incorrect password' },
                { timestamp: '2023-05-10T16:20:10', ip: '192.168.1.101', user: 'unknown', event: 'Failed login attempt', severity: 'info', details: 'User not found' },
                { timestamp: '2023-05-11T08:45:22', ip: '192.168.1.102', user: 'admin@example.com', event: 'Successful login', severity: 'info', details: '' },
                { timestamp: '2023-05-11T10:15:30', ip: '192.168.1.103', user: 'unknown', event: 'Brute force attempt', severity: 'critical', details: 'Multiple failed login attempts' }
            ];
            renderSecurityLogs(securityLogs);
        });
    }
    
    // Load analytics data
    function loadAnalyticsData() {
        fetch('/api/admin/analytics', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load analytics');
            }
            return response.json();
        })
        .then(data => {
            analyticsData = data;
            renderAnalytics(analyticsData);
        })
        .catch(error => {
            console.error('Error loading analytics:', error);
            
            // For demonstration, use mock data
            analyticsData = {
                totalUsers: 124,
                activeUsers: 18,
                newUsers: 5,
                flaggedUsers: 2
            };
            renderAnalytics(analyticsData);
        });
    }
    
    // Render users
    function renderUsers(usersToRender) {
        const userTableBody = document.getElementById('userTableBody');
        userTableBody.innerHTML = '';
        
        if (usersToRender.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="7" style="text-align: center;">No users found</td>`;
            userTableBody.appendChild(emptyRow);
            return;
        }
        
        usersToRender.forEach(user => {
            const row = document.createElement('tr');
            
            // Format date
            const joinDate = new Date(user.createdAt);
            const formattedDate = joinDate.toLocaleDateString();
            
            // Create status class
            const statusClass = `status-${user.status}`;
            
            row.innerHTML = `
                <td><img src="${user.profilePicture}" alt="${user.name}" class="user-avatar"></td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="user-status ${statusClass}">${user.status}</span></td>
                <td>${formattedDate}</td>
                <td class="user-actions">
                    <button class="edit-btn" data-user-id="${user._id}" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.status !== 'suspended' ? 
                        `<button class="suspend-btn" data-user-id="${user._id}" title="Suspend User">
                            <i class="fas fa-pause"></i>
                        </button>` : 
                        `<button class="suspend-btn" data-user-id="${user._id}" title="Reactivate User">
                            <i class="fas fa-play"></i>
                        </button>`
                    }
                    ${user.status !== 'banned' ? 
                        `<button class="ban-btn" data-user-id="${user._id}" title="Ban User">
                            <i class="fas fa-ban"></i>
                        </button>` : 
                        `<button class="ban-btn" data-user-id="${user._id}" title="Unban User">
                            <i class="fas fa-undo"></i>
                        </button>`
                    }
                </td>
            `;
            
            userTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.dataset.userId;
                editUser(userId);
            });
        });
        
        document.querySelectorAll('.suspend-btn').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.dataset.userId;
                const user = users.find(u => u._id === userId);
                if (user.status === 'suspended') {
                    reactivateUser(userId);
                } else {
                    suspendUser(userId);
                }
            });
        });
        
        document.querySelectorAll('.ban-btn').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.dataset.userId;
                const user = users.find(u => u._id === userId);
                if (user.status === 'banned') {
                    unbanUser(userId);
                } else {
                    banUser(userId);
                }
            });
        });
    }
    
    // Render security logs
    function renderSecurityLogs(logsToRender) {
        const securityLogTableBody = document.getElementById('securityLogTableBody');
        securityLogTableBody.innerHTML = '';
        
        if (logsToRender.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="6" style="text-align: center;">No security logs found</td>`;
            securityLogTableBody.appendChild(emptyRow);
            return;
        }
        
        logsToRender.forEach(log => {
            const row = document.createElement('tr');
            
            // Format date
            const logDate = new Date(log.timestamp);
            const formattedDate = logDate.toLocaleString();
            
            // Apply severity class
            const severityClass = `log-${log.severity}`;
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${log.ip}</td>
                <td>${log.user}</td>
                <td>${log.event}</td>
                <td class="${severityClass}">${log.severity}</td>
                <td>${log.details}</td>
            `;
            
            securityLogTableBody.appendChild(row);
        });
    }
    
    // Render analytics
    function renderAnalytics(data) {
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('activeUsers').textContent = data.activeUsers;
        document.getElementById('newUsers').textContent = data.newUsers;
        document.getElementById('flaggedUsers').textContent = data.flaggedUsers;
        
        // In a real implementation, you would render charts here
        document.getElementById('monthlyActiveUsersChart').innerHTML = 
            '<div style="text-align:center;">Monthly active users chart will be displayed here</div>';
    }
    
    // Filter users
    function filterUsers() {
        const searchTerm = userSearchInput.value.toLowerCase();
        const statusFilter = userStatusFilter.value;
        const roleFilter = userRoleFilter.value;
        
        const filteredUsers = users.filter(user => {
            // Apply search filter
            const matchesSearch = 
                user.name.toLowerCase().includes(searchTerm) || 
                user.email.toLowerCase().includes(searchTerm);
            
            // Apply status filter
            const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
            
            // Apply role filter
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            
            return matchesSearch && matchesStatus && matchesRole;
        });
        
        renderUsers(filteredUsers);
    }
    
    // Filter security logs
    function filterSecurityLogs() {
        const searchTerm = securitySearchInput.value.toLowerCase();
        const severityFilter = securitySeverityFilter.value;
        
        const filteredLogs = securityLogs.filter(log => {
            // Apply search filter
            const matchesSearch = 
                log.user.toLowerCase().includes(searchTerm) || 
                log.event.toLowerCase().includes(searchTerm) ||
                log.details.toLowerCase().includes(searchTerm);
            
            // Apply severity filter
            const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
            
            return matchesSearch && matchesSeverity;
        });
        
        renderSecurityLogs(filteredLogs);
    }
    
    // User management functions
    function editUser(userId) {
        // Implement edit user functionality
        // This would typically open a modal with user details
        showMessage(`Edit user functionality for user ID: ${userId} will be implemented soon.`, 'info');
    }
    
    function suspendUser(userId) {
        const user = users.find(u => u._id === userId);
        if (!user) return;
        
        showConfirmModal(
            'Suspend User',
            `Are you sure you want to suspend user "${user.name}"?`,
            () => {
                // Call API to suspend user
                updateUserStatus(userId, 'suspended', () => {
                    user.status = 'suspended';
                    renderUsers(users);
                    showMessage(`User ${user.name} has been suspended.`, 'success');
                });
            }
        );
    }
    
    function reactivateUser(userId) {
        const user = users.find(u => u._id === userId);
        if (!user) return;
        
        showConfirmModal(
            'Reactivate User',
            `Are you sure you want to reactivate user "${user.name}"?`,
            () => {
                // Call API to reactivate user
                updateUserStatus(userId, 'active', () => {
                    user.status = 'active';
                    renderUsers(users);
                    showMessage(`User ${user.name} has been reactivated.`, 'success');
                });
            }
        );
    }
    
    function banUser(userId) {
        const user = users.find(u => u._id === userId);
        if (!user) return;
        
        showConfirmModal(
            'Ban User',
            `Are you sure you want to ban user "${user.name}"? This action is severe.`,
            () => {
                // Use admin WebSocket to ban user
                if (window.adminWs) {
                    const reason = prompt('Enter reason for banning (optional):');
                    window.adminWs.banUser(userId, reason);
                } else {
                    // Fallback to REST API
                    updateUserStatus(userId, 'banned', () => {
                        user.status = 'banned';
                        renderUsers(users);
                        showMessage(`User ${user.name} has been banned.`, 'success');
                    });
                }
            }
        );
    }
     
    function unbanUser(userId) {
        const user = users.find(u => u._id === userId);
        if (!user) return;
        
        showConfirmModal(
            'Unban User',
            `Are you sure you want to unban user "${user.name}"?`,
            () => {
                // Use admin WebSocket to unban user
                if (window.adminWs) {
                    window.adminWs.unbanUser(userId);
                } else {
                    // Fallback to REST API
                    updateUserStatus(userId, 'active', () => {
                        user.status = 'active';
                        renderUsers(users);
                        showMessage(`User ${user.name} has been unbanned.`, 'success');
                    });
                }
            }
        );
    }

    function updateUserStatus(userId, status, callback) {
        fetch(`/api/admin/user/${userId}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ status })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update user status');
            }
            return response.json();
        })
        .then(data => {
            callback();
        })
        .catch(error => {
            console.error('Error updating user status:', error);
            showMessage('Failed to update user status. Please try again.', 'error');
        });
    }
    
    // Utility functions
    function showLoading() {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = 'flex';
        }
    }
    
    function hideLoading() {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }
    
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
    
    function showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const titleElement = document.getElementById('confirmTitle');
        const messageElement = document.getElementById('confirmMessage');
        const confirmButton = document.getElementById('confirmButton');
        const cancelButton = document.getElementById('cancelButton');
        const closeButton = document.getElementById('closeConfirmModal');
        
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        // Show modal
        modal.style.display = 'block';
        
        // Setup buttons
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        // Remove existing event listeners by cloning and replacing elements
        const newConfirmButton = confirmButton.cloneNode(true);
        const newCancelButton = cancelButton.cloneNode(true);
        const newCloseButton = closeButton.cloneNode(true);
        
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
        cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
        closeButton.parentNode.replaceChild(newCloseButton, closeButton);
        
        // Add new event listeners
        newConfirmButton.addEventListener('click', () => {
            onConfirm();
            closeModal();
        });
        
        newCancelButton.addEventListener('click', closeModal);
        newCloseButton.addEventListener('click', closeModal);
        
        // Close when clicking outside
        window.addEventListener('click', function modalOutsideClick(event) {
            if (event.target === modal) {
                closeModal();
                window.removeEventListener('click', modalOutsideClick);
            }
        });
    }
    
    // Update components.js to show Admin Panel button
    function updateAdminButton() {
        fetch('/api/auth/user', {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(user => {
            const adminButton = document.getElementById('adminPanelButton');
            if (adminButton) {
                adminButton.style.display = user && user.role === 'admin' ? 'inline-block' : 'none';
            }
        })
        .catch(error => {
            console.error('Error checking user role:', error);
        });
    }
    
    // Initialize
    init();
    updateAdminButton();
});