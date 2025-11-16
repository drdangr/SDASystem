// ============================================
// MAIN.JS - Main initialization
// ============================================

// Application state
window.currentState = {
    selectedStory: null,
    selectedActor: null,
    selectedPost: null,
    viewMode: 'list',
    activeTab: 'timeline'
};

// Initialize application
async function initApplication() {
    console.log('Initializing Story Driven Analytics...');

    // Load data first
    const dataLoaded = await window.loadData();

    if (!dataLoaded) {
        console.error('Failed to load data');
        showError('Failed to load application data. Please refresh the page.');
        return;
    }

    // Dispatch data loaded event
    window.dispatchEvent(new Event('dataLoaded'));

    // Initialize all components
    try {
        // Layout management (resizable panels, view switching, etc.)
        if (typeof window.initLayout === 'function') {
            window.initLayout();
            console.log('✓ Layout initialized');
        }

        // Stories view (list/graph/tree)
        if (typeof window.initStoriesView === 'function') {
            window.initStoriesView();
            console.log('✓ Stories view initialized');
        }

        // Timeline component
        if (typeof window.initTimeline === 'function') {
            window.initTimeline();
            console.log('✓ Timeline initialized');
        }

        // Actors panel
        if (typeof window.initActorsPanel === 'function') {
            window.initActorsPanel();
            console.log('✓ Actors panel initialized');
        }

        // Cross-panel interactions
        if (typeof window.initInteractions === 'function') {
            window.initInteractions();
            console.log('✓ Interactions initialized');
        }

        // Setup global search
        setupGlobalSearch();
        console.log('✓ Global search initialized');

        // Setup theme toggle
        setupThemeToggle();
        console.log('✓ Theme toggle initialized');

        // Setup explain mode
        setupExplainMode();
        console.log('✓ Explain mode initialized');

        console.log('✅ Application initialized successfully');

        // Show initial state
        showWelcomeState();

    } catch (error) {
        console.error('Error initializing application:', error);
        showError('An error occurred while initializing the application.');
    }
}

// Global search functionality
function setupGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);

        const query = e.target.value.toLowerCase().trim();

        if (query.length < 2) {
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    // Focus on Ctrl/Cmd + K (handled in layout.js, but also accessible here)
    searchInput.addEventListener('focus', () => {
        searchInput.select();
    });
}

function performSearch(query) {
    const results = {
        stories: [],
        actors: [],
        posts: []
    };

    // Search stories
    results.stories = window.AppData.stories.filter(story =>
        story.title.toLowerCase().includes(query) ||
        story.summary.toLowerCase().includes(query)
    );

    // Search actors
    results.actors = window.AppData.actors.filter(actor =>
        actor.canonical_name.toLowerCase().includes(query) ||
        actor.aliases.some(alias => alias.toLowerCase().includes(query))
    );

    // Search posts
    results.posts = window.AppData.posts.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.summary.toLowerCase().includes(query)
    );

    console.log('Search results:', results);

    // Show search results (could be implemented as a dropdown)
    // For now, just select the first story if found
    if (results.stories.length > 0) {
        window.dispatchEvent(new CustomEvent('storySelected', {
            detail: { story: results.stories[0] }
        }));
    }
}

// Theme toggle
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    let isDark = true; // Default is dark theme

    themeToggle.addEventListener('click', () => {
        isDark = !isDark;

        if (isDark) {
            document.documentElement.classList.remove('light-theme');
            themeToggle.textContent = '🌙';
        } else {
            document.documentElement.classList.add('light-theme');
            themeToggle.textContent = '☀️';
        }

        // Save preference
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Load saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        themeToggle.click();
    }
}

// Explain mode
let explainModeActive = false;

function setupExplainMode() {
    const explainBtn = document.getElementById('explainModeBtn');
    if (!explainBtn) return;

    explainBtn.addEventListener('click', () => {
        explainModeActive = !explainModeActive;

        if (explainModeActive) {
            explainBtn.style.background = 'var(--primary)';
            explainBtn.style.color = 'white';
            enableExplainMode();
        } else {
            explainBtn.style.background = '';
            explainBtn.style.color = '';
            disableExplainMode();
        }
    });
}

function enableExplainMode() {
    console.log('Explain mode enabled');

    // Add tooltips and explanations to various elements
    // This would show why certain decisions were made by the system

    // Add explain overlay to story items
    const storyItems = document.querySelectorAll('.story-item');
    storyItems.forEach(item => {
        item.title = 'Click to see why this story was formed';
        item.style.cursor = 'help';
    });
}

function disableExplainMode() {
    console.log('Explain mode disabled');

    const storyItems = document.querySelectorAll('.story-item');
    storyItems.forEach(item => {
        item.title = '';
        item.style.cursor = 'pointer';
    });
}

// Show welcome state
function showWelcomeState() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
    }

    const storyDetail = document.getElementById('storyDetail');
    if (storyDetail) {
        storyDetail.style.display = 'none';
    }

    const actorDetail = document.getElementById('actorDetail');
    if (actorDetail) {
        actorDetail.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const centerContent = document.getElementById('centerContent');
    if (centerContent) {
        centerContent.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                <h2 style="color: var(--danger); margin-bottom: 1rem;">Error</h2>
                <p style="color: var(--text-secondary);">${message}</p>
            </div>
        `;
    }
}

// Statistics and debugging
function showStats() {
    console.log('=== Application Statistics ===');
    console.log('Stories:', window.AppData.stories.length);
    console.log('Actors:', window.AppData.actors.length);
    console.log('Posts:', window.AppData.posts.length);
    console.log('Relationships:', window.AppData.relationships.length);
    console.log('Current State:', window.currentState);
}

// Export utility function
window.showStats = showStats;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApplication);
} else {
    initApplication();
}
