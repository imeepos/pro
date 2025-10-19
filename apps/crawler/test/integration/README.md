# 微博爬虫系统集成测试框架

一个优雅、强大、易用的集成测试框架，专为微博爬虫系统设计，提供完整的测试基础设施。

## 核心特性

- 🏗️ **环境管理**: 自动化的Docker测试环境启动和清理
- 🏭 **数据工厂**: 逼真的测试数据生成，支持自定义和批量创建
- 🛠️ **工具集合**: 数据库清理、时间控制、断言扩展、Mock生成
- 🧪 **测试基类**: 统一的测试生命周期管理和基础设施
- ⏰ **时间控制**: 精确的时间控制能力，支持时间旅行和冻结
- 🔄 **异步断言**: 强大的异步断言能力，支持重试和超时

## 快速开始

### 1. 基本使用

```typescript
import { BaseIntegrationTest } from '../base-integration-test.js';
import { WeiboAccountStatus } from '@pro/types';

class MyTest extends BaseIntegrationTest {
  async testExample() {
    // 创建测试数据
    const account = await this.factory.createWeiboAccount({
      status: WeiboAccountStatus.ACTIVE,
      save: true
    });

    // 执行测试逻辑
    const result = await this.someService.processAccount(account.id);

    // 验证结果
    expect(result.success).toBe(true);

    // 验证数据库状态
    await this.assertDatabaseState({
      weibo_accounts: 1
    });
  }
}
```

### 2. 使用装饰器

```typescript
import { integrationTest, BaseIntegrationTest } from '../index.js';

@integrationTest({
  database: {
    host: 'custom-host',
    port: 5433
  }
})
class CustomConfigTest extends BaseIntegrationTest {
  // 测试代码
}
```

### 3. 时间控制

```typescript
// 冻结时间
this.freezeTime(new Date('2024-01-01T00:00:00Z'));

// 时间旅行
this.travelTo(new Date('2024-12-31T23:59:59Z'));
this.travelBy(24 * 60 * 60 * 1000); // 前进24小时

// 解冻时间
this.unfreezeTime();
```

### 4. 异步断言

```typescript
// 等待条件满足
await this.utils.assertions.eventuallyMatch(
  async () => await this.getAccountCount(),
  5,
  5000 // 5秒超时
);

// 等待元素存在
await this.utils.assertions.eventuallyExist(
  async () => await this.getAccountById(1)
);

// 等待Promise解析
await this.utils.assertions.eventuallyResolve(somePromise);
```

## 核心组件

### TestEnvironmentManager

负责测试环境的生命周期管理：

```typescript
const environment = new TestEnvironmentManager(config);
await environment.initialize(); // 启动环境
await environment.cleanup();   // 清理环境
```

### WeiboTestDataFactory

创建逼真的测试数据：

```typescript
// 创建单个账号
const account = await factory.createWeiboAccount({
  status: WeiboAccountStatus.ACTIVE,
  withCookies: true,
  save: true
});

// 批量创建任务
const tasks = await factory.createWeiboSearchTasks(10, {
  enabled: true,
  withLocation: true
});

// 创建原始数据
const rawData = factory.createRawWeiboData({
  text: '包含关键词的内容'
});
```

### TestUtils

统一的工具集合：

```typescript
const utils = new TestUtils(database);

// 数据库清理
await utils.cleanup.resetDatabase();
await utils.cleanup.cleanupTable('weibo_accounts');

// 时间控制
utils.time.freeze();
utils.time.travelTo(new Date());
utils.time.setSpeed(2); // 2倍速

// 断言扩展
await utils.assertions.eventuallyMatch(actual, expected);
await utils.assertions.eventuallyCondition(() => someCondition());

// Mock生成
const mockData = utils.mocks.generateWeiboAccount();
const response = utils.mocks.generateApiResponse(data);
```

## 测试配置

### 默认配置

```typescript
const defaultConfig = {
  docker: {
    enabled: true,
    composeFile: 'docker-compose.test.yml',
    services: ['postgres', 'redis', 'rabbitmq', 'mongodb', 'minio']
  },
  database: {
    host: 'localhost',
    port: 5432,
    username: 'test',
    password: 'test',
    database: 'weibo_crawler_test'
  },
  redis: {
    host: 'localhost',
    port: 6379,
    db: 1
  },
  rabbitmq: {
    url: 'amqp://localhost:5672'
  },
  mongodb: {
    uri: 'mongodb://localhost:27017',
    database: 'weibo_raw_test'
  },
  minio: {
    endpoint: 'localhost',
    port: 9000,
    accessKey: 'test',
    secretKey: 'testtest'
  }
};
```

### 环境变量

支持通过环境变量覆盖配置：

```bash
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USER=test
TEST_DB_PASSWORD=test
TEST_DB_NAME=weibo_crawler_test

TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
TEST_REDIS_DB=1

TEST_RABBITMQ_URL=amqp://localhost:5672

TEST_MONGODB_URI=mongodb://localhost:27017
TEST_MONGODB_NAME=weibo_raw_test

TEST_MINIO_ENDPOINT=localhost
TEST_MINIO_PORT=9000
TEST_MINIO_ACCESS_KEY=test
TEST_MINIO_SECRET_KEY=testtest
```

## 最佳实践

### 1. 测试隔离

每个测试都应该在干净的环境中运行：

```typescript
beforeEach(async () => {
  await this.utils.cleanup.resetDatabase();
  this.utils.time.reset();
});
```

### 2. 测试数据工厂

优先使用数据工厂创建测试数据：

```typescript
// ✅ 好的做法
const account = await this.factory.createWeiboAccount({
  status: WeiboAccountStatus.ACTIVE
});

// ❌ 避免硬编码
const account = {
  id: 1,
  weiboUid: '1234567890',
  status: 'active'
};
```

### 3. 异步操作

使用异步断言处理异步操作：

```typescript
// ✅ 好的做法
await this.utils.assertions.eventuallyMatch(
  async () => await this.getJobStatus(jobId),
  'completed'
);

// ❌ 避免固定等待
await this.sleep(5000);
const status = await this.getJobStatus(jobId);
expect(status).toBe('completed');
```

### 4. 时间测试

对于时间相关的测试，使用时间控制：

```typescript
// ✅ 好的做法
this.freezeTime(new Date('2024-01-01T00:00:00Z'));
const result = await this.processScheduledTask();
expect(result.processedDate).toEqual(new Date('2024-01-01T00:00:00Z'));
this.unfreezeTime();

// ❌ 避免依赖真实时间
const result = await this.processScheduledTask();
expect(result.processedDate).toBeCloseToNow();
```

## 示例测试

查看 `examples/` 目录中的完整测试示例：

- `weibo-account-service.test.ts` - 微博账号服务测试
- `weibo-search-task.test.ts` - 搜索任务测试
- `data-flow.test.ts` - 数据流测试

## 故障排除

### Docker服务启动失败

确保Docker和Docker Compose已安装：

```bash
docker --version
docker-compose --version
```

### 数据库连接失败

检查数据库服务是否正常运行：

```bash
docker-compose ps
docker-compose logs postgres
```

### 端口冲突

修改配置或停止冲突的服务：

```typescript
const config = {
  database: {
    port: 5433  // 使用不同端口
  }
};
```

## 贡献

欢迎提交Issue和Pull Request来改进这个测试框架。

## 许可证

本项目采用MIT许可证。