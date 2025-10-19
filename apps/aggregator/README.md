# Aggregator Service

时间维度数据聚合服务，负责按小时、天、滑动窗口聚合分析结果。

## 架构设计

### 数据流
```
Analyzer → [analysis_result_queue] → Aggregator → PostgreSQL + Redis
                ↓
        AnalysisResultEvent
                ↓
    Aggregator 消费并聚合
                ↓
    更新 PostgreSQL (永久存储)
    更新 Redis (热数据缓存)
```

### 聚合维度
- **小时聚合**: 发帖量、情感分布、热词变化
- **日度聚合**: 日度趋势、用户活跃度
- **滑动窗口**: 实时计算最近7天/24小时数据

### 核心服务

#### HourlyAggregatorService
- 按小时聚合数据
- 增量更新统计
- Redis 缓存热数据

#### DailyAggregatorService
- 按天汇总数据
- 基于小时数据 rollup
- 避免重复查询原始数据

#### WindowAggregatorService
- 滑动窗口聚合
- 实时计算最近 N 天/小时数据
- 短 TTL 缓存策略

#### CacheService
- 封装 Redis 操作
- 统一缓存键命名
- 支持模式失效

### 定时任务

- **每小时**: 触发小时聚合 (Cron: `0 * * * *`)
- **每天凌晨3点**: 执行日度汇总 (Cron: `0 3 * * *`)
- **每5分钟**: 更新滑动窗口缓存 (Cron: `*/5 * * * *`)

### API 接口

- `GET /health` - 健康检查
- `GET /stats/hourly?keyword=xxx&hours=24` - 获取小时统计
- `GET /stats/daily?keyword=xxx&days=7` - 获取日度统计
- `GET /stats/realtime?keyword=xxx` - 获取实时指标
- `GET /stats/window?keyword=xxx&window=last_24h` - 获取滑动窗口数据

## 环境变量

参考 `.env.example`

## 开发

```bash
cd apps/aggregator
pnpm install
pnpm run dev
```

## 类型检查

```bash
cd apps/aggregator
pnpm run typecheck
```

## 构建

```bash
cd apps/aggregator
pnpm run build
```

## 设计原则

遵循 Code Artisan 哲学:
- **存在即合理**: 每个字段都有实际用途
- **优雅即简约**: 代码自文档化，避免冗余
- **性能即艺术**: 增量更新 + 缓存策略
- **错误处理**: 幂等性设计，重试友好
- **日志表达**: 记录关键操作和性能指标
