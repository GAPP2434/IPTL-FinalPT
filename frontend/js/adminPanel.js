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
        setupStatusObserver();
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

        // Add event listeners for subtabs
        document.querySelectorAll('.subtab-button').forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all subtabs
                document.querySelectorAll('.subtab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.subtab-panel').forEach(panel => {
                    panel.classList.remove('active');
                });
                
                // Add active class to clicked subtab
                button.classList.add('active');
                const subtabId = button.dataset.subtab + '-content';
                document.getElementById(subtabId).classList.add('active');
                
                // Load data for reported posts tab if selected
                if (button.dataset.subtab === 'reported-posts') {
                    loadReportedPosts();
                }
            });
        });
    }
    
    function setupStatusObserver() {
        // Create a MutationObserver to update user statuses if DOM changes
        const userTableBody = document.getElementById('userTableBody');
        if (!userTableBody) return;
        
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // Check each added node
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.tagName === 'TR' && node.dataset.userId) {
                            const userId = node.dataset.userId;
                            const userIndex = users.findIndex(u => u._id === userId);
                            
                            if (userIndex !== -1) {
                                const status = users[userIndex].status;
                                const statusCell = node.querySelector('.user-status');
                                
                                if (statusCell) {
                                    statusCell.classList.remove('status-active', 'status-banned', 'status-suspended');
                                    statusCell.classList.add(`status-${status}`);
                                    statusCell.textContent = status;
                                }
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(userTableBody, {
            childList: true,
            subtree: true
        });
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
            
            // Add data-user-id attribute to the row
            row.dataset.userId = user._id;
            
            // Format date
            const joinDate = new Date(user.createdAt);
            const formattedDate = joinDate.toLocaleDateString();
            
            // Create status class
            const statusClass = `status-${user.status}`;
            
            // Determine button icons and titles based on user status
            const banButtonIcon = user.status === 'banned' ? 'fa-undo' : 'fa-ban';
            const banButtonTitle = user.status === 'banned' ? 'Unban User' : 'Ban User';
            const suspendButtonIcon = user.status === 'suspended' ? 'fa-play' : 'fa-pause';
            const suspendButtonTitle = user.status === 'suspended' ? 'Reactivate User' : 'Suspend User';
            
            row.innerHTML = `
                <td><img src="${user.profilePicture}" alt="${user.name}" class="user-avatar"></td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="user-status ${statusClass}">${user.status}</span></td>
                <td>${formattedDate}</td>
                <td class="user-actions">
                    <button class="action-btn edit-btn" data-user-id="${user._id}" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn suspend-btn" data-user-id="${user._id}" title="${suspendButtonTitle}">
                        <i class="fas ${suspendButtonIcon}"></i>
                    </button>
                    <button class="action-btn ban-btn" data-user-id="${user._id}" title="${banButtonTitle}">
                        <i class="fas ${banButtonIcon}"></i>
                    </button>
                </td>
            `;
            
            userTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        attachActionButtonHandlers();
    }
    
    // Create a separate function to attach event handlers to action buttons
    function attachActionButtonHandlers() {
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
                // Get reason via prompt
                const reason = prompt('Enter reason for suspension (optional):');
                
                // Get duration with clear format guidance
                const duration = prompt('Enter suspension duration (format: 1h = 1 hour, 3d = 3 days, 30m = 30 minutes):', '24h');
    
                // Immediately update UI to show suspended status
                updateUserStatusInUI(userId, 'suspended');
                
                // Show success message
                showMessage(`User ${user.name} has been suspended.`, 'success');
                
                // Send suspend command via WebSocket
                if (window.adminWs) {
                    window.adminWs.suspendUser(userId, reason, duration);
                } else {
                    // Fallback to REST API if WebSocket not available
                    updateUserStatus(userId, 'suspended');
                }
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
                // Immediately update UI to show active status
                updateUserStatusInUI(userId, 'active');
                
                // Show success message
                showMessage(`User ${user.name} has been reactivated.`, 'success');
                
                // Send reactivate command via WebSocket
                if (window.adminWs) {
                    window.adminWs.suspendUser(userId, 'Reactivated by admin', '0h'); // Immediate reactivation
                } else {
                    // Fallback to REST API if WebSocket not available
                    updateUserStatus(userId, 'active');
                }
            }
        );
    }
    
    function banUser(userId) {
        const user = users.find(u => u._id === userId);
        if (!user) return;
    
        showConfirmModal(
            'Ban User',
            `Are you sure you want to ban user "${user.name}"?`,
            () => {
                // Get reason via prompt
                const reason = prompt('Enter reason for banning (optional):');
    
                // Immediately update UI to show banned status
                updateUserStatusInUI(userId, 'banned');
                
                // Show success message
                showMessage(`User ${user.name} has been banned.`, 'success');
                
                // Send ban command via WebSocket
                if (window.adminWs) {
                    window.adminWs.banUser(userId, reason);  // <-- Call the WebSocket function
                } else {
                    // Fallback to REST API if WebSocket not available
                    updateUserStatus(userId, 'banned');
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
                // Immediately update UI to show active status
                updateUserStatusInUI(userId, 'active');
                
                // Show success message
                showMessage(`User ${user.name} has been unbanned.`, 'success');
                
                // Send unban command via WebSocket
                if (window.adminWs) {
                    window.adminWs.unbanUser(userId);
                } else {
                    // Fallback to REST API if WebSocket not available
                    updateUserStatus(userId, 'active');
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

    function updateUserStatusInUI(userId, newStatus) {
        // Update data in the users array
        const userIndex = users.findIndex(u => u._id === userId);
        if (userIndex !== -1) {
            users[userIndex].status = newStatus;
        }
        
        // Find the user row in the table
        const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (!userRow) return;
        
        // Update status cell
        const statusCell = userRow.querySelector('.user-status');
        if (statusCell) {
            // Remove all status classes and add the new one
            statusCell.classList.remove('status-active', 'status-banned', 'status-suspended');
            statusCell.classList.add(`status-${newStatus}`);
            statusCell.textContent = newStatus;
        }
        
        // Update action buttons based on new status
        const banBtn = userRow.querySelector('.ban-btn');
        if (banBtn) {
            if (newStatus === 'banned') {
                banBtn.innerHTML = '<i class="fas fa-undo"></i>';
                banBtn.title = 'Unban User';
            } else {
                banBtn.innerHTML = '<i class="fas fa-ban"></i>';
                banBtn.title = 'Ban User';
            }
        }
        
        const suspendBtn = userRow.querySelector('.suspend-btn');
        if (suspendBtn) {
            if (newStatus === 'suspended') {
                suspendBtn.innerHTML = '<i class="fas fa-play"></i>';
                suspendBtn.title = 'Reactivate User';
            } else {
                suspendBtn.innerHTML = '<i class="fas fa-pause"></i>';
                suspendBtn.title = 'Suspend User';
            }
        }
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

    // Add this function to update users array when changed via WebSocket
    function updateUserInArray(userId, updateData) {
        if (!users) return;
        
        const userIndex = users.findIndex(u => u._id === userId);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updateData };
        }
    }

    function loadReportedPosts() {
        const reportedPostsList = document.getElementById('reportedPostsList');
        reportedPostsList.innerHTML = '<div class="loading-message">Loading reported posts...</div>';
        
        fetch('/api/posts/reports', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load reported posts');
            }
            
            // Check if content type is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Session might have expired
                if (response.status === 401 || response.status === 403) {
                    window.location.href = 'login.html'; // Redirect to login
                    throw new Error('Session expired');
                }
                throw new Error('Unexpected response format');
            }
            
            return response.json();
        })
        .then(reportedPosts => {
            if (!reportedPosts || reportedPosts.length === 0) {
                reportedPostsList.innerHTML = '<div class="no-reports-message">No reported posts to review.</div>';
                return;
            }
            
            renderReportedPosts(reportedPosts);
        })
        .catch(error => {
            console.error('Error loading reported posts:', error);
            
            if (error.message === 'Session expired') {
                reportedPostsList.innerHTML = '<div class="error-message">Your session has expired. Please <a href="login.html">log in</a> again.</div>';
            } else {
                reportedPostsList.innerHTML = '<div class="error-message">Failed to load reported posts. Please try again.</div>';
            }
        });
    }

    function renderReportedPosts(reportedPosts) {
        const reportedPostsList = document.getElementById('reportedPostsList');
        reportedPostsList.innerHTML = '';
        
        reportedPosts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('reported-post-item');
            postElement.dataset.postId = post.postId;
            
            // Create media HTML if post has an image
            const mediaHtml = post.media ? 
                `<img src="${post.media}" alt="Post image" class="reported-post-image">` : '';
            
            // Create reports list HTML
            const reportsHtml = post.reports.map(report => {
                const reportDate = new Date(report.date).toLocaleString();
                const reportStatus = report.status === 'dismissed' ? 
                    '<span class="report-status dismissed">(Dismissed)</span>' : '';
                
                return `
                    <div class="report-item" data-report-id="${report.id}">
                        <div class="report-info">
                            <strong>Reported by:</strong> ${report.reportedBy.name} on ${reportDate} ${reportStatus}
                        </div>
                        <div class="report-reason">
                            <strong>Reason:</strong> ${report.reason}
                        </div>
                        ${report.status !== 'dismissed' ? 
                            `<button class="dismiss-single-report-btn" data-report-id="${report.id}">
                                Dismiss this report
                            </button>` : ''}
                    </div>
                `;
            }).join('');
            
            // Create post HTML
            postElement.innerHTML = `
                <div class="reported-post-header">
                    <div class="reported-post-user">
                        <img src="${post.userAvatar}" alt="${post.username}" class="reported-post-avatar">
                        <div class="reported-post-user-info">
                            <div class="reported-post-username">${post.username}</div>
                            <div class="reported-post-timestamp">${new Date(post.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <div class="reported-post-content">
                    <p>${post.content}</p>
                    ${mediaHtml}
                </div>
                <div class="report-list">
                    <h4>Reports (${post.reports.length}):</h4>
                    ${reportsHtml}
                </div>
                <div class="report-actions">
                    <button class="report-action-btn dismiss-report-btn" data-post-id="${post.postId}">Ignore All Reports</button>
                    <button class="report-action-btn remove-post-btn" data-post-id="${post.postId}">Remove Post</button>
                </div>
            `;
            
            reportedPostsList.appendChild(postElement);
        });
        
        // Add event listeners for action buttons
        attachReportActionHandlers();
    }

    function attachReportActionHandlers() {
        // Remove post button
        document.querySelectorAll('.remove-post-btn').forEach(button => {
            button.addEventListener('click', () => {
                const postId = button.dataset.postId;
                showConfirmModal(
                    'Remove Post',
                    'Are you sure you want to remove this post? The user will be notified that their post violated community guidelines.',
                    () => removeReportedPost(postId)
                );
            });
        });
        
        // Ignore all reports button
        document.querySelectorAll('.dismiss-report-btn').forEach(button => {
            button.addEventListener('click', () => {
                const postId = button.dataset.postId;
                showConfirmModal(
                    'Ignore Reports',
                    'Are you sure you want to ignore all reports for this post?',
                    () => dismissAllReports(postId)
                );
            });
        });
        
        // Dismiss single report button
        document.querySelectorAll('.dismiss-single-report-btn').forEach(button => {
            button.addEventListener('click', () => {
                const reportId = button.dataset.reportId;
                const postId = button.closest('.reported-post-item').dataset.postId;
                dismissSingleReport(postId, reportId);
            });
        });
    }

    function removeReportedPost(postId) {
        fetch(`/api/posts/reports/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to remove post');
            }
            return response.json();
        })
        .then(data => {
            // Remove the post element from the DOM
            const postElement = document.querySelector(`.reported-post-item[data-post-id="${postId}"]`);
            if (postElement) {
                postElement.remove();
            }
            
            // Check if no more reported posts
            const reportedPostsList = document.getElementById('reportedPostsList');
            if (reportedPostsList.children.length === 0) {
                reportedPostsList.innerHTML = '<div class="no-reports-message">No reported posts to review.</div>';
            }
            
            showMessage('Post removed successfully', 'success');
        })
        .catch(error => {
            console.error('Error removing post:', error);
            showMessage('Failed to remove post. Please try again.', 'error');
        });
    }

    function dismissAllReports(postId) {
        // Get all report IDs for this post
        const postElement = document.querySelector(`.reported-post-item[data-post-id="${postId}"]`);
        if (!postElement) return;
        
        const reportElements = postElement.querySelectorAll('.report-item');
        const reportIds = Array.from(reportElements).map(el => el.dataset.reportId);
        
        // Create promises for all dismissal requests
        const dismissPromises = reportIds.map(reportId => {
            return fetch(`/api/posts/reports/${postId}/dismiss/${reportId}`, {
                method: 'PUT',
                credentials: 'include'
            });
        });
        
        // Execute all promises
        Promise.all(dismissPromises)
            .then(() => {
                // Remove the post element from the DOM
                postElement.remove();
                
                // Check if no more reported posts
                const reportedPostsList = document.getElementById('reportedPostsList');
                if (reportedPostsList.children.length === 0) {
                    reportedPostsList.innerHTML = '<div class="no-reports-message">No reported posts to review.</div>';
                }
                
                showMessage('All reports dismissed successfully', 'success');
            })
            .catch(error => {
                console.error('Error dismissing reports:', error);
                showMessage('Failed to dismiss reports. Please try again.', 'error');
            });
    }

    function dismissSingleReport(postId, reportId) {
        fetch(`/api/posts/reports/${postId}/dismiss/${reportId}`, {
            method: 'PUT',
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to dismiss report');
            }
            return response.json();
        })
        .then(data => {
            // Update the report item in the DOM
            const reportElement = document.querySelector(`.report-item[data-report-id="${reportId}"]`);
            if (reportElement) {
                const dismissButton = reportElement.querySelector('.dismiss-single-report-btn');
                if (dismissButton) dismissButton.remove();
                
                const reportInfo = reportElement.querySelector('.report-info');
                if (reportInfo) {
                    reportInfo.innerHTML += ' <span class="report-status dismissed">(Dismissed)</span>';
                }
            }
            
            showMessage('Report dismissed successfully', 'success');
        })
        .catch(error => {
            console.error('Error dismissing report:', error);
            showMessage('Failed to dismiss report. Please try again.', 'error');
        });
    }

    // Expose the function globally
    window.showMessage = showMessage;
    window.updateUserStatusInUI = updateUserStatusInUI;
    window.updateUserInArray = function(userId, updateData) {
        const userIndex = users.findIndex(u => u._id === userId);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updateData };
        }
    };
    // Initialize
    init();
    updateAdminButton();
});