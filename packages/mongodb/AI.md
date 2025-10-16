# @pro/mongodb

MongoDB utilities package for raw data storage in the Pro monorepo.

## Purpose

This package provides MongoDB integration for storing and managing raw crawled data before processing. It serves as a buffer layer where raw content from crawlers (Weibo, JD, etc.) is stored with deduplication, status tracking, and lifecycle management.

## Directory Structure

```
src/
├── index.ts                      # Package exports
├── mongodb.module.ts             # NestJS module configuration
├── schemas/
│   ├── raw-data-source.schema.ts # Mongoose schema definition
│   └── raw-data-source.schema.spec.ts
├── services/
│   ├── raw-data-source.service.ts # Core service operations
│   └── raw-data-source.service.spec.ts
├── types/
│   └── raw-data-source.types.ts  # Type definitions and enums
└── utils/
    ├── hash.util.ts              # Content hashing utility
    └── hash.util.spec.ts
```

## Key Exports

### Module
- **`MongodbModule`** (`mongodb.module.ts`)
  - `forRoot(uri: string)`: Initialize global MongoDB connection
  - `forFeature()`: Register schemas in feature modules

### Schema
- **`RawDataSource`** (`schemas/raw-data-source.schema.ts`)
  - Mongoose document class with indexed fields
- **`RawDataSourceDoc`**: Type alias for document with Mongoose Document
- **`RawDataSourceSchema`**: Compiled Mongoose schema

### Service
- **`RawDataSourceService`** (`services/raw-data-source.service.ts`)
  - CRUD operations and lifecycle management

### Types
- **`SourceType`** (`types/raw-data-source.types.ts`)
  - Enum: `WEIBO_HTML`, `WEIBO_API_JSON`, `WEIBO_COMMENT`
- **`ProcessingStatus`**
  - Enum: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`
- **`CreateRawDataSourceDto`**: Creation payload interface

### Utils
- **`calculateContentHash(content: string): string`** (`utils/hash.util.ts`)
  - SHA-256 hash for content deduplication

## Data Model

### RawDataSource Schema

```typescript
{
  sourceType: string;        // Type of data source (indexed)
  sourceUrl: string;         // Origin URL
  rawContent: string;        // Raw content (HTML, JSON, etc.)
  contentHash: string;       // SHA-256 hash (unique, sparse)
  metadata?: object;         // Additional metadata
  status: string;            // Processing status (indexed)
  processedAt?: Date;        // Processing timestamp
  errorMessage?: string;     // Error details if failed
  createdAt: Date;          // Creation timestamp (auto)
}
```

**Indexes:**
- Single: `sourceType`, `status`, `contentHash` (unique)
- Compound: `{ status: 1, createdAt: 1 }`

## Usage Examples

### Module Initialization

```typescript
// In main app module (e.g., crawler, cleaner)
import { MongodbModule } from '@pro/mongodb';

@Module({
  imports: [
    MongodbModule.forRoot(process.env.MONGODB_URI),
  ],
})
export class AppModule {}
```

### Creating Raw Data Records

```typescript
import { RawDataSourceService, SourceType, CreateRawDataSourceDto } from '@pro/mongodb';

@Injectable()
export class CrawlerService {
  constructor(private readonly rawDataService: RawDataSourceService) {}

  async saveCrawledData(url: string, html: string) {
    try {
      const dto: CreateRawDataSourceDto = {
        sourceType: SourceType.WEIBO_HTML,
        sourceUrl: url,
        rawContent: html,
        metadata: { crawledAt: new Date(), browser: 'chromium' }
      };

      const record = await this.rawDataService.create(dto);
      return record;
    } catch (error) {
      if (error.message === 'Duplicate content') {
        // Content already exists, skip
      } else {
        throw error;
      }
    }
  }
}
```

### Processing Pipeline

```typescript
// Fetch pending records
const pendingRecords = await rawDataService.findPending(50);

for (const record of pendingRecords) {
  // Mark as processing
  await rawDataService.markProcessing(record._id);

  try {
    // Process raw content
    await processRawData(record.rawContent);

    // Mark as completed
    await rawDataService.markCompleted(record._id);
  } catch (error) {
    // Mark as failed with error message
    await rawDataService.markFailed(record._id, error.message);
  }
}
```

### Data Cleanup

```typescript
// Delete completed records older than 30 days
const deletedCount = await rawDataService.deleteOldCompleted(30);
console.log(`Cleaned up ${deletedCount} old records`);
```

### Statistics Monitoring

```typescript
const stats = await rawDataService.getStatistics();
// Returns: { pending: 123, processing: 5, completed: 4567, failed: 12 }
```

## Service API Reference

### RawDataSourceService Methods

#### `create(dto: CreateRawDataSourceDto): Promise<RawDataSourceDoc>`
Creates a new raw data record with automatic hash generation. Throws 'Duplicate content' error if contentHash already exists.

#### `findById(id: string): Promise<RawDataSourceDoc | null>`
Retrieves a single record by MongoDB ObjectId.

#### `findPending(limit?: number): Promise<RawDataSourceDoc[]>`
Returns pending records sorted by creation time (oldest first). Default limit: 100.

#### `markProcessing(id: string): Promise<RawDataSourceDoc | null>`
Updates status to PROCESSING. Use when starting to process a record.

#### `markCompleted(id: string): Promise<RawDataSourceDoc | null>`
Updates status to COMPLETED and sets processedAt timestamp.

#### `markFailed(id: string, errorMessage: string): Promise<RawDataSourceDoc | null>`
Updates status to FAILED with error details and processedAt timestamp.

#### `deleteOldCompleted(days?: number): Promise<number>`
Deletes completed records older than specified days (default: 30). Returns count of deleted records.

#### `getStatistics(): Promise<Record<string, number>>`
Returns aggregated count of records by status.

## Connection Management

The package uses NestJS `@nestjs/mongoose` for connection management:

- **Global Module**: Use `MongodbModule.forRoot(uri)` in main app module
- **Singleton Connection**: Mongoose maintains single connection pool
- **Auto-reconnect**: Built-in reconnection logic
- **URI Format**: `mongodb://user:pass@host:port/database`

## Design Patterns

### Content Deduplication
- Automatic SHA-256 hash generation from rawContent
- Unique index on contentHash prevents duplicate storage
- Graceful handling of duplicate attempts

### Status Lifecycle
```
PENDING → PROCESSING → COMPLETED
                    → FAILED
```

### Data Retention
- Completed records are retained for configurable period
- Failed records preserved for debugging
- Automatic cleanup via `deleteOldCompleted()`

## Integration Points

### Crawler App
Creates raw data records after successful page crawling.

### Cleaner App
Consumes pending records, processes content, updates status.

### Broker App
Monitors statistics, triggers cleanup tasks.

## Best Practices

1. **Always use try-catch** when calling `create()` to handle duplicates
2. **Mark processing immediately** to prevent duplicate processing
3. **Set meaningful metadata** for debugging and tracking
4. **Implement cleanup schedules** to prevent unbounded growth
5. **Monitor statistics** to detect processing bottlenecks
6. **Use appropriate limits** in `findPending()` based on processing capacity

## Dependencies

- `mongoose: ^8.0.0` - MongoDB ODM
- `@nestjs/mongoose: ^11.0.3` - NestJS integration
- `@pro/types` - Shared type definitions

## Testing

- Unit tests with `jest` and `@nestjs/testing`
- Integration tests use `mongodb-memory-server`
- Test files: `*.spec.ts` alongside source files
