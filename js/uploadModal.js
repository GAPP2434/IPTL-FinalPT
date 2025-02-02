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
});

window.addEventListener('click', (event) => {
    if (event.target === document.getElementById('uploadModal')) {
        document.getElementById('uploadModal').style.display = 'none';
        clearPreview();
    }
});

document.getElementById('postButton').addEventListener('click', () => {
    if (confirm('Are you sure you want to post this story?')) {
        addStories();
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
            aspectRatio: 1,
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

document.getElementById('applyEditButton').addEventListener('click', () => {
    console.log('Apply Edit button clicked');
    const previewImage = document.getElementById('previewImage');
    const previewVideo = document.getElementById('previewVideo');
    const loadingIndicator = document.getElementById('loadingIndicator');

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

        const video = document.createElement('video');
        video.src = previewVideo.src;
        video.currentTime = startTime;

        video.onloadedmetadata = () => {
            const duration = endTime - startTime;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const chunks = [];
            const stream = canvas.captureStream();
            const recorder = new MediaRecorder(stream);

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                editedVideoBlob = blob;
                previewVideo.src = URL.createObjectURL(blob);
                document.getElementById('editModal').style.display = 'none';
                document.getElementById('uploadModal').style.display = 'block'; // Show upload modal
            };

            recorder.start();

            video.play();
            video.ontimeupdate = () => {
                if (video.currentTime >= endTime) {
                    video.pause();
                    recorder.stop();
                }
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
            };
        };
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