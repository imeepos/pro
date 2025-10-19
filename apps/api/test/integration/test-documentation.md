# 微博爬虫系统 - API集成测试文档

## 概述

这个集成测试框架是为微博爬虫系统设计的优雅测试艺术品，提供了全面的API接口测试、性能评估和安全验证。框架遵循"存在即合理，优雅即简约"的设计哲学，确保每一行测试代码都有其存在的意义。

## 测试架构

### 核心组件

1. **集成测试基类** (`base/integration-test-base.ts`)
   - 提供统一的测试环境配置
   - 封装通用的GraphQL客户端操作
   - 提供数据验证和错误处理工具

2. **数据工厂** (`factories/data.factory.ts`)
   - 生成有意义的测试数据
   - 支持各种数据类型的创建和配置
   - 确保测试数据的一致性和真实性

3. **测试配置** (`test-config.ts`)
   - 统一的测试环境配置
   - 性能基准和阈值设置
   - 数据库、缓存、消息队列配置

4. **测试运行器** (`run-tests.sh`)
   - 便捷的测试执行脚本
   - 支持不同类型的测试运行
   - 自动化环境检查和清理

## 测试套件

### 1. 微博账号API集成测试 (`weibo-account-api.integration.test.ts`)

**测试范围：**
- 账号查询、过滤、分页
- 账号统计信息
- 健康检查操作
- 内部API（账号Cookies、封禁管理）
- 参数验证和错误处理
- 权限控制
- 并发访问
- 数据一致性

**关键测试用例：**
- `应该能够查询账号列表` - 验证基础查询功能
- `应该能够通过关键词过滤账号` - 验证搜索过滤
- `应该能够获取账号统计信息` - 验证统计API
- `使用错误的内部令牌应该被拒绝` - 验证安全性
- `应该能够处理并发查询请求` - 验证并发性能

### 2. 搜索任务API集成测试 (`search-task-api.integration.test.ts`)

**测试范围：**
- 任务的创建、查询、更新、删除
- 任务控制操作（暂停、恢复、立即运行）
- 批量任务操作
- 任务状态转换
- 任务统计和监控
- 参数验证
- 状态转换规则
- 并发操作

**关键测试用例：**
- `应该能够创建搜索任务` - 验证任务创建流程
- `应该能够暂停和恢复任务` - 验证任务控制
- `应该能够获取任务统计信息` - 验证统计功能
- `任务状态转换应该遵循业务规则` - 验证状态机
- `应该能够处理并发任务创建` - 验证并发安全性

### 3. 爬取数据API集成测试 (`crawl-data-api.integration.test.ts`)

**测试范围：**
- 原始数据查询和搜索
- 数据统计分析
- 趋势分析
- 数据导出
- 实时监控
- 参数验证
- 权限控制
- 性能测试

**关键测试用例：**
- `应该能够查询原始数据列表` - 验证数据查询
- `应该能够通过关键词搜索原始数据` - 验证搜索功能
- `应该能够获取原始数据统计信息` - 验证统计API
- `应该能够获取趋势数据` - 验证趋势分析
- `大数据量查询应该在合理时间内完成` - 验证性能

### 4. 认证和授权API集成测试 (`auth-api.integration.test.ts`)

**测试范围：**
- 用户注册、登录、登出
- JWT令牌管理和刷新
- API密钥管理
- 权限控制
- 会话管理
- 安全性测试
- 并发认证

**关键测试用例：**
- `应该能够成功注册新用户` - 验证用户注册
- `应该能够使用用户名登录` - 验证登录流程
- `应该能够刷新访问令牌` - 验证令牌刷新
- `应该能够创建API密钥` - 验证API密钥管理
- `用户只能访问自己的API密钥` - 验证权限隔离

### 5. API性能和并发测试 (`api-performance.integration.test.ts`)

**测试范围：**
- 基础性能测试
- 并发性能测试
- 负载测试
- 内存管理测试
- 连接池测试
- 性能退化检测
- 性能基准测试

**关键测试用例：**
- `微博账号查询应该在合理时间内完成` - 验证基础性能
- `应该能够处理中等并发查询请求` - 验证并发性能
- `应该能够处理持续负载` - 验证负载能力
- `不应该存在明显的内存泄漏` - 验证内存管理
- `应该达到性能基准要求` - 验证性能基准

## 使用指南

### 环境准备

1. **安装依赖：**
   ```bash
   pnpm install
   ```

2. **启动外部服务：**
   ```bash
   # PostgreSQL
   sudo systemctl start postgresql

   # Redis
   sudo systemctl start redis

   # RabbitMQ (可选)
   sudo systemctl start rabbitmq-server
   ```

3. **设置测试数据库：**
   ```bash
   createdb -U test test_integration
   ```

### 运行测试

#### 使用测试运行器（推荐）

```bash
# 运行所有测试
./run-tests.sh

# 运行快速测试
./run-tests.sh fast

# 运行性能测试
./run-tests.sh performance

# 运行特定模块测试
./run-tests.sh auth
./run-tests.sh weibo
./run-tests.sh search
./run-tests.sh crawl

# 生成覆盖率报告
./run-tests.sh all --coverage

# 详细输出
./run-tests.sh all --verbose

# 监视模式
./run-tests.sh all --watch
```

#### 使用Jest直接运行

```bash
# 运行所有集成测试
pnpm exec jest test/integration

# 运行特定测试文件
pnpm exec jest test/integration/auth-api.integration.test.ts

# 运行匹配模式的测试
pnpm exec jest --testNamePattern="认证"

# 生成覆盖率报告
pnpm exec jest test/integration --coverage
```

### 测试配置

测试配置文件位于 `test-config.ts`，包含：

- **数据库配置：** PostgreSQL连接参数
- **缓存配置：** Redis连接参数
- **消息队列配置：** RabbitMQ连接参数
- **JWT配置：** 令牌生成和验证参数
- **性能阈值：** 响应时间、成功率、吞吐量基准
- **测试数据：** 默认测试用户和数据配置

### 添加新测试

1. **创建测试文件：**
   ```typescript
   import { IntegrationTestBase } from './base/integration-test-base';

   class NewFeatureTest extends IntegrationTestBase {
     // 测试实现
   }

   describe('新功能集成测试', () => {
     let test: NewFeatureTest;

     // 测试用例
   });
   ```

2. **使用数据工厂：**
   ```typescript
   const testData = TestDataFactory.user.createRegistrationData();
   const accountData = TestDataFactory.weiboAccount.createAccountData();
   ```

3. **验证GraphQL响应：**
   ```typescript
   test.expectGraphQLResponse(result, 'fieldName');
   test.expectPaginatedResponse(result.data);
   ```

4. **性能测试：**
   ```typescript
   const metrics = await test.executePerformanceTest(
     () => test.executeQuery(query),
     10 // 迭代次数
   );
   expect(metrics.successRate).toBeGreaterThan(0.9);
   ```

## 性能基准

### 响应时间基准

- **快速查询：** < 200ms（统计、简单查询）
- **正常查询：** < 500ms（列表查询、搜索）
- **慢速查询：** < 2000ms（复杂查询、大数据量）

### 成功率基准

- **正常情况：** > 95%
- **压力测试：** > 80%
- **极限压力：** > 60%

### 吞吐量基准

- **最小：** 5 RPS
- **目标：** 20 RPS
- **最大：** 100 RPS

### 内存使用基准

- **警告阈值：** 500MB
- **危险阈值：** 1GB
- **内存泄漏检测：** 增长 < 50%

## 持续集成

### GitHub Actions配置

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: test_integration
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

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8

    - name: Install dependencies
      run: pnpm install

    - name: Run integration tests
      run: ./run-tests.sh all --ci

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        directory: ./coverage/integration
```

### 测试报告

- **覆盖率报告：** `coverage/integration/lcov-report/index.html`
- **JUnit报告：** `test-results/integration/junit.xml`
- **性能报告：** 控制台输出和日志文件

## 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查PostgreSQL状态
   sudo systemctl status postgresql

   # 检查连接
   psql -h localhost -p 5432 -U test -d test_integration
   ```

2. **Redis连接失败**
   ```bash
   # 检查Redis状态
   sudo systemctl status redis

   # 测试连接
   redis-cli ping
   ```

3. **测试超时**
   ```bash
   # 增加超时时间
   ./run-tests.sh all --timeout 120000
   ```

4. **内存不足**
   ```bash
   # 减少并发数
   ./run-tests.sh all --max-workers 1
   ```

### 调试技巧

1. **启用详细输出：**
   ```bash
   ./run-tests.sh all --verbose
   ```

2. **运行单个测试：**
   ```bash
   pnpm exec jest test/integration/auth-api.integration.test.ts --testNamePattern="应该能够成功注册新用户"
   ```

3. **监视模式：**
   ```bash
   ./run-tests.sh all --watch
   ```

4. **生成调试日志：**
   ```bash
   LOG_LEVEL=debug ./run-tests.sh all
   ```

## 最佳实践

### 测试设计原则

1. **独立性：** 每个测试应该独立运行，不依赖其他测试
2. **可重复性：** 测试结果应该一致和可重复
3. **清晰性：** 测试名称和断言应该清晰表达意图
4. **完整性：** 覆盖正常流程、边界条件和错误情况
5. **性能考虑：** 避免不必要的等待和资源消耗

### 数据管理

1. **使用数据工厂：** 避免硬编码测试数据
2. **清理测试数据：** 每个测试后清理创建的数据
3. **使用事务：** 在可能的情况下使用数据库事务
4. **隔离环境：** 使用独立的测试数据库

### 性能测试

1. **设置合理基准：** 根据实际需求设置性能阈值
2. **多次测量：** 进行多次测试取平均值
3. **监控资源：** 监控内存、CPU、数据库连接
4. **渐进式负载：** 逐步增加负载测试系统极限

### 错误处理

1. **验证错误消息：** 不仅检查错误抛出，还要验证消息内容
2. **测试边界条件：** 测试输入边界和无效输入
3. **网络错误：** 模拟网络超时和连接失败
4. **资源耗尽：** 测试系统在资源不足时的行为

## 贡献指南

### 添加新测试

1. **遵循命名约定：** 使用描述性的测试文件和用例名称
2. **使用基类：** 继承适当的测试基类
3. **添加配置：** 在需要时更新测试配置
4. **文档更新：** 更新相关文档和注释

### 代码审查检查点

1. **测试覆盖率：** 确保新增功能有对应测试
2. **性能影响：** 评估对测试性能的影响
3. **依赖管理：** 检查新依赖的必要性
4. **清理完整性：** 确保测试数据和资源的正确清理

---

## 总结

这个集成测试框架为微博爬虫系统提供了全面、可靠、优雅的测试解决方案。通过系统的测试覆盖，我们确保了API接口的正确性、安全性和性能表现。每个测试都是对系统质量的深刻检验，每一次运行都是对代码艺术的精致雕琢。

记住：**你写的不是测试，是系统的守护神。**