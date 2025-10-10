# DateTimePicker 组件

专门用于日期时间选择的 Angular 组件，提供简洁的 API 和优化的用户体验。

## 特性

- 🎯 **专门设计**：专注于日期时间组合选择场景
- 📱 **响应式布局**：日期和时间面板并排显示，移动端自动切换为垂直布局
- 🎨 **Flowbite 设计**：基于 Flowbite 3.1.2 设计系统
- ⏰ **完整时间功能**：支持 12/24 小时制、秒数显示、快捷时间预设
- 🚀 **简洁 API**：简化的输入属性，易于使用
- ♿ **可访问性**：完整的键盘导航和屏幕阅读器支持
- 🌙 **暗色模式**：内置暗色模式支持

## 基本用法

```typescript
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateTimePickerComponent } from '@pro/shared/components';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [FormsModule, DateTimePickerComponent],
  template: `
    <form>
      <pro-date-time-picker
        [(ngModel)]="selectedDateTime"
        name="dateTime"
        placeholder="请选择日期时间"
        (dateChange)="onDateChange($event)">
      </pro-date-time-picker>
    </form>
  `
})
export class ExampleComponent {
  selectedDateTime: Date | null = new Date();

  onDateChange(date: Date | null) {
    console.log('选中的日期时间:', date);
  }
}
```

## API 参考

### 输入属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `placeholder` | `string` | `'请选择日期时间'` | 输入框占位符 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `required` | `boolean` | `false` | 是否必填 |
| `readonly` | `boolean` | `false` | 是否只读 |
| `minDate` | `Date` | - | 最小可选日期 |
| `maxDate` | `Date` | - | 最大可选日期 |
| `showSeconds` | `boolean` | `false` | 是否显示秒数输入 |
| `hour24Format` | `boolean` | `true` | 是否使用 24 小时制 |
| `timeStep` | `number` | `1` | 分钟步长 |
| `showQuickPresets` | `boolean` | `true` | 是否显示快捷日期预设 |
| `showTimePresets` | `boolean` | `true` | 是否显示快捷时间预设 |
| `allowClear` | `boolean` | `true` | 是否允许清除选择 |
| `dateFormat` | `string` | `'YYYY-MM-DD'` | 日期格式 |
| `timeFormat` | `string` | `'HH:mm:ss'` | 时间格式 |

### 输出事件

| 事件 | 类型 | 描述 |
|------|------|------|
| `dateChange` | `EventEmitter<Date \| null>` | 日期时间改变时触发 |
| `dateSelect` | `EventEmitter<Date \| null>` | 选择日期时触发 |
| `timeChange` | `EventEmitter<TimeValue>` | 时间改变时触发 |
| `open` | `EventEmitter<void>` | 打开选择器时触发 |
| `close` | `EventEmitter<void>` | 关闭选择器时触发 |

## 高级用法

### 自定义时间格式

```html
<pro-date-time-picker
  [(ngModel)]="selectedDateTime"
  [showSeconds]="true"
  [hour24Format]="false"
  placeholder="请选择日期时间">
</pro-date-time-picker>
```

### 禁用日期范围

```typescript
@Component({
  // ...
})
export class ExampleComponent {
  minDate = new Date();
  maxDate = new Date();

  constructor() {
    // 只能选择未来30天内的日期
    this.maxDate.setDate(this.maxDate.getDate() + 30);
  }
}
```

```html
<pro-date-time-picker
  [(ngModel)]="selectedDateTime"
  [minDate]="minDate"
  [maxDate]="maxDate">
</pro-date-time-picker>
```

### 自定义分钟步长

```html
<pro-date-time-picker
  [(ngModel)]="selectedDateTime"
  [timeStep]="15"
  placeholder="请选择时间（15分钟步长）">
</pro-date-time-picker>
```

### 监听事件

```html
<pro-date-time-picker
  [(ngModel)]="selectedDateTime"
  (dateChange)="handleDateChange($event)"
  (timeChange)="handleTimeChange($event)"
  (open)="handleOpen()"
  (close)="handleClose()">
</pro-date-time-picker>
```

## 样式定制

组件使用 Tailwind CSS 的 theme() 函数，可以通过修改 Tailwind 配置来自定义样式：

```scss
// 自定义主色调
.date-time-picker {
  --primary-color: #3b82f6;
  --info-color: #06b6d4;
}
```

## 与 DatePicker 组件的区别

| 特性 | DateTimePicker | DatePicker |
|------|----------------|------------|
| 主要用途 | 日期时间组合选择 | 单一日期选择 |
| 时间功能 | ✅ 完整的时间选择 | ❌ 无时间选择 |
| 面板布局 | 并排显示（日期+时间） | 仅日期面板 |
| 模式切换 | ❌ 固定日期时间模式 | ✅ 支持日期/时间/日期时间模式切换 |
| API 复杂度 | 🟢 简单 | 🟡 中等 |
| 组件大小 | 🔴 较大 | 🟢 中等 |

## 浏览器支持

- Chrome ≥ 88
- Firefox ≥ 78
- Safari ≥ 14
- Edge ≥ 88

## 更新日志

### v1.0.0
- 🎉 初始版本发布
- ✨ 支持日期时间组合选择
- ✨ 响应式布局设计
- ✨ 完整的时间选择功能
- ✨ 快捷预设支持
- ✨ 可访问性支持