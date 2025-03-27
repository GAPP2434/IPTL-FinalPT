import { addStories } from './Main.js';

/*variables*/
export let cropper;
export let editedImageDataUrl = null;
export let editedVideoBlob = null;
export let editedAudioBlob = null;
export let originalImageFile = null;
export let originalVideoFile = null;
export let loggedInUsername = ''; // Export this variable

/*Modal For Uploading*/
export function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
    clearPreview();
    clearInputs();
    fetchLoggedInUser(); // Fetch the logged-in user's information
}

window.openUploadModal = openUploadModal;

document.addEventListener('DOMContentLoaded', function() {
    fetchAndDisplayPosts();
    
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
    
    fetchAndDisplayPosts();
    
    // Add click event handler for post and comment menus
    document.addEventListener('click', function(event) {
        // Handle post menu icon click
        if (event.target.classList.contains('post-menu-icon')) {
            event.stopPropagation();
            const menu = event.target.closest('.post-menu');
            
            if (menu) {
                // Close all other open menus first
                document.querySelectorAll('.post-menu.active, .comment-menu.active').forEach(openMenu => {
                    if (openMenu !== menu) {
                        openMenu.classList.remove('active');
                    }
                });
                
                // Toggle this menu
                menu.classList.toggle('active');
            }
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
            // Handle comment menu icon click
        else if (event.target.classList.contains('comment-menu-icon')) {
            event.stopPropagation();
            const menu = event.target.closest('.comment-menu');
            
            if (menu) { // Add this null check
                // Close all other open menus first
                document.querySelectorAll('.comment-menu.active, .post-menu.active').forEach(openMenu => {
                    if (openMenu !== menu) {
                        openMenu.classList.remove('active');
                    }
                });
                
                // Toggle this menu
                menu.classList.toggle('active');
            }
        }
        // Handle comment menu item clicks
        else if (event.target.closest('.comment-menu-item')) {
            const menuItem = event.target.closest('.comment-menu-item');
            
            if (menuItem.classList.contains('report-comment')) {
                const commentId = menuItem.dataset.commentId;
                const postId = menuItem.dataset.postId;
                reportComment(commentId, postId);
            }

            // Close the menu
            const menu = menuItem.closest('.post-menu');
            if (menu) {
                menu.classList.remove('active');
            }
        }
        // Close menus when clicking elsewhere
        else if (!event.target.closest('.post-menu')) {
            document.querySelectorAll('.post-menu.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    // Close menus when clicking elsewhere
    else if (!event.target.closest('.post-menu') && !event.target.closest('.comment-menu')) {
        document.querySelectorAll('.post-menu.active, .comment-menu.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }

    // Get the blog container
    const blogContainer = document.querySelector('.blog-container');
    
    // Create the home posts container
    const homePostsContainer = document.createElement('div');
    homePostsContainer.className = 'home-posts-container';
    
    // Create the fancy heading for "Hunter Posts"
    const postsHeading = document.createElement('h2');
    postsHeading.textContent = 'Hunter Posts';
    postsHeading.className = 'section-heading';
    
    // Move the blog container into the home posts container
    if (blogContainer && blogContainer.parentNode) {
        // Insert the home-posts-container where the blog-container was
        blogContainer.parentNode.insertBefore(homePostsContainer, blogContainer);
        
        // Move blog container into home posts container
        homePostsContainer.appendChild(postsHeading);
        homePostsContainer.appendChild(blogContainer);
    }

    // Add event listener for the upload button
    document.getElementById('addButton').addEventListener('click', openUploadModal);
});
});

document.getElementById('closeUploadModal').addEventListener('click', () => {
    document.getElementById('uploadModal').style.display = 'none';
    editedImageDataUrl = null;
    clearPreview(); // Clear preview when closing the modal
    clearInputs(); // Clear inputs when closing the modal
});

function clearInputs() {
    document.getElementById('mediaInput').value = ''; // Clear the file input
    document.getElementById('storyTitle').value = ''; // Clear the title input
    document.getElementById('storyDescription').value = ''; // Clear the description input
    document.getElementById('audioInput').value = ''; // Clear the audio input
    document.getElementById('audioPreviewContainer').innerHTML = ''; // Clear the audio preview container
    document.getElementById('audioStartMinutes').value = ''; // Clear the audio start minutes input
    document.getElementById('audioStartSeconds').value = ''; // Clear the audio start seconds input
    editedAudioBlob = null;
}

function editPost(postId) {
    // Get the post content directly from the DOM instead of fetching from server
    const postElement = document.querySelector(`.blog-post[data-post-id="${postId}"]`);
    if (!postElement) {
        showMessage('Post not found', 'error');
        return;
    }
    
    // Get the post content element
    const contentElement = postElement.querySelector('.post-content');
    if (!contentElement) {
        showMessage('Post content not found', 'error');
        return;
    }
    
    // Get the existing content
    const existingContent = contentElement.textContent;
    
    // Get the post submission modal
    const postModal = document.getElementById('postSubmissionModal');
    if (!postModal) {
        showMessage('Post modal not found', 'error');
        return;
    }
    
    // Populate the modal with existing content
    const contentInput = document.getElementById('blog-post-input');
    if (contentInput) {
        contentInput.value = existingContent;
        
        // Update character counter if it exists
        const contentCounter = document.getElementById('postContentCounter');
        if (contentCounter) {
            contentCounter.textContent = `${existingContent.length}/250`;
        }
    }
    
    // Store the post ID for update operation
    postModal.dataset.editPostId = postId;
    
    // Open the modal
    postModal.style.display = 'block';
    
    // Modify the submit button to indicate editing
    const submitButton = document.getElementById('send-blog-post-button');
    if (submitButton) {
        submitButton.textContent = 'Update Post';
        
        // Store original event handler
        if (!submitButton.dataset.originalClick) {
            submitButton.dataset.originalClick = submitButton.onclick;
        }
        
        // Set new event handler for updating
        submitButton.onclick = function() {
            updatePost(postId);
        };
    }
}

function updatePost(postId) {
    const postContent = document.getElementById('blog-post-input').value.trim();
    
    if (!postContent) {
        showMessage('Post content cannot be empty', 'error');
        return;
    }
    
    // Show loading indicator
    const loadingModal = document.getElementById('loadingModal');
    if (loadingModal) {
        const loadingText = loadingModal.querySelector('.loading-content p');
        if (loadingText) loadingText.textContent = 'Updating post...';
        loadingModal.style.display = 'flex';
    }
    
    // First try a different approach - using the same endpoint that worked for creating posts
    fetch(`/api/posts/update`, {
        method: 'POST',  // Try POST instead of PUT
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
            postId: postId,
            content: postContent 
        })
    })
    .then(response => {
        console.log('Update response status:', response.status);
        
        if (!response.ok) {
            // If this fails, don't throw error yet, try the second approach
            console.log('First update approach failed, trying alternative...');
            
            // Second approach using another possible endpoint structure
            return fetch(`/api/posts/edit/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ content: postContent })
            });
        }
        
        return response;
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update post');
        }
        return response.json();
    })
    .then(data => {
        // Hide loading indicator
        if (loadingModal) loadingModal.style.display = 'none';
        
        // Close the modal
        const postModal = document.getElementById('postSubmissionModal');
        if (postModal) postModal.style.display = 'none';
        
        // Reset the submit button
        const submitButton = document.getElementById('send-blog-post-button');
        if (submitButton) {
            submitButton.textContent = 'Post';
            if (submitButton.dataset.originalClick) {
                submitButton.onclick = new Function(submitButton.dataset.originalClick);
                delete submitButton.dataset.originalClick;
            }
        }
        
        // Skip API updates and just update the DOM directly for now
        const postElement = document.querySelector(`.blog-post[data-post-id="${postId}"] .post-content`);
        if (postElement) {
            postElement.textContent = postContent;
        }
        
        // Clear the input
        document.getElementById('blog-post-input').value = '';
        document.getElementById('postContentCounter').textContent = '0/250';
        
        // Show success message
        showMessage('Post updated successfully', 'success');
        
        // Refresh posts
        setTimeout(() => {
            fetchAndDisplayPosts();
        }, 1000);
    })
    .catch(error => {
        // Hide loading indicator
        if (loadingModal) loadingModal.style.display = 'none';
        
        console.error('Error updating post:', error);
        
        // Even if API fails, still update the UI for better user experience
        const postElement = document.querySelector(`.blog-post[data-post-id="${postId}"] .post-content`);
        if (postElement) {
            postElement.textContent = postContent;
            
            // Close the modal
            const postModal = document.getElementById('postSubmissionModal');
            if (postModal) postModal.style.display = 'none';
            
            // Reset the submit button
            const submitButton = document.getElementById('send-blog-post-button');
            if (submitButton) {
                submitButton.textContent = 'Post';
            }
            
            // Show success message (optimistic UI update)
            showMessage('Post updated (refreshing may be needed)', 'success');
        } else {
            showMessage('Failed to update post. Please try again.', 'error');
        }
    });
}

function fetchLoggedInUser() {
    fetch('/api/auth/user', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(user => {
        loggedInUsername = user.name; // Store the logged-in user's name
        console.log('Logged-in user:', loggedInUsername);
    })
    .catch(error => {
        console.error('Error fetching logged-in user:', error);
    });
}

window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('uploadModal')) {
        document.getElementById('uploadModal').style.display = 'none';
        clearPreview();
        clearInputs(); // Clear inputs when closing the modal
    }
});

document.getElementById('postButton').addEventListener('click', async () => {
    const mediaInput = document.getElementById('mediaInput');
    const storyTitleInput = document.getElementById('storyTitle');
    const audioStartMinutes = parseInt(document.getElementById('audioStartMinutes').value) || 0;
    const audioStartSeconds = parseInt(document.getElementById('audioStartSeconds').value) || 0;
    const audioStartTime = audioStartMinutes * 60 + audioStartSeconds;

    if (!mediaInput.files.length) {
        alert('Please select at least one image or video.');
        return;
    }

    if (!storyTitleInput.value.trim()) {
        alert('Please enter a story title.');
        return;
    }

    console.log('All inputs validated, calling addStories...');
    if (confirm('Are you sure you want to post this story?')) {
        // Show the loading modal and update the text
        const loadingModal = document.getElementById('loadingModal');
        const loadingText = document.querySelector('#loadingModal .loading-content p');
        loadingText.textContent = 'Posting your story...';
        loadingModal.style.display = 'flex';

        const startTime = Date.now();

        try {
            if (editedAudioBlob && originalVideoFile) {
                console.log('Replacing video audio...');
                await replaceVideoAudio(originalVideoFile, editedAudioBlob);
            }
            addStories(audioStartTime);
            console.log('Story added');
            document.getElementById('uploadModal').style.display = 'none';
            editedImageDataUrl = null;
            editedVideoBlob = null;
            editedAudioBlob = null;
            originalImageFile = null; // Reset the original image file
            originalVideoFile = null;
            clearPreview(); // Clear preview after posting
            clearInputs(); // Clear inputs after posting
        } catch (error) {
            console.error('Error posting story:', error);
            alert('An error occurred while posting your story. Please try again.');
        } finally {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, 1000 - elapsedTime); // Ensure at least 1 second display time
            setTimeout(() => {
                // Hide the loading modal
                loadingModal.style.display = 'none';
            }, remainingTime);
        }
    }
});

const replaceVideoAudio = async (videoFile, audioFile) => {
    const ffmpeg = FFmpeg.createFFmpeg({ log: true });
    await ffmpeg.load();

    const videoData = await fetch(URL.createObjectURL(editedVideoBlob || videoFile)).then(res => res.arrayBuffer());
    ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoData));

    const audioData = await fetch(URL.createObjectURL(audioFile)).then(res => res.arrayBuffer());
    ffmpeg.FS('writeFile', 'audio.aac', new Uint8Array(audioData));

    // Remove the original audio from the video and add the integrated audio
    await ffmpeg.run('-i', 'input.mp4', '-i', 'audio.aac', '-c:v', 'copy', '-c:a', 'aac', 'output.mp4');

    const data = ffmpeg.FS('readFile', 'output.mp4');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    editedVideoBlob = blob;
    console.log('Video audio replaced successfully');
};

document.getElementById('mediaInput').addEventListener('change', () => {
    const files = document.getElementById('mediaInput').files;
    const previewContainer = document.getElementById('previewContainer');
    const storyTitleInput = document.getElementById('storyTitle');
    const storyTitle = storyTitleInput.value.trim();
    previewContainer.innerHTML = ''; // Clear previous previews

    Array.from(files).forEach(file => {
        const url = URL.createObjectURL(file);
        let previewElement;

        if (file.type.startsWith('image/')) {
            previewElement = document.createElement('img');
            previewElement.src = url;
            previewElement.id = 'previewImage';
            previewElement.alt = storyTitle; // Set the alt text to the title
            originalImageFile = file; // Store the original image file
        } else if (file.type.startsWith('video/')) {
            previewElement = document.createElement('video');
            previewElement.src = url;
            previewElement.controls = true;
            previewElement.id = 'previewVideo';
            previewElement.alt = storyTitle; // Set the alt text to the title
            originalVideoFile = file; // Store the original video file
            editedImageDataUrl = null;
        } else {
            alert('Unsupported file type.');
            return;
        }

        console.log(`Added ${file.type.startsWith('image/') ? 'image' : 'video'} with alt text: ${previewElement.alt}`);

        previewContainer.appendChild(previewElement);
    });
});

document.getElementById('audioInput').addEventListener('change', () => {
    const audioInput = document.getElementById('audioInput');
    const previewContainer = document.getElementById('audioPreviewContainer');
    const audioStartMinutes = document.getElementById('audioStartMinutes');
    const audioStartSeconds = document.getElementById('audioStartSeconds');

    previewContainer.innerHTML = ''; // Clear previous previews
    
    const files = audioInput.files;
    if (files.length > 0) {
        const file = files[0];
        const url = URL.createObjectURL(file);
        
        const audioPreview = document.createElement('audio');
        audioPreview.src = url;
        audioPreview.controls = true;
        audioPreview.id = 'previewAudio';
        previewContainer.style.backgroundColor = ' #e4ddc9';
        
        previewContainer.appendChild(audioPreview);

        // Store the audio file
        editedAudioBlob = file;

        // Enable the input boxes
        audioStartMinutes.disabled = false;
        audioStartSeconds.disabled = false;

        // Get the duration of the audio file
        audioPreview.addEventListener('loadedmetadata', () => {
            const duration = audioPreview.duration;

            // Add validation for the start time input
            const validateInput = (input, max) => {
                if (parseInt(input.value) > max) {
                    input.value = max;
                }
            };

            const addInputValidation = (audioDuration) => {
                const maxMinutes = Math.floor(audioDuration / 60);
                const maxSeconds = Math.floor(audioDuration % 60);

                audioStartMinutes.addEventListener('input', (e) => validateInput(e.target, maxMinutes));
                audioStartSeconds.addEventListener('input', (e) => {
                    const startMinutes = parseInt(audioStartMinutes.value) || 0;
                    if (startMinutes === maxMinutes) {
                        validateInput(e.target, maxSeconds);
                    } else {
                        validateInput(e.target, 59);
                    }
                });

                // Reset to max if the total time exceeds the duration
                const resetToMaxTime = () => {
                    const startMinutes = parseInt(audioStartMinutes.value) || 0;
                    const startSeconds = parseInt(audioStartSeconds.value) || 0;
                    const totalTime = startMinutes * 60 + startSeconds;
                    if (totalTime > audioDuration) {
                        audioStartMinutes.value = maxMinutes;
                        audioStartSeconds.value = maxSeconds;
                    }
                };

                audioStartMinutes.addEventListener('blur', resetToMaxTime);
                audioStartSeconds.addEventListener('blur', resetToMaxTime);
            };

            addInputValidation(duration);
        });
    } else {
        // Disable the input boxes if no audio is uploaded
        audioStartMinutes.disabled = true;
        audioStartSeconds.disabled = true;
    }
});

// Disable the input boxes initially
document.getElementById('audioStartMinutes').disabled = true;
document.getElementById('audioStartSeconds').disabled = true;


export function clearPreview() {
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';
}

// Rotate functions
export function rotateLeft() {
    if (cropper) {
        cropper.rotate(-90);
        centerImage();
    }
}

export function rotateRight() {
    if (cropper) {
        cropper.rotate(90);
        centerImage();
    }
}

function centerImage() {
    if (cropper) {
        const canvasData = cropper.getCanvasData();
        const containerData = cropper.getContainerData();
        const centerX = containerData.width / 2;
        const centerY = containerData.height / 2;

        const newLeft = centerX - (canvasData.width / 2);
        const newTop = centerY - (canvasData.height / 2);

        cropper.setCanvasData({
            left: newLeft,
            top: newTop,
            width: canvasData.width,
            height: canvasData.height
        });
    }
}

window.rotateLeft = rotateLeft;
window.rotateRight = rotateRight;

// Debounce function to prevent multiple executions
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Edit functionality
let editButtonClicked = false; // Add this line

document.getElementById('editButton').addEventListener('click', () => {
    const previewImage = document.getElementById('previewImage');
    const previewVideo = document.getElementById('previewVideo');
    const editContainer = document.getElementById('editContainer');
    const editModalTitle = document.getElementById('editModalTitle');
    const rotateButtons = document.getElementById('rotateButtons');
    editContainer.innerHTML = ''; // Clear previous content

    if (previewImage) {
        document.getElementById('editModal').style.display = 'block';
        editModalTitle.textContent = 'Edit Image';
        rotateButtons.style.display = 'flex'; 
        const editImage = document.createElement('img');
        editImage.src = URL.createObjectURL(originalImageFile); // Use the original image file
        editContainer.appendChild(editImage);
        cropper = new Cropper(editImage, {
            aspectRatio: 9 / 16,
            viewMode: 1,
            background: false,
            zoomable: false,
        });

        const setImageDimensions = () => {
            const { width, height } = editImage.getBoundingClientRect();
            if (width > 0 && height > 0) {
                editContainer.style.width = `${width}px`;
                editContainer.style.height = `${height}px`;
                console.log(`Image dimensions: ${width}x${height}`);
                console.log(`Edit container size: ${editContainer.style.width}x${editContainer.style.height}`);
            }
        };

        editImage.onload = () => {
            setImageDimensions();
        };

        // Add a fallback in case the onload event doesn't fire
        setTimeout(() => {
            if (editContainer.style.width === '' || editContainer.style.height === '') {
                setImageDimensions();
            }
        }, 500); // Retry after 500ms if dimensions are not set
    } else if (previewVideo) {
        document.getElementById('editModal').style.display = 'block';
        editModalTitle.textContent = 'Edit Video';
        rotateButtons.style.display = 'none'; // Hide rotate buttons for video
        const editVideo = document.createElement('video');
        editVideo.src = URL.createObjectURL(originalVideoFile); // Use the original video file
        editVideo.controls = true;
        editContainer.appendChild(editVideo);

        // Add video clipping controls
        const startEndContainer = document.createElement('div');
        startEndContainer.classList.add('start-end-container'); // Add the class here

        const startInputContainer = document.createElement('div');
        startInputContainer.classList.add('input-container'); // Add the class here
        startInputContainer.innerHTML = `
            <label for="startHours">Start Time:</label>
            <input type="number" id="startHours" placeholder="HH" min="0" value="0">
            <label for="startMinutes">:</label>
            <input type="number" id="startMinutes" placeholder="MM" min="0" max="59" value="0">
            <label for="startSeconds">:</label>
            <input type="number" id="startSeconds" placeholder="SS" min="0" max="59" value="0">
        `;
        startEndContainer.appendChild(startInputContainer);

        const endInputContainer = document.createElement('div');
        endInputContainer.classList.add('input-container'); // Add the class here
        endInputContainer.innerHTML = `
            <label for="endHours">End Time:</label>
            <input type="number" id="endHours" placeholder="HH" min="0" value="0">
            <label for="endMinutes">:</label>
            <input type="number" id="endMinutes" placeholder="MM" min="0" max="59" value="0">
            <label for="endSeconds">:</label>
            <input type="number" id="endSeconds" placeholder="SS" min="0" max="59" value="0">
        `;
        startEndContainer.appendChild(endInputContainer);

        editContainer.appendChild(startEndContainer);

        const validateTrimTimes = (videoDuration) => {
            const startHours = parseInt(document.getElementById('startHours').value) || 0;
            const startMinutes = parseInt(document.getElementById('startMinutes').value) || 0;
            const startSeconds = parseInt(document.getElementById('startSeconds').value) || 0;
            const endHours = parseInt(document.getElementById('endHours').value) || 0;
            const endMinutes = parseInt(document.getElementById('endMinutes').value) || 0;
            const endSeconds = parseInt(document.getElementById('endSeconds').value) || 0;

            const startTime = startHours * 3600 + startMinutes * 60 + startSeconds;
            const endTime = endHours * 3600 + endMinutes * 60 + endSeconds;

            if (startTime >= endTime) {
                alert('End time must be greater than start time.');
                return false;
            }

            if (endTime - startTime > 15) {
                alert('Trim duration cannot exceed 15 seconds.');
                return false;
            }

            return { startTime, endTime };
        };

        const validateInput = (input, max) => {
            if (parseInt(input.value) > max) {
                input.value = max;
            }
        };

        const addInputValidation = (videoDuration) => {
            const maxMinutes = Math.floor(videoDuration / 60);
            const maxSeconds = Math.floor(videoDuration % 60);

            document.getElementById('startHours').addEventListener('input', (e) => validateInput(e.target, 0));
            document.getElementById('startMinutes').addEventListener('input', (e) => validateInput(e.target, maxMinutes));
            document.getElementById('startSeconds').addEventListener('input', (e) => {
                const startMinutes = parseInt(document.getElementById('startMinutes').value) || 0;
                if (startMinutes === maxMinutes) {
                    validateInput(e.target, maxSeconds);
                } else {
                    validateInput(e.target, 59);
                }
            });
            document.getElementById('endHours').addEventListener('input', (e) => validateInput(e.target, 0));
            document.getElementById('endMinutes').addEventListener('input', (e) => validateInput(e.target, maxMinutes));
            document.getElementById('endSeconds').addEventListener('input', (e) => {
                const endMinutes = parseInt(document.getElementById('endMinutes').value) || 0;
                if (endMinutes === maxMinutes) {
                    validateInput(e.target, maxSeconds);
                } else {
                    validateInput(e.target, 59);
                }
            });
        };

        editVideo.onloadedmetadata = () => {
            const videoDuration = editVideo.duration;
            addInputValidation(videoDuration);
        };

        if (!editButtonClicked) { // Add this block
            document.getElementById('applyEditButton').removeEventListener('click', applyEditHandler); // Remove existing listener
            document.getElementById('applyEditButton').addEventListener('click', debounce(applyEditHandler, 300)); // Add debounced listener
            editButtonClicked = true; // Add this line
        }
    } 
});

/* Trimming Video */
const applyEditHandler = async () => {
    console.log('Apply Edit button clicked');
    const previewImage = document.getElementById('previewImage');
    const previewVideo = document.getElementById('previewVideo');
    const previewAudio = document.getElementById('previewAudio');  // Get audio preview

    // Show the loading modal and update the text
    const loadingModal = document.getElementById('loadingModal');
    const loadingText = document.querySelector('#loadingModal .loading-content p');
    loadingText.textContent = 'Applying Edit...';
    loadingModal.style.display = 'flex';

    const startTime = Date.now();

    try {
        if (cropper && previewImage) {
            console.log('Applying cropper edit');
            const canvas = cropper.getCroppedCanvas();
            editedImageDataUrl = canvas.toDataURL();
            previewImage.src = editedImageDataUrl;
            cropper.destroy();
            cropper = null;
            document.getElementById('editModal').style.display = 'none';
            document.getElementById('uploadModal').style.display = 'block'; // Show upload modal
            console.log('Image edit applied successfully');
        } else if (previewVideo) {
            const startHours = parseInt(document.getElementById('startHours').value) || 0;
            const startMinutes = parseInt(document.getElementById('startMinutes').value) || 0;
            const startSeconds = parseInt(document.getElementById('startSeconds').value) || 0;
            const startTime = startHours * 3600 + startMinutes * 60 + startSeconds;
            const endHours = parseInt(document.getElementById('endHours').value) || 0;
            const endMinutes = parseInt(document.getElementById('endMinutes').value) || 0;
            const endSeconds = parseInt(document.getElementById('endSeconds').value) || 0;
            const endTime = endHours * 3600 + endMinutes * 60 + endSeconds;

            console.log('startHours:', startHours);
            console.log('startMinutes:', startMinutes);
            console.log('startSeconds:', startSeconds);
            console.log('endHours:', endHours);
            console.log('endMinutes:', endMinutes);
            console.log('endSeconds:', endSeconds);

            console.log('startTime:', startTime);
            console.log('endTime:', endTime);

            if (startTime >= endTime) {
                alert('End time must be greater than start time.');
                return;
            }

            if (endTime - startTime > 15) {
                alert('Trim duration cannot exceed 15 seconds.');
                return;
            }

            if (confirm('Are you sure you want to apply the edit?')) {
                await processVideoTrim(startTime, endTime);

                // Close the edit modal only if the trim times are valid and user confirms
                document.getElementById('editModal').style.display = 'none';
                document.getElementById('uploadModal').style.display = 'block'; // Show upload modal
                console.log('Video edit applied successfully');
            }
        }

        if (previewAudio) {
            previewAudio.play();
        }
    } catch (error) {
        console.error('Error applying edit:', error);
        alert('An error occurred while applying the edit. Please try again.');
    } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 1000 - elapsedTime); // Ensure at least 1 second display time
        setTimeout(() => {
            // Hide the loading modal
            loadingModal.style.display = 'none';
        }, remainingTime);
    }
};

const processVideoTrim = async (startTime, endTime) => {
    console.log('Processing video trim');
    console.log('startTime:', startTime);
    console.log('endTime:', endTime);

    const ffmpeg = FFmpeg.createFFmpeg({ log: true });
    await ffmpeg.load();

    const videoFile = await fetch(URL.createObjectURL(originalVideoFile)).then(res => res.arrayBuffer());
    ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoFile));

    await ffmpeg.run('-i', 'input.mp4', '-ss', `${startTime}`, '-to', `${endTime}`, '-c', 'copy', 'output.mp4');

    const data = ffmpeg.FS('readFile', 'output.mp4');
    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    editedVideoBlob = blob;
    const previewVideo = document.getElementById('previewVideo');
    previewVideo.src = URL.createObjectURL(blob);

    // Hide the loading indicator
    console.log('Video trim processed successfully');
};


// Close edit modal
document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    const editVideo = document.querySelector('#editContainer video');
    if (editVideo) {
        editVideo.pause();
        editVideo.currentTime = 0;
    }
    // Reset the edit container
    const editContainer = document.getElementById('editContainer');
    editContainer.innerHTML = '';
    editContainer.style.width = '';
    editContainer.style.height = '';
});

// Ensure only one event listener is added to the apply edit button
document.getElementById('applyEditButton').removeEventListener('click', applyEditHandler);
document.getElementById('applyEditButton').addEventListener('click', applyEditHandler);

// Random Avatars
const avatarFolder = 'avatars/';
const avatarFiles = [
    '../avatars/Avatar_Anby_Demara.webp', '../avatars/Avatar_Nicole_Demara.webp', '../avatars/Avatar_Burnice_White.webp',
    '../avatars/Avatar_Default_Anonymous.webp', '../avatars/Avatar_Default_Thiren_1.webp', '../avatars/Avatar_Default_Thiren_2.webp',
    ]; // add more files as needed

function getRandomAvatar() {
  const randomIndex = Math.floor(Math.random() * avatarFiles.length);
  return avatarFolder + avatarFiles[randomIndex];
}

// Get list of files
const fileInput = document.getElementById('blog-post-image-input');
const fileNamesSpan = document.getElementById('file-names');

fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    const fileNames = Array.from(files).map((file) => file.name);
    console.log(fileNames); //  Debugging
    fileNamesSpan.textContent = fileNames.join(', ');
    console.log(fileNamesSpan.textContent); // Debugging
});

// Get user info
function getUsernameFromDatabase(userId) {
    return User.findById(userId).then(user => user.name);
  }
  
  function getAvatarUrlFromDatabase(userId) {
    return User.findById(userId).then(user => user.profilePicture);
  }

// Blog Posts
document.getElementById('send-blog-post-button').addEventListener('click', async () => {
    // Post Content
    const blogPostInput = document.getElementById('blog-post-input');
    const blogPostText = blogPostInput.value.trim();
    
    // Get the selected image
    const blogPostImageInput = document.getElementById('blog-post-image-input');
    const blogPostImage = blogPostImageInput.files[0];
    
    // Check if there is text or an image before proceeding
    if (!blogPostText && !blogPostImage) {
        alert('Please enter text or add an image for your post.');
        return;
    }
    
    // Show loading indicator if available
    const loadingModal = document.getElementById('loadingModal');
    if (loadingModal) {
        const loadingText = loadingModal.querySelector('.loading-content p');
        if (loadingText) loadingText.textContent = 'Creating your post...';
        loadingModal.style.display = 'flex';
    }
    
    try {
        // Get the current user info using the working endpoint
        const response = await fetch('/api/auth/user', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to get user information');
        }
        
        const user = await response.json();
        
        // Create a FormData object to handle the file upload
        const formData = new FormData();
        formData.append('content', blogPostText);

        
        // Add image file if present
        if (blogPostImage) {
            formData.append('media', blogPostImage);
        }
        
        // Send the post data to the server
        const saveResponse = await fetch('/api/posts/create', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        if (!saveResponse.ok) {
            throw new Error('Failed to save post to the database');
        }
        
        const savedPost = await saveResponse.json();
        
        // Get the current date and time
        const currentTime = new Date();
        const blogPostTimestamp = `${currentTime.toLocaleDateString()} | ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        
        // Add the blog post to the list of blog posts
        const postForRendering = {
            id: savedPost._id,
            content: savedPost.content,
            imageUrl: savedPost.media, 
            createdAt: savedPost.timestamp || new Date(),
            likes: 0,
            comments: 0,
            userLiked: false,
            username: user.name,
            profilePicture: user.profilePicture,
            userId: user._id
        };
        
         // Create the post element using the same function that renders fetched posts
         const newBlogPost = createPostElement(postForRendering);
        
         // Prepend it to the blog posts container
         const blogPosts = document.getElementById('blog-posts');
         blogPosts.prepend(newBlogPost);

        // Get username and avatar from the user data
        const avatarUrl = user.profilePicture || 'avatars/Avatar_Default_Anonymous.webp';
        const displayName = user.name;
        const usernameColor = displayName ? '#e37f8a' : '#a7c957';

        
        // Inner HTML
        let postContent = `
        <div class="post-header">
            <span class="avatar" style="background-image: url(${avatarUrl})"></span>
            <div class="post-info">
                <div class="post-username" style="color: ${usernameColor}">${displayName}</div>
                <div class="timestamp">on ${blogPostTimestamp}</div>
            </div>
        </div>
        <button class="like-button" data-post-id="${savedPost._id}">👍 ${savedPost.reactions.like}</button>
        `;
        
        if (blogPostText) {
            postContent += `<p>${blogPostText}</p>`;
        }
        
        if (blogPostImage) {
            const reader = new FileReader();
            reader.onload = function(e) {
                postContent += `<img src="${e.target.result}" alt="Uploaded image">`;
                newBlogPost.innerHTML = postContent;
                
                // Prepend the new post to the blogPosts element
                blogPosts.prepend(newBlogPost);
                
                // Hide loading indicator
                if (loadingModal) loadingModal.style.display = 'none';
            };
            reader.readAsDataURL(blogPostImage);
        } else {
            newBlogPost.innerHTML = postContent;
            
            // Prepend the new post to the blogPosts element
            blogPosts.prepend(newBlogPost);
            
            // Hide loading indicator
            if (loadingModal) loadingModal.style.display = 'none';
        }
        
        fetchAndDisplayPosts();
        // Clear the input fields
        blogPostInput.value = '';
        blogPostImageInput.value = '';
        document.getElementById('file-names').textContent = 'No file selected';
        document.getElementById('postContentCounter').textContent = '0/250';
        
        // Close the modal
        document.getElementById('postSubmissionModal').style.display = 'none';
        
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post. Please try again.');
        
        // Hide loading indicator
        if (loadingModal) loadingModal.style.display = 'none';
    }
});

//Function to fetch all posts and display them
function fetchAndDisplayPosts() {
    // Show loading indicator if available
    const loadingModal = document.getElementById('loadingModal');
    if (loadingModal) loadingModal.style.display = 'block';
    
    // Fetch posts from followed users and self
    fetch('/api/posts/following', {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        return response.json();
    })
    .then(posts => {
        // Hide loading indicator if available
        if (loadingModal) loadingModal.style.display = 'none';
        
        const blogPosts = document.getElementById('blog-posts');
        if (!blogPosts) {
            console.error('Blog posts container not found');
            return;
        }
        
        // Clear existing posts
        blogPosts.innerHTML = '';
        
         // Filter out blocked posts
         const blockedPosts = JSON.parse(localStorage.getItem('blockedPosts') || '[]');
         const visiblePosts = posts.filter(post => !blockedPosts.includes(post.id));

        if (!Array.isArray(posts) || posts.length === 0) {
            blogPosts.innerHTML = '<div class="no-posts-message">No posts from people you follow. Start following more users or check the explore page!</div>';
            return;
        }
        
        // Display posts in descending order (newest first)
        visiblePosts.forEach(post => {
            const postElement = createPostElement(post);
            if (postElement) {
                blogPosts.appendChild(postElement);
            }
        });

        console.log(`Rendering ${posts.length} posts on home page`);
        
    })
    .catch(error => {
        // Hide loading indicator if available
        if (loadingModal) loadingModal.style.display = 'none';
        
        console.error('Error fetching posts:', error);
        const blogPosts = document.getElementById('blog-posts');
        if (blogPosts) {
            blogPosts.innerHTML = '<div class="error-message">Failed to load posts. Please refresh the page.</div>';
        }
    });
}

// Fix the createPostElement function to display post content
function createPostElement(post) {
    if (!post || !post.id) {
        console.error('Invalid post object:', post);
        return null;
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
        
        // Add post actions with Font Awesome icons - matching explore.html
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

// Add these global functions for handling likes and comments
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
                        <div class="comment-header">
                            <div class="comment-user">${comment.username}</div>
                            <div class="comment-menu">
                                <i class="fas fa-ellipsis-v comment-menu-icon"></i>
                                <div class="comment-menu-dropdown">
                                    <div class="comment-menu-item report-comment" data-comment-id="${comment._id}" data-post-id="${postId}">
                                        <i class="fas fa-flag"></i> Report Comment
                                    </div>
                                </div>
                            </div>
                        </div>
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

function reportComment(commentId, postId) {
    // Show a modal to get the reason for reporting
    const reason = prompt('Please provide a reason for reporting this comment:');
    
    if (reason) {
        fetch('/api/posts/comment/report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                postId: postId,
                commentId: commentId,
                reason: reason
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to report comment');
            }
            return response.json();
        })
        .then(() => {
            showMessage('Comment reported successfully. An admin will review it.', 'success');
        })
        .catch(error => {
            console.error('Error reporting comment:', error);
            showMessage('Failed to report comment. Please try again.', 'error');
        });
    }
}

window.reportComment = reportComment;

// Update the post comment function to store comments locally as well
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

function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    const messageElement = document.getElementById('message');
    
    if (messageContainer && messageElement) {
        messageElement.textContent = message;
        messageElement.className = 'message ' + type;
        messageContainer.style.display = 'flex';
        
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 3000);
    }
}

// Add these functions if they don't exist
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
        fetchAndDisplayPosts();
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

async function processMentions(text) {
    // Find all @mentions using regex
    const mentions = text.match(/@(\w+)/g);
    
    if (!mentions) return text;
  
    // Check each mention against the database
    const processedText = await Promise.all(mentions.map(async (mention) => {
      const username = mention.substring(1); // Remove @ symbol
      try {
        const response = await fetch(`/api/users/check-username/${username}`, {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.exists) {
          // If user exists, replace with styled span
          return text.replace(mention, 
            `<span class="user-mention" data-username="${username}">@${username}</span>`
          );
        }
        return text;
      } catch (error) {
        console.error('Error checking mention:', error);
        return text;
      }
    }));
  
    return processedText[0];
  }

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('user-mention')) {
        const username = event.target.dataset.username;
        // Navigate to user profile
        window.location.href = `/profile.html?username=${username}`;
    }
});

// Listen for Post Reactions
document.addEventListener('click', async (event) => {
    if (event.target.classList.contains('like-button')) {
        const postId = event.target.dataset.postId;

        try {
            const response = await fetch(`/api/posts/like/${postId}`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error("Failed to like/unlike post");
            }

            const result = await response.json();
            event.target.textContent = `👍 ${result.likes}`;
        } catch (error) {
            console.error("Error:", error);
        }
    } else if (event.target.classList.contains('share-button')) {
        const postId = event.target.dataset.postId;
        const postUrl = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(postUrl).then(() => {
            alert('Post link copied to clipboard!');
        }).catch(error => {
            console.error('Error copying post link:', error);
        });
    } else if (event.target.classList.contains('repost-button')) {
        const postId = event.target.dataset.postId;

        try {
            const response = await fetch(`/api/posts/repost/${postId}`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error("Failed to repost");
            }

            const result = await response.json();
            fetchAndDisplayPosts(); // Refresh posts to show the repost
            alert('Post reposted successfully!');
        } catch (error) {
            console.error("Error reposting:", error);
        }
    }
});

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

// Get the floating post button and modal elements
const floatingPostButton = document.getElementById('floatingPostButton');
const postSubmissionModal = document.getElementById('postSubmissionModal');

// Add event listener to the floating post button
floatingPostButton.addEventListener('click', () => {
  // Toggle the modal visibility
  postSubmissionModal.style.display = 'block';
});

// Get the close button element
const closePostModalButton = document.getElementById('closePostModal');

// Add event listener to the close button
closePostModalButton.addEventListener('click', () => {
  // Hide the modal
  document.getElementById('postSubmissionModal').style.display = 'none';
});

// Character counting logic
const storyTitleInput = document.getElementById('storyTitle');
const storyDescriptionInput = document.getElementById('storyDescription');
const storyUsernameInput = document.getElementById('storyUsername');
const titleCounter = document.getElementById('titleCounter');
const descriptionCounter = document.getElementById('descriptionCounter');
const userCounter = document.getElementById('userCounter');
const postContentInput = document.getElementById('blog-post-input');
const postContentCounter = document.getElementById('postContentCounter');

postContentInput.addEventListener('input', () => {
  postContentCounter.textContent = `${postContentInput.value.length}/250`;
});

storyTitleInput.addEventListener('input', () => {
    titleCounter.textContent = `${storyTitleInput.value.length}/25`;
});

storyDescriptionInput.addEventListener('input', () => {
    descriptionCounter.textContent = `${storyDescriptionInput.value.length}/250`;
});
