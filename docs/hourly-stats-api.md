# 小时统计API使用指南

## 概述

本文档介绍了如何使用微博模块的小时统计API，支持按小时维度的数据统计和曲线图展示。

## API接口

### 1. 获取小时统计数据

```graphql
query GetHourlyStats {
  weiboHourlyStats(
    type: "task_execution"
    startDate: "2024-01-01T00:00:00Z"
    endDate: "2024-01-07T23:59:59Z"
    timezone: "Asia/Shanghai"
    interval: "hour"
  ) {
    timeRange {
      start
      end
      timezone
    }
    data {
      hour
      count
      percentage
      trend
    }
    summary {
      total
      average
      peak {
        hour
        count
      }
      growth
    }
  }
}
```

### 2. 获取多类型统计数据

```graphql
query GetMultiTypeStats {
  weiboMultiTypeHourlyStats(
    types: ["task_execution", "message_processing", "performance"]
    startDate: "2024-01-01T00:00:00Z"
    endDate: "2024-01-07T23:59:59Z"
    timezone: "Asia/Shanghai"
  ) {
    task_execution {
      data {
        hour
        count
        trend
      }
      summary {
        total
        peak {
          hour
          count
        }
      }
    }
    message_processing {
      data {
        hour
        count
        percentage
      }
      summary {
        total
        average
      }
    }
  }
}
```

### 3. 获取聚合统计数据

```graphql
query GetAggregatedStats {
  weiboAggregatedStats(
    type: "task_execution"
    startDate: "2024-01-01T00:00:00Z"
    endDate: "2024-01-31T23:59:59Z"
    interval: "day"
    timezone: "Asia/Shanghai"
  ) {
    timeRange {
      start
      end
    }
    data {
      hour
      count
      percentage
      trend
    }
    summary {
      total
      average
      peak {
        hour
        count
      }
      growth
    }
  }
}
```

### 4. 批量记录统计数据

```graphql
mutation RecordBatchStats {
  recordBatchHourlyStats(
    records: [
      {
        type: "task_execution"
        timestamp: "2024-01-01T14:00:00Z"
        count: 5
        metadata: {
          result: "success"
          processingTime: 150
        }
      },
      {
        type: "message_processing"
        timestamp: "2024-01-01T14:00:00Z"
        count: 3
        metadata: {
          result: "failure"
        }
      }
    ]
  )
}
```

### 5. 清理过期统计数据

```graphql
mutation CleanupExpiredStats {
  cleanupExpiredStats
}
```

## 统计类型

### 可用的统计类型：

- `task_execution` - 任务执行统计
- `message_processing` - 消息处理统计
- `performance` - 性能统计
- `user_activity` - 用户活跃度

### 聚合间隔：

- `hour` - 按小时聚合（默认）
- `day` - 按天聚合
- `week` - 按周聚合
- `month` - 按月聚合

## 响应数据结构

### HourlyStatsResponse

```typescript
interface HourlyStatsResponse {
  timeRange: {
    start: string;      // ISO 8601格式开始时间
    end: string;        // ISO 8601格式结束时间
    timezone: string;   // 时区标识
  };
  data: Array<{
    hour: string;        // 时间点 ISO 8601格式
    count: number;       // 统计数量
    percentage?: number; // 占比(0-100)
    trend?: 'up' | 'down' | 'stable'; // 趋势
  }>;
  summary: {
    total: number;       // 总数
    average: number;     // 平均值
    peak: {              // 峰值
      hour: string;
      count: number;
    };
    growth?: number;     // 增长率百分比
  };
}
```

## 使用场景

### 1. 监控仪表盘

获取最近24小时的任务执行统计，用于实时监控：

```graphql
query DashboardStats {
  weiboHourlyStats(
    type: "task_execution"
    startDate: "{{24小时前}}"
    endDate: "{{现在}}"
    interval: "hour"
  ) {
    data {
      hour
      count
      trend
    }
    summary {
      total
      peak {
        hour
        count
      }
    }
  }
}
```

### 2. 性能分析

分析最近7天的处理性能趋势：

```graphql
query PerformanceAnalysis {
  weiboAggregatedStats(
    type: "performance"
    startDate: "{{7天前}}"
    endDate: "{{现在}}"
    interval: "day"
  ) {
    data {
      hour
      count
      trend
    }
    summary {
      total
      average
      growth
    }
  }
}
```

### 3. 错误率监控

监控失败率趋势：

```graphql
query ErrorRateMonitoring {
  weiboMultiTypeHourlyStats(
    types: ["task_execution", "message_processing"]
    startDate: "{{24小时前}}"
    endDate: "{{现在}}"
  ) {
    task_execution {
      data {
        hour
        count
      }
    }
    message_processing {
      data {
        hour
        count
      }
    }
  }
}
```

## 前端集成示例

### React + Apollo Client

```tsx
import { gql, useQuery } from '@apollo/client';

const HOURLY_STATS_QUERY = gql`
  query GetHourlyStats($type: String!, $startDate: DateTime!, $endDate: DateTime!) {
    weiboHourlyStats(type: $type, startDate: $startDate, endDate: $endDate) {
      timeRange {
        start
        end
      }
      data {
        hour
        count
        percentage
        trend
      }
      summary {
        total
        average
        peak {
          hour
          count
        }
        growth
      }
    }
  }
`;

function StatsChart({ type }: { type: string }) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24小时前

  const { data, loading, error } = useQuery(HOURLY_STATS_QUERY, {
    variables: {
      type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const chartData = data?.weiboHourlyStats?.data || [];

  return (
    <div>
      <h3>{type} 统计</h3>
      {/* 渲染图表组件 */}
      <Chart data={chartData} />
      <div>
        <p>总计: {data?.weiboHourlyStats?.summary?.total}</p>
        <p>平均: {data?.weiboHourlyStats?.summary?.average}</p>
        <p>峰值: {data?.weiboHourlyStats?.summary?.peak?.count}</p>
      </div>
    </div>
  );
}
```

## 数据存储

### Redis键结构

统计数据使用Redis的Sorted Set结构存储：

```
weibo:hourly:stats:{type}:{yyyy-MM-dd}
```

例如：
- `weibo:hourly:stats:task_execution:2024-01-15`
- `weibo:hourly:stats:message_processing:2024-01-15`

### 过期策略

- 最近24小时：TTL 1小时
- 最近7天：TTL 6小时
- 历史数据：TTL 24小时

### 性能优化

- 使用Pipeline批量写入
- 按天分片存储，提高查询效率
- 自动清理过期数据
- 支持多维度查询和聚合

## 注意事项

1. **查询限制**：单次查询最多支持365天的数据
2. **时区处理**：建议统一使用ISO 8601格式，后端会自动处理时区转换
3. **数据精度**：统计数据为近似值，可能存在轻微延迟
4. **缓存策略**：热点数据会自动缓存，提高查询性能
5. **权限控制**：部分统计数据可能需要特定权限访问