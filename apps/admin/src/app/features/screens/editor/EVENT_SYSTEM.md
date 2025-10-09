# 大屏编辑器事件系统使用文档

## 概述

事件系统允许组件之间进行交互，支持点击、悬停、数据变化等事件触发，以及显示/隐藏、更新数据、页面跳转等动作执行。

## 架构设计

### 核心组件

1. **EventBus服务** - 事件发布/订阅总线
2. **EventExecutor服务** - 事件动作执行引擎
3. **ComponentEventHandler服务** - 组件事件处理协调器
4. **EventConfigPanel组件** - 可视化事件配置界面

### 事件模型

```typescript
// 事件类型
enum EventType {
  COMPONENT_CLICK = 'componentClick',      // 组件点击
  COMPONENT_HOVER = 'componentHover',      // 组件悬停
  COMPONENT_LEAVE = 'componentLeave',      // 组件离开
  DATA_CHANGE = 'dataChange',              // 数据变化
  CUSTOM = 'custom'                        // 自定义
}

// 动作类型
enum EventActionType {
  SHOW = 'show',                           // 显示组件
  HIDE = 'hide',                           // 隐藏组件
  TOGGLE_VISIBILITY = 'toggleVisibility',  // 切换可见性
  UPDATE_DATA = 'updateData',              // 更新数据
  NAVIGATE = 'navigate',                   // 页面跳转
  CUSTOM_SCRIPT = 'customScript'           // 自定义脚本
}
```

## 使用指南

### 1. 配置事件

1. 在编辑模式下，选择一个组件
2. 切换到右侧边栏的"事件"标签页
3. 点击"添加事件"按钮
4. 配置事件：
   - 选择触发条件（点击、悬停、离开等）
   - 添加描述（可选）
   - 启用/禁用事件

### 2. 添加动作

1. 在事件配置中点击"添加动作"
2. 选择动作类型：
   - **显示组件** - 选择目标组件
   - **隐藏组件** - 选择目标组件
   - **切换可见性** - 选择目标组件
   - **更新数据** - 选择目标组件（未来可配置具体数据）
   - **页面跳转** - 输入URL，选择是否新窗口打开
   - **自定义脚本** - 编写JavaScript代码

### 3. 高级配置

#### 条件表达式

每个动作都可以配置执行条件，例如：
```javascript
event.sourceComponentId === 'btn1'
event.params.nativeEvent.ctrlKey
```

#### 自定义脚本

自定义脚本可以访问以下变量：
- `event` - 当前事件对象
- `action` - 当前动作配置
- `components` - 所有组件的Map

示例：
```javascript
console.log('事件触发:', event);
const targetComp = components.get(action.targetComponentId);
if (targetComp) {
  targetComp.config.title = '新标题';
}
```

### 4. 预览和测试

1. 切换到预览模式（点击顶部"预览"按钮）
2. 在预览模式下，事件系统会自动激活
3. 执行配置的交互操作（点击、悬停等）
4. 观察事件效果

## 事件流程

```
用户交互（点击/悬停等）
    ↓
Shape组件监听器捕获
    ↓
ComponentEventHandler处理
    ↓
匹配组件配置的事件
    ↓
EventBus发布事件
    ↓
EventExecutor执行动作
    ↓
更新目标组件状态
```

## 调试工具

### 事件历史

EventBus服务保存最近100条事件历史，可用于调试：

```typescript
// 在浏览器控制台中
eventBus.getHistory()  // 获取所有历史
eventBus.getHistory(10) // 获取最近10条
eventBus.clearHistory() // 清空历史
```

### 控制台日志

系统会在控制台输出详细的事件执行日志：
- 事件触发
- 动作执行
- 错误信息

## 最佳实践

1. **命名规范** - 为事件添加清晰的描述，便于维护
2. **避免循环** - 注意事件链不要形成无限循环
3. **性能考虑** - 避免在悬停事件中执行耗时操作
4. **错误处理** - 自定义脚本中注意异常捕获
5. **测试充分** - 在预览模式下充分测试各种交互场景

## 注意事项

1. 事件仅在**预览模式**下生效，编辑模式下不会触发
2. 自定义脚本执行在Function沙箱中，有一定安全限制
3. 条件表达式求值失败会被静默忽略
4. 事件历史最多保存100条，超出会自动删除最早的

## 示例场景

### 场景1：按钮点击显示图表

1. 配置按钮组件的点击事件
2. 添加"显示组件"动作
3. 选择图表组件作为目标

### 场景2：鼠标悬停高亮

1. 配置卡片组件的悬停事件
2. 添加自定义脚本动作
3. 编写改变样式的代码

### 场景3：数据联动

1. 配置下拉框的数据变化事件
2. 添加"更新数据"动作
3. 选择关联的图表组件

## 未来规划

- [ ] 事件可视化调试面板
- [ ] 更多预设动作类型
- [ ] 事件链路可视化
- [ ] 事件录制和回放
- [ ] 全局事件支持
