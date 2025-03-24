document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.wsInitialized) return;
    window.wsInitialized = true;
    
    let socket = null;
    
    function connectWebSocket() {
        if (window.socket && window.socket.readyState !== WebSocket.CLOSED) {
            console.log('WebSocket already connected');
            return;
        }
        
        // Create WebSocket connection
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${wsProtocol}//${window.location.host}`);
        window.socket = socket;
        
        // Connection opened
        socket.addEventListener('open', () => {
            console.log('WebSocket connection established');
        });
        
        // Listen for messages
        socket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle different message types
                switch (data.type) {
                    case 'new_message':
                        handleNewMessage(data.message);
                        break;
                    case 'user_status_update':
                        handleUserStatusUpdate(data);
                        break;
                    case 'new_story':
                        handleNewStory(data.story);
                        break;
                    case 'new_reaction':
                        handleNewReaction(data.reaction);
                        break;
                    case 'new_comment':
                        handleNewComment(data.comment);
                        break;
                }
            } catch (error) {
                // Silent error handling
            }
        });
        
        // Handle WebSocket errors
        socket.addEventListener('error', () => {
            // Silent error handling
        });
        
        // Handle WebSocket closure and reconnect
        socket.addEventListener('close', () => {
            // Try to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        });
    }
    
    // Connection opened
    function handleSocketOpen(event) {
        // Connection established - no need to log
    }
    
    // Handle socket messages
    function handleSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            // Debug line to ensure we're receiving messages (remove later)
            console.log("WebSocket message received:", data.type);
            
            // Handle different message types
            switch (data.type) {
                case 'new_message':
                    handleNewMessage(data.message);
                    break;
                case 'user_status_update':
                    handleUserStatusUpdate(data);
                    break;
                case 'new_story':
                    handleNewStory(data.story);
                    break;
                case 'new_reaction':
                    handleNewReaction(data.reaction);
                    break;
                case 'new_comment':
                    handleNewComment(data.comment);
                    break;
            }
        } catch (error) {
            console.error("Error handling WebSocket message:", error);
        }
    }
    
    // Handle WebSocket errors
    function handleSocketError(error) {
        // Silent error handling - no console log
    }
    
    // Handle WebSocket closure
    function handleSocketClose(event) {
        // Attempt to reconnect after delay
        setTimeout(() => {
            connectWebSocket(); // Reconnect
        }, 5000);
    }

    // Add a new handler function for user status updates
    function handleUserStatusUpdate(data) {
        const { userId, status } = data;
        
        // Update status indicators for this user
        document.querySelectorAll(`.online-indicator[data-user-id="${userId}"]`).forEach(indicator => {
            indicator.className = `online-indicator ${status === 'online' ? 'online' : 'offline'}`;
        });
        
        // Update status text if in an active conversation with this user
        if (window.currentRecipient === userId) {
            const chatStatus = document.querySelector('.chat-status');
            if (chatStatus) {
                chatStatus.textContent = status === 'online' ? 'Online' : 'Offline';
            }
        }
        
        // Update onlineUsers array in the messages page
        if (window.onlineUsers) {
            if (status === 'online' && !window.onlineUsers.includes(userId)) {
                window.onlineUsers.push(userId);
            } else if (status === 'offline') {
                window.onlineUsers = window.onlineUsers.filter(id => id !== userId);
            }
        }
    }
    
    // Handle new messages (for messages.html)
    function handleNewMessage(message) {
        console.log("Handling new message:", message);
        
        if (window.location.pathname.includes('messages.html')) {
            // Get the sender ID as a string for comparison
            const senderId = message.senderId.toString();
            
            // Always update the conversation preview (this part is key)
            updateConversationLocally(message);
            
            // If the conversation with this user is currently open, append the message to the chat
            if (window.currentRecipient === senderId) {
                const messagesContainer = document.getElementById('messagesContainer');
                if (messagesContainer) {
                    if (typeof window.appendMessage === 'function') {
                        window.appendMessage(message.content, false, message.timestamp);
                    } else {
                        // Fallback if appendMessage not available
                        const messageElement = document.createElement('div');
                        messageElement.classList.add('message', 'received');
                        
                        // Format timestamp
                        const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit', 
                            minute: '2-digit'
                        });
                        
                        messageElement.innerHTML = `
                            <div class="message-content">${message.content}</div>
                            <div class="message-time">${formattedTime}</div>
                        `;
                        
                        messagesContainer.appendChild(messageElement);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                    
                    // Mark message as read since conversation is open
                    markMessageAsRead(senderId);
                }
            }
        }
    }

    // Add a new function specifically for updating the message preview
    function updateMessagePreview(message) {
        const senderId = message.senderId.toString();
        
        if (!window.conversations) {
            console.log("No conversations array found");
            return;
        }
        
        console.log("Updating preview for message from: " + senderId);
        
        // Find the conversation with this sender
        const conversationIndex = window.conversations.findIndex(c => 
            c.userId === senderId);
        
        if (conversationIndex >= 0) {
            // Update existing conversation's last message text in the conversations array
            window.conversations[conversationIndex].lastMessage = message.content;
            
            // Only increment unread count if we're not viewing this conversation
            if (window.currentRecipient !== senderId) {
                window.conversations[conversationIndex].unreadCount = 
                    (window.conversations[conversationIndex].unreadCount || 0) + 1;
            }
            
            // Move this conversation to the top (most recent)
            const conversation = window.conversations.splice(conversationIndex, 1)[0];
            window.conversations.unshift(conversation);
            
            // Find the actual conversation item in the DOM and update its preview text directly
            // This ensures the preview updates even if the conversation is currently active
            const conversationItem = document.querySelector(`.conversation-item[data-user-id="${senderId}"]`);
            if (conversationItem) {
                const previewElement = conversationItem.querySelector('.conversation-preview');
                if (previewElement) {
                    previewElement.textContent = message.content;
                }
                
                // Update unread badge if needed
                if (window.currentRecipient !== senderId) {
                    let badge = conversationItem.querySelector('.unread-badge');
                    const unreadCount = conversation.unreadCount;
                    
                    if (unreadCount > 0) {
                        conversationItem.classList.add('unread');
                        if (badge) {
                            badge.textContent = unreadCount;
                        } else {
                            badge = document.createElement('span');
                            badge.classList.add('unread-badge');
                            badge.textContent = unreadCount;
                            conversationItem.appendChild(badge);
                        }
                    }
                }
                
                // If the conversation was already rendered, move it to the top in the DOM
                const conversationsList = document.getElementById('conversationsList');
                if (conversationsList && conversationsList.firstChild !== conversationItem) {
                    conversationsList.removeChild(conversationItem);
                    conversationsList.insertBefore(conversationItem, conversationsList.firstChild);
                }
            } else {
                // If we can't find the DOM element, fall back to re-rendering everything
                if (typeof window.renderConversations === 'function') {
                    window.renderConversations();
                }
            }
        } else {
            // If conversation doesn't exist yet, fetch user info and create it
            fetchUserAndCreateConversation(senderId, message.content);
        }
    }

    // Add this new function to mark messages as read
    function markMessageAsRead(senderId) {
        fetch(`/api/messages/mark-read/${senderId}`, {
            method: 'PUT',
            credentials: 'include'
        })
        .then(response => response.json())
        .catch(error => {
            console.error('Error marking messages as read:', error);
        });
    }
    
    // Handle new stories (for index.html)
    function handleNewStory(story) {
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
            // Refresh stories container if on index page
            const storiesContainer = document.getElementById('storiesContainer');
            if (storiesContainer) {
                // Either reload the page or update the stories dynamically
                // For simplicity, we'll just reload the stories section
                window.location.reload();
            }
        }
    }
    
    // Handle new reactions (for all pages with storyViewer)
    function handleNewReaction(reaction) {
        // If story viewer is open and showing the story that received the reaction
        if (window.currentStoryIndex !== undefined && window.currentStoryIndex === reaction.storyId) {
            const reactionElement = document.getElementById(reaction.type + 'Count');
            if (reactionElement) {
                reactionElement.textContent = parseInt(reactionElement.textContent) + 1;
            }
        }
    }
    
    // Handle new comments (for all pages with storyViewer)
    function handleNewComment(comment) {
        // If story viewer is open and showing the story that received the comment
        if (window.currentStoryIndex !== undefined && window.currentStoryIndex === comment.storyId) {
            const commentList = document.getElementById('commentList');
            if (commentList) {
                const commentElement = document.createElement('div');
                commentElement.classList.add('comment');
                commentElement.innerHTML = `<span class="username">${comment.username}:</span> ${comment.comment}`;
                commentList.appendChild(commentElement);
            }
        }
    }

    // Update the updateConversationLocally function for unread message handling
    function updateConversationLocally(message) {
        console.log("Updating conversation locally:", message);
        
        // Ensure we're working with strings for comparison
        const senderId = message.senderId.toString();
        
        if (window.conversations) {
            console.log("Current conversations:", window.conversations);
            
            // Check if this conversation exists with the sender's ID
            const conversationIndex = window.conversations.findIndex(c => 
                c.userId === senderId);
            
            console.log("Conversation index:", conversationIndex);
            
            if (conversationIndex >= 0) {
                // Update existing conversation's last message text
                window.conversations[conversationIndex].lastMessage = message.content;
                console.log("Updated conversation last message");
                
                // Increment unread count only if we're not currently viewing this conversation
                if (window.currentRecipient !== senderId) {
                    window.conversations[conversationIndex].unreadCount = 
                        (window.conversations[conversationIndex].unreadCount || 0) + 1;
                }
                
                // Move this conversation to the top (most recent)
                const conversation = window.conversations.splice(conversationIndex, 1)[0];
                window.conversations.unshift(conversation);
                
                // Force complete re-render of all conversations
                if (typeof window.renderConversations === 'function') {
                    console.log("Calling renderConversations");
                    window.renderConversations();
                }
            } else {
                // If the conversation isn't found by sender ID, try loading all conversations
                // This ensures we're not unnecessarily creating duplicate conversations
                if (typeof window.loadConversations === 'function') {
                    window.loadConversations();
                } else {
                    console.log("Conversation not found locally, fetching user info");
                    // Fetch user info and create new conversation
                    fetchUserAndCreateConversation(senderId, message.content);
                }
            }
        }
    }

    // Helper function to fetch user info and create conversation
    function fetchUserAndCreateConversation(userId, messageContent) {
        fetch(`/api/users/basic-info/${userId}`, {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(userData => {
            console.log("Fetched user data:", userData);
            // Create new conversation object
            const newConversation = {
                userId: userId,
                name: userData.name || 'Unknown User',
                profilePicture: userData.profilePicture || 'avatars/Avatar_Default_Anonymous.webp',
                lastMessage: messageContent,
                unreadCount: 1,
                timestamp: new Date()
            };
            
            // Add to conversations array
            window.conversations.unshift(newConversation);
            
            // Re-render conversations
            if (typeof window.renderConversations === 'function') {
                window.renderConversations();
            }
        })
        .catch(error => {
            console.error('Error fetching user info:', error);
            // Add placeholder conversation
            const newConversation = {
                userId: userId,
                name: 'User ' + userId.substring(0, 5),
                profilePicture: 'avatars/Avatar_Default_Anonymous.webp',
                lastMessage: messageContent,
                unreadCount: 1,
                timestamp: new Date()
            };
            
            window.conversations.unshift(newConversation);
            
            if (typeof window.renderConversations === 'function') {
                window.renderConversations();
            }
        });
    }
    
    // Start the initial connection
    connectWebSocket();
});