# MongoDB 表结构设计 - 微博爬虫原始数据存储

## 概述
设计用于存储微博爬虫采集的原始 HTML 页面和 API 接口返回的 JSON 数据的 MongoDB 集合结构。

## 设计目标
- 存储微博网页的原始 HTML 内容
- 存储微博 API 接口返回的 JSON 数据
- 支持数据溯源和版本管理
- 便于数据清洗和后续处理
- 支持反爬应对和数据恢复

## 集合设计

### 1. raw_data_sources (原始数据源)

```javascript
{
  _id: ObjectId,

  // 数据源基本信息
  sourceType: String,        // 数据类型: 'weibo_html' | 'weibo_api_json' | 'weibo_user' | 'weibo_comment' | 'weibo_image'
  sourceUrl: String,         // 数据来源URL
  sourceName: String,        // 数据源名称

  // 微博特定字段
  weiboInfo: {
    weiboId: String,         // 微博ID (如果是微博内容)
    userId: String,          // 用户ID
    userName: String,        // 用户名
    dataType: String,        // 数据类型: 'feed' | 'profile' | 'comment' | 'search' | 'hot_topic'
    crawlType: String,       // 爬取方式: 'web' | 'mobile' | 'api'
  },

  // 原始内容
  rawContent: String,        // HTML内容 或 JSON字符串
  contentHash: String,       // 内容哈希值，用于去重
  contentSize: Number,       // 内容大小(字节)
  isCompressed: Boolean,     // 是否压缩存储

  // 元数据
  metadata: {
    httpStatus: Number,      // HTTP状态码
    headers: Object,         // 响应头信息
    encoding: String,        // 字符编码
    mimeType: String,        // MIME类型
    cookies: String,         // Cookie信息(加密存储)
    userAgent: String,       // User-Agent
    proxyIp: String,         // 代理IP
  },

  // 采集信息
  collectionInfo: {
    collectedAt: Date,       // 采集时间
    collectorId: String,     // 采集器ID
    collectorVersion: String, // 采集器版本
    retryCount: Number,      // 重试次数
    crawlDelay: Number,      // 爬取延迟(ms)
    batchId: String,         // 批次ID
  },

  // 处理状态
  processingStatus: {
    status: String,          // 'pending' | 'processing' | 'completed' | 'failed' | 'blocked' | 'invalid'
    processedAt: Date,       // 处理时间
    errorMessage: String,    // 错误信息
    errorCode: String,       // 错误代码 (如: 'RATE_LIMIT', 'ACCOUNT_BLOCKED', 'CONTENT_DELETED')
    processedRecordId: ObjectId, // 处理后的记录ID
  },

  // 版本控制
  version: Number,           // 版本号
  previousVersionId: ObjectId, // 上一版本ID
  changeLog: String,         // 变更日志

  // 标签和分类
  tags: [String],            // 标签
  category: String,          // 分类
  priority: Number,          // 优先级 1-10

  // 反爬相关
  antiCrawl: {
    isBlocked: Boolean,      // 是否被反爬
    blockType: String,       // 拦截类型: 'captcha' | 'login_required' | 'ip_banned' | 'rate_limit'
    captchaImage: String,    // 验证码图片(Base64)
    recoveryAction: String,  // 恢复操作
  },

  // 时间戳
  createdAt: Date,
  updatedAt: Date,

  // 索引字段
  isActive: Boolean,         // 是否有效
  isDeleted: Boolean,        // 软删除标记

  // 备注
  note: String,              // 备注信息
}
```

### 2. 索引设计

```javascript
// 复合索引 - 查询优化
db.raw_data_sources.createIndex({ sourceUrl: 1, 'collectionInfo.collectedAt': -1 })
db.raw_data_sources.createIndex({ contentHash: 1 }, { unique: true, sparse: true })
db.raw_data_sources.createIndex({ 'processingStatus.status': 1, createdAt: -1 })
db.raw_data_sources.createIndex({ sourceType: 1, 'weiboInfo.dataType': 1 })
db.raw_data_sources.createIndex({ isActive: 1, isDeleted: 1 })

// 微博特定索引
db.raw_data_sources.createIndex({ 'weiboInfo.weiboId': 1, 'collectionInfo.collectedAt': -1 })
db.raw_data_sources.createIndex({ 'weiboInfo.userId': 1, sourceType: 1 })
db.raw_data_sources.createIndex({ 'weiboInfo.dataType': 1, 'processingStatus.status': 1 })
db.raw_data_sources.createIndex({ 'collectionInfo.batchId': 1 })

// 反爬监控索引
db.raw_data_sources.createIndex({ 'antiCrawl.isBlocked': 1, 'antiCrawl.blockType': 1 })
db.raw_data_sources.createIndex({ 'metadata.proxyIp': 1, 'collectionInfo.collectedAt': -1 })

// 文本索引 - 全文搜索（可选，慎用，影响性能）
// db.raw_data_sources.createIndex({ rawContent: "text", sourceName: "text" })

// TTL索引 - 自动清理(90天后自动删除)
db.raw_data_sources.createIndex(
  { createdAt: 1 },
  {
    expireAfterSeconds: 7776000,
    partialFilterExpression: { isActive: false, 'processingStatus.status': 'completed' }
  }
)
```

## 使用场景

### 场景1: 存储微博网页HTML
```javascript
{
  sourceType: 'weibo_html',
  sourceUrl: 'https://weibo.com/1234567890/JxAbCdEfG',
  sourceName: '微博详情页',

  weiboInfo: {
    weiboId: 'JxAbCdEfG',
    userId: '1234567890',
    userName: '用户昵称',
    dataType: 'feed',
    crawlType: 'web'
  },

  rawContent: '<html>...</html>',
  contentHash: 'sha256:abc123...',
  contentSize: 102400,
  isCompressed: false,

  metadata: {
    httpStatus: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    encoding: 'utf-8',
    mimeType: 'text/html',
    userAgent: 'Mozilla/5.0...',
    proxyIp: '192.168.1.100'
  },

  collectionInfo: {
    collectedAt: new Date('2025-10-09T10:30:00Z'),
    collectorId: 'crawler-001',
    collectorVersion: '1.0.0',
    retryCount: 0,
    crawlDelay: 3000,
    batchId: 'batch-20251009-001'
  },

  processingStatus: {
    status: 'pending',
    processedAt: null,
    errorMessage: null,
    errorCode: null,
    processedRecordId: null
  },

  priority: 5,
  isActive: true,
  isDeleted: false
}
```

### 场景2: 存储微博API JSON响应
```javascript
{
  sourceType: 'weibo_api_json',
  sourceUrl: 'https://m.weibo.cn/api/container/getIndex?type=uid&value=1234567890',
  sourceName: '微博用户时间线API',

  weiboInfo: {
    weiboId: null,
    userId: '1234567890',
    userName: '用户昵称',
    dataType: 'profile',
    crawlType: 'api'
  },

  rawContent: '{"ok":1,"data":{"cards":[...],"cardlistInfo":{...}}}',
  contentHash: 'sha256:def456...',
  contentSize: 51200,
  isCompressed: false,

  metadata: {
    httpStatus: 200,
    headers: { 'content-type': 'application/json' },
    mimeType: 'application/json',
    cookies: 'encrypted_cookie_string',
    userAgent: 'Mozilla/5.0...',
    proxyIp: '192.168.1.101'
  },

  collectionInfo: {
    collectedAt: new Date('2025-10-09T10:35:00Z'),
    collectorId: 'crawler-002',
    collectorVersion: '1.0.0',
    retryCount: 0,
    crawlDelay: 5000,
    batchId: 'batch-20251009-001'
  },

  processingStatus: {
    status: 'pending'
  },

  priority: 8,
  isActive: true,
  isDeleted: false
}
```

### 场景3: 遇到反爬拦截
```javascript
{
  sourceType: 'weibo_html',
  sourceUrl: 'https://weibo.com/hot/search',
  sourceName: '微博热搜页',

  weiboInfo: {
    dataType: 'hot_topic',
    crawlType: 'web'
  },

  rawContent: '<html><body>请输入验证码...</body></html>',
  contentHash: 'sha256:ghi789...',
  contentSize: 2048,

  metadata: {
    httpStatus: 403,
    proxyIp: '192.168.1.102'
  },

  collectionInfo: {
    collectedAt: new Date('2025-10-09T10:40:00Z'),
    collectorId: 'crawler-001',
    retryCount: 2
  },

  processingStatus: {
    status: 'blocked',
    errorCode: 'CAPTCHA_REQUIRED',
    errorMessage: '需要验证码验证'
  },

  antiCrawl: {
    isBlocked: true,
    blockType: 'captcha',
    captchaImage: 'data:image/png;base64,iVBORw0KGg...',
    recoveryAction: 'manual_solve'
  },

  priority: 10,
  isActive: true
}
```

### 场景4: 存储微博评论数据
```javascript
{
  sourceType: 'weibo_comment',
  sourceUrl: 'https://m.weibo.cn/comments/hotflow?id=4567890123456789',
  sourceName: '微博评论API',

  weiboInfo: {
    weiboId: '4567890123456789',
    userId: '1234567890',
    dataType: 'comment',
    crawlType: 'api'
  },

  rawContent: '{"ok":1,"data":{"data":[{"id":"123","text":"评论内容",...}]}}',
  contentHash: 'sha256:jkl012...',
  contentSize: 30720,
  isCompressed: false,

  collectionInfo: {
    collectedAt: new Date('2025-10-09T10:45:00Z'),
    batchId: 'batch-20251009-002'
  },

  processingStatus: {
    status: 'completed',
    processedAt: new Date('2025-10-09T10:46:00Z'),
    processedRecordId: ObjectId('...')
  },

  tags: ['热门', '科技'],
  priority: 7,
  isActive: true
}
```

## 数据处理流程

```
┌─────────────┐
│  微博爬虫    │
└──────┬──────┘
       │
       │ 1. 采集原始数据
       ↓
┌─────────────────────────┐
│  raw_data_sources       │
│  (原始数据存储)          │
│  - HTML/JSON原始内容     │
│  - 反爬检测信息          │
│  - 采集元数据            │
└──────┬──────────────────┘
       │
       │ 2. 数据解析清洗
       ↓
┌─────────────────────────┐
│  业务数据库(PostgreSQL)  │
│  - weibo (微博表)        │
│  - user (用户表)         │
│  - comment (评论表)      │
│  - topic (话题表)        │
└─────────────────────────┘
```

## 微博爬虫特定考虑

### 1. 存储策略
- **压缩存储**: 大于 50KB 的内容使用 gzip 压缩，设置 `isCompressed: true`
- **GridFS**: 图片、视频等媒体文件使用 GridFS 存储
- **数据保留**:
  - 已处理完成的数据保留 90 天（TTL 索引自动清理）
  - 未处理或失败的数据永久保留
  - 反爬拦截的数据保留 30 天用于分析

### 2. 反爬应对
- **IP 轮换监控**: 通过 `metadata.proxyIp` 追踪代理使用情况
- **验证码记录**: 保存验证码图片用于训练识别模型
- **账号状态**: 记录 Cookie 和账号被封禁情况
- **限流检测**: 记录 `errorCode: 'RATE_LIMIT'` 用于调整爬取频率

### 3. 数据去重
- **内容哈希**: 使用 `contentHash` (SHA-256) 避免重复存储相同内容
- **唯一索引**: `contentHash` 字段设置唯一稀疏索引
- **版本管理**: 同一 URL 内容变化时创建新版本，`previousVersionId` 指向旧版本

### 4. 批量处理
- **批次管理**: 使用 `collectionInfo.batchId` 组织批量任务
- **优先级队列**: `priority` 字段控制处理顺序（热搜、大V 优先）
- **并发控制**: 通过 `processingStatus.status` 避免重复处理

### 5. 监控指标
```javascript
// 实时监控查询示例

// 1. 反爬拦截统计
db.raw_data_sources.aggregate([
  { $match: { 'antiCrawl.isBlocked': true } },
  { $group: {
      _id: '$antiCrawl.blockType',
      count: { $sum: 1 }
  }}
])

// 2. 爬取成功率
db.raw_data_sources.aggregate([
  { $match: { 'collectionInfo.collectedAt': { $gte: new Date(Date.now() - 3600000) } } },
  { $group: {
      _id: '$processingStatus.status',
      count: { $sum: 1 }
  }}
])

// 3. 代理IP性能
db.raw_data_sources.aggregate([
  { $match: { 'collectionInfo.collectedAt': { $gte: new Date(Date.now() - 3600000) } } },
  { $group: {
      _id: '$metadata.proxyIp',
      success: { $sum: { $cond: [{ $eq: ['$metadata.httpStatus', 200] }, 1, 0] } },
      blocked: { $sum: { $cond: ['$antiCrawl.isBlocked', 1, 0] } },
      total: { $sum: 1 }
  }}
])

// 4. 待处理数据量
db.raw_data_sources.countDocuments({
  'processingStatus.status': 'pending',
  isDeleted: false
})
```

## 性能优化建议

### 1. 分片策略 (数据量 > 100GB)
```javascript
// 按采集时间分片
sh.shardCollection("crawler_db.raw_data_sources", {
  "collectionInfo.collectedAt": 1,
  "_id": 1
})
```

### 2. 读写分离
- **写入**: Primary 节点
- **数据处理**: Secondary 节点读取
- **分析查询**: Secondary 节点或独立分析库

### 3. 数据归档
```javascript
// 定期将已处理数据归档到历史库
// 使用 MongoDB 的 $out 或 $merge 操作
db.raw_data_sources.aggregate([
  { $match: {
      'processingStatus.status': 'completed',
      'collectionInfo.collectedAt': { $lt: new Date(Date.now() - 2592000000) } // 30天前
  }},
  { $out: 'raw_data_archives' }
])
```

## 项目需求确认

✅ **已确认需求**
- 每日爬取量: 3000 条（小规模）
- 媒体文件: 不存储图片/视频
- 处理方式: 实时处理
- 反爬策略: 无
- 监控告警: 无

## 针对小规模爬虫的简化方案

基于每日 3K 条的小规模需求，可以做以下简化：

### 1. 简化的表结构（可选字段标注）

```javascript
{
  _id: ObjectId,

  // 必需字段
  sourceType: String,        // 'weibo_html' | 'weibo_api_json' | 'weibo_comment'
  sourceUrl: String,
  rawContent: String,
  contentHash: String,

  // 微博信息
  weiboInfo: {
    weiboId: String,
    userId: String,
    dataType: String,        // 'feed' | 'profile' | 'comment'
  },

  // 处理状态
  processingStatus: {
    status: String,          // 'pending' | 'processing' | 'completed' | 'failed'
    processedAt: Date,
    errorMessage: String,
  },

  // 时间戳
  createdAt: Date,
  updatedAt: Date,

  // 以下字段可选，根据实际需求添加
  // contentSize: Number,
  // isCompressed: Boolean,
  // metadata: {...},
  // collectionInfo: {...},
  // antiCrawl: {...},
  // tags: [...],
  // priority: Number,
}
```

### 2. 简化的索引（必需）

```javascript
// 基础索引
db.raw_data_sources.createIndex({ contentHash: 1 }, { unique: true, sparse: true })
db.raw_data_sources.createIndex({ 'processingStatus.status': 1, createdAt: -1 })
db.raw_data_sources.createIndex({ 'weiboInfo.weiboId': 1 })

// 小规模数据不需要：
// - 分片
// - TTL 自动清理（手动定期清理即可）
// - 复杂的复合索引
```

### 3. 实时处理流程

```
爬虫采集 → MongoDB 插入
               ↓
          实时监听 (Change Stream)
               ↓
          数据解析清洗
               ↓
          存入 PostgreSQL
               ↓
      更新 processingStatus: 'completed'
```

### 4. 数据清理策略

```javascript
// 每周定时任务，清理 30 天前已处理的数据
db.raw_data_sources.deleteMany({
  'processingStatus.status': 'completed',
  createdAt: { $lt: new Date(Date.now() - 2592000000) }
})
```

### 5. 存储容量估算

- 单条数据: ~50KB (HTML/JSON)
- 每日: 3000 条 × 50KB = 150MB
- 每月: 150MB × 30 = 4.5GB
- 保留 30 天: ~4.5GB

**结论**: 单台 MongoDB 实例完全够用，无需分片和集群。

## 最终简化方案 - 每个字段的存在理由

### raw_data_sources 集合

```javascript
{
  _id: ObjectId,                    // MongoDB 默认主键

  // 数据源识别 - 用于区分数据类型和来源追溯
  sourceType: String,               // 'weibo_html' | 'weibo_api_json' - 决定解析策略
  sourceUrl: String,                // 数据来源URL - 问题溯源

  // 原始内容 - 核心存储目标
  rawContent: String,               // HTML/JSON原始内容 - 解析清洗的数据源
  contentHash: String,              // SHA-256哈希 - 去重

  // 微博业务标识 - 用于关联和查询
  weiboId: String,                  // 微博ID - 关联业务数据
  userId: String,                   // 用户ID - 关联用户数据

  // 处理状态 - 实时处理流程控制
  status: String,                   // 'pending' | 'completed' | 'failed' - 控制处理队列
  processedAt: Date,                // 处理完成时间 - 问题排查
  errorMessage: String,             // 错误信息 - 失败原因记录

  // 时间戳 - 数据管理
  createdAt: Date,                  // 创建时间 - 数据清理依据
}
```

### 字段精简说明

**移除的字段及理由：**

❌ `sourceName` - 可从 sourceUrl 推断，冗余
❌ `weiboInfo.dataType` - 可从 sourceUrl 或 sourceType 推断
❌ `weiboInfo.userName` - 业务数据，应在 PostgreSQL 用户表
❌ `contentSize` - 可用 rawContent.length 计算
❌ `isCompressed` - 小规模数据无需压缩
❌ `metadata.*` - 无反爬需求，HTTP状态不影响处理
❌ `collectionInfo.*` - 无批次管理和监控需求
❌ `updatedAt` - 数据不会更新，只会新增
❌ `isActive/isDeleted` - 直接删除即可，无软删除需求
❌ `note` - 无业务需求

**扁平化嵌套结构：**
- `weiboInfo.weiboId` → `weiboId`
- `weiboInfo.userId` → `userId`
- `processingStatus.status` → `status`
- `processingStatus.processedAt` → `processedAt`
- `processingStatus.errorMessage` → `errorMessage`

### 索引设计

```javascript
// 1. 去重索引
db.raw_data_sources.createIndex(
  { contentHash: 1 },
  { unique: true, sparse: true }
)

// 2. 处理队列索引
db.raw_data_sources.createIndex({ status: 1, createdAt: 1 })

// 3. 微博ID查询索引
db.raw_data_sources.createIndex({ weiboId: 1 })

// 4. 用户ID查询索引
db.raw_data_sources.createIndex({ userId: 1 })
```

### 使用示例

```javascript
// 1. 插入原始数据
{
  sourceType: 'weibo_api_json',
  sourceUrl: 'https://m.weibo.cn/api/container/getIndex?type=uid&value=1234567890',
  rawContent: '{"ok":1,"data":{...}}',
  contentHash: 'sha256:abc123...',
  weiboId: null,
  userId: '1234567890',
  status: 'pending',
  processedAt: null,
  errorMessage: null,
  createdAt: new Date()
}

// 2. 查询待处理数据
db.raw_data_sources.find({ status: 'pending' }).sort({ createdAt: 1 })

// 3. 更新处理状态
db.raw_data_sources.updateOne(
  { _id: ObjectId('...') },
  {
    $set: {
      status: 'completed',
      processedAt: new Date()
    }
  }
)

// 4. 清理已处理数据（30天前）
db.raw_data_sources.deleteMany({
  status: 'completed',
  createdAt: { $lt: new Date(Date.now() - 2592000000) }
})
```

### 字段统计

- **必需字段**: 9 个
- **平均文档大小**: ~50KB
- **索引数量**: 4 个
- **存储效率**: 最优
