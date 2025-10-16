# @pro/entities

## Overview

`@pro/entities` is the foundational data layer package containing all TypeORM entity definitions for the Pro monorepo. This package provides shared database models used across microservices (api, broker, crawler, cleaner) and defines the complete data schema including users, events, bugs, platform accounts, and search tasks.

**Package Type**: Shared library
**Database**: PostgreSQL with TypeORM
**Build Output**: ES modules + CommonJS + TypeScript definitions

## Directory Structure

```
packages/entities/
├── src/
│   ├── index.ts                          # Main exports + database config factory
│   ├── user.entity.ts                    # User authentication and profiles
│   ├── api-key.entity.ts                 # API key management
│   ├── weibo-account.entity.ts           # Weibo platform credentials
│   ├── jd-account.entity.ts              # JD platform credentials
│   ├── weibo-search-task.entity.ts       # Weibo crawling task configuration
│   ├── screen-page.entity.ts             # Dashboard visualization pages
│   ├── industry-type.entity.ts           # Industry taxonomy
│   ├── event-type.entity.ts              # Event taxonomy
│   ├── event.entity.ts                   # Event records
│   ├── event-attachment.entity.ts        # Event file attachments
│   ├── event-tag.entity.ts               # Event-Tag junction table
│   ├── tag.entity.ts                     # Reusable tags
│   ├── media-type.entity.ts              # Media classification
│   ├── bug.entity.ts                     # Bug tracking records
│   ├── bug-attachment.entity.ts          # Bug file attachments
│   ├── bug-comment.entity.ts             # Bug discussion comments
│   ├── bug-tag.entity.ts                 # Bug tags
│   ├── bug-watch.entity.ts               # Bug watchers/subscribers
│   ├── bug-activity.entity.ts            # Bug audit trail
│   ├── bug-time-tracking.entity.ts       # Bug time logging
│   └── bug-notification.entity.ts        # Bug notification queue
├── package.json
└── tsconfig.json
```

## Entity Catalog

### Core System Entities

#### UserEntity (`user.entity.ts`)
**Table**: `users`
**Purpose**: User authentication and profile management

**Key Fields**:
- `id` (uuid, PK): User identifier
- `username` (varchar 50, unique): Login username
- `email` (varchar 100, unique): Email address
- `password` (varchar 255, nullable): Hashed password
- `status` (enum UserStatus): User account status (ACTIVE/INACTIVE/SUSPENDED/DELETED)

**Relationships**:
- `reportedBugs` → BugEntity (reporter)
- `assignedBugs` → BugEntity (assignee)

**Indexes**: username, email

---

#### ApiKeyEntity (`api-key.entity.ts`)
**Table**: `api_keys`
**Purpose**: API authentication tokens for programmatic access

**Key Fields**:
- `id` (int, PK): Auto-increment ID
- `key` (varchar 35, unique): API key string (format: `ak_<32chars>`)
- `userId` (uuid, FK): Owner user
- `name` (varchar 100): Human-readable key name
- `type` (enum): READ_ONLY / READ_WRITE / ADMIN
- `permissions` (json): Permission array
- `isActive` (boolean): Enable/disable flag
- `expiresAt` (timestamp, nullable): Expiration date
- `usageCount` (int): Usage statistics
- `lastUsedAt` (timestamp): Last usage timestamp

**Computed Properties**:
- `isExpired`: Check if key is expired
- `isValid`: Check if key is active and not expired

**Methods**:
- `updateUsage()`: Increment usage counter
- `static generateKey()`: Generate new API key string

**Indexes**: key, (key, isActive)

---

### Platform Account Entities

#### WeiboAccountEntity (`weibo-account.entity.ts`)
**Table**: `weibo_accounts`
**Purpose**: Store Weibo platform credentials for crawling

**Key Fields**:
- `id` (int, PK): Auto-increment ID
- `userId` (uuid, FK): Owner user
- `weiboUid` (varchar 50): Weibo user ID
- `weiboNickname` (varchar 100): Display name
- `weiboAvatar` (varchar 500): Avatar URL
- `cookies` (text): Authentication cookies
- `status` (enum): ACTIVE / EXPIRED / BANNED / RESTRICTED
- `lastCheckAt` (timestamp): Last health check time

**Indexes**: userId, (userId, weiboUid) unique

---

#### JdAccountEntity (`jd-account.entity.ts`)
**Table**: `jd_accounts`
**Purpose**: Store JD platform credentials for crawling

**Key Fields**:
- `id` (int, PK): Auto-increment ID
- `userId` (uuid, FK): Owner user
- `jdUid` (varchar 50): JD user ID
- `jdNickname` (varchar 100): Display name
- `jdAvatar` (varchar 500): Avatar URL
- `cookies` (text): Authentication cookies
- `status` (enum): ACTIVE / EXPIRED / BANNED / RESTRICTED
- `lastCheckAt` (timestamp): Last health check time

**Indexes**: userId, (userId, jdUid) unique

---

### Task Management Entities

#### WeiboSearchTaskEntity (`weibo-search-task.entity.ts`)
**Table**: `weibo_search_tasks`
**Purpose**: Configuration and state management for continuous Weibo keyword monitoring

**Key Fields**:
- `id` (int, PK): Auto-increment ID
- `keyword` (varchar 100): Search keyword
- `startDate` (timestamp): Historical data start boundary
- `currentCrawlTime` (timestamp, nullable): Historical backfill cursor (decrements toward startDate)
- `latestCrawlTime` (timestamp, nullable): Latest data timestamp for incremental updates
- `crawlInterval` (varchar 20): Interval format (e.g., '1h', '30m', '1d')
- `nextRunAt` (timestamp): Next scheduled execution time
- `weiboAccountId` (int, nullable, FK): Assigned account
- `enableAccountRotation` (boolean): Enable multi-account rotation
- `status` (enum): PENDING / RUNNING / PAUSED / FAILED / TIMEOUT
- `enabled` (boolean): Task active flag
- `progress` (int): Completed segments count
- `totalSegments` (int): Total segments estimate
- `noDataCount` (int): Consecutive no-data runs
- `noDataThreshold` (int): Auto-pause threshold
- `retryCount` (int): Current retry attempts
- `maxRetries` (int): Maximum retry limit
- `errorMessage` (text): Last error details
- `longitude` / `latitude` (decimal 10,7): Geographic coordinates
- `locationAddress` (varchar 500): Location address
- `locationName` (varchar 200): Location name

**Computed Properties**:
- `needsInitialCrawl`: Check if first crawl is pending
- `isHistoricalCrawlCompleted`: Check if backfill is done
- `canRetry`: Check retry eligibility
- `shouldPauseForNoData`: Check if pause threshold reached
- `progressPercentage`: Calculate completion percentage
- `statusDescription`: Localized status text (Chinese)
- `phaseDescription`: Task phase description (Chinese)

**Indexes**: (enabled, nextRunAt), status

---

### Event System Entities

#### IndustryTypeEntity (`industry-type.entity.ts`)
**Table**: `industry_type`
**Purpose**: Industry classification taxonomy

**Key Fields**:
- `id` (bigint, PK): Auto-increment ID
- `industryCode` (varchar 50, unique): Industry code
- `industryName` (varchar 100): Industry name
- `description` (text): Description
- `sortOrder` (int): Display order
- `status` (smallint): Active status (1=active)

**Indexes**: industryCode, status

---

#### EventTypeEntity (`event-type.entity.ts`)
**Table**: `event_type`
**Purpose**: Event classification taxonomy

**Key Fields**:
- `id` (bigint, PK): Auto-increment ID
- `eventCode` (varchar 50, unique): Event type code
- `eventName` (varchar 100): Event type name
- `description` (text): Description
- `sortOrder` (int): Display order
- `status` (smallint): Active status (1=active)

**Indexes**: eventCode, status

---

#### EventEntity (`event.entity.ts`)
**Table**: `event`
**Purpose**: Core event records with location and temporal data

**Key Fields**:
- `id` (bigint, PK): Auto-increment ID
- `eventTypeId` (bigint, FK): Event classification
- `industryTypeId` (bigint, FK): Industry classification
- `eventName` (varchar 200): Event name
- `summary` (text): Event description
- `occurTime` (timestamp): Event occurrence time
- `province` / `city` / `district` (varchar 50): Administrative divisions
- `street` (varchar 100): Street address
- `locationText` (varchar 500): Full location text
- `longitude` / `latitude` (decimal 10,7): Coordinates
- `status` (smallint): DRAFT=0 / PUBLISHED=1 / ARCHIVED=2
- `createdBy` (varchar): Creator user ID

**Relationships**:
- `eventType` → EventTypeEntity
- `industryType` → IndustryTypeEntity
- `attachments` → EventAttachmentEntity[]
- `eventTags` → EventTagEntity[]

**Indexes**: eventTypeId, industryTypeId, occurTime, province, city, district, status

---

#### EventAttachmentEntity (`event-attachment.entity.ts`)
**Table**: `event_attachment`
**Purpose**: File attachments for events (stored in MinIO)

**Key Fields**:
- `id` (bigint, PK): Auto-increment ID
- `eventId` (bigint, FK): Parent event
- `fileName` (varchar 255): Display filename
- `fileUrl` (varchar 500): Public access URL
- `bucketName` (varchar 100): MinIO bucket
- `objectName` (varchar 500): MinIO object key
- `fileType` (enum): IMAGE / VIDEO / DOCUMENT
- `fileSize` (bigint): Size in bytes
- `mimeType` (varchar 100): MIME type
- `fileMd5` (varchar 32): MD5 hash for deduplication
- `sortOrder` (int): Display order

**Indexes**: eventId, fileMd5, sortOrder

---

#### TagEntity (`tag.entity.ts`)
**Table**: `tag`
**Purpose**: Reusable tagging system

**Key Fields**:
- `id` (bigint, PK): Auto-increment ID
- `tagName` (varchar 50, unique): Tag name
- `tagColor` (varchar 20): Display color (default: #1890ff)
- `usageCount` (int): Usage statistics

**Indexes**: tagName, usageCount

---

#### EventTagEntity (`event-tag.entity.ts`)
**Table**: `event_tag`
**Purpose**: Many-to-many junction between events and tags

**Key Fields**:
- `id` (bigint, PK): Auto-increment ID
- `eventId` (bigint, FK): Event reference
- `tagId` (bigint, FK): Tag reference

**Indexes**: (eventId, tagId) unique, eventId, tagId

---

### Bug Tracking System

#### BugEntity (`bug.entity.ts`)
**Table**: `bugs`
**Purpose**: Comprehensive bug tracking with workflow management

**Key Fields**:
- `id` (uuid, PK): Bug identifier
- `title` (varchar 200): Bug summary
- `description` (text): Detailed description
- `status` (enum): OPEN / IN_PROGRESS / RESOLVED / CLOSED / REOPENED
- `priority` (enum): LOW / MEDIUM / HIGH / CRITICAL
- `category` (enum): FUNCTIONAL / UI_UX / PERFORMANCE / SECURITY / DATA
- `reporterId` (varchar, FK): Reporter user
- `assigneeId` (varchar, FK): Assigned user
- `environment` (json): Environment details
- `stepsToReproduce` (text): Reproduction steps
- `expectedBehavior` (text): Expected behavior
- `actualBehavior` (text): Actual behavior
- `reproductionRate` (enum): always / sometimes / rarely
- `resolvedAt` (timestamp): Resolution timestamp
- `resolvedBy` (varchar, FK): Resolver user
- `closedAt` (timestamp): Closure timestamp
- `closedBy` (varchar, FK): Closer user
- `dueDate` (timestamp): Deadline
- `estimatedHours` (decimal 5,2): Estimated effort
- `actualHours` (decimal 5,2): Actual effort

**Relationships**:
- `reporter` → UserEntity
- `assignee` → UserEntity
- `resolver` → UserEntity
- `closer` → UserEntity
- `attachments` → BugAttachmentEntity[]
- `comments` → BugCommentEntity[]
- `tags` → BugTagEntity[] (many-to-many)
- `watchers` → BugWatchEntity[]
- `activities` → BugActivityEntity[]
- `timeTracking` → BugTimeTrackingEntity[]

**Indexes**: title, status, priority, category, reporterId, assigneeId, dueDate

---

#### BugAttachmentEntity (`bug-attachment.entity.ts`)
**Table**: `bug_attachments`
**Purpose**: File attachments for bugs or comments

**Key Fields**:
- `id` (uuid, PK): Attachment identifier
- `filename` (varchar 255): Storage filename
- `originalName` (varchar 255): Original filename
- `mimeType` (varchar 100): MIME type
- `size` (bigint): File size
- `url` (varchar 500): Access URL
- `uploadedBy` (varchar, FK): Uploader user
- `bugId` (varchar, nullable, FK): Parent bug
- `commentId` (varchar, nullable, FK): Parent comment

**Indexes**: uploadedBy

---

#### BugCommentEntity (`bug-comment.entity.ts`)
**Table**: `bug_comments`
**Purpose**: Discussion comments on bugs

**Key Fields**:
- `id` (uuid, PK): Comment identifier
- `bugId` (varchar, FK): Parent bug
- `content` (text): Comment text
- `authorId` (varchar, FK): Author user
- `authorName` (varchar 100): Author display name
- `isEdited` (boolean): Edit flag

**Relationships**:
- `bug` → BugEntity
- `author` → UserEntity
- `attachments` → BugAttachmentEntity[]

**Indexes**: bugId, authorId

---

#### BugTagEntity (`bug-tag.entity.ts`)
**Table**: `bug_tags`
**Purpose**: Tags for bug categorization

**Key Fields**:
- `id` (uuid, PK): Tag identifier
- `name` (varchar 50, unique): Tag name
- `color` (varchar 7): Hex color
- `description` (varchar 200): Description

**Relationships**:
- `bugs` → BugEntity[] (many-to-many)

**Indexes**: name unique

---

#### BugWatchEntity (`bug-watch.entity.ts`)
**Table**: `bug_watchers`
**Purpose**: User subscriptions to bug updates

**Key Fields**:
- `id` (uuid, PK): Watch identifier
- `bugId` (varchar, FK): Watched bug
- `userId` (varchar, FK): Watcher user

**Indexes**: bugId, userId

---

#### BugActivityEntity (`bug-activity.entity.ts`)
**Table**: `bug_activities`
**Purpose**: Audit trail for all bug changes

**Key Fields**:
- `id` (uuid, PK): Activity identifier
- `bugId` (varchar, FK): Parent bug
- `action` (enum): CREATED / UPDATED / ASSIGNED / STATUS_CHANGED / PRIORITY_CHANGED / COMMENT_ADDED / ATTACHMENT_ADDED / RESOLVED / CLOSED / REOPENED / WATCHER_ADDED / WATCHER_REMOVED / TAG_ADDED / TAG_REMOVED
- `userId` (varchar, FK): Actor user
- `userName` (varchar 100): Actor display name
- `oldValue` (json): Previous value
- `newValue` (json): New value
- `description` (varchar 500): Human-readable description
- `metadata` (json): Additional context

**Indexes**: bugId, userId

---

#### BugTimeTrackingEntity (`bug-time-tracking.entity.ts`)
**Table**: `bug_time_tracking`
**Purpose**: Time logging for bug work

**Key Fields**:
- `id` (uuid, PK): Time entry identifier
- `bugId` (varchar, FK): Parent bug
- `userId` (varchar, FK): Worker user
- `userName` (varchar 100): Worker display name
- `hours` (decimal 5,2): Hours worked
- `description` (varchar 500): Work description
- `date` (date): Work date

**Indexes**: bugId, userId, date

---

#### BugNotificationEntity (`bug-notification.entity.ts`)
**Table**: `bug_notifications`
**Purpose**: Notification queue for bug events

**Key Fields**:
- `id` (uuid, PK): Notification identifier
- `userId` (varchar, FK): Recipient user
- `bugId` (varchar, FK): Related bug
- `type` (enum): ASSIGNED / STATUS_CHANGED / COMMENT_ADDED / MENTION / DUE_DATE_REMINDER / BUG_RESOLVED / BUG_CLOSED / BUG_REOPENED
- `title` (varchar 200): Notification title
- `message` (varchar 500): Notification message
- `isRead` (boolean): Read flag
- `readAt` (timestamp): Read timestamp

**Indexes**: userId, bugId

---

### Miscellaneous Entities

#### ScreenPageEntity (`screen-page.entity.ts`)
**Table**: `screen_pages`
**Purpose**: Dashboard visualization configurations (GridSter2 layouts)

**Key Fields**:
- `id` (uuid, PK): Page identifier
- `name` (varchar 100): Page name
- `description` (text): Description
- `layout` (jsonb): Layout configuration (width, height, background, grid)
- `components` (jsonb): Component array (id, type, position, config, dataSource)
- `status` (varchar 20): draft / published
- `isDefault` (boolean): Default page flag
- `createdBy` (varchar, FK): Creator user

**TypeScript Interfaces**:
```typescript
interface LayoutConfig {
  width: number;
  height: number;
  background: string;
  grid?: { enabled: boolean; size: number; };
}

interface ComponentPosition {
  x: number; y: number;
  width: number; height: number;
  zIndex: number;
}

interface ComponentDataSource {
  type: 'api' | 'static';
  url?: string;
  data?: any;
  refreshInterval?: number;
}

interface ScreenComponent {
  id: string;
  type: string;
  position: ComponentPosition;
  config: any;
  dataSource?: ComponentDataSource;
}
```

**Indexes**: status, createdBy

---

#### MediaTypeEntity (`media-type.entity.ts`)
**Table**: `media_type`
**Purpose**: Media type classification

**Key Fields**:
- `id` (int, PK): Auto-increment ID
- `typeCode` (varchar 50, unique): Type code
- `typeName` (varchar 100): Type name
- `description` (varchar 500): Description
- `sort` (int): Display order
- `status` (enum): ACTIVE / INACTIVE

**Indexes**: typeCode, status

---

## Entity Relationship Map

```
UserEntity
├─── ApiKeyEntity (userId)
├─── WeiboAccountEntity (userId)
├─── JdAccountEntity (userId)
├─── WeiboSearchTaskEntity (userId)
├─── ScreenPageEntity (createdBy)
├─── BugEntity (reporterId, assigneeId, resolvedBy, closedBy)
├─── BugWatchEntity (userId)
├─── BugActivityEntity (userId)
├─── BugTimeTrackingEntity (userId)
└─── BugNotificationEntity (userId)

EventEntity
├─── EventTypeEntity (eventTypeId)
├─── IndustryTypeEntity (industryTypeId)
├─── EventAttachmentEntity[] (eventId)
└─── EventTagEntity[] (eventId)
     └─── TagEntity (tagId)

BugEntity
├─── BugAttachmentEntity[] (bugId)
├─── BugCommentEntity[] (bugId)
│    └─── BugAttachmentEntity[] (commentId)
├─── BugTagEntity[] (many-to-many via bug_tags_relation)
├─── BugWatchEntity[] (bugId)
├─── BugActivityEntity[] (bugId)
├─── BugTimeTrackingEntity[] (bugId)
└─── BugNotificationEntity[] (bugId)

WeiboSearchTaskEntity
├─── UserEntity (userId)
└─── WeiboAccountEntity (weiboAccountId)
```

## Database Configuration

The package exports a `createDatabaseConfig` function that generates TypeORM DataSourceOptions:

```typescript
import { createDatabaseConfig } from '@pro/entities';

const config = createDatabaseConfig({
  get: (key: string, defaultValue?: any) => process.env[key] ?? defaultValue
});
```

**Configuration Priority**:
1. If `DATABASE_URL` is set → Use connection string
2. Otherwise → Use individual parameters:
   - `POSTGRES_HOST` (default: localhost)
   - `POSTGRES_PORT` (default: 5432)
   - `POSTGRES_USER` (default: postgres)
   - `POSTGRES_PASSWORD` (default: postgres123)
   - `POSTGRES_DB` (default: pro)

**Auto-configuration**:
- `synchronize: true` (auto-creates tables)
- `logging: true` in development mode

## Usage Examples

### Import Entities

```typescript
import {
  UserEntity,
  ApiKeyEntity,
  WeiboAccountEntity,
  WeiboSearchTaskEntity,
  EventEntity,
  BugEntity,
  createDatabaseConfig
} from '@pro/entities';
```

### Find Active API Keys

```typescript
const apiKey = await apiKeyRepo.findOne({
  where: { key: 'ak_...', isActive: true },
  relations: ['user']
});

if (apiKey?.isValid) {
  apiKey.updateUsage();
  await apiKeyRepo.save(apiKey);
}
```

### Query Weibo Tasks Ready for Execution

```typescript
const tasks = await taskRepo.find({
  where: {
    enabled: true,
    status: WeiboSearchTaskStatus.PENDING,
    nextRunAt: LessThanOrEqual(new Date())
  },
  relations: ['weiboAccount']
});
```

### Create Event with Tags and Attachments

```typescript
const event = eventRepo.create({
  eventTypeId: '1',
  industryTypeId: '2',
  eventName: 'Product Launch',
  occurTime: new Date(),
  province: '广东省',
  city: '深圳市',
  status: EventStatus.PUBLISHED,
  eventTags: [
    { tagId: '1' },
    { tagId: '2' }
  ],
  attachments: [
    {
      fileName: 'photo.jpg',
      fileUrl: 'https://...',
      bucketName: 'events',
      objectName: 'path/to/photo.jpg',
      fileType: FileType.IMAGE
    }
  ]
});

await eventRepo.save(event);
```

### Create Bug with Full Tracking

```typescript
const bug = bugRepo.create({
  title: 'Login failure on mobile',
  description: 'Users cannot login via mobile app',
  status: BugStatus.OPEN,
  priority: BugPriority.HIGH,
  category: BugCategory.FUNCTIONAL,
  reporterId: userId,
  assigneeId: developerId,
  stepsToReproduce: '1. Open app\n2. Enter credentials\n3. Click login',
  expectedBehavior: 'User logs in successfully',
  actualBehavior: 'Error: Invalid credentials',
  reproductionRate: 'always',
  environment: {
    device: 'iPhone 12',
    os: 'iOS 15.3',
    appVersion: '2.1.0'
  },
  activities: [
    {
      action: BugActivityAction.CREATED,
      userId,
      userName: 'John Doe',
      description: 'Bug reported'
    }
  ]
});

await bugRepo.save(bug);
```

### Track Bug Work Time

```typescript
const timeEntry = timeTrackingRepo.create({
  bugId: bug.id,
  userId: developerId,
  userName: 'Jane Developer',
  hours: 2.5,
  description: 'Investigated root cause and implemented fix',
  date: new Date()
});

await timeTrackingRepo.save(timeEntry);
```

### Query Bugs with Complex Filters

```typescript
const bugs = await bugRepo.find({
  where: {
    status: In([BugStatus.OPEN, BugStatus.IN_PROGRESS]),
    priority: In([BugPriority.HIGH, BugPriority.CRITICAL]),
    assigneeId: userId
  },
  relations: ['reporter', 'assignee', 'tags', 'comments', 'timeTracking'],
  order: { priority: 'DESC', createdAt: 'ASC' }
});
```

## Quick Reference: Entity Lookup

**Need to find user data?** → `UserEntity` (users)

**Need API authentication?** → `ApiKeyEntity` (api_keys)

**Need platform credentials?** → `WeiboAccountEntity` (weibo_accounts), `JdAccountEntity` (jd_accounts)

**Need crawling tasks?** → `WeiboSearchTaskEntity` (weibo_search_tasks)

**Need event data?** → `EventEntity` (event) + `EventTypeEntity` + `IndustryTypeEntity`

**Need event files?** → `EventAttachmentEntity` (event_attachment)

**Need event categorization?** → `TagEntity` (tag) + `EventTagEntity` (event_tag)

**Need bug tracking?** → `BugEntity` (bugs)

**Need bug files?** → `BugAttachmentEntity` (bug_attachments)

**Need bug discussions?** → `BugCommentEntity` (bug_comments)

**Need bug audit trail?** → `BugActivityEntity` (bug_activities)

**Need bug time tracking?** → `BugTimeTrackingEntity` (bug_time_tracking)

**Need bug notifications?** → `BugNotificationEntity` (bug_notifications)

**Need dashboard configs?** → `ScreenPageEntity` (screen_pages)

**Need media types?** → `MediaTypeEntity` (media_type)

## Type Enums Reference

```typescript
// From @pro/types
enum UserStatus { ACTIVE, INACTIVE, SUSPENDED, DELETED }
enum BugStatus { OPEN, IN_PROGRESS, RESOLVED, CLOSED, REOPENED }
enum BugPriority { LOW, MEDIUM, HIGH, CRITICAL }
enum BugCategory { FUNCTIONAL, UI_UX, PERFORMANCE, SECURITY, DATA }

// From entities
enum ApiKeyType { READ_ONLY, READ_WRITE, ADMIN }
enum WeiboAccountStatus { ACTIVE, EXPIRED, BANNED, RESTRICTED }
enum JdAccountStatus { ACTIVE, EXPIRED, BANNED, RESTRICTED }
enum WeiboSearchTaskStatus { PENDING, RUNNING, PAUSED, FAILED, TIMEOUT }
enum EventStatus { DRAFT = 0, PUBLISHED = 1, ARCHIVED = 2 }
enum FileType { IMAGE, VIDEO, DOCUMENT }
enum MediaTypeStatus { ACTIVE, INACTIVE }
enum BugActivityAction {
  CREATED, UPDATED, ASSIGNED, STATUS_CHANGED, PRIORITY_CHANGED,
  COMMENT_ADDED, ATTACHMENT_ADDED, RESOLVED, CLOSED, REOPENED,
  WATCHER_ADDED, WATCHER_REMOVED, TAG_ADDED, TAG_REMOVED
}
enum BugNotificationType {
  ASSIGNED, STATUS_CHANGED, COMMENT_ADDED, MENTION,
  DUE_DATE_REMINDER, BUG_RESOLVED, BUG_CLOSED, BUG_REOPENED
}
```

## Common Patterns

### Soft Delete Pattern
None of the entities use soft delete. Use status fields instead:
- UserEntity.status (UserStatus enum)
- MediaTypeEntity.status (MediaTypeStatus enum)
- EventEntity.status (EventStatus enum)

### Audit Trail Pattern
Entities with audit fields:
- All entities have: `createdAt`, `updatedAt`
- EventEntity has: `createdBy`
- ScreenPageEntity has: `createdBy`
- BugEntity has: `resolvedBy`, `resolvedAt`, `closedBy`, `closedAt`

### Full Audit Trail
BugActivityEntity provides complete change history for bugs.

### Polymorphic Attachments
BugAttachmentEntity can attach to either:
- Bug (via bugId)
- Comment (via commentId)

### Many-to-Many Patterns
1. **Explicit Junction Entity**: EventTagEntity (event_tag)
2. **TypeORM @ManyToMany with @JoinTable**: BugEntity ↔ BugTagEntity (bug_tags_relation)

### Geolocation Pattern
Entities with location fields:
- EventEntity: province, city, district, street, locationText, longitude, latitude
- WeiboSearchTaskEntity: longitude, latitude, locationAddress, locationName

### Computed Properties Pattern
Entities with getter methods:
- ApiKeyEntity: `isExpired`, `isValid`
- WeiboSearchTaskEntity: `needsInitialCrawl`, `isHistoricalCrawlCompleted`, `canRetry`, `shouldPauseForNoData`, `progressPercentage`, `statusDescription`, `phaseDescription`

---

**Last Updated**: 2025-10-16
**Entity Count**: 23 entities
**Package Version**: 1.0.0
