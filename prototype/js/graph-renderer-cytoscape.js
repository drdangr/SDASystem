// ============================================
// GRAPH-RENDERER-CYTOSCAPE.JS - Модуль отображения графа на Cytoscape.js
// Визуализация двухслойного графа с использованием проверенной библиотеки
// ============================================

/**
 * Класс для отображения двухслойного графа с использованием Cytoscape.js
 */
class GraphRendererCytoscape {
    constructor(containerId, processor) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Контейнер ${containerId} не найден`);
        }
        
        this.processor = processor;
        this.graphData = null;
        this.cy = null;
        this.selectedNode = null;
        this.clusterLevel = 0.5;
        this.layerMode = 'combined';
        
        this.init();
    }

    /**
     * Инициализация рендерера
     */
    init() {
        // Создаем контейнер для Cytoscape
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';
        
        // Проверяем наличие Cytoscape
        if (typeof cytoscape === 'undefined') {
            throw new Error('Cytoscape.js не загружен. Добавьте <script src="https://unpkg.com/cytoscape@3.27.0/dist/cytoscape.min.js"></script>');
        }
    }

    /**
     * Загрузка данных графа из JSON
     * @param {Object} graphJSON - JSON структура графа от модуля обработки
     */
    loadGraph(graphJSON) {
        this.graphData = graphJSON;
        
        // Небольшая задержка для правильной инициализации размеров
        setTimeout(() => {
            this.render();
        }, 100);
    }

    /**
     * Основной метод рендеринга графа
     */
    render() {
        if (!this.graphData) {
            console.warn('GraphRendererCytoscape: Нет данных для отображения');
            return;
        }

        // Очищаем предыдущий граф
        if (this.cy) {
            this.cy.destroy();
        }

        // Подготавливаем данные для Cytoscape
        const elements = this.prepareCytoscapeElements();

        // Получаем размеры контейнера
        const containerRect = this.container.getBoundingClientRect();
        const width = containerRect.width || this.container.offsetWidth || 800;
        const height = containerRect.height || this.container.offsetHeight || 600;

        // Создаем граф
        this.cy = cytoscape({
            container: this.container,
            elements: elements,
            style: this.getStyle(),
            layout: {
                name: 'cose',
                idealEdgeLength: 80,
                nodeOverlap: 30,
                refresh: 20,
                fit: true,
                padding: 40,
                randomize: false,
                componentSpacing: 120,
                nodeRepulsion: 6000,
                edgeElasticity: 0.35,
                nestingFactor: 0.1,
                gravity: 0.2,
                numIter: 3000,
                initialTemp: 150,
                coolingFactor: 0.96,
                minTemp: 0.5
            },
            minZoom: 0.1,
            maxZoom: 4,
            wheelSensitivity: 0.2,
            boxSelectionEnabled: true
        });

        // Убеждаемся, что граф правильно подстраивается под размер контейнера
        this.cy.resize();
        
        // Подстраиваемся при изменении размера окна
        window.addEventListener('resize', () => {
            if (this.cy) {
                this.cy.resize();
                this.cy.fit();
            }
        });

        // Настраиваем обработчики событий
        this.setupEventHandlers();
    }

    /**
     * Подготовка элементов для Cytoscape
     */
    prepareCytoscapeElements() {
        const elements = [];

        // Добавляем узлы
        this.graphData.nodes.forEach(node => {
            elements.push({
                data: {
                    id: node.id,
                    label: node.id.substring(0, 10),
                    type: node.type,
                    clusterId: node.clusterId,
                    layer: node.layer
                },
                classes: node.clusterId ? 'clustered' : 'single'
            });
        });

        // Добавляем связи слоя 1
        this.graphData.nodes.forEach(node => {
            node.layer1Connections.forEach(conn => {
                const edgeId = `l1_${node.id}_${conn.nodeId}`;
                // Проверяем, не добавлена ли уже связь
                if (!elements.find(e => e.data.id === edgeId)) {
                    elements.push({
                        data: {
                            id: edgeId,
                            source: node.id,
                            target: conn.nodeId,
                            weight: conn.weight,
                            layer: 1,
                            type: 'layer1'
                        },
                        classes: 'layer1'
                    });
                }
            });
        });

        // Добавляем связи слоя 2
        this.graphData.nodes.forEach(node => {
            node.layer2Connections.forEach(conn => {
                const edgeId = `l2_${node.id}_${conn.nodeId}`;
                // Проверяем, не добавлена ли уже связь
                if (!elements.find(e => e.data.id === edgeId)) {
                    elements.push({
                        data: {
                            id: edgeId,
                            source: node.id,
                            target: conn.nodeId,
                            weight: conn.weight,
                            layer: 2,
                            type: 'layer2',
                            sharedActors: conn.sharedActors || []
                        },
                        classes: 'layer2'
                    });
                }
            });
        });

        return elements;
    }

    /**
     * Стили для графа
     */
    getStyle() {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': '#6366f1',
                    'label': 'data(label)',
                    'width': 24,
                    'height': 24,
                    'font-size': '11px',
                    'color': '#f1f5f9',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'text-margin-y': 6,
                    'text-outline-width': 2,
                    'text-outline-color': '#0f172a',
                    'border-width': 2,
                    'border-color': '#1e293b',
                    'shape': 'ellipse'
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'background-color': '#fbbf24',
                    'border-color': '#f59e0b',
                    'border-width': 4
                }
            },
            {
                selector: 'node.clustered',
                style: {
                    'background-color': '#f59e0b'
                }
            },
            {
                selector: 'edge.layer1',
                style: {
                    'width': 'mapData(weight, 0, 1, 1.5, 4)',
                    'line-color': '#3b82f6',
                    'opacity': 0.5,
                    'curve-style': 'bezier',
                    'target-arrow-color': '#3b82f6',
                    'target-arrow-shape': 'none'
                }
            },
            {
                selector: 'edge.layer2',
                style: {
                    'width': 'mapData(weight, 0, 1, 1.5, 4)',
                    'line-color': '#10b981',
                    'opacity': 0.6,
                    'line-style': 'dashed',
                    'line-dash-pattern': [6, 3],
                    'curve-style': 'bezier',
                    'target-arrow-color': '#10b981',
                    'target-arrow-shape': 'none'
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'opacity': 1,
                    'width': 'mapData(weight, 0, 1, 3, 8)'
                }
            }
        ];
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventHandlers() {
        // Выбор узла
        this.cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            this.selectNode(node.id());
        });

        // Подсветка при наведении
        this.cy.on('mouseover', 'node', (evt) => {
            const node = evt.target;
            node.style('background-color', '#fbbf24');
            
            // Подсвечиваем связанные связи
            node.connectedEdges().style('opacity', 1);
        });

        this.cy.on('mouseout', 'node', (evt) => {
            const node = evt.target;
            if (!node.selected()) {
                node.style('background-color', node.hasClass('clustered') ? '#f59e0b' : '#6366f1');
            }
            
            // Возвращаем прозрачность связей
            node.connectedEdges().forEach(edge => {
                if (!edge.selected()) {
                    edge.style('opacity', edge.hasClass('layer1') ? 0.4 : 0.5);
                }
            });
        });
    }

    /**
     * Выбор узла и запрос кластеризации
     */
    selectNode(nodeId) {
        this.selectedNode = nodeId;
        
        // Визуально выделяем выбранный узел
        this.cy.nodes().removeClass('selected');
        const node = this.cy.getElementById(nodeId);
        node.addClass('selected');
        
        // Отправляем событие о выборе узла
        window.dispatchEvent(new CustomEvent('nodeSelected', {
            detail: { nodeId: nodeId }
        }));
    }

    /**
     * Запрос кластеризации вокруг выбранного узла
     * @param {number} clusterLevel - Уровень кластеризации (0-1)
     * @param {string} layerMode - 'layer1', 'layer2', или 'combined'
     */
    requestClustering(clusterLevel = null, layerMode = null) {
        if (!this.selectedNode) {
            console.warn('GraphRendererCytoscape: Нет выбранного узла для кластеризации');
            return;
        }

        const level = clusterLevel !== null ? clusterLevel : this.clusterLevel;
        const mode = layerMode !== null ? layerMode : this.layerMode;

        try {
            // Запрашиваем кластеризацию у процессора
            const updatedGraph = this.processor.clusterAroundNode(
                this.selectedNode,
                level,
                mode
            );

            // Обновляем отображение
            this.loadGraph(updatedGraph);
            this.clusterLevel = level;
            this.layerMode = mode;

            // Отправляем событие об обновлении
            window.dispatchEvent(new CustomEvent('graphUpdated', {
                detail: { graph: updatedGraph }
            }));
        } catch (error) {
            console.error('GraphRendererCytoscape: Ошибка при кластеризации:', error);
        }
    }

    /**
     * Запрос декластеризации
     * @param {string} clusterId - ID кластера для разделения (опционально)
     */
    requestDeclustering(clusterId = null) {
        try {
            const updatedGraph = this.processor.decluster(clusterId);
            this.loadGraph(updatedGraph);

            // Отправляем событие об обновлении
            window.dispatchEvent(new CustomEvent('graphUpdated', {
                detail: { graph: updatedGraph }
            }));
        } catch (error) {
            console.error('GraphRendererCytoscape: Ошибка при декластеризации:', error);
        }
    }

    /**
     * Установка уровня кластеризации
     */
    setClusterLevel(level) {
        this.clusterLevel = Math.max(0, Math.min(1, level));
        if (this.selectedNode) {
            this.requestClustering(this.clusterLevel, this.layerMode);
        }
    }

    /**
     * Установка режима слоя
     */
    setLayerMode(mode) {
        if (['layer1', 'layer2', 'combined'].includes(mode)) {
            this.layerMode = mode;
            if (this.selectedNode) {
                this.requestClustering(this.clusterLevel, this.layerMode);
            }
        }
    }

    /**
     * Фильтрация связей по слою
     */
    filterByLayer(layer) {
        if (!this.cy) return;

        if (layer === 'layer1') {
            this.cy.edges('.layer2').style('display', 'none');
            this.cy.edges('.layer1').style('display', 'element');
        } else if (layer === 'layer2') {
            this.cy.edges('.layer1').style('display', 'none');
            this.cy.edges('.layer2').style('display', 'element');
        } else {
            this.cy.edges().style('display', 'element');
        }
    }
}

// Экспорт
window.GraphRendererCytoscape = GraphRendererCytoscape;

