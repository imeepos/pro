# 事件管理系统数据库迁移文件

本目录包含事件管理系统的 6 张核心表的 TypeORM 迁移文件。

## 迁移文件列表

1. **1728385200000-CreateIndustryTypeTable.ts** - 行业类型表
2. **1728385210000-CreateEventTypeTable.ts** - 事件类型表
3. **1728385220000-CreateEventTable.ts** - 事件主表
4. **1728385230000-CreateEventAttachmentTable.ts** - 事件附件表
5. **1728385240000-CreateTagTable.ts** - 标签表
6. **1728385250000-CreateEventTagTable.ts** - 事件标签关联表

## 数据库表结构

### 1. industry_type (行业类型表)
- 主键: bigserial 类型的 id
- 唯一索引: industry_code
- 包含字段: 编码、名称、描述、排序、状态、时间戳

### 2. event_type (事件类型表)
- 主键: bigserial 类型的 id
- 唯一索引: event_code
- 外键: industry_id → industry_type.id (RESTRICT)
- 包含字段: 编码、名称、所属行业、描述、排序、状态、时间戳

### 3. event (事件表)
- 主键: bigserial 类型的 id
- 外键: event_type_id → event_type.id (RESTRICT)
- 外键: industry_type_id → industry_type.id (RESTRICT)
- 复合索引: (province, city, district)
- 空间索引: PostGIS GIST 索引 (经纬度)
- 包含字段: 事件信息、时间地点、经纬度、状态、创建人、时间戳

### 4. event_attachment (事件附件表)
- 主键: bigserial 类型的 id
- 外键: event_id → event.id (CASCADE)
- 复合索引: (event_id, sort_order)
- 包含字段: MinIO 存储信息、文件类型、大小、排序、时间戳

### 5. tag (标签表)
- 主键: bigserial 类型的 id
- 唯一索引: tag_name
- 索引: usage_count (支持热门标签查询)
- 包含字段: 标签名、颜色、使用次数、时间戳

### 6. event_tag (事件标签关联表)
- 主键: bigserial 类型的 id
- 外键: event_id → event.id (CASCADE)
- 外键: tag_id → tag.id (CASCADE)
- 唯一复合索引: (event_id, tag_id) 防止重复关联
- 包含字段: event_id, tag_id, created_at

## 注意事项

### PostGIS 扩展
event 表使用了 PostGIS 扩展来支持地理空间索引和查询。迁移会自动启用 PostGIS 扩展:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

确保你的 PostgreSQL 数据库已安装 PostGIS 扩展。

### 外键约束
- **RESTRICT**: 删除行业类型/事件类型时,如果有关联的事件,则不允许删除
- **CASCADE**: 删除事件时,自动删除所有关联的附件记录和标签关联

### 数据类型说明
- `bigserial`: PostgreSQL 自增长整型 (相当于 BIGINT AUTO_INCREMENT)
- `numeric(10,7)`: 精确到小数点后7位的数值类型 (用于经纬度,精确到约1厘米)
- `varchar(n)`: 变长字符串
- `text`: 无限制长度的文本
- `timestamp`: 时间戳类型

## 使用方法

### 方法1: 手动运行迁移 (推荐用于生产环境)

1. 配置 TypeORM 数据源文件 (需要创建):
```typescript
// apps/api/src/data-source.ts
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres123',
  database: process.env.DATABASE_NAME || 'pro',
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // 生产环境必须设置为 false
});
```

2. 添加迁移相关脚本到 package.json:
```json
{
  "scripts": {
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/data-source.ts",
    "migration:show": "typeorm-ts-node-commonjs migration:show -d src/data-source.ts"
  }
}
```

3. 运行迁移:
```bash
pnpm run --filter=@pro/api migration:run
```

4. 回滚迁移:
```bash
pnpm run --filter=@pro/api migration:revert
```

### 方法2: 使用 synchronize (仅用于开发环境)

当前项目在 `database.config.ts` 中设置了 `synchronize: true`,这会在每次启动时自动同步表结构。

**警告**: 生产环境必须禁用 synchronize,使用迁移文件!

### 方法3: 直接执行 SQL (手动方式)

你也可以查看编译后的 JavaScript 文件,手动提取 SQL 并在数据库中执行。

## 迁移顺序

迁移文件会按照时间戳顺序自动执行:
1. CreateIndustryTypeTable (行业类型表)
2. CreateEventTypeTable (事件类型表,依赖行业类型)
3. CreateEventTable (事件表,依赖前两个表)
4. CreateEventAttachmentTable (附件表,依赖事件表)
5. CreateTagTable (标签表,独立)
6. CreateEventTagTable (关联表,依赖事件表和标签表)

## 回滚顺序

回滚时会按照相反的顺序执行 `down()` 方法,确保外键约束不会出错。

## 验证迁移

运行迁移后,可以通过以下 SQL 验证表是否创建成功:

```sql
-- 查看所有表
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 查看表结构
\d industry_type
\d event_type
\d event
\d event_attachment
\d tag
\d event_tag

-- 查看索引
SELECT indexname, indexdef FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- 查看外键约束
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public';
```

## 数据初始化

迁移文件只创建表结构,不包含初始数据。如需初始数据,可以:

1. 创建 seed 脚本
2. 手动插入测试数据
3. 通过 API 接口创建数据

## 相关文档

- 详细设计文档: `/home/ubuntu/worktrees/pro/docs/event.md`
- Entity 定义: `apps/api/src/entities/` (待创建)
- API 接口: `apps/api/src/events/` (待创建)

## 问题排查

### 1. PostGIS 扩展不存在
```
ERROR: could not open extension control file
```
**解决方法**: 安装 PostgreSQL 的 PostGIS 扩展
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-14-postgis-3

# Docker
使用 postgis/postgis 镜像
```

### 2. 外键约束冲突
```
ERROR: insert or update on table violates foreign key constraint
```
**解决方法**: 确保按照正确的顺序执行迁移,或检查数据的完整性

### 3. 唯一索引冲突
```
ERROR: duplicate key value violates unique constraint
```
**解决方法**: 检查数据中是否有重复的 code 或 name 字段

## 维护建议

1. **生产环境**: 关闭 synchronize,使用迁移文件管理数据库变更
2. **版本控制**: 所有迁移文件必须纳入 Git 版本控制
3. **备份**: 在生产环境执行迁移前,务必备份数据库
4. **测试**: 先在测试环境验证迁移,再部署到生产环境
5. **文档**: 每次数据库变更都应更新相关文档

---

创建时间: 2025-10-08
TypeORM 版本: 0.3.27
PostgreSQL 版本: 14+
PostGIS 版本: 3+
