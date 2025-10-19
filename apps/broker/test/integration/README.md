# Broker服务集成测试

本目录包含微博爬虫系统Broker服务的集成测试套件，验证任务调度、消息队列、监控等核心功能的完整性和可靠性。

## 测试架构

### 测试文件结构

```
test/integration/
├── test.config.ts                           # 测试配置和工具函数
├── jest.integration.config.ts               # Jest集成测试配置
├── jest.setup.ts                            # Jest全局设置
├── task-scanner.integration.spec.ts         # 任务扫描调度集成测试
├── sub-task-generation.integration.spec.ts   # 子任务生成集成测试
├── message-queue.integration.spec.ts        # 消息队列集成测试
├── task-monitoring.integration.spec.ts      # 任务监控集成测试
└── README.md                                # 本文档
```

### 测试覆盖范围

#### 1. 任务扫描调度集成测试 (`task-scanner.integration.spec.ts`)

**测试内容：**
- ✅ 任务发现和筛选逻辑
- ✅ 定时任务扫描机制
- ✅ 任务状态检查逻辑
- ✅ 调度时间计算
- ✅ 任务优先级处理
- ✅ 乐观锁机制
- ✅ 异常任务处理
- ✅ 并发任务处理
- ✅ 性能指标收集
- ✅ 统计和报告功能

**关键验证点：**
- 正确识别待执行任务（enabled=true, status=PENDING, nextRunAt <= NOW）
- 优先级管理器的调度决策
- 乐观锁防止并发调度
- 消息发布失败时的状态回滚
- 大量任务的处理性能

#### 2. 子任务生成集成测试 (`sub-task-generation.integration.spec.ts`)

**测试内容：**
- ✅ 首次抓取子任务生成
- ✅ 增量更新子任务生成
- ✅ 大任务分解逻辑
- ✅ 时间窗口划分策略
- ✅ 账号分配算法
- ✅ 任务依赖关系处理
- ✅ 批量任务创建
- ✅ 时间精度验证
- ✅ 极端时间跨度处理

**关键验证点：**
- 首次抓取7天时间限制
- 增量更新30天时间限制
- 时间分钟级精度（避免重叠）
- 账号轮换逻辑
- 时间分片算法

#### 3. 消息队列集成测试 (`message-queue.integration.spec.ts`)

**测试内容：**
- ✅ 消息发布和消费
- ✅ 消息持久化验证
- ✅ 死信队列处理
- ✅ 消息重试机制
- ✅ 队列负载均衡
- ✅ 消息确认机制
- ✅ 连接管理和监控
- ✅ 性能测试
- ✅ 错误处理和恢复

**关键验证点：**
- 消息持久化设置
- 死信队列配置
- 指数退避重试策略
- 预取数量和负载均衡
- 高吞吐量性能（>200消息/秒）

#### 4. 任务监控集成测试 (`task-monitoring.integration.spec.ts`)

**测试内容：**
- ✅ 任务执行状态监控
- ✅ 性能指标收集
- ✅ 异常情况告警
- ✅ 任务完成统计
- ✅ 系统健康检查
- ✅ 实时监控仪表板
- ✅ 性能异常检测
- ✅ 告警通知机制

**关键验证点：**
- 僵尸任务检测（>5分钟未更新）
- 性能异常阈值检测
- 系统资源监控
- 健康状态综合评估
- 实时数据推送

## 环境配置

### 测试环境变量

创建 `.env.test` 文件：

```bash
# 数据库配置
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=password
TEST_DB_NAME=pro_broker_test

# Redis配置
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
TEST_REDIS_DB=1
TEST_REDIS_PASSWORD=

# RabbitMQ配置
TEST_RABBITMQ_HOST=localhost
TEST_RABBITMQ_PORT=5672
TEST_RABBITMQ_USERNAME=guest
TEST_RABBITMQ_PASSWORD=guest
TEST_RABBITMQ_VHOST=/test

# 测试配置
VERBOSE_TESTS=false
NODE_ENV=test
```

### 依赖服务要求

1. **PostgreSQL**: 用于测试数据库
2. **Redis**: 用于缓存和状态管理
3. **RabbitMQ**: 用于消息队列测试

## 运行测试

### 安装依赖

```bash
cd apps/broker
pnpm install
```

### 运行所有集成测试

```bash
# 使用专门的集成测试配置
pnpm run test:integration

# 或者直接使用Jest
npx jest --config test/integration/jest.integration.config.ts
```

### 运行特定测试文件

```bash
# 运行任务扫描测试
npx jest test/integration/task-scanner.integration.spec.ts --config test/integration/jest.integration.config.ts

# 运行消息队列测试
npx jest test/integration/message-queue.integration.spec.ts --config test/integration/jest.integration.config.ts
```

### 运行测试并生成报告

```bash
# 生成HTML报告和JUnit XML
npx jest --config test/integration/jest.integration.config.ts --coverage
```

### 调试模式

```bash
# 启用详细输出
VERBOSE_TESTS=true npx jest --config test/integration/jest.integration.config.ts

# 调试特定测试
npx jest --config test/integration/jest.integration.config.ts --testNamePattern="应该发现待执行的任务"
```

## 测试数据管理

### 测试数据清理

测试使用独立的测试数据库和Redis数据库，测试完成后会自动清理：

```typescript
afterEach(async () => {
  // 清理测试数据
  await TestUtils.cleanupTestData(taskRepository);
  await redisService.flushdb();
});
```

### 模拟数据

测试使用工厂模式创建模拟数据：

```typescript
// 创建测试任务
const task = createTestTask({
  id: 1,
  keyword: '测试关键词',
  status: WeiboSearchTaskStatus.PENDING,
});

// 创建子任务消息
const subTask = testUtils.createSubTaskMessage({
  taskId: 1,
  keyword: '测试消息',
});

// 创建性能指标
const metrics = testUtils.createPerformanceMetrics({
  executionTime: 5000,
  memoryUsage: 512,
});
```

## 性能基准

### 预期性能指标

| 测试类型 | 指标 | 目标值 |
|---------|------|--------|
| 任务扫描 | 100个任务扫描 | < 5秒 |
| 消息发布 | 1000条消息 | < 5秒，>200消息/秒 |
| 消息消费 | 500条消息 | < 3秒，>150消息/秒 |
| 性能指标收集 | 10000条指标 | < 10秒，>1000指标/秒 |
| 并发查询 | 100个并发查询 | < 5秒 |

### 性能测试

运行性能测试：

```bash
# 运行包含性能测试的完整测试套件
npx jest --config test/integration/jest.integration.config.ts --testNamePattern="性能"
```

## 持续集成

### GitHub Actions配置

```yaml
name: Broker Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: pro_broker_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      rabbitmq:
        image: rabbitmq:3-management
        env:
          RABBITMQ_DEFAULT_VHOST: /test
        options: >-
          --health-cmd "rabbitmq-diagnostics -q ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'

    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8

    - name: Install dependencies
      run: |
        cd apps/broker
        pnpm install

    - name: Run integration tests
      run: |
        cd apps/broker
        pnpm run test:integration
      env:
        TEST_DB_HOST: localhost
        TEST_REDIS_HOST: localhost
        TEST_RABBITMQ_HOST: localhost

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: integration-test-results
        path: apps/broker/test-results/
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   ```
   错误: Connection refused
   解决: 检查PostgreSQL服务是否运行，配置是否正确
   ```

2. **Redis连接超时**
   ```
   错误: Redis connection timeout
   解决: 检查Redis服务，增加连接超时时间
   ```

3. **RabbitMQ连接问题**
   ```
   错误: AMQP connection failed
   解决: 检查RabbitMQ服务和虚拟主机配置
   ```

4. **测试超时**
   ```
   错误: Test timeout of 60000ms exceeded
   解决: 增加超时时间或优化测试性能
   ```

### 调试技巧

1. **启用详细日志**
   ```bash
   VERBOSE_TESTS=true npx jest --config test/integration/jest.integration.config.ts
   ```

2. **单步调试**
   ```bash
   node --inspect-brk node_modules/.bin/jest --config test/integration/jest.integration.config.ts --runInBand
   ```

3. **查看测试覆盖率**
   ```bash
   npx jest --config test/integration/jest.integration.config.ts --coverage --coverageReporters=html
   ```

## 贡献指南

### 添加新的集成测试

1. 在相应的测试文件中添加测试用例
2. 使用`describe`和`it`组织测试结构
3. 使用`createTestTask`等工具函数创建测试数据
4. 添加适当的断言和验证
5. 确保测试的独立性和可重复性

### 测试命名规范

- 测试文件：`*.integration.spec.ts`
- 测试套件：`describe('功能名称Integration', () => {})`
- 测试用例：`it('应该验证具体行为', async () => {})`

### 测试最佳实践

1. **隔离性**: 每个测试用例应该独立运行
2. **可重复性**: 测试结果应该一致和可重复
3. **快速执行**: 优化测试性能，避免不必要的等待
4. **清晰断言**: 使用描述性的断言消息
5. **适当清理**: 在测试后清理资源和数据

## 更新日志

### v1.0.0 (2024-01-19)
- ✅ 创建完整的集成测试套件
- ✅ 实现任务扫描调度测试
- ✅ 实现子任务生成测试
- ✅ 实现消息队列测试
- ✅ 实现任务监控测试
- ✅ 添加性能基准测试
- ✅ 配置CI/CD集成
- ✅ 完善文档和使用指南