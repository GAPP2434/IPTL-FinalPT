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
        
        // Check if user is online
        const isOnline = window.onlineUsers && window.onlineUsers.includes(conversation.userId);
        
        div.innerHTML = `
            <img src="${conversation.profilePicture}" alt="${conversation.name}" class="conversation-avatar">
            <div class="conversation-info">
                <div class="conversation-name-container">
                    <div class="conversation-name">${conversation.name}</div>
                    <span class="online-indicator ${isOnline ? 'online' : 'offline'}" 
                          data-user-id="${conversation.userId}"></span>
                </div>
                <div class="conversation-preview">${conversation.lastMessage || 'No messages yet'}</div>
            </div>
            ${conversation.unreadCount ? `<span class="unread-badge">${conversation.unreadCount}</span>` : ''}
        `;
        
        div.addEventListener('click', () => {
            selectConversation(conversation);
        });
        
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
            conversationItem.classList.remove('unread'); // Remove unread highlight
            
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
        
        // Check if user is online
        const isOnline = onlineUsers.includes(conversation.userId);
        
        // Update chat header
        chatUsername.textContent = conversation.name;
        chatUserImg.src = conversation.profilePicture;
        
        // Update the chat header to include online status
        const chatHeaderHTML = `
            <div class="chat-user-info">
                <div class="chat-header-name-container">
                    <h3>${conversation.name}</h3>
                    <span class="online-indicator ${isOnline ? 'online' : 'offline'}" 
                        data-user-id="${conversation.userId}"></span>
                </div>
                <div class="chat-status">${isOnline ? 'Online' : 'Offline'}</div>
            </div>
        `;
        
        // Replace the h3 element with our new structure
        const chatUser = document.querySelector('.chat-user');
        const userImage = chatUser.querySelector('img'); // Use a different variable name here
        
        // Keep the image but replace the rest
        chatUser.innerHTML = '';
        chatUser.appendChild(userImage);
        const chatUserInfo = document.createElement('div');
        chatUserInfo.innerHTML = chatHeaderHTML;
        chatUser.appendChild(chatUserInfo);
        
        // Show chat area and hide empty state
        emptyChat.style.display = 'none';
        chatArea.style.display = 'flex';
        
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
            
            messages.forEach(message => {
                // If senderId is the current user, then it's a sent message
                const isSent = message.senderId === currentUser._id;
                appendMessage(message.content, isSent, message.timestamp);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        })
        .catch(error => {
            console.error('Error loading messages:', error);
            hideLoading();
            
            // Fallback for demo/testing
            const conversation = conversations.find(c => c.userId === userId);
            if (conversation && conversation.messages) {
                conversation.messages.forEach(message => {
                    appendMessage(message.text, message.sent);
                });
            }
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
    window.updateConversationWithNewMessage = updateConversationWithNewMessage;
    window.conversations = conversations;
    window.loadConversations = loadConversations;
    window.currentRecipient = null;
    
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
});
