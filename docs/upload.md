# 上传功能规划文档

## 文档状态
- 创建时间: 2025-10-10
- 状态: 规划中
- 最后更新: 2025-10-10

## 概述
本文档用于记录上传功能的规划、设计和实现细节。

## 现有实现分析

### 已实现的功能
项目中已经存在事件附件 (event_attachment) 功能,包括:

1. **数据库实体** (`event-attachment.entity.ts`)
   - 已有字段: id, eventId, fileName, fileUrl, bucketName, objectName, fileType, fileSize, mimeType, sortOrder, createdAt
   - 支持文件类型: IMAGE, VIDEO, DOCUMENT
   - 与事件表关联 (ManyToOne)

2. **MinIO 封装** (`@pro/minio`)
   - 已实现基础的 MinIO 客户端封装
   - 支持: 创建桶, 上传文件, 上传 Buffer, 下载文件, 删除对象, 生成预签名 URL

3. **后端服务** (`attachment.service.ts`)
   - 已实现: 上传附件, 获取附件列表, 删除附件, 更新排序
   - 使用 Multer 处理文件上传
   - 自动按事件ID组织文件夹结构

4. **接口** (`attachment.controller.ts`)
   - POST /events/:eventId/attachments - 上传附件
   - GET /events/:eventId/attachments - 获取附件列表
   - DELETE /events/:eventId/attachments/:id - 删除附件
   - PUT /events/:eventId/attachments/sort - 更新排序

### 缺失的功能
1. ❌ **文件 MD5 去重** - 当前没有记录文件的 MD5 值,无法防止重复上传
2. ❌ **SDK 封装** - @pro/sdk 中没有封装上传相关的方法
3. ❌ **前端上传组件** - @pro/admin 中没有通用的上传组件
4. ❌ **文件上传限制** - 没有明确的文件大小和类型限制配置
5. ❌ **上传进度反馈** - 没有上传进度显示功能

## 技术架构

### 整体架构
```
MinIO (存储层)
    ↓
@pro/api (后端接口层)
    ↓
@pro/sdk (SDK封装层)
    ↓
@pro/admin (前端组件层)
```

### 技术栈
- **存储**: MinIO (S3兼容的对象存储)
- **后端**: @pro/api (NestJS)
- **SDK**: @pro/sdk (TypeScript)
- **前端**: @pro/admin (Angular)

## 功能规划

### 1. MinIO 存储配置 ✅
- [x] 配置 MinIO 服务 (已完成)
- [x] 创建存储桶 (Bucket) (已完成)
- [x] 配置访问权限和策略 (已完成)
- [x] 设置文件访问 URL (已完成)

### 2. 后端接口优化 (@pro/api)

#### 2.1 添加 MD5 去重功能 🔥
- [ ] **数据库迁移**: 在 event_attachment 表中添加 `file_md5` 字段
  ```sql
  ALTER TABLE event_attachment ADD COLUMN file_md5 VARCHAR(32);
  CREATE INDEX idx_event_attachment_md5 ON event_attachment(file_md5);
  ```
- [ ] **实体更新**: 在 EventAttachmentEntity 中添加 fileMd5 字段
- [ ] **上传逻辑优化**:
  - 上传前计算文件 MD5
  - 检查数据库中是否存在相同 MD5 的文件
  - 如果存在,直接返回已有文件记录 (避免重复上传)
  - 如果不存在,执行上传并保存 MD5
- [ ] **引用计数机制** (可选):
  - 记录同一文件被多个事件引用的情况
  - 删除时检查引用计数,只有引用计数为 0 时才真正删除 MinIO 中的文件

#### 2.2 已实现的功能 ✅
- [x] 创建上传控制器 (attachment.controller.ts)
- [x] 创建上传服务 (attachment.service.ts)
- [x] 实现 MinIO 客户端封装 (@pro/minio)
- [x] 支持的文件类型: IMAGE, VIDEO, DOCUMENT
- [x] 实现上传接口: POST /events/:eventId/attachments
- [x] 实现文件删除接口: DELETE /events/:eventId/attachments/:id
- [x] 实现文件列表查询接口: GET /events/:eventId/attachments
- [x] 生成唯一文件名 (UUID + 扩展名)
- [x] 返回文件访问 URL (预签名 URL)
- [x] 排序功能: PUT /events/:eventId/attachments/sort

#### 2.3 需要增强的功能
- [ ] **文件大小限制配置**
  - 配置不同类型文件的大小限制
  - 图片: 10MB
  - 视频: 500MB
  - 文档: 50MB
- [ ] **文件类型验证增强**
  - 验证文件扩展名与 MIME 类型是否匹配
  - 防止文件类型伪造
- [ ] **错误处理优化**
  - 统一错误响应格式
  - 详细的错误信息
- [ ] **日志记录**
  - 记录上传/删除操作日志
  - 便于审计和问题排查

### 3. SDK 封装 (@pro/sdk)
- [ ] 创建上传服务类 (UploadService)
- [ ] 封装图片上传方法 (uploadImage)
- [ ] 封装文件上传方法 (uploadFile)
- [ ] 封装视频上传方法 (uploadVideo)
- [ ] 封装删除方法 (deleteFile)
- [ ] 封装查询方法 (getFileList)
- [ ] 上传进度回调
- [ ] 错误处理
- [ ] TypeScript 类型定义

### 4. 前端上传组件 (@pro/admin)
- [ ] 创建通用上传组件 (UploadComponent)
- [ ] 图片上传组件
  - 支持预览
  - 支持裁剪
  - 支持多图上传
- [ ] 文件上传组件
  - 显示文件名
  - 显示文件大小
  - 显示上传进度
- [ ] 视频上传组件
  - 支持预览
  - 显示时长
  - 显示封面
- [ ] 拖拽上传支持
- [ ] 粘贴上传支持
- [ ] 上传进度显示
- [ ] 错误提示

### 5. 对接添加事件表单
- [ ] 在添加事件表单中集成上传组件
- [ ] 支持上传事件相关图片
- [ ] 支持上传事件相关文件
- [ ] 支持上传事件相关视频
- [ ] 表单验证
- [ ] 数据提交

## 实现顺序 (基于现有代码)

### ✅ 阶段一: 基础设施 (已完成)
1. ✅ 配置 MinIO 服务
2. ✅ 创建存储桶和权限配置
3. ✅ 实现基础 MinIO 客户端封装

### ✅ 阶段二: 后端基础实现 (已完成)
1. ✅ 实现 @pro/api 上传接口
2. ✅ 实现文件管理接口 (上传/删除/查询/排序)
3. ✅ 实现事件附件实体和数据库表

### 🚀 阶段三: 后端功能增强 (待实现 - 优先级最高)
**任务依赖**: 无,可立即开始

1. **添加 MD5 去重功能** (核心功能)
   - 创建数据库迁移,添加 file_md5 字段和索引
   - 更新 EventAttachmentEntity 实体
   - 在 AttachmentService 中实现 MD5 计算和去重逻辑
   - 更新上传接口,支持 MD5 检查
   - 添加单元测试

2. **增强文件验证和限制** (并行任务 1)
   - 配置文件大小限制
   - 增强文件类型验证
   - 添加错误处理和日志记录

### 🔧 阶段四: SDK 封装 (依赖阶段三)
**任务依赖**: 后端 MD5 功能完成后开始

1. 创建 @pro/sdk 中的 AttachmentService
2. 封装所有上传相关方法
3. 实现客户端 MD5 计算 (可选,用于前端预检查)
4. 添加上传进度回调支持
5. TypeScript 类型定义

### 🎨 阶段五: 前端实现 (依赖阶段四,部分可并行)
**任务依赖**: SDK 封装完成后开始

#### 5.1 创建上传组件 (并行任务)
可以同时分配多个 agent 并行开发:
- Agent 1: 图片上传组件 (支持预览、裁剪、多图)
- Agent 2: 文件上传组件 (显示文件信息、进度)
- Agent 3: 视频上传组件 (支持预览、封面)

#### 5.2 对接添加事件表单 (依赖 5.1)
**任务依赖**: 上传组件完成后开始

1. 在添加事件表单中集成上传组件
2. 实现表单验证
3. 实现数据提交
4. 用户测试和反馈

## MD5 去重机制详解

### 工作流程
```
1. 用户选择文件
   ↓
2. 前端计算文件 MD5 (可选优化)
   ↓
3. 发送文件和 MD5 到后端
   ↓
4. 后端计算/验证 MD5
   ↓
5. 查询数据库: SELECT * FROM event_attachment WHERE file_md5 = ?
   ↓
6a. 如果存在相同 MD5:
    - 创建新的附件记录 (关联到当前事件)
    - 复用已有的 MinIO 对象
    - 返回新记录 (不同的 id, 相同的 fileUrl 和 objectName)
   ↓
6b. 如果不存在:
    - 上传文件到 MinIO
    - 创建新附件记录,保存 MD5
    - 返回新记录
```

### 数据库设计

#### 方案一: 简单共享 (推荐用于当前场景)
```typescript
// event_attachment 表保持独立记录
// 相同文件的多个记录共享 objectName 和 file_md5
// 优点: 实现简单,事件删除逻辑清晰
// 缺点: 删除时需要额外检查引用计数

示例数据:
id  | event_id | file_md5 | object_name        | ...
1   | 100      | abc123   | shared/abc123.jpg  | ...
2   | 101      | abc123   | shared/abc123.jpg  | ...  (共享同一文件)
```

#### 方案二: 文件库 + 引用表 (适用于更复杂场景)
```typescript
// 新增 file_library 表 (文件库)
id | file_md5 | object_name | ... | reference_count

// event_attachment 表变为引用表
id | event_id | file_id | ...

// 优点: 引用计数管理清晰,便于统计
// 缺点: 需要额外的表和关联关系
```

### 当前推荐: 方案一 (简单共享)
- 在现有 event_attachment 表中添加 file_md5 字段
- 上传时检查 MD5,如果存在则复用 objectName
- 删除时查询是否还有其他记录使用相同 objectName
- 只有当引用计数为 0 时才删除 MinIO 中的文件

## 数据结构

### 现有实体 (EventAttachmentEntity)
```typescript
interface EventAttachment {
  id: string;              // 附件ID (bigint)
  eventId: string;         // 事件ID
  fileName: string;        // 原始文件名
  fileUrl: string;         // 文件访问URL (预签名URL)
  bucketName: string;      // MinIO 桶名
  objectName: string;      // MinIO 对象名 (路径)
  fileType: FileType;      // 文件类型 (image/video/document)
  fileSize: number;        // 文件大小 (bytes)
  mimeType: string;        // MIME 类型
  sortOrder: number;       // 排序顺序
  createdAt: Date;         // 创建时间
  // 待添加:
  fileMd5?: string;        // 文件MD5值 (用于去重)
}
```

### 新增字段定义
```typescript
// 在 EventAttachmentEntity 中添加
@Index()
@Column({ type: 'varchar', length: 32, nullable: true, name: 'file_md5' })
fileMd5: string;  // MD5 哈希值 (32位十六进制字符串)
```

### 上传响应格式 (现有)
```typescript
// AttachmentService.uploadAttachment 返回值
interface UploadResponse {
  id: string;              // 附件ID
  eventId: string;         // 事件ID
  fileName: string;        // 原始文件名
  fileUrl: string;         // 访问URL
  bucketName: string;      // 桶名
  objectName: string;      // 对象名
  fileType: FileType;      // 文件类型
  fileSize: number;        // 文件大小
  mimeType: string;        // MIME类型
  sortOrder: number;       // 排序
  createdAt: Date;         // 创建时间
  fileMd5: string;         // MD5值 (新增)
  isDuplicate?: boolean;   // 是否为重复文件 (新增,可选)
}
```

### MD5 去重响应示例
```typescript
// 场景1: 首次上传新文件
{
  id: "123",
  eventId: "100",
  fileName: "photo.jpg",
  fileUrl: "https://minio.../shared/abc123.jpg",
  objectName: "shared/abc123.jpg",
  fileMd5: "abc123...",
  isDuplicate: false,
  // ...
}

// 场景2: 上传重复文件 (MD5相同)
{
  id: "124",               // 新的记录ID
  eventId: "101",          // 不同的事件ID
  fileName: "photo.jpg",
  fileUrl: "https://minio.../shared/abc123.jpg",  // 复用相同URL
  objectName: "shared/abc123.jpg",                // 复用相同对象
  fileMd5: "abc123...",    // 相同的MD5
  isDuplicate: true,       // 标记为重复文件
  // ...
}
```

## 技术实现细节

### MD5 计算方法 (Node.js)
```typescript
import * as crypto from 'crypto';

function calculateMD5(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}
```

### 文件存储路径策略
```typescript
// 当前策略: eventId/uuid.ext
// 推荐策略 (支持去重): shared/md5[:2]/md5.ext

// 示例:
// MD5: abc123456789...
// 路径: shared/ab/abc123456789.jpg
// 优点: 按MD5前缀分散到不同目录,避免单目录文件过多
```

### 删除逻辑优化
```typescript
async deleteAttachment(eventId: string, attachmentId: string): Promise<void> {
  const attachment = await this.attachmentRepository.findOne({
    where: { id: attachmentId, eventId },
  });

  if (!attachment) {
    throw new NotFoundException('附件不存在');
  }

  // 删除数据库记录
  await this.attachmentRepository.remove(attachment);

  // 检查是否还有其他记录使用相同的对象
  const referenceCount = await this.attachmentRepository.count({
    where: { objectName: attachment.objectName },
  });

  // 只有当没有其他引用时才删除 MinIO 中的文件
  if (referenceCount === 0) {
    try {
      await this.minioClient.deleteObject(
        attachment.bucketName,
        attachment.objectName,
      );
    } catch (error) {
      console.error('Failed to delete file from MinIO:', error);
    }
  }
}
```

## 配置项

### 环境变量 (.env)
```bash
# MinIO 配置
MINIO_ENDPOINT=minio
MINIO_API_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=ChangeMe123!
MINIO_BUCKET_NAME=app-bucket

# 上传限制配置 (建议添加)
UPLOAD_MAX_SIZE_IMAGE=10485760      # 10MB
UPLOAD_MAX_SIZE_VIDEO=524288000     # 500MB
UPLOAD_MAX_SIZE_DOCUMENT=52428800   # 50MB

# 允许的文件类型 (建议添加)
UPLOAD_ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
UPLOAD_ALLOWED_VIDEO_TYPES=video/mp4,video/avi,video/mov
UPLOAD_ALLOWED_DOCUMENT_TYPES=application/pdf,application/msword
```

## 依赖包

### 需要安装的包
```bash
# 后端 (如果还没有)
pnpm add --filter=@pro/api crypto  # Node.js 内置,无需安装

# 前端 MD5 计算 (可选)
pnpm add --filter=@pro/admin spark-md5
pnpm add --filter=@pro/admin -D @types/spark-md5
```

## 测试用例

### 后端测试场景
1. ✅ 上传新文件 - 应成功上传并返回 MD5
2. ✅ 上传重复文件 - 应复用已有文件,不重复上传到 MinIO
3. ✅ 不同事件上传相同文件 - 应创建独立记录但共享存储
4. ✅ 删除最后一个引用 - 应删除 MinIO 中的文件
5. ✅ 删除非最后引用 - 应保留 MinIO 中的文件
6. ✅ 文件大小超限 - 应拒绝上传并返回错误
7. ✅ 文件类型不匹配 - 应拒绝上传并返回错误

### 前端测试场景
1. ✅ 图片预览
2. ✅ 多文件上传
3. ✅ 上传进度显示
4. ✅ 错误提示
5. ✅ 拖拽上传
6. ✅ 粘贴上传

## 注意事项

### 开发流程
1. 每个阶段完成后提交代码
2. 修改 API 后需要重新构建: `docker compose up -d api --build`
3. 数据库迁移后重启: `docker compose restart api`
4. 完成后使用 `curl gateway` 测试接口
5. 前端界面需要用户验证反馈

### 性能优化建议
1. **MD5 计算**: 对于大文件,考虑使用流式计算避免内存占用过高
2. **预签名 URL 缓存**: 可以缓存 URL,避免频繁请求 MinIO
3. **批量上传**: 支持多文件并发上传,提高效率
4. **分片上传**: 对于超大文件 (>100MB),考虑实现分片上传

### 安全注意事项
1. ✅ 已实现 JWT 认证 (@UseGuards(JwtAuthGuard))
2. 需添加文件内容校验 (防止恶意文件)
3. 需添加文件扫描 (病毒/恶意代码检测)
4. 限制文件类型和大小
5. 对文件名进行清理和转义

---

*持续更新中，等待更多规划内容...*
