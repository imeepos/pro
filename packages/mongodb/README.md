# @pro/mongodb

通用 MongoDB 原始数据存储工具库

## 功能

- 存储爬虫采集的原始 HTML/JSON 数据
- 内容去重（基于 SHA-256 哈希）
- 处理状态管理
- 数据清理工具

## 安装

```bash
pnpm add @pro/mongodb
```

## 使用

### 1. 导入模块

```typescript
import { MongodbModule } from '@pro/mongodb';

@Module({
  imports: [
    MongodbModule.forRoot('mongodb://localhost:27017/crawler_db'),
  ],
})
export class AppModule {}
```

### 2. 使用服务

```typescript
import { RawDataSourceService } from '@pro/mongodb';

@Injectable()
export class CrawlerService {
  constructor(private readonly rawDataService: RawDataSourceService) {}

  async saveRawData(url: string, content: string) {
    return this.rawDataService.create({
      sourceType: 'weibo_api_json',
      sourceUrl: url,
      rawContent: content,
      metadata: {
        weiboId: '123456',
        userId: '789',
      },
    });
  }

  async getPendingData() {
    return this.rawDataService.findPending();
  }

  async markCompleted(id: string) {
    return this.rawDataService.markCompleted(id);
  }
}
```

## API

### RawDataSourceService

- `create(data)` - 创建原始数据记录
- `findById(id)` - 查询单条记录
- `findPending()` - 查询待处理数据
- `markProcessing(id)` - 标记为处理中
- `markCompleted(id)` - 标记为已完成
- `markFailed(id, error)` - 标记为失败
- `deleteOldCompleted(days)` - 清理旧数据
- `getStatistics()` - 获取统计信息

## Schema

参考 `docs/mongodb.md` 查看完整的数据库设计文档。
