# Canvas 画布系统快速启动指南

## 代码统计
- **文件总数**: 20 个
- **代码总行数**: 629 行
- **TypeScript 文件**: 11 个
- **HTML 模板**: 3 个
- **SCSS 样式**: 3 个
- **索引文件**: 3 个

---

## 快速集成步骤

### 1. 导入 Canvas 组件到现有编辑器

在 `/apps/admin/src/app/features/screens/editor/screen-editor.component.ts` 中:

```typescript
import { CanvasComponent } from './canvas';

@Component({
  selector: 'app-screen-editor',
  standalone: true,
  imports: [
    CommonModule,
    // ... 其他导入
    CanvasComponent  // 添加 Canvas 组件
  ],
  templateUrl: './screen-editor.component.html',
  styleUrls: ['./screen-editor.component.scss']
})
export class ScreenEditorComponent {
  // 现有代码...
}
```

### 2. 在模板中使用 Canvas

在 `/apps/admin/src/app/features/screens/editor/screen-editor.component.html` 中:

```html
<!-- 原有的编辑器内容 -->
<div class="screen-editor">
  <!-- 添加 Canvas 画布 -->
  <app-canvas></app-canvas>
</div>
```

### 3. 添加组件到画布

```typescript
import { CanvasService } from './canvas/services/canvas.service';
import { ComponentItem } from './models/component.model';

export class YourComponent {
  constructor(private canvasService: CanvasService) {}

  addTestComponent() {
    const component: ComponentItem = {
      id: 'comp-' + Date.now(),
      type: 'chart',
      component: 'ChartComponent',
      style: {
        top: 50,
        left: 50,
        width: 400,
        height: 300,
        rotate: 0,
        zIndex: 1
      },
      config: {
        title: '测试图表'
      }
    };

    this.canvasService.addComponent(component);
  }
}
```

### 4. 监听画布状态

```typescript
import { CanvasQuery } from './canvas/services/canvas.query';

export class YourComponent implements OnInit {
  constructor(private canvasQuery: CanvasQuery) {}

  ngOnInit() {
    // 监听所有组件
    this.canvasQuery.componentData$.subscribe(components => {
      console.log('画布组件列表:', components);
    });

    // 监听激活组件
    this.canvasQuery.activeComponent$.subscribe(active => {
      console.log('当前激活组件:', active);
    });

    // 监听缩放比例
    this.canvasQuery.scale$.subscribe(scale => {
      console.log('当前缩放比例:', scale);
    });
  }
}
```

---

## API 参考

### CanvasService 方法

```typescript
// 组件操作
canvasService.addComponent(component: ComponentItem): void
canvasService.removeComponent(id: string): void
canvasService.updateComponent(id: string, updates: Partial<ComponentItem>): void
canvasService.updateComponentStyle(id: string, style: Partial<ComponentStyle>): void

// 选中管理
canvasService.activateComponent(id: string): void
canvasService.deactivateComponent(): void

// 缩放控制
canvasService.setScale(scale: number): void  // 0.1 - 3.0
canvasService.zoomIn(): void                  // 放大 0.1
canvasService.zoomOut(): void                 // 缩小 0.1

// 画布设置
canvasService.setEditMode(mode: 'edit' | 'preview'): void
canvasService.toggleGrid(): void
canvasService.clearCanvas(): void
```

### CanvasQuery 属性

```typescript
// Observable 数据流
canvasQuery.componentData$: Observable<ComponentItem[]>
canvasQuery.activeComponentId$: Observable<string | null>
canvasQuery.activeComponent$: Observable<ComponentItem | undefined>
canvasQuery.scale$: Observable<number>
canvasQuery.canvasStyle$: Observable<CanvasStyle>
canvasQuery.editMode$: Observable<EditMode>
canvasQuery.showGrid$: Observable<boolean>

// 查询方法
canvasQuery.getComponentById(id: string): ComponentItem | undefined
canvasQuery.getActiveComponent(): ComponentItem | undefined
```

---

## 核心功能演示

### 1. 创建工具栏

```typescript
@Component({
  selector: 'app-canvas-toolbar',
  template: `
    <div class="toolbar">
      <button (click)="zoomIn()">放大</button>
      <button (click)="zoomOut()">缩小</button>
      <span>{{ scale$ | async | percent }}</span>
      <button (click)="toggleGrid()">网格</button>
      <button (click)="clearAll()">清空</button>
    </div>
  `
})
export class CanvasToolbarComponent {
  scale$ = this.query.scale$;

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery
  ) {}

  zoomIn() { this.canvasService.zoomIn(); }
  zoomOut() { this.canvasService.zoomOut(); }
  toggleGrid() { this.canvasService.toggleGrid(); }
  clearAll() { this.canvasService.clearCanvas(); }
}
```

### 2. 创建组件面板

```typescript
@Component({
  selector: 'app-component-panel',
  template: `
    <div class="panel">
      <div class="component-item"
           *ngFor="let type of componentTypes"
           (click)="addComponent(type)">
        {{ type }}
      </div>
    </div>
  `
})
export class ComponentPanelComponent {
  componentTypes = ['Chart', 'Table', 'Text', 'Image'];

  constructor(private canvasService: CanvasService) {}

  addComponent(type: string) {
    const component: ComponentItem = {
      id: this.generateId(),
      type,
      component: type + 'Component',
      style: {
        top: 100,
        left: 100,
        width: 300,
        height: 200,
        rotate: 0,
        zIndex: 1
      },
      config: {}
    };

    this.canvasService.addComponent(component);
  }

  private generateId(): string {
    return `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 3. 创建属性面板

```typescript
@Component({
  selector: 'app-property-panel',
  template: `
    <div class="panel" *ngIf="activeComponent$ | async as component">
      <h3>组件属性</h3>

      <div class="property">
        <label>X:</label>
        <input type="number"
               [value]="component.style.left"
               (change)="updateStyle('left', $event)">
      </div>

      <div class="property">
        <label>Y:</label>
        <input type="number"
               [value]="component.style.top"
               (change)="updateStyle('top', $event)">
      </div>

      <div class="property">
        <label>宽度:</label>
        <input type="number"
               [value]="component.style.width"
               (change)="updateStyle('width', $event)">
      </div>

      <div class="property">
        <label>高度:</label>
        <input type="number"
               [value]="component.style.height"
               (change)="updateStyle('height', $event)">
      </div>

      <div class="property">
        <label>旋转:</label>
        <input type="number"
               [value]="component.style.rotate"
               (change)="updateStyle('rotate', $event)">
      </div>
    </div>
  `
})
export class PropertyPanelComponent {
  activeComponent$ = this.query.activeComponent$;

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery
  ) {}

  updateStyle(prop: string, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    const activeId = this.query.getValue().activeComponentId;

    if (activeId) {
      this.canvasService.updateComponentStyle(activeId, { [prop]: value });
    }
  }
}
```

---

## 键盘快捷键 (未来实现)

| 快捷键 | 功能 |
|--------|------|
| Delete | 删除选中组件 |
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Ctrl+C | 复制 |
| Ctrl+V | 粘贴 |
| Ctrl+A | 全选 |
| Ctrl++ | 放大 |
| Ctrl+- | 缩小 |
| Ctrl+0 | 重置缩放 |
| ↑↓←→ | 微调位置 |

---

## 性能优化建议

### 1. 使用 OnPush 变更检测策略

```typescript
@Component({
  selector: 'app-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class CanvasComponent {
  // ...
}
```

### 2. 使用 TrackBy 优化列表

```typescript
// editor.component.ts 中已实现
trackByComponent(index: number, component: ComponentItem): string {
  return component.id;
}
```

### 3. 使用 requestAnimationFrame 节流

```typescript
// throttle.util.ts 中已实现
import { throttleFrame } from './utils/throttle.util';

const move = throttleFrame((e: MouseEvent) => {
  // 拖动逻辑
});
```

---

## 常见问题

### Q1: 如何自定义画布大小?

```typescript
// 直接更新 Store
this.canvasStore.update({
  canvasStyle: {
    width: 1920,
    height: 1080,
    background: '#ffffff'
  }
});
```

### Q2: 如何限制组件拖动范围?

在 `shape.component.ts` 的 `startDrag` 方法中添加边界检查:

```typescript
const newLeft = Math.max(0, Math.min(startLeft + deltaX, maxWidth - width));
const newTop = Math.max(0, Math.min(startTop + deltaY, maxHeight - height));
```

### Q3: 如何实现组件双击编辑?

在 `shape.component.ts` 中已预留 `onDoubleClick` 方法,可扩展:

```typescript
@HostListener('dblclick', ['$event'])
onDoubleClick(event: MouseEvent): void {
  event.stopPropagation();
  // 进入编辑模式
  this.enterEditMode();
}
```

### Q4: 如何保存画布数据?

```typescript
// 获取完整画布状态
const canvasState = this.canvasQuery.getValue();

// 保存到服务器
this.http.post('/api/canvas/save', canvasState).subscribe();

// 或保存到 LocalStorage
localStorage.setItem('canvas-state', JSON.stringify(canvasState));
```

### Q5: 如何加载画布数据?

```typescript
// 从服务器加载
this.http.get<CanvasState>('/api/canvas/load').subscribe(state => {
  this.canvasStore.update(state);
});

// 或从 LocalStorage 加载
const savedState = localStorage.getItem('canvas-state');
if (savedState) {
  this.canvasStore.update(JSON.parse(savedState));
}
```

---

## 下一步

1. **测试集成**: 将 Canvas 组件集成到现有编辑器
2. **添加工具栏**: 实现缩放、网格控制等工具栏
3. **实现 P1 功能**: 缩放、旋转、对齐线
4. **完善样式**: 根据实际 UI 设计调整样式
5. **性能测试**: 大量组件时的性能测试

---

## 技术支持

遇到问题请参考:
- 文档: `/home/ubuntu/worktrees/pro/docs/canvas.md`
- 实施摘要: `/home/ubuntu/worktrees/pro/CANVAS_P0_IMPLEMENTATION_SUMMARY.md`
- 源码: `/home/ubuntu/worktrees/pro/apps/admin/src/app/features/screens/editor/canvas/`

---

*快速启动指南 v1.0 - 2025-10-08*
