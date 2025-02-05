import {initializeReactionCounts, updateReactionCounts, initializeComments, updateComments } from './ReactionAndComments.js';
import {editedImageDataUrl, editedVideoBlob,editedAudioBlob} from './uploadModal.js';
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
    export let audioElement = null;

    //Add Story Function
    export function addStories(audioStartTime) {
        console.log('addStories function triggered');
        const mediaInput = document.getElementById('mediaInput');
        const storyTitleInput = document.getElementById('storyTitle');
        const storyDescriptionInput = document.getElementById('storyDescription');
        const storyUsernameInput = document.getElementById('storyUsername');
        const audioInput = document.getElementById('audioInput');
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
    
        files.forEach((file, index) => {
            const storyElement = document.createElement('div');
            storyElement.classList.add('story');
            const url = editedImageDataUrl || (editedVideoBlob ? URL.createObjectURL(editedVideoBlob) : URL.createObjectURL(file));
            const title = storyTitle || "Untitled Story";
            const description = storyDescription || "No description";
            const username = storyUsername || "Anonymous";
            const audioUrl = editedAudioBlob ? URL.createObjectURL(editedAudioBlob) : null;
            const uniqueId = `${Date.now()}-${index}`; // Generate a unique ID
    
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = url;
                img.alt = title;
                img.loading = 'lazy';
                storyElement.appendChild(img);
                if (audioUrl) {
                    storyElement.classList.add('story-with-audio');
                    const audio = new Audio(audioUrl);
                    audio.id = `audio-${uniqueId}`;
                    audio.volume = 0.5;
                    audio.preload = 'auto';
                    audio.dataset.startTime = audioStartTime; // Store the start time in a data attribute
                    storyElement.appendChild(audio);
                    console.log(`Audio element created with ID: audio-${uniqueId} and src: ${audioUrl}`);
                } else {
                    storyElement.classList.add('story-without-audio');
                }
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = url;
                video.controls = false;
                video.alt = title;
                video.loading = 'lazy';
                video.muted = !!audioUrl; // Mute the original audio of the video if integrated audio is present
                storyElement.appendChild(video);
                console.log(`Video element created with src: ${url}, muted: ${video.muted}`);
                if (audioUrl) {
                    storyElement.classList.add('story-with-audio');
                    const audio = new Audio(audioUrl);
                    audio.id = `audio-${uniqueId}`;
                    audio.volume = 0.5;
                    audio.preload = 'auto';
                    audio.dataset.startTime = audioStartTime; // Store the start time in a data attribute
                    storyElement.appendChild(audio);
                    console.log(`Audio element created with ID: audio-${uniqueId} and src: ${audioUrl}`);
                } else {
                    storyElement.classList.add('story-with-original-sound');
                }
            } else {
                alert('Unsupported file type.');
                return;
            }
    
            storyElement.addEventListener('click', () => {
                storyQueue = Array.from(storiesContainer.children)
                    .filter(child => child !== storiesContainer.children[0])
                    .map((child, idx) => ({
                        src: child.querySelector('img, video').src,
                        type: child.querySelector('img') ? 'image' : 'video',
                        title: child.querySelector('img, video').alt || title,
                        description: child.querySelector('.story-description') ? child.querySelector('.story-description').textContent : description,
                        username: child.querySelector('.story-username').textContent,
                        uploadDate: uploadDate,
                        audioUrl: child.querySelector('audio') ? child.querySelector('audio').src : null,
                        hasAudio: child.classList.contains('story-with-audio'),
                        hasOriginalSound: child.classList.contains('story-with-original-sound'),
                        audioId: child.querySelector('audio') ? child.querySelector('audio').id : null,
                        audioStartTime: child.querySelector('audio') ? parseInt(child.querySelector('audio').dataset.startTime) : 0 // Retrieve the start time from the data attribute
                    }));
    
                currentStoryIndex = storyQueue.findIndex(item => item.src === url);
                showStory(currentStoryIndex);
            });
    
            const usernameElement = document.createElement('div');
            usernameElement.classList.add('story-username');
            usernameElement.textContent = username;
            storyElement.appendChild(usernameElement);
    
            const descriptionElement = document.createElement('div');
            descriptionElement.classList.add('story-description');
            descriptionElement.textContent = description;
            storyElement.appendChild(descriptionElement);
    
            storiesContainer.appendChild(storyElement);
        });
    
        storyTitleInput.value = '';
        storyDescriptionInput.value = '';
        storyUsernameInput.value = '';
        mediaInput.value = '';
        audioInput.value = '';
        updateStoryIndicators();
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
            console.log(`Video element created with src: ${story.src}, muted: ${video.muted}`);
    
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
            audioElement.preload = 'auto';
            audioElement.currentTime = story.audioStartTime; // Set the start time
            audioElement.play().then(() => {
                console.log('Audio started playing');
            }).catch(error => {
                console.error('Error playing audio:', error);
            });
            const volumeControl = document.createElement('input');
            volumeControl.type = 'range';
            volumeControl.min = '0';
            volumeControl.max = '1';
            volumeControl.step = '0.01';
            volumeControl.value = audioElement.volume;
            volumeControl.style.position = 'absolute';
            volumeControl.style.top = '10px';
            volumeControl.style.right = '10px';
            volumeControl.addEventListener('input', (event) => {
                audioElement.volume = event.target.value;
            });
            storyViewerContent.appendChild(volumeControl);
        } else if (story.hasOriginalSound) {
            console.log('Story has original sound');
            // No need to do anything, the video will play its original sound
        } else {
            console.log('No audio for this story');
            // No audio for this story
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
            if (audioElement) {
                audioElement.play();
            }
        } else {
            clearTimeout(progressTimeout);
            elapsedTime = Date.now() - startTime;
            remainingTime -= elapsedTime;
            if (video) {
                video.pause();
            }
            if (audioElement) {
                audioElement.pause();
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
      
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
          prevStory();
        } else if (event.key === 'ArrowRight') {
          nextStory();
        } else if (event.key === 'Escape') {
          closeViewer();
        }
      });
    
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