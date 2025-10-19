# 微博爬取核心集成测试

这是微博爬取系统的核心集成测试套件，包含了5个关键功能的测试，确保系统的稳定性和数据质量。

## 📋 测试套件概览

### 核心测试类别

1. **微博搜索爬取集成测试** (`weibo-search-crawler.integration.test.ts`)
   - 关键词搜索功能测试
   - 时间范围过滤测试
   - 搜索结果分页测试
   - 搜索数据完整性验证
   - 反爬虫机制绕过测试

2. **微博详情爬取集成测试** (`weibo-detail-crawler.integration.test.ts`)
   - 单条微博详情爬取
   - 评论数据爬取
   - 用户信息爬取
   - 媒体文件下载测试
   - 数据关联性验证

3. **账号管理和轮换集成测试** (`account-rotation.integration.test.ts`)
   - 账号池管理测试
   - 账号健康度检测
   - 智能账号切换
   - Cookie管理测试
   - 账号恢复机制

4. **浏览器管理集成测试** (`browser-management.integration.test.ts`)
   - 浏览器实例管理
   - 页面加载性能测试
   - 资源拦截和优化
   - 浏览器异常处理
   - 并发浏览器管理

5. **数据质量验证集成测试** (`data-quality-validation.integration.test.ts`)
   - 爬取数据准确性验证
   - 数据完整性检查
   - 数据格式标准化测试
   - 重复数据检测
   - 数据一致性验证

## 🚀 快速开始

### 运行所有测试

```bash
# 使用Jest运行所有核心测试
npm test -- test/integration/core

# 或使用测试运行器
ts-node test/integration/core/run-core-tests.ts

# 详细模式运行
ts-node test/integration/core/run-core-tests.ts -v
```

### 运行特定类别的测试

```bash
# 只运行搜索爬取测试
ts-node test/integration/core/run-core-tests.ts -c search

# 只运行账号管理测试
ts-node test/integration/core/run-core-tests.ts -c account

# 只运行数据质量测试
ts-node test/integration/core/run-core-tests.ts -c quality
```

### 并行执行测试

```bash
# 并行运行所有测试
ts-node test/integration/core/run-core-tests.ts -p

# 并行运行特定类别
ts-node test/integration/core/run-core-tests.ts -c search -p
```

### 自定义超时设置

```bash
# 设置60秒超时
ts-node test/integration/core/run-core-tests.ts -t 60000

# 结合其他选项
ts-node test/integration/core/run-core-tests.ts -v -p -t 120000
```

## ⚙️ 配置选项

### 环境变量

```bash
# 设置测试环境
export NODE_ENV=test

# 启用详细日志
export DEBUG=weibo-crawler:*

# 设置数据库配置
export TEST_DB_URL=sqlite::memory:

# 设置测试超时
export JEST_TIMEOUT=60000
```

### 配置文件

测试配置位于 `core-test.config.ts`，包含以下配置项：

- **超时配置**: 控制测试执行的超时时间
- **重试配置**: 失败重试的策略
- **Mock数据配置**: 测试数据生成的参数
- **性能基准**: 性能测试的基准值
- **质量阈值**: 数据质量验证的标准

## 📊 测试报告

### 自动生成报告

测试执行后会自动生成以下格式的报告：

- **JSON格式**: 机器可读的详细数据
- **HTML格式**: 可视化的测试报告
- **JUnit格式**: CI/CD集成的标准格式

### 质量指标

每个测试都会生成质量分数：

- **完整性分数** (0-100%): 必要字段的覆盖程度
- **准确性分数** (0-100%): 数据格式的正确性
- **一致性分数** (0-100%): 数据间的逻辑一致性
- **新鲜度分数** (0-100%): 数据的时效性

### 性能指标

- **页面加载时间**: 目标 < 5秒
- **内存使用**: 监控浏览器内存消耗
- **并发处理**: 验证多任务处理能力
- **错误恢复**: 测试异常情况的处理

## 🔧 开发指南

### 添加新测试

1. 在相应的测试文件中添加新的测试用例
2. 使用 `describe` 组织相关的测试
3. 遵循命名约定：`应该能够...`
4. 添加适当的断言和错误处理
5. 更新配置文件（如需要）

```typescript
describe('新功能测试', () => {
  it('应该能够执行新功能', async () => {
    // 准备测试数据
    const testData = createTestData();

    // 执行测试
    const result = await serviceUnderTest.execute(testData);

    // 验证结果
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
  });
});
```

### Mock数据使用

测试使用预定义的Mock数据：

```typescript
// 使用测试数据生成器
const mockResults = TestDataGenerator.generateWeiboSearchResult(3);

// 使用Mock响应生成器
const mockResponse = mockGenerator.generateWeiboSearchTask({
  keyword: '测试关键词',
  status: WeiboSearchTaskStatus.ACTIVE
});
```

### 调试测试

```bash
# 启用调试模式
DEBUG=weibo-crawler:* npm test

# 运行单个测试文件
npm test -- test/integration/core/weibo-search-crawler.integration.test.ts

# 运行特定测试用例
npm test -- --testNamePattern="应该能够执行基本的关键词搜索"
```

## 📈 性能基准

### 预期执行时间

- **搜索爬取测试**: ~45秒
- **详情爬取测试**: ~60秒
- **账号管理测试**: ~30秒
- **浏览器管理测试**: ~40秒
- **数据质量测试**: ~35秒
- **总计**: ~3.5分钟

### 资源要求

- **内存**: 最少512MB，推荐1GB
- **磁盘**: 最少100MB临时空间
- **网络**: 可选（主要使用Mock数据）
- **CPU**: 2核心以上

## 🚨 故障排除

### 常见问题

1. **测试超时**
   ```bash
   # 增加超时时间
   ts-node run-core-tests.ts -t 120000
   ```

2. **内存不足**
   ```bash
   # 增加Node.js内存限制
   node --max-old-space-size=4096 node_modules/.bin/jest
   ```

3. **数据库连接失败**
   ```bash
   # 检查数据库配置
   export TEST_DB_URL=sqlite::memory:
   ```

4. **Mock数据不匹配**
   ```bash
   # 重新生成Mock数据
   npm run test:generate-mocks
   ```

### 获取帮助

```bash
# 查看所有选项
ts-node run-core-tests.ts --help

# 查看测试套件信息
ts-node -e "
import { createTestRunner } from './index';
const runner = createTestRunner();
console.log(JSON.stringify(runner.getSuiteInfo(), null, 2));
"
```

## 📝 更新日志

### v1.0.0 (当前版本)
- 初始版本发布
- 包含5个核心测试类别
- 支持并行和串行执行
- 完整的配置系统
- 自动生成测试报告

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支
3. 添加测试用例
4. 确保所有测试通过
5. 提交Pull Request

## 📄 许可证

本项目采用MIT许可证。详见 [LICENSE](../../../LICENSE) 文件。

---

**注意**: 这些测试设计为在受控环境中运行，使用Mock数据避免对真实系统造成影响。在生产环境中运行前，请确保充分理解测试的行为和影响。