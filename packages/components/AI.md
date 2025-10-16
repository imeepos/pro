# @pro/components - AI Reference Documentation

## Package Overview

**Package Name**: `@pro/components`
**Version**: 1.0.0
**Purpose**: Shared Angular UI components library for data visualization and screen displays
**Type**: Angular 20 standalone component library
**Build Tool**: ng-packagr

This package provides reusable Angular components designed for real-time data visualization, event monitoring, and dashboard screens. All components support WebSocket-based real-time updates and follow the IScreenComponent interface pattern.

---

## Directory Structure

```
src/
├── screen-components/          # Main screen display components
│   ├── base/                   # Base interfaces and services
│   │   ├── screen-component.interface.ts
│   │   ├── component-metadata.interface.ts
│   │   └── component-registry.service.ts
│   ├── weibo/                  # Weibo-related components
│   │   ├── weibo-logged-in-users-card.component.ts
│   │   └── index.ts
│   ├── events/                 # Event visualization components
│   │   ├── event-map-distribution.component.ts
│   │   ├── hot-events-ranking.component.ts
│   │   └── index.ts
│   ├── charts/                 # Chart and visualization components
│   │   ├── word-cloud-statistics.component.ts
│   │   └── index.ts
│   ├── component-initializer.service.ts
│   └── index.ts
├── websocket/                  # WebSocket infrastructure
│   ├── auth/
│   │   └── jwt-auth.service.ts
│   ├── websocket.service.ts
│   ├── websocket.manager.ts
│   ├── websocket.types.ts
│   ├── utils.ts
│   └── index.ts
├── data-providers/             # Data source abstractions
│   └── data-providers.ts
├── validation/                 # Component validation utilities
│   └── component-consistency.service.ts
├── models/                     # Shared models
│   └── theme.model.ts
├── interfaces/                 # Common interfaces
│   └── component-base.interface.ts
└── index.ts                    # Main export file
```

---

## Core Interfaces

### IScreenComponent
Base interface for all screen components.

```typescript
interface IScreenComponent extends OnInit, OnDestroy {
  config?: any;
  onConfigChange?(config: any): void;
  onMount?(): void;
  onDestroy?(): void;
}
```

### ComponentMetadata
Defines component registration metadata.

```typescript
interface ComponentMetadata {
  type: string;           // Unique component type identifier
  name: string;           // Display name
  icon: string;           // Icon representation
  category: string;       // Category for grouping
  defaultConfig?: any;    // Default configuration
  description?: string;   // Component description
  configSchema?: any;     // Configuration schema
}
```

---

## Screen Components

### 1. WeiboLoggedInUsersCardComponent

**Location**: `src/screen-components/weibo/weibo-logged-in-users-card.component.ts`
**Selector**: `pro-weibo-logged-in-users-card`
**Type**: `weibo-logged-in-users-card`
**Category**: 微博数据

#### Purpose
Displays Weibo platform logged-in user statistics with real-time WebSocket updates.

#### Configuration Interface
```typescript
interface WeiboUsersCardConfig {
  mode?: 'edit' | 'display';          // Display mode
  title?: string;                      // Card title
  showTotal?: boolean;                 // Show total users
  showTodayNew?: boolean;              // Show today's new users
  showOnline?: boolean;                // Show online users
  theme?: 'default' | 'blue' | 'green' | 'purple' | 'orange';
  refreshInterval?: number;            // Refresh interval in ms
  showIcons?: boolean;                 // Show icons
  enableAnimation?: boolean;           // Enable animations
  showErrorHandling?: boolean;         // Show error states
  showTrends?: boolean;                // Show trend indicators
  showUpdateTime?: boolean;            // Show last update time
}
```

#### Dependencies
- `WEIBO_STATS_DATA_SOURCE`: Data source injection token
- `TOKEN_STORAGE`: Token storage injection token
- `WebSocketManager`: WebSocket connection manager (optional)

#### Usage Example
```typescript
import { WeiboLoggedInUsersCardComponent } from '@pro/components';

@Component({
  template: `
    <pro-weibo-logged-in-users-card
      [config]="{
        mode: 'display',
        title: '微博用户统计',
        showTotal: true,
        showTodayNew: true,
        showOnline: true,
        theme: 'blue'
      }">
    </pro-weibo-logged-in-users-card>
  `
})
```

---

### 2. HotEventsRankingComponent

**Location**: `src/screen-components/events/hot-events-ranking.component.ts`
**Selector**: `pro-hot-events-ranking`
**Type**: `hot-events-ranking`
**Category**: 事件分析

#### Purpose
Displays a ranked list of hot events with heat scores, trends, and location information.

#### Configuration Interface
```typescript
interface HotEventsRankingConfig {
  mode?: 'edit' | 'display';
  title?: string;
  maxItems?: number;                   // Maximum items to display
  refreshInterval?: number;            // Auto-refresh interval
  highlightTopN?: number;              // Highlight top N items
  showSummary?: boolean;               // Show event summary
  showTrend?: boolean;                 // Show trend indicators
  showLocation?: boolean;              // Show location info
  allowManualRefresh?: boolean;        // Allow manual refresh
  eventStatus?: 'all' | 'published';   // Filter by event status
  industryTypeId?: string;             // Filter by industry type
  eventTypeId?: string;                // Filter by event type
  province?: string;                   // Filter by province
  staticEntries?: HotEventStaticEntry[]; // Static data override
}
```

#### Dependencies
- `EVENT_DATA_SOURCE`: Event data source injection token

#### Usage Example
```typescript
import { HotEventsRankingComponent } from '@pro/components';

@Component({
  template: `
    <pro-hot-events-ranking
      [config]="{
        mode: 'display',
        title: '热门事件排行榜',
        maxItems: 8,
        highlightTopN: 3,
        showTrend: true,
        eventStatus: 'published'
      }">
    </pro-hot-events-ranking>
  `
})
```

---

### 3. EventMapDistributionComponent

**Location**: `src/screen-components/events/event-map-distribution.component.ts`
**Selector**: `pro-event-map-distribution`
**Type**: `event-map-distribution`
**Category**: 事件分析

#### Purpose
Visualizes event geographic distribution on an interactive map using AMap (高德地图).

#### Configuration Interface
```typescript
interface EventMapDistributionConfig {
  mode?: 'edit' | 'display';
  title?: string;
  mapTheme?: 'midnight' | 'ocean' | 'sunrise' | 'minimal';
  maxEvents?: number;                  // Maximum events to plot
  refreshInterval?: number;            // Auto-refresh interval
  autoFit?: boolean;                   // Auto-fit map view
  enableCluster?: boolean;             // Enable marker clustering
  showLegend?: boolean;                // Show legend
  showSummary?: boolean;               // Show province summary
  highlightLatest?: boolean;           // Highlight latest events
  eventStatus?: 'all' | 'published';
  industryTypeId?: string;
  eventTypeId?: string;
  province?: string;
  apiKeyOverride?: string;             // Override AMap API key
}
```

#### Dependencies
- `EVENT_DATA_SOURCE`: Event data source injection token
- AMap loader: `@amap/amap-jsapi-loader`

#### Usage Example
```typescript
import { EventMapDistributionComponent } from '@pro/components';

@Component({
  template: `
    <pro-event-map-distribution
      [config]="{
        mode: 'display',
        title: '事件地图分布',
        mapTheme: 'minimal',
        maxEvents: 200,
        enableCluster: true,
        showLegend: true
      }">
    </pro-event-map-distribution>
  `
})
```

---

### 4. WordCloudStatisticsComponent

**Location**: `src/screen-components/charts/word-cloud-statistics.component.ts`
**Selector**: `pro-word-cloud-statistics`
**Type**: `word-cloud-statistics`
**Category**: 可视化图表

#### Purpose
Displays keyword statistics as an interactive word cloud with customizable themes and colors.

#### Configuration Interface
```typescript
interface WordCloudStatisticsConfig {
  mode?: 'edit' | 'display';
  title?: string;
  words?: WordCloudDatum[];            // Word data array
  maxWords?: number;                   // Maximum words to display
  minFontSize?: number;                // Minimum font size
  maxFontSize?: number;                // Maximum font size
  palette?: string[];                  // Color palette
  background?: 'dark' | 'light' | 'transparent';
  rotate?: boolean;                    // Enable rotation
  rotationAngles?: number[];           // Rotation angles
  refreshInterval?: number;            // Auto-refresh interval
  highlightThreshold?: number;         // Highlight threshold
  showMetaPanel?: boolean;             // Show metadata panel
  randomizeOnRefresh?: boolean;        // Randomize layout on refresh
}

interface WordCloudDatum {
  term: string;
  weight: number;
  category?: string;
  color?: string;
}
```

#### Usage Example
```typescript
import { WordCloudStatisticsComponent, WordCloudDatum } from '@pro/components';

const words: WordCloudDatum[] = [
  { term: '数据治理', weight: 96, category: 'strategy' },
  { term: '实时监控', weight: 88, category: 'operations' },
  { term: '智能分析', weight: 82, category: 'ai' }
];

@Component({
  template: `
    <pro-word-cloud-statistics
      [config]="{
        mode: 'display',
        title: '关键词词云',
        words: words,
        maxWords: 60,
        background: 'transparent'
      }">
    </pro-word-cloud-statistics>
  `
})
```

---

## WebSocket Services

### ConnectionState Enum
```typescript
enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Failed = 'failed'
}
```

### WebSocketService

**Location**: `src/websocket/websocket.service.ts`

#### Purpose
Manages individual WebSocket connections with auto-reconnection and event streaming.

#### Key Methods
```typescript
class WebSocketService implements WebSocketInstance {
  state$: Observable<ConnectionState>;
  isConnected$: Observable<boolean>;

  connect(config: WebSocketConfig): void;
  disconnect(): void;
  on<T = any>(event: string): Observable<T>;
  emit(event: string, data?: any): void;
}
```

### WebSocketManager

**Location**: `src/websocket/websocket.manager.ts`

#### Purpose
Manages multiple WebSocket connections across different namespaces.

#### Key Methods
```typescript
class WebSocketManager {
  getConnection(namespace: string): WebSocketInstance | null;
  createConnection(config: WebSocketConfig): WebSocketInstance;
  connectToNamespace(config: WebSocketConfig): WebSocketInstance;
  disconnectFromNamespace(namespace: string): void;
  disconnectAll(): void;
  globalConnectionState$: Observable<ConnectionState>;
  globalConnectionStatus$: Observable<boolean>;
}
```

#### Usage Example
```typescript
import { WebSocketManager, createScreensWebSocketConfig } from '@pro/components';

const wsManager = inject(WebSocketManager);
const config = createScreensWebSocketConfig('http://localhost:3000', token);
const connection = wsManager.connectToNamespace(config);

connection.on('event-name').subscribe(data => {
  console.log('Received:', data);
});
```

---

## Core Services

### ComponentRegistryService

**Location**: `src/screen-components/base/component-registry.service.ts`

#### Purpose
Central registry for all screen components with metadata management.

#### Key Methods
```typescript
class ComponentRegistryService {
  register(metadata: ComponentMetadata, component: Type<any>): void;
  get(type: string): Type<any> | undefined;
  getMetadata(type: string): ComponentMetadata | undefined;
  getAll(): Array<{type: string; component: Type<any>; metadata: ComponentMetadata}>;
  getAllByCategory(category: string): Array<...>;
  getWithValidation(type: string): ComponentValidationResult;
}
```

### ComponentInitializerService

**Location**: `src/screen-components/component-initializer.service.ts`

#### Purpose
Initializes and registers all available screen components at application startup.

#### Key Methods
```typescript
class ComponentInitializerService {
  initializeComponents(): void;
  getRegistrationStats(): {...};
  validateRegistration(): {...};
}
```

#### Usage Example
```typescript
import { ComponentInitializerService } from '@pro/components';

// In app initialization
const initializer = inject(ComponentInitializerService);
initializer.initializeComponents();

// Validate registration
const validation = initializer.validateRegistration();
console.log('Registered:', validation.registeredComponents);
```

### ComponentConsistencyService

**Location**: `src/validation/component-consistency.service.ts`

#### Purpose
Validates component implementations against IScreenComponent interface requirements.

#### Key Methods
```typescript
class ComponentConsistencyService {
  validateAllComponents(): ConsistencyValidationReport;
  validateComponent(type: string, componentClass: any): ComponentValidationResult;
}
```

---

## Data Provider Interfaces

### Data Source Injection Tokens

#### WEIBO_STATS_DATA_SOURCE
```typescript
interface WeiboStatsDataSource {
  fetchLoggedInUsers(): Observable<LoggedInUsersStats>;
}

const WEIBO_STATS_DATA_SOURCE = new InjectionToken<WeiboStatsDataSource>('WEIBO_STATS_DATA_SOURCE');
```

#### EVENT_DATA_SOURCE
```typescript
interface EventDataSource {
  fetchEvents(params: EventQueryParams): Promise<EventSummary[]>;
  fetchEventsForMap(params: EventMapQueryParams): Promise<EventMapPoint[]>;
  fetchAmapApiKey(): Promise<string | null>;
}

const EVENT_DATA_SOURCE = new InjectionToken<EventDataSource>('EVENT_DATA_SOURCE');
```

#### TOKEN_STORAGE
```typescript
interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
}

const TOKEN_STORAGE = new InjectionToken<TokenStorage>('TOKEN_STORAGE');
```

### Provider Registration Example
```typescript
import { WEIBO_STATS_DATA_SOURCE, EVENT_DATA_SOURCE, TOKEN_STORAGE } from '@pro/components';

providers: [
  {
    provide: WEIBO_STATS_DATA_SOURCE,
    useClass: WeiboStatsService
  },
  {
    provide: EVENT_DATA_SOURCE,
    useClass: EventService
  },
  {
    provide: TOKEN_STORAGE,
    useClass: AuthTokenService
  }
]
```

---

## Component Quick Reference

| Component | Selector | Type Identifier | Primary Use Case |
|-----------|----------|-----------------|------------------|
| WeiboLoggedInUsersCard | `pro-weibo-logged-in-users-card` | `weibo-logged-in-users-card` | Weibo user statistics with real-time updates |
| HotEventsRanking | `pro-hot-events-ranking` | `hot-events-ranking` | Event ranking with heat scores and trends |
| EventMapDistribution | `pro-event-map-distribution` | `event-map-distribution` | Geographic event visualization on map |
| WordCloudStatistics | `pro-word-cloud-statistics` | `word-cloud-statistics` | Keyword frequency visualization |

---

## Common Patterns

### 1. Component Registration Pattern
All components must be registered via ComponentInitializerService with complete metadata.

### 2. Configuration Pattern
All components accept a configuration object via `@Input() config` and implement `onConfigChange()` for dynamic updates.

### 3. Real-Time Data Pattern
Components use optional dependency injection for data sources and WebSocket managers, enabling graceful degradation when services are unavailable.

### 4. Mode-Based Behavior
Components support `edit` and `display` modes with different feature sets and visual presentations.

### 5. Error Handling Pattern
Components implement comprehensive error handling with user-friendly messages and retry mechanisms.

---

## Development Guidelines

### Adding a New Component

1. Create component file in appropriate category directory
2. Implement `IScreenComponent` interface
3. Add configuration interface
4. Export from category `index.ts`
5. Register in `ComponentInitializerService`
6. Add validation in `ComponentConsistencyService`

### WebSocket Integration

1. Inject `WebSocketManager` as optional dependency
2. Check availability before initialization
3. Subscribe to connection state changes
4. Implement graceful degradation
5. Clean up subscriptions in `ngOnDestroy`

### Data Provider Integration

1. Define data provider interface
2. Create injection token
3. Inject as optional dependency
4. Implement fallback behavior
5. Handle loading and error states

---

## Build and Development

### Commands
```bash
# Build the package
pnpm run build

# Watch mode for development
pnpm run dev

# Type checking
pnpm run typecheck

# Linting
pnpm run lint
```

### Output
- **Main Entry**: `./dist/fesm2022/pro-components.mjs`
- **Type Definitions**: `./dist/index.d.ts`

---

## Dependencies

### Peer Dependencies
- `@angular/common`: ^20.0.0
- `@angular/core`: ^20.0.0
- `@angular/forms`: ^20.0.0
- `rxjs`: ^7.8.1

### Runtime Dependencies
- `@amap/amap-jsapi-loader`: ^1.0.1 (for map components)
- `socket.io-client`: ^4.8.1 (for WebSocket functionality)
- `@pro/types`: workspace:* (shared type definitions)

---

## AI Assistant Quick Tips

### Finding Components
- **Weibo statistics**: Use `WeiboLoggedInUsersCardComponent`
- **Event rankings**: Use `HotEventsRankingComponent`
- **Map visualization**: Use `EventMapDistributionComponent`
- **Word clouds**: Use `WordCloudStatisticsComponent`

### Common Issues
- **Component not rendering**: Check if component is registered in `ComponentInitializerService`
- **Data not loading**: Verify data provider is injected and available
- **WebSocket not connecting**: Check WebSocketManager configuration and token availability
- **Map not displaying**: Verify AMap API key is configured

### Best Practices
- Always provide data sources via dependency injection
- Use optional injection for WebSocket and data services
- Implement proper cleanup in `ngOnDestroy`
- Handle loading and error states gracefully
- Test both edit and display modes
