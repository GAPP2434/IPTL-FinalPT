import {currentStoryIndex, reactionCounts, comments} from './Main.js';
 // Function to initialize reaction counts for a story
 export function initializeReactionCounts(storyId) {
    if (!reactionCounts[storyId]) {
        reactionCounts[storyId] = {
            happy: 0,
            heart: 0,
            laugh: 0,
            like: 0
        };
    }
}
    // Function to update reaction counts in the UI
    
    export function updateReactionCounts(storyId) {
        document.getElementById('happyCount').textContent = reactionCounts[storyId].happy;
        document.getElementById('heartCount').textContent = reactionCounts[storyId].heart;
        document.getElementById('laughCount').textContent = reactionCounts[storyId].laugh;
        document.getElementById('likeCount').textContent = reactionCounts[storyId].like;
    }

    // Event listeners for reaction buttons
document.getElementById('happyButton').addEventListener('click', () => {
    const storyId = currentStoryIndex; // Assuming currentStoryIndex is the ID of the current story
    initializeReactionCounts(storyId);
    reactionCounts[storyId].happy++;
    updateReactionCounts(storyId);
});

document.getElementById('heartButton').addEventListener('click', () => {
    const storyId = currentStoryIndex;
    initializeReactionCounts(storyId);
    reactionCounts[storyId].heart++;
    updateReactionCounts(storyId);
});

document.getElementById('laughButton').addEventListener('click', () => {
    const storyId = currentStoryIndex;
    initializeReactionCounts(storyId);
    reactionCounts[storyId].laugh++;
    updateReactionCounts(storyId);
});

document.getElementById('likeButton').addEventListener('click', () => {
    const storyId = currentStoryIndex;
    initializeReactionCounts(storyId);
    reactionCounts[storyId].like++;
    updateReactionCounts(storyId);
});

/*comments*/
export function initializeComments(storyId) {
    if (!comments[storyId]) {
        comments[storyId] = [];
    }
}

// Function to update comments in the UI
export function updateComments(storyId) {
    const commentList = document.getElementById('commentList');
    commentList.innerHTML = '';
    comments[storyId].forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
        commentElement.textContent = comment;
        commentList.appendChild(commentElement);
    });
}

document.getElementById('sendCommentButton').addEventListener('click', () => {
    const storyId = currentStoryIndex;
    const commentInput = document.getElementById('commentInput');
    const commentText = commentInput.value.trim();
    if (commentText) {
        initializeComments(storyId);
        comments[storyId].push(commentText);
        updateComments(storyId);
        commentInput.value = ''; // Clear the input
    }
});