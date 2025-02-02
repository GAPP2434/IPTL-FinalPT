import {initializeReactionCounts, updateReactionCounts, initializeComments, updateComments } from './ReactionAndComments.js';
import {editedImageDataUrl, editedVideoBlob,} from './uploadModal.js';
//Variables
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

    //Add Story Function
    export function addStories() {
        const mediaInput = document.getElementById('mediaInput');
        const storyTitleInput = document.getElementById('storyTitle');
        const storyDescriptionInput = document.getElementById('storyDescription');
        const storyUsernameInput = document.getElementById('storyUsername');
        const storiesContainer = document.getElementById('storiesContainer');
        const files = Array.from(mediaInput.files);
        const storyTitle = storyTitleInput.value.trim();
        const storyDescription = storyDescriptionInput.value.trim();
        const storyUsername = storyUsernameInput.value.trim();
        const uploadDate = new Date().toLocaleString();
    
        if (files.length === 0) {
            alert('Please select at least one image or video.');
            return;
        }
    
        files.forEach((file) => {
            const storyElement = document.createElement('div');
            storyElement.classList.add('story');
            const url = editedImageDataUrl || (editedVideoBlob ? URL.createObjectURL(editedVideoBlob) : URL.createObjectURL(file));
            const title = storyTitle || "Untitled Story";
            const description = storyDescription || "No description";
            const username = storyUsername || "Anonymous";
    
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
                        title: child.querySelector('img, video').alt || title, // Ensure title is set correctly
                        description: description, // Ensure description is set correctly
                        username: username, // Ensure username is set correctly
                        uploadDate: uploadDate // Ensure upload date is set correctly
                    }));
    
                currentStoryIndex = storyQueue.findIndex(item => item.src === url);
                showStory(currentStoryIndex);
            });
    
            storiesContainer.appendChild(storyElement);
        });
    
        storyTitleInput.value = '';
        storyDescriptionInput.value = '';
        storyUsernameInput.value = '';
        mediaInput.value = '';
        updateStoryIndicators(); // Update indicators when new stories are added
    }
    
    export function showStory(index) {
        const footer = document.querySelector('.footer');
        const storyViewerTitle = document.getElementById('storyViewerTitle');
        const storyViewerDescription = document.getElementById('storyViewerDescription');
        const storyViewerUsername = document.getElementById('storyViewerUsername');
    
        if (index < 0 || index >= storyQueue.length) {
            storyViewer.classList.remove('active');
            footer.classList.remove('hidden');
            clearTimeout(progressTimeout);
            return;
        }
    
        currentStoryIndex = index;
        const story = storyQueue[index];
        storyViewerContent.innerHTML = '';
    
        storyViewerTitle.textContent = story.title;
        storyViewerDescription.textContent = story.description;
        storyViewerUsername.textContent = `Uploaded by ${story.username} on ${story.uploadDate}`;
    
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.classList.add('close-button');
        closeButton.addEventListener('click', () => {
            const video = storyViewerContent.querySelector('video');
            if (video) {
                video.pause();
                video.currentTime = 0;
                storyViewerContent.removeChild(video); // Remove the video element from the DOM
            }
            storyViewer.classList.remove('active');
            footer.classList.remove('hidden');
            clearTimeout(progressTimeout);
        });
    
        storyViewerContent.appendChild(closeButton);
    
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
                    storyViewerContent.removeChild(video);
                    showStory(index + 1);
                }
            };
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

    export function togglePauseStory() {
        const story = storyQueue[currentStoryIndex];
        const video = storyViewerContent.querySelector('video');
    
        if (isPaused) {
            startTime = Date.now();
            resumeProgressBar(remainingTime);
            if (video) {
                video.play();
            }
        } else {
            clearTimeout(progressTimeout);
            elapsedTime = Date.now() - startTime;
            remainingTime -= elapsedTime;
            if (video) {
                video.pause();
            }
            pauseProgressBar();
        }
        isPaused = !isPaused;
    }
    
    // Updating the Progress Bar
    export function updateProgressBar(duration, callback) {
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
    }

    export function prevStory() {
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
    
    export function nextStory() {
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
