// ============================================
// STORIES-VIEW.JS - Stories rendering (list/graph/tree)
// ============================================

class StoriesView {
    constructor() {
        this.stories = [];
        this.selectedStory = null;
        this.currentView = 'list';
        this.sortBy = 'relevance';

        this.init();
    }

    init() {
        // Setup sort dropdown
        const sortSelect = document.getElementById('storySortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.renderCurrentView();
            });
        }

        // Listen for view mode changes
        window.addEventListener('viewModeChanged', (e) => {
            this.currentView = e.detail.mode;
            this.renderCurrentView();
        });

        // Listen for data loaded event
        window.addEventListener('dataLoaded', () => {
            this.stories = window.AppData.stories || [];
            this.renderCurrentView();
        });
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'list':
                this.renderList();
                break;
            case 'graph':
                this.renderGraph();
                break;
            case 'tree':
                this.renderTree();
                break;
        }
    }

    sortStories() {
        return [...this.stories].sort((a, b) => {
            switch (this.sortBy) {
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
    }

    renderList() {
        const container = document.getElementById('storiesList');
        if (!container) return;

        const sortedStories = this.sortStories();

        container.innerHTML = sortedStories.map(story => this.createStoryListItem(story)).join('');

        // Add click listeners
        container.querySelectorAll('.story-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectStory(sortedStories[index]);
            });
        });
    }

    createStoryListItem(story) {
        const metricClass = (value) => {
            if (value >= 0.8) return 'high';
            if (value >= 0.5) return 'medium';
            return 'low';
        };

        const formatPercent = (value) => Math.round(value * 100) + '%';

        const topActors = story.top_actors.slice(0, 3).map(actorId => {
            const actor = window.getActorById(actorId);
            return actor ? `<span class="actor-chip">${actor.canonical_name}</span>` : '';
        }).join('');

        const isSelected = this.selectedStory && this.selectedStory.id === story.id ? 'selected' : '';

        return `
            <div class="story-item ${isSelected}" data-story-id="${story.id}">
                <div class="story-item-header">
                    <div>
                        <div class="story-item-title">${story.title}</div>
                    </div>
                    <div class="story-item-metrics">
                        <span class="metric-badge ${metricClass(story.relevance)}" title="Relevance">
                            ${formatPercent(story.relevance)}
                        </span>
                    </div>
                </div>
                <div class="story-item-meta">
                    <span>${story.size} posts</span>
                    <span>•</span>
                    <span>${window.formatDate(story.updated_at)}</span>
                </div>
                ${topActors ? `<div class="story-item-actors">${topActors}</div>` : ''}
            </div>
        `;
    }

    renderGraph() {
        const svg = document.getElementById('storiesGraphSvg');
        if (!svg) return;

        // Clear previous graph
        svg.innerHTML = '';

        const container = document.querySelector('.graph-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        // Simple force-directed graph (without D3, basic implementation)
        const nodes = this.stories.map((story, i) => ({
            id: story.id,
            x: Math.random() * (width - 100) + 50,
            y: Math.random() * (height - 100) + 50,
            r: Math.sqrt(story.relevance) * 30 + 10,
            story: story
        }));

        // Create links based on shared actors
        const links = [];
        for (let i = 0; i < this.stories.length; i++) {
            for (let j = i + 1; j < this.stories.length; j++) {
                const sharedActors = this.stories[i].top_actors.filter(a =>
                    this.stories[j].top_actors.includes(a)
                );

                if (sharedActors.length > 0) {
                    links.push({
                        source: this.stories[i].id,
                        target: this.stories[j].id,
                        strength: sharedActors.length
                    });
                }
            }
        }

        // Render links
        links.forEach(link => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);

            if (sourceNode && targetNode) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('class', 'graph-link');
                line.setAttribute('x1', sourceNode.x);
                line.setAttribute('y1', sourceNode.y);
                line.setAttribute('x2', targetNode.x);
                line.setAttribute('y2', targetNode.y);
                line.setAttribute('stroke-width', link.strength);
                svg.appendChild(line);
            }
        });

        // Render nodes
        nodes.forEach(node => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'graph-node');
            g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
            g.style.cursor = 'pointer';

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', node.r);
            circle.setAttribute('fill', '#3b82f6');
            circle.setAttribute('stroke', '#1e293b');
            circle.setAttribute('stroke-width', '2');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dy', node.r + 15);
            text.setAttribute('fill', '#d1d5db');
            text.setAttribute('font-size', '12');
            text.textContent = node.story.title.substring(0, 20) + '...';

            g.appendChild(circle);
            g.appendChild(text);
            svg.appendChild(g);

            // Add click handler
            g.addEventListener('click', () => {
                this.selectStory(node.story);
            });
        });
    }

    renderTree() {
        const container = document.getElementById('domainTree');
        if (!container) return;

        // Group stories by domain (simulated - would come from backend)
        const domains = {
            'Technology': {
                'AI & Machine Learning': [],
                'Software & Platforms': []
            },
            'Politics': {
                'International Relations': [],
                'Domestic Policy': []
            },
            'Economy': {
                'Markets': [],
                'Corporate': []
            }
        };

        // Categorize stories (simplified - would use real classification)
        this.stories.forEach(story => {
            // Simple heuristic based on keywords in title
            if (story.title.toLowerCase().includes('ai') ||
                story.title.toLowerCase().includes('gpt') ||
                story.title.toLowerCase().includes('tech')) {
                domains['Technology']['AI & Machine Learning'].push(story);
            } else if (story.title.toLowerCase().includes('regulation') ||
                      story.title.toLowerCase().includes('congress')) {
                domains['Politics']['Domestic Policy'].push(story);
            } else if (story.title.toLowerCase().includes('funding') ||
                      story.title.toLowerCase().includes('investment')) {
                domains['Economy']['Corporate'].push(story);
            }
        });

        // Render tree
        container.innerHTML = Object.entries(domains).map(([domainName, subdomains]) =>
            this.createTreeNode(domainName, subdomains, 0)
        ).join('');

        // Add click handlers
        container.querySelectorAll('.tree-node').forEach(node => {
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                const storyId = node.dataset.storyId;
                if (storyId) {
                    const story = this.stories.find(s => s.id === storyId);
                    if (story) {
                        this.selectStory(story);
                    }
                } else {
                    // Toggle children
                    const children = node.nextElementSibling;
                    if (children && children.classList.contains('tree-children')) {
                        const isExpanded = children.style.display !== 'none';
                        children.style.display = isExpanded ? 'none' : 'block';

                        const icon = node.querySelector('.tree-node-icon');
                        if (icon) {
                            icon.textContent = isExpanded ? '▶' : '▼';
                        }
                    }
                }
            });
        });
    }

    createTreeNode(label, content, level) {
        const isStory = content.id !== undefined; // Check if it's a story object

        if (isStory) {
            return `
                <div class="tree-node" data-story-id="${content.id}">
                    <div class="tree-node-content">
                        <span class="tree-node-icon">📄</span>
                        <span class="tree-node-label">${content.title}</span>
                        <span class="tree-node-count">${Math.round(content.relevance * 100)}%</span>
                    </div>
                </div>
            `;
        }

        // It's a category
        const children = typeof content === 'object' && !Array.isArray(content)
            ? Object.entries(content).map(([key, val]) =>
                Array.isArray(val)
                    ? val.map(story => this.createTreeNode(story.title, story, level + 1)).join('')
                    : this.createTreeNode(key, val, level + 1)
              ).join('')
            : '';

        const count = this.countStories(content);

        return `
            <div class="tree-node">
                <div class="tree-node-content">
                    <span class="tree-node-icon">▼</span>
                    <span class="tree-node-label">${label}</span>
                    <span class="tree-node-count">${count}</span>
                </div>
            </div>
            ${children ? `<div class="tree-children">${children}</div>` : ''}
        `;
    }

    countStories(content) {
        if (Array.isArray(content)) {
            return content.length;
        }
        if (typeof content === 'object') {
            return Object.values(content).reduce((sum, val) => sum + this.countStories(val), 0);
        }
        return 0;
    }

    selectStory(story) {
        this.selectedStory = story;

        // Update selection in list view
        const storyItems = document.querySelectorAll('.story-item');
        storyItems.forEach(item => {
            if (item.dataset.storyId === story.id) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('storySelected', {
            detail: { story: story }
        }));
    }
}

// Initialize
let storiesView;

function initStoriesView() {
    storiesView = new StoriesView();
}

// Export
window.StoriesView = StoriesView;
window.initStoriesView = initStoriesView;
