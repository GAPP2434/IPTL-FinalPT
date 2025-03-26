document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (window.wsInitialized) return;
    window.wsInitialized = true;
    window.onlineUsers = window.onlineUsers || [];
    let socket = null;
    
    function connectWebSocket() {
        if (window.socket && window.socket.readyState !== WebSocket.CLOSED) {
            console.log('WebSocket already connected');
            return;
        }
        
        // Create WebSocket connection
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        window.socket = new WebSocket(`${wsProtocol}//${window.location.host}`);
        
        // Connection opened
        window.socket.addEventListener('open', () => {
            console.log('WebSocket connection established');
            
            // Send a ping to verify connection works
            if (window.socket.readyState === WebSocket.OPEN) {
                try {
                    // Optional: Send a ping to verify connection
                    window.socket.send(JSON.stringify({ type: 'ping' }));
                } catch (e) {
                    console.error('Error sending ping:', e);
                }
            }
        });
        
        // Listen for messages
        window.socket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("WebSocket received:", data.type); // Enhanced logging
                
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
                    case 'group-added':
                        handleGroupAdded(data);
                        break;
                    case 'online_users_list':
                        handleOnlineUsersList(data);
                        break;
                    case 'group_updated':
                        console.log("Group update details:", data);
                        handleGroupUpdated(data);
                        break;
                    case 'read_receipt':
                        handleReadReceipt(data);
                        break;
                    default:
                        console.log("Unhandled message type:", data.type);
                }
            } catch (error) {
                console.error("Error handling WebSocket message:", error);
            }
        });
        
        // Handle WebSocket errors
        window.socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
        // Handle WebSocket closure and reconnect
        window.socket.addEventListener('close', (event) => {
            console.log('WebSocket connection closed. Attempting reconnect...');
            // Try to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        });
    }
    
    // Add this new handler function for read receipts
    function handleReadReceipt(data) {
        console.log("Read receipt received:", data);
        
        // Find the messages sent by the current user to this recipient
        if (window.currentUserId && window.messagesContainer) {
            const messages = window.messagesContainer.querySelectorAll('.message.sent');
            
            messages.forEach(message => {
                // Check if this message belongs to the conversation that was read
                if (message.dataset.messageId && data.messageIds.includes(message.dataset.messageId)) {
                    // Update read status to "Seen"
                    const readStatus = message.querySelector('.read-status');
                    if (readStatus) {
                        readStatus.textContent = 'Seen';
                    }
                }
            });
        }
    }

// Completely redesigned group update handler - use a 3-layer strategy
function handleGroupUpdated(data) {
    console.log("NEW GROUP UPDATE HANDLER:", data);
    
    // Layer 1: Update global group cache - create if it doesn't exist
    window._groupsCache = window._groupsCache || {};
    
    // Store the updated value in the permanent cache
    if (!window._groupsCache[data.groupId]) {
        window._groupsCache[data.groupId] = {};
    }
    
    // Store the updated field and its value
    window._groupsCache[data.groupId][data.updatedField] = data.newValue;
    window._groupsCache[data.groupId].lastUpdated = Date.now();
    
    // Layer 2: Store in localStorage for persistence across page loads
    localStorage.setItem('_groupsCache', JSON.stringify(window._groupsCache));
    
    // Layer 3: Direct DOM manipulation with robust selectors
    try {
        // Keep track of which elements we've updated to avoid duplicate work
        const updatedElements = new Set();
        
        if (data.updatedField === 'profilePicture') {
            // Create a unique cache buster with random component
            const cacheBuster = `?v=${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const newSrc = data.newValue + cacheBuster;
            
            // A. Update conversation list avatars - iterate through all possible matches
            document.querySelectorAll(`.conversation-item[data-user-id="${data.groupId}"]`).forEach(item => {
                if (!item || updatedElements.has(item)) return;
                
                const avatar = item.querySelector('.conversation-avatar');
                if (avatar) {
                    // Force image refresh by removing and recreating
                    const newImg = document.createElement('img');
                    newImg.src = newSrc;
                    newImg.alt = "Group";
                    newImg.className = avatar.className;
                    avatar.parentNode.replaceChild(newImg, avatar);
                    updatedElements.add(item);
                }
            });
            
            // B. Update chat header if active
            if (window.currentRecipient === data.groupId) {
                const headerImg = document.getElementById('chatUserImg');
                if (headerImg) {
                    headerImg.src = newSrc;
                    // Also force reload by setting crossOrigin attribute
                    headerImg.crossOrigin = Date.now().toString();
                }
            }
            
            // C. Update conversation data structure
            if (window.conversations) {
                const idx = window.conversations.findIndex(c => c.userId === data.groupId);
                if (idx !== -1) {
                    window.conversations[idx].profilePicture = data.newValue;
                    // Force save to localStorage
                    localStorage.setItem('conversations', JSON.stringify(window.conversations));
                }
            }
            
            // D. Update current group if applicable
            if (window.currentGroup && window.currentGroup.id === data.groupId) {
                window.currentGroup.profilePicture = data.newValue;
            }
        }
        else if (data.updatedField === 'name') {
            // A. Update conversation list names
            document.querySelectorAll(`.conversation-item[data-user-id="${data.groupId}"]`).forEach(item => {
                if (!item || updatedElements.has(item)) return;
                
                const nameEl = item.querySelector('.conversation-name');
                if (nameEl) {
                    nameEl.textContent = data.newValue;
                    // Mark as permanently updated
                    nameEl.dataset.permanentGroupName = 'true';
                    nameEl.dataset.groupName = data.newValue;
                    updatedElements.add(item);
                }
            });
            
            // B. Update chat header name if active
            if (window.currentRecipient === data.groupId) {
                const headerName = document.getElementById('chatUsername');
                if (headerName) {
                    headerName.textContent = data.newValue;
                    headerName.dataset.permanentGroupName = 'true';
                    headerName.dataset.groupName = data.newValue;
                }
            }
            
            // C. Update conversation data structure
            if (window.conversations) {
                const idx = window.conversations.findIndex(c => c.userId === data.groupId);
                if (idx !== -1) {
                    window.conversations[idx].name = data.newValue;
                    // Force save to localStorage
                    localStorage.setItem('conversations', JSON.stringify(window.conversations));
                }
            }
            
            // D. Update current group if applicable
            if (window.currentGroup && window.currentGroup.id === data.groupId) {
                window.currentGroup.name = data.newValue;
            }
        }
        
        // Add system message to chat if viewing this conversation
        if (window.currentRecipient === data.groupId) {
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer && window.appendSystemMessage) {
                window.appendSystemMessage(data.message, new Date());
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
        
        // Show notification
        if (window.showMessage) {
            window.showMessage(data.message, 'info');
        }
    } catch (error) {
        console.error("Error updating group info:", error);
    }
    
    // Finally, set up a MutationObserver to keep our changes applied
    setupGroupUpdateObserver(data.groupId, data.updatedField, data.newValue);
}

// New function to setup a MutationObserver that keeps our changes intact
function setupGroupUpdateObserver(groupId, field, value) {
    // Create an observer instance
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // Check if any conversation items were added
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        const item = node.matches(`.conversation-item[data-user-id="${groupId}"]`) ? 
                            node : node.querySelector(`.conversation-item[data-user-id="${groupId}"]`);
                            
                        if (item) {
                            if (field === 'profilePicture') {
                                const avatar = item.querySelector('.conversation-avatar');
                                if (avatar && !avatar.src.includes(value)) {
                                    avatar.src = value + '?v=' + Date.now();
                                }
                            } else if (field === 'name') {
                                const nameEl = item.querySelector('.conversation-name');
                                if (nameEl && nameEl.textContent !== value) {
                                    nameEl.textContent = value;
                                    nameEl.dataset.permanentGroupName = 'true';
                                }
                            }
                        }
                    }
                });
            } else if (mutation.type === 'attributes') {
                // If src attribute changes on an avatar we're watching
                if (mutation.attributeName === 'src' && 
                    field === 'profilePicture' && 
                    mutation.target.matches('.conversation-avatar') &&
                    mutation.target.closest(`.conversation-item[data-user-id="${groupId}"]`)) {
                    
                    const newSrc = value + '?v=' + Date.now();
                    if (!mutation.target.src.includes(value)) {
                        mutation.target.src = newSrc;
                    }
                }
            }
        });
    });
    
    // Start observing the conversations list
    const conversationsList = document.getElementById('conversationsList');
    if (conversationsList) {
        observer.observe(conversationsList, { 
            childList: true, 
            subtree: true, 
            attributes: true,
            attributeFilter: ['src', 'textContent']
        });
    }
    
    // Store the observer to disconnect later if needed
    window._groupObservers = window._groupObservers || {};
    window._groupObservers[`${groupId}-${field}`] = observer;
    
    // Set timeout to disconnect after 10 seconds to avoid memory leaks
    setTimeout(() => {
        if (window._groupObservers[`${groupId}-${field}`]) {
            window._groupObservers[`${groupId}-${field}`].disconnect();
            delete window._groupObservers[`${groupId}-${field}`];
        }
    }, 10000);
}

// Add this to your EXISTING DOMContentLoaded function
// This loads the group cache on page load and applies it to the UI
document.addEventListener('DOMContentLoaded', function() {
    // Add this code inside your existing DOMContentLoaded
    // at the beginning of your WebSocket initialization
    
    // Load group cache from localStorage
    try {
        const cachedGroups = localStorage.getItem('_groupsCache');
        if (cachedGroups) {
            window._groupsCache = JSON.parse(cachedGroups);
            
            // Wait for conversations to be rendered
            const checkConversations = setInterval(() => {
                if (document.getElementById('conversationsList')?.children.length > 0) {
                    clearInterval(checkConversations);
                    
                    // Apply cached group updates to the UI
                    Object.keys(window._groupsCache).forEach(groupId => {
                        const group = window._groupsCache[groupId];
                        
                        if (group.profilePicture) {
                            document.querySelectorAll(`.conversation-item[data-user-id="${groupId}"] .conversation-avatar`)
                            .forEach(img => {
                                img.src = group.profilePicture + '?v=' + group.lastUpdated;
                            });
                        }
                        
                        if (group.name) {
                            document.querySelectorAll(`.conversation-item[data-user-id="${groupId}"] .conversation-name`)
                            .forEach(nameEl => {
                                nameEl.textContent = group.name;
                                nameEl.dataset.permanentGroupName = 'true';
                            });
                        }
                    });
                }
            }, 300);
            
            // Stop checking after 10 seconds to avoid infinite loop
            setTimeout(() => clearInterval(checkConversations), 10000);
        }
    } catch (e) {
        console.error("Error loading groups cache:", e);
    }
});

    // Add this function to handle group-added events
    function handleGroupAdded(data) {
        console.log("Group notification received:", data);
        
        // Show notification to user
        if (typeof window.showMessage === 'function') {
            window.showMessage(`You were added to group "${data.groupName}" by ${data.addedBy}`, 'info');
        }
        
        // If on messages page, refresh conversations to show the new group
        if (window.location.pathname.includes('messages.html')) {
            // Force clear out conversations cache
            if (window.conversations) {
                window.conversations = [];
            }
            
            // Reload conversations with a slight delay to ensure backend data is updated
            setTimeout(() => {
                if (typeof window.loadConversations === 'function') {
                    window.loadConversations();
                }
            }, 500);
        }
    }

    // Add a new handler function for user status updates
    function handleUserStatusUpdate(data) {
        console.log("User status update received:", data);
        
        const userId = data.userId;
        const isOnline = data.status === 'online';
        
        // Update the global onlineUsers array
        if (isOnline) {
            if (!window.onlineUsers.includes(userId)) {
                window.onlineUsers.push(userId);
            }
        } else {
            window.onlineUsers = window.onlineUsers.filter(id => id !== userId);
        }
        
        // Update individual user indicators
        document.querySelectorAll(`.online-indicator[data-user-id="${userId}"]`).forEach(indicator => {
            indicator.classList.remove('online', 'offline');
            indicator.classList.add(isOnline ? 'online' : 'offline');
            
            // Update text status if present
            const statusElement = indicator.closest('.conversation-item')?.querySelector('.chat-status') ||
                              indicator.closest('.chat-user-info')?.querySelector('.chat-status');
            
            if (statusElement) {
                statusElement.textContent = isOnline ? 'Online' : 'Offline';
            }
        });
        
        // Update all group conversations that include this user
        if (window.conversations) {
            window.conversations.forEach(conversation => {
                if (conversation.isGroup && conversation.members) {
                    const memberIds = conversation.members.map(id => 
                        typeof id === 'string' ? id : id.toString()
                    );
                    
                    // Only update groups where this user is a member
                    if (memberIds.includes(userId.toString())) {
                        updateGroupOnlineStatus(conversation);
                    }
                }
            });
        }
    }
    
    function updateOnlineStatus(userId, isOnline) {
        // Update individual user indicators
        document.querySelectorAll(`.online-indicator[data-user-id="${userId}"]`).forEach(indicator => {
            indicator.classList.remove('online', 'offline');
            indicator.classList.add(isOnline ? 'online' : 'offline');
            
            // Update text status if present
            const statusElement = indicator.closest('.conversation-item')?.querySelector('.chat-status') ||
                              indicator.closest('.chat-user-info')?.querySelector('.chat-status');
            
            if (statusElement) {
                statusElement.textContent = isOnline ? 'Online' : 'Offline';
            }
        });
        
        // Update all group conversations that contain this user
        if (window.conversations) {
            window.conversations.forEach(conversation => {
                if (conversation.isGroup && conversation.members) {
                    // Ensure we're working with string IDs for consistent comparison
                    const memberIds = conversation.members.map(id => 
                        typeof id === 'string' ? id : id.toString()
                    );
                    const userIdStr = typeof userId === 'string' ? userId : userId.toString();
                    
                    // Only process groups where this user is a member
                    if (memberIds.includes(userIdStr)) {
                        const onlineUserIds = window.onlineUsers.map(id => id.toString());
                        
                        // Check if any member of this group is online
                        const hasOnlineMembers = memberIds.some(memberId => 
                            onlineUserIds.includes(memberId)
                        );
                        
                        // Update the group's indicator in the conversations list
                        const groupIndicator = document.querySelector(
                            `.online-indicator[data-user-id="group-${conversation.userId}"]`
                        );
                        
                        if (groupIndicator) {
                            groupIndicator.classList.remove('online', 'offline');
                            groupIndicator.classList.add(hasOnlineMembers ? 'online' : 'offline');
                        }
                        
                        // If this is the currently selected conversation, also update the header
                        if (window.currentRecipient === conversation.userId) {
                            const headerIndicator = document.querySelector('.chat-header-name-container .online-indicator');
                            if (headerIndicator) {
                                headerIndicator.classList.remove('online', 'offline');
                                headerIndicator.classList.add(hasOnlineMembers ? 'online' : 'offline');
                                
                                const statusText = document.querySelector('.chat-status');
                                if (statusText) {
                                    statusText.textContent = hasOnlineMembers ? 'Online' : 'Offline';
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    function updateGroupOnlineStatus(conversation) {
        if (!conversation || !conversation.isGroup || !conversation.members) {
            return false;
        }
        
        // Convert all IDs to strings for consistent comparison
        const memberIds = conversation.members.map(id => 
            typeof id === 'string' ? id : id.toString()
        );
        
        // Get online users as strings
        const onlineUserIds = window.onlineUsers.map(id => 
            typeof id === 'string' ? id : id.toString()
        );
        
        // Check if any members are in the online users list
        const hasOnlineMembers = memberIds.some(memberId => 
            onlineUserIds.includes(memberId)
        );
        
        // Store the calculated status on the conversation object
        conversation.hasOnlineMembers = hasOnlineMembers;
        
        // Update UI for this specific group
        updateGroupIndicators(conversation, hasOnlineMembers);
        
        return hasOnlineMembers;
    }

    // Helper function to update all indicators for a specific group
    function updateGroupIndicators(conversation, isOnline) {
        // Update conversation list indicator
        const groupIndicator = document.querySelector(
            `.online-indicator[data-user-id="group-${conversation.userId}"]`
        );
        
        if (groupIndicator) {
            groupIndicator.classList.remove('online', 'offline');
            groupIndicator.classList.add(isOnline ? 'online' : 'offline');
        }
        
        // Update the header indicator if this is the active conversation
        if (window.currentRecipient === conversation.userId) {
            const headerIndicator = document.querySelector('.chat-header-name-container .online-indicator');
            if (headerIndicator) {
                headerIndicator.classList.remove('online', 'offline');
                headerIndicator.classList.add(isOnline ? 'online' : 'offline');
                
                const statusText = document.querySelector('.chat-status');
                if (statusText) {
                    statusText.textContent = isOnline ? 'Online' : 'Offline';
                }
            }
        }
    }

    // Handle new messages (for messages.html)
    async function handleNewMessage(message) {
        console.log("Handling new message:", message);
        
        try {
            // Create a processed message object
            const processedMessage = {
                ...message
            };
    
            if (window.location.pathname.includes('messages.html')) {
                // Always update the conversation preview
                updateConversationLocally(processedMessage);
                
                // For group messages, the conversation ID is different than regular messages
                const isGroupMessage = processedMessage.isGroupMessage || processedMessage.conversationId.startsWith('group:');
                
                // Determine which conversation this message belongs to
                let relevantId;
                if (isGroupMessage) {
                    relevantId = processedMessage.recipientId.toString();
                } else {
                    relevantId = processedMessage.senderId === window.currentUserId ? 
                        processedMessage.recipientId.toString() : 
                        processedMessage.senderId.toString();
                }
                
                // Check if the user is currently viewing this conversation
                if (window.currentRecipient === relevantId) {
                    // The user is currently looking at this conversation, so append the message to the UI
                    if (isGroupMessage) {
                        window.appendGroupMessage(
                            processedMessage.content, 
                            processedMessage.senderId === window.currentUserId,
                            processedMessage.senderName,
                            processedMessage.senderAvatar,
                            processedMessage.attachments || [],
                            processedMessage.attachmentTypes || [],
                            new Date(processedMessage.timestamp)
                        );
                    } else {
                        window.appendMessage(
                            processedMessage.content, 
                            processedMessage.senderId === window.currentUserId,
                            processedMessage.attachments || [], 
                            processedMessage.attachmentTypes || [],
                            new Date(processedMessage.timestamp)
                        );
                    }
                    
                    // *** NEW CODE: Automatically mark this message as read if it's not from you ***
                    if (processedMessage.senderId !== window.currentUserId) {
                        // Mark as read on server
                        await fetch('/api/messages/mark-read', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                conversationId: processedMessage.conversationId
                            })
                        });
                        console.log("Marked new message as read automatically");
                    }
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
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

    // Update the updateConversationLocally function for unread message handling
    function updateConversationLocally(message) {
        console.log("Updating conversation locally:", message);
        
        // Determine if this is a group message
        const isGroupMessage = message.isGroupMessage || message.conversationId.startsWith('group:');
        
        // Get the relevant ID (sender for direct messages, recipient/group for group messages)
        const relevantId = isGroupMessage ? 
            message.recipientId.toString() : 
            message.senderId.toString();
        
        // Generate preview text based on attachments
        let previewText = message.content;
        let hasAttachments = message.attachments && message.attachments.length > 0;
        let attachmentType = hasAttachments && message.attachmentTypes && message.attachmentTypes[0];
        
        if (hasAttachments) {
            if (attachmentType === 'image') {
                previewText = message.content ? `📷 ${message.content}` : "📷 Sent a photo";
            } else if (attachmentType === 'video') {
                previewText = message.content ? `🎥 ${message.content}` : "🎥 Sent a video";
            } else {
                previewText = message.content ? `📎 ${message.content}` : "📎 Sent an attachment";
            }
        } else if (!previewText) {
            previewText = ""; // Fallback for empty messages
        }
        
        if (window.conversations) {
            // Find the conversation using the relevant ID
            const conversationIndex = window.conversations.findIndex(c => 
                c.userId === relevantId);
            
            if (conversationIndex >= 0) {
                // Update existing conversation's last message text
                window.conversations[conversationIndex].lastMessage = previewText;
                window.conversations[conversationIndex].hasAttachments = hasAttachments;
                window.conversations[conversationIndex].lastAttachmentType = attachmentType;
                
                // Increment unread count only if we're not currently viewing this conversation
                if (window.currentRecipient !== relevantId) {
                    window.conversations[conversationIndex].unreadCount = 
                        (window.conversations[conversationIndex].unreadCount || 0) + 1;
                }
                
                // Move this conversation to the top (most recent)
                const conversation = window.conversations.splice(conversationIndex, 1)[0];
                window.conversations.unshift(conversation);
                
                // Save to localStorage for persistence
                localStorage.setItem('conversations', JSON.stringify(window.conversations));
                
                // Render the updated conversations
                if (typeof window.renderConversations === 'function') {
                    window.renderConversations();
                }
            } else {
                // If the conversation isn't found, reload conversations from server
                if (typeof window.loadConversations === 'function') {
                    window.loadConversations();
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

