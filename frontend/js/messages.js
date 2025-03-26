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
    const mediaButton = document.getElementById('mediaButton');
    const fileButton = document.getElementById('fileButton');
    const mediaInput = document.getElementById('mediaInput');
    const fileInput = document.getElementById('fileInput');
    const attachmentsPreview = document.getElementById('attachmentsPreview');
    
    // State
    let currentRecipient = null;
    let conversations = [];
    let onlineUsers = [];
    let messageAttachments = [];
    let currentGroup = null; // Add this line to define currentGroup at the top level
    window.onlineUsers = onlineUsers;

    // Initialize
    async function init() {
        // Initialize encryption first
        try {
            await window.messageEncryption.initialize();
            console.log("Encryption initialized successfully");
        } catch (error) {
            console.error("Error initializing encryption:", error);
            showMessage('Failed to initialize secure messaging. Some features may not work.', 'error');
        }
        loadOnlineUsers();
        loadConversations();
        setupEventListeners();
        setupAttachmentListeners(); // Add this line
        
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
            
            // Process conversations to fix preview messages if needed
            conversations.forEach(conversation => {
                // Check if the conversation contains attachment but lacks the emoji indicator
                if (conversation.hasAttachments && conversation.lastMessage) {
                    // If there's no emoji prefix, add appropriate indicator
                    if (!conversation.lastMessage.includes('📷') && 
                        !conversation.lastMessage.includes('🎥') && 
                        !conversation.lastMessage.includes('📎')) {
                        
                        // Add appropriate indicator based on attachment type
                        if (conversation.lastAttachmentType === 'image') {
                            conversation.lastMessage = conversation.lastMessage ? 
                                `📷 ${conversation.lastMessage}` : 
                                "📷 Sent a photo";
                        } else if (conversation.lastAttachmentType === 'video') {
                            conversation.lastMessage = conversation.lastMessage ? 
                                `🎥 ${conversation.lastMessage}` : 
                                "🎥 Sent a video";
                        } else {
                            conversation.lastMessage = conversation.lastMessage ? 
                                `📎 ${conversation.lastMessage}` : 
                                "📎 Sent an attachment";
                        }
                    }
                }
            });
            
            renderConversations();
            hideLoading();
            
            // Save to localStorage as fallback
            localStorage.setItem('conversations', JSON.stringify(conversations));
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
    
    function markConversationAsRead(conversationId) {
        // Call the API to mark messages as read
        fetch(`/api/messages/mark-read/${conversationId}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                console.error(`Failed to mark conversation as read: ${response.status}`);
            }
        })
        .catch(error => {
            console.error('Error marking conversation as read:', error);
        });
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
        
        // Check for cached group picture in localStorage
        if (conversation.isGroup) {
            const cachedPicture = localStorage.getItem(`group_${conversation.userId}_picture`);
            if (cachedPicture) {
                userImg.src = cachedPicture;
            } else {
                userImg.src = conversation.profilePicture;
            }
        } else {
            userImg.src = conversation.profilePicture;
        }
        
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
                profilePicture: conversation.profilePicture,
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
        
        // Mark any unread messages as read
        if (conversation.unreadCount > 0) {
            markConversationAsRead(conversation.conversationId);
            // Update unread count in UI
            conversation.unreadCount = 0;
            renderConversations();
        }
        
        // Show chat area and hide empty state
        document.getElementById('emptyChat').style.display = 'none';
        document.getElementById('chatArea').style.display = 'flex';
        
        // Load messages for this conversation
        loadMessages(conversation.userId);
    }
    
    // Load messages for a conversation
    function loadMessages(userId) {
        showLoading();
        messagesContainer.innerHTML = '';
        
        fetch(`/api/messages/conversation/${userId}`, {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(async data => {
            hideLoading();
            
            // Check if data is valid and has messages property
            const messages = Array.isArray(data) ? data : (data.messages || []);

            console.log("Messages received:", messages.length);
            
            // Process messages - add decryption for historical messages
            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                
                // IMPORTANT: Add debug logging
                if (message.isCurrentUser) {
                    console.log(`Message #${i} (own): has originalPlainText:`, !!message.originalPlainText);
                    if (message.originalPlainText) {
                        console.log("Original text:", message.originalPlainText.substring(0, 20) + "...");
                    }
                }

                // HANDLE SENT MESSAGES - check for originalPlainText first
                if (message.isCurrentUser && message.originalPlainText) {
                    console.log("Using originalPlainText for own message");
                    message.content = message.originalPlainText;
                    // Skip the decryption step for our own messages
                }
                // TRY TO DECRYPT RECEIVED MESSAGES
                else if (message.encryptionType && window.messageEncryption && !message.isCurrentUser) {
                    try {
                        let decryptedContent = message.content;
                        
                        // Improve detection of encrypted format with more detailed logging
                        const isValidJson = typeof message.content === 'string' && (
                            message.content.trim().startsWith('{') && 
                            message.content.trim().endsWith('}')
                        );
                        
                        if (!isValidJson) {
                            console.log('Message content:', message.content);
                            console.log('Message encryptionType:', message.encryptionType);
                            console.log('Content is not in proper JSON format despite having encryptionType flag');
                            
                            // Just use the message content as-is since it's not properly encrypted
                            // This handles legacy or improperly formatted messages
                        } else {
                            try {
                                // Try parsing the JSON first to validate it's proper format
                                const parsed = JSON.parse(message.content);
                                
                                // Check for required encryption fields
                                if (!parsed.key || !parsed.iv || !parsed.data) {
                                    console.log('Message has JSON format but missing encryption components');
                                    // Use content as-is
                                } else {
                                    // Now attempt to decrypt with appropriate method
                                    if (message.encryptionType === 'group') {
                                        decryptedContent = await window.messageEncryption.decryptGroupMessage(
                                            message.content, 
                                            userId // Group ID
                                        );
                                    } else if (message.encryptionType === 'direct') {
                                        decryptedContent = await window.messageEncryption.decryptMessage(
                                            message.content
                                        );
                                    }
                                    console.log('Successfully decrypted message');
                                }
                            } catch (jsonError) {
                                console.error('Error parsing or validating encrypted content:', jsonError);
                                // Use content as-is
                            }
                        }
                        
                        // Update the message content with decrypted version or original
                        message.content = decryptedContent;
                    } catch (error) {
                        console.error("Failed to decrypt historical message:", error);
                        message.content = "[Encrypted message - unable to decrypt]";
                    }
                }
                // HANDLE OUR OWN MESSAGES THAT DON'T HAVE ORIGINAL TEXT
                else if (message.isCurrentUser && message.encryptionType) {
                    // If this is our own sent message but we don't have originalPlainText,
                    // show a meaningful message instead of the encrypted text
                    message.content = "[Your encrypted message - original text unavailable]";
                }
                
                // Display the message
                if (message.isGroupMessage) {
                    appendGroupMessage(
                        message.content, 
                        message.isCurrentUser, 
                        message.senderName || 'Unknown',
                        message.senderAvatar,
                        message.attachments || [],
                        message.attachmentTypes || [],
                        message.timestamp,
                        [] // Default empty array for attachmentNames
                    );
                } else {
                    // Regular direct message
                    appendMessage(
                        message.content, 
                        message.isCurrentUser, 
                        message.attachments || [], 
                        message.attachmentTypes || [],
                        message.timestamp,
                        []
                    );
                }
            }
            
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
    function appendMessage(text, sent, attachments = [], attachmentTypes = [], timestamp = new Date(), attachmentNames = []) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(sent ? 'sent' : 'received');
        
        // Format the timestamp
        const formattedTime = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Generate attachment HTML if there are attachments
        let attachmentsHTML = '';
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            attachments.forEach((url, index) => {
                const type = attachmentTypes && attachmentTypes[index] ? attachmentTypes[index] : 'file';
                
                // Get filename from attachmentNames if available, otherwise extract from URL
                let filename;
                if (attachmentNames && attachmentNames[index]) {
                    filename = attachmentNames[index];
                } else {
                    // Extract from URL - only do this once
                    const urlParts = url.split('/');
                    const fullFilename = urlParts[urlParts.length - 1];
                    const dashIndex = fullFilename.indexOf('-');
                    filename = dashIndex !== -1 ? 
                            fullFilename.substring(dashIndex + 1) : 
                            fullFilename;
                }
                
                // Then use filename in your HTML construction
                if (type === 'image') {
                    attachmentsHTML += `<div class="message-media"><img src="${url}" alt="Image"></div>`;
                } else if (type === 'video') {
                    // Video HTML...
                } else {
                    // File HTML using the extracted filename
                    attachmentsHTML += `
                        <div class="message-file">
                            <div class="file-icon"><i class="fas fa-file"></i></div>
                            <div class="file-name">${filename}</div>
                            <a href="${url}" target="_blank" class="file-download"><i class="fas fa-download"></i></a>
                        </div>
                    `;
                }
            });
        }
        
        messageElement.innerHTML = `
            ${attachmentsHTML}
            ${text ? `<div class="message-content">${text}</div>` : ''}
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
    function appendGroupMessage(text, isSent, senderName, senderAvatar, attachments = [], attachmentTypes = [], timestamp = new Date(), attachmentNames = []) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSent ? 'sent' : 'received');
        
        // Format the timestamp
        const formattedTime = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Generate attachment HTML
        let attachmentsHTML = '';
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            attachments.forEach((url, index) => {
                const type = attachmentTypes && attachmentTypes[index] ? attachmentTypes[index] : 'file';
                // For file attachments
                if (type !== 'image' && type !== 'video') {
                    // Use provided attachment name if available, otherwise extract from URL
                    let filename;
                    if (attachmentNames && attachmentNames[index]) {
                        filename = attachmentNames[index];
                    } else {
                        // Existing filename extraction logic for server URLs
                        const fullFilename = url.split('/').pop();
                        const dashIndex = fullFilename.indexOf('-');
                        filename = dashIndex !== -1 ? 
                                fullFilename.substring(dashIndex + 1) : 
                                fullFilename;
                    }
                    
                    attachmentsHTML += `
                        <div class="message-file">
                            <div class="file-icon"><i class="fas fa-file"></i></div>
                            <div class="file-name">${filename}</div>
                            <a href="${url}" target="_blank" class="file-download"><i class="fas fa-download"></i></a>
                        </div>
                    `;
                } else if (type === 'image') {
                    attachmentsHTML += `<div class="message-media"><img src="${url}" alt="Image"></div>`;
                } else if (type === 'video') {
                attachmentsHTML += `<div class="message-media video-container">
                                            <video controls width="100%" preload="metadata">
                                                <source src="${url}" type="video/mp4">
                                            </video>
                                        </div>`;
                } 
            });
        }
        
        if (!isSent) {
            messageElement.innerHTML = `
                <div class="group-message-header">
                    <img src="${senderAvatar || 'avatars/Avatar_Default_Anonymous.webp'}" class="group-sender-avatar">
                    <span class="group-sender-name">${senderName}</span>
                </div>
                ${attachmentsHTML}
                ${text ? `<div class="message-content">${text}</div>` : ''}
                <div class="message-time">${formattedTime}</div>
            `;
        } else {
            // Own messages don't need sender info
            messageElement.innerHTML = `
                ${attachmentsHTML}
                ${text ? `<div class="message-content">${text}</div>` : ''}
                <div class="message-time">${formattedTime}</div>
            `;
        }
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Send a message
    async function sendMessage() {
        const text = messageInput.value.trim();
        
        // Don't send if no text and no attachments
        if (!text && messageAttachments.length === 0) return;
        if (!currentRecipient) return;
        
        try {
            // Create FormData to send both text and files
            const formData = new FormData();
            formData.append('recipientId', currentRecipient);
            
            // Add all attachments to the FormData
            messageAttachments.forEach(attachment => {
                formData.append('attachments', attachment.file);
            });
            
            // Show a temporary version with the attachments in the UI immediately
            const tempAttachmentUrls = [];
            const tempAttachmentTypes = [];
            const tempAttachmentNames = [];
            
            if (messageAttachments.length > 0) {
                messageAttachments.forEach(attachment => {
                    // Create temporary object URLs for immediate display
                    const tempUrl = URL.createObjectURL(attachment.file);
                    tempAttachmentUrls.push(tempUrl);
                    tempAttachmentNames.push(attachment.file.name); // Store the original filename
                    
                    if (attachment.file.type.startsWith('image/')) {
                        tempAttachmentTypes.push('image');
                    } else if (attachment.file.type.startsWith('video/')) {
                        tempAttachmentTypes.push('video');
                    } else {
                        tempAttachmentTypes.push('file');
                    }
                });
            }
            
            // Encrypt message text if encryption is available
            if (window.messageEncryption) {
                try {
                    // Make sure to store the original text BEFORE encryption
                    const originalText = text; 
                    formData.append('originalContent', originalText);
                    
                    let encryptedText;
                    let encryptionType;
                    
                    if (currentGroup) {
                        // Group message encryption
                        encryptedText = await window.messageEncryption.encryptGroupMessage(text, currentRecipient);
                        encryptionType = 'group';
                    } else {
                        // Direct message encryption
                        encryptedText = await window.messageEncryption.encryptMessage(text, currentRecipient);
                        encryptionType = 'direct';
                    }
                    
                    // Send encrypted message
                    formData.append('content', encryptedText);
                    formData.append('encryptionType', encryptionType);
                    console.log("Message encrypted successfully");
                    console.log("Including originalContent:", originalText);
                } catch (encryptError) {
                    console.error('Encryption failed, falling back to plain text:', encryptError);
                    formData.append('content', text); // Fallback to unencrypted
                    // You might want to notify the user that encryption failed
                    showMessage('Message sent unencrypted due to encryption error', 'warning');
                }
            } else {
                // Fallback to unencrypted if encryption not available
                formData.append('content', text);
            }

            // Add to UI immediately (will be replaced when real message comes back from server)
            if (currentGroup) {
                appendGroupMessage(text, true, null, null, tempAttachmentUrls, tempAttachmentTypes, new Date(), tempAttachmentNames);
            } else {
                appendMessage(text, true, tempAttachmentUrls, tempAttachmentTypes, new Date(), tempAttachmentNames);
            }
            
            // Clear the input and attachments
            messageInput.value = '';
            messageAttachments = [];
            attachmentsPreview.innerHTML = '';
            attachmentsPreview.style.display = 'none';
            
            // Send to server
            fetch('/api/messages/send', {
                method: 'POST',
                credentials: 'include',
                body: formData // Send FormData instead of JSON
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to send message');
                }
                return response.json();
            })
            .then(data => {
                // Update conversation with new message
                updateConversationWithNewMessage(currentRecipient, text, true, tempAttachmentUrls, tempAttachmentTypes);
            })
            .catch(error => {
                console.error('Error sending message:', error);
                // Show error to user
                showMessage('Failed to send message. Please try again.', 'error');
            });
        } catch (error) {
            console.error('Encryption error:', error);
            showMessage('Failed to encrypt message. Please try again.', 'error');
        }
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
    window.appendSystemMessage = appendSystemMessage; 
    window.showMessage = showMessage;
    
    // Listen for group update events from WebSocket
window.addEventListener('groupUpdate', function(event) {
    const data = event.detail;
    console.log("Group update event received:", data);
    
    // Update conversation with the system message
    if (data.groupId && data.message) {
        // Update the conversation preview with system message
        const conversationIndex = conversations.findIndex(c => c.userId === data.groupId);
        if (conversationIndex >= 0) {
            conversations[conversationIndex].lastMessage = data.message;
            
            // Update other fields based on update type
            if (data.updatedField === 'profilePicture') {
                conversations[conversationIndex].profilePicture = data.newValue;
            } 
            else if (data.updatedField === 'name') {
                conversations[conversationIndex].name = data.newValue;
            }
            
            // Save updated conversations
            localStorage.setItem('conversations', JSON.stringify(conversations));
            
            // Force re-render
            renderConversations();
        }
        
        // If currently viewing this conversation, add the system message to the chat
        if (currentRecipient === data.groupId) {
            appendSystemMessage(data.message, data.timestamp);
        }
    }
});

    // Update conversation with new message (local state)
    function updateConversationWithNewMessage(userId, text, isSent = true, attachments = [], attachmentTypes = []) {
        const conversationIndex = conversations.findIndex(c => c.userId === userId);
        
        // Generate preview text based on attachments
        let previewText = text;
        let hasAttachments = attachments && attachments.length > 0;
        let attachmentType = hasAttachments && attachmentTypes && attachmentTypes[0];
        
        if (hasAttachments) {
            if (attachmentType === 'image') {
                previewText = text ? `📷 ${text}` : "📷 Sent a photo";
            } else if (attachmentType === 'video') {
                previewText = text ? `🎥 ${text}` : "🎥 Sent a video";
            } else {
                previewText = text ? `📎 ${text}` : "📎 Sent an attachment";
            }
        } else if (!previewText) {
            previewText = ""; // Fallback for empty messages
        }
        
        if (conversationIndex >= 0) {
            // Update existing conversation
            conversations[conversationIndex].lastMessage = previewText;
            // Store attachment info for persistence
            conversations[conversationIndex].hasAttachments = hasAttachments;
            conversations[conversationIndex].lastAttachmentType = attachmentType;
            
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
        
        // Save to localStorage for persistence across refreshes
        localStorage.setItem('conversations', JSON.stringify(conversations));
        
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
            e.stopPropagation(); // Prevent the click from closing the dropdown immediately
            
            if (groupDropdown) {
                // Toggle dropdown display
                groupDropdown.classList.toggle('show');
                
                // Add new options to the dropdown
                groupDropdown.innerHTML = `
                    <a href="#" id="viewMembersButton">See Members</a>
                    <a href="#" id="changePictureButton">Change Group Picture</a>
                    <a href="#" id="changeNameButton">Change Group Name</a>
                `;
                
                // Now that the buttons exist, add event listeners to them
                document.getElementById('viewMembersButton')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    groupDropdown.classList.remove('show');
                    showGroupMembers();
                });
                
                document.getElementById('changePictureButton')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    groupDropdown.classList.remove('show');
                    changeGroupPicture();
                });
                
                document.getElementById('changeNameButton')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    groupDropdown.classList.remove('show');
                    changeGroupName();
                });
            }
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', () => {
            if (groupDropdown.classList.contains('show')) {
                groupDropdown.classList.remove('show');
            }
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
    async function createGroupChat() {
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
        
        try {
            let encryptedKeys = {};
            
            // If encryption is available, generate and encrypt group keys
            if (window.messageEncryption) {
                // Generate a group encryption key
                const groupKey = await window.messageEncryption.generateGroupKey();
                
                // Encrypt the group key for each member
                for (const memberId of memberIds) {
                    encryptedKeys[memberId] = await window.messageEncryption.encryptGroupKey(groupKey, memberId);
                }
                
                // Also encrypt for the current user
                encryptedKeys[currentUser._id] = await window.messageEncryption.encryptGroupKey(groupKey, currentUser._id);
            }
            
            // Send request with or without encryption
            const requestBody = {
                name: groupName,
                members: memberIds
            };
            
            // Only include encrypted keys if we have them
            if (Object.keys(encryptedKeys).length > 0) {
                requestBody.encryptedKeys = encryptedKeys;
            }
            
            const response = await fetch('/api/messages/create-group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error('Failed to create group chat');
            }
            
            const groupChat = await response.json();
            
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
        } catch (error) {
            console.error('Error creating group chat:', error);
            showMessage('Failed to create group chat. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    // Toggle add members section
    function toggleAddMembersSection() {
        const addMembersSection = document.getElementById('addMembersSection');
        if (addMembersSection) {
            if (addMembersSection.style.display === 'none') {
                addMembersSection.style.display = 'block';
                document.getElementById('addMembersButton').innerHTML = '<i class="fas fa-times"></i> Cancel';
            } else {
                addMembersSection.style.display = 'none';
                document.getElementById('addMembersButton').innerHTML = '<i class="fas fa-user-plus"></i> Add Members';
            }
        }
    }

    // Search users for existing group
    function searchUsersForExistingGroup(query) {
        if (!query.trim()) return;
        
        const resultsContainer = document.getElementById('addMembersResults');
        
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading-message">Searching...</div>';
            
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
                // Filter out users who are already members
                const existingMemberIds = currentGroup.members.map(id => id.toString());
                const filteredResults = results.filter(user => !existingMemberIds.includes(user._id.toString()));
                
                renderAddMembersResults(filteredResults);
            })
            .catch(error => {
                console.error('Error searching users:', error);
                if (resultsContainer) {
                    resultsContainer.innerHTML = '<div class="no-results">Error searching users. Please try again.</div>';
                }
            });
        }
    }

    // Render results for adding new members
    function renderAddMembersResults(results) {
        const resultsContainer = document.getElementById('addMembersResults');
        
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No users found or all users already added</div>';
            return;
        }
        
        results.forEach(user => {
            const resultItem = document.createElement('div');
            resultItem.classList.add('search-result-item');
            
            resultItem.innerHTML = `
                <img src="${user.profilePicture}" alt="${user.name}" class="search-result-avatar">
                <div class="search-result-name">${user.name}</div>
                <button class="add-to-group-button" data-user-id="${user._id}" data-user-name="${user.name}">Add</button>
            `;
            
            resultsContainer.appendChild(resultItem);
        });
        
        // Add event listeners to add buttons
        document.querySelectorAll('.add-to-group-button').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.dataset.userId;
                const userName = this.dataset.userName;
                
                addMemberToExistingGroup(userId, userName);
            });
        });
    }

    // Add member to existing group
    function addMemberToExistingGroup(userId, userName) {
        showLoading();
        
        fetch(`/api/messages/group/${currentGroup.id}/add-member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                memberId: userId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to add member');
            }
            return response.json();
        })
        .then(result => {
            hideLoading();
            
            // Update the local group data
            if (!currentGroup.members.includes(userId)) {
                currentGroup.members.push(userId);
            }
            
            // Show a success message
            showMessage(`${userName} has been added to the group`, 'success');
            
            // Refresh the members list
            fetchGroupMembers();
            
            // Hide the add members section
            toggleAddMembersSection();
        })
        .catch(error => {
            hideLoading();
            console.error('Error adding member:', error);
            showMessage('Failed to add member. Please try again.', 'error');
        });
    }

    // Function to fetch group members
    function fetchGroupMembers() {
        const groupMembersList = document.getElementById('groupMembersList');
        
        if (!groupMembersList) return;
        
        groupMembersList.innerHTML = '<div class="loading-message">Loading members...</div>';
        
        if (!currentGroup || !currentGroup.id) {
            groupMembersList.innerHTML = '<div class="error-message">Error: Group information is missing</div>';
            return;
        }
        
        fetch(`/api/messages/group-members/${currentGroup.id}`, {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load group members: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(members => {
            console.log("Received group members:", members);
            renderGroupMembers(members);
        })
        .catch(error => {
            console.error('Error loading group members:', error);
            if (groupMembersList) {
                groupMembersList.innerHTML = `<div class="error-message">Failed to load group members: ${error.message}</div>`;
            }
        });
    }

    // Change group picture
    function changeGroupPicture() {
        // Create and open a file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.onchange = function(e) {
            if (this.files && this.files[0]) {
                const formData = new FormData();
                formData.append('groupPicture', this.files[0]);
                
                showLoading();
                
                fetch(`/api/messages/group/${currentGroup.id}/update-picture`, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update group picture');
                    }
                    return response.json();
                })
                .then(result => {
                    hideLoading();
                    console.log("Group picture update response:", result);
                    
                    // Update the currentGroup object
                    if (currentGroup) {
                        currentGroup.profilePicture = result.profilePicture;
                    }
                    
                    // Update local UI with new picture - ensure the path is correct
                    const chatUserImg = document.getElementById('chatUserImg');
                    if (chatUserImg) {
                        // Force browser to reload the image by adding a cache-busting parameter
                        chatUserImg.src = result.profilePicture + '?t=' + new Date().getTime();
                    }
                    
                    // Also update in the conversations list
                    const conversationItem = document.querySelector(`.conversation-item[data-user-id="${currentGroup.id}"]`);
                    if (conversationItem) {
                        const avatar = conversationItem.querySelector('.conversation-avatar');
                        if (avatar) {
                            // Add cache-busting parameter here too
                            avatar.src = result.profilePicture + '?t=' + new Date().getTime();
                        }
                    }
                    
                    // Update in the conversations array for persistence
                    const conversationIndex = window.conversations.findIndex(c => c.userId === currentGroup.id);
                    if (conversationIndex >= 0) {
                        window.conversations[conversationIndex].profilePicture = result.profilePicture;
                        // Save to localStorage for persistence
                        localStorage.setItem('conversations', JSON.stringify(window.conversations));
                    }
                    
                    // Add this picture to localStorage with a separate key for better persistence
                    localStorage.setItem(`group_${currentGroup.id}_picture`, result.profilePicture);
    
                    showMessage('Group picture updated successfully', 'success');
                })
                .catch(error => {
                    hideLoading();
                    console.error('Error updating group picture:', error);
                    showMessage('Failed to update group picture. Please try again.', 'error');
                });
            }
        };
        
        fileInput.click();
    }

    // Change group name
    function changeGroupName() {
        // Prompt the user for a new name
        const newName = prompt('Enter new group name:', currentGroup.name);
        
        if (newName && newName.trim() && newName !== currentGroup.name) {
            showLoading();
            
            fetch(`/api/messages/group/${currentGroup.id}/update-name`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: newName.trim()
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update group name');
                }
                return response.json();
            })
            .then(result => {
                hideLoading();
                
                // Update local data
                currentGroup.name = result.name;
                
                // Update UI
                document.getElementById('chatUsername').textContent = result.name;
                
                // Update in the conversations list
                const conversationIndex = conversations.findIndex(c => c.userId === currentGroup.id);
                if (conversationIndex >= 0) {
                    conversations[conversationIndex].name = result.name;
                    renderConversations();
                }
                
                showMessage('Group name updated successfully', 'success');
            })
            .catch(error => {
                hideLoading();
                console.error('Error updating group name:', error);
                showMessage('Failed to update group name. Please try again.', 'error');
            });
        }
    }

    // Function to remove a member from the group
    function removeMemberFromGroup(memberId, memberName) {
        if (confirm(`Are you sure you want to remove ${memberName} from this group?`)) {
            showLoading();
            
            fetch(`/api/messages/group/${currentGroup.id}/remove-member`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    memberId: memberId
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to remove member');
                }
                return response.json();
            })
            .then(result => {
                hideLoading();
                
                // Update local group data
                currentGroup.members = currentGroup.members.filter(id => id.toString() !== memberId.toString());
                
                // Show success message
                showMessage(`${memberName} has been removed from the group`, 'success');
                
                // Refresh the members list
                fetchGroupMembers();
            })
            .catch(error => {
                hideLoading();
                console.error('Error removing member:', error);
                showMessage('Failed to remove member. Please try again.', 'error');
            });
        }
    }


    // Add this function to show group members
    function showGroupMembers() {
        // Close the dropdown
        groupDropdown.classList.remove('show');
        
        // Set the modal title
        const modalTitle = document.getElementById('groupMembersTitle');
        if (modalTitle) {
            modalTitle.textContent = `Members of ${currentGroup.name}`;
        }
        
        // Add a search bar and buttons to the modal
        const modalContent = groupMembersModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.innerHTML = `
                <span class="close" id="closeGroupMembersModal">&times;</span>
                <h2 id="groupMembersTitle">Members of ${currentGroup.name}</h2>
                
                <div class="group-management-controls">
                    <button id="addMembersButton" class="modal-action-button">
                        <i class="fas fa-user-plus"></i> Add Members
                    </button>
                </div>
                
                <div id="groupMembersList" class="group-members-list">
                    <!-- Group members will be displayed here -->
                    <div class="loading-message">Loading members...</div>
                </div>
                
                <div id="addMembersSection" class="add-members-section" style="display: none;">
                    <h3>Add New Members</h3>
                    <div class="modal-search-container">
                        <input type="text" id="addMembersSearchInput" placeholder="Search users to add...">
                        <button id="addMembersSearchButton"><i class="fas fa-search"></i></button>
                    </div>
                    <div id="addMembersResults" class="search-results">
                        <!-- Search results will appear here -->
                    </div>
                </div>
            `;
            
            // Re-bind the close button event since we replaced the HTML
            const closeButton = document.getElementById('closeGroupMembersModal');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    groupMembersModal.style.display = 'none';
                });
            }
            
            // Add event listener for the add members button
            const addMembersButton = document.getElementById('addMembersButton');
            if (addMembersButton) {
                addMembersButton.addEventListener('click', toggleAddMembersSection);
            }
            
            // Add event listeners for the search functionality
            const searchInput = document.getElementById('addMembersSearchInput');
            const searchButton = document.getElementById('addMembersSearchButton');
            
            if (searchInput && searchButton) {
                searchInput.addEventListener('input', window.searchUtils.debounce(function() {
                    const query = searchInput.value.trim();
                    if (query.length >= 2) {
                        searchUsersForExistingGroup(query);
                    } else if (query.length === 0) {
                        const resultsElement = document.getElementById('addMembersResults');
                        if (resultsElement) {
                            resultsElement.innerHTML = '';
                        }
                    }
                }, 300));
                
                searchButton.addEventListener('click', () => {
                    const query = searchInput.value.trim();
                    if (query) {
                        searchUsersForExistingGroup(query);
                    }
                });
            }
        }
        
        // Show the modal
        groupMembersModal.style.display = 'block';
        
        // Fetch and render group members
        fetchGroupMembers();
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
            
            // Add remove button if the user is not the creator
            const removeButton = !isCreator ? 
                `<button class="remove-member-button" data-user-id="${member._id}" data-user-name="${member.name}">
                    <i class="fas fa-user-minus"></i>
                </button>` : '';
            
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
                ${removeButton}
            `;
            
            groupMembersList.appendChild(memberItem);
        });
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-member-button').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.dataset.userId;
                const userName = this.dataset.userName;
                
                removeMemberFromGroup(userId, userName);
            });
        });
    }

    // Setup event listeners for attachments
    function setupAttachmentListeners() {
        // Media button click
        mediaButton.addEventListener('click', () => {
            mediaInput.click();
        });
        
        // File button click
        fileButton.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Media selection
        mediaInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelection(e.target.files, 'media');
            }
        });
        
        // File selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelection(e.target.files, 'file');
            }
        });
    }

    // Handle file selection
    function handleFileSelection(files, type) {
        Array.from(files).forEach(file => {
            // Create a unique ID for this attachment
            const attachmentId = 'attachment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            // Store the file with metadata
            messageAttachments.push({
                id: attachmentId,
                file: file,
                type: type,
                name: file.name
            });
            
            // Create preview
            createAttachmentPreview(file, type, attachmentId);
        });
        
        // Show the attachments preview area
        if (messageAttachments.length > 0) {
            attachmentsPreview.style.display = 'flex';
        }
        
        // Clear file inputs
        mediaInput.value = '';
        fileInput.value = '';
    }

    // Create attachment preview
    function createAttachmentPreview(file, type, id) {
        const attachmentItem = document.createElement('div');
        attachmentItem.classList.add('attachment-item');
        attachmentItem.dataset.id = id;
        
        let innerContent = '';
        
        if (type === 'media' && file.type.startsWith('image/')) {
            // Image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                attachmentItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="file-name">${file.name}</div>
                    <button class="remove-attachment" data-id="${id}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            };
            reader.readAsDataURL(file);
        } else {
            // File icon for documents or videos
            let iconClass = 'fas fa-file';
            
            if (file.type.includes('pdf')) {
                iconClass = 'fas fa-file-pdf';
            } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                iconClass = 'fas fa-file-word';
            } else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                iconClass = 'fas fa-file-excel';
            } else if (file.type.includes('video')) {
                iconClass = 'fas fa-file-video';
            }
            
            attachmentItem.innerHTML = `
                <div class="file-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="file-name">${file.name}</div>
                <button class="remove-attachment" data-id="${id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }
        
        attachmentsPreview.appendChild(attachmentItem);
        
        // Add event listener to remove button after the item is added to the DOM
        setTimeout(() => {
            const removeButton = attachmentItem.querySelector('.remove-attachment');
            if (removeButton) {
                removeButton.addEventListener('click', () => {
                    removeAttachment(id);
                });
            }
        }, 0);
    }

    // Remove attachment
    function removeAttachment(id) {
        // Remove from array
        messageAttachments = messageAttachments.filter(attachment => attachment.id !== id);
        
        // Remove from preview
        const attachmentItem = attachmentsPreview.querySelector(`.attachment-item[data-id="${id}"]`);
        if (attachmentItem) {
            attachmentItem.remove();
        }
        
        // Hide preview if no attachments
        if (messageAttachments.length === 0) {
            attachmentsPreview.style.display = 'none';
        }
    }

});
