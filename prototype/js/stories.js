// ============================================
// STORIES.JS - Stories page functionality
// ============================================

let currentSort = 'relevance';
let currentStories = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    updateStats();
    renderStories();
    setupEventListeners();
});

// ============================================
// STATS
// ============================================

function updateStats() {
    const activeStories = AppData.stories.filter(s => s.status === 'active').length;
    const totalPosts = AppData.posts.length;
    const totalActors = AppData.actors.length;

    document.getElementById('activeStoriesCount').textContent = activeStories;
    document.getElementById('totalPostsCount').textContent = totalPosts;
    document.getElementById('totalActorsCount').textContent = totalActors;
}

// ============================================
// RENDER STORIES
// ============================================

function renderStories(sortBy = 'relevance') {
    currentSort = sortBy;
    const container = document.getElementById('storiesContainer');

    // Sort stories
    currentStories = [...AppData.stories].sort((a, b) => {
        switch (sortBy) {
            case 'freshness':
                return b.freshness - a.freshness;
            case 'size':
                return b.size - a.size;
            case 'cohesion':
                return b.cohesion - a.cohesion;
            case 'relevance':
            default:
                return b.relevance - a.relevance;
        }
    });

    // Render
    container.innerHTML = currentStories.map(story => createStoryCard(story)).join('');
}

function createStoryCard(story) {
    const actors = story.top_actors.slice(0, 5).map(actorId => {
        const actor = getActorById(actorId);
        return actor ? `<span class="actor-tag" onclick="navigateToActor('${actorId}')">${actor.canonical_name}</span>` : '';
    }).join('');

    return `
        <div class="story-card" onclick="openStoryModal('${story.id}')">
            <div class="story-header">
                <div>
                    <h3 class="story-title">${story.title}</h3>
                    <p class="story-summary">${story.summary}</p>
                </div>
                <div class="story-metrics">
                    <div class="metric">
                        <span class="metric-label">Rel</span>
                        <span class="metric-value ${getMetricClass(story.relevance)}">${formatMetricValue(story.relevance)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Coh</span>
                        <span class="metric-value ${getMetricClass(story.cohesion)}">${formatMetricValue(story.cohesion)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Fresh</span>
                        <span class="metric-value ${getMetricClass(story.freshness)}">${formatMetricValue(story.freshness)}</span>
                    </div>
                </div>
            </div>

            <ul class="story-bullets">
                ${story.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
            </ul>

            <div class="story-footer">
                <div class="story-actors">
                    ${actors}
                </div>
                <div class="story-meta">
                    <span class="badge badge-info">${story.size} posts</span>
                    <span>${formatDate(story.updated_at)}</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MODAL
// ============================================

function openStoryModal(storyId) {
    const story = getStoryById(storyId);
    if (!story) return;

    const modal = document.getElementById('storyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = story.title;
    modalBody.innerHTML = createStoryDetailView(story);

    modal.classList.add('active');

    // Setup tabs
    setupModalTabs();
}

function createStoryDetailView(story) {
    const actors = story.top_actors.map(actorId => {
        const actor = getActorById(actorId);
        return actor ? `
            <div class="actor-tag" onclick="navigateToActor('${actorId}')" style="cursor: pointer;">
                ${actor.canonical_name}
                <span style="color: var(--text-muted); margin-left: 0.5rem;">(${actor.mentions_count} mentions)</span>
            </div>
        ` : '';
    }).join('');

    const timeline = story.timeline.map(item => {
        const post = getPostById(item.post_id);
        return `
            <div class="timeline-item">
                <div class="timeline-marker ${item.type}">${item.type === 'fact' ? 'F' : 'O'}</div>
                <div class="timeline-content">
                    <div class="timeline-date">${formatDateTime(item.date)}</div>
                    <div class="timeline-text">${item.content}</div>
                    ${post ? `<div style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.875rem;">Source: ${post.domain}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    const posts = story.posts.map(postId => {
        const post = getPostById(postId);
        if (!post) return '';
        return `
            <div class="post-card" style="margin-bottom: 1rem;">
                <div class="post-header">
                    <h4 class="post-title"><a href="${post.url}" target="_blank">${post.title}</a></h4>
                    <div class="post-meta">
                        <span>${post.domain}</span>
                        <span>•</span>
                        <span>${formatDate(post.published_at)}</span>
                    </div>
                </div>
                <p class="post-summary">${post.summary}</p>
                <div class="post-footer">
                    <div class="post-actors">
                        ${post.actors.map(actorId => {
                            const actor = getActorById(actorId);
                            return actor ? `<span class="actor-tag">${actor.canonical_name}</span>` : '';
                        }).join('')}
                    </div>
                    <span class="sentiment-badge sentiment-${post.sentiment}">${post.sentiment}</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="margin-bottom: 1rem;">
            <p style="color: var(--text-secondary); line-height: 1.6;">${story.summary}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; padding: 1rem; background-color: var(--background-light); border-radius: var(--radius-lg);">
            <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Relevance</div>
                <div style="font-size: 1.5rem; font-weight: 600; color: ${story.relevance >= 0.8 ? 'var(--success-color)' : 'var(--warning-color)'};">${formatMetricValue(story.relevance)}</div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Cohesion</div>
                <div style="font-size: 1.5rem; font-weight: 600; color: ${story.cohesion >= 0.8 ? 'var(--success-color)' : 'var(--warning-color)'};">${formatMetricValue(story.cohesion)}</div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Freshness</div>
                <div style="font-size: 1.5rem; font-weight: 600; color: ${story.freshness >= 0.8 ? 'var(--success-color)' : 'var(--warning-color)'};">${formatMetricValue(story.freshness)}</div>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Posts</div>
                <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-color);">${story.size}</div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" data-tab="timeline">Timeline</button>
            <button class="tab" data-tab="actors">Actors (${story.top_actors.length})</button>
            <button class="tab" data-tab="posts">Posts (${story.posts.length})</button>
            <button class="tab" data-tab="similarity">Similarity</button>
        </div>

        <div class="tab-content active" id="timeline">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Timeline</h3>
            <div class="timeline">
                ${timeline}
            </div>
        </div>

        <div class="tab-content" id="actors">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Top Actors</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${actors}
            </div>
        </div>

        <div class="tab-content" id="posts">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Related Posts</h3>
            ${posts}
        </div>

        <div class="tab-content" id="similarity">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Similarity Breakdown</h3>
            <div style="background-color: var(--background-light); padding: 1.5rem; border-radius: var(--radius-lg);">
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-secondary);">Semantic Similarity</span>
                        <span style="color: var(--text-primary); font-weight: 600;">${formatMetricValue(story.similarity_breakdown.semantic_similarity)}</span>
                    </div>
                    <div style="background-color: var(--background-medium); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background-color: var(--primary-color); height: 100%; width: ${story.similarity_breakdown.semantic_similarity * 100}%;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-secondary);">Actor Overlap</span>
                        <span style="color: var(--text-primary); font-weight: 600;">${formatMetricValue(story.similarity_breakdown.actor_overlap)}</span>
                    </div>
                    <div style="background-color: var(--background-medium); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background-color: var(--success-color); height: 100%; width: ${story.similarity_breakdown.actor_overlap * 100}%;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-secondary);">Domain Similarity</span>
                        <span style="color: var(--text-primary); font-weight: 600;">${formatMetricValue(story.similarity_breakdown.domain_similarity)}</span>
                    </div>
                    <div style="background-color: var(--background-medium); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background-color: var(--info-color); height: 100%; width: ${story.similarity_breakdown.domain_similarity * 100}%;"></div>
                    </div>
                </div>
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: var(--text-secondary);">Temporal Proximity</span>
                        <span style="color: var(--text-primary); font-weight: 600;">${formatMetricValue(story.similarity_breakdown.temporal_proximity)}</span>
                    </div>
                    <div style="background-color: var(--background-medium); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background-color: var(--warning-color); height: 100%; width: ${story.similarity_breakdown.temporal_proximity * 100}%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupModalTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

function closeStoryModal() {
    const modal = document.getElementById('storyModal');
    modal.classList.remove('active');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Sort filter
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            renderStories(e.target.value);
        });
    }

    // Close modal on background click
    const modal = document.getElementById('storyModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeStoryModal();
            }
        });
    }

    // Search
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query) {
                const filtered = currentStories.filter(story =>
                    story.title.toLowerCase().includes(query) ||
                    story.summary.toLowerCase().includes(query)
                );
                const container = document.getElementById('storiesContainer');
                container.innerHTML = filtered.map(story => createStoryCard(story)).join('');
            } else {
                renderStories(currentSort);
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

window.openStoryModal = openStoryModal;
window.closeStoryModal = closeStoryModal;
window.navigateToActor = navigateToActor;
