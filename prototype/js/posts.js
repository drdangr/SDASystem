// ============================================
// POSTS.JS - Posts page functionality
// ============================================

let currentPosts = [];
let currentPostFilters = {
    sentiment: 'all',
    sort: 'recent'
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    renderPosts();
    setupEventListeners();
});

// ============================================
// RENDER POSTS
// ============================================

function renderPosts() {
    const container = document.getElementById('postsContainer');

    // Filter posts
    let filtered = [...AppData.posts];

    if (currentPostFilters.sentiment !== 'all') {
        filtered = filtered.filter(p => p.sentiment === currentPostFilters.sentiment);
    }

    // Sort posts
    filtered.sort((a, b) => {
        switch (currentPostFilters.sort) {
            case 'oldest':
                return new Date(a.published_at) - new Date(b.published_at);
            case 'recent':
            default:
                return new Date(b.published_at) - new Date(a.published_at);
        }
    });

    currentPosts = filtered;
    container.innerHTML = filtered.map(post => createPostCard(post)).join('');
}

function createPostCard(post) {
    const actors = post.actors.map(actorId => {
        const actor = getActorById(actorId);
        return actor ? `<span class="actor-tag" onclick="navigateToActor('${actorId}')">${actor.canonical_name}</span>` : '';
    }).join('');

    return `
        <div class="post-card">
            <div class="post-header">
                <h3 class="post-title">
                    <a href="${post.url}" target="_blank">${post.title}</a>
                </h3>
                <div class="post-meta">
                    <span>${post.domain}</span>
                    <span>•</span>
                    <span>${post.author}</span>
                    <span>•</span>
                    <span>${formatDateTime(post.published_at)}</span>
                </div>
            </div>

            <p class="post-summary">${post.summary}</p>

            <div class="post-footer">
                <div class="post-actors">
                    ${actors}
                </div>
                <span class="sentiment-badge sentiment-${post.sentiment}">${post.sentiment}</span>
            </div>
        </div>
    `;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Sentiment filter
    const sentimentSelect = document.getElementById('sentimentFilter');
    if (sentimentSelect) {
        sentimentSelect.addEventListener('change', (e) => {
            currentPostFilters.sentiment = e.target.value;
            renderPosts();
        });
    }

    // Sort filter
    const sortSelect = document.getElementById('sortPostsBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentPostFilters.sort = e.target.value;
            renderPosts();
        });
    }

    // Search
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query) {
                const filtered = currentPosts.filter(post =>
                    post.title.toLowerCase().includes(query) ||
                    post.summary.toLowerCase().includes(query) ||
                    post.content.toLowerCase().includes(query)
                );
                const container = document.getElementById('postsContainer');
                container.innerHTML = filtered.map(post => createPostCard(post)).join('');
            } else {
                renderPosts();
            }
        });
    }
}

// ============================================
// NAVIGATION
// ============================================

function navigateToActor(actorId) {
    window.location.href = `actors.html?id=${actorId}`;
}

// ============================================
// EXPORT
// ============================================

window.navigateToActor = navigateToActor;
