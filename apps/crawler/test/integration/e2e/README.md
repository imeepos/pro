# 微博爬虫系统端到端测试

这是微博爬虫系统的端到端测试套件，用于验证从任务创建到数据入库的完整业务流程。这些测试确保整个系统的协同工作能力，保证数据的准确性、完整性和系统的稳定性。

## 🎯 测试目标

端到端测试的主要目标是：

- **完整性验证**：确保从任务创建到数据存储的完整流程正常工作
- **数据质量保证**：验证数据在各个阶段的准确性和完整性
- **系统稳定性**：测试系统在各种异常情况下的恢复能力
- **性能验证**：确保系统在高负载下的性能表现
- **业务逻辑正确性**：验证业务规则的正确执行

## 📋 测试套件概览

### 1. 历史数据回溯端到端测试 (`historical-data-backfill.test.ts`)

验证完整的历史数据处理链路，包括：
- 大量历史数据的批量处理
- 任务进度跟踪和状态更新
- 分片处理和并行执行
- 数据质量验证和异常处理

**关键测试场景：**
- 完整历史数据回溯流程
- 大规模数据批量回溯
- 任务进度跟踪机制
- 分片处理和协调
- 数据质量保证

### 2. 实时数据监控端到端测试 (`real-time-data-monitoring.test.ts`)

验证增量数据的实时处理能力，包括：
- 增量数据的及时发现和捕获
- 定时任务的触发机制
- 实时数据处理管道
- 重复数据的检测和处理

**关键测试场景：**
- 增量数据发现流程
- 高频率数据流处理
- 自适应数据流处理
- 定时任务调度
- 实时数据处理管道
- 数据重复检测

### 3. 多账号并发爬取端到端测试 (`multi-account-concurrent-crawling.test.ts`)

验证多账号协同工作的能力，包括：
- 账号池管理
- 智能任务分配
- 并行爬取执行
- 账号切换机制

**关键测试场景：**
- 账号池状态管理
- 任务智能分配
- 负载均衡机制
- 并行爬取协调
- 账号异常处理
- 资源冲突避免

### 4. 异常恢复端到端测试 (`exception-recovery.test.ts`)

验证系统的韧性和故障恢复能力，包括：
- 网络中断恢复
- 账号封禁处理
- 数据库故障恢复
- 系统资源耗尽处理

**关键测试场景：**
- 网络中断检测和恢复
- 账号封禁检测和切换
- 数据库故障处理
- 服务依赖故障恢复
- 系统资源管理
- 级联故障处理

### 5. 数据质量保证端到端测试 (`data-quality-assurance.test.ts`)

验证数据质量保证机制，包括：
- 数据采集质量验证
- 数据清洗和标准化
- 异常数据检测和修复
- 数据一致性验证

**关键测试场景：**
- 数据采集质量验证
- 数据清洗准确性
- 数据标准化处理
- 异常数据识别和修复
- 数据一致性检查
- 质量监控和告警

## 🏗️ 架构设计

### 测试基础设施

```
┌─────────────────────────────────────────────────────────────┐
│                    端到端测试框架                           │
├─────────────────────────────────────────────────────────────┤
│  E2EBusinessFlowTestBase                                   │
│  ├── TestEnvironmentManager (环境管理)                      │
│  ├── FlowMonitor (流程监控)                                 │
│  ├── MessageTracker (消息跟踪)                              │
│  └── DataFlowValidator (数据流验证)                         │
├─────────────────────────────────────────────────────────────┤
│                    Docker测试环境                           │
│  ├── PostgreSQL (业务数据)                                  │
│  ├── Redis (缓存)                                          │
│  ├── RabbitMQ (消息队列)                                   │
│  ├── MongoDB (原始数据)                                     │
│  ├── MinIO (对象存储)                                       │
│  └── Elasticsearch (搜索引擎)                               │
├─────────────────────────────────────────────────────────────┤
│                    Mock服务                                │
│  ├── MockWeiboService (模拟微博API)                        │
│  ├── NetworkSimulator (网络模拟)                           │
│  └── FaultInjector (故障注入)                              │
└─────────────────────────────────────────────────────────────┘
```

### 数据流验证

```
任务创建 → Broker调度 → Crawler爬取 → 数据清洗 → 质量检测 → 数据存储
    ↓           ↓           ↓           ↓           ↓           ↓
  消息验证    调度验证    爬取验证    清洗验证    质量验证    存储验证
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- Docker >= 20
- Docker Compose >= 2

### 安装依赖

```bash
# 在项目根目录
pnpm install

# 在crawler目录
cd apps/crawler
pnpm install
```

### 运行测试

#### 1. 运行所有测试套件

```bash
./run-e2e-tests.sh
```

#### 2. 运行特定测试套件

```bash
# 运行历史数据回溯测试
./run-e2e-tests.sh -s historical-data-backfill

# 运行实时数据监控测试
./run-e2e-tests.sh -s real-time-data-monitoring

# 运行多账号并发测试
./run-e2e-tests.sh -s multi-account-concurrent-crawling

# 运行异常恢复测试
./run-e2e-tests.sh -s exception-recovery

# 运行数据质量保证测试
./run-e2e-tests.sh -s data-quality-assurance
```

#### 3. 生成测试报告

```bash
# 生成覆盖率报告和详细测试报告
./run-e2e-tests.sh -c -r

# 报告将生成在 test/integration/e2e/reports/ 目录
```

#### 4. 高级选项

```bash
# 详细输出
./run-e2e-tests.sh -v

# 设置超时时间（10分钟）
./run-e2e-tests.sh -t 600000

# 设置并行度
./run-e2e-tests.sh -p 8

# 保留测试容器
./run-e2e-tests.sh -k

# 重新构建Docker镜像
./run-e2e-tests.sh -b

# 仅显示将要执行的命令
./run-e2e-tests.sh --dry-run
```

### 清理环境

```bash
# 清理测试环境和容器
./run-e2e-tests.sh --clean
```

## 📊 测试报告

测试执行完成后，会在 `test/integration/e2e/reports/` 目录下生成以下报告：

- `comprehensive-report.md` - 综合测试报告
- `{suite-name}-results.json` - 详细的测试结果
- `{suite-name}-summary.md` - 测试套件摘要
- `logs/` - 失败时的详细日志

### 报告解读

#### 综合报告示例

```markdown
# 微博爬虫系统端到端测试综合报告

## 执行概要
- 生成时间: 2024-01-20 14:30:00
- 总测试套件: 5
- 并行度: 4
- 超时设置: 600000ms

## 测试套件执行结果

### historical-data-backfill
- 状态: 通过
- 耗时: 245s
- 数据准确性: 98.5%
- 处理记录数: 10,000

### real-time-data-monitoring
- 状态: 通过
- 耗时: 180s
- 数据延迟: < 30s
- 发现记录数: 500
```

## 🔧 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `TEST_DB_HOST` | localhost | 测试数据库主机 |
| `TEST_DB_PORT` | 5433 | 测试数据库端口 |
| `TEST_DB_USER` | test | 测试数据库用户名 |
| `TEST_DB_PASSWORD` | test | 测试数据库密码 |
| `TEST_DB_NAME` | weibo_crawler_e2e | 测试数据库名 |
| `TEST_REDIS_HOST` | localhost | 测试Redis主机 |
| `TEST_REDIS_PORT` | 6380 | 测试Redis端口 |
| `TEST_RABBITMQ_URL` | amqp://test:test@localhost:5673/ | 测试RabbitMQ URL |
| `TEST_MONGODB_URI` | mongodb://test:test@localhost:27018 | 测试MongoDB URI |
| `TEST_MINIO_ENDPOINT` | localhost | 测试MinIO端点 |
| `TEST_MINIO_PORT` | 9001 | 测试MinIO端口 |

### Docker配置

测试环境使用 `docker-compose.e2e.yml` 配置文件，包含以下服务：

- **PostgreSQL**: 业务数据存储
- **Redis**: 缓存和会话存储
- **RabbitMQ**: 消息队列
- **MongoDB**: 原始数据存储
- **MinIO**: 对象存储
- **Elasticsearch**: 搜索引擎
- **MockWeiboService**: 模拟微博API服务

## 🧪 测试设计原则

### 1. 真实性原则
- 使用真实的Docker环境
- 模拟真实的业务场景
- 使用真实的网络延迟和故障

### 2. 独立性原则
- 每个测试套件独立运行
- 测试之间不共享状态
- 自动清理测试数据

### 3. 可重复性原则
- 测试结果可重复
- 确定性的测试数据
- 稳定的Mock服务

### 4. 完整性原则
- 覆盖完整的业务流程
- 验证数据的端到端流转
- 检查系统状态的一致性

## 🔍 故障排查

### 常见问题

#### 1. Docker服务启动失败

```bash
# 检查Docker服务状态
docker ps
docker-compose -f docker-compose.e2e.yml ps

# 查看服务日志
docker-compose -f docker-compose.e2e.yml logs postgres
docker-compose -f docker-compose.e2e.yml logs redis
```

#### 2. 测试超时

```bash
# 增加超时时间
./run-e2e-tests.sh -t 1200000

# 减少并行度
./run-e2e-tests.sh -p 2
```

#### 3. 端口冲突

```bash
# 检查端口占用
netstat -tulpn | grep 5433
netstat -tulpn | grep 6380

# 修改docker-compose.yml中的端口映射
```

#### 4. 内存不足

```bash
# 增加Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 减少并行度
./run-e2e-tests.sh -p 1
```

### 调试技巧

#### 1. 启用详细日志

```bash
./run-e2e-tests.sh -v
```

#### 2. 保留测试容器

```bash
./run-e2e-tests.sh -k

# 测试完成后手动调试
docker exec -it weibo_crawler_e2e_postgres psql -U test -d weibo_crawler_e2e
docker exec -it weibo_crawler_e2e_redis redis-cli
```

#### 3. 查看测试覆盖率

```bash
./run-e2e-tests.sh -c

# 查看覆盖率报告
open test/integration/e2e/coverage/lcov-report/index.html
```

## 📈 性能基准

### 预期性能指标

| 测试套件 | 预期耗时 | 数据处理量 | 成功率 |
|----------|----------|------------|--------|
| 历史数据回溯 | < 5分钟 | 10,000条 | > 95% |
| 实时数据监控 | < 3分钟 | 1,000条 | > 98% |
| 多账号并发爬取 | < 4分钟 | 5,000条 | > 90% |
| 异常恢复 | < 6分钟 | 8,000条 | > 95% |
| 数据质量保证 | < 3分钟 | 2,000条 | > 99% |

### 性能优化建议

1. **增加并行度**: 适当增加 `--parallel` 参数
2. **优化网络**: 使用本地网络减少延迟
3. **内存配置**: 增加 Node.js 内存限制
4. **Docker优化**: 使用SSD存储，增加Docker内存

## 🤝 贡献指南

### 添加新的测试套件

1. 创建测试文件：`test/integration/e2e/new-suite.test.ts`
2. 继承 `E2EBusinessFlowTestBase` 基类
3. 实现必要的测试流程
4. 更新 `run-e2e-tests.sh` 中的测试套件列表
5. 添加相应的文档

### 测试编写规范

```typescript
describe('新测试套件', () => {
  let testSuite: NewTestSuiteE2ETest;

  beforeAll(async () => {
    testSuite = new NewTestSuiteE2ETest();
    await testSuite.beforeAll();
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  beforeEach(async () => {
    await testSuite.beforeEach();
  });

  afterEach(async () => {
    await testSuite.afterEach();
  });

  describe('主要功能', () => {
    it('应该能够正常工作', async () => {
      const flow = testSuite.createTestFlow();
      await testSuite.executeE2EFlow(flow);

      const result = await testSuite.validateTestResults(flow);
      expect(result.isValid).toBe(true);
    }, 300000);
  });
});
```

## 📝 更新日志

### v1.0.0 (2024-01-20)
- 初始版本发布
- 包含5个核心测试套件
- 完整的Docker测试环境
- 自动化测试运行脚本

---

## 📞 支持

如果您在运行测试时遇到问题，请：

1. 查看本文档的故障排查部分
2. 检查测试日志文件
3. 提交Issue到项目仓库
4. 联系开发团队

**记住**：端到端测试是确保系统质量的重要环节，建议在每次部署前都运行完整的测试套件。