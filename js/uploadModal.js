import { addStories} from './Main.js';

/*variables*/
export let cropper;
export let editedImageDataUrl = null;
export let editedVideoBlob = null;
/*Modal For Uploading*/
export function openUploadModal(){
    document.getElementById('uploadModal').style.display = 'block';
    clearPreview();
}

window.openUploadModal = openUploadModal;

document.getElementById('closeUploadModal').addEventListener('click', () => {
    document.getElementById('uploadModal').style.display = 'none';
    editedImageDataUrl = null;
    clearPreview(); // Clear preview when closing the modal
    document.getElementById('mediaInput').value = ''; // Clear the file input
    document.getElementById('storyTitle').value = ''; // Clear the title input
    document.getElementById('storyDescription').value = ''; // Clear the description input
    document.getElementById('storyUsername').value = ''; // Clear the username input
    document.getElementById('audioInput').value = ''; // Clear the audio input
});

window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('uploadModal')) {
        document.getElementById('uploadModal').style.display = 'none';
        clearPreview();
    }
});

document.getElementById('postButton').addEventListener('click', () => {
    const mediaInput = document.getElementById('mediaInput');
    const storyTitleInput = document.getElementById('storyTitle');
    const storyUsernameInput = document.getElementById('storyUsername');

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
        addStories();
        console.log('Story added');
        document.getElementById('uploadModal').style.display = 'none';
        clearPreview(); // Clear preview after posting
    }
});

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
        } else if (file.type.startsWith('video/')) {
            previewElement = document.createElement('video');
            previewElement.src = url;
            previewElement.controls = true;
            previewElement.id = 'previewVideo';
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

    previewContainer.innerHTML = ''; // Clear previous previews
    
    const files = audioInput.files;
    if (files.length > 0) {
        const file = files[0];
        const url = URL.createObjectURL(file);
        
        const audioPreview = document.createElement('audio');
        audioPreview.src = url;
        audioPreview.controls = true;
        audioPreview.id = 'previewAudio';
        
        previewContainer.appendChild(audioPreview);
    }
});

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

// Edit functionality
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
        editImage.src = previewImage.src;
        editContainer.appendChild(editImage);
        cropper = new Cropper(editImage, {
            aspectRatio: 9/16,
            viewMode: 1
        });
    } else if (previewVideo) {
        document.getElementById('editModal').style.display = 'block';
        editModalTitle.textContent = 'Edit Video';
        rotateButtons.style.display = 'none'; // Hide rotate buttons for video
        const editVideo = document.createElement('video');
        editVideo.src = previewVideo.src;
        editVideo.controls = true;
        editContainer.appendChild(editVideo);

        // Add video clipping controls
        const startInput = document.createElement('input');
        startInput.type = 'number';
        startInput.id = 'startInput';
        startInput.placeholder = 'Start time (seconds)';
        startInput.min = 0;
        editContainer.appendChild(startInput);

        const endInput = document.createElement('input');
        endInput.type = 'number';
        endInput.id = 'endInput';
        endInput.placeholder = 'End time (seconds)';
        endInput.min = 0;
        editContainer.appendChild(endInput);

        startInput.addEventListener('input', () => {
            const maxEndTime = parseFloat(startInput.value) + 15;
            endInput.max = maxEndTime;
            if (parseFloat(endInput.value) > maxEndTime) {
                endInput.value = maxEndTime;
            }
        });

        endInput.addEventListener('input', () => {
            const maxEndTime = parseFloat(startInput.value) + 15;
            if (parseFloat(endInput.value) > maxEndTime) {
                endInput.value = maxEndTime;
            }
        });
    } 
});

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
});

document.getElementById('applyEditButton').addEventListener('click', async () => {
    console.log('Apply Edit button clicked');
    const previewImage = document.getElementById('previewImage');
    const previewVideo = document.getElementById('previewVideo');
    const previewAudio = document.getElementById('previewAudio');  // Get audio preview
    const loadingIndicator = document.getElementById('loadingIndicator');
        
    // Close the edit modal
    document.getElementById('editModal').style.display = 'none';
        
    if (cropper) {
        console.log('Applying cropper edit');
        const canvas = cropper.getCroppedCanvas();
        editedImageDataUrl = canvas.toDataURL();
        previewImage.src = editedImageDataUrl;
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('uploadModal').style.display = 'block'; // Show upload modal
        cropper.destroy();
        cropper = null;
    } else if (previewVideo) {
        const startInput = document.getElementById('startInput');
        const endInput = document.getElementById('endInput');
        const startTime = parseFloat(startInput.value) || 0;
        const endTime = Math.min(parseFloat(endInput.value) || 15, 15);

        if (startTime >= endTime) {
            alert('End time must be greater than start time.');
            return;
        }

        const ffmpeg = FFmpeg.createFFmpeg({ log: true });
        await ffmpeg.load();

        const videoFile = await fetch(previewVideo.src).then(res => res.arrayBuffer());
        ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoFile));

        await ffmpeg.run('-i', 'input.mp4', '-ss', `${startTime}`, '-to', `${endTime}`, '-c', 'copy', 'output.mp4');

        const data = ffmpeg.FS('readFile', 'output.mp4');
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        editedVideoBlob = blob;
        previewVideo.src = URL.createObjectURL(blob);
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('uploadModal').style.display = 'block'; // Show upload modal
    }

    if (previewAudio) {
        previewAudio.play();
    }
});

// Blog Posts
document.getElementById('send-blog-post-button').addEventListener('click', () => {
    const blogPostInput = document.getElementById('blog-post-input');
    const blogPostText = blogPostInput.value.trim();
    const blogPostUsernameInput = document.getElementById('blog-post-username-input');
    let blogPostUsername = blogPostUsernameInput.value.trim();
  
    if (!blogPostUsername) {
      // Generate a random username if the user didn't enter one
      const randomNumbers = Array(4).fill(0).map(() => Math.floor(Math.random() * 10));
      blogPostUsername = `Anon #${randomNumbers.join('')}`;
    }
  
    if (blogPostText) {
      // Get the current date and time
      const currentTime = new Date();
      const blogPostTimestamp = `${currentTime.toLocaleDateString()} ${currentTime.toLocaleTimeString()}`;
  
      // Add the blog post to the list of blog posts
      const blogPosts = document.getElementById('blog-posts');
      const newBlogPost = document.createElement('div');
      newBlogPost.classList.add('blog-post');
      newBlogPost.innerHTML = `
        <h3>${blogPostUsername}</h3>
        <p>${blogPostText}</p>
        <small>Posted on ${blogPostTimestamp}</small>
      `;
      blogPosts.appendChild(newBlogPost);
  
      // Clear the input fields
      blogPostInput.value = '';
      blogPostUsernameInput.value = '';
    }
  });


// Character counting logic
const storyTitleInput = document.getElementById('storyTitle');
const storyDescriptionInput = document.getElementById('storyDescription');
const storyUsernameInput = document.getElementById('storyUsername');
const titleCounter = document.getElementById('titleCounter');
const descriptionCounter = document.getElementById('descriptionCounter');
const userCounter = document.getElementById('userCounter');

storyTitleInput.addEventListener('input', () => {
    titleCounter.textContent = `${storyTitleInput.value.length}/25`;
});

storyDescriptionInput.addEventListener('input', () => {
    descriptionCounter.textContent = `${storyDescriptionInput.value.length}/250`;
});

storyUsernameInput.addEventListener('input', () => {
    userCounter.textContent = `${storyUsernameInput.value.length}/15`;
});