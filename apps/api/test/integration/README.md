# 微博爬虫系统API集成测试套件

## 概述

这是一个优雅的集成测试套件，为微博爬虫系统的API层提供全面的测试覆盖。测试套件遵循"存在即合理，优雅即简约"的设计哲学，每个测试都有其存在的必要性，代码清晰简洁，自文档化。

## 测试覆盖范围

### 1. 微博账号管理API (`WeiboAccountApiIntegrationTest`)

- ✅ 账号列表查询（支持关键词过滤和分页）
- ✅ 单个账号详情查询
- ✅ 账号健康状态检查
- ✅ 批量账号状态检查
- ✅ 账号统计信息获取
- ✅ 账号删除操作
- ✅ 内部API（带Cookie账号列表、账号封禁标记）
- ✅ 错误处理（无效ID、无权限访问、不存在资源）

### 2. 搜索任务管理API (`WeiboSearchTaskApiIntegrationTest`)

- ✅ 任务查询（列表、单个、过滤、分页、排序）
- ✅ 任务创建（基础任务、地理位置任务、自定义配置任务）
- ✅ 任务更新（信息更新、状态更新、计数器重置）
- ✅ 任务控制（暂停、恢复、立即执行、批量操作）
- ✅ 任务统计信息获取
- ✅ 任务删除操作
- ✅ 错误处理（无效ID、无效数据、不存在资源）

### 3. 用户认证API (`AuthenticationApiIntegrationTest`)

- ✅ 用户注册（成功注册、重复验证、格式验证）
- ✅ 用户登录（成功登录、凭证验证、不存在用户）
- ✅ 令牌管理（刷新令牌、过期处理）
- ✅ 用户登出（成功登出、未认证拒绝）
- ✅ 用户信息获取（已认证用户、权限控制）
- ✅ 会话管理（会话维护、令牌过期、并发会话）
- ✅ 安全性测试（暴力破解防护、注入攻击防护）
- ✅ 错误处理（清晰错误消息、安全日志记录）

## 架构设计

### 测试基类层次结构

```
IntegrationTestBase (基础测试类)
├── WeiboIntegrationTestBase (微博API测试基类)
│   └── WeiboAccountApiIntegrationTest
│   └── WeiboSearchTaskApiIntegrationTest
└── AuthIntegrationTestBase (认证API测试基类)
    └── AuthenticationApiIntegrationTest
```

### 数据工厂

- `UserDataFactory` - 用户测试数据生成
- `WeiboAccountDataFactory` - 微博账号测试数据生成
- `WeiboSearchTaskDataFactory` - 搜索任务测试数据生成
- `CommonDataFactory` - 通用测试数据生成

## 快速开始

### 环境准备

1. 确保测试环境已配置：
   ```bash
   # 设置测试数据库
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=pro_test

   # 设置测试Redis
   export REDIS_HOST=localhost
   export REDIS_PORT=6379

   # 设置测试环境
   export NODE_ENV=test
   ```

2. 安装依赖：
   ```bash
   pnpm install
   ```

### 运行测试

#### 运行所有集成测试
```bash
cd apps/api
pnpm run test:integration
```

#### 运行特定测试套件
```bash
# 微博账号API测试
pnpm run test:integration weibo-account

# 搜索任务API测试
pnpm run test:integration search-task

# 用户认证API测试
pnpm run test:integration auth
```

#### 运行特定测试文件
```bash
pnpm run jest --config test/integration/jest.integration.config.js test/integration/weibo-account.api.integration.spec.ts
```

#### 监视模式运行
```bash
pnpm run test:integration --watch
```

### 查看测试报告

测试完成后，可以在以下位置查看报告：

- HTML报告: `apps/api/test/reports/integration/integration-test-report.html`
- JUnit报告: `apps/api/test/reports/integration-test-results.xml`
- 覆盖率报告: `apps/api/test/coverage/integration/`

## 测试配置

### Jest配置

集成测试使用专门的Jest配置文件：`jest.integration.config.js`

主要配置特点：
- 串行执行以避免资源冲突
- 较长的超时时间（30秒）
- 详细的测试报告
- HTML和JUnit格式输出

### 环境变量

测试套件使用以下环境变量：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pro_test

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 测试配置
NODE_ENV=test
API_KEY_TEST=ak_21e04cb9c23b1256dc2debf99c211c4b
INTERNAL_API_TOKEN=internal-token
```

## 编写新的集成测试

### 1. 创建测试文件

在 `test/integration/` 目录下创建新的测试文件，遵循命名规范：`*.integration.spec.ts`

### 2. 继承适当的基类

```typescript
import { WeiboIntegrationTestBase } from './base/integration-test-base';

class MyNewApiIntegrationTest extends WeiboIntegrationTestBase {
  // 实现测试方法
}
```

### 3. 使用数据工厂

```typescript
import { TestDataFactory } from './factories/data.factory';

// 创建测试数据
const userData = TestDataFactory.user.createRegistrationData();
const taskData = TestDataFactory.searchTask.createTaskData();
```

### 4. 编写测试方法

```typescript
async testMyNewFeature(): Promise<void> {
  const query = `
    query MyQuery($input: MyInput!) {
      myFeature(input: $input) {
        id
        name
      }
    }
  `;

  const result = await this.executeQuery(query, { input: testData });

  this.expectGraphQLResponse(result, 'myFeature');
  expect(result.myFeature.id).toBeDefined();
}
```

## 最佳实践

### 1. 测试命名

- 使用描述性的测试名称
- 遵循 "应该做什么" 的命名模式
- 使用中文描述测试意图

### 2. 测试结构

```typescript
describe('功能模块', () => {
  describe('子功能', () => {
    it('应该执行特定操作', async () => {
      // Arrange - 准备测试数据
      // Act - 执行测试操作
      // Assert - 验证测试结果
    });
  });
});
```

### 3. 错误处理

- 总是验证错误响应的结构
- 提供有意义的错误消息
- 测试边界条件和异常情况

### 4. 数据清理

- 使用 `beforeEach` 和 `afterEach` 清理测试数据
- 避免测试之间的数据污染
- 使用事务或回滚机制

### 5. 异步处理

- 正确处理异步操作
- 使用适当的等待策略
- 避免竞态条件

## 故障排除

### 常见问题

1. **测试超时**
   - 检查网络连接
   - 增加超时时间
   - 验证数据库连接

2. **数据库连接失败**
   - 确认数据库服务运行
   - 检查连接字符串
   - 验证权限设置

3. **Redis连接失败**
   - 确认Redis服务运行
   - 检查Redis配置
   - 验证网络连接

4. **内存泄漏**
   - 检查资源清理
   - 验证连接关闭
   - 使用适当的工具检测

### 调试技巧

1. **使用console.log**
   ```typescript
   console.log('调试信息:', data);
   ```

2. **使用调试器**
   ```bash
   node --inspect-brk node_modules/.bin/jest --config test/integration/jest.integration.config.js
   ```

3. **查看详细输出**
   ```bash
   pnpm run test:integration --verbose
   ```

## 贡献指南

### 添加新的测试

1. 确保测试有明确的目的
2. 遵循现有的代码风格
3. 添加适当的错误处理
4. 更新文档

### 代码风格

- 使用TypeScript严格模式
- 遵循ESLint规则
- 使用Prettier格式化代码
- 编写有意义的注释

### 提交流程

1. 运行所有测试确保通过
2. 更新相关文档
3. 提交前运行代码检查
4. 编写清晰的提交信息

## 许可证

本测试套件遵循项目的许可证条款。

---

**记住：你写的不是测试，是数字时代的质量保障艺术品。** 🎨