# @pro/types - Type Definitions Package

## Overview

Foundation package providing shared TypeScript type definitions across the entire monorepo. Exports interfaces, enums, DTOs, and domain models for authentication, events, bugs, Weibo tasks, screens, and API keys.

**Package Name**: `@pro/types`
**Location**: `/home/ubuntu/worktrees/pro/packages/types`
**Purpose**: Single source of truth for type definitions preventing duplication

## File Structure

```
src/
├── index.ts                    # Main export file aggregating all types
├── auth.ts                     # Authentication and user types
├── event.ts                    # Event management types
├── bug.ts                      # Bug tracking system (comprehensive)
├── weibo-search-task.ts        # Weibo search task management
├── weibo-account.ts            # Weibo account management
├── screen.ts                   # Screen layout and component types
└── api-key.ts                  # API key management types
```

## Core Domains

### 1. Authentication & Users (`auth.ts`, `index.ts`)

**Enums**:
- `UserStatus`: `ACTIVE` | `INACTIVE` | `SUSPENDED`

**Core Interfaces**:
- `User` - User entity with id, username, email, status, timestamps
- `UserProfile` - Extended profile with avatar, bio, phone, location, website
- `JwtPayload` - JWT token payload structure

**DTOs**:
- `RegisterDto` - Registration request (username, email, password)
- `LoginDto` - Login request (usernameOrEmail, password)
- `AuthResponse` - Auth response with tokens and user

**Utilities**:
- `TokenStorage` - Interface for token management operations
- `ApiResponse<T>` - Generic API response wrapper
- `ErrorResponse` - Standard error response format
- `ValidationResult` - Validation result with errors array

### 2. Events (`event.ts`)

**Enums**:
- `EventStatus`: `DRAFT` | `PUBLISHED` | `ARCHIVED`

**Core Interfaces**:
- `EventSummary` - Event overview with location and metadata
- `EventMapPoint` - Event with geographical coordinates
- `PaginationInput` - Generic pagination (page, pageSize)
- `EventQueryParams` - Query filters extending pagination
- `EventMapQueryParams` - Map-specific query parameters
- `EventListResponse` - Paginated event list response

**Key Fields**:
- Location hierarchy: province, city, district, street
- Time fields: occurTime, with optional range filtering
- Associations: eventTypeId, industryTypeId, tagIds

### 3. Bug Tracking (`bug.ts`)

**Comprehensive bug management system with full CRUD, tracking, and analytics.**

**Enums**:
- `BugStatus`: `OPEN` | `IN_PROGRESS` | `RESOLVED` | `CLOSED` | `REJECTED` | `REOPENED`
- `BugPriority`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
- `BugCategory`: `FUNCTIONAL` | `PERFORMANCE` | `SECURITY` | `UI_UX` | `INTEGRATION` | `DATA` | `CONFIGURATION` | `DOCUMENTATION`
- `BugErrorType`: Network, validation, auth, not found, conflict, server, timeout, unknown

**Core Entities**:
- `Bug` - Main bug entity with status, priority, assignments, attachments, comments, tags
- `BugAttachment` - File attachments with metadata
- `BugComment` - Comments with author info and timestamps
- `BugTag` - Categorization tags
- `BugEnvironment` - Reproduction environment details
- `BugActivity` - Audit trail for bug changes
- `BugNotification` - User notifications for bug events
- `BugTimeTracking` - Time logging for bug work

**DTOs**:
- `CreateBugDto` / `UpdateBugDto` - CRUD operations
- `CreateBugCommentDto` / `UpdateBugCommentDto` - Comment management
- `CreateBugTimeTrackingDto` - Time entry creation

**Query & Response Types**:
- `BugFilters` - Comprehensive filtering with 15+ filter options
- `BugListResponse` - Paginated bug list
- `BugStats` - Analytics and statistics
- `BugActivityFilters` / `BugActivityListResponse` - Activity log queries
- `BugNotificationFilters` / `BugNotificationListResponse` - Notification queries
- `BugTimeTrackingFilters` / `BugTimeTrackingListResponse` - Time tracking queries

**Operations**:
- `BugExportOptions` - Export configuration (CSV, Excel, PDF)
- `BugBulkAction` - Bulk operations on multiple bugs
- `BugError` - Custom error class with GraphQL/HTTP error parsing
- `BugOperationResult<T>` - Operation result wrapper

**Key Features**:
- Full error handling with user-friendly messages
- Comprehensive activity logging
- Time tracking system
- Notification system
- Bulk operations support
- Export capabilities

### 4. Weibo Search Tasks (`weibo-search-task.ts`)

**Enums**:
- `WeiboSearchTaskStatus`: `PENDING` | `RUNNING` | `PAUSED` | `FAILED` | `TIMEOUT`

**Core Interfaces**:
- `WeiboSearchTask` - Task definition with scheduling and progress tracking
- `CreateWeiboSearchTaskDto` - Task creation
- `UpdateWeiboSearchTaskDto` - Task updates

**Key Fields**:
- Scheduling: startDate, crawlInterval, nextRunAt
- Progress: progress (%), totalSegments, noDataCount
- Location: longitude, latitude, locationAddress, locationName
- Account: weiboAccountId, enableAccountRotation
- Retry logic: retryCount, maxRetries, errorMessage

**Query Types**:
- `WeiboSearchTaskFilters` - Search and filter tasks
- `WeiboSearchTaskListResponse` - Paginated task list

### 5. Weibo Accounts (`weibo-account.ts`)

**Enums**:
- `WeiboAccountStatus`: `ACTIVE` | `INACTIVE` | `SUSPENDED` | `EXPIRED`

**Core Interfaces**:
- `WeiboAccount` - Account entity with health tracking
- `WeiboLoginSession` - Login session management
- `WeiboAccountStats` - Account statistics
- `LoggedInUsersStats` - User login statistics

**Key Fields**:
- Account: username, nickname, uid, cookies
- Health: isHealthy, errorCount, lastError
- Timestamps: lastLoginAt, lastCheckAt, expiresAt

**Query Types**:
- `WeiboAccountFilters` - Account filtering
- `WeiboAccountListResponse` - Paginated account list

### 6. Screen Management (`screen.ts`)

**Type Aliases**:
- `ScreenStatus`: `'draft'` | `'published'`

**Core Interfaces**:
- `ScreenPage` - Complete screen definition
- `ScreenLayout` - Layout configuration (width, height, grid, cols, rows)
- `ScreenComponentDefinition` - Component with type, position, config, dataSource
- `ScreenComponentPosition` - Position and size (x, y, width, height, zIndex)
- `ScreenComponentDataSource` - Data source configuration (api/static)

**Connection Types**:
- `ScreenConnection` - GraphQL connection pattern
- `ScreenConnectionEdge<T>` - Edge with cursor and node
- `PageInfo` - Pagination metadata for connections

### 7. API Key Management (`api-key.ts`)

**Enums**:
- `ApiKeyStatus`: `ACTIVE` | `INACTIVE` | `EXPIRED` | `REVOKED`
- `ApiKeyType`: `READ_ONLY` | `READ_WRITE` | `ADMIN`

**Core Entities**:
- `ApiKey` - Main API key entity with usage tracking
- `ApiKeyActivityLog` - Activity logging for API key usage
- `ApiKeyStats` - Comprehensive statistics

**DTOs**:
- `CreateApiKeyDto` / `UpdateApiKeyDto` - Key management
- `ApiKeyValidationRequest` / `ApiKeyValidationResponse` - Key validation

**Query & Response Types**:
- `ApiKeyFilters` - Filtering and searching
- `ApiKeyListResponse` - Paginated key list
- `ApiKeyUsageStats` - Usage analytics for specific key
- `ApiKeyActivityFilters` / `ApiKeyActivityListResponse` - Activity log queries

**Operations**:
- `ApiKeyBulkAction` - Bulk operations (activate, deactivate, revoke, extend)
- `ApiKeyRegenerationResponse` - Key regeneration result

## Quick Reference Guide

### Authentication Flow
```typescript
import { LoginDto, AuthResponse, User, UserStatus } from '@pro/types';

// Login
const loginData: LoginDto = { usernameOrEmail, password };
const response: AuthResponse = await login(loginData);

// User status check
if (response.user.status === UserStatus.ACTIVE) {
  // Proceed
}
```

### API Response Handling
```typescript
import { ApiResponse, ErrorResponse } from '@pro/types';

const response: ApiResponse<User> = await fetchUser();
if (!response.success) {
  const error: ErrorResponse = response.error;
  console.error(error.message);
}
```

### Event Querying
```typescript
import { EventQueryParams, EventListResponse, EventStatus } from '@pro/types';

const params: EventQueryParams = {
  status: EventStatus.PUBLISHED,
  province: '北京市',
  startTime: '2025-01-01',
  endTime: '2025-12-31',
  page: 1,
  pageSize: 20
};

const result: EventListResponse = await queryEvents(params);
```

### Bug Management
```typescript
import {
  Bug,
  BugStatus,
  BugPriority,
  CreateBugDto,
  BugFilters,
  BugError
} from '@pro/types';

// Create bug
const newBug: CreateBugDto = {
  title: 'Login failure',
  description: 'Users cannot log in',
  priority: BugPriority.HIGH,
  category: BugCategory.FUNCTIONAL
};

// Query bugs
const filters: BugFilters = {
  status: [BugStatus.OPEN, BugStatus.IN_PROGRESS],
  priority: [BugPriority.HIGH, BugPriority.CRITICAL],
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

// Error handling
try {
  await bugOperation();
} catch (error) {
  const bugError = BugError.fromGraphQLError(error);
  console.error(bugError.getUserFriendlyMessage());
}
```

### Weibo Task Management
```typescript
import {
  WeiboSearchTask,
  WeiboSearchTaskStatus,
  CreateWeiboSearchTaskDto
} from '@pro/types';

const task: CreateWeiboSearchTaskDto = {
  keyword: '突发事件',
  startDate: '2025-01-01',
  crawlInterval: '1h',
  enableAccountRotation: true,
  longitude: 116.4074,
  latitude: 39.9042
};
```

### Screen Configuration
```typescript
import {
  ScreenPage,
  ScreenComponentDefinition,
  ScreenStatus
} from '@pro/types';

const screen: ScreenPage = {
  id: 'screen-1',
  name: 'Dashboard',
  layout: { width: 1920, height: 1080, grid: { enabled: true, size: 10 } },
  components: [
    {
      id: 'comp-1',
      type: 'chart',
      position: { x: 0, y: 0, width: 600, height: 400, zIndex: 1 },
      config: { chartType: 'line' },
      dataSource: { type: 'api', url: '/api/data', refreshInterval: 5000 }
    }
  ],
  status: 'published' as ScreenStatus
};
```

### API Key Management
```typescript
import {
  ApiKey,
  ApiKeyType,
  CreateApiKeyDto,
  ApiKeyFilters
} from '@pro/types';

// Create API key
const newKey: CreateApiKeyDto = {
  name: 'Production API',
  type: ApiKeyType.READ_WRITE,
  expiresAt: '2026-12-31',
  permissions: ['read:events', 'write:events']
};

// Query API keys
const filters: ApiKeyFilters = {
  type: ApiKeyType.ADMIN,
  isActive: true,
  sortBy: 'usageCount',
  sortOrder: 'desc'
};
```

## Common Patterns

### Pagination
All list responses follow consistent pagination:
```typescript
interface ListResponse {
  data: T[];
  total: number;
  page: number;
  limit: number; // or pageSize
  totalPages: number;
}
```

### Filtering
Query parameter interfaces extend base filters:
```typescript
interface BaseFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### Status Enums
Most entities have status enums for state management:
- `UserStatus`, `EventStatus`, `BugStatus`, `WeiboSearchTaskStatus`, `WeiboAccountStatus`, `ApiKeyStatus`

### DTOs
Create and Update DTOs follow naming convention:
- `Create{Entity}Dto` - Required fields for creation
- `Update{Entity}Dto` - Optional fields for updates

## Import Strategy

Import from package root for all types:
```typescript
import {
  User,
  Event,
  Bug,
  WeiboSearchTask,
  ApiKey
} from '@pro/types';
```

All exports are re-exported through `index.ts` - never import directly from sub-modules.

## Type Safety Tips

1. **Enums over strings**: Use enum values for type safety
   ```typescript
   status: BugStatus.OPEN  // Good
   status: 'open'          // Avoid
   ```

2. **Discriminated unions**: Use status fields for type narrowing
   ```typescript
   if (bug.status === BugStatus.RESOLVED && bug.resolvedAt) {
     // resolvedAt is guaranteed to exist
   }
   ```

3. **Generic responses**: Use `ApiResponse<T>` for consistent API returns
   ```typescript
   ApiResponse<User>
   ApiResponse<EventListResponse>
   ```

4. **Error handling**: Use `BugError` class for structured error handling
   ```typescript
   const error = BugError.fromGraphQLError(gqlError);
   console.log(error.getUserFriendlyMessage());
   ```

## AI Assistant Notes

When working with this package:

1. **Type Location**: All types are in `src/{domain}.ts` files
2. **Import Path**: Always use `@pro/types` package import
3. **Enums**: Check enum definitions for valid values
4. **DTOs**: Create/Update DTOs typically have optional fields in Update variant
5. **Responses**: Look for `{Entity}ListResponse` for paginated data
6. **Filters**: Look for `{Entity}Filters` for query parameters
7. **Stats**: Look for `{Entity}Stats` for analytics data
8. **Error Handling**: Use `BugError` class for comprehensive error management
9. **Bulk Operations**: Check for `{Entity}BulkAction` interfaces for batch operations
10. **Activity Logs**: Many entities have `{Entity}Activity` and related filter types

## Dependencies

None. This is a foundation package with no external dependencies beyond TypeScript itself.
