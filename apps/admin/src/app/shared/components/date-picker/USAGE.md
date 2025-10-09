# DatePickerComponent 时间选择功能使用指南

## 功能概述

DatePickerComponent 现在支持三种模式：
- `date`: 仅日期选择（原有功能）
- `time`: 仅时间选择（新增）
- `datetime`: 日期时间选择（新增）

## 使用示例

### 1. 基础日期选择（原有功能）
```html
<pro-date-picker
  placeholder="请选择日期"
  [mode]="'date'"
  [(ngModel)]="selectedDate"
></pro-date-picker>
```

### 2. 时间选择器
```html
<pro-date-picker
  placeholder="请选择时间"
  [mode]="'time'"
  [showSeconds]="true"
  [hour24Format]="true"
  [(ngModel)]="selectedDate"
  (timeChange)="onTimeChange($event)"
></pro-date-picker>
```

### 3. 日期时间选择器
```html
<pro-date-picker
  placeholder="请选择日期时间"
  [mode]="'datetime'"
  [showSeconds]="false"
  [hour24Format]="true"
  [showTimePresets]="true"
  [timeStep]="15"
  [(ngModel)]="selectedDateTime"
  (dateChange)="onDateChange($event)"
  (timeChange)="onTimeChange($event)"
></pro-date-picker>
```

### 4. 12小时制时间选择
```html
<pro-date-picker
  placeholder="请选择时间"
  [mode]="'time'"
  [hour24Format]="false"
  [(ngModel)]="selectedDate"
></pro-date-picker>
```

## 新增输入属性

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `mode` | `DatePickerMode` | `'date'` | 选择器模式：'date' \| 'time' \| 'datetime' |
| `showSeconds` | `boolean` | `false` | 是否显示秒数输入 |
| `hour24Format` | `boolean` | `true` | 是否使用24小时制 |
| `showTimePresets` | `boolean` | `true` | 是否显示时间预设选项 |
| `timeStep` | `number` | `1` | 分钟步长 |

## 新增输出事件

| 事件名 | 类型 | 描述 |
|--------|------|------|
| `timeChange` | `EventEmitter<TimeValue \| null>` | 时间变化时触发 |

## 类型定义

```typescript
export type DatePickerMode = 'date' | 'time' | 'datetime';
export type TimePreset = 'current' | 'workStart' | 'workEnd' | 'noon' | 'midnight';

export interface TimeValue {
  hours: number;
  minutes: number;
  seconds?: number;
}
```

## 时间预设选项

- `current`: 当前时间
- `workStart`: 上班时间 (09:00:00)
- `workEnd`: 下班时间 (18:00:00)
- `noon`: 中午 (12:00:00)
- `midnight`: 午夜 (00:00:00)

## 键盘导航支持

- `↑/↓`: 增加/减少时间值
- `Enter`: 确认输入
- `Tab`: 切换到下一个输入框
- `Escape`: 关闭面板

## 可访问性特性

- 完整的 ARIA 标签支持
- 键盘导航
- 焦点管理
- 高对比度模式支持
- 屏幕阅读器友好

## 响应式设计

- 移动端适配
- 触摸友好
- 自适应布局

## 注意事项

1. 在 `datetime` 模式下，时间选择器默认隐藏，需要点击"选择时间"按钮显示
2. `time` 模式下，日期部分会使用当前日期作为基准
3. 所有输入都支持直接输入和微调按钮操作
4. 支持多种输入格式的解析

## Flowbite 主题

时间选择器完全遵循 Flowbite 设计规范：
- 一致的颜色方案
- 平滑的过渡动画
- 悬停和焦点状态
- 暗色模式支持