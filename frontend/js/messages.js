document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const userSearchInput = document.getElementById('userSearchInput');
    const searchButton = document.getElementById('searchButton');
    const conversationsList = document.getElementById('conversationsList');
    const newMessageButton = document.getElementById('newMessageButton');
    const findPeopleModal = document.getElementById('findPeopleModal');
    const closeFindPeopleModal = document.getElementById('closeFindPeopleModal');
    const modalSearchInput = document.getElementById('modalSearchInput');
    const modalSearchButton = document.getElementById('modalSearchButton');
    const searchResults = document.getElementById('searchResults');
    const emptyChat = document.getElementById('emptyChat');
    const chatArea = document.getElementById('chatArea');
    const chatUsername = document.getElementById('chatUsername');
    const chatUserImg = document.getElementById('chatUserImg');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendMessageButton = document.getElementById('sendMessageButton');
    const newGroupButton = document.getElementById('newGroupButton');
    const groupChatModal = document.getElementById('groupChatModal');
    const closeGroupChatModal = document.getElementById('closeGroupChatModal');
    const groupNameInput = document.getElementById('groupNameInput');
    const groupSearchInput = document.getElementById('groupSearchInput');
    const groupSearchButton = document.getElementById('groupSearchButton');
    const groupSearchResults = document.getElementById('groupSearchResults');
    const selectedMembersList = document.getElementById('selectedMembersList');
    const memberCount = document.getElementById('memberCount');
    const createGroupButton = document.getElementById('createGroupButton');
    const groupMenuContainer = document.getElementById('groupMenuContainer');
    const groupMenuButton = document.getElementById('groupMenuButton');
    const groupDropdown = document.getElementById('groupDropdown');
    const viewMembersButton = document.getElementById('viewMembersButton');
    const groupMembersModal = document.getElementById('groupMembersModal');
    const closeGroupMembersModal = document.getElementById('closeGroupMembersModal');
    const groupMembersTitle = document.getElementById('groupMembersTitle');
    const groupMembersList = document.getElementById('groupMembersList');
    
    // State
    let currentRecipient = null;
    let conversations = [];
    let onlineUsers = [];
    window.onlineUsers = onlineUsers;

    // Initialize
    function init() {
        loadOnlineUsers();
        loadConversations();
        setupEventListeners();
        
        // Reconnect WebSocket if needed
        if (window.connectWebSocket && typeof window.connectWebSocket === 'function') {
            console.log("Initializing WebSocket connection");
            window.connectWebSocket();
        }
    }

    // Add this new function to load online users
    function loadOnlineUsers() {
        fetch('/api/messages/online-users', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load online users');
            }
            return response.json();
        })
        .then(data => {
            onlineUsers = data;
            window.onlineUsers = onlineUsers;
            
            // Update UI if conversations are already loaded
            if (conversations.length > 0) {
                renderConversations();
            }
        })
        .catch(error => {
            console.error('Error loading online users:', error);
        });
    }

    // Global function to check if a group has online members
    function isGroupOnline(groupMembers) {
        if (!groupMembers || !Array.isArray(groupMembers) || !window.onlineUsers) {
            return false;
        }
        
        // Convert all IDs to strings for comparison
        const memberIds = groupMembers.map(id => typeof id === 'string' ? id : id.toString());
        const onlineUserIds = window.onlineUsers.map(id => typeof id === 'string' ? id : id.toString());
        
        // Check if any member IDs are in the online users list
        return memberIds.some(memberId => onlineUserIds.includes(memberId));
    }

    // Function to update all online status indicators
    function updateAllOnlineStatus() {
        // Update all conversation items in the list
        conversations.forEach(conversation => {
            let isOnline = false;
            const selector = `.conversation-item[data-user-id="${conversation.userId}"] .online-indicator`;
            const indicator = document.querySelector(selector);
            
            if (conversation.isGroup && conversation.members) {
                // Calculate new status
                isOnline = isGroupOnline(conversation.members);
                
                // Only update if status changed
                if (conversation.hasOnlineMembers !== isOnline) {
                    // Store the online status in the conversation object
                    conversation.hasOnlineMembers = isOnline;
                    
                    // Update indicator if found
                    if (indicator) {
                        indicator.classList.remove('online', 'offline');
                        indicator.classList.add(isOnline ? 'online' : 'offline');
                    }
                }
            } else {
                // Calculate new status
                isOnline = window.onlineUsers && window.onlineUsers.includes(conversation.userId);
                
                // Only update if status changed
                if (conversation.isOnline !== isOnline) {
                    conversation.isOnline = isOnline;
                    
                    // Update indicator if found
                    if (indicator) {
                        indicator.classList.remove('online', 'offline');
                        indicator.classList.add(isOnline ? 'online' : 'offline');
                    }
                }
            }
            
            // Only update the active conversation header if this is selected and status changed
            if (currentRecipient === conversation.userId) {
                const headerIndicator = document.querySelector('.chat-header-name-container .online-indicator');
                const statusText = document.querySelector('.chat-status');
                
                if (headerIndicator && headerIndicator.classList.contains(isOnline ? 'offline' : 'online')) {
                    headerIndicator.classList.remove('online', 'offline');
                    headerIndicator.classList.add(isOnline ? 'online' : 'offline');
                    
                    if (statusText) {
                        statusText.textContent = isOnline ? 'Online' : 'Offline';
                    }
                }
            }
        });
    }
    
    // Load conversations from server
    function loadConversations() {
        showLoading();
        
        fetch('/api/messages/conversations', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load conversations');
            }
            return response.json();
        })
        .then(data => {
            conversations = data;
            renderConversations();
            hideLoading();
        })
        .catch(error => {
            console.error('Error loading conversations:', error);
            hideLoading();
            
            // Fallback to localStorage for demo/testing
            const savedConversations = localStorage.getItem('conversations');
            if (savedConversations) {
                conversations = JSON.parse(savedConversations);
                renderConversations();
            }
        });
    }
    
    // Render conversations list
    function renderConversations() {
        console.log("Rendering conversations:", conversations);
        
        if (conversations.length === 0) {
            conversationsList.innerHTML = '<div class="no-messages">No Recent Messages</div>';
            return;
        }
        
        // Completely clear and rebuild the conversations list
        conversationsList.innerHTML = '';
        
        conversations.forEach(conversation => {
            const conversationItem = createConversationElement(conversation);
            
            // Add click event listener to each conversation item
            conversationItem.addEventListener('click', () => {
                selectConversation(conversation);
            });
            
            conversationsList.appendChild(conversationItem);
        });
        
        // If there's an active conversation, reapply the active class
        if (currentRecipient) {
            const activeItem = document.querySelector(`.conversation-item[data-user-id="${currentRecipient}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }
    
    // Create conversation element
    function createConversationElement(conversation) {
        const div = document.createElement('div');
        div.classList.add('conversation-item');
        if (conversation.unreadCount > 0) {
            div.classList.add('unread');
        }
        div.dataset.userId = conversation.userId;
        
        // Check if user is online - handle groups differently
        let isOnline = false;
        
        if (conversation.isGroup && conversation.members) {
            // First check if we have a previously calculated value
            if (typeof conversation.hasOnlineMembers !== 'undefined') {
                isOnline = conversation.hasOnlineMembers;
            } else {
                // Otherwise calculate it
                const memberIds = conversation.members.map(memberId => 
                    typeof memberId === 'string' ? memberId : memberId.toString()
                );
                const onlineUserIds = window.onlineUsers.map(id => id.toString());
                isOnline = memberIds.some(memberId => onlineUserIds.includes(memberId));
                
                // Store the result for next time
                conversation.hasOnlineMembers = isOnline;
            }
        } else {
            // For regular users, check if the user is online
            isOnline = window.onlineUsers && window.onlineUsers.includes(conversation.userId);
        }
        
        div.innerHTML = `
            <img src="${conversation.profilePicture}" alt="${conversation.name}" class="conversation-avatar">
            <div class="conversation-info">
                <div class="conversation-name-container">
                    <div class="conversation-name">${conversation.name}</div>
                    <span class="online-indicator ${isOnline ? 'online' : 'offline'}" 
                          data-user-id="${conversation.isGroup ? 'group-' + conversation.userId : conversation.userId}"></span>
                </div>
                <div class="conversation-preview">${conversation.lastMessage || 'No messages yet'}</div>
            </div>
            ${conversation.unreadCount ? `<span class="unread-badge">${conversation.unreadCount}</span>` : ''}
        `;
        
        // Rest of the function remains the same
        return div;
    }
    
    // Update the selectConversation function
    function selectConversation(conversation) {
        // Update UI to show this conversation is selected
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const conversationItem = document.querySelector(`.conversation-item[data-user-id="${conversation.userId}"]`);
        if (conversationItem) {
            conversationItem.classList.add('active');
            conversationItem.classList.remove('unread');
            
            // Remove unread badge
            const badge = conversationItem.querySelector('.unread-badge');
            if (badge) {
                badge.remove();
            }
            
            // Update the conversation object
            const conversationIndex = conversations.findIndex(c => c.userId === conversation.userId);
            if (conversationIndex >= 0) {
                conversations[conversationIndex].unreadCount = 0;
            }
        }
        
        // Set current recipient
        currentRecipient = conversation.userId;
        window.currentRecipient = currentRecipient;
        
        // Update chat header elements
        const chatUser = document.querySelector('.chat-user');
        const userImg = document.getElementById('chatUserImg');
        userImg.src = conversation.profilePicture;
        
        // Check if this is a group chat
        if (conversation.isGroup) {
            // For group chats, show group name
            document.getElementById('chatUsername').textContent = conversation.name;
            
            // Show group menu
            document.getElementById('groupMenuContainer').style.display = 'block';
            
            // Store group data for later use
            currentGroup = {
                id: conversation.userId,
                name: conversation.name,
                members: conversation.members || []
            };
            
            // Check if any member of the group is online - use the stored value instead of recalculating
            const hasOnlineMembers = conversation.hasOnlineMembers || false;
            
            // Update ONLY this conversation's header indicator, not all indicators
            const statusIndicator = document.querySelector('.chat-header-name-container .online-indicator');
            if (statusIndicator) {
                statusIndicator.style.display = 'inline-block'; // Show the indicator
                statusIndicator.className = `online-indicator ${hasOnlineMembers ? 'online' : 'offline'}`;
                statusIndicator.dataset.userId = 'group-' + conversation.userId; // Add 'group-' prefix to avoid conflicts
            }
            
            const chatStatus = document.querySelector('.chat-status');
            if (chatStatus) {
                chatStatus.style.display = 'block';
                chatStatus.textContent = hasOnlineMembers ? 'Online' : 'Offline';
            }
        } else {
            // For regular users - similar change using stored value
            // For regular users, show online status and hide group menu
            document.getElementById('groupMenuContainer').style.display = 'none';
            
            // Check if user is online - use includes with toString() for consistency
            const isOnline = onlineUsers.includes(conversation.userId.toString());
            
            // Update username and online status
            document.getElementById('chatUsername').textContent = conversation.name;
            const statusIndicator = document.querySelector('.chat-header-name-container .online-indicator');
            if (statusIndicator) {
                statusIndicator.style.display = 'inline-block';
                statusIndicator.className = `online-indicator ${isOnline ? 'online' : 'offline'}`;
                statusIndicator.dataset.userId = conversation.userId;
            }
            
            const chatStatus = document.querySelector('.chat-status');
            if (chatStatus) {
                chatStatus.style.display = 'block';
                chatStatus.textContent = isOnline ? 'Online' : 'Offline';
            }
        }
        
        // Show chat area and hide empty state
        document.getElementById('emptyChat').style.display = 'none';
        document.getElementById('chatArea').style.display = 'flex';
        
        // Load messages for this conversation
        loadMessages(conversation.userId);
    }
    
    // Load messages for a conversation
    function loadMessages(userId) {
        // Clear messages container
        messagesContainer.innerHTML = '';
        showLoading();
        
        fetch(`/api/messages/conversation/${userId}`, {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }
            return response.json();
        })
        .then(messages => {
            hideLoading();
            
            if (!messages.length) {
                messagesContainer.innerHTML = '<div class="no-messages-yet">No messages yet. Start the conversation!</div>';
                return;
            }
            
            // Group consecutive messages from the same sender
            let currentSenderId = null;
            let messageGroup = [];
            
            messages.forEach(message => {
                // For group messages, display differently
                if (message.isGroup) {
                    if (message.isSystemMessage) {
                        // System messages (like "X created group" or "X added Y to group")
                        appendSystemMessage(message.content, message.timestamp);
                    } else {
                        // Regular group message
                        appendGroupMessage(
                            message.content, 
                            message.isCurrentUser, 
                            message.senderName || 'Unknown',
                            message.senderAvatar,
                            message.timestamp
                        );
                    }
                } else {
                    // Regular direct message
                    appendMessage(message.content, message.isCurrentUser, message.timestamp);
                }
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        })
        .catch(error => {
            console.error('Error loading messages:', error);
            hideLoading();
            messagesContainer.innerHTML = '<div class="error-message">Failed to load messages. Please try again.</div>';
        });
    }
    
    // Append a message to the chat
    function appendMessage(text, sent, timestamp = new Date()) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(sent ? 'sent' : 'received');
        
        // Format the timestamp
        const formattedTime = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageElement.innerHTML = `
            <div class="message-content">${text}</div>
            <div class="message-time">${formattedTime}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Add a function to display system messages differently
    function appendSystemMessage(text, timestamp = new Date()) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system-message');
        
        // Format the timestamp
        const formattedTime = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageElement.innerHTML = `
            <div class="system-message-content">${text}</div>
            <div class="message-time">${formattedTime}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add a function to display group messages with sender name
    function appendGroupMessage(text, isSent, senderName, senderAvatar, timestamp = new Date()) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSent ? 'sent' : 'received');
        
        // Format the timestamp
        const formattedTime = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        if (!isSent) {
            // Only add sender info for messages from others
            messageElement.innerHTML = `
                <div class="group-message-header">
                    <img src="${senderAvatar || 'avatars/Avatar_Default_Anonymous.webp'}" class="group-sender-avatar">
                    <span class="group-sender-name">${senderName}</span>
                </div>
                <div class="message-content">${text}</div>
                <div class="message-time">${formattedTime}</div>
            `;
        } else {
            // Own messages don't need sender info
            messageElement.innerHTML = `
                <div class="message-content">${text}</div>
                <div class="message-time">${formattedTime}</div>
            `;
        }
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Send a message
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !currentRecipient) return;
        
        // Append message to UI immediately
        appendMessage(text, true);
        
        // Clear input
        messageInput.value = '';
        
        // Send to server
        fetch('/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                recipientId: currentRecipient,
                content: text
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            return response.json();
        })
        .then(data => {
            // Update conversation with new message (true means message is sent by current user)
            updateConversationWithNewMessage(currentRecipient, text, true);
        })
        .catch(error => {
            console.error('Error sending message:', error);
            
            // Even if server fails, update local state for demo purposes
            updateConversationWithNewMessage(currentRecipient, text, true);
        });
    }

    // Expose loadConversations to window for WebSocket updates
    window.renderConversations = renderConversations;
    window.appendMessage = appendMessage;
    window.appendGroupMessage = appendGroupMessage;
    window.updateConversationWithNewMessage = updateConversationWithNewMessage;
    window.conversations = conversations;
    window.loadConversations = loadConversations;
    window.currentRecipient = null;
    window.updateAllOnlineStatus = updateAllOnlineStatus; // Add this line
    window.isGroupOnline = isGroupOnline; // Add this line
    
    // Update conversation with new message (local state)
    function updateConversationWithNewMessage(userId, text, isSent = true) {
        const conversationIndex = conversations.findIndex(c => c.userId === userId);
        
        if (conversationIndex >= 0) {
            // Update existing conversation
            conversations[conversationIndex].lastMessage = text;
            // Don't increase unread count for messages the current user sent
            if (!isSent) {
                conversations[conversationIndex].unreadCount = 
                    (conversations[conversationIndex].unreadCount || 0) + 1;
            }
            
            // Move this conversation to the top
            const conversation = conversations.splice(conversationIndex, 1)[0];
            conversations.unshift(conversation);
        } else {
            // If this is a new conversation, try to add it (might need user details)
            loadConversations();
        }
        
        // Re-render conversations
        renderConversations();
    }
    
    // Search Function
    window.searchUtils.setupSearch({
        inputElement: userSearchInput,
        buttonElement: searchButton,
        endpoint: '/api/messages/search',
        renderResults: (users) => {
            // Your existing renderSearchResults function with message buttons
            renderSearchResults(users);
        },
        clearResults: () => {
            searchResults.innerHTML = '';
        }
    });
    
    // Render search results
    function renderSearchResults(results) {
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }
        
        results.forEach(user => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('search-result-item');
            
            resultItem.innerHTML = `
                <img src="${user.profilePicture}" alt="${user.name}" class="search-result-avatar">
                <div class="search-result-name">${user.name}</div>
                <button class="message-button" data-user-id="${user._id}">Message</button>
            `;
            
            searchResults.appendChild(resultItem);
        });
        
        // Add event listeners to message buttons
        document.querySelectorAll('.message-button').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.dataset.userId;
                startConversation(userId);
            });
        });
    }
    
    // Start a conversation with a user
    function startConversation(userId) {
        // Find if the conversation already exists
        let conversation = conversations.find(c => c.userId === userId);
        
        if (!conversation) {
            // Get user details from search results
            const userItem = document.querySelector(`.search-result-item button[data-user-id="${userId}"]`).parentNode;
            const userName = userItem.querySelector('.search-result-name').textContent;
            const userImg = userItem.querySelector('.search-result-avatar').src;
            
            // Create new conversation
            conversation = {
                userId: userId,
                name: userName,
                profilePicture: userImg,
                lastMessage: null,
                unreadCount: 0
            };
            
            // Add to conversations
            conversations.unshift(conversation);
            renderConversations();
        }
        
        // Close modal
        closeFindPeopleModal.click();
        
        // Select the conversation
        selectConversation(conversation);
    }
    
    // Open find people modal
    function openFindPeopleModal() {
        findPeopleModal.style.display = 'block';
        modalSearchInput.focus();
        
        // Clear previous results and search input
        searchResults.innerHTML = '';
        modalSearchInput.value = '';
    }
    
    // Show loading indicator
    function showLoading() {
        // Add loading indicator to your UI
        // For example:
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = 'flex';
        }
    }
    
    // Hide loading indicator
    function hideLoading() {
        // Remove loading indicator from your UI
        // For example:
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            loadingModal.style.display = 'none';
        }
    }

    function searchModalUsers(query) {
        if (!query.trim()) return;
        
        fetch(`/api/messages/search?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Search failed');
            }
            return response.json();
        })
        .then(results => {
            renderSearchResults(results);
        })
        .catch(error => {
            console.error('Error searching users:', error);
            searchResults.innerHTML = '<div class="no-results">Error searching users. Please try again.</div>';
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // New message button
        newMessageButton.addEventListener('click', openFindPeopleModal);
        
        // Close modal
        closeFindPeopleModal.addEventListener('click', () => {
            findPeopleModal.style.display = 'none';
        });
    
        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === findPeopleModal) {
                findPeopleModal.style.display = 'none';
            }
        });
        
        // Set up search for modal - need a separate instance
        modalSearchInput.addEventListener('input', window.searchUtils.debounce(function() {
            const query = modalSearchInput.value.trim();
            if (query.length >= 2) {
                // Use a function to handle modal search specifically
                searchModalUsers(query);
            } else if (query.length === 0) {
                searchResults.innerHTML = '';
            }
        }, 300));
    
        // Modal search button
        modalSearchButton.addEventListener('click', () => {
            const query = modalSearchInput.value.trim();
            if (query) {
                searchModalUsers(query);
            }
        });
        
        // Send message button
        sendMessageButton.addEventListener('click', sendMessage);
        
        // Message input (for hitting Enter)
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent new line
                sendMessage();
            }
        });
        
        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = (messageInput.scrollHeight) + 'px';
        });

        // Group chat modal
        newGroupButton.addEventListener('click', openGroupChatModal);
        
        closeGroupChatModal.addEventListener('click', () => {
            groupChatModal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === groupChatModal) {
                groupChatModal.style.display = 'none';
            }
        });
        
        // Group search
        groupSearchInput.addEventListener('input', window.searchUtils.debounce(function() {
            const query = groupSearchInput.value.trim();
            if (query.length >= 2) {
                searchUsersForGroup(query);
            } else if (query.length === 0) {
                groupSearchResults.innerHTML = '';
            }
        }, 300));
        
        groupSearchButton.addEventListener('click', () => {
            const query = groupSearchInput.value.trim();
            if (query) {
                searchUsersForGroup(query);
            }
        });

        // Group menu button
        groupMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            groupDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', () => {
            if (groupDropdown.classList.contains('show')) {
                groupDropdown.classList.remove('show');
            }
        });
        
        // View group members
        viewMembersButton.addEventListener('click', (e) => {
            e.preventDefault();
            showGroupMembers();
        });
        
        // Close group members modal
        closeGroupMembersModal.addEventListener('click', () => {
            groupMembersModal.style.display = 'none';
        });
        
        // Click outside group members modal to close
        window.addEventListener('click', (e) => {
            if (e.target === groupMembersModal) {
                groupMembersModal.style.display = 'none';
            }
        });
        
        // Create group button
        createGroupButton.addEventListener('click', createGroupChat);
        
        // Group name validation
        groupNameInput.addEventListener('input', validateGroupForm);
    }
    
    // Get current user info
    let currentUser = { _id: null };
    
    fetch('/api/auth/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(user => {
        currentUser = user;
        init();
    })
    .catch(error => {
        console.error('Error fetching user info:', error);
        init(); // Initialize anyway
    });

    // Open group chat modal
function openGroupChatModal() {
    // Reset the modal
    groupNameInput.value = '';
    groupSearchInput.value = '';
    groupSearchResults.innerHTML = '';
    selectedMembersList.innerHTML = '';
    memberCount.textContent = '0';
    createGroupButton.disabled = true;
    
    // Show the modal
    groupChatModal.style.display = 'block';
}

// Search users for group
function searchUsersForGroup(query) {
    if (!query.trim()) return;
    
    groupSearchResults.innerHTML = '<div class="loading-message">Searching...</div>';
    
    fetch(`/api/messages/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Search failed');
        }
        return response.json();
    })
    .then(results => {
        renderGroupSearchResults(results);
    })
    .catch(error => {
        console.error('Error searching users:', error);
        groupSearchResults.innerHTML = '<div class="no-results">Error searching users. Please try again.</div>';
    });
}

// Render group search results
function renderGroupSearchResults(results) {
    groupSearchResults.innerHTML = '';
    
    if (results.length === 0) {
        groupSearchResults.innerHTML = '<div class="no-results">No users found</div>';
        return;
    }
    
    // Get already selected member IDs
    const selectedMemberIds = Array.from(selectedMembersList.children).map(
        member => member.dataset.userId
    );
    
    results.forEach(user => {
        // Skip if user is already selected
        if (selectedMemberIds.includes(user._id)) {
            return;
        }
        
        const resultItem = document.createElement('div');
        resultItem.classList.add('search-result-item');
        
        resultItem.innerHTML = `
            <img src="${user.profilePicture}" alt="${user.name}" class="search-result-avatar">
            <div class="search-result-name">${user.name}</div>
            <button class="add-member-button" data-user-id="${user._id}" data-user-name="${user.name}" data-user-img="${user.profilePicture}">Add</button>
        `;
        
        groupSearchResults.appendChild(resultItem);
    });
    
    // Add event listeners to add buttons
    document.querySelectorAll('.add-member-button').forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.dataset.userId;
            const userName = button.dataset.userName;
            const userImg = button.dataset.userImg;
            
            addMemberToGroup(userId, userName, userImg);
            
            // Remove this user from search results
            button.closest('.search-result-item').remove();
        });
    });
}

// Add member to selected list
function addMemberToGroup(userId, userName, userImg) {
    const memberElement = document.createElement('div');
    memberElement.classList.add('selected-member');
    memberElement.dataset.userId = userId;
    
    memberElement.innerHTML = `
        <img src="${userImg}" alt="${userName}">
        <span>${userName}</span>
        <button class="remove-member-button" title="Remove"><i class="fas fa-times"></i></button>
    `;
    
    selectedMembersList.appendChild(memberElement);
    
    // Update member count
    memberCount.textContent = selectedMembersList.children.length;
    
    // Add event listener to remove button
    memberElement.querySelector('.remove-member-button').addEventListener('click', () => {
        memberElement.remove();
        memberCount.textContent = selectedMembersList.children.length;
        validateGroupForm();
    });
    
    // Validate the form
    validateGroupForm();
}

// Validate group chat form
function validateGroupForm() {
    const groupName = groupNameInput.value.trim();
    const memberCount = selectedMembersList.children.length;
    
    // Enable create button only if group name is provided and at least 2 members are selected
    createGroupButton.disabled = !(groupName && memberCount >= 2);
}

    // Create group chat
    function createGroupChat() {
        const groupName = groupNameInput.value.trim();
        
        if (!groupName) {
            alert('Please enter a group name');
            return;
        }
        
        const memberIds = Array.from(selectedMembersList.children).map(
            member => member.dataset.userId
        );
        
        if (memberIds.length < 2) {
            alert('Please add at least 2 members to the group');
            return;
        }
        
        showLoading();
        
        fetch('/api/messages/create-group', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: groupName,
                members: memberIds
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to create group chat');
            }
            return response.json();
        })
        .then(groupChat => {
            hideLoading();
            
            // Close the modal
            groupChatModal.style.display = 'none';
            
            // Add the new group chat to conversations and select it
            const newConversation = {
                userId: groupChat._id,
                name: groupChat.name,
                profilePicture: 'avatars/group-default.png',
                lastMessage: `${currentUser.name} created group "${groupName}"`,
                isGroup: true,
                members: groupChat.members,
                unreadCount: 0
            };
            
            conversations.unshift(newConversation);
            renderConversations();
            selectConversation(newConversation);
            
            // Show success message
            showMessage('Group chat created successfully', 'success');
        })
        .catch(error => {
            hideLoading();
            console.error('Error creating group chat:', error);
            showMessage('Failed to create group chat. Please try again.', 'error');
        });
    }

    // Add this function to show group members
    function showGroupMembers() {
        // Close the dropdown
        groupDropdown.classList.remove('show');
        
        // Set the modal title
        groupMembersTitle.textContent = `Members of ${currentGroup.name}`;
        
        // Show loading state
        groupMembersList.innerHTML = '<div class="loading-message">Loading members...</div>';
        
        // Show the modal
        groupMembersModal.style.display = 'block';
        
        // Fetch group members
        fetch(`/api/messages/group-members/${currentGroup.id}`, {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load group members');
            }
            return response.json();
        })
        .then(members => {
            renderGroupMembers(members);
        })
        .catch(error => {
            console.error('Error loading group members:', error);
            groupMembersList.innerHTML = '<div class="error-message">Failed to load group members. Please try again.</div>';
        });
    }
    // Function to render group members
    function renderGroupMembers(members) {
        if (!members || members.length === 0) {
            groupMembersList.innerHTML = '<div class="no-results">No members found</div>';
            return;
        }
        
        groupMembersList.innerHTML = '';
        
        members.forEach(member => {
            const memberItem = document.createElement('div');
            memberItem.classList.add('group-member-item');
            
            // Determine if member is creator/admin
            const isCreator = member.isCreator;
            const roleText = isCreator ? 'Group Creator' : 'Member';
            
            // Check if member is online - use the global onlineUsers array
            const isOnline = window.onlineUsers && window.onlineUsers.includes(member._id.toString());
            
            memberItem.innerHTML = `
                <img src="${member.profilePicture}" alt="${member.name}" class="group-member-avatar">
                <div class="group-member-info">
                    <div class="group-member-name-container">
                        <div class="group-member-name">${member.name}</div>
                        <span class="online-indicator ${isOnline ? 'online' : 'offline'}" 
                              data-user-id="${member._id}"></span>
                    </div>
                    <div class="group-member-role">${roleText}</div>
                    <div class="member-status">${isOnline ? 'Online' : 'Offline'}</div>
                </div>
            `;
            
            groupMembersList.appendChild(memberItem);
        });
    }
});


