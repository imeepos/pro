# @pro/minio

MinIO 对象存储封装包，提供 S3 兼容的文件存储能力。

## 核心理念

存在即合理 - 每个方法都有明确的用途，无冗余功能
优雅即简约 - 接口简洁清晰，代码自解释
性能即艺术 - 高效的流式处理和缓冲区操作

## 目录结构

```
packages/minio/
├── src/
│   └── index.ts          # 唯一源文件，导出全部功能
├── dist/                 # 构建输出
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 核心导出

### MinIOConfig

连接配置接口

```typescript
interface MinIOConfig {
  endPoint: string;     // MinIO 服务器地址
  port: number;         // 端口号
  useSSL: boolean;      // 是否使用 SSL
  accessKey: string;    // 访问密钥
  secretKey: string;    // 秘密密钥
}
```

### MinIOClient

MinIO 客户端封装类，提供存储桶和对象管理能力

**文件位置**: `/home/ubuntu/worktrees/pro/packages/minio/src/index.ts`

## API 参考

### 存储桶管理

#### bucketExists(bucketName: string): Promise<boolean>

检查存储桶是否存在

```typescript
const exists = await client.bucketExists('my-bucket');
```

#### makeBucket(bucketName: string, region?: string): Promise<void>

创建存储桶（若不存在）

```typescript
await client.makeBucket('my-bucket', 'us-east-1');
```

**特性**: 自动检查存储桶是否存在，避免重复创建

### 对象上传

#### uploadFile(bucketName: string, objectName: string, filePath: string): Promise<void>

从文件路径上传对象

```typescript
await client.uploadFile('my-bucket', 'photos/image.jpg', '/local/path/image.jpg');
```

#### uploadBuffer(bucketName: string, objectName: string, buffer: Buffer): Promise<void>

从缓冲区上传对象

```typescript
const buffer = Buffer.from('file content');
await client.uploadBuffer('my-bucket', 'documents/file.txt', buffer);
```

### 对象下载

#### downloadFile(bucketName: string, objectName: string, filePath: string): Promise<void>

下载对象到文件路径

```typescript
await client.downloadFile('my-bucket', 'photos/image.jpg', '/local/path/image.jpg');
```

#### getObject(bucketName: string, objectName: string): Promise<Buffer>

获取对象为缓冲区

```typescript
const buffer = await client.getObject('my-bucket', 'documents/file.txt');
```

**实现**: 使用流式处理，将数据块拼接为完整缓冲区

### 对象管理

#### deleteObject(bucketName: string, objectName: string): Promise<void>

删除对象

```typescript
await client.deleteObject('my-bucket', 'photos/old-image.jpg');
```

#### statObject(bucketName: string, objectName: string): Promise<Minio.BucketItemStat>

获取对象元数据

```typescript
const stat = await client.statObject('my-bucket', 'photos/image.jpg');
console.log(`Size: ${stat.size}, LastModified: ${stat.lastModified}`);
```

### URL 签名

#### getPresignedUrl(bucketName: string, objectName: string, expiry?: number): Promise<string>

生成预签名 GET URL

```typescript
const url = await client.getPresignedUrl('my-bucket', 'photos/image.jpg', 7 * 24 * 60 * 60);
```

**默认过期时间**: 7 天（604800 秒）

#### getPresignedPutUrl(bucketName: string, objectName: string, expiry?: number): Promise<string>

生成预签名 PUT URL

```typescript
const uploadUrl = await client.getPresignedPutUrl('my-bucket', 'photos/new-image.jpg', 10 * 60);
```

**默认过期时间**: 10 分钟（600 秒）

## 使用模式

### 基础初始化

```typescript
import { MinIOClient, MinIOConfig } from '@pro/minio';

const config: MinIOConfig = {
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'ChangeMe123!'
};

const client = new MinIOClient(config);
```

### 初始化存储桶

```typescript
async initBucket() {
  await client.makeBucket('app-bucket');
}
```

### 文件上传（基于 MD5 去重）

```typescript
const fileMd5 = calculateMD5(fileBuffer);
const objectName = `shared/${fileMd5.substring(0, 2)}/${fileMd5}.jpg`;

await client.uploadBuffer('app-bucket', objectName, fileBuffer);
const fileUrl = await client.getPresignedUrl('app-bucket', objectName);
```

**设计理念**: 使用 MD5 前缀分片存储，避免单目录文件过多

### 预签名上传（客户端直传）

```typescript
const uploadUrl = await client.getPresignedPutUrl('app-bucket', objectName, 600);

// 客户端使用 uploadUrl 直接上传
// PUT request to uploadUrl

// 服务端验证上传结果
const stat = await client.statObject('app-bucket', objectName);
if (stat.size !== expectedSize) {
  throw new Error('文件大小不匹配');
}
```

### 文件引用计数删除

```typescript
await attachmentRepository.remove(attachment);

const referenceCount = await attachmentRepository.count({
  where: { objectName: attachment.objectName }
});

if (referenceCount === 0) {
  await client.deleteObject(attachment.bucketName, attachment.objectName);
}
```

**设计理念**: 同一文件可能被多个记录引用，仅在无引用时物理删除

## 实际应用

### apps/api/src/events/attachment.service.ts

完整的附件管理服务实现，包含：

- 基于环境变量的配置初始化
- 自动存储桶创建
- 文件类型和大小验证
- MD5 去重机制
- 预签名 URL 上传流程
- 引用计数删除策略

## 依赖关系

**被使用于**:
- apps/api - 事件附件管理
- apps/cleaner - 数据清洗文件处理
- apps/crawler - 爬虫文件存储

**底层依赖**:
- minio ^7.1.3 - 官方 MinIO 客户端

## 设计特点

1. **简洁性**: 单文件实现，88 行代码涵盖所有核心功能
2. **流式处理**: getObject 使用流式读取，内存友好
3. **智能创建**: makeBucket 自动检查存储桶存在性
4. **灵活过期**: 预签名 URL 支持自定义过期时间
5. **类型安全**: 完整的 TypeScript 类型定义

## 构建命令

```bash
cd /home/ubuntu/worktrees/pro/packages/minio
pnpm run build        # 构建 JS 和类型定义
pnpm run typecheck    # 类型检查
```

## 快速参考

| 操作 | 方法 | 用途 |
|------|------|------|
| 检查桶 | bucketExists | 判断存储桶是否存在 |
| 创建桶 | makeBucket | 创建存储桶 |
| 上传文件 | uploadFile | 从本地路径上传 |
| 上传缓冲 | uploadBuffer | 从内存上传 |
| 下载文件 | downloadFile | 下载到本地路径 |
| 获取对象 | getObject | 获取到内存 |
| 删除对象 | deleteObject | 删除对象 |
| 对象信息 | statObject | 获取元数据 |
| 下载链接 | getPresignedUrl | 生成临时下载链接 |
| 上传链接 | getPresignedPutUrl | 生成临时上传链接 |

## 最佳实践

1. **初始化时创建桶**: 在服务启动时调用 makeBucket 确保存储桶存在
2. **MD5 分片存储**: 使用 MD5 前缀避免单目录文件过多
3. **预签名直传**: 大文件上传使用预签名 URL，减轻服务器负担
4. **引用计数管理**: 共享文件使用引用计数，避免误删
5. **URL 过期控制**: 根据场景设置合理的 URL 过期时间

---

**包版本**: 1.0.0
**文档生成时间**: 2025-10-16
