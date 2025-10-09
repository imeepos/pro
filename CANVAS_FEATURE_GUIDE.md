# Canvas 画布系统 - 框选与快照功能使用指南

## 功能概览

本次更新为 Canvas 画布系统添加了两项核心功能：
- **框选多选** - 一次性选择多个组件进行批量操作
- **撤销重做** - 历史记录管理，支持无限次撤销/重做

---

## 一、框选多选功能

### 1.1 基本操作

#### 框选组件
1. 在画布**空白处**按下鼠标左键
2. 拖动鼠标形成蓝色虚线选区
3. 释放鼠标，选区内的所有组件将被选中
4. 选中的组件会显示**绿色虚线边框**

#### 增量选择
- 按住 **Shift** 键进行框选
- 新选中的组件会**添加**到已有的选择中
- 不按 Shift 则**替换**当前选择

#### 取消选择
- 点击画布空白处（不按 Shift）
- 或按 **Esc** 键（如已实现）

---

### 1.2 多选状态识别

| 状态 | 边框样式 | 说明 |
|------|---------|------|
| 未选中 | 透明 | 默认状态 |
| 激活 | 蓝色实线 | 当前正在操作的组件 |
| 多选中 | 绿色虚线 | 框选中的组件 |

---

### 1.3 批量操作

#### 批量删除
- **快捷键**: `Delete` 或 `Backspace`
- **步骤**: 框选组件 → 按删除键 → 确认删除

#### 批量对齐（API）
```typescript
// 使用示例
canvasService.batchAlign(selectedIds, 'left');     // 左对齐
canvasService.batchAlign(selectedIds, 'right');    // 右对齐
canvasService.batchAlign(selectedIds, 'top');      // 顶部对齐
canvasService.batchAlign(selectedIds, 'bottom');   // 底部对齐
canvasService.batchAlign(selectedIds, 'centerH');  // 水平居中对齐
canvasService.batchAlign(selectedIds, 'centerV');  // 垂直居中对齐
```

#### 批量分布（API）
```typescript
// 水平等距分布（至少3个组件）
canvasService.distributeHorizontally(selectedIds);

// 垂直等距分布（至少3个组件）
canvasService.distributeVertically(selectedIds);
```

---

## 二、撤销重做功能

### 2.1 快捷键

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 撤销 | `Ctrl + Z` | `Cmd + Z` |
| 重做 | `Ctrl + Shift + Z` | `Cmd + Shift + Z` |
| 重做（备选） | `Ctrl + Y` | `Cmd + Y` |

---

### 2.2 工具栏按钮

画布顶部工具栏提供了撤销/重做按钮：
- **↶ 撤销** - 回到上一个状态
- **↷ 重做** - 前进到下一个状态

按钮状态：
- 可用时：白色背景
- 禁用时：灰色半透明（无历史记录时）

---

### 2.3 触发快照的操作

以下操作会**自动记录快照**：
1. ✅ 添加组件
2. ✅ 删除组件
3. ✅ 拖动组件结束
4. ✅ 缩放组件结束
5. ✅ 旋转组件结束
6. ✅ 批量删除

---

### 2.4 历史记录限制

| 类型 | 数量限制 | 说明 |
|------|---------|------|
| 内存历史 | 50 条 | 当前会话，用于快速撤销/重做 |
| IndexedDB | 50 条/页面 | 持久化存储，刷新后仍可恢复 |
| 清理策略 | FIFO | 先进先出，自动删除最旧记录 |

---

## 三、使用场景示例

### 场景 1: 批量调整组件位置

**步骤**：
1. 框选需要调整的多个组件
2. 拖动其中任意一个组件
3. 所有选中的组件会**同步移动**（如已实现）
4. 或使用对齐功能统一位置

**撤销**：
- 按 `Ctrl + Z` 立即恢复原位置

---

### 场景 2: 快速删除多个组件

**步骤**：
1. 框选不需要的组件
2. 按 `Delete` 键
3. 组件被批量删除

**误删恢复**：
- 按 `Ctrl + Z` 恢复删除的组件

---

### 场景 3: 组件对齐和分布

**步骤**：
1. 框选 3 个或更多组件
2. 调用对齐 API：
   ```typescript
   // 左对齐
   this.canvasService.batchAlign(this.selectedIds, 'left');

   // 水平等距分布
   this.canvasService.distributeHorizontally(this.selectedIds);
   ```
3. 组件自动排列整齐

**撤销**：
- 按 `Ctrl + Z` 恢复原位置

---

### 场景 4: 复杂编辑的历史回溯

**步骤**：
1. 进行多次编辑操作（添加、移动、缩放）
2. 发现某一步操作有误
3. 连续按 `Ctrl + Z` 回溯到正确状态
4. 继续编辑（之后的历史会被清空）
5. 如需恢复，按 `Ctrl + Shift + Z` 重做

---

## 四、注意事项

### 4.1 框选功能
- ⚠️ 只能在**画布空白处**开始框选
- ⚠️ 框选时不会选中**锁定**的组件（如已实现）
- ⚠️ 框选范围使用**矩形相交检测**，部分重叠也会被选中

### 4.2 快照功能
- ⚠️ 历史记录**不会保存到服务器**，仅本地 IndexedDB
- ⚠️ 清空浏览器数据会**清除所有历史记录**
- ⚠️ 每个页面的历史记录是**独立**的
- ⚠️ 执行新操作后，**当前位置之后的历史会被清空**

---

## 五、API 参考

### 5.1 Canvas Service

#### 多选相关
```typescript
// 选择多个组件
canvasService.selectMultipleComponents(ids: string[]): void

// 添加到选择
canvasService.addToSelection(id: string): void

// 从选择中移除
canvasService.removeFromSelection(id: string): void

// 清空选择
canvasService.clearSelection(): void
```

#### 批量操作
```typescript
// 批量删除
canvasService.batchDelete(ids: string[]): void

// 批量对齐
canvasService.batchAlign(
  ids: string[],
  type: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'
): void

// 水平分布
canvasService.distributeHorizontally(ids: string[]): void

// 垂直分布
canvasService.distributeVertically(ids: string[]): void
```

#### 快照相关
```typescript
// 记录快照
canvasService.recordSnapshot(): void

// 撤销
canvasService.undo(): void

// 重做
canvasService.redo(): void

// 是否可撤销
canvasService.canUndo(): boolean

// 是否可重做
canvasService.canRedo(): boolean
```

---

### 5.2 Canvas Query

#### 获取选中状态
```typescript
// 订阅选中的组件 ID 列表
query.selectedComponentIds$: Observable<string[]>

// 订阅选中的组件对象列表
query.selectedComponents$: Observable<ComponentItem[]>

// 获取选中的组件（同步）
query.getSelectedComponents(): ComponentItem[]
```

---

## 六、常见问题

### Q1: 框选时鼠标移到组件上选区消失？
**A**: 这是正常行为。框选必须在**空白处**开始和移动，遇到组件会中断框选。

### Q2: 按 Ctrl+Z 没反应？
**A**: 检查：
1. 是否有历史记录（工具栏撤销按钮是否可用）
2. 是否在画布组件内（快捷键需要焦点）
3. 浏览器是否拦截了快捷键

### Q3: 多选后如何拖动？
**A**: 当前版本多选组件**不支持同步拖动**，这是 P2 功能。可以使用对齐和分布 API 调整位置。

### Q4: 历史记录能恢复到多久前？
**A**: 最多 50 步操作。超过 50 步后，最早的历史会被自动清除。

### Q5: 刷新页面后历史记录还在吗？
**A**: 在，IndexedDB 会保存历史记录。但**当前位置**会重置到最新状态。

---

## 七、开发扩展

### 添加右键菜单批量操作

```typescript
// 在 editor.component.ts 中添加
@HostListener('contextmenu', ['$event'])
onContextMenu(event: MouseEvent): void {
  if (this.selectedCount > 1) {
    event.preventDefault();
    // 显示批量操作菜单
    this.showBatchMenu(event.clientX, event.clientY);
  }
}

showBatchMenu(x: number, y: number): void {
  const menu = [
    { label: '左对齐', action: () => this.canvasService.batchAlign(this.selectedIds, 'left') },
    { label: '右对齐', action: () => this.canvasService.batchAlign(this.selectedIds, 'right') },
    { label: '顶部对齐', action: () => this.canvasService.batchAlign(this.selectedIds, 'top') },
    { label: '底部对齐', action: () => this.canvasService.batchAlign(this.selectedIds, 'bottom') },
    { label: '水平居中', action: () => this.canvasService.batchAlign(this.selectedIds, 'centerH') },
    { label: '垂直居中', action: () => this.canvasService.batchAlign(this.selectedIds, 'centerV') },
    { label: '水平分布', action: () => this.canvasService.distributeHorizontally(this.selectedIds) },
    { label: '垂直分布', action: () => this.canvasService.distributeVertically(this.selectedIds) },
    { label: '批量删除', action: () => this.canvasService.batchDelete(this.selectedIds) },
  ];

  // 渲染菜单 UI
}
```

---

### 添加快照预览

```typescript
// 在 snapshot.service.ts 中添加
async getSnapshotPreview(pageId: string): Promise<SnapshotPreview[]> {
  const snapshots = await this.getSnapshots(pageId);
  return snapshots.map(s => ({
    id: s.id,
    timestamp: s.timestamp,
    preview: this.generatePreview(JSON.parse(s.canvasData)),
    componentCount: JSON.parse(s.canvasData).componentData.length
  }));
}

private generatePreview(state: CanvasState): string {
  // 生成缩略图或描述
  return `${state.componentData.length} 个组件`;
}
```

---

## 八、更新日志

### v1.0.0 - 2025-10-09
- ✨ 新增框选多选功能
- ✨ 新增撤销/重做功能
- ✨ 新增批量删除
- ✨ 新增批量对齐（6种）
- ✨ 新增批量分布（水平/垂直）
- ✨ 新增 IndexedDB 持久化
- ✨ 新增快捷键支持
- ✨ 新增工具栏 UI

---

**文档维护**: 代码艺术家
**最后更新**: 2025-10-09
