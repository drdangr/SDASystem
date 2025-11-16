// ============================================
// TIMELINE.JS - Interactive timeline component
// ============================================

class TimelineView {
    constructor() {
        this.currentStory = null;
        this.events = [];
        this.filter = 'all'; // all, facts, opinions
        this.zoomLevel = 1;

        this.init();
    }

    init() {
        // Setup filters
        const filterButtons = document.querySelectorAll('.timeline-controls .filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filter = btn.dataset.filter;
                this.render();
            });
        });

        // Setup zoom controls
        document.getElementById('zoomIn')?.addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOut')?.addEventListener('click', () => this.zoom(0.8));
        document.getElementById('zoomReset')?.addEventListener('click', () => this.resetZoom());

        // Listen for story selection
        window.addEventListener('storySelected', (e) => {
            this.loadStory(e.detail.story);
        });
    }

    loadStory(story) {
        this.currentStory = story;
        this.events = story.timeline || [];
        this.render();
    }

    zoom(factor) {
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel));
        this.render();
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.render();
    }

    render() {
        const container = document.getElementById('timelineContainer');
        if (!container || !this.currentStory) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Select a story to view timeline</div>';
            return;
        }

        // Filter events
        const filteredEvents = this.events.filter(event => {
            if (this.filter === 'all') return true;
            if (this.filter === 'facts') return event.type === 'fact';
            if (this.filter === 'opinions') return event.type === 'opinion';
            return true;
        });

        if (filteredEvents.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No events in timeline</div>';
            return;
        }

        // Calculate timeline dimensions
        const dates = filteredEvents.map(e => new Date(e.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const timeSpan = maxDate - minDate || 1;

        const baseWidth = 1200;
        const width = baseWidth * this.zoomLevel;
        const eventWidth = 200;

        // Create timeline HTML
        container.innerHTML = `
            <div class="timeline-axis" style="min-width: ${width}px;">
                <div class="timeline-center-line"></div>
                ${filteredEvents.map((event, index) => {
                    const date = new Date(event.date);
                    const position = ((date - minDate) / timeSpan) * (width - event Width);

                    return this.createEventElement(event, position);
                }).join('')}
            </div>
        `;

        // Add click handlers for events
        container.querySelectorAll('.timeline-event').forEach((el, index) => {
            el.addEventListener('click', () => {
                this.showEventDetails(filteredEvents[index]);
            });
        });
    }

    createEventElement(event, position) {
        const post = window.getPostById(event.post_id);
        const formattedDate = window.formatDateTime(event.date);

        return `
            <div class="timeline-event ${event.type}" style="left: ${position}px;">
                <div class="timeline-event-marker"></div>
                <div class="timeline-event-card">
                    <div class="timeline-event-date">${formattedDate}</div>
                    <div class="timeline-event-content">${event.content}</div>
                    ${post ? `<div style="margin-top: 0.5rem; font-size: 0.65rem; color: var(--text-muted);">${post.domain}</div>` : ''}
                </div>
            </div>
        `;
    }

    showEventDetails(event) {
        const post = window.getPostById(event.post_id);
        if (post) {
            // Dispatch event to show post details
            window.dispatchEvent(new CustomEvent('postSelected', {
                detail: { post: post }
            }));
        }
    }
}

// Initialize
let timelineView;

function initTimeline() {
    timelineView = new TimelineView();
}

// Export
window.TimelineView = TimelineView;
window.initTimeline = initTimeline;
