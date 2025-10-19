# 微博爬虫系统数据库集成测试

本目录包含微博爬虫系统的完整数据库集成测试套件，涵盖 PostgreSQL、MongoDB 和 Redis 三个核心数据存储的一致性和可靠性验证。

## 测试架构

### 测试覆盖范围

1. **PostgreSQL 实体集成测试** (`postgres-entities.integration.test.ts`)
   - 微博账号实体的 CRUD 操作
   - 搜索任务实体的状态管理
   - 数据关联和约束验证
   - 事务回滚测试
   - 数据库索引验证
   - 边界条件和异常场景

2. **MongoDB 原始数据集成测试** (`mongo-raw-data.integration.test.ts`)
   - 原始数据存储和检索
   - 数据去重机制验证
   - 大文档处理测试
   - 索引性能验证
   - 数据生命周期管理
   - 元数据管理

3. **Redis 缓存集成测试** (`redis-cache.integration.test.ts`)
   - 缓存存储和过期机制
   - 分布式锁机制
   - 会话管理
   - 缓存一致性
   - 故障恢复测试
   - 性能优化验证

4. **跨数据库一致性测试** (`cross-database-consistency.integration.test.ts`)
   - PostgreSQL 和 MongoDB 数据同步
   - 事务一致性验证
   - 数据完整性检查
   - 数据修复机制
   - 性能和扩展性测试

## 环境要求

### 系统依赖
- Node.js (>= 18.0.0)
- pnpm (>= 8.0.0)
- Docker & Docker Compose

### 开发依赖
- Jest (测试框架)
- MongoDB Memory Server (内存 MongoDB)
- TypeORM (PostgreSQL ORM)
- ioredis (Redis 客户端)

## 快速开始

### 1. 自动运行（推荐）

使用提供的自动化脚本运行所有集成测试：

```bash
# 进入测试目录
cd packages/entities/test

# 运行所有集成测试
./run-integration-tests.sh
```

脚本会自动：
- 启动测试用的 PostgreSQL 和 Redis 服务
- 安装必要的依赖
- 运行所有集成测试
- 生成测试覆盖率报告
- 清理测试环境

### 2. 手动运行

如果需要手动控制测试流程：

```bash
# 启动测试服务
./run-integration-tests.sh start

# 安装依赖
pnpm install

# 运行特定测试套件
pnpm test test/integration/postgres-entities.integration.test.ts
pnpm test test/integration/mongo-raw-data.integration.test.ts
pnpm test test/integration/redis-cache.integration.test.ts
pnpm test test/integration/cross-database-consistency.integration.test.ts

# 生成覆盖率报告
pnpm test:cov

# 停止测试服务
./run-integration-tests.sh stop
```

## 环境配置

测试使用以下环境变量配置：

```bash
# PostgreSQL 配置
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=test
POSTGRES_PASSWORD=test
POSTGRES_DB=test_pro_entities

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_DB=1

# 通用配置
NODE_ENV=test
VERBOSE_TESTS=false
```

## 测试数据模型

### PostgreSQL 实体
- `UserEntity`: 用户基础信息
- `WeiboAccountEntity`: 微博账号绑定信息
- `WeiboSearchTaskEntity`: 微博搜索任务配置和状态

### MongoDB 集合
- `raw_data`: 原始爬取数据（微博帖子、评论等）
- `processed_data`: 处理后的结构化数据
- `raw_data_metadata`: 数据处理状态和元信息

### Redis 数据结构
- 缓存键值对：`cache:{type}:{id}`
- 分布式锁：`lock:{resource}`
- 会话数据：`session:{session_id}`
- 事务状态：`transaction:{tx_id}`

## 测试场景详解

### 1. CRUD 操作测试
验证实体的创建、读取、更新、删除操作是否正确工作，包括：
- 数据约束验证
- 外键关系维护
- 索引性能验证
- 事务回滚机制

### 2. 数据同步测试
验证跨数据库的数据一致性：
- PostgreSQL 实体状态变更同步到 MongoDB
- 原始数据处理状态同步到 Redis 缓存
- 分布式事务的一致性保证

### 3. 故障恢复测试
测试各种故障场景下的系统行为：
- 数据库连接中断恢复
- 网络分区处理
- 数据不一致修复
- 缓存失效重建

### 4. 性能测试
验证系统在负载下的表现：
- 大量数据插入性能
- 复杂查询响应时间
- 并发操作处理能力
- 内存使用优化

## 测试报告

运行测试后，可以在以下位置查看报告：

- **控制台输出**: 实时测试结果和错误信息
- **覆盖率报告**: `coverage/lcov-report/index.html`
- **Jest 报告**: `coverage/report.json`

## 故障排除

### 常见问题

1. **PostgreSQL 连接失败**
   ```bash
   # 检查服务状态
   docker-compose -f docker-compose.test.yml ps

   # 查看日志
   docker-compose -f docker-compose.test.yml logs postgres-test
   ```

2. **Redis 连接超时**
   ```bash
   # 测试连接
   docker-compose -f docker-compose.test.yml exec redis-test redis-cli ping
   ```

3. **MongoDB 内存服务器启动失败**
   ```bash
   # 清理 MongoDB 临时文件
   rm -rf /tmp/mongodb-*
   ```

4. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :5433
   lsof -i :6380

   # 停止冲突服务
   ./run-integration-tests.sh stop
   ```

### 调试模式

启用详细日志输出：

```bash
export VERBOSE_TESTS=true
./run-integration-tests.sh test
```

### 单独运行测试

运行特定测试用例：

```bash
# 运行特定测试文件
pnpm test postgres-entities.integration.test.ts

# 运行特定测试用例
pnpm test --testNamePattern="应该创建微博账号并验证唯一约束"
```

## 最佳实践

### 1. 测试隔离
- 每个测试用例使用独立的数据
- 测试前后清理状态
- 避免测试间依赖

### 2. 错误处理
- 验证边界条件
- 测试异常场景
- 确保资源清理

### 3. 性能考虑
- 设置合理的超时时间
- 批量操作优化
- 连接池管理

### 4. 数据一致性
- 验证事务完整性
- 检查数据同步
- 测试并发场景

## 贡献指南

### 添加新测试

1. 在对应的测试文件中添加测试用例
2. 确保测试隔离和清理
3. 添加必要的断言和错误处理
4. 更新文档说明

### 修改现有测试

1. 理解测试目的和场景
2. 保持向后兼容性
3. 更新相关文档
4. 运行完整测试套件验证

## 许可证

本测试套件遵循项目的许可证条款。