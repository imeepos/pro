# 高德地图 API Key 配置

## 概述

项目的高德地图组件现已支持从环境变量读取 API Key，替代了之前的硬编码方式。

## 配置步骤

### 1. 设置环境变量

在 `.env` 文件中添加高德地图 API Key：

```bash
AMAP_API_KEY=your-amap-api-key-here
```

### 2. 获取 API Key

1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册并创建应用
3. 在应用管理中获取 Web 服务 API Key

## 技术实现

### ConfigService

创建了统一的环境变量管理服务：

- `getAmapApiKey()`: 获取高德地图 API Key
- `hasValidAmapKey()`: 验证 API Key 是否有效

### 组件更新

- `AmapViewerComponent`: 移除 amapKey @Input()，自动从环境变量读取
- `AmapPickerComponent`: 移除 amapKey @Input()，自动从环境变量读取

### 错误处理

组件会在初始化时检查 API Key 的有效性：
- 如果未配置或使用了默认值，会抛出明确的错误信息
- 错误信息包含配置提示，便于开发者快速定位问题

## 使用方式

组件的使用方式保持不变，无需修改模板中的使用方式：

```html
<app-amap-viewer
  [longitude]="event.longitude"
  [latitude]="event.latitude"
  [title]="event.eventName"
></app-amap-viewer>

<app-amap-picker
  [longitude]="eventForm.get('longitude')?.value"
  [latitude]="eventForm.get('latitude')?.value"
  [city]="eventForm.get('city')?.value"
  (locationPick)="onLocationPick($event)"
></app-amap-picker>
```

## 注意事项

1. 确保 `.env` 文件中的 `AMAP_API_KEY` 是有效的
2. 生产环境需要配置相应的环境变量
3. API Key 应具有适当的权限以支持地图显示和地理编码功能