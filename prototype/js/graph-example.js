// ============================================
// GRAPH-EXAMPLE.JS - Пример использования модулей графа
// Демонстрация работы GraphProcessor и GraphRenderer
// ============================================

/**
 * Инициализация и использование модулей графа
 */
function initGraphModules() {
    // Создаем процессор графа
    const processor = new GraphProcessor();
    
    // Загружаем данные
    const posts = window.AppData?.posts || [];
    const actors = window.AppData?.actors || [];
    const relationships = window.AppData?.relationships || [];
    
    if (posts.length === 0) {
        console.warn('GraphExample: Нет данных для инициализации графа');
        return null;
    }
    
    // Инициализируем граф
    console.log('Инициализация графа...');
    const graph = processor.initializeGraph(posts, actors, relationships);
    console.log('Граф инициализирован:', graph.metadata);
    
    // Создаем рендерер (используем Cytoscape.js версию)
    const renderer = new GraphRendererCytoscape('graphContainer', processor);
    
    // Загружаем граф в рендерер
    const graphJSON = processor.exportToJSON();
    renderer.loadGraph(graphJSON);
    
    // Настраиваем UI элементы управления
    setupGraphControls(processor, renderer);
    
    // Возвращаем объект с модулями и данными графа
    return { 
        processor, 
        renderer, 
        graph: graphJSON  // Возвращаем JSON, а не внутренний объект графа
    };
}

/**
 * Настройка элементов управления графом
 */
function setupGraphControls(processor, renderer) {
    // Слайдер уровня кластеризации
    const clusterSlider = document.getElementById('clusterLevelSlider');
    if (clusterSlider) {
        clusterSlider.addEventListener('input', (e) => {
            const level = parseFloat(e.target.value);
            renderer.setClusterLevel(level);
            
            // Обновляем отображение значения
            const levelDisplay = document.getElementById('clusterLevelValue');
            if (levelDisplay) {
                levelDisplay.textContent = Math.round(level * 100) + '%';
            }
        });
    }
    
    // Кнопки режима слоя
    const layerButtons = document.querySelectorAll('.layer-mode-btn');
    layerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            layerButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            renderer.setLayerMode(mode);
            // Фильтруем отображение связей
            if (renderer.filterByLayer) {
                renderer.filterByLayer(mode);
            }
        });
    });
    
    // Кнопка декластеризации
    const declusterBtn = document.getElementById('declusterBtn');
    if (declusterBtn) {
        declusterBtn.addEventListener('click', () => {
            renderer.requestDeclustering();
        });
    }
    
    // Кнопка полной декластеризации
    const fullDeclusterBtn = document.getElementById('fullDeclusterBtn');
    if (fullDeclusterBtn) {
        fullDeclusterBtn.addEventListener('click', () => {
            renderer.requestDeclustering();
            if (clusterSlider) {
                clusterSlider.value = 0;
                renderer.setClusterLevel(0);
            }
        });
    }
    
    // Обработка выбора узла
    window.addEventListener('nodeSelected', (e) => {
        console.log('Узел выбран:', e.detail.nodeId);
        // Можно добавить дополнительную логику
    });
    
    // Обработка обновления графа
    window.addEventListener('graphUpdated', (e) => {
        console.log('Граф обновлен:', e.detail.graph.metadata);
    });
}

/**
 * Экспорт функции инициализации
 */
window.initGraphModules = initGraphModules;

