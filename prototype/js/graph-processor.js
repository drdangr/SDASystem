// ============================================
// GRAPH-PROCESSOR.JS - Модуль обработки графа
// Обработка DAG графа с двумя слоями связей
// ============================================

/**
 * Константы для кластеризации
 */
const CLUSTERING_CONFIG = {
    // Пороги для слоя 1 (семантическая похожесть)
    LAYER1_SIMILARITY_THRESHOLD: 0.7,  // Минимальная похожесть для связи
    LAYER1_CLUSTER_THRESHOLD: 0.5,     // Порог для кластеризации (0 = полный разбор, 1 = полный коллапс)
    
    // Пороги для слоя 2 (общие NER/акторы)
    LAYER2_SHARED_ACTORS_MIN: 1,       // Минимальное количество общих акторов
    LAYER2_CLUSTER_THRESHOLD: 0.5,     // Порог для кластеризации
    
    // Комбинированная кластеризация
    COMBINED_WEIGHT_LAYER1: 0.6,       // Вес слоя 1 в комбинированной кластеризации
    COMBINED_WEIGHT_LAYER2: 0.4,       // Вес слоя 2 в комбинированной кластеризации
    
    // Параметры кластеризации вокруг точки
    FOCUS_RADIUS: 2,                   // Радиус связей для фокусировки
    MIN_CLUSTER_SIZE: 2,               // Минимальный размер кластера
    MAX_CLUSTER_SIZE: 50,              // Максимальный размер кластера
};

/**
 * Класс для обработки двухслойного графа
 */
class GraphProcessor {
    constructor(config = {}) {
        this.config = { ...CLUSTERING_CONFIG, ...config };
        this.graph = null;
        this.clusters = new Map();
        this.clusterLevel = 0.5; // Текущий уровень кластеризации (0-1)
    }

    /**
     * Инициализация графа из данных постов и акторов
     * @param {Array} posts - Массив постов
     * @param {Array} actors - Массив акторов
     * @param {Array} relationships - Массив связей между акторами
     */
    initializeGraph(posts, actors, relationships) {
        const nodes = [];
        const layer1Edges = []; // Связи слоя 1 (семантическая похожесть)
        const layer2Edges = []; // Связи слоя 2 (общие NER/акторы)
        
        // Создаем узлы из постов
        posts.forEach(post => {
            nodes.push({
                id: post.id,
                type: 'post',
                data: post,
                layer: 1,
                clusterId: null,
                layer1Connections: [],
                layer2Connections: []
            });
        });

        // Вычисляем связи слоя 1 (семантическая похожесть через embeddings)
        this.computeLayer1Edges(nodes, layer1Edges);

        // Вычисляем связи слоя 2 (общие NER/акторы)
        this.computeLayer2Edges(nodes, layer2Edges, relationships);

        this.graph = {
            nodes: nodes,
            layer1Edges: layer1Edges,
            layer2Edges: layer2Edges,
            metadata: {
                totalNodes: nodes.length,
                layer1Connections: layer1Edges.length,
                layer2Connections: layer2Edges.length
            }
        };

        return this.graph;
    }

    /**
     * Вычисление связей слоя 1 (семантическая похожесть)
     * Использует косинусное расстояние между embedding векторами
     */
    computeLayer1Edges(nodes, edges) {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];
                
                // Вычисляем косинусное сходство
                const similarity = this.cosineSimilarity(
                    node1.data.embedding_vector || [],
                    node2.data.embedding_vector || []
                );

                if (similarity >= this.config.LAYER1_SIMILARITY_THRESHOLD) {
                    const edge = {
                        source: node1.id,
                        target: node2.id,
                        weight: similarity,
                        layer: 1
                    };
                    edges.push(edge);
                    
                    // Добавляем связи в узлы
                    node1.layer1Connections.push({
                        nodeId: node2.id,
                        weight: similarity
                    });
                    node2.layer1Connections.push({
                        nodeId: node1.id,
                        weight: similarity
                    });
                }
            }
        }
    }

    /**
     * Вычисление связей слоя 2 (общие NER/акторы)
     */
    computeLayer2Edges(nodes, edges, relationships) {
        // Создаем индекс акторов по постам
        const postActors = new Map();
        nodes.forEach(node => {
            postActors.set(node.id, new Set(node.data.actors || []));
        });

        // Вычисляем связи на основе общих акторов
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];
                
                const actors1 = postActors.get(node1.id);
                const actors2 = postActors.get(node2.id);
                
                // Находим пересечение акторов
                const sharedActors = [...actors1].filter(a => actors2.has(a));
                
                if (sharedActors.length >= this.config.LAYER2_SHARED_ACTORS_MIN) {
                    // Вычисляем силу связи на основе количества общих акторов
                    // и их отношений
                    const weight = this.computeLayer2Weight(
                        sharedActors,
                        relationships,
                        actors1.size,
                        actors2.size
                    );

                    const edge = {
                        source: node1.id,
                        target: node2.id,
                        weight: weight,
                        layer: 2,
                        sharedActors: sharedActors
                    };
                    edges.push(edge);
                    
                    // Добавляем связи в узлы
                    node1.layer2Connections.push({
                        nodeId: node2.id,
                        weight: weight,
                        sharedActors: sharedActors
                    });
                    node2.layer2Connections.push({
                        nodeId: node1.id,
                        weight: weight,
                        sharedActors: sharedActors
                    });
                }
            }
        }
    }

    /**
     * Вычисление веса связи слоя 2 на основе общих акторов и их отношений
     */
    computeLayer2Weight(sharedActors, relationships, totalActors1, totalActors2) {
        // Базовый вес = доля общих акторов
        const jaccardSimilarity = sharedActors.length / 
            (totalActors1 + totalActors2 - sharedActors.length);
        
        // Усиливаем вес, если общие акторы связаны между собой
        let relationshipBonus = 0;
        for (let i = 0; i < sharedActors.length; i++) {
            for (let j = i + 1; j < sharedActors.length; j++) {
                const rel = relationships.find(r => 
                    (r.from_actor === sharedActors[i] && r.to_actor === sharedActors[j]) ||
                    (r.from_actor === sharedActors[j] && r.to_actor === sharedActors[i])
                );
                if (rel) {
                    relationshipBonus += rel.confidence || 0.5;
                }
            }
        }
        
        // Нормализуем бонус
        const maxPossibleBonus = (sharedActors.length * (sharedActors.length - 1)) / 2;
        const normalizedBonus = maxPossibleBonus > 0 ? relationshipBonus / maxPossibleBonus : 0;
        
        return Math.min(1.0, jaccardSimilarity * 0.7 + normalizedBonus * 0.3);
    }

    /**
     * Косинусное сходство между двумя векторами
     */
    cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length !== vec2.length || vec1.length === 0) {
            return 0;
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
        return denominator > 0 ? dotProduct / denominator : 0;
    }

    /**
     * Динамическая кластеризация вокруг выбранной точки
     * @param {string} focusNodeId - ID узла для фокусировки
     * @param {number} clusterLevel - Уровень кластеризации (0-1)
     * @param {string} layerMode - 'layer1', 'layer2', или 'combined'
     */
    clusterAroundNode(focusNodeId, clusterLevel = 0.5, layerMode = 'combined') {
        this.clusterLevel = Math.max(0, Math.min(1, clusterLevel));
        
        if (!this.graph) {
            throw new Error('Граф не инициализирован');
        }

        const focusNode = this.graph.nodes.find(n => n.id === focusNodeId);
        if (!focusNode) {
            throw new Error(`Узел ${focusNodeId} не найден`);
        }

        // Вычисляем расстояния от фокусного узла
        const distances = this.computeDistances(focusNode, layerMode);
        
        // Применяем кластеризацию на основе расстояний и уровня
        const clusters = this.applyClustering(distances, this.clusterLevel, layerMode);
        
        // Обновляем кластеры в графе
        this.updateClusters(clusters);
        
        return this.exportToJSON();
    }

    /**
     * Вычисление расстояний от фокусного узла
     */
    computeDistances(focusNode, layerMode) {
        const distances = new Map();
        const visited = new Set();
        const queue = [{ node: focusNode, distance: 0, path: [focusNode.id] }];
        
        distances.set(focusNode.id, {
            distance: 0,
            path: [focusNode.id],
            layer1Weight: 0,
            layer2Weight: 0
        });

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.node.id)) continue;
            visited.add(current.node.id);

            // Обрабатываем связи в зависимости от режима
            if (layerMode === 'layer1' || layerMode === 'combined') {
                current.node.layer1Connections.forEach(conn => {
                    if (!visited.has(conn.nodeId)) {
                        const targetNode = this.graph.nodes.find(n => n.id === conn.nodeId);
                        if (targetNode && current.distance < this.config.FOCUS_RADIUS) {
                            const newDistance = current.distance + (1 - conn.weight);
                            if (!distances.has(conn.nodeId) || 
                                distances.get(conn.nodeId).distance > newDistance) {
                                distances.set(conn.nodeId, {
                                    distance: newDistance,
                                    path: [...current.path, conn.nodeId],
                                    layer1Weight: conn.weight,
                                    layer2Weight: 0
                                });
                                queue.push({
                                    node: targetNode,
                                    distance: newDistance,
                                    path: [...current.path, conn.nodeId]
                                });
                            }
                        }
                    }
                });
            }

            if (layerMode === 'layer2' || layerMode === 'combined') {
                current.node.layer2Connections.forEach(conn => {
                    if (!visited.has(conn.nodeId)) {
                        const targetNode = this.graph.nodes.find(n => n.id === conn.nodeId);
                        if (targetNode && current.distance < this.config.FOCUS_RADIUS) {
                            const newDistance = current.distance + (1 - conn.weight);
                            const existing = distances.get(conn.nodeId);
                            if (!existing || existing.distance > newDistance) {
                                distances.set(conn.nodeId, {
                                    distance: newDistance,
                                    path: [...current.path, conn.nodeId],
                                    layer1Weight: existing?.layer1Weight || 0,
                                    layer2Weight: conn.weight
                                });
                                if (!queue.find(q => q.node.id === conn.nodeId)) {
                                    queue.push({
                                        node: targetNode,
                                        distance: newDistance,
                                        path: [...current.path, conn.nodeId]
                                    });
                                }
                            }
                        }
                    }
                });
            }
        }

        return distances;
    }

    /**
     * Применение кластеризации на основе расстояний
     */
    applyClustering(distances, clusterLevel, layerMode) {
        const clusters = new Map();
        const nodeToCluster = new Map();
        
        // Сортируем узлы по расстоянию
        const sortedNodes = Array.from(distances.entries())
            .sort((a, b) => a[1].distance - b[1].distance);

        // Вычисляем порог кластеризации на основе уровня
        // clusterLevel = 0: все узлы отдельно
        // clusterLevel = 1: все узлы в одном кластере
        const maxDistance = Math.max(...Array.from(distances.values()).map(d => d.distance));
        const threshold = maxDistance * clusterLevel;

        let clusterId = 0;
        sortedNodes.forEach(([nodeId, distInfo]) => {
            // Вычисляем комбинированный вес для решения о кластеризации
            let combinedWeight = 0;
            if (layerMode === 'layer1') {
                combinedWeight = distInfo.layer1Weight;
            } else if (layerMode === 'layer2') {
                combinedWeight = distInfo.layer2Weight;
            } else {
                combinedWeight = distInfo.layer1Weight * this.config.COMBINED_WEIGHT_LAYER1 +
                               distInfo.layer2Weight * this.config.COMBINED_WEIGHT_LAYER2;
            }

            // Если расстояние меньше порога и вес достаточен, добавляем в кластер
            if (distInfo.distance <= threshold && combinedWeight > 0.3) {
                // Ищем ближайший существующий кластер
                let assignedCluster = null;
                for (const [cid, cluster] of clusters.entries()) {
                    const clusterNodes = cluster.nodes;
                    // Проверяем, есть ли связь с узлами кластера
                    const hasConnection = clusterNodes.some(cn => {
                        const node = this.graph.nodes.find(n => n.id === nodeId);
                        return node && (
                            node.layer1Connections.some(c => c.nodeId === cn) ||
                            node.layer2Connections.some(c => c.nodeId === cn)
                        );
                    });
                    
                    if (hasConnection && cluster.nodes.length < this.config.MAX_CLUSTER_SIZE) {
                        assignedCluster = cid;
                        break;
                    }
                }

                if (assignedCluster === null && clusters.size < this.graph.nodes.length) {
                    assignedCluster = `cluster_${clusterId++}`;
                    clusters.set(assignedCluster, {
                        id: assignedCluster,
                        nodes: [],
                        center: nodeId,
                        weight: 0
                    });
                }

                if (assignedCluster) {
                    clusters.get(assignedCluster).nodes.push(nodeId);
                    nodeToCluster.set(nodeId, assignedCluster);
                } else {
                    // Создаем отдельный кластер для узла
                    const newClusterId = `cluster_${clusterId++}`;
                    clusters.set(newClusterId, {
                        id: newClusterId,
                        nodes: [nodeId],
                        center: nodeId,
                        weight: combinedWeight
                    });
                    nodeToCluster.set(nodeId, newClusterId);
                }
            } else {
                // Узел остается отдельным
                const separateClusterId = `cluster_${clusterId++}`;
                clusters.set(separateClusterId, {
                    id: separateClusterId,
                    nodes: [nodeId],
                    center: nodeId,
                    weight: combinedWeight
                });
                nodeToCluster.set(nodeId, separateClusterId);
            }
        });

        // Удаляем кластеры меньше минимального размера (если не фокусный)
        const focusNodeId = sortedNodes[0][0];
        for (const [cid, cluster] of clusters.entries()) {
            if (cluster.nodes.length < this.config.MIN_CLUSTER_SIZE && 
                !cluster.nodes.includes(focusNodeId)) {
                // Разбиваем маленький кластер на отдельные узлы
                cluster.nodes.forEach(nid => {
                    const separateClusterId = `cluster_${clusterId++}`;
                    clusters.set(separateClusterId, {
                        id: separateClusterId,
                        nodes: [nid],
                        center: nid,
                        weight: 0
                    });
                    nodeToCluster.set(nid, separateClusterId);
                });
                clusters.delete(cid);
            }
        }

        return { clusters, nodeToCluster };
    }

    /**
     * Обновление кластеров в графе
     */
    updateClusters({ clusters, nodeToCluster }) {
        this.clusters = clusters;
        
        // Обновляем clusterId для каждого узла
        this.graph.nodes.forEach(node => {
            node.clusterId = nodeToCluster.get(node.id) || null;
        });
    }

    /**
     * Декластеризация (разделение кластеров)
     * @param {string} clusterId - ID кластера для разделения (опционально)
     */
    decluster(clusterId = null) {
        if (!this.graph) {
            throw new Error('Граф не инициализирован');
        }

        if (clusterId) {
            // Разделяем конкретный кластер
            const cluster = this.clusters.get(clusterId);
            if (cluster) {
                cluster.nodes.forEach(nodeId => {
                    const node = this.graph.nodes.find(n => n.id === nodeId);
                    if (node) {
                        node.clusterId = `cluster_${Date.now()}_${Math.random()}`;
                    }
                });
                this.clusters.delete(clusterId);
            }
        } else {
            // Разделяем все кластеры
            this.graph.nodes.forEach(node => {
                node.clusterId = null;
            });
            this.clusters.clear();
        }

        return this.exportToJSON();
    }

    /**
     * Экспорт графа в JSON формат для модуля отображения
     */
    exportToJSON() {
        if (!this.graph) {
            throw new Error('Граф не инициализирован');
        }

        return {
            nodes: this.graph.nodes.map(node => ({
                id: node.id,
                type: node.type,
                data: node.data,
                layer: node.layer,
                clusterId: node.clusterId,
                layer1Connections: node.layer1Connections.map(conn => ({
                    nodeId: conn.nodeId,
                    weight: conn.weight
                })),
                layer2Connections: node.layer2Connections.map(conn => ({
                    nodeId: conn.nodeId,
                    weight: conn.weight,
                    sharedActors: conn.sharedActors || []
                }))
            })),
            clusters: Array.from(this.clusters.values()).map(cluster => ({
                id: cluster.id,
                nodes: cluster.nodes,
                center: cluster.center,
                weight: cluster.weight
            })),
            metadata: {
                ...this.graph.metadata,
                clusterLevel: this.clusterLevel,
                totalClusters: this.clusters.size
            }
        };
    }

    /**
     * Обновление конфигурации
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// Экспорт
window.GraphProcessor = GraphProcessor;
window.CLUSTERING_CONFIG = CLUSTERING_CONFIG;

