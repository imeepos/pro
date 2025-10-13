## API Key 编辑功能 Bug 修复总结

### 修复内容

1. **前端防重复提交**
   - 在 api-key-form.component.ts 中添加了 loading 状态检查
   - 防止用户快速多次点击提交按钮导致重复请求

2. **永久过期时间处理**  
   - 修复了 expiresAt 字段的逻辑，明确区分 null（永久过期）和 undefined（未设置）
   - 当用户点击'永久'按钮时，正确传递 null 值

3. **后端 DTO 验证**
   - 更新了 CreateApiKeyDto 和 UpdateApiKeyDto 的类型定义
   - 添加了 @ValidateIf 装饰器，允许 null 值通过验证
   - 更新了 API 文档，明确说明 null 表示永不过期

4. **类型定义同步**
   - 更新了 @pro/types 包中的接口定义
   - 确保 expiresAt 字段支持 string | null 类型

### 修复效果

- 解决了重复提交问题，避免发送错误请求 {"isTrusted":true}
- 修复了永久过期时间不能正确保存的问题  
- 确保前端和后端对过期时间的处理逻辑一致
- 提供了更清晰的错误处理和日志记录

### 验证方法

1. 打开 API Key 编辑页面
2. 修改 API Key 信息，选择过期时间为'永久'
3. 快速点击提交按钮多次
4. 验证只发送一次请求，且 expiresAt 正确保存为 null

