# Canvas 错误处理和重试机制使用指南

## 概述

CanvasService 已经集成了完善的错误处理和重试机制，为用户提供流畅的编辑体验，即使在网络不稳定的情况下也能保证数据的安全性。

## 核心功能

### 1. 自动重试机制
- **最大重试次数**: 3次
- **重试延迟**: 指数退避策略（1秒、2秒、4秒）
- **智能重试**: 仅对可重试的错误进行重试

### 2. 错误分类
- **网络错误**: 连接失败、网络超时
- **服务器错误**: 5xx 错误码
- **权限错误**: 401、403 错误码
- **未知错误**: 其他类型的错误

### 3. 网络状态监听
- 实时监听网络连接状态
- 网络恢复后自动重试未保存的数据
- 网络断开时提示用户

### 4. 用户友好的错误提示
- 根据错误类型提供相应的提示信息
- 显示重试次数和重试状态
- 提供手动重试和强制保存选项

## 使用方法

### 基础使用

```typescript
// 组件中注入 CanvasService
constructor(private canvasService: CanvasService) {}

// 初始化页面
ngOnInit() {
  this.canvasService.initPage('page-123');
}

// 触发保存
saveCanvas() {
  this.canvasService.triggerImmediateSave('新页面名称');
}
```

### 监听状态变化

```typescript
// 使用 CanvasQuery 监听状态
constructor(
  private canvasService: CanvasService,
  private canvasQuery: CanvasQuery
) {}

ngOnInit() {
  // 监听保存状态
  this.canvasQuery.saveStatus$.subscribe(status => {
    console.log('保存状态:', status);
  });

  // 监听错误信息
  this.canvasQuery.userFriendlyErrorMessage$.subscribe(message => {
    if (message) {
      console.error('错误信息:', message);
    }
  });

  // 监听网络状态
  this.canvasQuery.isOnline$.subscribe(isOnline => {
    console.log('网络状态:', isOnline ? '在线' : '离线');
  });
}
```

### 手动重试和强制保存

```typescript
// 检查是否可以重试
if (this.canvasService.canRetry()) {
  this.canvasService.manualRetrySave();
}

// 强制保存（忽略错误）
this.canvasService.forceSave();
```

### 获取错误信息

```typescript
// 获取当前错误状态
const error = this.canvasService.getErrorState();
if (error) {
  console.log('错误类型:', error.type);
  console.log('错误消息:', error.message);
  console.log('是否可重试:', error.retryable);
}

// 获取用户友好的错误提示
const friendlyMessage = this.canvasService.getUserFriendlyErrorMessage();
console.log(friendlyMessage);

// 获取重试次数
const retryCount = this.canvasService.getRetryCount();
console.log('重试次数:', retryCount);
```

## 状态说明

### 保存状态 (saveStatus)
- **saved**: 已保存
- **saving**: 保存中
- **unsaved**: 未保存
- **error**: 保存失败
- **retrying**: 正在重试

### 网络状态 (networkStatus)
- **online**: 在线
- **offline**: 离线
- **checking**: 检查中

### 错误类型 (error.type)
- **network**: 网络错误
- **server**: 服务器错误
- **permission**: 权限错误
- **timeout**: 超时错误
- **unknown**: 未知错误

## UI 组件集成

### 使用 CanvasErrorHandlerComponent

```html
<!-- 在你的模板中添加错误处理组件 -->
<app-canvas-error-handler></app-canvas-error-handler>
```

### 自定义错误提示

```typescript
export class MyCanvasComponent {
  showError$ = this.canvasQuery.showSaveError$;
  errorMessage$ = this.canvasQuery.userFriendlyErrorMessage$;
  canRetry$ = this.canvasQuery.canRetry$;
  isRetrying$ = this.canvasQuery.isRetrying$;

  constructor(
    private canvasService: CanvasService,
    private canvasQuery: CanvasQuery
  ) {}

  retrySave(): void {
    this.canvasService.manualRetrySave();
  }

  forceSave(): void {
    if (confirm('强制保存可能会忽略某些错误，确定要继续吗？')) {
      this.canvasService.forceSave();
    }
  }
}
```

## 最佳实践

### 1. 错误处理
- 不要直接抛出错误，让 CanvasService 处理
- 使用用户友好的消息提示
- 提供清晰的恢复选项

### 2. 网络状态
- 在网络不可用时禁用相关操作
- 提供网络状态指示器
- 网络恢复时自动重试

### 3. 用户体验
- 显示保存状态和进度
- 提供手动重试选项
- 避免频繁的错误提示

### 4. 性能优化
- 合理设置防抖时间（默认2.5秒）
- 避免不必要的保存操作
- 使用批量更新减少API调用

## 故障排除

### 常见问题

1. **保存一直失败**
   - 检查网络连接
   - 查看错误消息确定具体原因
   - 尝试强制保存

2. **重试次数过多**
   - 检查网络稳定性
   - 考虑使用强制保存
   - 联系管理员检查服务器状态

3. **权限错误**
   - 重新登录
   - 检查用户权限
   - 联系管理员

### 调试技巧

```typescript
// 启用详细日志
console.log('保存状态:', this.canvasService.getSaveStatus());
console.log('错误信息:', this.canvasService.getErrorState());
console.log('网络状态:', this.canvasService.getNetworkStatus());
console.log('重试次数:', this.canvasService.getRetryCount());
```

## 示例代码

完整的使用示例请参考 `CanvasErrorHandlerComponent` 组件的实现。