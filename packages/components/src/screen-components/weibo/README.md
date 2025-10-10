# 微博登录用户统计组件

统一版本的微博登录用户统计组件，支持编辑模式和展示模式。

## 特性

- 🎨 **双模式支持**: 编辑模式（丰富功能）和展示模式（简洁设计）
- 🎯 **灵活配置**: 支持多种主题、动画效果、图标显示等
- 📊 **实时数据**: WebSocket实时更新和定时刷新
- 🎭 **丰富动画**: 平滑的过渡效果和微交互
- 📱 **响应式设计**: 自适应不同屏幕尺寸
- 🔧 **TypeScript支持**: 完整的类型定义

## 使用方法

### 基础使用

```typescript
import { Component } from '@angular/core';
import { WeiboLoggedInUsersCardComponent, WeiboUsersCardConfig } from '@pro/components';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [WeiboLoggedInUsersCardComponent],
  template: `
    <pro-weibo-logged-in-users-card [config]="config"></pro-weibo-logged-in-users-card>
  `
})
export class ExampleComponent {
  config: WeiboUsersCardConfig = {
    mode: 'display',
    title: '微博用户统计'
  };
}
```

### 编辑模式（丰富功能）

```typescript
const editConfig: WeiboUsersCardConfig = {
  mode: 'edit',
  title: '微博已登录用户统计',
  showTotal: true,
  showTodayNew: true,
  showOnline: true,
  theme: 'blue',
  refreshInterval: 30000,
  showIcons: true,
  enableAnimation: true,
  showErrorHandling: true,
  showTrends: true,
  showUpdateTime: true
};
```

### 展示模式（简洁设计）

```typescript
const displayConfig: WeiboUsersCardConfig = {
  mode: 'display',
  title: '微博用户统计'
};
```

## 配置选项

### WeiboUsersCardConfig

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| mode | 'edit' \| 'display' | 'display' | 组件模式 |
| title | string | '微博已登录用户统计' | 卡片标题 |
| showTotal | boolean | true | 显示总用户数 |
| showTodayNew | boolean | true | 显示今日新增 |
| showOnline | boolean | true | 显示在线用户 |
| theme | ThemeType | 'default' | 主题颜色 |
| refreshInterval | number | 30000 | 刷新间隔(ms) |
| showIcons | boolean | true | 显示图标 |
| enableAnimation | boolean | true | 启用动画 |
| showErrorHandling | boolean | true | 显示错误处理 |
| showTrends | boolean | true | 显示趋势信息 |
| showUpdateTime | boolean | true | 显示更新时间 |

### 主题类型

- `'default'`: 默认灰白主题
- `'blue'`: 蓝色主题
- `'green'`: 绿色主题
- `'purple'`: 紫色主题
- `'orange'`: 橙色主题

## 集成SDK

组件提供了`setSDK`方法用于集成真实的SDK实例：

```typescript
import { SkerSDK } from '@pro/sdk';

@Component({...})
export class ExampleComponent {
  @ViewChild(WeiboLoggedInUsersCardComponent)
  weiboComponent!: WeiboLoggedInUsersCardComponent;

  ngAfterViewInit() {
    // 设置真实的SDK实例
    this.weiboComponent.setSDK(new SkerSDK('your-api-token'));
  }
}
```

## 样式定制

组件使用Tailwind CSS，可以通过以下方式自定义样式：

```css
/* 自定义容器样式 */
pro-weibo-logged-in-users-card {
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* 自定义数值样式 */
.stat-value {
  font-family: 'Inter', sans-serif;
}
```

## 事件处理

组件实现了`IScreenComponent`接口：

```typescript
// 监听配置变化
onConfigChange(config: WeiboUsersCardConfig): void {
  console.log('配置已更新:', config);
}
```

## 依赖项

- Angular 15+
- RxJS
- Tailwind CSS
- socket.io-client (WebSocket支持)

## 注意事项

1. 组件需要在Angular Standalone Component环境中使用
2. 需要应用提供真实的SDK实例以获取数据
3. WebSocket服务需要正确配置连接地址
4. 在生产环境中建议配置适当的错误处理