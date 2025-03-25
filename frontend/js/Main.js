import { initializeReactionCounts, updateReactionCounts, initializeComments, updateComments } from './ReactionAndComments.js';
import { editedImageDataUrl, editedVideoBlob, editedAudioBlob, loggedInUsername } from './uploadModal.js';

// Variables
export const storiesContainer = document.getElementById('storiesContainer');
export const storyViewer = document.getElementById('storyViewer');
export const storyViewerContent = document.getElementById('storyViewerContent');
export const storyViewerTitle = document.getElementById('storyViewerTitle');
export const progressBar = document.getElementById('progressBar');
export let storyQueue = [];
export let currentStoryIndex = 0;
export let progressTimeout;
export let reactionCounts = {};
export let comments = {};
export let isPaused = false;
export let remainingTime = 0;
export let startTime = 0;
export let elapsedTime = 0;
export let audioElement = null;

window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data && event.data.type === 'oauthSuccess' && event.data.token) {
        localStorage.setItem('token', event.data.token);
        window.location.replace('index.html');
    }
});

// Fetch and display stories
export function fetchAndDisplayStories() {
    fetch('/api/stories')
        .then(response => response.json())
        .then(stories => {
            const storiesContainer = document.getElementById('storiesContainer');
            storiesContainer.innerHTML = ''; // Clear existing stories
            stories.forEach(story => {
                storyElement.classList.add('story');
                storyElement.innerHTML = `
                    <div class="story-header">
                        <span class="story-username">${story.username}</span>
                        <span class="story-date">${new Date(story.uploadDate).toLocaleString()}</span>
                    </div>
                    <div class="story-content">
                        <img src="${story.mediaUrl}" alt="Story Media">
                        <p>${story.title}</p>
                        <p>${story.description}</p>
                    </div>
                `;
                storiesContainer.appendChild(storyElement);
                storyQueue.push({
                    ...story,
                    type: story.mediaUrl.endsWith('.mp4') ? 'video' : 'image',
                    src: story.mediaUrl,
                    hasAudio: !!story.audioStartTime
                });
            });
        })
        .catch(error => {
            console.error('Error fetching stories:', error);
        });
}

// Add Story Function
export function addStories(audioStartTime) {
    console.log('addStories function triggered');
    const mediaInput = document.getElementById('mediaInput');
    const storyTitleInput = document.getElementById('storyTitle');
    const storyDescriptionInput = document.getElementById('storyDescription');
    const audioInput = document.getElementById('audioInput');
    const files = Array.from(mediaInput.files);
    const storyTitle = storyTitleInput.value.trim();
    const storyDescription = storyDescriptionInput.value.trim();
    const uploadDate = new Date().toLocaleString();

    if (files.length === 0) {
        alert('Please select at least one image or video.');
        return;
    }

    files.forEach((file, index) => {
        const formData = new FormData();
        formData.append('title', storyTitle);
        formData.append('description', storyDescription);
        formData.append('username', loggedInUsername); // Use loggedInUsername instead of storyUsernameInput
        formData.append('media', file);
        formData.append('audioStartTime', audioStartTime);

        fetch('/api/stories', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Story added:', data);
            // Update the DOM with the new story
            const storyElement = document.createElement('div');
            storyElement.classList.add('story');
            storyElement.innerHTML = `
                <div class="story-header">
                    <span class="story-username">${data.username}</span>
                    <span class="story-date">${new Date(data.uploadDate).toLocaleString()}</span>
                </div>
                <div class="story-content">
                    <img src="${data.mediaUrl}" alt="Story Media">
                    <p>${data.title}</p>
                    <p>${data.description}</p>
                </div>
            `;
            storiesContainer.appendChild(storyElement);
            storyQueue.push({
                ...data,
                type: data.mediaUrl.endsWith('.mp4') ? 'video' : 'image',
                src: data.mediaUrl,
                hasAudio: !!data.audioStartTime
            });
        })
        .catch(error => {
            console.error('Error adding story:', error);
        });
    });
}

export function preloadAudio() {
    console.log('Preloading audio for stories...');
    storyQueue.forEach((story, index) => {
        if (story.hasAudio) {
            console.log(`Preloading audio for story ${index}: ${story.audioUrl}`);
            const audio = new Audio(story.audioUrl);
            audio.id = `audio-${index}`;
            audio.volume = 0.5;
            audio.preload = 'auto';
            audio.src = story.audioUrl; // Ensure the audio source is set
            document.body.appendChild(audio);
        }
    });
}

export function showStory(index) {
    const footer = document.querySelector('.footer');
    const storyViewerTitle = document.getElementById('storyViewerTitle');
    const storyViewerDescription = document.getElementById('storyViewerDescription');
    const storyViewerUsername = document.getElementById('storyViewerUsername');
    const volumeSlider = document.getElementById('volumeSlider');

    if (index < 0 || index >= storyQueue.length) {
        storyViewer.classList.remove('active');
        footer.classList.remove('hidden');
        clearTimeout(progressTimeout);
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            audioElement.src = ''; // Clear the audio source
            audioElement = null;
        }
        volumeSlider.style.display = 'none'; // Hide the volume slider
        return;
    }

    currentStoryIndex = index;
    const story = storyQueue[index];
    console.log(`Showing story ${index}:`, story);
    storyViewerContent.innerHTML = '';

    storyViewerTitle.textContent = story.title;
    storyViewerDescription.textContent = story.description;
    storyViewerUsername.textContent = `Uploaded by ${story.username} on ${story.uploadDate}`;

    isPaused = false;
    remainingTime = 0;
    startTime = 0;
    elapsedTime = 0;

    storyViewerContent.addEventListener('click', togglePauseStory);

    if (story.type === 'image') {
        const img = document.createElement('img');
        img.src = story.src;
        storyViewerContent.appendChild(img);

        img.onload = () => {
            clearTimeout(progressTimeout);
            remainingTime = 5000;
            startTime = Date.now();
            updateProgressBar(remainingTime, () => {
                showStory(index + 1);
            });
        };
    } else if (story.type === 'video') {
        const video = document.createElement('video');
        video.src = story.src;
        video.autoplay = true;
        video.muted = story.hasAudio; // Mute the video if it has integrated audio
        storyViewerContent.appendChild(video);

        video.onloadedmetadata = () => {
            clearTimeout(progressTimeout);
            remainingTime = Math.min(video.duration, 15) * 1000;
            startTime = Date.now();
            updateProgressBar(remainingTime, () => {
                showStory(index + 1);
            });
        };

        video.ontimeupdate = () => {
            if (video.currentTime >= 15) {
                video.pause();
                if (storyViewerContent.contains(video)) {
                    storyViewerContent.removeChild(video);
                }
                showStory(index + 1);
            }
        };

        volumeSlider.value = 0.5; // Reset to middle position
        volumeSlider.style.display = 'block'; // Ensure the volume slider is visible
        volumeSlider.style.transform = 'rotate(270deg)'; // Rotate the slider
        updateVolumeSliderBackground(volumeSlider);

        volumeSlider.addEventListener('input', () => {
            video.volume = volumeSlider.value;
            updateVolumeSliderBackground(volumeSlider);
        });
    }

    if (audioElement) {
        console.log('Pausing and resetting previous audio element');
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = ''; // Clear the audio source
        audioElement = null; // Ensure the audio element is reset
    }

    if (story.hasAudio) {
        console.log('Loading audio for the story:', story.audioUrl);
        audioElement = new Audio(story.audioUrl);
        audioElement.id = story.audioId;
        audioElement.volume = 0.5;
        volumeSlider.style.display = 'block';
        audioElement.preload = 'auto';
        audioElement.currentTime = story.audioStartTime; // Set the start time
        audioElement.play().then(() => {
            console.log('Audio started playing');
        }).catch(error => {
            console.error('Error playing audio:', error);
        });

        volumeSlider.addEventListener('input', () => {
            audioElement.volume = volumeSlider.value;
            updateVolumeSliderBackground(volumeSlider);
        });
    } else if (story.hasOriginalSound) {
        console.log('Story has original sound');
        // No need to do anything, the video will play its original sound
    } else {
        console.log('No audio for this story');
        // No audio for this story
        volumeSlider.style.display = 'none'; // Hide the volume slider
    }

    initializeReactionCounts(currentStoryIndex);
    updateReactionCounts(currentStoryIndex);
    initializeComments(currentStoryIndex);
    updateComments(currentStoryIndex);

    storyViewer.classList.add('active');
    footer.classList.add('hidden');
    updateNavButtons();
    updateStoryIndicators();
    preloadNextStory();
}

export function updateVolumeSliderBackground(slider) {
    const value = slider.value * 100;
    slider.style.background = `linear-gradient(to right, #1877f2 ${value}%, #ccc ${value}%)`;
}

export function togglePauseStory() {
    const story = storyQueue[currentStoryIndex];
    const video = storyViewerContent.querySelector('video');
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '100%';

        progressTimeout = setTimeout(() => {
            progressBar.style.width = '0%';
            callback();
        }, duration);
    }

    // Pausing and Resuming the Progress Bar
    export function pauseProgressBar() {
        const progressBar = document.getElementById('progressBar');
        const computedStyle = window.getComputedStyle(progressBar);
        const width = computedStyle.getPropertyValue('width');
        progressBar.style.transition = 'none';
        progressBar.style.width = width;
    }

    export function resumeProgressBar(remainingDuration) {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.transition = `width ${remainingDuration}ms linear`;
        progressBar.style.width = '100%';

        progressTimeout = setTimeout(() => {
            progressBar.style.width = '0%';
            showStory(currentStoryIndex + 1);
        }, remainingDuration);
    }
    // Changing Next and Previous Buttons
    export function updateNavButtons() {
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');
    
        prevButton.disabled = currentStoryIndex === 0;
        nextButton.disabled = currentStoryIndex === storyQueue.length - 1;
    
        if (prevButton.disabled) {
            prevButton.classList.add('disabled');
        } else {
            prevButton.classList.remove('disabled');
        }
    
        if (nextButton.disabled) {
            nextButton.classList.add('disabled');
        } else {
            nextButton.classList.remove('disabled');
        }
    }
    
    export function prevStory() {
        if (currentStoryIndex > 0) {
            clearTimeout(progressTimeout); // Clear any existing timeout
            const video = storyViewerContent.querySelector('video');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
            if (audioElement) {
                console.log('Pausing and resetting previous audio element');
                audioElement.pause();
                audioElement.currentTime = 0;
                audioElement.src = ''; // Clear the audio source
                audioElement = null; // Ensure the audio element is reset
            }
            showStory(currentStoryIndex - 1);
        }
    }
    
    export function nextStory() {
        if (currentStoryIndex < storyQueue.length - 1) {
            clearTimeout(progressTimeout); // Clear any existing timeout
            const video = storyViewerContent.querySelector('video');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
            if (audioElement) {
                audioElement.pause();
                audioElement.currentTime = 0;
                audioElement.src = ''; // Clear the audio source
                audioElement = null; // Ensure the audio element is reset
            }
            showStory(currentStoryIndex + 1);
        }
    }
    
    document.getElementById('prevButton').addEventListener('click', prevStory);
    document.getElementById('nextButton').addEventListener('click', nextStory);
    
    // Story Indicators
    export function updateStoryIndicators() {
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
    
    // Lazy Loading (?) idk
    export function preloadNextStory() {
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
    
    // Keyboard Shortcuts
    
    export function closeViewer() {
        const video = storyViewerContent.querySelector('video');
        if (video) {
          video.pause();
          video.currentTime = 0;
          storyViewerContent.removeChild(video); // Remove the video element from the DOM
        }
        storyViewer.classList.remove('active');
        footer.classList.remove('hidden');
        clearTimeout(progressTimeout);
      }
    
      export function closeStoryViewer() {
        const footer = document.querySelector('.footer'); // Define the footer variable
        const video = storyViewerContent.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
            storyViewerContent.removeChild(video); // Remove the video element from the DOM
        }
        if (audioElement) {
            console.log('Pausing and resetting audio element on close');
            audioElement.pause();
            audioElement.currentTime = 0;
            audioElement.src = ''; // Clear the audio source
            audioElement = null; // Ensure the audio element is reset
        }
        storyViewer.classList.remove('active');
        footer.classList.remove('hidden');
        clearTimeout(progressTimeout);
    }
    
    window.closeStoryViewer = closeStoryViewer;

    document.addEventListener('keydown', (event) => {
        if (storyViewer.classList.contains('active')) {
            if (event.key === 'ArrowLeft') {
                prevStory();
            } else if (event.key === 'ArrowRight') {
                nextStory();
            } else if (event.key === 'Escape') {
                closeStoryViewer();
            } else if (event.key === ' ') { // Use ' ' for Space bar
                event.preventDefault(); // Prevent default space bar action (scrolling)
                togglePauseStory();
            }
        }
    });