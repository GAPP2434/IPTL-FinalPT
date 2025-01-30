    const storiesContainer = document.getElementById('storiesContainer');
    const storyViewer = document.getElementById('storyViewer');
    const storyViewerContent = document.getElementById('storyViewerContent');
    const storyViewerTitle = document.getElementById('storyViewerTitle');
    const progressBar = document.getElementById('progressBar');
    let storyQueue = [];
    let currentStoryIndex = 0;
    let progressTimeout;

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
            const url = URL.createObjectURL(file);
            const title = storyTitle || "Untitled Story";
    
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = url;
                img.alt = title; // Set the alt attribute to the title
                storyElement.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = url;
                video.controls = false;
                video.alt = title; // Set a custom attribute to store the title
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
        updateStoryIndicators();
    }
    

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
        updateStoryIndicators();
    }

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
    
    function updateNavButtons() {
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');
    
        prevButton.disabled = currentStoryIndex === 0;
        nextButton.disabled = currentStoryIndex === storyQueue.length - 1;
    }
   
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