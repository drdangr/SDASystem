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

        // Load stories immediately if data is already available
        if (window.AppData && window.AppData.stories) {
            this.stories = window.AppData.stories || [];
            console.log('StoriesView: Loaded', this.stories.length, 'stories on init');
            this.renderCurrentView();
        }

        // Listen for data loaded event (in case data loads later)
        window.addEventListener('dataLoaded', () => {
            this.stories = window.AppData.stories || [];
            console.log('StoriesView: Received dataLoaded event, stories count:', this.stories.length);
            this.renderCurrentView();
        });
    }

    renderCurrentView() {
        console.log('StoriesView: renderCurrentView called, view:', this.currentView, 'stories count:', this.stories.length);
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
            default:
                console.warn('StoriesView: Unknown view mode:', this.currentView);
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
        if (!container) {
            console.error('StoriesView: storiesList container not found!');
            return;
        }

        const sortedStories = this.sortStories();
        console.log('StoriesView: Rendering', sortedStories.length, 'stories');

        if (sortedStories.length === 0) {
            console.warn('StoriesView: No stories to render!');
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No stories found</div>';
            return;
        }

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

        // Clear previous graph and stop any running simulation
        svg.innerHTML = '';
        if (this.simulation) {
            cancelAnimationFrame(this.simulation);
        }

        const container = document.querySelector('.graph-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        // Initialize nodes with physics properties
        const nodes = this.stories.map((story, i) => ({
            id: story.id,
            x: Math.random() * (width - 200) + 100,
            y: Math.random() * (height - 200) + 100,
            vx: 0, // velocity x
            vy: 0, // velocity y
            r: Math.sqrt(story.relevance) * 30 + 15,
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
                    const sourceNode = nodes.find(n => n.id === this.stories[i].id);
                    const targetNode = nodes.find(n => n.id === this.stories[j].id);

                    links.push({
                        source: sourceNode,
                        target: targetNode,
                        strength: sharedActors.length
                    });
                }
            }
        }

        // Create SVG elements
        const linkElements = [];
        const nodeElements = [];

        // Render links
        links.forEach(link => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'graph-link');
            line.setAttribute('stroke-width', link.strength);
            svg.appendChild(line);
            linkElements.push({ element: line, link: link });
        });

        // Render nodes
        nodes.forEach(node => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'graph-node');
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
            text.textContent = node.story.title.substring(0, 25) + '...';

            g.appendChild(circle);
            g.appendChild(text);
            svg.appendChild(g);

            // Add click handler
            g.addEventListener('click', () => {
                this.selectStory(node.story);
            });

            nodeElements.push({ element: g, node: node });
        });

        // Force-directed simulation with stabilization
        let iteration = 0;
        let maxIterations = 300; // Stop after 300 iterations
        let stableCount = 0;
        const stabilityThreshold = 0.1; // Consider stable when max velocity < 0.1

        const simulate = () => {
            iteration++;
            let maxVelocity = 0;
            const linkStrength = 0.08;
            const repulsion = 5000;
            const centerStrength = 0.02;
            const damping = 0.9; // Increased damping for stability

            // Apply forces
            nodes.forEach(node => {
                // Reset acceleration
                let ax = 0;
                let ay = 0;

                // Repulsion between nodes with collision detection
                nodes.forEach(other => {
                    if (node === other) return;

                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                    // Minimum distance based on node radii with more padding
                    const minDist = node.r + other.r + 40; // Increased padding

                    // Strong repulsion when nodes are too close (collision)
                    if (dist < minDist) {
                        const force = (repulsion * 3) / (dist * dist);
                        ax += (dx / dist) * force;
                        ay += (dy / dist) * force;
                    }
                    // Normal repulsion at medium distance
                    else if (dist < 400) {
                        const force = repulsion / (dist * dist);
                        ax += (dx / dist) * force;
                        ay += (dy / dist) * force;
                    }
                });

                // Link attraction
                links.forEach(link => {
                    if (link.source === node) {
                        const dx = link.target.x - node.x;
                        const dy = link.target.y - node.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const idealDist = (node.r + link.target.r) * 2.5; // Ideal distance between connected nodes
                        const force = (dist - idealDist) * linkStrength * link.strength;

                        ax += (dx / dist) * force;
                        ay += (dy / dist) * force;
                    } else if (link.target === node) {
                        const dx = link.source.x - node.x;
                        const dy = link.source.y - node.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const idealDist = (node.r + link.source.r) * 2.5;
                        const force = (dist - idealDist) * linkStrength * link.strength;

                        ax += (dx / dist) * force;
                        ay += (dy / dist) * force;
                    }
                });

                // Center attraction (weaker)
                const centerX = width / 2;
                const centerY = height / 2;
                ax += (centerX - node.x) * centerStrength;
                ay += (centerY - node.y) * centerStrength;

                // Update velocity with stronger damping
                node.vx = (node.vx + ax) * damping;
                node.vy = (node.vy + ay) * damping;

                // Track max velocity for stability check
                const velocity = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                if (velocity > maxVelocity) {
                    maxVelocity = velocity;
                }

                // Update position
                node.x += node.vx;
                node.y += node.vy;

                // Boundary constraints with padding
                const padding = node.r + 20;
                node.x = Math.max(padding, Math.min(width - padding, node.x));
                node.y = Math.max(padding, Math.min(height - padding, node.y));
            });

            // Post-process: separate overlapping nodes more aggressively
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const nodeA = nodes[i];
                    const nodeB = nodes[j];

                    const dx = nodeB.x - nodeA.x;
                    const dy = nodeB.y - nodeA.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const minDist = nodeA.r + nodeB.r + 40; // Increased minimum distance

                    // If overlapping, push them apart more aggressively
                    if (dist < minDist) {
                        const pushDist = (minDist - dist) * 0.6; // More aggressive push
                        const angle = Math.atan2(dy, dx);

                        nodeA.x -= Math.cos(angle) * pushDist;
                        nodeA.y -= Math.sin(angle) * pushDist;
                        nodeB.x += Math.cos(angle) * pushDist;
                        nodeB.y += Math.sin(angle) * pushDist;
                    }
                }
            }

            // Update DOM elements
            linkElements.forEach(({ element, link }) => {
                element.setAttribute('x1', link.source.x);
                element.setAttribute('y1', link.source.y);
                element.setAttribute('x2', link.target.x);
                element.setAttribute('y2', link.target.y);
            });

            nodeElements.forEach(({ element, node }) => {
                element.setAttribute('transform', `translate(${node.x}, ${node.y})`);
            });

            // Check for stability
            if (maxVelocity < stabilityThreshold) {
                stableCount++;
            } else {
                stableCount = 0;
            }

            // Stop if stable for 10 iterations or max iterations reached
            if (stableCount >= 10 || iteration >= maxIterations) {
                console.log('Graph simulation stabilized after', iteration, 'iterations');
                this.simulation = null;
                return;
            }

            // Continue simulation
            this.simulation = requestAnimationFrame(simulate);
        };

        // Start simulation
        simulate();

        // Fallback: stop simulation after timeout
        setTimeout(() => {
            if (this.simulation) {
                cancelAnimationFrame(this.simulation);
                this.simulation = null;
            }
        }, 10000); // Stop after 10 seconds
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
