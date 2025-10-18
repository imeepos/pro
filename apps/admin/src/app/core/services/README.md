# Raw Data Service

基于 GraphQL 代码生成的 Raw Data 服务，提供完整的类型安全 API 接口。

## 使用方式

```typescript
import { RawDataService } from '@core/services';

@Component({
  // ...
})
export class MyComponent {
  constructor(private rawDataService: RawDataService) {}

  async loadData() {
    // 获取原始数据列表
    const list = await this.rawDataService.getRawDataList({
      status: 'PENDING',
      page: 1,
      pageSize: 20
    });

    // 获取统计信息
    const stats = await this.rawDataService.getRawDataStatistics();

    // 搜索数据
    const searchResults = await this.rawDataService.searchRawData(
      'keyword',
      1,
      10
    );
  }
}
```

## 特性

- ✅ 完整的 TypeScript 类型支持
- ✅ 基于生成的 GraphQL 类型定义
- ✅ 优雅的错误处理
- ✅ Fragment 复用减少代码重复
- ✅ 符合代码艺术家的设计理念

## 生成命令

```bash
pnpm run codegen
```