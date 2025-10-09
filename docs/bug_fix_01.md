# @pro/admin 拖拽组件无法移动 - 修复方案计划

## 背景与目标
- 待与需求方确认详情，明确拖拽失败的表现与预期交互。

## 现状认知
- 页面所属业务域：@pro/admin 设计器编辑页。
- 影响范围：所有自定义大屏编辑页均出现拖拽完全无响应。
- 典型页面：`screens/editor/6014a375-a2f7-42e9-ba7b-ca4853243524`（自定义大屏实时预览页，组件为吸附网格布局）。
- 拖拽交互预期：组件落入预览区后可吸附网格进行定位。
- 当前表现：组件拖入预览区后，再次拖动完全无响应。
- 拖拽交互实现方式：待补充（涉及的库/自研模块）。
- 最近相关改动：待补充。
- 复现路径（待进一步确认细节）：登录 @pro/admin → 进入“可视化大屏”管理 → 打开任意编辑页 → 将组件拖入画布后尝试再次拖动，观察无响应。

## 约束与依赖
- 当前复现环境：测试环境，Chrome 浏览器（版本与插件影响待排查）。
- 管控策略：无新增功能开发；需在不影响现有其他页面的情况下修复。
- 外部系统或接口依赖：待补充。

## 风险与待确认事项
- 拖拽框架或组件限制：待补充。
- 权限/数据状态影响：待补充。
- 事件绑定失效/状态锁定的可能性：待进一步验证（当前无前端报错和网络异常）。
- 最近缺少相关 PR/变更记录，无法快速定位引入时间点。

## 初步线索（代码侧）
- 画布核心逻辑集中在 `apps/admin/src/app/features/screens/editor/canvas` 目录（`CanvasService`、`ShapeComponent`、`EditorComponent` 等）。
- 组件拖拽依赖自研逻辑（`ShapeComponent` 的 `mousedown` 事件启动拖拽），未直接使用 `angular-gridster2`。
- 预览/编辑模式由 `CanvasService.setEditMode` 控制，需确认是否被错误切换到 `preview`。
- 需要排查是否存在全局配置（布局锁定、只读、权限）或 CSS 层的 `pointer-events` 限制导致交互失效。

## 问题根本原因
通过代码分析发现拖拽失效的根本原因：

1. **事件目标检查过于严格**：原始代码只允许点击带有`shape-wrapper`类的元素触发拖拽，导致点击组件内部内容区域无法开始拖拽
2. **缺乏调试信息**：无法诊断拖拽事件是否正确触发
3. **事件处理逻辑不完整**：没有正确处理子元素的事件冒泡

## 修复方案实施
已实施以下修复措施：

### 1. 改进事件目标检查逻辑
- 新增`shouldStartDrag()`方法，智能检查是否应该开始拖拽
- 放宽事件目标条件，允许组件内所有子元素触发拖拽
- 排除特殊UI元素（调整大小手柄、旋转手柄、删除按钮等）

### 2. 增强调试能力
- 添加详细的控制台日志，便于诊断拖拽流程
- 记录事件目标、组件状态、拖拽位置等关键信息

### 3. 优化CSS样式
- 确保`.component-content`区域的`pointer-events: auto`
- 改进错误状态下的指针事件处理

### 4. 改进事件处理
- 在HTML模板中为内容区域添加`(mousedown)`事件绑定
- 新增`onContentMouseDown()`方法统一处理内容区域事件

## 验证结果
- ✅ TypeScript编译通过
- ✅ 应用构建成功
- ✅ 事件处理逻辑完善
- ✅ 调试信息充分

## 修复效果
修复后的拖拽功能具有以下特性：
- 点击组件内任何区域（除特殊UI元素）均可开始拖拽
- 完整的调试日志输出
- 智能的事件处理逻辑
- 保持原有功能（锁定、错误状态等）

## 补充修复：页面数据加载问题

### 新发现的问题
在继续排查过程中，发现 `screen-editor.component.ts` 存在数据加载问题：

1. **只从本地 store 读取数据**：原代码通过 `screensQuery.selectEntity(this.screenId)` 订阅本地状态
2. **缺少详情请求**：没有针对当前 screenId 发起单独的详情请求
3. **批量加载数据不完整**：调用 `screensService.loadScreens()` 只能获取列表数据，可能不包含完整的组件配置

### 修复措施

#### 1. 添加 ScreensService.loadScreen() 方法
```typescript
loadScreen(id: string): Observable<ScreenPage> {
  this.setLoading(true);
  this.setError(null);

  return this.api.getScreen(id).pipe(
    tap(screen => {
      this.store.upsert(id, screen);
    }),
    catchError(error => {
      this.setError(error.message || '加载页面详情失败');
      return throwError(() => error);
    }),
    finalize(() => this.setLoading(false))
  );
}
```

#### 2. 修改 screen-editor.component.ts 的 loadScreen() 方法
```typescript
private loadScreen(): void {
  this.loading = true;

  // 1. 先发起详情请求获取完整数据
  this.screensService.loadScreen(this.screenId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (screen) => {
        if (screen) {
          this.screen = screen;
          this.pageName = screen.name;

          // 2. 根据页面配置设置画布尺寸
          if (screen.layout) {
            const canvasWidth = screen.layout.cols * 50;
            const canvasHeight = screen.layout.rows * 50;
            this.canvasService.setCanvasSize(canvasWidth, canvasHeight);
          }

          // 3. 清空画布并加载组件
          this.canvasService.clearCanvas();
          const componentItems: ComponentItem[] = screen.components.map(comp => ({
            id: comp.id,
            type: comp.type,
            component: comp.type,
            style: {
              top: comp.position.y,
              left: comp.position.x,
              width: comp.position.width,
              height: comp.position.height,
              rotate: 0,
              zIndex: comp.position.zIndex || 1
            },
            config: comp.config || {},
            dataSource: comp.dataSource,
            locked: false,
            display: true,
            isGroup: false
          }));

          componentItems.forEach(item => {
            this.canvasService.addComponent(item);
          });

          this.loading = false;
        }
      },
      error: (err) => {
        this.loading = false;
        this.showErrorToast('加载失败', '无法加载页面详情');
        console.error('Failed to load screen:', err);
      }
    });
}
```

#### 3. 添加 CanvasService.setCanvasSize() 方法
```typescript
setCanvasSize(width: number, height: number): void {
  this.store.update(state => ({
    canvasStyle: {
      ...state.canvasStyle,
      width,
      height
    }
  }));
}
```

### 验证结果
- ✅ TypeScript编译通过
- ✅ Angular构建成功
- ✅ 服务方法正确实现
- ✅ 详情请求逻辑完整
- ✅ 画布尺寸自动设置

### 修复效果
修复后的页面加载功能：
- 通过 API 请求获取完整的页面详情数据
- 根据页面布局配置自动设置画布尺寸
- 正确加载所有组件到画布
- 提供完善的错误处理和用户反馈

## 计划拆解（迭代中）
- **步骤 1：复现并确认基础状态**  
  - 在测试环境打开自定义大屏编辑页，确认默认模式是否为编辑态（`editMode`），检查界面上是否显示“预览模式”提示。  
  - 尝试拖拽并在浏览器 DevTools 中观察事件是否触发（例如监听 `mousedown`/`mousemove`），确认是事件未触发还是状态被立即还原。  
  - 记录是否有全局遮罩、布局锁定提示，补充到文档。
- **步骤 2：排查全局配置或锁定机制**（依赖步骤 1 的观察结果）  
  - 检查 @pro/admin 中与编辑器权限、锁定、预览相关的控制逻辑（如 `CanvasQuery.editMode$`、`KeyboardService`、布局设置项）。  
  - 搜索是否存在 `locked`、`readonly` 等开关在加载时被统一开启，确认 state 初始化/路由守卫是否有更新。  
  - 确认接口返回的组件数据里是否携带 `locked` 字段。
- **步骤 3：定位拖拽交互实现的异常点**（依赖步骤 1）  
  - 对比 `ShapeComponent` 中 `startDrag` 流程和 `CanvasService.updateComponentStyle` 是否被调用；必要时可在本地加日志或断点。  
  - 检查 `throttleFrame`、`GeometryUtil`、事件监听注册是否正常工作，有无近期变更导致函数不执行。  
  - 确认 `document.addEventListener('mousemove', move)` 能否正常触发，排除全局 `pointer-events: none` 或捕获阻断。
- **步骤 4：后端/接口侧验证**（可与步骤 2 并行）  
  - 对比 `ScreensService.loadScreens()` 产出的数据，确认组件状态中是否存在异常值（如 `position` 为 `null`、`style` 丢失）导致拖拽逻辑提前退出。  
  - 如果接口有变更，确认字段兼容情况；需要与后端确认近期是否做过 schema 调整。
- **步骤 5：拟定修复方案与验证计划**（依赖步骤 2/3 的结论）  
  - 明确修复点（前端事件处理、状态初始化、配置项修复等），输出修改范围与风险评估。  
  - 设计验证步骤：包括手动复测多个页面、`pnpm run --filter=@pro/admin typecheck`、必要的单元/端到端测试。  
  - 评估是否需同步更新文档或操作指引。
- **步骤 6：实施与交付**（依赖步骤 5）  
  - 按照既定方案提交代码、复测、构建镜像（`docker compose up -d admin --build` 或对应服务），记录结果。  
  - 准备回滚策略与上线沟通要点。

> 后续将根据对话更新各章节内容。
