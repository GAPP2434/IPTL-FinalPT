document.addEventListener('DOMContentLoaded', function() {
    // Initialize the explore page
    fetchExplorePosts();
    
    // Get current user ID
    window.currentUserId = null;
    fetch('/api/auth/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(user => {
        window.currentUserId = user._id;
    })
    .catch(error => {
        console.error('Error fetching current user:', error);
    });
    
    // Initialize the explore page
    fetchExplorePosts();
    
    // Add click event handler for post menus
    document.addEventListener('click', function(event) {
        // Handle menu icon click
        if (event.target.classList.contains('post-menu-icon')) {
            event.stopPropagation();
            const menu = event.target.closest('.post-menu');
            
            // Close all other open menus first
            document.querySelectorAll('.post-menu.active').forEach(openMenu => {
                if (openMenu !== menu) {
                    openMenu.classList.remove('active');
                }
            });
            
            // Toggle this menu
            menu.classList.toggle('active');
        }
        // Handle menu item clicks
        else if (event.target.closest('.post-menu-item')) {
            const menuItem = event.target.closest('.post-menu-item');
            const postId = menuItem.dataset.postId;
            
            if (menuItem.classList.contains('edit-post')) {
                editPost(postId);
            } else if (menuItem.classList.contains('delete-post')) {
                deletePost(postId);
            } else if (menuItem.classList.contains('block-post')) {
                blockPost(postId);
            } else if (menuItem.classList.contains('report-post')) {
                reportPost(postId);
            }
            
            // Close the menu
            const menu = menuItem.closest('.post-menu');
            menu.classList.remove('active');
        }
        // Close menus when clicking elsewhere
        else if (!event.target.closest('.post-menu')) {
            document.querySelectorAll('.post-menu.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });

    function editPost(postId) {
        // This is a placeholder. Actual implementation would involve fetching post content,
        // opening a modal, and submitting changes to the server
        showMessage('Edit post functionality will be implemented soon.', 'info');
    }

    // Show loading modal function
    function showLoading() {
        document.getElementById('loadingModal').style.display = 'block';
    }
    
    // Hide loading modal function
    function hideLoading() {
        document.getElementById('loadingModal').style.display = 'none';
    }
    
    // Show message function
    function showMessage(message, type) {
        const messageContainer = document.getElementById('message-container');
        const messageElement = document.getElementById('message');
        
        messageElement.textContent = message;
        messageElement.className = 'message ' + type;
        messageContainer.style.display = 'flex';
        
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 3000);
    }

    // Function to fetch and display posts from users not being followed
    function fetchExplorePosts() {
        showLoading();
        
        fetch('/api/posts/explore', {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load explore posts');
            }
            return response.json();
        })
        .then(posts => {
            hideLoading();
            const explorePosts = document.getElementById('explore-posts');
            
            // Clear existing posts
            explorePosts.innerHTML = '';
            
            // Filter out blocked posts
            const blockedPosts = JSON.parse(localStorage.getItem('blockedPosts') || '[]');
            const visiblePosts = posts.filter(post => !blockedPosts.includes(post.id));
            
            if (visiblePosts.length === 0) {
                explorePosts.innerHTML = '<div class="no-posts-message">No new posts to explore. Check back later!</div>';
                return;
            }
            
            // Display posts in descending order (newest first)
            visiblePosts.forEach(post => {
                const postElement = createPostElement(post);
                if (postElement) {  // Only add if not null (not blocked)
                    explorePosts.appendChild(postElement);
                }
            });

        })
        .catch(error => {
            hideLoading();
            console.error('Error fetching explore posts:', error);
            document.getElementById('explore-posts').innerHTML = 
                '<div class="error-message">Failed to load posts. Please refresh the page.</div>';
            showMessage('Error loading posts. Please try again.', 'error');
        });
    }

    // Function to create post element with proper avatar display
    function createPostElement(post) {
        if (!post || !post.id) {
            console.error('Invalid post object:', post);
            return null;
        }
        
        const blockedPosts = JSON.parse(localStorage.getItem('blockedPosts') || '[]');
        if (blockedPosts.includes(post.id)) {
            return null; // Skip rendering this post entirely
        }

        try {
            const postDate = new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const postDiv = document.createElement('div');
            postDiv.className = 'blog-post';
            postDiv.dataset.postId = post.id;
            
            // Ensure we have valid data with fallbacks
            const username = post.username || 'Anonymous';
            const userId = post.userId || '#';
            const avatarSrc = post.profilePicture || 'avatars/Avatar_Default_Anonymous.webp';
            const content = post.content || '';
            const likes = post.likes || 0;
            const comments = post.comments || 0;
            const userLiked = post.userLiked || false;
            
            // Create the HTML for the post with proper structure for avatar
            let postHTML = `
            <div class="post-header">
                <img src="${avatarSrc}" alt="${username}" class="post-avatar" onclick="window.location.href='profile.html?userId=${userId}'">
                <div>
                    <h5 class="post-username" onclick="window.location.href='profile.html?userId=${userId}'">${username}</h5>
                    <span class="post-date">${postDate}</span>
                </div>
                <div class="post-menu">
                    <i class="fas fa-ellipsis-v post-menu-icon"></i>
                    <div class="post-menu-dropdown">
                        ${post.userId === window.currentUserId ? `
                            <div class="post-menu-item edit-post" data-post-id="${post.id}">
                                <i class="fas fa-edit"></i> Edit Post
                            </div>
                            <div class="post-menu-item delete-post" data-post-id="${post.id}">
                                <i class="fas fa-trash"></i> Delete Post
                            </div>
                        ` : `
                            <div class="post-menu-item block-post" data-post-id="${post.id}">
                                <i class="fas fa-ban"></i> Hide this post
                            </div>
                            <div class="post-menu-item report-post" data-post-id="${post.id}">
                                <i class="fas fa-flag"></i> Report Post
                            </div>
                        `}
                    </div>
                </div>
            </div>
            
            <!-- Add post content here -->
            <div class="post-content">${content}</div>
        `;
            
            // Add image if available
            if (post.imageUrl) {
                postHTML += `<div class="post-image-container"><img src="${post.imageUrl}" alt="Post image" class="post-image"></div>`;
            }
            
            // Add post actions (like, comment, share, repost)
            postHTML += `
                <div class="post-actions">
                    <button class="post-action ${userLiked ? 'liked' : ''}" onclick="likePost('${post.id}', this)">
                        <i class="fas fa-thumbs-up"></i>
                        <span class="like-count">${likes}</span>
                    </button>
                    <button class="post-action" onclick="toggleComments('${post.id}')">
                        <i class="fas fa-comment"></i>
                        <span>${comments}</span>
                    </button>
                    <button class="post-action" onclick="sharePost('${post.id}')">
                        <i class="fas fa-share"></i>
                        <span>Share</span>
                    </button>
                    <button class="post-action" onclick="repostPost('${post.id}')">
                        <i class="fas fa-retweet"></i>
                        <span>Repost</span>
                    </button>
                </div>
                <div class="post-comments" id="comments-${post.id}" style="display: none;">
                    <div class="comments-container" id="comments-container-${post.id}"></div>
                    <div class="comment-form">
                        <input type="text" placeholder="Write a comment..." id="comment-input-${post.id}" class="comment-input-field">
                        <button class="send-comment-button" onclick="postComment('${post.id}')">Comment</button>
                    </div>
                </div>
            `;
            
            postDiv.innerHTML = postHTML;
            return postDiv;
        } catch (error) {
            console.error('Error creating post element:', error);
            return null;
        }
    }

    // Make these functions available globally
    window.likePost = function(postId, button) {
        fetch(`/api/posts/like/${postId}`, {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            const likeButton = button;
            const likeCount = likeButton.querySelector('.like-count');
            
            if (data.message === 'Liked post') {
                likeButton.classList.add('liked');
            } else {
                likeButton.classList.remove('liked');
            }
            
            likeCount.textContent = data.likes;
        })
        .catch(error => {
            console.error('Error liking post:', error);
            showMessage('Failed to like post. Please try again.', 'error');
        });
    };

    window.toggleComments = function(postId) {
        const commentsDiv = document.getElementById(`comments-${postId}`);
        const commentsContainer = document.getElementById(`comments-container-${postId}`);
        
        if (!commentsDiv) {
            console.error(`Comments div not found for post ${postId}`);
            return;
        }
        
        if (commentsDiv.style.display === 'none') {
            commentsDiv.style.display = 'block';
            
            // Display a loading indicator
            commentsContainer.innerHTML = '<div class="loading-comments">Loading comments...</div>';
            
            // Attempt to fetch comments using the fetch API
            fetch(`/api/posts/${postId}/comments`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                // If we get a non-successful response, use a mock empty array
                if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
                    console.warn('Received non-JSON or error response, using local comments');
                    
                    // Use local storage to check if there are comments we've added but not yet retrieved
                    const localComments = JSON.parse(localStorage.getItem(`post-${postId}-comments`) || '[]');
                    return localComments;
                }
                return response.json();
            })
            .then(comments => {
                // Ensure we have an array
                const commentArray = Array.isArray(comments) ? comments : [];
                
                if (commentArray.length === 0) {
                    commentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>';
                } else {
                    commentsContainer.innerHTML = '';
                    commentArray.forEach(comment => {
                        const commentDiv = document.createElement('div');
                        commentDiv.className = 'comment';
                        commentDiv.innerHTML = `
                            <div class="comment-user">${comment.username}</div>
                            <div class="comment-text">${comment.comment}</div>
                        `;
                        commentsContainer.appendChild(commentDiv);
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
                commentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>';
            });
        } else {
            commentsDiv.style.display = 'none';
        }
    };

    window.postComment = function(postId) {
        const commentInput = document.getElementById(`comment-input-${postId}`);
        const comment = commentInput.value.trim();
        
        if (!comment) return;
        
        fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ comment })
        })
        .then(response => response.json())
        .then(data => {
            // Add new comment to the comments container
            const commentsContainer = document.getElementById(`comments-container-${postId}`);
            
            // Remove "no comments" message if present
            const noComments = commentsContainer.querySelector('.no-comments');
            if (noComments) {
                commentsContainer.removeChild(noComments);
            }
            
            // Create comment element
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.innerHTML = `
                <div class="comment-user">${data.username}</div>
                <div class="comment-text">${data.comment}</div>
            `;
            commentsContainer.appendChild(commentDiv);
            
            // Store locally for fallback
            const localComments = JSON.parse(localStorage.getItem(`post-${postId}-comments`) || '[]');
            localComments.push({
                username: data.username,
                comment: data.comment
            });
            localStorage.setItem(`post-${postId}-comments`, JSON.stringify(localComments));
            
            // Clear input
            commentInput.value = '';
            
            // Update comment count
            const commentButton = document.querySelector(`.post-action[onclick="toggleComments('${postId}')"]`);
            const commentCount = commentButton.querySelector('span');
            commentCount.textContent = parseInt(commentCount.textContent) + 1;
        })
        .catch(error => {
            console.error('Error posting comment:', error);
            showMessage('Failed to post comment. Please try again.', 'error');
        });
    };

    // Add these new functions for share and repost actions
    window.sharePost = function(postId) {
        const postUrl = `${window.location.origin}/post/${postId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Check out this post on Gathering Hub',
                url: postUrl
            }).catch(err => {
                console.error('Error sharing:', err);
                // Fallback to clipboard copy
                copyToClipboard(postUrl);
            });
        } else {
            // Fallback for browsers that don't support navigator.share
            copyToClipboard(postUrl);
        }
    };

    window.repostPost = function(postId) {
        fetch(`/api/posts/repost/${postId}`, {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to repost');
            }
            return response.json();
        })
        .then(data => {
            showMessage('Post reposted successfully!', 'success');
            // Refresh posts to show the repost
            fetchExplorePosts();
        })
        .catch(error => {
            console.error('Error reposting:', error);
            showMessage('Failed to repost. Please try again.', 'error');
        });
    };

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('Link copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showMessage('Failed to copy link. Please try again.', 'error');
        });
    }
    
    function deletePost(postId) {
        if (confirm('Are you sure you want to delete this post?')) {
            fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete post');
                }
                return response.json();
            })
            .then(() => {
                // Remove the post from the UI
                const post = document.querySelector(`.blog-post[data-post-id="${postId}"]`);
                if (post) {
                    post.remove();
                }
                showMessage('Post deleted successfully', 'success');
            })
            .catch(error => {
                console.error('Error deleting post:', error);
                showMessage('Failed to delete post. Please try again.', 'error');
            });
        }
    }
    
    function blockPost(postId) {
        // Hide the post from the current user's view
        const post = document.querySelector(`.blog-post[data-post-id="${postId}"]`);
        if (post) {
            post.style.display = 'none';
            
            // Store the blocked post ID in localStorage
            let blockedPosts = JSON.parse(localStorage.getItem('blockedPosts') || '[]');
            blockedPosts.push(postId);
            localStorage.setItem('blockedPosts', JSON.stringify(blockedPosts));
            
            showMessage('Post hidden from your feed', 'success');
        }
    }
    
    function reportPost(postId) {
        // Show a modal to get the reason for reporting
        const reason = prompt('Please provide a reason for reporting this post:');
        
        if (reason) {
            fetch('/api/posts/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    postId: postId,
                    reason: reason
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to report post');
                }
                return response.json();
            })
            .then(() => {
                showMessage('Post reported successfully. An admin will review it.', 'success');
            })
            .catch(error => {
                console.error('Error reporting post:', error);
                showMessage('Failed to report post. Please try again.', 'error');
            });
        }
    }

});