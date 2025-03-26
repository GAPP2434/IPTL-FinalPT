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
    
    // Add a section heading to clearly label the posts area
    const blogContainer = document.querySelector('.blog-container');
    const postsHeading = document.createElement('h2');
    postsHeading.textContent = 'Hunter Posts';
    postsHeading.classList.add('section-heading');
    blogContainer.insertBefore(postsHeading, blogContainer.firstChild);

    // Add event listener for the upload button
    document.getElementById('addButton').addEventListener('click', openUploadModal);
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
        
        // Get optional username if provided, otherwise use the user's name
        const blogPostUsername = document.getElementById('blog-post-username-input').value.trim();
        if (blogPostUsername) {
            formData.append('displayName', blogPostUsername);
        }
        
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
        const blogPosts = document.getElementById('blog-posts');
        const newBlogPost = document.createElement('div');
        newBlogPost.classList.add('blog-post');
        newBlogPost.dataset.postId = savedPost._id; // Add the post ID as a data attribute
        
        // Get username and avatar from the user data
        const avatarUrl = user.profilePicture || 'avatars/Avatar_Default_Anonymous.webp';
        const displayName = blogPostUsername || user.name;
        const usernameColor = blogPostUsername ? '#e37f8a' : '#a7c957';

        
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
        
        // Clear the input fields
        blogPostInput.value = '';
        blogPostImageInput.value = '';
        document.getElementById('file-names').textContent = 'No file selected';
        document.getElementById('postContentCounter').textContent = '0/250';
        document.getElementById('blog-post-username-input').value = '';
        
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
    fetch('/api/posts', {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        return response.json();
    })
    .then(posts => {
        const blogPosts = document.getElementById('blog-posts');
        
        // Clear existing posts
        blogPosts.innerHTML = '';
        
        if (posts.length === 0) {
            blogPosts.innerHTML = '<div class="no-posts-message">No posts yet. Be the first to share!</div>';
            return;
        }
        
        // Display posts in descending order (newest first)
        posts.forEach(post => {
            const postElement = createPostElement(post);
            blogPosts.appendChild(postElement);
        });
    })
    .catch(error => {
        console.error('Error fetching posts:', error);
        document.getElementById('blog-posts').innerHTML = 
            '<div class="error-message">Failed to load posts. Please refresh the page.</div>';
    });
}

// Function to create a post element
function createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.classList.add('blog-post');
    postElement.dataset.postId = post._id;

    let userName, userAvatar, usernameColor, postDate, formattedDate;

    if (post.isRepost && post.originalPostId) {
        // Use original post's user information for reposts
        userName = post.originalPostId.userId.name || 'Anonymous';
        userAvatar = post.originalPostId.userId.profilePicture || 'avatars/Avatar_Default_Anonymous.webp';
        usernameColor = '#a7c957';
        postDate = new Date(post.originalPostId.timestamp);
    } else {
        // Use current post's user information
        userName = post.displayName || (post.userId ? post.userId.name : 'Anonymous');
        userAvatar = post.userId && post.userId.profilePicture ? post.userId.profilePicture : 'avatars/Avatar_Default_Anonymous.webp';
        usernameColor = post.displayName ? '#e37f8a' : '#a7c957';
        postDate = new Date(post.timestamp);
    }

    formattedDate = `${postDate.toLocaleDateString()} | ${postDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let repostInfo = '';
    if (post.isRepost && post.repostedBy) {
        const reposterName = post.repostedBy.name || 'Anonymous';
        repostInfo = `<div class="repost-info">Reposted by ${reposterName}</div>`;
    }

    postElement.innerHTML = `
        ${repostInfo}
        <div class="post-header">
            <span class="avatar" style="background-image: url(${userAvatar})"></span>
            <div class="post-info">
                <div class="username" style="color: ${usernameColor}">${userName}</div>
                <div class="timestamp">on ${formattedDate}</div>
            </div>
        </div>
        <div class="post-content">
            ${post.content ? `<p>${post.content}</p>` : ''}
            ${post.media ? `<img src="${post.media}" alt="Post image">` : ''}
        </div>
        <div class="post-footer">
            <button class="like-button" data-post-id="${post._id}">👍 ${post.reactions ? post.reactions.like : 0}</button>
            <button class="share-button" data-post-id="${post._id}">🔗 Share</button>
            <button class="repost-button" data-post-id="${post._id}">🔁 Repost</button>
         </div>
        <div class="comment-section">
            <div class="comment-input">
                <input type="text" class="comment-input-field" placeholder="Add a comment..." data-post-id="${post._id}">
                <button class="send-comment-button" data-post-id="${post._id}">Send</button>
            </div>
            <div class="comment-list" id="commentList-${post._id}">
                ${(Array.isArray(post.comments) ? post.comments : []).map(comment => `
                    <div class="comment">
                        <span class="username">${comment.username}:</span> ${comment.comment}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    return postElement;
}

// Listen for comment submissions
document.addEventListener('click', async (event) => {
    if (event.target.classList.contains('send-comment-button')) {
        const postId = event.target.dataset.postId;
        const commentInput = document.querySelector(`.comment-input-field[data-post-id="${postId}"]`);
        const commentText = commentInput.value.trim();

        if (!commentText) {
            alert('Please enter a comment.');
            return;
        }

        try {
            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment: commentText })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add comment');
            }

            const newComment = await response.json();
            const commentList = document.getElementById(`commentList-${postId}`);
            const commentElement = document.createElement('div');
            commentElement.classList.add('comment');
            commentElement.innerHTML = `<span class="username">${newComment.username}:</span> ${newComment.comment}`;
            commentList.appendChild(commentElement);

            // Clear the input field
            commentInput.value = '';
        } catch (error) {
            console.error('Error adding comment:', error);
            alert(`Failed to add comment: ${error.message}`);
        }
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
