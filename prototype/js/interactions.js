// ============================================
// INTERACTIONS.JS - Cross-panel interactions and highlighting
// ============================================

class InteractionsManager {
    constructor() {
        this.currentStory = null;
        this.currentActor = null;
        this.currentPost = null;

        this.init();
    }

    init() {
        // Listen for story selection
        window.addEventListener('storySelected', (e) => {
            this.handleStorySelected(e.detail.story);
        });

        // Listen for actor selection
        window.addEventListener('actorSelected', (e) => {
            this.handleActorSelected(e.detail.actor);
        });

        // Listen for post selection
        window.addEventListener('postSelected', (e) => {
            this.handlePostSelected(e.detail.post);
        });
    }

    handleStorySelected(story) {
        this.currentStory = story;

        // Update breadcrumb
        this.updateBreadcrumb(['Stories', story.title]);

        // Show story detail in center panel
        this.showStoryDetail(story);

        // Update timeline (already handled by timeline.js)

        // Update actors panel (already handled by actors-panel.js)

        // Hide welcome screen
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
    }

    handleActorSelected(actor) {
        this.currentActor = actor;

        // Update breadcrumb
        if (this.currentStory) {
            this.updateBreadcrumb(['Stories', this.currentStory.title, actor.canonical_name]);
        } else {
            this.updateBreadcrumb(['Actors', actor.canonical_name]);
        }

        // Show actor detail in center panel
        this.showActorDetail(actor);

        // Highlight actor in timeline
        this.highlightActorInTimeline(actor);
    }

    handlePostSelected(post) {
        this.currentPost = post;

        // Show post detail in center panel
        // For now, we'll open it in a new window
        window.open(post.url, '_blank');
    }

    updateBreadcrumb(items) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = items.map((item, index) => {
            const isLast = index === items.length - 1;
            return `
                <span class="breadcrumb-item ${isLast ? '' : 'clickable'}">${item}</span>
                ${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}
            `;
        }).join('');

        // Add click handlers for navigation
        const breadcrumbItems = breadcrumb.querySelectorAll('.breadcrumb-item.clickable');
        breadcrumbItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                if (index === 0) {
                    // Back to stories list
                    this.backToStoriesList();
                } else if (index === 1 && this.currentStory) {
                    // Back to story detail
                    this.handleStorySelected(this.currentStory);
                }
            });
        });
    }

    showStoryDetail(story) {
        const storyDetail = document.getElementById('storyDetail');
        const actorDetail = document.getElementById('actorDetail');

        if (actorDetail) actorDetail.style.display = 'none';
        if (!storyDetail) return;

        storyDetail.style.display = 'block';
        storyDetail.innerHTML = this.createStoryDetailHTML(story);

        // Add event listeners for actor clicks
        storyDetail.querySelectorAll('.actor-card-mini').forEach((card, index) => {
            card.addEventListener('click', () => {
                const actorId = card.dataset.actorId;
                const actor = window.getActorById(actorId);
                if (actor) {
                    this.handleActorSelected(actor);
                }
            });
        });

        // Add event listeners for post clicks
        storyDetail.querySelectorAll('.post-card-compact').forEach((card) => {
            card.addEventListener('click', () => {
                const postId = card.dataset.postId;
                const post = window.getPostById(postId);
                if (post) {
                    this.handlePostSelected(post);
                }
            });
        });
    }

    createStoryDetailHTML(story) {
        const formatPercent = (value) => Math.round(value * 100) + '%';
        const getBadgeClass = (value) => value >= 0.8 ? 'high' : value >= 0.5 ? 'medium' : 'low';

        // Top actors
        const topActors = story.top_actors.slice(0, 6).map(actorId => {
            const actor = window.getActorById(actorId);
            if (!actor) return '';

            const avatar = actor.canonical_name.charAt(0).toUpperCase();
            return `
                <div class="actor-card-mini" data-actor-id="${actor.id}">
                    <div class="actor-avatar">${avatar}</div>
                    <div class="actor-card-mini-name">${actor.canonical_name}</div>
                    <div class="actor-card-mini-type">${actor.type}</div>
                </div>
            `;
        }).join('');

        // Posts
        const posts = story.posts.slice(0, 10).map(postId => {
            const post = window.getPostById(postId);
            if (!post) return '';

            return `
                <div class="post-card-compact" data-post-id="${post.id}">
                    <div class="post-card-title">${post.title}</div>
                    <div class="post-card-meta">${post.domain} • ${window.formatDate(post.published_at)}</div>
                    <div class="post-card-summary">${post.summary}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="story-detail-header">
                <h1 class="story-detail-title">${story.title}</h1>

                <div class="story-detail-badges">
                    <div class="badge">
                        <span>Relevance:</span>
                        <span class="badge-value ${getBadgeClass(story.relevance)}">${formatPercent(story.relevance)}</span>
                    </div>
                    <div class="badge">
                        <span>Cohesion:</span>
                        <span class="badge-value ${getBadgeClass(story.cohesion)}">${formatPercent(story.cohesion)}</span>
                    </div>
                    <div class="badge">
                        <span>Freshness:</span>
                        <span class="badge-value ${getBadgeClass(story.freshness)}">${formatPercent(story.freshness)}</span>
                    </div>
                    <div class="badge">
                        <span>Posts:</span>
                        <span class="badge-value">${story.size}</span>
                    </div>
                </div>

                <div class="story-detail-actions">
                    <button class="action-btn">🔄 Refresh</button>
                    <button class="action-btn">🧩 Merge</button>
                    <button class="action-btn">✂️ Split</button>
                    <button class="action-btn">❄️ Freeze</button>
                </div>
            </div>

            <div class="story-detail-abstract">
                <h3 style="margin-bottom: 1rem; font-size: 1rem;">Summary</h3>
                <ul>
                    ${story.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
                </ul>
            </div>

            <div class="story-detail-section">
                <h3 class="section-title">Top Actors (${story.top_actors.length})</h3>
                <div class="top-actors-grid">
                    ${topActors}
                </div>
            </div>

            <div class="story-detail-section">
                <h3 class="section-title">Related Posts (${story.posts.length})</h3>
                <div class="posts-list">
                    ${posts}
                </div>
            </div>
        `;
    }

    showActorDetail(actor) {
        const storyDetail = document.getElementById('storyDetail');
        const actorDetail = document.getElementById('actorDetail');

        if (storyDetail) storyDetail.style.display = 'none';
        if (!actorDetail) return;

        actorDetail.style.display = 'block';
        actorDetail.innerHTML = this.createActorDetailHTML(actor);
    }

    createActorDetailHTML(actor) {
        const avatar = actor.canonical_name.charAt(0).toUpperCase();
        const trendIcon = window.getTrendIcon(actor.trend);

        // Get mentions
        const mentions = window.AppData.posts.filter(post =>
            post.actors.includes(actor.id)
        ).slice(0, 10);

        const mentionsHTML = mentions.map(post => `
            <div class="post-card-compact" data-post-id="${post.id}">
                <div class="post-card-title">${post.title}</div>
                <div class="post-card-meta">${post.domain} • ${window.formatDate(post.published_at)}</div>
                <div class="post-card-summary">${post.summary}</div>
            </div>
        `).join('');

        // Get relationships
        const relationships = window.getActorRelationships(actor.id);
        const relationshipsHTML = relationships.map(rel => {
            const isFrom = rel.from_actor === actor.id;
            const otherActorId = isFrom ? rel.to_actor : rel.from_actor;
            const otherActor = window.getActorById(otherActorId);

            if (!otherActor) return '';

            return `
                <div class="actor-item-compact" style="margin-bottom: 0.5rem;">
                    <div class="actor-item-avatar" style="background: #8b5cf6; width: 32px; height: 32px; font-size: 1rem;">
                        ${otherActor.canonical_name.charAt(0)}
                    </div>
                    <div class="actor-item-info">
                        <div class="actor-item-name">${otherActor.canonical_name}</div>
                        <div class="actor-item-meta">${rel.type.replace('_', ' ')}</div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="story-detail-header">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    <div class="actor-avatar" style="width: 64px; height: 64px; font-size: 2rem;">
                        ${avatar}
                    </div>
                    <div>
                        <h1 class="story-detail-title" style="margin-bottom: 0.25rem;">${actor.canonical_name}</h1>
                        <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.85rem;">
                            ${actor.type}
                        </div>
                    </div>
                    <div style="margin-left: auto; font-size: 2rem;">
                        ${trendIcon}
                    </div>
                </div>

                <div class="story-detail-badges">
                    <div class="badge">
                        <span>Mentions:</span>
                        <span class="badge-value">${actor.mentions_count}</span>
                    </div>
                    <div class="badge">
                        <span>Trend:</span>
                        <span class="badge-value">${actor.trend}</span>
                    </div>
                    <div class="badge">
                        <span>Updated:</span>
                        <span class="badge-value">${window.formatDate(actor.updated_at)}</span>
                    </div>
                </div>
            </div>

            <div class="story-detail-section">
                <h3 class="section-title">Aliases</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${actor.aliases.map(alias =>
                        `<span class="actor-chip">${alias}</span>`
                    ).join('')}
                </div>
            </div>

            ${relationshipsHTML ? `
                <div class="story-detail-section">
                    <h3 class="section-title">Relationships (${relationships.length})</h3>
                    ${relationshipsHTML}
                </div>
            ` : ''}

            <div class="story-detail-section">
                <h3 class="section-title">Recent Mentions (${mentions.length})</h3>
                <div class="posts-list">
                    ${mentionsHTML}
                </div>
            </div>
        `;
    }

    highlightActorInTimeline(actor) {
        // This would highlight events in timeline where this actor is mentioned
        // Implementation depends on timeline structure
    }

    backToStoriesList() {
        this.currentStory = null;
        this.currentActor = null;

        const welcomeScreen = document.getElementById('welcomeScreen');
        const storyDetail = document.getElementById('storyDetail');
        const actorDetail = document.getElementById('actorDetail');

        if (welcomeScreen) welcomeScreen.style.display = 'flex';
        if (storyDetail) storyDetail.style.display = 'none';
        if (actorDetail) actorDetail.style.display = 'none';

        this.updateBreadcrumb(['Stories']);

        // Clear timeline
        const timelineContainer = document.getElementById('timelineContainer');
        if (timelineContainer) {
            timelineContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Select a story to view timeline</div>';
        }

        // Clear actors panel
        const actorsContainer = document.getElementById('actorsListCompact');
        if (actorsContainer) {
            actorsContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Select a story to view actors</div>';
        }
    }
}

// Initialize
let interactionsManager;

function initInteractions() {
    interactionsManager = new InteractionsManager();
}

// Export
window.InteractionsManager = InteractionsManager;
window.initInteractions = initInteractions;
