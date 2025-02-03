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

        // Store the audio file
        editedAudioBlob = file;
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
        editImage.src = URL.createObjectURL(originalImageFile); // Use the original image file
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
        editVideo.src = URL.createObjectURL(originalVideoFile); // Use the original video file
        editVideo.controls = true;
        editContainer.appendChild(editVideo);

        // Add video clipping controls
        const startInputContainer = document.createElement('div');
        startInputContainer.innerHTML = `
            <label for="startHours">Start Time:</label>
            <input type="number" id="startHours" placeholder="HH" min="0" value="0">
            <label for="startMinutes">:</label>
            <input type="number" id="startMinutes" placeholder="MM" min="0" max="59" value="0">
            <label for="startSeconds">:</label>
            <input type="number" id="startSeconds" placeholder="SS" min="0" max="59" value="0">
        `;
        editContainer.appendChild(startInputContainer);

        const endInputContainer = document.createElement('div');
        endInputContainer.innerHTML = `
            <label for="endHours">End Time:</label>
            <input type="number" id="endHours" placeholder="HH" min="0" value="0">
            <label for="endMinutes">:</label>
            <input type="number" id="endMinutes" placeholder="MM" min="0" max="59" value="0">
            <label for="endSeconds">:</label>
            <input type="number" id="endSeconds" placeholder="SS" min="0" max="59" value="0">
        `;
        editContainer.appendChild(endInputContainer);

        const validateTrimTimes = () => {
            const startHours = parseInt(document.getElementById('startHours').value) || 0;
            const startMinutes = parseInt(document.getElementById('startMinutes').value) || 0;
            const startSeconds = parseInt(document.getElementById('startSeconds').value) || 0;
            const endHours = parseInt(document.getElementById('endHours').value) || 0;
            const endMinutes = parseInt(document.getElementById('endMinutes').value) || 0;
            const endSeconds = parseInt(document.getElementById('endSeconds').value) || 0;

            const startTime = startHours * 3600 + startMinutes * 60 + startSeconds;
            const endTime = endHours * 3600 + endMinutes * 60 + endSeconds;

            if (endTime - startTime > 15) {
                alert('Trim duration cannot exceed 15 seconds.');
                return false;
            }

            return { startTime, endTime };
        };

        document.getElementById('applyEditButton').addEventListener('click', async () => {
            const trimTimes = validateTrimTimes();
            if (!trimTimes) return;

            const { startTime, endTime } = trimTimes;

            const ffmpeg = FFmpeg.createFFmpeg({ log: true });
            await ffmpeg.load();

            const videoFile = await fetch(URL.createObjectURL(originalVideoFile)).then(res => res.arrayBuffer());
            ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoFile));

            await ffmpeg.run('-i', 'input.mp4', '-ss', `${startTime}`, '-to', `${endTime}`, '-c', 'copy', 'output.mp4');

            const data = ffmpeg.FS('readFile', 'output.mp4');
            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            editedVideoBlob = blob;
            previewVideo.src = URL.createObjectURL(blob);
            document.getElementById('editModal').style.display = 'none';
            document.getElementById('uploadModal').style.display = 'block'; // Show upload modal
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
            return;
        }

        if (endTime - startTime > 15) {
            alert('Trim duration cannot exceed 15 seconds.');
            return;
        }

        const ffmpeg = FFmpeg.createFFmpeg({ log: true });
        await ffmpeg.load();

        const videoFile = await fetch(URL.createObjectURL(originalVideoFile)).then(res => res.arrayBuffer());
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