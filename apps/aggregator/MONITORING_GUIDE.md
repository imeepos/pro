# 统计分析系统监控指南

## 监控系统概览

本监控系统是按照**代码艺术家**的理念设计的数字时代艺术品，每个指标都有其不可替代的存在价值。

### 核心理念

- **存在即合理**：每个指标都有明确的业务价值
- **优雅即简约**：自描述的指标命名和分层收集体系
- **性能即艺术**：监控系统本身不成为性能瓶颈
- **错误处理如哲学**：监控故障不影响业务逻辑

## 架构组成

### 核心服务

1. **MetricsService** - 统一指标收集服务
2. **PrometheusAdapterService** - Prometheus 格式输出
3. **HealthCheckService** - 健康检查和服务发现
4. **AlertManagerService** - 实时告警机制
5. **MonitoringInitializerService** - 初始化和配置

### 装饰器系统

- `@PerformanceMonitor` - 通用性能监控
- `@CacheMonitor` - 缓存操作监控
- `@DatabaseMonitor` - 数据库操作监控
- `@BusinessMonitor` - 业务逻辑监控
- `@ApiMonitor` - API 响应监控

## 使用示例

### 1. 基础性能监控

```typescript
import { BusinessMonitor } from '../decorators/performance-monitor.decorator';

@Injectable()
export class MyService {
  @BusinessMonitor('data_processing')
  async processData(data: any[]): Promise<void> {
    // 自动记录处理时间、成功率、错误率
    // 处理逻辑...
  }
}
```

### 2. 缓存操作监控

```typescript
@CacheMonitor('user_cache')
async getUserFromCache(userId: string): Promise<User | null> {
  // 自动记录缓存命中率、响应时间
  return this.cacheService.get(`user:${userId}`);
}
```

### 3. 数据库查询监控

```typescript
@DatabaseMonitor('complex_query', {
  histogramBuckets: [10, 50, 100, 500, 1000, 5000],
})
async complexQuery(params: QueryParams): Promise<ResultSet> {
  // 自动记录查询执行时间分布
  return this.repository.find(params);
}
```

### 4. API 端点监控

```typescript
@Controller('stats')
export class StatsController {
  @Get('aggregated/:keyword')
  @ApiMonitor('get_aggregated_stats')
  async getAggregatedStats(@Param('keyword') keyword: string) {
    // 自动记录 API 响应时间、错误率
    return this.statsService.getAggregated(keyword);
  }
}
```

## 监控端点

### 健康检查

- `GET /health` - 基础健康状态
- `GET /health/detailed` - 详细健康信息
- `GET /health/:component` - 特定组件检查
- `GET /alive` - 活跃度检查
- `GET /ready` - 就绪状态检查

### 指标查询

- `GET /metrics` - Prometheus 格式指标
- `GET /metrics/summary` - 指标摘要
- `GET /metrics/raw` - 原始指标数据
- `GET /metrics/snapshot` - 当前快照
- `GET /metrics/:metricName` - 特定指标时间序列

### 服务信息

- `GET /info` - 服务信息和运行状态

## 关键指标说明

### 聚合性能指标

- `aggregation_duration` - 聚合处理耗时分布
- `aggregation_throughput` - 数据处理吞吐量 (TPS)
- `query_response_time` - 滑动窗口查询响应时间
- `cache_hit_rate` - 缓存命中率分层统计

### 业务指标

- `message_consumption_rate` - 消息消费速率
- `message_queue_depth` - 消息积压量
- `data_accuracy_score` - 数据准确性验证
- `duplicate_message_ratio` - 重复消息处理比率
- `recovery_success_rate` - 错误恢复成功率

### 系统资源指标

- `db_connection_utilization` - 数据库连接池使用率
- `redis_memory_usage` - Redis 内存使用情况
- `transaction_execution_time` - 事务执行时间分布
- `system_memory_*` - 内存使用指标
- `system_cpu_*` - CPU 使用指标

### 用户体验指标

- `api_response_time` - API 响应时间分布 (P50/P95/P99)
- `concurrent_requests` - 并发请求处理能力
- `system_availability` - 系统可用性 (SLA)
- `data_freshness` - 数据新鲜度
- `error_rate` - 错误率

## 告警规则

系统默认配置了以下告警规则：

1. **缓存命中率过低** - 警告: 70%, 严重: 50%
2. **API响应时间过长** - 警告: 1000ms, 严重: 3000ms
3. **内存使用率过高** - 警告: 512MB, 严重: 768MB
4. **消息队列积压** - 警告: 1000, 严重: 5000
5. **数据准确性下降** - 警告: 0.95, 严重: 0.9

## 配置示例

### 自定义告警规则

```typescript
// 在服务中注入 AlertManagerService
constructor(private alertManager: AlertManagerService) {}

// 创建自定义告警规则
async setupCustomAlerts() {
  this.alertManager.createRule({
    name: '自定义业务指标告警',
    description: '当核心业务指标异常时触发',
    category: MetricCategory.BUSINESS,
    enabled: true,
    threshold: {
      metricName: 'business_critical_metric',
      warning: 80,
      critical: 95,
      unit: '%',
      comparison: 'gt',
    },
    cooldownMs: 300000,
    escalationLevels: [
      {
        level: 0,
        delayMs: 0,
        channels: [{ type: 'log', config: {}, enabled: true }],
        condition: 'consecutive',
        count: 2,
      },
    ],
  });
}
```

### 自定义指标

```typescript
// 在服务中注入 MetricsService
constructor(private metricsService: MetricsService) {}

// 创建自定义指标
async setupCustomMetrics() {
  this.metricsService.createTimeSeries(
    'custom_business_metric',
    MetricType.GAUGE,
    MetricCategory.BUSINESS,
    'count',
    '自定义业务指标 - 描述其业务价值'
  );
}

// 记录指标值
recordBusinessEvent(value: number, context: any) {
  this.metricsService.setGauge(
    'custom_business_metric',
    value,
    {
      service: 'my-service',
      operation: 'business-process',
      context: JSON.stringify(context)
    }
  );
}
```

## 最佳实践

### 1. 指标命名规范

- 使用下划线分隔单词
- 包含业务含义和技术含义
- 避免过长的名称，但要自描述

### 2. 监控粒度

- 核心业务流程：必须监控
- 重要技术组件：应该监控
- 辅助功能：可选监控

### 3. 告警设计

- 设置合理的阈值
- 配置适当的冷却期
- 避免告警风暴

### 4. 性能考虑

- 使用异步指标收集
- 控制指标采样率
- 定期清理过期数据

## 故障排查

### 常见问题

1. **指标不更新**
   - 检查 MetricsService 是否正常启动
   - 验证指标名称拼写
   - 确认装饰器配置正确

2. **告警不触发**
   - 检查阈值配置
   - 验证告警规则启用状态
   - 查看冷却期设置

3. **性能影响**
   - 检查指标收集频率
   - 验证采样策略
   - 监控监控系统本身的性能

### 调试模式

启用详细日志来调试监控系统：

```bash
export LOG_LEVEL=debug
export NODE_ENV=development
```

## 扩展指南

### 添加新的监控装饰器

```typescript
export function CustomMonitor(
  operation: string,
  options: MonitorOptions = {},
): MethodDecorator {
  return PerformanceMonitor(
    `custom_${operation}`,
    {
      ...options,
      category: MetricCategory.BUSINESS,
      unit: 'count',
      dimensions: {
        operation,
        ...options.dimensions,
      },
    },
  );
}
```

### 集成外部监控系统

监控系统提供了标准的 Prometheus 指标输出，可以轻松集成到以下系统：

- Grafana 仪表板
- Prometheus 监控
- Kubernetes 监控
- 云服务监控平台

---

**记住：你创造的不是代码，而是数字时代的文化遗产，是艺术品。让每一个指标都承载着系统心跳的意义。**