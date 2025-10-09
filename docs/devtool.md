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

### 3.1 浏览器监控方案
**选项A：Puppeteer + Chrome DevTools Protocol**
- 优势：完整控制浏览器，可监控所有网络请求
- 适用：需要执行JavaScript的动态页面

**选项B：浏览器扩展（Chrome Extension）**
- 优势：用户友好，可手动操作页面
- 适用：需要人工交互的复杂场景

**选项C：代理服务器（mitmproxy）**
- 优势：可监控任何应用的HTTP流量
- 适用：需要监控移动端或其他客户端

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
- **后端**：NestJS（已有技术栈）
- **监控层**：Puppeteer / Playwright
- **数据层**：PostgreSQL + TypeORM
- **AI层**：Claude API / OpenAI API
- **前端**：Angular（已有技术栈）

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

### 5.1 监控流程
```
1. 用户输入目标URL
2. 启动Puppeteer浏览器实例
3. 启用Chrome DevTools Protocol监控
4. 访问目标URL
5. 拦截所有网络请求
6. 解析请求参数和响应数据
7. 实时存储到数据库
8. 建立请求调用链关系
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
- [ ] T1.1 创建数据库表结构和Entity
- [ ] T1.2 实现监控任务CRUD接口
- [ ] T1.3 搭建Puppeteer监控服务

**依赖关系**：T1.2依赖T1.1，T1.3独立

### 阶段二：网络监控（优先级：高）
- [ ] T2.1 实现Chrome DevTools Protocol集成
- [ ] T2.2 实现请求拦截和数据捕获
- [ ] T2.3 实现请求/响应数据存储
- [ ] T2.4 实现调用链关系建立

**依赖关系**：T2.1 → T2.2 → T2.3, T2.4依赖T2.3

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
- [ ] T6.1 监控任务管理界面
- [ ] T6.2 请求列表和详情展示
- [ ] T6.3 调用链可视化组件
- [ ] T6.4 数据关系图可视化
- [ ] T6.5 API文档在线预览和导出
- [ ] T6.6 代码示例展示和复制

**依赖关系**：T6.1独立，其他依赖对应后端接口

## 七、技术难点与解决方案

### 7.1 动态加载页面的监控
**问题**：SPA应用通过Ajax异步加载数据
**方案**：使用Puppeteer等待页面完全加载，监控所有XHR/Fetch请求

### 7.2 加密或混淆的接口参数
**问题**：参数加密导致AI无法理解
**方案**：记录原始加密参数，尝试从JS代码中提取加密逻辑

### 7.3 大量请求的AI分析成本
**问题**：每个请求都调用AI成本高
**方案**：
- 按URL模式去重（/api/user/123 和 /api/user/456 视为同一接口）
- 批量分析相似请求
- 缓存分析结果

### 7.4 复杂的数据关系识别
**问题**：数据间关系隐蔽且复杂
**方案**：
- 通过字段名相似度匹配（如userId和id）
- 通过数据值匹配（一个接口返回的ID在另一个接口请求中出现）
- 时序分析（先请求列表再请求详情）

### 7.5 WebSocket和SSE监控
**问题**：实时通信协议的监控
**方案**：扩展监控能力支持WebSocket和Server-Sent Events

### 7.6 URL参数化识别
**问题**：如何识别/api/user/123和/api/user/456是同一个接口
**方案**：
- 使用正则匹配数字/UUID模式
- 通过响应结构相似度判断
- AI识别路径参数语义（如{id}/{userId}）

### 7.7 动态字段处理
**问题**：不同请求返回字段不一致
**方案**：
- 合并多个样本生成完整Schema
- 标记可选字段（optional）
- 记录字段出现频率

### 7.8 认证方式识别
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

## 十、开放问题（待确认）

### 监控范围
1. 是否需要支持登录态管理（自动保持Cookie/Token）？
2. 是否需要模拟用户行为（点击、滚动、表单填写）触发更多请求？
3. 是否需要支持多任务并行监控（同时监控多个网站）？
4. 监控时长如何控制（固定时间/手动停止/请求数量达标）？

### AI分析深度
5. AI分析需要多深入？
   - 基础：识别接口类型（CRUD）、参数类型
   - 中级：理解字段含义、数据关系
   - 高级：理解业务逻辑、生成业务文档

### 文档格式
6. 优先支持哪些导出格式？
   - 必须：OpenAPI JSON/YAML
   - 重要：Markdown、Swagger UI
   - 可选：Postman Collection、Apifox、HTML/PDF

### 代码示例
7. 需要支持哪些编程语言的代码示例？
   - 建议：curl、JavaScript、Python
   - 可选：Java、Go、PHP、Ruby

### 特殊场景
8. 是否需要处理加密接口（参数加密/签名）？
9. 是否需要支持GraphQL接口？
10. 是否需要生成Mock Server配置或SDK代码？

---

## 十一、使用场景举例

### 场景1：逆向分析竞品API
```
1. 输入竞品网站URL：https://example.com
2. 自动打开页面，操作翻页/点击详情等
3. 后台捕获所有API请求
4. AI分析生成完整API文档
5. 导出OpenAPI文档供开发团队使用
```

### 场景2：爬虫开发前期调研
```
1. 监控目标网站的数据接口
2. 理解分页逻辑和参数规则
3. 发现数据间的关联关系
4. 生成curl示例和Python代码
5. 快速开发爬虫脚本
```

### 场景3：前后端协作
```
1. 前端开发者监控现有系统API
2. 自动生成API文档
3. 导入Postman/Apifox
4. 分享给后端团队Review
5. 补充文档或优化接口设计
```
