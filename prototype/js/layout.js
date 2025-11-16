// ============================================
// LAYOUT.JS - Resizable panels and layout management
// ============================================

class LayoutManager {
    constructor() {
        this.isResizing = false;
        this.currentResizer = null;
        this.startX = 0;
        this.startWidth = 0;

        this.init();
    }

    init() {
        // Setup resizers
        const leftResizer = document.getElementById('leftResizer');
        const centerResizer = document.getElementById('centerResizer');

        if (leftResizer) {
            this.setupResizer(leftResizer, 'left');
        }

        if (centerResizer) {
            this.setupResizer(centerResizer, 'right');
        }

        // Setup view mode switcher
        this.setupViewModeSwitcher();

        // Setup tab switcher
        this.setupTabSwitcher();

        // Setup slide panels
        this.setupSlidePanels();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupResizer(resizer, side) {
        resizer.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            this.currentResizer = resizer;
            this.startX = e.clientX;

            const panel = side === 'left'
                ? document.getElementById('leftPanel')
                : document.getElementById('rightPanel');

            this.startWidth = panel.offsetWidth;

            resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            // Add global mouse move and mouse up listeners
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        });
    }

    handleMouseMove = (e) => {
        if (!this.isResizing) return;

        const delta = e.clientX - this.startX;
        const isLeftPanel = this.currentResizer.id === 'leftResizer';

        let newWidth;
        if (isLeftPanel) {
            newWidth = this.startWidth + delta;
        } else {
            newWidth = this.startWidth - delta;
        }

        // Min and max constraints
        const minWidth = 250;
        const maxWidth = 600;

        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

        const panel = isLeftPanel
            ? document.getElementById('leftPanel')
            : document.getElementById('rightPanel');

        panel.style.width = newWidth + 'px';

        // Update CSS variable
        const varName = isLeftPanel ? '--left-panel-width' : '--right-panel-width';
        document.documentElement.style.setProperty(varName, newWidth + 'px');
    }

    handleMouseUp = () => {
        if (this.isResizing) {
            this.isResizing = false;
            this.currentResizer.classList.remove('resizing');
            this.currentResizer = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseUp);
        }
    }

    setupViewModeSwitcher() {
        const viewButtons = document.querySelectorAll('.view-btn');
        const viewModes = document.querySelectorAll('.view-mode');

        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.dataset.view;

                // Update button states
                viewButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update view modes
                viewModes.forEach(mode => {
                    if (mode.dataset.view === targetView) {
                        mode.classList.add('active');
                    } else {
                        mode.classList.remove('active');
                    }
                });

                // Trigger view-specific initialization
                this.triggerViewChange(targetView);
            });
        });
    }

    setupTabSwitcher() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                // Update button states
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update tab contents
                tabContents.forEach(content => {
                    if (content.id === targetTab + 'Tab') {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });

                // Trigger tab-specific initialization
                this.triggerTabChange(targetTab);
            });
        });
    }

    setupSlidePanels() {
        // Filters panel
        const filtersBtn = document.getElementById('filtersBtn');
        const filtersPanel = document.getElementById('filtersPanel');
        const closeFilters = document.getElementById('closeFilters');

        if (filtersBtn && filtersPanel) {
            filtersBtn.addEventListener('click', () => {
                filtersPanel.classList.toggle('open');
            });
        }

        if (closeFilters && filtersPanel) {
            closeFilters.addEventListener('click', () => {
                filtersPanel.classList.remove('open');
            });
        }

        // Editorial panel
        const editBtn = document.getElementById('editBtn');
        const editorialPanel = document.getElementById('editorialPanel');
        const closeEditorial = document.getElementById('closeEditorial');

        if (editBtn && editorialPanel) {
            editBtn.addEventListener('click', () => {
                editorialPanel.classList.toggle('open');
            });
        }

        if (closeEditorial && editorialPanel) {
            closeEditorial.addEventListener('click', () => {
                editorialPanel.classList.remove('open');
            });
        }

        // Close panels on outside click
        document.addEventListener('click', (e) => {
            if (filtersPanel && filtersPanel.classList.contains('open')) {
                if (!filtersPanel.contains(e.target) && !filtersBtn.contains(e.target)) {
                    filtersPanel.classList.remove('open');
                }
            }

            if (editorialPanel && editorialPanel.classList.contains('open')) {
                if (!editorialPanel.contains(e.target) && !editBtn.contains(e.target)) {
                    editorialPanel.classList.remove('open');
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for global search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('globalSearch');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Esc to close panels/modals
            if (e.key === 'Escape') {
                const filtersPanel = document.getElementById('filtersPanel');
                const editorialPanel = document.getElementById('editorialPanel');

                if (filtersPanel && filtersPanel.classList.contains('open')) {
                    filtersPanel.classList.remove('open');
                }

                if (editorialPanel && editorialPanel.classList.contains('open')) {
                    editorialPanel.classList.remove('open');
                }
            }

            // Arrow keys for story navigation (if implemented)
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                // TODO: Implement story navigation
            }
        });
    }

    triggerViewChange(viewMode) {
        // Dispatch custom event for view change
        window.dispatchEvent(new CustomEvent('viewModeChanged', {
            detail: { mode: viewMode }
        }));
    }

    triggerTabChange(tabName) {
        // Dispatch custom event for tab change
        window.dispatchEvent(new CustomEvent('tabChanged', {
            detail: { tab: tabName }
        }));
    }
}

// Initialize layout manager when DOM is ready
let layoutManager;

function initLayout() {
    layoutManager = new LayoutManager();
}

// Export
window.LayoutManager = LayoutManager;
window.initLayout = initLayout;
