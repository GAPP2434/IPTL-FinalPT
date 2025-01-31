
//Variables
    const storiesContainer = document.getElementById('storiesContainer');
    const storyViewer = document.getElementById('storyViewer');
    const storyViewerContent = document.getElementById('storyViewerContent');
    const storyViewerTitle = document.getElementById('storyViewerTitle');
    const progressBar = document.getElementById('progressBar');
    let storyQueue = [];
    let currentStoryIndex = 0;
    let progressTimeout;

    //Add Story Function
    function addStories() {
        const mediaInput = document.getElementById('mediaInput');
        const storyTitleInput = document.getElementById('storyTitle');
        const storiesContainer = document.getElementById('storiesContainer');
        const files = Array.from(mediaInput.files);
        const storyTitle = storyTitleInput.value.trim();
    
        if (files.length === 0) {
            alert('Please select at least one image or video.');
            return;
        }
    
        files.forEach((file) => {
            const storyElement = document.createElement('div');
            storyElement.classList.add('story');
            const url = editedImageDataUrl || (editedVideoBlob ? URL.createObjectURL(editedVideoBlob) : URL.createObjectURL(file));
            const title = storyTitle || "Untitled Story";
    
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = url;
                img.alt = title; // Set the alt attribute to the title
                img.loading = 'lazy'; // Enable lazy loading
                storyElement.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = url;
                video.controls = false;
                video.alt = title; // Set a custom attribute to store the title
                video.loading = 'lazy'; // Enable lazy loading
                storyElement.appendChild(video);
            } else {
                alert('Unsupported file type.');
                return;
            }
    
            storyElement.addEventListener('click', () => {
                storyQueue = Array.from(storiesContainer.children)
                    .filter(child => child !== storiesContainer.children[0])
                    .map(child => ({
                        src: child.querySelector('img, video').src,
                        type: child.querySelector('img') ? 'image' : 'video',
                        title: child.querySelector('img, video').alt || title // Ensure title is set correctly
                    }));
    
                currentStoryIndex = storyQueue.findIndex(item => item.src === url);
                showStory(currentStoryIndex);
            });
    
            storiesContainer.appendChild(storyElement);
        });
    
        storyTitleInput.value = '';
        mediaInput.value = '';
        updateStoryIndicators(); // Update indicators when new stories are added
    }
    
    //Show Story Function
    function showStory(index) {
        const footer = document.querySelector('.footer');
        const storyViewerTitle = document.getElementById('storyViewerTitle'); // Ensure correct reference
    
        if (index < 0 || index >= storyQueue.length) {
            storyViewer.classList.remove('active');
            footer.classList.remove('hidden');
            clearTimeout(progressTimeout);
            return;
        }
    
        currentStoryIndex = index;
        const story = storyQueue[index];
        storyViewerContent.innerHTML = '';
    
        // Debugging: Log the title to verify it's being set correctly
        console.log('Updating title to:', story.title);
        storyViewerTitle.textContent = story.title; // Update the title here
    
        // Create and add the close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.classList.add('close-button');
        closeButton.addEventListener('click', () => {
            // Stop the video if it exists
            const video = storyViewerContent.querySelector('video');
            if (video) {
                video.pause(); // Pause the video
                video.currentTime = 0; // Reset video to the beginning
            }
            // Remove the active class and clear the timeout
            storyViewer.classList.remove('active');
            footer.classList.remove('hidden');
            clearTimeout(progressTimeout);
        });
    
        // Append close button to the content
        storyViewerContent.appendChild(closeButton);
    
        if (story.type === 'image') {
            const img = document.createElement('img');
            img.src = story.src;
            storyViewerContent.appendChild(img);
    
            img.onload = () => {
                clearTimeout(progressTimeout); // Clear any existing timeout
                updateProgressBar(5000, () => {
                    showStory(index + 1);
                });
            };
        } else if (story.type === 'video') {
            const video = document.createElement('video');
            video.src = story.src;
            video.autoplay = true;
            storyViewerContent.appendChild(video);
    
            video.onloadedmetadata = () => {
                clearTimeout(progressTimeout); // Clear any existing timeout
                const duration = Math.min(video.duration, 15) * 1000; // Limit to 15 seconds
                updateProgressBar(duration, () => {
                    showStory(index + 1);
                });
            };
    
            video.ontimeupdate = () => {
                if (video.currentTime >= 15) {
                    video.pause();
                    storyViewerContent.removeChild(video);
                    showStory(index + 1);
                }
            };
        }
    
        storyViewer.classList.add('active');
        footer.classList.add('hidden');
        updateNavButtons();
        updateStoryIndicators(); // Update indicators when showing a story
        preloadNextStory(); // Preload the next story
    }

    //Updating the Progress Bar
    function updateProgressBar(duration, callback) {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
    
        // Force reflow to reset the transition
        progressBar.offsetHeight;
    
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '100%';
    
        progressTimeout = setTimeout(() => {
            progressBar.style.width = '0%';
            callback();
        }, duration);
    }
    
    //Changing Next and Previous Buttons
    function updateNavButtons() {
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');
    
        prevButton.disabled = currentStoryIndex === 0;
        nextButton.disabled = currentStoryIndex === storyQueue.length - 1;
    }

    function prevStory() {
        if (currentStoryIndex > 0) {
            clearTimeout(progressTimeout); // Clear any existing timeout
            const video = storyViewerContent.querySelector('video');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
            showStory(currentStoryIndex - 1);
        }
    }
    
    function nextStory() {
        if (currentStoryIndex < storyQueue.length - 1) {
            clearTimeout(progressTimeout); // Clear any existing timeout
            const video = storyViewerContent.querySelector('video');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
            showStory(currentStoryIndex + 1);
        }
    }

    //Story Indicators
    function updateStoryIndicators() {
        const storyIndicators = document.getElementById('storyIndicators');
        storyIndicators.innerHTML = '';
    
        storyQueue.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.classList.add('story-indicator');
            if (index === currentStoryIndex) {
                indicator.classList.add('active');
            }
            storyIndicators.appendChild(indicator);
        });
    }

    //Lazy Loading (?) idk
    function preloadNextStory() {
        if (currentStoryIndex < storyQueue.length - 1) {
            const nextStory = storyQueue[currentStoryIndex + 1];
            const preloadElement = document.createElement(nextStory.type === 'image' ? 'img' : 'video');
            preloadElement.src = nextStory.src;
            preloadElement.style.display = 'none';
            document.body.appendChild(preloadElement);
            preloadElement.onload = () => document.body.removeChild(preloadElement);
            preloadElement.onloadedmetadata = () => document.body.removeChild(preloadElement);
        }
    }

    /*Modal For Uploading*/
    function openUploadModal(){
        document.getElementById('uploadModal').style.display = 'block';
        clearPreview();
    }
    
    document.getElementById('closeUploadModal').addEventListener('click', () => {
        document.getElementById('uploadModal').style.display = 'none';
        editedImageDataUrl = null;
        clearPreview(); // Clear preview when closing the modal
        document.getElementById('mediaInput').value = ''; // Clear the file input
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
    
    function clearPreview() {
        const previewContainer = document.getElementById('previewContainer');
        previewContainer.innerHTML = '';
    }

    // Edit functionality
    let cropper;
    let editedImageDataUrl = null;
    let editedVideoBlob = null;

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
        }
    });

    // Rotate functionality
    function rotateLeft() {
        if (cropper) {
            cropper.rotate(-90);
        }
    }

    function rotateRight() {
        if (cropper) {
            cropper.rotate(90);
        }
    }