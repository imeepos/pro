# 增强版 Raw Data GraphQL Schema 设计文档

## 概述

本文档详细描述了基于现有raw-data模块设计的增强版GraphQL Schema，专门为Admin后台提供完整的数据展示、分析、导出和监控功能。

## 设计哲学

### 存在即合理 (Existence Implies Necessity)
- 每个GraphQL字段都有明确的业务价值
- 每个输入类型都服务于特定的查询场景
- 每个枚举值都有对应的使用场景

### 优雅即简约 (Elegance is Simplicity)
- Schema设计直观易懂，字段名称自解释
- 复杂查询通过组合简单过滤器实现
- 避免过度嵌套，保持查询效率

### 性能即艺术 (Performance is Art)
- 合理的数据分页和限制
- 智能的查询优化和缓存策略
- 批量操作支持大数据量处理

## 核心功能模块

### 1. 增强数据查询模块

#### 核心查询接口

```graphql
query GetEnhancedRawDataList($filter: EnhancedRawDataFilterInput) {
  enhancedRawDataList(filter: $filter) {
    items {
      _id
      sourceType
      sourceUrl
      contentPreview
      status
      qualityMetrics {
        level
        overallScore
        completenessScore
        accuracyScore
        issues
        recommendations
      }
      sourceRiskLevel
      processingDuration
      createdAt
    }
    total
    page
    pageSize
    hasNext
    hasPrevious
    queryTime
    suggestions
  }
}
```

#### 高级过滤器示例

```json
{
  "filter": {
    "keyword": "技术趋势",
    "statuses": ["completed", "failed"],
    "timeRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "granularity": "day"
    },
    "sourceFilter": {
      "domains": ["weibo.com", "zhihu.com"],
      "riskLevel": "low"
    },
    "qualityLevels": ["excellent", "good"],
    "sortBy": [
      { "field": "createdAt", "direction": "desc" },
      { "field": "qualityMetrics.overallScore", "direction": "desc" }
    ],
    "page": 1,
    "pageSize": 50
  }
}
```

### 2. 统计分析模块

#### 增强统计信息查询

```graphql
query GetEnhancedStatistics($timeRange: AdvancedTimeRangeInput) {
  enhancedRawDataStatistics(timeRange: $timeRange) {
    pending
    processing
    completed
    failed
    retrying
    cancelled
    archived
    total
    successRate
    avgProcessingTime
    todayThroughput
    overallQuality {
      level
      overallScore
      issues
      recommendations
    }
    sourceStatistics {
      sourceId
      sourceName
      totalData
      successRate
      riskLevel
      qualityMetrics {
        level
        overallScore
      }
    }
  }
}
```

#### 趋势数据分析

```graphql
query GetEnhancedTrendData {
  enhancedRawDataTrend(
    granularity: DAY,
    timeRange: {
      startDate: "2024-01-01",
      endDate: "2024-01-31"
    },
    statuses: ["completed", "failed"]
  ) {
    timestamp
    count
    successful
    failed
    successRate
    avgQualityScore
    processingSpeed
  }
}
```

### 3. 实时监控模块

#### 系统健康状态

```graphql
query GetSystemHealth {
  systemHealth {
    status
    healthScore
    activeSources
    pendingData
    throughput
    avgResponseTime
    errorRate
    cpuUsage
    memoryUsage
    diskUsage
    activeAlerts
  }
}
```

#### 实时监控指标

```graphql
query GetRealtimeMetrics {
  realtimeMetrics(
    metricNames: ["throughput", "queue_length", "error_rate"],
    timeWindow: 24
  ) {
    name
    currentValue
    changeRate
    trend
    unit
    lastUpdated
    historicalData
    isAlerting
  }
}
```

### 4. 数据质量分析模块

#### 质量分析查询

```graphql
query AnalyzeDataQuality {
  dataQualityAnalysis(config: {
    filter: {
      statuses: ["completed"],
      timeRange: {
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      }
    },
    dimensions: ["completeness", "accuracy", "timeliness"],
    detailedReport: true,
    includeRecommendations: true,
    reportFormat: JSON
  }) {
    analysisId
    totalAnalyzed
    overallQuality {
      level
      overallScore
      issues
      recommendations
    }
    keyIssues
    recommendations
    qualityTrend
    detailedReportUrl
  }
}
```

#### 质量分布统计

```graphql
query GetDataQualityDistribution {
  dataQualityDistribution(
    timeRange: {
      startDate: "2024-01-01",
      endDate: "2024-01-31"
    },
    groupBy: "sourceType"
  ) {
    quality
    count
    percentage
  }
}
```

### 5. 数据导出模块

#### 数据导出操作

```graphql
mutation ExportRawData {
  exportRawData(config: {
    format: CSV,
    filename: "raw_data_export_2024.csv",
    fields: ["_id", "sourceType", "sourceUrl", "status", "createdAt"],
    filter: {
      statuses: ["completed"],
      timeRange: {
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      }
    },
    compress: true,
    chunked: true,
    chunkSize: 5000,
    notificationEmail: "admin@example.com"
  }) {
    operationType
    totalProcessed
    successful
    successRate
    exportFileUrl
    operationId
    duration
  }
}
```

### 6. 批量操作模块

#### 批量数据操作

```graphql
mutation ExecuteBatchOperation {
  batchDataOperation(input: {
    operationType: RETRY,
    dataIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
    reason: "修复临时网络错误",
    batchSize: 100
  }) {
    operationType
    totalProcessed
    successful
    failed
    successRate
    errors
    operationId
    duration
  }
}
```

#### 过期数据清理

```graphql
mutation CleanupExpiredData {
  cleanupExpiredData(
    days: 90,
    statuses: ["completed", "archived"]
  ) {
    operationType
    totalProcessed
    successful
    successRate
    duration
  }
}
```

### 7. 实时订阅模块

#### 实时数据更新订阅

```graphql
subscription SubscribeToRawDataUpdates {
  rawDataUpdates(filter: {
    statuses: ["processing", "failed"]
  }) {
    _id
    sourceType
    status
    qualityMetrics {
      level
      overallScore
    }
    updatedAt
  }
}
```

#### 系统状态订阅

```graphql
subscription SubscribeToSystemHealth {
  systemHealthUpdates {
    status
    healthScore
    activeAlerts
    lastCheckedAt
  }
}
```

## 类型系统详解

### 核心枚举类型

```typescript
// 增强的处理状态
enum EnhancedProcessingStatus {
  PENDING = 'pending',        // 待处理
  PROCESSING = 'processing',  // 处理中
  COMPLETED = 'completed',    // 已完成
  FAILED = 'failed',         // 失败
  RETRYING = 'retrying',     // 重试中
  CANCELLED = 'cancelled',   // 已取消
  ARCHIVED = 'archived'      // 已归档
}

// 数据质量等级
enum DataQualityLevel {
  EXCELLENT = 'excellent',   // 优秀 (90-100)
  GOOD = 'good',            // 良好 (75-89)
  FAIR = 'fair',            // 一般 (60-74)
  POOR = 'poor',            // 较差 (40-59)
  CRITICAL = 'critical'     // 严重 (0-39)
}

// 数据源风险等级
enum SourceRiskLevel {
  LOW = 'low',      // 低风险
  MEDIUM = 'medium', // 中等风险
  HIGH = 'high',    // 高风险
  CRITICAL = 'critical' // 严重风险
}
```

### 核心对象类型

#### 数据质量指标

```typescript
interface DataQualityMetrics {
  level: DataQualityLevel;      // 质量等级
  completenessScore: number;    // 完整性得分 (0-100)
  accuracyScore: number;        // 准确性得分 (0-100)
  consistencyScore: number;     // 一致性得分 (0-100)
  timelinessScore: number;      // 时效性得分 (0-100)
  validityScore: number;        // 有效性得分 (0-100)
  overallScore: number;         // 总体质量得分 (0-100)
  issues: string[];             // 发现的问题
  recommendations: string[];    // 改进建议
  lastAssessedAt: string;       // 上次评估时间
}
```

#### 系统健康状态

```typescript
interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';  // 整体状态
  healthScore: number;                           // 健康得分 (0-100)
  activeSources: number;                         // 活跃数据源数量
  pendingData: number;                          // 待处理数据量
  throughput: number;                           // 系统吞吐量
  avgResponseTime: number;                      // 平均响应时间
  errorRate: number;                            // 错误率
  cpuUsage: string;                             // CPU使用率
  memoryUsage: string;                          // 内存使用率
  diskUsage: string;                            // 磁盘使用率
  activeAlerts: string[];                       // 活跃告警
  lastCheckedAt: string;                        // 上次检查时间
}
```

## 性能优化策略

### 1. 查询优化

#### 分页策略
- 默认页大小限制为20条，最大200条
- 使用游标分页支持大数据集遍历
- 提供查询建议引导用户优化过滤条件

#### 索引优化
```javascript
// 推荐的MongoDB索引
db.raw_data.createIndex({ "sourceType": 1, "createdAt": -1 })
db.raw_data.createIndex({ "status": 1, "updatedAt": -1 })
db.raw_data.createIndex({ "qualityMetrics.overallScore": -1 })
db.raw_data.createIndex({ "sourceDomain": 1, "riskLevel": 1 })
```

#### 缓存策略
- 基于查询参数生成缓存键
- 统计数据缓存5分钟
- 趋势数据缓存1小时
- 提供缓存键用于失效操作

### 2. 批量操作优化

#### 操作分批
```typescript
// 自动分批处理大数据集
const batchSize = input.batchSize || 1000;
const totalDocuments = await this.rawDataModel.countDocuments(query);
const batches = Math.ceil(totalDocuments / batchSize);

for (let i = 0; i < batches; i++) {
  const batchQuery = { ...query, skip: i * batchSize, limit: batchSize };
  await this.processBatch(batchQuery, input.operationType);
}
```

#### 操作结果追踪
```typescript
interface BatchOperationResult {
  operationId: string;     // 操作唯一标识
  operationType: BatchOperationType;
  totalProcessed: number;  // 总处理数量
  successful: number;      // 成功数量
  failed: number;          // 失败数量
  successRate: number;     // 成功率
  errors?: string[];       // 错误详情
  duration: number;        // 耗时（秒）
  exportFileUrl?: string;  // 导出文件URL（导出操作）
}
```

### 3. 数据导出优化

#### 格式支持
- **JSON**: 结构化数据，支持嵌套字段
- **CSV**: 表格数据，Excel兼容
- **Excel**: .xlsx格式，支持多工作表
- **XML**: 结构化标记语言
- **Parquet**: 列式存储，适合大数据分析

#### 分片导出
```typescript
// 大数据量自动分片
if (totalData > 100000) {
  config.chunked = true;
  config.chunkSize = Math.min(config.chunkSize || 10000, 50000);
}
```

## 错误处理策略

### 1. 错误分类

#### 系统级错误
- 数据库连接失败
- 内存不足
- 磁盘空间不足

#### 业务级错误
- 无效的查询参数
- 权限不足
- 数据不存在

#### 操作级错误
- 批量操作部分失败
- 导出格式不支持
- 质量评估超时

### 2. 错误响应格式

```typescript
interface GraphQLError {
  message: string;           // 错误消息
  code: string;             // 错误代码
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;            // 错误详情
  suggestions?: string[];   // 解决建议
  timestamp: string;        // 错误时间
}
```

## 安全考虑

### 1. 权限控制

#### JWT认证
```typescript
@UseGuards(JwtAuthGuard)
@Resolver(() => EnhancedRawDataItem)
export class EnhancedRawDataResolver {
  // 所有查询都需要有效JWT令牌
}
```

#### 角色权限
- **Admin**: 完全访问权限
- **Analyst**: 只读权限，可导出数据
- **Operator**: 批量操作权限，无删除权限

### 2. 数据保护

#### 敏感数据过滤
```typescript
// 自动过滤敏感字段
private sanitizeData(data: any): any {
  const { rawContent, ...sanitized } = data;
  return sanitized;
}
```

#### 导出限制
- 单次导出最大10万条记录
- 导出文件自动过期（7天）
- 导出操作审计日志

## 监控和告警

### 1. 性能监控

#### 关键指标
- 查询响应时间
- 数据库连接池状态
- 内存使用情况
- 错误率统计

#### 告警规则
```typescript
const alertRules = {
  responseTime: { threshold: 5000, unit: 'ms' },
  errorRate: { threshold: 5, unit: '%' },
  queueLength: { threshold: 1000, unit: 'items' },
  memoryUsage: { threshold: 80, unit: '%' }
};
```

### 2. 业务监控

#### 数据质量告警
- 整体质量得分低于60%
- 某个数据源失败率超过10%
- 数据积压超过1000条

#### 系统健康告警
- 活跃数据源数量减少50%
- 数据处理吞吐量下降30%
- 磁盘使用率超过80%

## 使用示例

### 1. Admin仪表板数据获取

```graphql
query GetDashboardData {
  enhancedRawDataStatistics {
    total
    successRate
    todayThroughput
    overallQuality {
      level
      overallScore
    }
  }

  systemHealth {
    status
    healthScore
    activeAlerts
  }

  realtimeMetrics(metricNames: ["throughput", "error_rate"]) {
    name
    currentValue
    trend
    isAlerting
  }
}
```

### 2. 数据质量分析报告

```graphql
query GetQualityReport {
  dataQualityAnalysis(config: {
    filter: {
      timeRange: {
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      }
    },
    detailedReport: true,
    includeRecommendations: true,
    reportFormat: JSON
  }) {
    analysisId
    totalAnalyzed
    overallQuality {
      level
      overallScore
      issues
      recommendations
    }
    keyIssues
    qualityTrend
    detailedReportUrl
  }
}
```

### 3. 大规模数据导出

```graphql
mutation ExportLargeDataset {
  exportRawData(config: {
    format: JSON,
    filter: {
      statuses: ["completed"],
      timeRange: {
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      }
    },
    chunked: true,
    chunkSize: 10000,
    compress: true,
    notificationEmail: "admin@example.com"
  }) {
    operationId
    totalProcessed
    exportFileUrl
    duration
  }
}
```

### 4. 批量失败数据重试

```graphql
mutation RetryFailedData {
  batchDataOperation(input: {
    operationType: RETRY,
    filter: {
      statuses: ["failed"],
      timeRange: {
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      }
    },
    batchSize: 500,
    reason: "修复临时网络错误"
  }) {
    operationType
    totalProcessed
    successful
    failed
    successRate
    operationId
  }
}
```

## 部署配置

### 1. 环境变量

```bash
# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/raw_data
MONGODB_MAX_POOL_SIZE=10

# 导出配置
EXPORT_DIR=/var/exports
MAX_EXPORT_SIZE=100000
EXPORT_EXPIRY_DAYS=7

# 缓存配置
REDIS_URL=redis://localhost:6379
CACHE_TTL=300

# 监控配置
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 2. Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 3. Kubernetes部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enhanced-raw-data-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enhanced-raw-data-api
  template:
    metadata:
      labels:
        app: enhanced-raw-data-api
    spec:
      containers:
      - name: api
        image: enhanced-raw-data-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: mongodb-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 总结

本增强版GraphQL Schema设计提供了：

1. **完整的数据查询能力**：支持复杂的过滤、排序和分页
2. **深入的数据分析**：质量评估、趋势分析、性能监控
3. **灵活的数据导出**：多种格式、分片处理、异步通知
4. **强大的批量操作**：支持各种数据管理场景
5. **实时监控能力**：系统健康、性能指标、告警通知
6. **优秀的性能表现**：查询优化、缓存策略、索引设计

该设计遵循了存在即合理、优雅即简约、性能即艺术的设计哲学，为Admin后台提供了完整、高效、易用的数据管理解决方案。