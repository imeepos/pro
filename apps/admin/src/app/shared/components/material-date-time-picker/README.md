# Material DateTimePicker Component

基于 Angular Material 的日期时间选择器组件，提供现代化的用户界面和良好的用户体验。

## 功能特性

- 🎨 **Material Design 风格**：完全符合 Google Material Design 规范
- 📅 **日期选择**：支持日期选择，包含年月日选择
- ⏰ **时间选择**：支持时分秒时间选择
- 🌍 **国际化支持**：内置中文本地化支持
- ♿ **无障碍访问**：符合 WCAG 无障碍标准
- 📱 **响应式设计**：适配移动端和桌面端
- ⚡ **高性能**：使用 OnPush 变更检测策略
- 🔧 **灵活配置**：丰富的输入属性配置

## 安装和配置

确保已安装以下依赖：

```bash
pnpm add @angular/material @angular/material-date-fns-adapter date-fns
```

在 `app.config.ts` 中配置 Material 日期适配器：

```typescript
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { DateFnsAdapter } from '@angular/material-date-fns-adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... 其他配置
    {
      provide: MAT_DATE_LOCALE,
      useValue: 'zh-CN'
    },
    {
      provide: DateFnsAdapter,
      useClass: DateFnsAdapter,
      deps: [MAT_DATE_LOCALE]
    },
  ]
};
```

## 使用方法

### 基础用法

```html
<pro-material-date-time-picker
  [(ngModel)]="selectedDate"
  placeholder="请选择日期时间"
></pro-material-date-time-picker>
```

### 表单控件用法

```html
<pro-material-date-time-picker
  formControlName="occurTime"
  placeholder="请选择发生时间"
  [required]="true"
  [showTime]="true"
  [allowClear]="true"
></pro-material-date-time-picker>
```

## 输入属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `placeholder` | `string` | `'请选择日期时间'` | 输入框占位文本 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `required` | `boolean` | `false` | 是否必填 |
| `readonly` | `boolean` | `false` | 是否只读 |
| `minDate` | `Date \| null` | `null` | 最小可选日期 |
| `maxDate` | `Date \| null` | `null` | 最大可选日期 |
| `allowClear` | `boolean` | `true` | 是否显示清除按钮 |
| `showTime` | `boolean` | `true` | 是否显示时间选择 |
| `dateFormat` | `string` | `'yyyy-MM-dd'` | 日期格式 |
| `timeFormat` | `string` | `'HH:mm:ss'` | 时间格式 |

## 输出事件

| 事件名 | 参数类型 | 说明 |
|--------|----------|------|
| `dateChange` | `Date \| null` | 日期时间值改变时触发 |
| `dateSelect` | `Date \| null` | 选择日期时触发 |
| `timeChange` | `{ hours: number; minutes: number; seconds: number }` | 时间改变时触发 |

## 样式定制

组件使用 CSS 变量和 Material Design 主题系统，可以通过以下方式自定义样式：

```scss
.material-date-time-picker {
  // 自定义时间选择区域样式
  .time-selection {
    background-color: your-color;
    border-radius: your-radius;
  }

  // 自定义时间输入框样式
  .time-input {
    width: your-width;
  }
}
```

## 无障碍访问

组件支持以下无障碍特性：

- 完整的键盘导航支持
- 屏幕阅读器支持
- 高对比度模式适配
- 减少动画偏好支持

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 示例代码

### 完整表单示例

```typescript
// component.ts
import { Component, FormControl } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
})
export class ExampleComponent {
  eventForm = new FormGroup({
    occurTime: new FormControl('', Validators.required),
  });

  onSubmit() {
    if (this.eventForm.valid) {
      console.log('表单数据:', this.eventForm.value);
    }
  }
}
```

```html
<!-- component.html -->
<form [formGroup]="eventForm">
  <pro-material-date-time-picker
    formControlName="occurTime"
    placeholder="请选择发生时间"
    [required]="true"
    [showTime]="true"
    [allowClear]="true"
  ></pro-material-date-time-picker>

  <button type="submit" (click)="onSubmit()">提交</button>
</form>
```

## 与原组件的对比

| 特性 | 原组件 | Material组件 |
|------|--------|-------------|
| UI 风格 | 自定义 | Material Design |
| 依赖 | 无 | Angular Material |
| 国际化 | 基础 | 完整支持 |
| 无障碍 | 基础 | 完整支持 |
| 主题支持 | 有限 | 完整支持 |
| 代码复杂度 | 高 | 低 |
| 维护性 | 中等 | 高 |

## 迁移指南

从原 `DateTimePickerComponent` 迁移到 `MaterialDateTimePickerComponent`：

1. 更新导入：
   ```typescript
   // 旧
   import { DateTimePickerComponent } from './date-time-picker';

   // 新
   import { MaterialDateTimePickerComponent } from './material-date-time-picker';
   ```

2. 更新组件选择器：
   ```html
   <!-- 旧 -->
   <pro-date-time-picker></pro-date-time-picker>

   <!-- 新 -->
   <pro-material-date-time-picker></pro-material-date-time-picker>
   ```

3. 更新导入列表（如果使用 standalone）：
   ```typescript
   // 在 component.ts 的 imports 数组中
   imports: [
     // ...
     MaterialDateTimePickerComponent, // 替换 DateTimePickerComponent
   ]
   ```

## 故障排除

### 常见问题

1. **日期格式不正确**
   - 确保 `MAT_DATE_LOCALE` 配置为 'zh-CN'
   - 检查 `dateFormat` 属性设置

2. **时间选择不显示**
   - 确保 `showTime` 属性设置为 `true`
   - 检查是否有选中的日期

3. **表单验证不工作**
   - 确保正确设置了 `FormControl` 或 `formControlName`
   - 检查 `required` 属性设置

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个组件。

## 许可证

MIT License