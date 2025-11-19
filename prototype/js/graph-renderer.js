// ============================================
// GRAPH-RENDERER.JS - Модуль отображения графа
// Визуализация двухслойного графа с динамическим обновлением
// ============================================

/**
 * Класс для отображения двухслойного графа
 */
class GraphRenderer {
    constructor(containerId, processor) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Контейнер ${containerId} не найден`);
        }
        
        this.processor = processor;
        this.graphData = null;
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
        this.clusterLevel = 0.5;
        this.layerMode = 'combined';
        
        this.init();
    }

    /**
     * Инициализация рендерера
     */
    init() {
        // Создаем SVG элемент
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('class', 'graph-svg');
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.container.appendChild(this.svg);

        // Создаем группы для слоев
        this.layer1Group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.layer1Group.setAttribute('class', 'layer1-group');
        this.svg.appendChild(this.layer1Group);

        this.layer2Group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.layer2Group.setAttribute('class', 'layer2-group');
        this.svg.appendChild(this.layer2Group);

        this.nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.nodesGroup.setAttribute('class', 'nodes-group');
        this.svg.appendChild(this.nodesGroup);

        // Обработчики событий
        this.setupEventListeners();
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.updateDimensions();
        });

        // Обработка кликов на узлы
        this.svg.addEventListener('click', (e) => {
            const nodeElement = e.target.closest('.graph-node');
            if (nodeElement) {
                const nodeId = nodeElement.dataset.nodeId;
                this.selectNode(nodeId);
            }
        });
    }

    /**
     * Обновление размеров SVG
     */
    updateDimensions() {
        const rect = this.container.getBoundingClientRect();
        this.svg.setAttribute('width', rect.width);
        this.svg.setAttribute('height', rect.height);
    }

    /**
     * Загрузка данных графа из JSON
     * @param {Object} graphJSON - JSON структура графа от модуля обработки
     */
    loadGraph(graphJSON) {
        this.graphData = graphJSON;
        this.render();
    }

    /**
     * Основной метод рендеринга графа
     */
    render() {
        if (!this.graphData) {
            console.warn('GraphRenderer: Нет данных для отображения');
            return;
        }

        // Очищаем предыдущий граф
        this.clear();

        // Обновляем размеры
        this.updateDimensions();

        const width = this.svg.getAttribute('width');
        const height = this.svg.getAttribute('height');

        // Создаем узлы для визуализации с равномерным начальным распределением
        const nodeCount = this.graphData.nodes.length;
        const cols = Math.ceil(Math.sqrt(nodeCount));
        const rows = Math.ceil(nodeCount / cols);
        const cellWidth = width / (cols + 1);
        const cellHeight = height / (rows + 1);
        
        this.nodes = this.graphData.nodes.map((node, i) => {
            // Группируем узлы по кластерам для позиционирования
            const clusterNodes = this.graphData.clusters.find(c => 
                c.nodes.includes(node.id)
            );
            
            // Равномерное начальное распределение
            const col = i % cols;
            const row = Math.floor(i / cols);
            const baseX = cellWidth * (col + 1);
            const baseY = cellHeight * (row + 1);
            
            return {
                id: node.id,
                data: node.data,
                clusterId: node.clusterId,
                x: clusterNodes ? 
                    (width / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.2) : 
                    (baseX + (Math.random() - 0.5) * cellWidth * 0.4),
                y: clusterNodes ? 
                    (height / 2 + (Math.random() - 0.5) * Math.min(width, height) * 0.2) : 
                    (baseY + (Math.random() - 0.5) * cellHeight * 0.4),
                vx: 0,
                vy: 0,
                r: 8,
                layer: node.layer,
                isCluster: clusterNodes && clusterNodes.nodes.length > 1
            };
        });

        // Создаем связи
        this.links = [];
        this.graphData.nodes.forEach(node => {
            // Связи слоя 1
            node.layer1Connections.forEach(conn => {
                const targetNode = this.nodes.find(n => n.id === conn.nodeId);
                if (targetNode) {
                    this.links.push({
                        source: this.nodes.find(n => n.id === node.id),
                        target: targetNode,
                        weight: conn.weight,
                        layer: 1,
                        type: 'layer1'
                    });
                }
            });

            // Связи слоя 2
            node.layer2Connections.forEach(conn => {
                const targetNode = this.nodes.find(n => n.id === conn.nodeId);
                if (targetNode) {
                    this.links.push({
                        source: this.nodes.find(n => n.id === node.id),
                        target: targetNode,
                        weight: conn.weight,
                        layer: 2,
                        type: 'layer2',
                        sharedActors: conn.sharedActors || []
                    });
                }
            });
        });

        // Рендерим элементы
        this.renderLinks();
        this.renderNodes();
        
        // Запускаем симуляцию
        this.startSimulation();
    }

    /**
     * Очистка графа
     */
    clear() {
        // Останавливаем симуляцию
        if (this.simulation) {
            cancelAnimationFrame(this.simulation);
            this.simulation = null;
        }
        
        // Обнуляем скорости узлов
        if (this.nodes) {
            this.nodes.forEach(node => {
                node.vx = 0;
                node.vy = 0;
            });
        }
        
        // Очищаем DOM
        this.layer1Group.innerHTML = '';
        this.layer2Group.innerHTML = '';
        this.nodesGroup.innerHTML = '';
    }

    /**
     * Рендеринг связей
     */
    renderLinks() {
        // Связи слоя 1 (семантическая похожесть)
        this.links.filter(l => l.type === 'layer1').forEach(link => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'graph-link layer1-link');
            line.setAttribute('stroke', '#3b82f6');
            line.setAttribute('stroke-width', link.weight * 3);
            line.setAttribute('opacity', 0.4);
            line.setAttribute('data-source', link.source.id);
            line.setAttribute('data-target', link.target.id);
            this.layer1Group.appendChild(line);
            link.element = line;
        });

        // Связи слоя 2 (общие NER)
        this.links.filter(l => l.type === 'layer2').forEach(link => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'graph-link layer2-link');
            line.setAttribute('stroke', '#10b981');
            line.setAttribute('stroke-width', link.weight * 3);
            line.setAttribute('opacity', 0.5);
            line.setAttribute('stroke-dasharray', '5,5');
            line.setAttribute('data-source', link.source.id);
            line.setAttribute('data-target', link.target.id);
            this.layer2Group.appendChild(line);
            link.element = line;
        });
    }

    /**
     * Рендеринг узлов
     */
    renderNodes() {
        this.nodes.forEach(node => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'graph-node');
            g.setAttribute('data-node-id', node.id);
            g.style.cursor = 'pointer';

            // Круг узла
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', node.r);
            circle.setAttribute('fill', node.isCluster ? '#f59e0b' : '#6366f1');
            circle.setAttribute('stroke', '#1e293b');
            circle.setAttribute('stroke-width', '2');
            
            // Подсветка при наведении
            circle.addEventListener('mouseenter', () => {
                circle.setAttribute('r', node.r * 1.3);
                this.highlightNode(node.id);
            });
            circle.addEventListener('mouseleave', () => {
                circle.setAttribute('r', node.r);
                this.unhighlightNode(node.id);
            });

            // Текст (ID узла)
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dy', node.r + 12);
            text.setAttribute('fill', '#d1d5db');
            text.setAttribute('font-size', '10');
            text.textContent = node.id.substring(0, 10);

            g.appendChild(circle);
            g.appendChild(text);
            this.nodesGroup.appendChild(g);
            
            node.element = g;
        });
    }

    /**
     * Подсветка узла и его связей
     */
    highlightNode(nodeId) {
        // Подсвечиваем узел
        const node = this.nodes.find(n => n.id === nodeId);
        if (node && node.element) {
            const circle = node.element.querySelector('circle');
            if (circle) {
                circle.setAttribute('fill', '#fbbf24');
            }
        }

        // Подсвечиваем связанные связи
        this.links.forEach(link => {
            if (link.source.id === nodeId || link.target.id === nodeId) {
                if (link.element) {
                    link.element.setAttribute('opacity', '1');
                    link.element.setAttribute('stroke-width', link.weight * 5);
                }
            }
        });
    }

    /**
     * Снятие подсветки
     */
    unhighlightNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (node && node.element) {
            const circle = node.element.querySelector('circle');
            if (circle) {
                circle.setAttribute('fill', node.isCluster ? '#f59e0b' : '#6366f1');
            }
        }

        // Возвращаем нормальную прозрачность связей
        this.links.forEach(link => {
            if (link.element) {
                link.element.setAttribute('opacity', link.type === 'layer1' ? '0.4' : '0.5');
                link.element.setAttribute('stroke-width', link.weight * 3);
            }
        });
    }

    /**
     * Выбор узла и запрос кластеризации
     */
    selectNode(nodeId) {
        this.selectedNode = nodeId;
        
        // Визуально выделяем выбранный узел
        this.nodes.forEach(node => {
            if (node.element) {
                const circle = node.element.querySelector('circle');
                if (circle) {
                    if (node.id === nodeId) {
                        circle.setAttribute('stroke', '#fbbf24');
                        circle.setAttribute('stroke-width', '4');
                    } else {
                        circle.setAttribute('stroke', '#1e293b');
                        circle.setAttribute('stroke-width', '2');
                    }
                }
            }
        });

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
            console.warn('GraphRenderer: Нет выбранного узла для кластеризации');
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
            console.error('GraphRenderer: Ошибка при кластеризации:', error);
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
            console.error('GraphRenderer: Ошибка при декластеризации:', error);
        }
    }

    /**
     * Запуск физической симуляции графа
     */
    startSimulation() {
        const width = parseFloat(this.svg.getAttribute('width'));
        const height = parseFloat(this.svg.getAttribute('height'));

        // Сбалансированные параметры симуляции
        let iteration = 0;
        const maxIterations = 400;
        let alpha = 1.0;  // Начальная "температура" симуляции
        const alphaDecay = 0.015;  // Скорость охлаждения
        const alphaMin = 0.001;  // Минимальная температура
        
        const linkStrength = 0.01;  // Очень слабое притяжение связей
        const repulsion = 2000;      // Увеличено для лучшего распределения
        const centerStrength = 0.003;  // Очень слабое притяжение к центру
        const damping = 0.90;        // Затухание
        const maxVelocity = 15;      // Ограничение скорости
        const minVelocity = 0.05;    // Минимальная скорость для остановки

        // Начальное позиционирование узлов более равномерно
        const cols = Math.ceil(Math.sqrt(this.nodes.length));
        const rows = Math.ceil(this.nodes.length / cols);
        const cellWidth = width / (cols + 1);
        const cellHeight = height / (rows + 1);
        
        this.nodes.forEach((node, i) => {
            if (node.x === undefined || node.y === undefined || 
                isNaN(node.x) || isNaN(node.y) || 
                node.x < 0 || node.y < 0) {
                // Равномерное начальное распределение
                const col = i % cols;
                const row = Math.floor(i / cols);
                node.x = cellWidth * (col + 1) + (Math.random() - 0.5) * cellWidth * 0.5;
                node.y = cellHeight * (row + 1) + (Math.random() - 0.5) * cellHeight * 0.5;
            }
            // Обнуляем скорость при старте
            node.vx = 0;
            node.vy = 0;
        });

        const simulate = () => {
            iteration++;
            
            // Охлаждение симуляции (alpha cooling)
            alpha = Math.max(alphaMin, alpha - alphaDecay);
            
            let maxVel = 0;
            let stableCount = 0;

            // Применяем силы с учетом alpha
            this.nodes.forEach(node => {
                let ax = 0;
                let ay = 0;

                // Отталкивание между узлами (усилено для распределения)
                this.nodes.forEach(other => {
                    if (node === other) return;

                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const minDist = node.r + other.r + 50;  // Увеличено минимальное расстояние

                    if (dist < minDist) {
                        // Сильное отталкивание при столкновении
                        const force = (repulsion * 2) / (dist * dist + 1);
                        ax += (dx / dist) * force * alpha;
                        ay += (dy / dist) * force * alpha;
                    } else if (dist < 200) {
                        // Отталкивание на средних расстояниях
                        const force = repulsion / (dist * dist + 50);
                        ax += (dx / dist) * force * alpha;
                        ay += (dy / dist) * force * alpha;
                    } else if (dist < 300) {
                        // Слабое отталкивание на больших расстояниях
                        const force = repulsion * 0.3 / (dist * dist + 100);
                        ax += (dx / dist) * force * alpha;
                        ay += (dy / dist) * force * alpha;
                    }
                });

                // Притяжение связей (очень слабое, только для связанных узлов)
                this.links.forEach(link => {
                    if (link.source === node) {
                        const dx = link.target.x - node.x;
                        const dy = link.target.y - node.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        // Идеальное расстояние зависит от веса связи
                        const baseDist = (node.r + link.target.r) * 6;
                        const idealDist = baseDist + (1 - (link.weight || 0.5)) * 50;
                        // Притяжение только если узлы слишком далеко
                        if (dist > idealDist) {
                            const force = (dist - idealDist) * linkStrength * (link.weight || 0.5) * alpha;
                            ax += (dx / dist) * force;
                            ay += (dy / dist) * force;
                        }
                    } else if (link.target === node) {
                        const dx = link.source.x - node.x;
                        const dy = link.source.y - node.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const baseDist = (node.r + link.source.r) * 6;
                        const idealDist = baseDist + (1 - (link.weight || 0.5)) * 50;
                        if (dist > idealDist) {
                            const force = (dist - idealDist) * linkStrength * (link.weight || 0.5) * alpha;
                            ax += (dx / dist) * force;
                            ay += (dy / dist) * force;
                        }
                    }
                });

                // Очень слабое притяжение к центру (только если далеко)
                const centerX = width / 2;
                const centerY = height / 2;
                const distFromCenter = Math.sqrt(
                    Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2)
                );
                if (distFromCenter > width * 0.45) {
                    ax += (centerX - node.x) * centerStrength * alpha;
                    ay += (centerY - node.y) * centerStrength * alpha;
                }

                // Обновление скорости с сильным затуханием
                node.vx = (node.vx + ax * alpha) * damping;
                node.vy = (node.vy + ay * alpha) * damping;

                // Строгое ограничение максимальной скорости
                const velocity = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                if (velocity > maxVelocity) {
                    node.vx = (node.vx / velocity) * maxVelocity;
                    node.vy = (node.vy / velocity) * maxVelocity;
                }

                // Обновление позиции
                node.x += node.vx * alpha;
                node.y += node.vy * alpha;

                // Обработка границ с сильным отражением и затуханием
                const padding = node.r + 20;
                if (node.x < padding) {
                    node.x = padding;
                    node.vx *= -0.3; // Сильное затухание при отражении
                } else if (node.x > width - padding) {
                    node.x = width - padding;
                    node.vx *= -0.3;
                }
                if (node.y < padding) {
                    node.y = padding;
                    node.vy *= -0.3;
                } else if (node.y > height - padding) {
                    node.y = height - padding;
                    node.vy *= -0.3;
                }

                // Проверка стабильности
                const currentVel = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
                if (currentVel > maxVel) {
                    maxVel = currentVel;
                }
                if (currentVel < minVelocity) {
                    stableCount++;
                }
            });

            // Обновление DOM
            this.updatePositions();

            // Проверка стабильности и остановка
            const stabilityRatio = stableCount / this.nodes.length;
            const shouldStop = alpha <= alphaMin || 
                              (maxVel < minVelocity && stabilityRatio > 0.9) || 
                              iteration >= maxIterations;
            
            if (shouldStop) {
                // Полная остановка всех узлов
                this.nodes.forEach(node => {
                    node.vx = 0;
                    node.vy = 0;
                });
                this.updatePositions();
                console.log(`Симуляция завершена: итерация ${iteration}, скорость ${maxVel.toFixed(3)}, alpha ${alpha.toFixed(4)}`);
                this.simulation = null;
                return;
            }

            this.simulation = requestAnimationFrame(simulate);
        };

        this.simulation = requestAnimationFrame(simulate);
    }

    /**
     * Обновление позиций элементов
     */
    updatePositions() {
        // Обновляем позиции связей
        this.links.forEach(link => {
            if (link.element) {
                link.element.setAttribute('x1', link.source.x);
                link.element.setAttribute('y1', link.source.y);
                link.element.setAttribute('x2', link.target.x);
                link.element.setAttribute('y2', link.target.y);
            }
        });

        // Обновляем позиции узлов
        this.nodes.forEach(node => {
            if (node.element) {
                node.element.setAttribute('transform', `translate(${node.x}, ${node.y})`);
            }
        });
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
}

// Экспорт
window.GraphRenderer = GraphRenderer;

