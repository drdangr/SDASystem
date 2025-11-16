# Story Driven Analytical System - UI Prototype v2.0

Прототип пользовательского интерфейса для Story Driven аналитико-информационной системы с трёхпанельной компоновкой и интерактивными компонентами.

## 📋 Обзор

Система формирует сюжеты (stories) на основе:
- **Графа постов/новостей** (контентный слой)
- **Графа акторов** (люди, компании, страны, организации)

Используется двухуровневая структура данных с автоматической кластеризацией и редакторскими инструментами.

## 🎨 Архитектура UI

### Трёхпанельная компоновка

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Search | View Mode | Filters | Explain Mode        │
├──────────────┬─────────────────────────┬────────────────────┤
│  LEFT PANEL  │    CENTER PANEL         │   RIGHT PANEL      │
│              │                         │                    │
│  Stories     │    Story/Actor Detail   │   Timeline         │
│  Navigation  │                         │   or               │
│              │                         │   Actors List      │
│  • List      │    Selected content     │   or               │
│  • Graph     │    with full details    │   Analytics        │
│  • Tree      │                         │                    │
│              │                         │                    │
│  [Resizable] │      [Resizable]        │   [Tabs]           │
└──────────────┴─────────────────────────┴────────────────────┘
```

### Основные компоненты

1. **Left Panel - Stories Navigation**
   - **List View**: Компактный список сюжетов с метриками
   - **Graph View**: Визуальный граф связей между сюжетами
   - **Tree View**: Иерархическое дерево доменов и поддоменов

2. **Center Panel - Content Detail**
   - Story Card: Детали сюжета, акторы, посты, метрики
   - Actor Card: Профиль актора, упоминания, связи
   - Breadcrumb navigation

3. **Right Panel - Context**
   - **Timeline Tab**: Интерактивная временная шкала событий (факты ↑ / мнения ↓)
   - **Actors Tab**: Список акторов текущего сюжета
   - **Analytics Tab**: Графики и аналитика

## 📁 Структура проекта

```
prototype/
├── index.html              # Единая точка входа (трёхпанельный UI)
├── actors.html             # [Deprecated] Редирект на index.html
├── posts.html              # [Deprecated] Редирект на index.html
├── data/                   # Мокап данные
│   ├── stories.json        # 9 сюжетов с метриками
│   ├── actors.json         # 23 актора
│   ├── posts.json          # 23 поста
│   └── relationships.json  # 26 связей между акторами
├── css/
│   └── styles.css          # Полная стилизация трёхпанельного UI
└── js/
    ├── app.js              # Утилиты и загрузка данных
    ├── layout.js           # Resizable панели, view switching
    ├── stories-view.js     # Рендеринг сюжетов (list/graph/tree)
    ├── timeline.js         # Интерактивный Timeline
    ├── actors-panel.js     # Панель акторов
    ├── interactions.js     # Связи между панелями
    └── main.js             # Главная инициализация
```

## ✨ Ключевые функции

### 1. Resizable Panels
- Drag-разделители между панелями
- Сохранение размеров панелей
- Min/max constraints

### 2. View Modes (Stories)
- **List**: Список с сортировкой (relevance/freshness/size/cohesion)
- **Graph**: Force-directed граф с узлами-сюжетами
- **Tree**: Иерархическое дерево доменов

### 3. Interactive Timeline
- Факты (верх) и мнения (низ)
- Zoom controls (−/⊙/+)
- Фильтры (All/Facts/Opinions)
- Hover превью событий
- Click для деталей

### 4. Cross-Panel Interactions
- Клик по сюжету → обновление Center + Timeline + Actors
- Клик по актору → фильтрация Timeline + детали актора
- Клик по событию → переход к посту
- Breadcrumb навигация

### 5. Editorial Tools
- 🧩 Merge Stories
- ✂️ Split Story
- ❄️ Freeze Story
- 📌 Pin Actor
- 🪄 Smart Suggest

### 6. Explain Mode (🧠)
- Показывает reasoning для решений системы
- Similarity breakdown (semantic/actor overlap/domain/temporal)
- Debug информация

## 🚀 Запуск

### Простой способ (Python)
```bash
cd prototype
python -m http.server 8000
```

### С Node.js
```bash
cd prototype
npx http-server -p 8000
```

Затем откройте: `http://localhost:8000`

## 🎯 Взаимодействие с UI

### Навигация

| Действие | Результат |
|----------|-----------|
| Клик на сюжет (Left) | Показать детали в Center, обновить Timeline и Actors |
| Клик на актора (Right/Center) | Показать профиль актора в Center |
| Клик на событие (Timeline) | Открыть пост |
| Breadcrumb навигация | Вернуться к предыдущему уровню |

### Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `Ctrl/Cmd + K` | Фокус на глобальный поиск |
| `Esc` | Закрыть панели/модалы |

### View Mode Switcher
- 📋 List View - компактный список
- 🕸️ Graph View - граф связей
- 🌳 Tree View - дерево доменов

## 📊 Мокап данные

### Stories (9 сюжетов)
1. **GPT-5 Launch and Industry Response**
   - 6 posts, relevance: 95%, cohesion: 88%
   - Actors: OpenAI, Microsoft, Google DeepMind

2. **AI Regulation and Safety Concerns**
   - 4 posts, relevance: 87%, cohesion: 82%
   - Actors: EU, US Congress, researchers

3. **xAI Funding and Competitive Positioning**
   - 2 posts, relevance: 78%, cohesion: 90%
   - Actors: Elon Musk, xAI

4. **NVIDIA Dominance and AI Chip Supply Chain**
   - 3 posts, relevance: 82%, cohesion: 85%
   - Actors: NVIDIA, Jensen Huang, China, Baidu

5. **Meta and Anthropic Compete in Open-Source AI**
   - 4 posts, relevance: 79%, cohesion: 83%
   - Actors: Meta, Anthropic, AWS, Mark Zuckerberg, Dario Amodei

6. **Apple Enters AI Race with iPhone Integration**
   - 2 posts, relevance: 85%, cohesion: 88%
   - Actors: Apple, Tim Cook, OpenAI

7. **International AI Governance and Safety Cooperation**
   - 1 post, relevance: 76%, cohesion: 80%
   - Actors: UK Government, OpenAI, Google DeepMind, EU

8. **Tesla and xAI: Musk's Dual AI Ventures**
   - 3 posts, relevance: 73%, cohesion: 87%
   - Actors: Elon Musk, Tesla, xAI

9. **China's AI Development and Geopolitical Tensions**
   - 3 posts, relevance: 81%, cohesion: 84%
   - Actors: China, Baidu, NVIDIA

### Actors (23 актора)
- **Companies**: OpenAI, Microsoft, Google DeepMind, xAI, Anthropic, Meta, Baidu, NVIDIA, Tesla, Amazon, Apple, Stability AI
- **People**: Sam Altman, Elon Musk, Dario Amodei, Mark Zuckerberg, Jensen Huang, Andy Jassy, Tim Cook
- **Organizations**: European Union, US Congress, UK Government
- **Countries**: China

### Relationships (26 связей)
- Types: `member_of`, `ally_of`, `competitor_of`, `part_of`, `owns`, `regulates`, `partner_of`, `supplier_of`
- Включает связи CEO-компании, конкурентов, партнеров, поставщиков (NVIDIA как поставщик чипов), регуляторов

## 🎨 Design Principles

### Color Coding
- **Domains**: Technology (blue), Politics (purple), Economy (green), War (red)
- **Actor Types**: Person (blue), Company (cyan), Organization (purple), Country (green)
- **Timeline**: Facts (blue ↑), Opinions (orange ↓)

### Interactivity
- Всё кликабельно и связано
- Hover показывает превью
- Smooth transitions и animations
- Responsive design

### UX Patterns
- Click: открыть детали
- Hover: показать tooltip/превью
- Drag: изменить размер панелей

## 🔧 Технологии

- **Vanilla JavaScript** (ES6+) - без фреймворков для простоты прототипа
- **CSS Grid + Flexbox** - современный layout
- **SVG** - для графа и визуализаций
- **CSS Variables** - динамическое изменение темы
- **Event-driven architecture** - CustomEvents для связи между компонентами

## 📈 Метрики и индикаторы

### Story Metrics
- **Relevance**: Актуальность сюжета (0-100%)
- **Cohesion**: Связность постов (0-100%)
- **Freshness**: Свежесть обновлений (0-100%)
- **Size**: Количество постов

### Actor Metrics
- **Mentions**: Количество упоминаний
- **Trend**: up ↗ / down ↘ / stable →
- **Last Update**: Время последнего упоминания

### Similarity Breakdown (Explain Mode)
- Semantic Similarity: Косинусная близость текстов
- Actor Overlap: Пересечение акторов
- Domain Similarity: Тематическая близость
- Temporal Proximity: Временная близость

## 🚧 Next Steps для Production

### Backend Integration
- REST API для загрузки данных
- WebSocket для real-time обновлений
- GraphQL для гибких запросов

### Advanced Features
- D3.js для продвинутых графов
- Force simulation для графа сюжетов
- Cytoscape.js для граф-визуализации акторов
- Recharts/ECharts для аналитики

### Editorial Features
- Drag-and-drop для merge/split
- Inline editing
- Undo/Redo history
- Collaborative editing

### Performance
- Virtual scrolling для больших списков
- Lazy loading
- Caching strategies
- Code splitting

### AI Integration
- NER для извлечения акторов
- Embeddings для кластеризации
- Sentiment analysis
- Auto-summarization

## 📝 Отличия от v1.0

| Aspect | v1.0 | v2.0 |
|--------|------|------|
| Layout | Отдельные страницы + модалы | Трёхпанельный single-page |
| Navigation | Page-based | Event-driven |
| View Modes | Только List | List / Graph / Tree |
| Timeline | В модале | Отдельная панель |
| Resizable | Нет | Да (drag dividers) |
| Cross-linking | Ограниченное | Полное (все панели связаны) |

---

**Built for Story Driven Analytics based on UI.md specification**
