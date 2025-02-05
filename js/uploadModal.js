import { addStories } from './Main.js';

/*variables*/
export let cropper;
export let editedImageDataUrl = null;
export let editedVideoBlob = null;
export let editedAudioBlob = null;
export let originalImageFile = null; // Add this line
export let originalVideoFile = null; // Add this line

/*Modal For Uploading*/
export function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
    clearPreview();
}

window.openUploadModal = openUploadModal;

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
    document.getElementById('storyUsername').value = ''; // Clear the username input
    document.getElementById('audioInput').value = ''; // Clear the audio input
    document.getElementById('audioPreviewContainer').innerHTML = ''; // Clear the audio preview container
    document.getElementById('audioStartMinutes').value = '0'; // Clear the audio start minutes input
    document.getElementById('audioStartSeconds').value = '0'; // Clear the audio start seconds input
    editedAudioBlob = null;
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
    const storyUsernameInput = document.getElementById('storyUsername');
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

    if (!storyUsernameInput.value.trim()) {
        alert('Please enter your username.');
        return;
    }

    console.log('All inputs validated, calling addStories...');
    if (confirm('Are you sure you want to post this story?')) {
        // Show the loading modal
        const loadingModal = document.getElementById('loadingModal');
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

    const videoData = await fetch(URL.createObjectURL(videoFile)).then(res => res.arrayBuffer());
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
    previewContainer.innerHTML = ''; // Clear previous previews

    Array.from(files).forEach(file => {
        const url = URL.createObjectURL(file);
        let previewElement;

        if (file.type.startsWith('image/')) {
            previewElement = document.createElement('img');
            previewElement.src = url;
            previewElement.id = 'previewImage';
            originalImageFile = file; // Store the original image file
        } else if (file.type.startsWith('video/')) {
            previewElement = document.createElement('video');
            previewElement.src = url;
            previewElement.controls = true;
            previewElement.id = 'previewVideo';
            originalVideoFile = file; // Store the original video file
        } else {
            alert('Unsupported file type.');
            return;
        }

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
    }
}

export function rotateRight() {
    if (cropper) {
        cropper.rotate(90);
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
        rotateButtons.style.display = 'block';
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

// Blog Posts
document.getElementById('send-blog-post-button').addEventListener('click', () => {
    // Post Content
    const blogPostInput = document.getElementById('blog-post-input');
    const blogPostText = blogPostInput.value.trim();
    const blogPostUsernameInput = document.getElementById('blog-post-username-input');
    //const blogPostTitleInput = document.getElementById('blog-post-title-input');
    let blogPostUsername = blogPostUsernameInput.value.trim();
    //const blogPostTitle = blogPostTitleInput.value.trim();
   
    // Get the selected image
    const blogPostImageInput = document.getElementById('blog-post-image-input');
    const blogPostImage = blogPostImageInput.files[0];
    
    // Generate a random username
    if (!blogPostUsername) {
      // Generate a random username if the user didn't enter one
      const randomNumbers = Array(4).fill(0).map(() => Math.floor(Math.random() * 10));
      blogPostUsername = `Anon #${randomNumbers.join('')}`;
    }
    
    // Check if there is text or an image
    if (blogPostText || blogPostImage) { // && blogPostTitle
      // Get the current date and time
      const currentTime = new Date();
      const blogPostTimestamp = `${currentTime.toLocaleDateString()} | ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
      // Add the blog post to the list of blog posts
      const blogPosts = document.getElementById('blog-posts');
      const newBlogPost = document.createElement('div');
      newBlogPost.classList.add('blog-post');
      // Inner HTML
      let postContent = `
      <div class="post-header">
        <span class="avatar"></span>
        <div class="post-info">
            <div class="username" style="${blogPostUsernameInput.value.trim() === '' ? 'color: #e37f8a' : 'color: #a7c957'}">${blogPostUsername}</div>
            <div class="timestamp">on ${blogPostTimestamp}</div>
        </div>
      </div>
    `;

      if (blogPostText) {
        postContent += `<p>${blogPostText}</p>`;
      }
  
      if (blogPostImage) {
        const reader = new FileReader();
        reader.onload = () => {
          postContent += `<img src="${reader.result}" alt="Uploaded image">`;
          newBlogPost.innerHTML = postContent;
      
          // Prepend the new post to the blogPosts element
          blogPosts.prepend(newBlogPost);
      
          // Create a new avatarElement for this post
          const postAvatarElement = newBlogPost.querySelector('.avatar');
          postAvatarElement.style.backgroundImage = `url(${getRandomAvatar()})`;
        };
        reader.readAsDataURL(blogPostImage);
      } else {
        newBlogPost.innerHTML = postContent;
      
        // Prepend the new post to the blogPosts element
        blogPosts.prepend(newBlogPost);
      
        // Create a new avatarElement for this post
        const postAvatarElement = newBlogPost.querySelector('.avatar');
        postAvatarElement.style.backgroundImage = `url(${getRandomAvatar()})`;
      }

      // LINE  484: <h3>${blogPostTitle}</h3>
  
      // Clear the input fields
      blogPostInput.value = '';
      blogPostUsernameInput.value = '';
      //blogPostTitleInput.value = '';
      blogPostImageInput.value = '';
      document.getElementById('file-names').innerHTML = '';
      document.getElementById('postContentCounter').innerHTML = '0/250';
    }
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

storyUsernameInput.addEventListener('input', () => {
    userCounter.textContent = `${storyUsernameInput.value.length}/15`;
});