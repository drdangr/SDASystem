// ============================================
// ACTORS.JS - Actors page functionality
// ============================================

let currentActors = [];
let currentFilters = {
    type: 'all',
    trend: 'all',
    sort: 'mentions'
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();

    // Check if there's an actor ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const actorId = urlParams.get('id');

    if (actorId) {
        openActorModal(actorId);
    }

    renderActors();
    setupEventListeners();
});

// ============================================
// RENDER ACTORS
// ============================================

function renderActors() {
    const container = document.getElementById('actorsGrid');

    // Filter actors
    let filtered = [...AppData.actors];

    if (currentFilters.type !== 'all') {
        filtered = filtered.filter(a => a.type === currentFilters.type);
    }

    if (currentFilters.trend !== 'all') {
        filtered = filtered.filter(a => a.trend === currentFilters.trend);
    }

    // Sort actors
    filtered.sort((a, b) => {
        switch (currentFilters.sort) {
            case 'name':
                return a.canonical_name.localeCompare(b.canonical_name);
            case 'updated':
                return new Date(b.updated_at) - new Date(a.updated_at);
            case 'mentions':
            default:
                return b.mentions_count - a.mentions_count;
        }
    });

    currentActors = filtered;
    container.innerHTML = filtered.map(actor => createActorCard(actor)).join('');
}

function createActorCard(actor) {
    return `
        <div class="actor-card" onclick="openActorModal('${actor.id}')">
            <div class="actor-header">
                <div class="actor-info">
                    <h3 class="actor-name">${actor.canonical_name}</h3>
                    <span class="actor-type">${actor.type}</span>
                </div>
                <div class="trend-indicator ${actor.trend}">
                    ${getTrendIcon(actor.trend)}
                </div>
            </div>

            <div class="actor-stats">
                <div class="actor-stat">
                    <span class="actor-stat-label">Mentions</span>
                    <span class="actor-stat-value">${actor.mentions_count}</span>
                </div>
                <div class="actor-stat">
                    <span class="actor-stat-label">Last Update</span>
                    <span class="actor-stat-value" style="font-size: 0.875rem;">${formatDate(actor.updated_at)}</span>
                </div>
            </div>

            <div class="actor-aliases">
                <div class="actor-aliases-label">Aliases:</div>
                <div class="aliases-list">
                    ${actor.aliases.slice(0, 3).map(alias =>
                        `<span class="alias-tag">${alias}</span>`
                    ).join('')}
                    ${actor.aliases.length > 3 ? `<span class="alias-tag">+${actor.aliases.length - 3}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MODAL
// ============================================

function openActorModal(actorId) {
    const actor = getActorById(actorId);
    if (!actor) return;

    const modal = document.getElementById('actorModal');
    const modalTitle = document.getElementById('actorModalTitle');
    const modalBody = document.getElementById('actorModalBody');

    modalTitle.textContent = actor.canonical_name;
    modalBody.innerHTML = createActorDetailView(actor);

    modal.classList.add('active');

    // Setup tabs
    setupModalTabs();
}

function createActorDetailView(actor) {
    // Get relationships
    const relationships = getActorRelationships(actor.id);

    // Get mentions (posts that mention this actor)
    const mentions = AppData.posts.filter(post => post.actors.includes(actor.id))
        .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    // Get stories this actor is in
    const stories = AppData.stories.filter(story => story.top_actors.includes(actor.id))
        .sort((a, b) => b.relevance - a.relevance);

    // Create relationship HTML
    const relationshipsHTML = relationships.map(rel => {
        const isFrom = rel.from_actor === actor.id;
        const otherActorId = isFrom ? rel.to_actor : rel.from_actor;
        const otherActor = getActorById(otherActorId);

        if (!otherActor) return '';

        const direction = isFrom ? '→' : '←';

        return `
            <div class="relationship-item">
                <span style="color: var(--text-primary); font-weight: 600;">${otherActor.canonical_name}</span>
                <span style="color: var(--text-muted);">${direction}</span>
                <span class="relationship-type">${rel.type.replace('_', ' ')}</span>
                ${rel.role ? `<span style="color: var(--text-secondary); font-size: 0.875rem;">(${rel.role})</span>` : ''}
            </div>
        `;
    }).join('');

    // Create mentions HTML
    const mentionsHTML = mentions.slice(0, 10).map(post => `
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
                    ${post.actors.filter(id => id !== actor.id).slice(0, 3).map(actorId => {
                        const a = getActorById(actorId);
                        return a ? `<span class="actor-tag">${a.canonical_name}</span>` : '';
                    }).join('')}
                </div>
                <span class="sentiment-badge sentiment-${post.sentiment}">${post.sentiment}</span>
            </div>
        </div>
    `).join('');

    // Create stories HTML
    const storiesHTML = stories.map(story => `
        <div class="story-card" onclick="navigateToStory('${story.id}')" style="margin-bottom: 1rem; cursor: pointer;">
            <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">${story.title}</h4>
            <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">${story.summary}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 1rem;">
                    <span class="badge badge-info">${story.size} posts</span>
                    <span style="color: var(--text-muted); font-size: 0.875rem;">${formatDate(story.updated_at)}</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <span class="metric-value ${getMetricClass(story.relevance)}" style="font-size: 0.875rem;">
                        Rel: ${formatMetricValue(story.relevance)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');

    return `
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <div style="display: inline-block; background-color: var(--background-light); color: var(--text-secondary); padding: 0.25rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.875rem; text-transform: uppercase; margin-bottom: 0.5rem;">
                        ${actor.type}
                    </div>
                    <div style="color: var(--text-secondary);">Status: <span style="color: var(--success-color);">${actor.status}</span></div>
                </div>
                <div class="trend-indicator ${actor.trend}" style="font-size: 2rem;">
                    ${getTrendIcon(actor.trend)}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 1rem; background-color: var(--background-light); border-radius: var(--radius-lg);">
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Total Mentions</div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: var(--primary-color);">${actor.mentions_count}</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Trend</div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: ${actor.trend === 'up' ? 'var(--success-color)' : actor.trend === 'down' ? 'var(--danger-color)' : 'var(--info-color)'};">
                        ${actor.trend.toUpperCase()}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.25rem;">Last Update</div>
                    <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-top: 0.25rem;">${formatDate(actor.updated_at)}</div>
                </div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" data-tab="overview">Overview</button>
            <button class="tab" data-tab="mentions">Mentions (${mentions.length})</button>
            <button class="tab" data-tab="stories">Stories (${stories.length})</button>
            <button class="tab" data-tab="relationships">Relationships (${relationships.length})</button>
            <button class="tab" data-tab="aliases">Aliases (${actor.aliases.length})</button>
        </div>

        <div class="tab-content active" id="overview">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Overview</h3>

            <div style="background-color: var(--background-light); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem;">
                <h4 style="color: var(--text-primary); margin-bottom: 1rem;">Top Domains</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${actor.top_domains.map(domain =>
                        `<span class="actor-tag">${domain}</span>`
                    ).join('')}
                </div>
            </div>

            <div style="background-color: var(--background-light); padding: 1.5rem; border-radius: var(--radius-lg);">
                <h4 style="color: var(--text-primary); margin-bottom: 1rem;">Recent Activity</h4>
                <p style="color: var(--text-secondary);">
                    ${actor.canonical_name} has been mentioned ${actor.mentions_count} times across various sources.
                    The actor is currently trending ${actor.trend} with most mentions from ${actor.top_domains[0]}.
                </p>
            </div>
        </div>

        <div class="tab-content" id="mentions">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Recent Mentions</h3>
            ${mentionsHTML || '<p style="color: var(--text-secondary);">No mentions found.</p>'}
        </div>

        <div class="tab-content" id="stories">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Related Stories</h3>
            ${storiesHTML || '<p style="color: var(--text-secondary);">No stories found.</p>'}
        </div>

        <div class="tab-content" id="relationships">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Relationships</h3>
            <div class="relationships-graph">
                ${relationshipsHTML || '<p style="color: var(--text-secondary);">No relationships found.</p>'}
            </div>
        </div>

        <div class="tab-content" id="aliases">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Known Aliases</h3>
            <div style="background-color: var(--background-light); padding: 1.5rem; border-radius: var(--radius-lg);">
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${actor.aliases.map(alias =>
                        `<span class="actor-tag" style="font-size: 1rem; padding: 0.5rem 1rem;">${alias}</span>`
                    ).join('')}
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

function closeActorModal() {
    const modal = document.getElementById('actorModal');
    modal.classList.remove('active');

    // Remove actor ID from URL
    const url = new URL(window.location);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', url);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Type filter
    const typeSelect = document.getElementById('actorType');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            currentFilters.type = e.target.value;
            renderActors();
        });
    }

    // Trend filter
    const trendSelect = document.getElementById('trendFilter');
    if (trendSelect) {
        trendSelect.addEventListener('change', (e) => {
            currentFilters.trend = e.target.value;
            renderActors();
        });
    }

    // Sort filter
    const sortSelect = document.getElementById('sortActorsBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentFilters.sort = e.target.value;
            renderActors();
        });
    }

    // Close modal on background click
    const modal = document.getElementById('actorModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeActorModal();
            }
        });
    }

    // Search
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query) {
                const filtered = currentActors.filter(actor =>
                    actor.canonical_name.toLowerCase().includes(query) ||
                    actor.aliases.some(alias => alias.toLowerCase().includes(query))
                );
                const container = document.getElementById('actorsGrid');
                container.innerHTML = filtered.map(actor => createActorCard(actor)).join('');
            } else {
                renderActors();
            }
        });
    }
}

// ============================================
// NAVIGATION
// ============================================

function navigateToStory(storyId) {
    window.location.href = `index.html?id=${storyId}`;
}

// ============================================
// EXPORT
// ============================================

window.openActorModal = openActorModal;
window.closeActorModal = closeActorModal;
window.navigateToStory = navigateToStory;
