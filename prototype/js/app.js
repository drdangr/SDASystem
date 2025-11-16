// ============================================
// APP.JS - Common utilities and data loading
// ============================================

// Global data store
const AppData = {
    stories: [],
    actors: [],
    posts: [],
    relationships: []
};

// ============================================
// DATA LOADING
// ============================================

async function loadData() {
    try {
        console.log('Loading data from JSON files...');
        // Load all data in parallel with cache busting
        const cacheBuster = '?v=' + Date.now();
        const [storiesRes, actorsRes, postsRes, relationshipsRes] = await Promise.all([
            fetch('data/stories.json' + cacheBuster),
            fetch('data/actors.json' + cacheBuster),
            fetch('data/posts.json' + cacheBuster),
            fetch('data/relationships.json' + cacheBuster)
        ]);

        // Check if responses are OK
        if (!storiesRes.ok) {
            console.error('Failed to load stories.json:', storiesRes.status, storiesRes.statusText);
        }
        if (!actorsRes.ok) {
            console.error('Failed to load actors.json:', actorsRes.status, actorsRes.statusText);
        }
        if (!postsRes.ok) {
            console.error('Failed to load posts.json:', postsRes.status, postsRes.statusText);
        }
        if (!relationshipsRes.ok) {
            console.error('Failed to load relationships.json:', relationshipsRes.status, relationshipsRes.statusText);
        }

        const [storiesData, actorsData, postsData, relationshipsData] = await Promise.all([
            storiesRes.json(),
            actorsRes.json(),
            postsRes.json(),
            relationshipsRes.json()
        ]);

        AppData.stories = storiesData.stories || [];
        AppData.actors = actorsData.actors || [];
        AppData.posts = postsData.posts || [];
        AppData.relationships = relationshipsData.relationships || [];

        console.log('Data loaded successfully:', AppData);
        console.log('Stories count:', AppData.stories.length);
        console.log('Actors count:', AppData.actors.length);
        console.log('Posts count:', AppData.posts.length);
        console.log('Relationships count:', AppData.relationships.length);
        
        if (AppData.stories.length === 0) {
            console.warn('WARNING: No stories loaded!');
        }
        
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error details:', error.message, error.stack);
        return false;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getActorById(actorId) {
    return AppData.actors.find(actor => actor.id === actorId);
}

function getPostById(postId) {
    return AppData.posts.find(post => post.id === postId);
}

function getStoryById(storyId) {
    return AppData.stories.find(story => story.id === storyId);
}

function getActorRelationships(actorId) {
    return AppData.relationships.filter(
        rel => rel.from_actor === actorId || rel.to_actor === actorId
    );
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
        return `${diffMins} min ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getMetricClass(value) {
    if (value >= 0.8) return 'high';
    if (value >= 0.5) return 'medium';
    return 'low';
}

function formatMetricValue(value) {
    return (value * 100).toFixed(0) + '%';
}

function getTrendIcon(trend) {
    switch (trend) {
        case 'up': return '↗';
        case 'down': return '↘';
        case 'stable': return '→';
        default: return '—';
    }
}

// ============================================
// EXPORT
// ============================================

window.AppData = AppData;
window.loadData = loadData;
window.getActorById = getActorById;
window.getPostById = getPostById;
window.getStoryById = getStoryById;
window.getActorRelationships = getActorRelationships;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.getMetricClass = getMetricClass;
window.formatMetricValue = formatMetricValue;
window.getTrendIcon = getTrendIcon;
