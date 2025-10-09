# 爬虫分析工具设计方案

## 一、项目概述

设计一个**API逆向工程工具**，能够监控目标网站的所有HTTP请求，捕获请求参数和响应数据，通过AI分析自动生成标准化的API接口文档，**让第三方网站的API从黑盒变成白盒**，方便后续开发使用。

### 核心价值
- **API发现**：自动发现目标网站的所有接口
- **参数解析**：智能解析请求参数和响应结构
- **文档生成**：自动生成OpenAPI/Swagger标准文档
- **代码示例**：生成多语言调用示例代码
- **关系梳理**：理清接口间的调用关系和数据依赖

## 二、核心功能

### 2.1 网络监控模块
- 输入目标URL启动监控
- 拦截并记录所有HTTP/HTTPS请求
- 捕获请求头、请求参数（Query/Body）
- 捕获响应头、响应数据
- 记录请求时序和调用链

### 2.2 数据存储模块
- 存储请求元数据（URL、Method、Headers）
- 存储请求参数（原始格式+结构化）
- 存储响应数据（原始格式+结构化）
- 记录请求时间戳和调用上下文
- 建立请求间的关联关系

### 2.3 AI分析模块
- 分析接口功能（CRUD操作类型）
- 识别接口用途（登录/列表/详情/搜索等）
- 分析数据结构和字段含义
- 发现数据关联关系（主外键/嵌套引用）
- 识别分页模式（页码/偏移量/游标）
- 分析数据流向和页面渲染逻辑

### 2.4 文档生成模块（核心产出）
- 生成OpenAPI 3.0规范文档
- 生成接口描述和参数说明
- 生成请求/响应示例
- 生成数据模型（Schema）
- 生成认证方式说明
- 生成多语言调用代码示例（curl/JavaScript/Python/Java）
- 支持导出Markdown/HTML/PDF格式
- 支持导入Postman/Apifox等工具

### 2.5 可视化展示模块
- 请求列表展示（时间轴视图）
- 接口调用链路图
- 数据关系拓扑图
- 接口分类和标签
- AI分析结果展示
- 在线API文档预览（Swagger UI）

## 三、技术架构

### 3.1 浏览器监控方案（已确定）
**采用方案：Electron 桌面客户端**
- 开发独立的Electron桌面应用
- 内置Chromium浏览器窗口供用户操作
- 通过`session.webRequest` API拦截所有网络请求
- 实时发送请求数据到@pro/admin后端
- 用户关闭监控窗口后触发分析

**技术优势**：
- ✅ 用户体验最佳（原生桌面应用）
- ✅ 完美拦截所有请求（Electron webRequest API）
- ✅ 自动处理登录态和Cookie（真实浏览器环境）
- ✅ 支持复杂交互场景（验证码、人机验证）
- ✅ 可多窗口展示（浏览器窗口+控制面板）
- ✅ 轻量级集成（客户端 ↔ 后端 HTTP/WebSocket通信）

### 3.2 数据存储方案
- **PostgreSQL**：存储结构化的请求/响应元数据
- **MongoDB/JSON**：存储原始请求/响应体
- **Redis**：缓存会话数据和临时分析结果

### 3.3 AI分析方案
- **大模型选择**：Claude/GPT-4 API
- **分析策略**：
  - 单请求分析：解读单个API的作用
  - 批量分析：发现请求间的关联模式
  - 增量学习：基于历史分析结果优化

### 3.4 技术栈
- **桌面客户端**：Electron + TypeScript
- **客户端UI**：可选React/Vue或原生HTML
- **后端**：NestJS（已有技术栈）
- **数据层**：PostgreSQL + TypeORM
- **AI层**：Claude API（高级分析）
- **Web管理端**：@pro/admin (Angular)
- **通信协议**：HTTP + WebSocket

### 3.5 系统架构图
```
┌─────────────────────────────────────────────────────────────┐
│              Devtool Electron 桌面客户端                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  主窗口（控制面板）                                   │  │
│  │  • 输入目标URL                                        │  │
│  │  • 实时请求列表                                       │  │
│  │  • 任务控制（开始/停止/完成）                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  浏览器窗口（BrowserWindow）                          │  │
│  │  • 用户直接操作目标网站                               │  │
│  │  • 登录、浏览、点击、搜索等                           │  │
│  │  • Chromium内核（真实浏览器环境）                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  请求拦截模块（Main Process）                         │  │
│  │  • session.webRequest.onBeforeRequest                │  │
│  │  • session.webRequest.onCompleted                    │  │
│  │  • 捕获请求头、参数、响应                             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬───────────────────────────────────────┘
                     │ HTTP POST (发送请求数据)
                     │ WebSocket (接收分析结果)
┌────────────────────┴───────────────────────────────────────┐
│              @pro/admin 后端（NestJS）                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  数据接收模块                                         │  │
│  │  • POST /api/devtool/requests (接收请求数据)         │  │
│  │  • POST /api/devtool/tasks (创建/更新任务)           │  │
│  │  • 实时存储到PostgreSQL                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AI分析模块                                           │  │
│  │  • URL模式归并（/user/123 → /user/{id}）            │  │
│  │  • 生成JSON Schema                                   │  │
│  │  • 调用Claude API深度分析                            │  │
│  │  • 理解业务逻辑和数据关系                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  文档生成模块                                         │  │
│  │  • 生成Markdown API文档                              │  │
│  │  • 生成curl代码示例                                  │  │
│  │  • 可选：OpenAPI/Swagger                             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬───────────────────────────────────────┘
                     │
┌────────────────────┴───────────────────────────────────────┐
│              @pro/admin Web界面（Angular）                   │
│  • 查看历史监控任务                                          │
│  • 预览生成的API文档                                         │
│  • 下载Markdown文档                                          │
│  • 管理任务和数据                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  数据层（PostgreSQL）                        │
│  • monitoring_task（监控任务）                              │
│  • http_request/response（请求/响应）                       │
│  • api_analysis（AI分析结果）                               │
│  • api_documentation（API文档）                             │
│  • data_relationship（数据关系）                            │
└─────────────────────────────────────────────────────────────┘
```

## 四、数据模型设计

### 4.1 监控任务表（monitoring_task）
```
- id: 任务ID
- target_url: 目标URL
- status: 监控状态（运行中/已停止/已完成）
- start_time: 开始时间
- end_time: 结束时间
- config: 监控配置（JSON）
```

### 4.2 请求记录表（http_request）
```
- id: 请求ID
- task_id: 所属任务
- url: 请求URL
- method: HTTP方法
- headers: 请求头（JSON）
- query_params: Query参数（JSON）
- body_params: Body参数（JSON）
- timestamp: 请求时间
- parent_request_id: 父请求ID（建立调用链）
```

### 4.3 响应记录表（http_response）
```
- id: 响应ID
- request_id: 对应请求ID
- status_code: HTTP状态码
- headers: 响应头（JSON）
- body: 响应体（JSON/TEXT）
- size: 响应大小
- duration: 响应时长
```

### 4.4 AI分析结果表（api_analysis）
```
- id: 分析ID
- request_id: 对应请求ID
- api_purpose: 接口用途（登录/列表/详情等）
- operation_type: 操作类型（CRUD）
- data_schema: 数据结构（JSON Schema）
- pagination_info: 分页信息（JSON）
- relationships: 关联关系（JSON）
- ai_insights: AI分析洞察（TEXT）
- confidence: 置信度
```

### 4.5 数据关系表（data_relationship）
```
- id: 关系ID
- source_request_id: 源请求ID
- target_request_id: 目标请求ID
- relationship_type: 关系类型（主从/分页/详情跳转）
- field_mapping: 字段映射（JSON）
- description: 关系描述
```

### 4.6 API文档表（api_documentation）
```
- id: 文档ID
- task_id: 所属任务
- api_path: 接口路径（去参数化，如/api/user/{id}）
- api_name: 接口名称（AI生成）
- api_description: 接口描述（AI生成）
- http_method: HTTP方法
- category: 接口分类（用户/商品/订单等）
- auth_required: 是否需要认证
- auth_type: 认证类型（Cookie/Token/None）
- request_headers: 请求头定义（JSON Schema）
- request_params: 请求参数定义（JSON Schema）
- response_schema: 响应数据定义（JSON Schema）
- request_examples: 请求示例（JSON数组）
- response_examples: 响应示例（JSON数组）
- error_codes: 错误码说明（JSON）
- code_samples: 代码示例（JSON，多语言）
- openapi_spec: OpenAPI规范（JSON）
- created_at: 创建时间
- updated_at: 更新时间
```

### 4.7 API分组表（api_group）
```
- id: 分组ID
- task_id: 所属任务
- group_name: 分组名称（如"用户管理"）
- description: 分组描述
- base_url: 基础URL
- order: 排序
```

## 五、核心流程

### 5.1 监控流程（Electron客户端模式）
```
1. 用户启动Devtool Electron客户端
2. 在主窗口输入目标URL（如 https://weibo.com）
3. 点击"开始监控"按钮
4. Electron创建新的BrowserWindow，加载目标URL
5. Main进程注册webRequest拦截器（onBeforeRequest/onCompleted）
6. 用户在浏览器窗口中手动操作：
   - 登录账号
   - 浏览列表、翻页
   - 点击详情
   - 搜索、筛选等
7. 拦截器实时捕获所有网络请求：
   - 请求URL、Method、Headers
   - 请求参数（Query/Body）
   - 响应Status、Headers、Body
8. 客户端通过HTTP POST发送到后端：
   POST /api/devtool/requests
   {
     taskId: "xxx",
     url: "...",
     method: "GET",
     requestHeaders: {...},
     requestBody: {...},
     responseStatus: 200,
     responseBody: {...}
   }
9. 后端实时存储到PostgreSQL
10. 主窗口实时展示捕获的请求列表（通过IPC通信）
11. 用户操作完成后，点击"完成监控"或关闭浏览器窗口
12. 客户端发送完成信号到后端：POST /api/devtool/tasks/{id}/complete
13. 后端触发AI分析和文档生成
14. WebSocket推送分析进度到客户端
15. 文档生成完成，客户端提示用户
16. 用户可在@pro/admin Web界面查看完整文档
```

### 5.2 分析流程
```
1. 从数据库批量读取请求数据
2. 按URL分组归类
3. 对每组请求构建分析prompt
4. 调用AI API进行分析
5. 解析AI返回的结构化结果
6. 存储分析结果到数据库
7. 建立数据关系图谱
```

### 5.3 关系发现流程
```
1. 识别列表接口（返回数组数据）
2. 识别详情接口（通过ID参数关联）
3. 分析分页参数（page/pageSize/offset/cursor）
4. 发现字段引用（ID字段在不同接口间传递）
5. 构建数据依赖图
```

### 5.4 文档生成流程（核心）
```
1. URL模式归并（/api/user/123 → /api/user/{id}）
2. 提取公共请求头（如Authorization）
3. 生成请求参数JSON Schema
4. 生成响应数据JSON Schema
5. AI生成接口名称和描述
6. AI识别接口分类和标签
7. 生成请求/响应示例
8. 生成错误码说明
9. 生成代码示例（curl/JS/Python）
10. 组装OpenAPI 3.0规范文档
11. 存储到api_documentation表
12. 支持导出多种格式
```

### 5.5 代码示例生成流程
```
1. 基于请求参数生成curl命令
2. 生成JavaScript (fetch/axios) 示例
3. 生成Python (requests) 示例
4. 生成Java (OkHttp/RestTemplate) 示例
5. 自动处理认证Header
6. 使用真实的请求示例数据
```

## 六、任务拆分

### 阶段一：基础设施（优先级：高）
- [ ] T1.1 创建数据库表结构和Entity（后端）
- [ ] T1.2 实现监控任务CRUD接口（后端）
- [ ] T1.3 初始化Electron项目（客户端）
- [ ] T1.4 实现Electron主窗口UI（客户端）

**依赖关系**：T1.2依赖T1.1，T1.3和T1.4独立

### 阶段二：网络监控（优先级：高）
- [ ] T2.1 实现Electron BrowserWindow创建（客户端）
- [ ] T2.2 实现session.webRequest拦截器（客户端）
- [ ] T2.3 实现请求数据发送到后端（客户端→后端）
- [ ] T2.4 实现后端接收接口（后端）
- [ ] T2.5 实现请求/响应数据存储（后端）
- [ ] T2.6 实现IPC通信展示请求列表（客户端）

**依赖关系**：T2.1 → T2.2 → T2.3，T2.4独立，T2.5依赖T2.4，T2.6依赖T2.2

### 阶段三：AI分析引擎（优先级：中）
- [ ] T3.1 设计AI分析Prompt模板
- [ ] T3.2 实现单请求分析功能
- [ ] T3.3 实现批量请求归类分析
- [ ] T3.4 实现数据关系发现算法
- [ ] T3.5 实现分页模式识别

**依赖关系**：T3.1 → T3.2, T3.3, T3.4, T3.5（后四者可并行）

### 阶段四：数据关系图谱（优先级：中）
- [ ] T4.1 实现请求调用链分析
- [ ] T4.2 实现数据依赖关系构建
- [ ] T4.3 实现关系图谱存储

**依赖关系**：T4.1和T4.2可并行，T4.3依赖前两者

### 阶段五：文档生成引擎（优先级：高）
- [ ] T5.1 实现URL模式归并算法
- [ ] T5.2 实现JSON Schema自动生成
- [ ] T5.3 实现OpenAPI 3.0规范组装
- [ ] T5.4 实现多语言代码示例生成
- [ ] T5.5 实现文档导出功能（Markdown/JSON/YAML）
- [ ] T5.6 集成Swagger UI在线预览

**依赖关系**：T5.1 → T5.2 → T5.3，T5.4和T5.5依赖T5.3，T5.6依赖T5.3

### 阶段六：前端展示（优先级：中）
- [ ] T6.1 @pro/admin监控任务管理页面（Web端）
- [ ] T6.2 @pro/admin API文档预览页面（Web端）
- [ ] T6.3 @pro/admin Markdown文档下载功能（Web端）
- [ ] T6.4 Electron客户端实时请求列表UI（客户端）
- [ ] T6.5 Electron客户端任务状态展示（客户端）
- [ ] T6.6 WebSocket实时通信（客户端↔后端）

**依赖关系**：T6.1/T6.2/T6.3独立（Web端），T6.4/T6.5依赖阶段二，T6.6独立

## 七、技术难点与解决方案

### 7.1 Electron窗口管理
**问题**：如何管理浏览器窗口和主窗口的交互
**方案**：
- 单任务模式：同一时间只允许一个监控任务
- BrowserWindow生命周期管理：
  - 创建时注册webRequest拦截器
  - 关闭时自动移除拦截器
  - 通过IPC向主窗口发送事件
- 窗口状态同步：
  - `browser-window-created` 事件通知主窗口
  - `closed` 事件触发任务完成流程

### 7.2 请求响应体获取
**问题**：webRequest API无法直接获取响应body
**方案**：
- 方案A：使用`webContents.debugger`（CDP协议）
  ```js
  win.webContents.debugger.attach('1.3')
  win.webContents.debugger.sendCommand('Network.enable')
  win.webContents.debugger.on('message', (event, method, params) => {
    if (method === 'Network.responseReceived') {
      // 获取响应体
    }
  })
  ```
- 方案B：注入脚本拦截fetch/xhr
  ```js
  win.webContents.executeJavaScript(`
    // 重写fetch和XMLHttpRequest
  `)
  ```
- **推荐方案A**：更底层、更完整

### 7.3 客户端与后端通信
**问题**：Electron如何与NestJS后端通信
**方案**：
- HTTP请求发送数据（axios）
- WebSocket接收分析进度
- 后端地址配置化（支持本地/远程）

### 7.4 加密或混淆的接口参数
**问题**：参数加密导致AI无法理解
**方案**：记录原始加密参数，尝试从JS代码中提取加密逻辑

### 7.5 大量请求的AI分析成本
**问题**：每个请求都调用AI成本高
**方案**：
- 按URL模式去重（/api/user/123 和 /api/user/456 视为同一接口）
- 批量分析相似请求
- 缓存分析结果

### 7.6 复杂的数据关系识别
**问题**：数据间关系隐蔽且复杂
**方案**：
- 通过字段名相似度匹配（如userId和id）
- 通过数据值匹配（一个接口返回的ID在另一个接口请求中出现）
- 时序分析（先请求列表再请求详情）

### 7.7 WebSocket和SSE监控
**问题**：实时通信协议的监控
**方案**：扩展监控能力支持WebSocket和Server-Sent Events（Electron CDP原生支持）

### 7.8 URL参数化识别
**问题**：如何识别/api/user/123和/api/user/456是同一个接口
**方案**：
- 使用正则匹配数字/UUID模式
- 通过响应结构相似度判断
- AI识别路径参数语义（如{id}/{userId}）

### 7.9 动态字段处理
**问题**：不同请求返回字段不一致
**方案**：
- 合并多个样本生成完整Schema
- 标记可选字段（optional）
- 记录字段出现频率

### 7.10 认证方式识别
**问题**：如何识别接口的认证方式
**方案**：
- 检测Authorization Header
- 检测Cookie中的token
- 分析401/403响应
- AI识别登录接口流程

## 八、迭代计划

### MVP版本（最小可行产品）
- 基础监控功能（HTTP请求记录）
- URL模式归并和去重
- 简单的AI分析（接口用途识别）
- **生成基础OpenAPI文档（核心）**
- **导出JSON/YAML格式（核心）**

### V1.0版本（完整文档生成）
- 完整的网络监控
- AI深度分析（参数语义、数据关系）
- **生成完整OpenAPI 3.0规范**
- **生成多语言代码示例**
- **Swagger UI在线预览**
- **导出Markdown格式文档**
- 接口分类和标签
- 认证方式识别

### V2.0版本（高级功能）
- 支持浏览器扩展模式
- 支持WebSocket监控
- **导出Postman/Apifox格式**
- **生成API Mock Server配置**
- **生成SDK代码（TypeScript/Python）**
- 可视化调用链和关系图
- 智能爬虫建议（自动生成爬虫代码）

## 九、最终产出（重点）

### 9.1 核心产出：API接口文档
**格式1：OpenAPI 3.0规范文档**
- 标准JSON/YAML格式
- 可导入Swagger/Postman/Apifox
- 包含完整的请求/响应定义
- 包含认证配置
- 包含服务器地址

**格式2：Markdown文档**
- 适合人类阅读
- 包含目录和分类
- 每个接口独立章节
- 包含代码示例
- 可导出为HTML/PDF

**格式3：在线文档**
- Swagger UI在线预览
- 支持在线测试接口
- 支持分享链接

### 9.2 辅助产出
1. **代码示例库**：curl/JavaScript/Python/Java调用示例
2. **数据字典**：字段含义和类型说明
3. **接口调用关系图**：可视化接口依赖
4. **认证指南**：如何获取和使用Token/Cookie
5. **错误码文档**：常见错误及解决方案

### 9.3 文档质量标准
- ✅ 每个接口有清晰的名称和描述
- ✅ 每个参数有类型、是否必填、含义说明
- ✅ 每个响应有完整的数据结构定义
- ✅ 提供真实的请求/响应示例
- ✅ 标注接口间的关联关系
- ✅ 提供可运行的代码示例

## 十、核心决策（已确定✅）

### 监控方案
1. ✅ **登录态管理**：Playwright自动保持，无需额外操作
2. ✅ **用户操作**：用户直接操作Playwright浏览器界面，后台监控
3. ✅ **监控时长**：持续到用户主动关闭浏览器窗口
4. ✅ **多任务支持**：不需要多任务并行，单任务模式即可

### AI分析配置
5. ✅ **分析深度**：高级
   - 深度理解业务逻辑
   - 生成高质量业务文档
   - 智能推断字段含义和接口用途
   - 分析复杂的数据关系和业务流程

### 文档格式
6. ✅ **导出格式**：Markdown为主
   - 优先：Markdown（人类可读，易于编辑）
   - 可选：OpenAPI JSON/YAML（后续可扩展）
   - 可选：在线预览（后续可扩展）

### 代码示例
7. ✅ **代码语言**：基础支持
   - curl（必须）
   - JavaScript（可选）
   - Python（可选）

### 特殊场景
8. ❌ **加密接口**：暂不处理（记录原始数据即可）
9. ❌ **GraphQL**：暂不支持（聚焦REST API）
10. ❌ **Mock Server/SDK**：暂不支持（后续扩展）

---

## 十一、使用流程详解

### 完整使用流程（Electron方案）
```
第1步：启动Devtool客户端
  • 用户双击打开Devtool.exe（或Mac/Linux版本）
  • 主窗口展示：输入框、开始按钮、请求列表区域

第2步：创建监控任务
  • 在主窗口输入目标URL（如：https://weibo.com）
  • （可选）填写任务名称
  • 点击"开始监控"按钮
  • 客户端调用后端API：POST /api/devtool/tasks
  • 后端创建monitoring_task记录，返回taskId

第3步：浏览器窗口启动
  • Electron创建新的BrowserWindow
  • 加载目标URL
  • Main进程注册webRequest拦截器
  • Main进程启用webContents.debugger（获取响应体）
  • 浏览器窗口展示给用户

第4步：用户手动操作
  • 用户在浏览器窗口中操作：
    - 登录账号（自动保持登录态）
    - 浏览列表页（滚动加载更多）
    - 点击详情页
    - 搜索、筛选、分页等任意操作
  • 拦截器实时捕获所有网络请求
  • 通过IPC发送到渲染进程，主窗口实时展示请求列表
  • 同时通过HTTP POST发送到后端存储

第5步：完成监控
  • 用户操作完成后，关闭浏览器窗口
  • 或点击主窗口"完成监控"按钮
  • 客户端发送完成信号：POST /api/devtool/tasks/{id}/complete
  • 后端标记任务状态为"已完成"
  • 触发AI分析流程

第6步：AI自动分析
  • URL模式归并（去重相似接口）
  • 生成JSON Schema
  • 调用Claude API高级分析：
    - 深度理解业务逻辑
    - 推断字段含义
    - 识别数据关系
  • WebSocket推送分析进度到客户端

第7步：生成Markdown文档
  • 组装Markdown格式API文档
  • 生成curl代码示例
  • 存储到api_documentation表
  • 客户端收到完成通知，弹窗提示

第8步：查看和导出
  • 用户打开@pro/admin Web界面
  • 查看历史监控任务列表
  • 预览生成的Markdown文档
  • 下载文档到本地
  • 复制代码示例
```

### Electron客户端界面
```
┌─────────────────── Devtool 主窗口 ──────────────────────┐
│  目标URL: [https://weibo.com______________] [开始监控]  │
│  任务名称: [微博API分析__________________]  (可选)       │
├────────────────────────────────────────────────────────┤
│  实时捕获的请求 (23个)                 状态: ⚫ 监控中    │
│  ┌────────────────────────────────────────────────────┐│
│  │ ✅ GET  /api/search?q=keyword&page=1    200  234ms ││
│  │ ✅ GET  /api/user/profile?uid=123456    200  156ms ││
│  │ ✅ GET  /api/weibo/detail?id=789        200  198ms ││
│  │ ✅ POST /api/comment/list               200  267ms ││
│  │ ✅ GET  /api/weibo/comments?id=789      200  189ms ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  [完成监控]  [清空列表]  [导出原始数据]                 │
└────────────────────────────────────────────────────────┘

    ↓ 点击"开始监控"后，弹出浏览器窗口

┌──────────────── 浏览器窗口 (BrowserWindow) ─────────────┐
│  ← → ⟳  https://weibo.com                     ⊗ ⊡ ✕    │
├────────────────────────────────────────────────────────┤
│                                                        │
│              [微博网站内容]                             │
│         用户在此处正常操作                              │
│         （登录、搜索、浏览、点击）                       │
│                                                        │
└────────────────────────────────────────────────────────┘

    ↓ 关闭浏览器窗口或点击"完成监控"

┌─────────────────── 分析进度弹窗 ─────────────────────────┐
│  🤖 AI正在分析...                                       │
│  ┌────────────────────────────────────────────────────┐│
│  │ ✅ URL模式归并完成 (发现12个唯一接口)                 ││
│  │ ✅ JSON Schema生成完成                              ││
│  │ ⏳ Claude API分析中... (3/12)                       ││
│  │ ⬜ Markdown文档生成                                 ││
│  └────────────────────────────────────────────────────┘│
│                            [后台运行]  [查看详情]       │
└────────────────────────────────────────────────────────┘

    ↓ 分析完成

┌─────────────────── 完成通知 ─────────────────────────────┐
│  ✅ API文档生成成功！                                    │
│                                                        │
│  • 发现 12 个API接口                                    │
│  • 生成 Markdown 文档 (56KB)                           │
│  • 包含 curl 代码示例                                   │
│                                                        │
│  [在@pro/admin中查看]  [导出Markdown]  [关闭]          │
└────────────────────────────────────────────────────────┘
```

### @pro/admin Web界面
```
┌────────────────────────────────────────────────────────┐
│  Devtool 监控任务管理                                   │
├────────────────────────────────────────────────────────┤
│  任务名称          目标URL        状态      创建时间     │
│  微博API分析      weibo.com      已完成    2025-10-09  │
│  淘宝商品接口      taobao.com     已完成    2025-10-08  │
│  内部系统API      admin.local    运行中    2025-10-09  │
└────────────────────────────────────────────────────────┘

[点击任意任务查看详情]
┌────────────────────────────────────────────────────────┐
│  微博API分析 - 接口文档                                 │
├────────────────────────────────────────────────────────┤
│  [Markdown预览] [下载文档] [复制全部]                   │
│                                                        │
│  # 微博搜索API文档                                      │
│                                                        │
│  ## 1. 搜索接口                                         │
│  **接口路径**: GET /api/search                         │
│  **接口描述**: 根据关键词搜索微博内容，支持分页         │
│                                                        │
│  ### 请求参数                                           │
│  | 参数名 | 类型   | 必填 | 说明           |           │
│  | q      | string | 是   | 搜索关键词     |           │
│  | page   | number | 否   | 页码，默认1    |           │
│                                                        │
│  ### 代码示例                                           │
│  ```bash                                               │
│  curl 'https://weibo.com/api/search?q=AI&page=1'       │
│  ```                                                   │
└────────────────────────────────────────────────────────┘
```

## 十二、Electron技术实现要点

### 12.1 核心代码结构
```
devtool-electron/
├── src/
│   ├── main/              # 主进程
│   │   ├── index.ts       # 入口文件
│   │   ├── window.ts      # 窗口管理
│   │   ├── interceptor.ts # 请求拦截
│   │   ├── api.ts         # 后端通信
│   │   └── ipc.ts         # IPC处理
│   ├── renderer/          # 渲染进程（主窗口UI）
│   │   ├── index.html
│   │   ├── app.ts
│   │   └── components/
│   └── preload/           # 预加载脚本
│       └── index.ts
├── package.json
└── electron-builder.yml   # 打包配置
```

### 12.2 请求拦截实现（关键）
```typescript
// src/main/interceptor.ts
import { session } from 'electron';

export function setupInterceptor(taskId: string) {
  // 方案：使用webContents.debugger获取完整响应

  win.webContents.debugger.attach('1.3');

  // 启用网络监控
  win.webContents.debugger.sendCommand('Network.enable');

  // 监听请求
  win.webContents.debugger.on('message', async (event, method, params) => {

    if (method === 'Network.requestWillBeSent') {
      const { requestId, request } = params;
      // 记录请求信息
      requestMap.set(requestId, {
        url: request.url,
        method: request.method,
        headers: request.headers,
        postData: request.postData
      });
    }

    if (method === 'Network.responseReceived') {
      const { requestId, response } = params;
      // 获取响应体
      const { body } = await win.webContents.debugger.sendCommand(
        'Network.getResponseBody',
        { requestId }
      );

      // 组装完整数据
      const requestData = requestMap.get(requestId);
      const fullData = {
        taskId,
        ...requestData,
        responseStatus: response.status,
        responseHeaders: response.headers,
        responseBody: body
      };

      // 发送到后端
      await sendToBackend(fullData);

      // IPC通知渲染进程更新UI
      win.webContents.send('request-captured', fullData);
    }
  });
}
```

### 12.3 IPC通信设计
```typescript
// Main进程 → Renderer进程
ipcMain.handle('start-monitoring', async (event, url, taskName) => {
  const task = await createTask(url, taskName);
  createBrowserWindow(task.id, url);
  return task;
});

ipcMain.handle('stop-monitoring', async (event, taskId) => {
  await completeTask(taskId);
  closeBrowserWindow();
});

// Renderer进程监听
ipcRenderer.on('request-captured', (event, request) => {
  // 更新请求列表UI
  addRequestToList(request);
});

ipcRenderer.on('analysis-progress', (event, progress) => {
  // 更新分析进度
  updateProgress(progress);
});
```

### 12.4 与后端通信
```typescript
// src/main/api.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3000'; // 可配置

// 创建任务
export async function createTask(url: string, name?: string) {
  const { data } = await axios.post(`${API_BASE}/api/devtool/tasks`, {
    targetUrl: url,
    taskName: name
  });
  return data;
}

// 发送请求数据
export async function sendRequest(requestData: any) {
  await axios.post(`${API_BASE}/api/devtool/requests`, requestData);
}

// 完成任务
export async function completeTask(taskId: string) {
  await axios.post(`${API_BASE}/api/devtool/tasks/${taskId}/complete`);
}

// WebSocket接收分析进度
export function connectWebSocket(taskId: string) {
  const ws = new WebSocket(`ws://localhost:3000/devtool/${taskId}`);

  ws.on('message', (data) => {
    const progress = JSON.parse(data);
    // 通知渲染进程
    mainWindow.webContents.send('analysis-progress', progress);
  });
}
```

### 12.5 打包配置
```yaml
# electron-builder.yml
appId: com.sker.devtool
productName: Devtool
directories:
  output: dist
  buildResources: resources
files:
  - src/**/*
  - package.json
win:
  target: nsis
  icon: resources/icon.ico
mac:
  target: dmg
  icon: resources/icon.icns
linux:
  target: AppImage
  icon: resources/icon.png
```

### 12.6 关键依赖
```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "axios": "^1.6.0",
    "ws": "^8.0.0"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 十三、使用场景举例

### 场景1：逆向分析竞品API（微博搜索）
```
1. 启动Devtool客户端
2. 输入目标URL：https://weibo.com
3. 点击"开始监控"，浏览器窗口弹出
4. 用户手动登录微博账号
5. 在搜索框输入关键词"AI"并搜索
6. 浏览搜索结果，翻页到第3页
7. 点击某条微博查看详情
8. 查看评论列表
9. 关闭浏览器窗口，点击"完成监控"
10. 客户端显示分析进度（实时WebSocket推送）
11. AI自动分析，生成Markdown文档：
    - /api/search 搜索接口文档
    - /api/weibo/detail 详情接口文档
    - /api/comment/list 评论接口文档
    - 分页参数分析（page/count）
    - 数据关系（搜索→详情→评论）
12. 在@pro/admin中查看完整文档
13. 下载Markdown文件，用于开发微博爬虫
```

### 场景2：爬虫开发前期调研（电商网站）
```
1. 启动Devtool，输入电商网站URL
2. 浏览器窗口打开，用户手动操作：
   - 搜索商品
   - 筛选价格、品牌
   - 查看商品详情
   - 浏览评论
3. 主窗口实时展示捕获的23个API请求
4. 完成监控，后台AI分析生成：
   - 商品搜索接口（带筛选参数）
   - 商品详情接口
   - 评论列表接口（含分页）
   - 价格变动接口
5. Markdown文档包含curl代码示例
6. 复制代码示例，快速开发爬虫脚本
```

### 场景3：内部系统API文档自动化（前后端协作）
```
1. 前端开发者启动Devtool
2. 输入内部系统URL（如 http://admin.local）
3. 浏览器窗口中操作所有功能模块：
   - 用户管理（增删改查）
   - 订单管理（列表、详情、导出）
   - 数据统计（报表、图表）
4. 完成监控，生成完整API文档
5. 在@pro/admin中预览Markdown文档
6. 下载并分享给后端团队Review
7. 发现文档缺失或接口设计问题
8. 优化接口设计或补充注释
9. 将文档集成到项目README
```

---

## 十四、最终技术决策总结 ✅

### 架构选型
| 组件 | 技术方案 | 理由 |
|------|---------|------|
| **客户端** | Electron桌面应用 | 完美拦截请求、用户体验好、跨平台 |
| **后端** | NestJS（@pro/admin集成） | 复用现有技术栈 |
| **数据库** | PostgreSQL + TypeORM | 现有基础设施 |
| **AI分析** | Claude API（高级模式） | 深度理解业务逻辑 |
| **文档格式** | Markdown为主 | 易读易编辑，可扩展OpenAPI |
| **通信协议** | HTTP + WebSocket | 数据发送+实时推送 |

### 核心流程
```
Electron客户端（拦截请求）
    ↓ HTTP POST
@pro/admin后端（存储数据）
    ↓ 任务完成触发
AI分析引擎（Claude高级分析）
    ↓ WebSocket推送进度
文档生成（Markdown + curl示例）
    ↓
@pro/admin Web界面（查看/下载）
```

### 关键技术点
1. **请求拦截**：`webContents.debugger` + CDP协议（完整获取响应体）
2. **窗口管理**：单任务模式，BrowserWindow生命周期管理
3. **IPC通信**：Main进程 ↔ Renderer进程实时数据同步
4. **URL归并**：正则匹配 + AI识别路径参数
5. **高级分析**：深度理解业务逻辑，生成高质量文档

### 开发优先级
**Phase 1（MVP）**：
- ✅ Electron基础框架 + 请求拦截
- ✅ 后端数据存储
- ✅ 基础AI分析 + Markdown生成

**Phase 2（完善）**：
- 🔄 WebSocket实时通信
- 🔄 @pro/admin Web管理界面
- 🔄 深度AI分析和数据关系发现

**Phase 3（增强）**：
- 📋 OpenAPI导出
- 📋 多语言代码示例
- 📋 可视化调用链

### 预期成果
- 🎯 **核心产出**：高质量Markdown API文档
- 🎯 **分析深度**：理解业务逻辑，不只是接口结构
- 🎯 **用户体验**：桌面应用，操作流畅
- 🎯 **集成性**：与@pro/admin无缝集成

**方案已完整，可以开始实施！** 🚀
