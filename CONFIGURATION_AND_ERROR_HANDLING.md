# 配置化系统与错误处理机制

## 概述

本实现基于代码艺术家哲学，将配置和错误管理视为数字时代的文化遗产，每个配置项和错误类型都有其存在的必要性和优雅的表达。

## 核心理念

### 存在即合理 (Existence Implies Necessity)
- 每个配置项都有明确的用途和合理的默认值
- 分层的配置管理，支持环境差异化
- 完整的错误分类和处理策略

### 优雅即简约 (Elegance is Simplicity)
- 清晰的配置结构，避免配置冗余
- 统一的错误处理中间件
- 自描述的错误信息和恢复建议

### 性能即艺术 (Performance is Art)
- 配置热更新能力，避免重启服务
- 智能的错误恢复策略，最小化服务中断
- 性能导向的默认配置值

### 错误处理如哲学 (Error Handling as Philosophy)
- 将每个错误视为系统改进的机会
- 优雅的错误传播和上下文保持
- 详细的错误追踪和分析能力

## 功能特性

### 配置管理 (`@pro/configuration`)

#### 1. 分层配置系统
```typescript
interface ConfigurationDomain {
  cache: CacheConfiguration;      // 缓存配置
  batch: BatchConfiguration;      // 批量处理配置
  retry: RetryConfiguration;      // 重试配置
  monitoring: MonitoringConfiguration; // 监控配置
  timeWindow: TimeWindowConfiguration; // 时间窗口配置
  resilience: ResilienceConfiguration; // 韧性配置
}
```

#### 2. 配置提供者
- **环境变量提供者**: 从环境变量读取配置
- **文件提供者**: 从配置文件读取
- **运行时提供者**: 动态配置覆盖

#### 3. 配置验证
- 类型验证（数字、字符串、枚举等）
- 范围验证（最小值、最大值）
- 业务规则验证（内存大小格式等）

#### 4. 动态更新
- 配置热更新，无需重启服务
- 配置变更监听和回调
- 配置版本管理和回滚

### 错误处理 (`@pro/error-handling`)

#### 1. 错误分类系统
- **按严重程度**: LOW, MEDIUM, HIGH, CRITICAL
- **按分类**: INFRASTRUCTURE, BUSINESS, VALIDATION, EXTERNAL, SECURITY, PERFORMANCE
- **按领域**: DATABASE, CACHE, NETWORK, AUTHENTICATION, etc.

#### 2. 智能错误恢复
- 数据库连接失败自动重试
- 缓存故障降级到数据库
- 网络超时指数退避重试
- 认证失败安全事件记录

#### 3. 错误模式分析
- 错误指纹识别相似错误
- 错误频率和趋势分析
- 自动告警和建议

#### 4. 错误追踪
- 完整的错误上下文信息
- 错误传播链路追踪
- 错误恢复执行记录

## 使用指南

### 1. 在NestJS应用中集成

```typescript
// app.module.ts
import { ConfigurationModule } from '@pro/configuration';
import { ErrorHandlingModule } from '@pro/error-handling';

@Module({
  imports: [
    ConfigurationModule,  // 全局配置服务
    ErrorHandlingModule,  // 全局错误处理
    // ... 其他模块
  ],
})
export class AppModule {}
```

### 2. 使用配置服务

```typescript
// service.ts
import { ConfigurationService } from '@pro/configuration';

@Injectable()
export class YourService {
  constructor(private readonly config: ConfigurationService) {}

  async someMethod() {
    // 获取配置值
    const cacheRealTimeTtl = this.config.get('cache.ttl.realtime');
    const batchSize = this.config.get('batch.processing.default');

    // 监听配置变化
    this.config.watch('cache.ttl.realtime', (newValue, oldValue) => {
      console.log(`缓存TTL已更新: ${oldValue} -> ${newValue}`);
    });
  }
}
```

### 3. 使用错误处理

```typescript
// service.ts
import { ErrorHandlerService } from '@pro/error-handling';

@Injectable()
export class YourService {
  constructor(private readonly errorHandler: ErrorHandlerService) {}

  async riskyOperation() {
    try {
      // 危险操作
      await this.databaseOperation();
    } catch (error) {
      // 统一错误处理
      const enhancedError = await this.errorHandler.handle(error, {
        code: 'DATABASE_OPERATION_FAILED',
        context: {
          operation: 'user-data-query',
          userId: 'user123',
        },
      });
      throw enhancedError;
    }
  }
}
```

### 4. 环境配置示例

```bash
# 缓存TTL配置 (秒)
CACHE_TTL_REALTIME=300
CACHE_TTL_HOURLY=7200
CACHE_TTL_DAILY=86400

# 重试配置
RETRY_MAX_ATTEMPTS_DATABASE=3
RETRY_BACKOFF_TYPE=exponential
RETRY_BACKOFF_BASE_DELAY_MS=1000

# 监控配置
MONITORING_THRESHOLD_CPU=80
MONITORING_THRESHOLD_MEMORY=85
MONITORING_ALERT_ERROR_RATE=5
```

## 配置项说明

### 缓存配置
- `CACHE_TTL_*`: 各层缓存过期时间（秒）
- `CACHE_MAX_MEMORY`: 最大内存使用量
- `CACHE_EVICTION_POLICY`: 缓存淘汰策略

### 批量处理配置
- `BATCH_PROCESSING_*`: 不同场景的批处理大小
- `BATCH_TRANSACTION_*`: 事务批次大小
- `BATCH_QUEUE_*`: 队列消费者/发布者配置

### 重试配置
- `RETRY_MAX_ATTEMPTS_*`: 各场景最大重试次数
- `RETRY_BACKOFF_*`: 退避策略配置
- `RETRY_TIMEOUT_*`: 各场景超时时间

### 监控配置
- `MONITORING_THRESHOLD_*`: 各种监控阈值
- `MONITORING_HEALTH_CHECK_*`: 健康检查配置
- `MONITORING_ALERT_*`: 告警阈值

### 韧性配置
- `RESILIENCE_CIRCUIT_BREAKER_*`: 熔断器配置
- `RESILIENCE_BULKHEAD_*`: 舱壁隔离配置
- `RESILIENCE_RATE_LIMIT_*`: 限流配置

## 最佳实践

### 1. 配置管理
- 使用环境变量进行配置外部化
- 为每个配置项提供合理的默认值
- 使用配置验证确保系统稳定性
- 监听关键配置变化并做相应调整

### 2. 错误处理
- 根据错误类型选择合适的恢复策略
- 记录错误上下文信息用于问题分析
- 监控错误模式并主动优化
- 定期审查错误恢复效果

### 3. 性能优化
- 根据业务需求调整批处理大小
- 合理设置缓存TTL平衡性能和一致性
- 监控系统指标并动态调整配置
- 使用熔断器和限流保护系统稳定性

## 监控和维护

### 错误指标
- 错误率和错误分布
- 恢复成功率
- 错误响应时间
- 错误模式趋势

### 配置指标
- 配置更新频率
- 配置验证失败率
- 热更新成功率
- 配置回滚次数

### 告警策略
- 错误率超过阈值时告警
- 关键配置变更时通知
- 系统资源使用超限时预警
- 服务健康检查失败时告警

## 扩展指南

### 1. 添加新的配置类型
```typescript
// 在 types/index.ts 中扩展 ConfigurationDomain
interface ConfigurationDomain {
  // ... 现有配置
  newFeature: NewFeatureConfiguration;
}

interface NewFeatureConfiguration {
  enabled: boolean;
  threshold: number;
  // ... 其他配置
}
```

### 2. 添加新的错误分类器
```typescript
export class CustomErrorClassifier implements ErrorClassifier {
  readonly name = 'custom';
  readonly priority = 95;

  classify(error: Error): Partial<ErrorDetails> | null {
    // 自定义分类逻辑
    return null;
  }
}

// 注册分类器
const errorHandler = new ErrorHandlerService(logger);
errorHandler.classification.addClassifier(new CustomErrorClassifier());
```

### 3. 添加新的恢复策略
```typescript
const customStrategy = RecoveryStrategyBuilder.create()
  .withName('custom-recovery')
  .withDescription('自定义恢复策略')
  .addRetryAction({
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffType: 'exponential',
    jitterFactor: 0.2,
  })
  .forDomain(ErrorDomain.CUSTOM)
  .build();

// 注册策略
recoveryRegistry.register(customStrategy);
```

---

这套配置和错误处理系统将为您的应用程序提供企业级的稳定性和可维护性，同时保持代码的优雅和简洁。每个组件都经过精心设计，确保系统在面对任何挑战时都能优雅应对。