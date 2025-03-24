document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.wsInitialized) return;
    window.wsInitialized = true;
    
    let socket = null;
    
    function connectWebSocket() {
        // Close existing socket if it exists
        if (socket) {
            socket.removeEventListener('message', handleSocketMessage);
            socket.removeEventListener('close', handleSocketClose);
            socket.removeEventListener('error', handleSocketError);
            socket.removeEventListener('open', handleSocketOpen);
            
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        }
        
        // Create new WebSocket connection
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        socket = new WebSocket(`${wsProtocol}//${window.location.host}`);
        
        // Store socket in window object for access from other scripts
        window.socket = socket;
        
        // Add event listeners
        socket.addEventListener('open', handleSocketOpen);
        socket.addEventListener('message', handleSocketMessage);
        socket.addEventListener('error', handleSocketError);
        socket.addEventListener('close', handleSocketClose);
    }
    
    // Connection opened
    function handleSocketOpen(event) {
        // Connection established - no need to log
    }
    
    // Handle socket messages
    function handleSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            // Removed console.log here
            
            // Handle different message types
            switch (data.type) {
                case 'new_message':
                    handleNewMessage(data.message);
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
            // Silent error handling - no console log
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
    
    // Handle new messages (for messages.html)
    function handleNewMessage(message) {
        if (window.location.pathname.includes('messages.html')) {
            // If on messages page and conversation with this user is open
            if (window.currentRecipient === message.senderId) {
                // Add the message to the UI
                const messagesContainer = document.getElementById('messagesContainer');
                if (messagesContainer) {
                    const messageElement = document.createElement('div');
                    messageElement.classList.add('message', 'received');
                    messageElement.textContent = message.content;
                    messagesContainer.appendChild(messageElement);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                
                // Update local conversation data WITHOUT re-fetching from server
                updateConversationLocally(message);
            } else {
                // For other conversations, update the list from server
                if (typeof window.loadConversations === 'function') {
                    window.loadConversations();
                }
            }
        }
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

    // Update conversation locally without refetching from server
    function updateConversationLocally(message) {
        if (window.conversations) {
            const conversationIndex = window.conversations.findIndex(c => 
                c.userId === message.senderId.toString());
            
            if (conversationIndex >= 0) {
                // Update existing conversation
                window.conversations[conversationIndex].lastMessage = message.content;
                window.conversations[conversationIndex].unreadCount = 
                    (window.conversations[conversationIndex].unreadCount || 0) + 1;
                
                // Move this conversation to the top
                const conversation = window.conversations.splice(conversationIndex, 1)[0];
                window.conversations.unshift(conversation);
                
                // Re-render conversations if the function exists
                if (typeof window.renderConversations === 'function') {
                    window.renderConversations();
                }
            } else {
                // If conversation doesn't exist in local data, fetch from server
                if (typeof window.loadConversations === 'function') {
                    window.loadConversations();
                }
            }
        }
    }
    
    // Start the initial connection
    connectWebSocket();
});