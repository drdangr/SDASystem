# Модули обработки и отображения графа

## Обзор

Система разделена на два независимых модуля:

1. **GraphProcessor** (`graph-processor.js`) - модуль обработки графа
2. **GraphRenderer** (`graph-renderer.js`) - модуль отображения графа

## Модуль 1: GraphProcessor

### Назначение

Обработка DAG графа с двумя слоями связей:
- **Слой 1**: Семантическая похожесть между нодами (посты) через embedding векторы
- **Слой 2**: Общие NER (акторы) между нодами

### Основные функции

#### Инициализация графа

```javascript
const processor = new GraphProcessor();
const graph = processor.initializeGraph(posts, actors, relationships);
```

#### Кластеризация вокруг точки

```javascript
// Кластеризация вокруг выбранной ноды
const updatedGraph = processor.clusterAroundNode(
    'post_001',           // ID ноды
    0.7,                  // Уровень кластеризации (0-1)
    'combined'            // Режим: 'layer1', 'layer2', 'combined'
);
```

#### Декластеризация

```javascript
// Разделение всех кластеров
const updatedGraph = processor.decluster();

// Разделение конкретного кластера
const updatedGraph = processor.decluster('cluster_0');
```

#### Экспорт в JSON

```javascript
const graphJSON = processor.exportToJSON();
```

### Формат JSON на выходе

```json
{
  "nodes": [
    {
      "id": "post_001",
      "type": "post",
      "data": { /* данные поста */ },
      "layer": 1,
      "clusterId": "cluster_0",
      "layer1Connections": [
        {
          "nodeId": "post_002",
          "weight": 0.85
        }
      ],
      "layer2Connections": [
        {
          "nodeId": "post_003",
          "weight": 0.72,
          "sharedActors": ["actor_001", "actor_002"]
        }
      ]
    }
  ],
  "clusters": [
    {
      "id": "cluster_0",
      "nodes": ["post_001", "post_002"],
      "center": "post_001",
      "weight": 0.8
    }
  ],
  "metadata": {
    "totalNodes": 23,
    "layer1Connections": 45,
    "layer2Connections": 38,
    "clusterLevel": 0.7,
    "totalClusters": 5
  }
}
```

### Конфигурация

Параметры кластеризации настраиваются через `CLUSTERING_CONFIG`:

```javascript
const CLUSTERING_CONFIG = {
    // Пороги для слоя 1 (семантическая похожесть)
    LAYER1_SIMILARITY_THRESHOLD: 0.7,
    LAYER1_CLUSTER_THRESHOLD: 0.5,
    
    // Пороги для слоя 2 (общие NER)
    LAYER2_SHARED_ACTORS_MIN: 1,
    LAYER2_CLUSTER_THRESHOLD: 0.5,
    
    // Комбинированная кластеризация
    COMBINED_WEIGHT_LAYER1: 0.6,
    COMBINED_WEIGHT_LAYER2: 0.4,
    
    // Параметры кластеризации
    FOCUS_RADIUS: 2,
    MIN_CLUSTER_SIZE: 2,
    MAX_CLUSTER_SIZE: 50
};
```

## Модуль 2: GraphRenderer

### Назначение

Визуализация двухслойного графа с интерактивными возможностями:
- Отображение узлов и связей двух слоев
- Интерактивная кластеризация/декластеризация
- Физическая симуляция графа

### Основные функции

#### Инициализация

```javascript
const renderer = new GraphRenderer('graphContainer', processor);
```

#### Загрузка графа

```javascript
renderer.loadGraph(graphJSON);
```

#### Запрос кластеризации

```javascript
// Кластеризация вокруг выбранного узла
renderer.requestClustering(0.7, 'combined');
```

#### Запрос декластеризации

```javascript
// Разделение всех кластеров
renderer.requestDeclustering();

// Разделение конкретного кластера
renderer.requestDeclustering('cluster_0');
```

#### Управление параметрами

```javascript
// Установка уровня кластеризации (0-1)
renderer.setClusterLevel(0.8);

// Установка режима слоя
renderer.setLayerMode('layer1');  // или 'layer2', 'combined'
```

### События

Модуль отправляет следующие события:

```javascript
// Выбор узла
window.addEventListener('nodeSelected', (e) => {
    console.log('Выбран узел:', e.detail.nodeId);
});

// Обновление графа
window.addEventListener('graphUpdated', (e) => {
    console.log('Граф обновлен:', e.detail.graph);
});
```

## Математические модели

### Кластеризация слоя 1 (Семантическая похожесть)

Используется **косинусное сходство** между embedding векторами:

```
similarity = (vec1 · vec2) / (||vec1|| × ||vec2||)
```

Связь создается, если `similarity >= LAYER1_SIMILARITY_THRESHOLD`.

### Кластеризация слоя 2 (Общие NER)

Используется **Jaccard similarity** с учетом отношений между акторами:

```
jaccard = |shared_actors| / (|actors1| + |actors2| - |shared_actors|)
weight = jaccard × 0.7 + relationship_bonus × 0.3
```

### Динамическая кластеризация

Алгоритм основан на:
1. **Вычислении расстояний** от фокусного узла (BFS с учетом весов связей)
2. **Пороговой кластеризации** на основе уровня кластеризации (0-1)
3. **Группировке узлов** по связности и весам

Уровень кластеризации определяет порог расстояния:
- `0.0` - все узлы отдельно (полный разбор)
- `1.0` - все связанные узлы в одном кластере (полный коллапс)

## Пример использования

```html
<!DOCTYPE html>
<html>
<head>
    <title>Graph Modules Demo</title>
    <style>
        #graphContainer {
            width: 100%;
            height: 600px;
            border: 1px solid #ccc;
        }
        .controls {
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="controls">
        <label>
            Уровень кластеризации:
            <input type="range" id="clusterLevelSlider" min="0" max="1" step="0.01" value="0.5">
            <span id="clusterLevelValue">50%</span>
        </label>
        <br>
        <button class="layer-mode-btn active" data-mode="combined">Оба слоя</button>
        <button class="layer-mode-btn" data-mode="layer1">Слой 1</button>
        <button class="layer-mode-btn" data-mode="layer2">Слой 2</button>
        <br>
        <button id="declusterBtn">Декластеризация</button>
        <button id="fullDeclusterBtn">Полная декластеризация</button>
    </div>
    <div id="graphContainer"></div>

    <script src="js/app.js"></script>
    <script src="js/graph-processor.js"></script>
    <script src="js/graph-renderer.js"></script>
    <script src="js/graph-example.js"></script>
    <script>
        // Загружаем данные
        loadData().then(() => {
            // Инициализируем модули графа
            initGraphModules();
        });
    </script>
</body>
</html>
```

## Интеграция с существующим кодом

Модули можно интегрировать в существующую систему:

1. Добавить скрипты в `index.html`:
```html
<script src="js/graph-processor.js"></script>
<script src="js/graph-renderer.js"></script>
<script src="js/graph-example.js"></script>
```

2. Инициализировать после загрузки данных:
```javascript
window.addEventListener('dataLoaded', () => {
    initGraphModules();
});
```

## Рекомендации по использованию

1. **Настройка порогов**: Адаптируйте `CLUSTERING_CONFIG` под ваши данные
2. **Производительность**: Для больших графов (>1000 узлов) рассмотрите оптимизацию алгоритмов
3. **Визуализация**: Настройте цвета и стили связей в `GraphRenderer.renderLinks()`
4. **Интерактивность**: Добавьте tooltips и детальную информацию о узлах

## Дальнейшее развитие

- [ ] Оптимизация алгоритмов для больших графов
- [ ] Кэширование результатов кластеризации
- [ ] Анимация переходов между состояниями
- [ ] Экспорт/импорт конфигураций кластеризации
- [ ] Метрики качества кластеризации

