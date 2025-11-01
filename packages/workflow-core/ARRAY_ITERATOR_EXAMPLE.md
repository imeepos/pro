# ArrayIteratorAst 使用指南

## 设计哲学

基于**迭代器模式**的优雅解决方案,用于处理数组长度无法提前预知的场景。

- **优雅即简约**: 零架构修改,完全兼容现有 workflow-core
- **存在即合理**: 只在真正需要时使用,避免过度设计
- **性能即艺术**: 流式处理,支持大数组场景

## 核心概念

`ArrayIteratorAst` 是一个有状态的迭代器节点:

```typescript
class ArrayIteratorAst {
  @Input() array: any[] = [];           // 输入: 待迭代的数组
  @Input() currentIndex: number = 0;    // 当前索引位置

  @Output() currentItem: any;           // 输出: 当前元素
  @Output() hasNext: boolean;           // 是否还有下一个元素
  @Output() isDone: boolean;            // 是否已完成迭代
}
```

## 使用场景

### 场景 1: 简单顺序处理

从 HtmlParserAst 输出的微博列表中,依次处理每条微博:

```typescript
import {
  ArrayIteratorAst,
  WorkflowGraphAst,
  createWorkflowGraphAst
} from '@pro/workflow-core';

// 1. 创建节点
const parser = new HtmlParserAst();
const iterator = new ArrayIteratorAst();
const processor = new WeiboProcessorAst();

// 2. 构建工作流
const workflow = createWorkflowGraphAst({
  name: 'weibo-processing',
  nodes: [parser, iterator, processor],
  edges: [
    // Parser 输出 result (数组) → Iterator 的 array 输入
    {
      from: parser.id,
      to: iterator.id,
      fromProperty: 'result',
      toProperty: 'array'
    },

    // Iterator 输出当前元素 → Processor 处理
    {
      from: iterator.id,
      to: processor.id,
      fromProperty: 'currentItem',
      toProperty: 'weibo'
    }
  ]
});
```

### 场景 2: 循环迭代 (关键模式)

使用**条件边**实现自动循环,直到数组迭代完成:

```typescript
const workflow = createWorkflowGraphAst({
  name: 'loop-iteration',
  nodes: [iterator, processor, endNode],
  edges: [
    // 1. Iterator → Processor: 传递当前元素
    {
      from: iterator.id,
      to: processor.id,
      fromProperty: 'currentItem',
      toProperty: 'item'
    },

    // 2. Processor → Iterator: 条件循环 (hasNext = true 时回到迭代器)
    {
      from: processor.id,
      to: iterator.id,
      condition: { property: 'hasNext', value: true }
    },

    // 3. Iterator → End: 完成条件 (isDone = true 时结束)
    {
      from: iterator.id,
      to: endNode.id,
      condition: { property: 'isDone', value: true }
    }
  ]
});

// 执行工作流
const result = await execute(workflow, {
  'iterator.array': ['item1', 'item2', 'item3']
});
```

**执行流程**:
```
1. Iterator 执行 → 输出 currentItem='item1', hasNext=true
2. → Processor 处理 'item1'
3. → 由于 hasNext=true,回到 Iterator (状态重置为 pending)
4. Iterator 再次执行 → 输出 currentItem='item2', hasNext=true
5. → Processor 处理 'item2'
6. → 回到 Iterator
7. Iterator 执行 → 输出 currentItem='item3', isDone=true
8. → Processor 处理 'item3'
9. → 由于 isDone=true,流向 EndNode
10. 工作流完成
```

### 场景 3: 微博分页爬取的完整示例

```typescript
import {
  ArrayIteratorAst,
  PlaywrightAst,
  HtmlParserAst,
  MqPublisherAst,
  createWorkflowGraphAst
} from '@pro/workflow-core';

// 节点定义
const crawler = new PlaywrightAst();
const parser = new HtmlParserAst();
const iterator = new ArrayIteratorAst();
const publisher = new MqPublisherAst();
const nextPageCheck = new PlaywrightAst(); // 检查是否有下一页

const workflow = createWorkflowGraphAst({
  name: 'weibo-pagination-crawler',
  nodes: [crawler, parser, iterator, publisher, nextPageCheck],
  edges: [
    // 1. 爬取页面
    { from: crawler.id, to: parser.id, fromProperty: 'html', toProperty: 'html' },

    // 2. 解析出微博列表
    { from: parser.id, to: iterator.id, fromProperty: 'result', toProperty: 'array' },

    // 3. 迭代每条微博
    { from: iterator.id, to: publisher.id, fromProperty: 'currentItem', toProperty: 'event' },

    // 4. 发布到消息队列后继续迭代
    {
      from: publisher.id,
      to: iterator.id,
      condition: { property: 'hasNext', value: true }
    },

    // 5. 当前页处理完成,检查下一页
    {
      from: iterator.id,
      to: nextPageCheck.id,
      condition: { property: 'isDone', value: true }
    },

    // 6. 如果有下一页,重新爬取
    {
      from: nextPageCheck.id,
      to: crawler.id,
      condition: { property: 'hasNextPage', value: true }
    }
  ]
});

// 执行
const result = await execute(workflow, {
  'crawler.url': 'https://weibo.com/search?q=关键词&page=1'
});
```

## 实现细节

### ArrayIteratorVisitor 执行逻辑

```typescript
async visit(ast: ArrayIteratorAst): Promise<ArrayIteratorAst> {
  const { array, currentIndex } = ast;

  // 边界检查
  if (!Array.isArray(array) || currentIndex >= array.length) {
    ast.state = 'success';
    ast.isDone = true;
    ast.hasNext = false;
    ast.currentItem = undefined;
    return ast;
  }

  // 迭代逻辑
  ast.currentItem = array[currentIndex];
  ast.hasNext = currentIndex + 1 < array.length;
  ast.isDone = currentIndex + 1 >= array.length;
  ast.currentIndex = currentIndex + 1;  // 自增索引
  ast.state = 'success';

  return ast;
}
```

**关键特性**:
- 每次执行自动递增 `currentIndex`
- 输出 `hasNext` 供条件边判断
- 输出 `isDone` 标记迭代完成
- 安全处理空数组和越界情况

## 最佳实践

### ✅ DO

1. **使用条件边实现循环**
   ```typescript
   {
     from: processor.id,
     to: iterator.id,
     condition: { property: 'hasNext', value: true }
   }
   ```

2. **明确结束条件**
   ```typescript
   {
     from: iterator.id,
     to: endNode.id,
     condition: { property: 'isDone', value: true }
   }
   ```

3. **从上游动态传入数组**
   ```typescript
   {
     from: parser.id,
     to: iterator.id,
     fromProperty: 'result',  // 运行时确定数组内容
     toProperty: 'array'
   }
   ```

### ❌ DON'T

1. **不要在同一个工作流中重复使用同一个迭代器实例**
   - 每个数组应该有独立的迭代器节点

2. **不要手动修改 `currentIndex`**
   - 让迭代器自动管理索引

3. **不要过度设计**
   - 如果数组长度已知且较小,直接使用索引边更简单

## 性能考虑

- **内存**: 迭代器本身不复制数组,只存储引用
- **时间**: 每次迭代 O(1) 复杂度
- **并发**: 如需并行处理数组元素,考虑使用子图展开模式 (未来实现)

## 测试

完整测试覆盖见 `src/__tests__/array-iterator.test.ts`:
- 基础迭代功能
- 与处理器组合
- 条件边循环
- 边界条件处理

运行测试:
```bash
pnpm --filter @pro/workflow-core run test -- array-iterator
```

## 总结

ArrayIteratorAst 提供了一个**极简优雅**的方案来处理动态长度数组:

- 零架构侵入
- 清晰的语义 (currentItem, hasNext, isDone)
- 配合条件边实现强大的循环能力
- 适用于 80% 的数组处理场景

**记住**: 不要过度设计!只在真正需要迭代未知长度数组时使用。
