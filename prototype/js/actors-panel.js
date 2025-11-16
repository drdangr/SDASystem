// ============================================
// ACTORS-PANEL.JS - Actors panel in right sidebar
// ============================================

class ActorsPanel {
    constructor() {
        this.currentStory = null;
        this.actors = [];

        this.init();
    }

    init() {
        // Listen for story selection
        window.addEventListener('storySelected', (e) => {
            this.loadStoryActors(e.detail.story);
        });

        // Listen for data loaded event
        window.addEventListener('dataLoaded', () => {
            this.actors = window.AppData.actors || [];
        });
    }

    loadStoryActors(story) {
        this.currentStory = story;
        this.render();
    }

    render() {
        const container = document.getElementById('actorsListCompact');
        if (!container) return;

        if (!this.currentStory) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Select a story to view actors</div>';
            return;
        }

        // Get actors for current story
        const storyActors = this.currentStory.top_actors.map(actorId => {
            return window.getActorById(actorId);
        }).filter(actor => actor !== undefined);

        if (storyActors.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No actors found</div>';
            return;
        }

        // Render actors
        container.innerHTML = storyActors.map(actor => this.createActorItem(actor)).join('');

        // Add click handlers
        container.querySelectorAll('.actor-item-compact').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectActor(storyActors[index]);
            });
        });
    }

    createActorItem(actor) {
        const trendIcon = window.getTrendIcon(actor.trend);
        const avatar = actor.canonical_name.charAt(0).toUpperCase();

        return `
            <div class="actor-item-compact" data-actor-id="${actor.id}">
                <div class="actor-item-avatar" style="background: ${this.getActorColor(actor.type)};">
                    ${avatar}
                </div>
                <div class="actor-item-info">
                    <div class="actor-item-name">${actor.canonical_name}</div>
                    <div class="actor-item-meta">${actor.type} • ${actor.mentions_count} mentions</div>
                </div>
                <div class="actor-item-trend">
                    ${trendIcon}
                </div>
            </div>
        `;
    }

    getActorColor(type) {
        const colors = {
            'person': '#3b82f6',
            'company': '#06b6d4',
            'organization': '#8b5cf6',
            'country': '#10b981'
        };
        return colors[type] || '#6b7280';
    }

    selectActor(actor) {
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('actorSelected', {
            detail: { actor: actor }
        }));
    }
}

// Initialize
let actorsPanel;

function initActorsPanel() {
    actorsPanel = new ActorsPanel();
}

// Export
window.ActorsPanel = ActorsPanel;
window.initActorsPanel = initActorsPanel;
