# 微博 MCP 自动化操作系统

## 项目概述

基于 MCP (Model Context Protocol) 协议，实现一个微博自动化操作系统。通过 Playwright + Cookie + AI 大模型的组合，让 AI 能够自主分析页面并执行操作。

## 当前进度

- ✅ 已获取微博 Cookie
- 🔲 待实现：Playwright + Cookie 页面渲染
- 🔲 待实现：HTML 分析与 AI 决策
- 🔲 待实现：操作执行引擎

## 核心架构

```
用户指令 → MCP Server → Playwright 渲染 → AI 分析 HTML → 选择操作 → 执行动作 → 反馈结果
```

## 技术方案

### 1. MCP Server 层
- 基于 MCP SDK 创建服务器
- 提供工具接口供 Claude 调用
- 管理 Playwright 浏览器实例生命周期

### 2. Playwright 浏览器控制层
- 启动浏览器实例（headless 或 有头模式）
- 注入已有的微博 Cookie
- 导航到目标网址
- 获取渲染后的 HTML/截图

### 3. AI 决策层
- 将当前页面状态（HTML/截图/可交互元素）发送给 AI
- AI 分析可执行的操作选项
- 根据任务目标选择下一步操作

### 4. 操作执行层
支持的操作类型：
- **点击操作**：点击按钮、链接、元素
- **输入操作**：填写表单、输入框
- **滚动操作**：页面滚动、加载更多
- **导航操作**：前进、后退、刷新
- **等待操作**：等待元素出现、等待加载完成
- **数据提取**：提取文本、链接、图片等信息

## 任务拆分

### 阶段一：基础架构搭建（依赖：无）

#### 任务 1.1：创建 MCP Server 项目结构
- 创建独立的 MCP 服务包
- 配置 TypeScript + MCP SDK 依赖
- 定义基础配置文件

#### 任务 1.2：Playwright 集成
- 集成 Playwright 库
- 实现浏览器实例管理
- 实现 Cookie 注入功能

#### 任务 1.3：定义 MCP Tools 接口
- `weibo_navigate`：导航到指定 URL
- `weibo_get_page_state`：获取当前页面状态
- `weibo_click`：点击元素
- `weibo_input`：输入文本
- `weibo_scroll`：滚动页面
- `weibo_extract_data`：提取数据

### 阶段二：页面分析能力（依赖：阶段一完成）

#### 任务 2.1：HTML 简化与结构化
- 提取可交互元素（按钮、链接、输入框）
- 为每个元素生成唯一标识符
- 移除无关的样式和脚本内容
- 生成简化的 DOM 树结构

#### 任务 2.2：页面状态描述
- 提取页面标题和主要内容
- 识别当前页面类型（首页/搜索页/详情页等）
- 列出所有可执行操作的元素列表

#### 任务 2.3：视觉辅助（可选）
- 生成页面截图
- 在截图上标注可交互元素
- 提供视觉 + 文本的双重输入

### 阶段三：操作执行引擎（依赖：阶段一完成）

#### 任务 3.1：元素定位器
- 实现多种选择器策略（CSS、XPath、文本）
- 元素可见性检查
- 智能等待与重试机制

#### 任务 3.2：操作执行器
- 实现点击操作（普通点击、右键、双击）
- 实现输入操作（输入、清空、按键）
- 实现滚动操作（滚动到元素、滚动距离）
- 实现导航操作（后退、前进、刷新）

#### 任务 3.3：操作验证与反馈
- 操作前验证元素状态
- 操作后确认结果
- 错误处理与重试

### 阶段四：AI 决策集成（依赖：阶段二、阶段三完成）

#### 任务 4.1：提示词工程
- 设计系统提示词模板
- 定义操作选择的输出格式
- 提供任务上下文和历史记录

#### 任务 4.2：决策循环
- 获取当前页面状态
- 发送给 AI 分析
- 解析 AI 返回的操作指令
- 执行操作并获取反馈
- 循环直到任务完成

#### 任务 4.3：任务管理
- 任务目标跟踪
- 操作历史记录
- 成功/失败判定

### 阶段五：微博特定功能（依赖：阶段四完成）

#### 任务 5.1：微博常见操作封装
- 发布微博
- 搜索内容
- 点赞/评论/转发
- 关注/取关用户
- 浏览热搜

#### 任务 5.2：数据采集
- 采集微博内容
- 采集用户信息
- 采集评论数据
- 采集热搜数据

#### 任务 5.3：反爬虫处理
- 随机延迟
- 行为模拟（鼠标移动、滚动）
- 请求频率控制

### 阶段六：测试与优化（依赖：阶段五完成）

#### 任务 6.1：单元测试
- MCP Server 接口测试
- Playwright 操作测试
- 元素定位测试

#### 任务 6.2：集成测试
- 完整任务流程测试
- 异常场景测试
- 性能测试

#### 任务 6.3：文档与示例
- API 文档
- 使用示例
- 最佳实践

## 执行顺序

```
阶段一（1.1 → 1.2 → 1.3）
    ↓
阶段二（2.1 → 2.2 → 2.3可选）并行 阶段三（3.1 → 3.2 → 3.3）
    ↓
阶段四（4.1 → 4.2 → 4.3）
    ↓
阶段五（5.1 并行 5.2 并行 5.3）
    ↓
阶段六（6.1 → 6.2 → 6.3）
```

## 核心技术深度分析

### 1. Accessibility Tree 方案（Microsoft Playwright MCP）

**为什么用 Accessibility Tree 而不是 HTML？**

| 对比项 | HTML 分析 | Accessibility Tree |
|--------|-----------|-------------------|
| 数据量 | 完整 DOM（包含样式、脚本、元数据） | 仅可交互元素 |
| 处理速度 | 慢（需要解析大量无关内容） | 快（精简后的树结构） |
| Token 消耗 | 高（大量 HTML 标签） | 低（YAML 格式，精简） |
| 准确性 | 可能包含隐藏/不可用元素 | 仅包含真正可访问的元素 |

**核心 API**：
```typescript
// 获取页面的 accessibility snapshot（YAML 格式）
const snapshot = await locator.ariaSnapshot();

// 示例输出：
// - button "登录" [ref=1]
// - textbox "用户名" [ref=2]
// - link "忘记密码" [ref=3]
```

**优势**：
- ✅ 自动过滤不可见和不可用的元素
- ✅ 提供语义化的元素描述（role + name）
- ✅ 生成唯一的 ref 引用，便于 AI 选择操作
- ✅ Chromium 会丢弃屏幕阅读器不用的节点（更轻量）

**实现架构**：
```
页面加载 → 生成 Accessibility Snapshot → 提取 YAML 结构
  → 发送给 AI 分析 → AI 返回 ref 编号 → 通过 ref 执行操作
```

### 2. 反爬虫处理方案（browser-use）

**核心策略**：

#### 方式一：云服务（推荐生产环境）
```python
from browser_use import Agent, Browser

browser = Browser(
    use_cloud=True,  # 使用托管浏览器服务
)
```
- 💰 费用：$30/月
- ✅ 优势：自动更新绕过策略，无需维护
- ✅ 适用：绕过 Cloudflare、PerimeterX 等主流反爬虫

#### 方式二：自建方案（技术要点）

**a. 浏览器指纹伪装**
- TLS 指纹一致性（确保 TLS 握手与真实浏览器一致）
- HTTP/2 指纹一致性（请求头顺序、大小写）
- WebGL/Canvas 指纹随机化

**b. Session 管理**
- Cookie 持久化存储
- User-Agent 与 Cookie 保持一致
- 保持会话的浏览器上下文（BrowserContext）

**c. 行为模拟**
```typescript
// 随机延迟
await page.waitForTimeout(Math.random() * 2000 + 1000);

// 鼠标轨迹模拟
await page.mouse.move(x1, y1);
await page.mouse.move(x2, y2, { steps: 10 });

// 人类化的滚动
await page.evaluate(() => {
  window.scrollBy({
    top: 300,
    behavior: 'smooth'
  });
});
```

**d. 频率控制**
- 请求间隔：2-5 秒随机延迟
- 并发限制：单账号避免多标签页同时操作
- 时段控制：避免深夜高频操作

**⚠️ 注意事项**：
- 开源方案容易被 Cloudflare 研究后封堵
- 生产环境建议使用专业服务（browser-use cloud / BrowserBase / ScrapingBee）
- 微博的反爬虫相对温和，主要关注：Cookie 有效性、请求频率、User-Agent

### 3. 混合模式设计（Stagehand）

**核心思想**：**熟悉用代码，陌生用 AI**

**三大 AI 方法**：

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand();
await stagehand.init();
const page = stagehand.page;

// 1. act() - 执行单个操作
await page.act("点击登录按钮");
await page.act("在用户名输入框输入: test@example.com");

// 2. extract() - 提取数据
const data = await page.extract({
  instruction: "提取所有微博的标题和点赞数",
  schema: z.object({
    posts: z.array(z.object({
      title: z.string(),
      likes: z.number()
    }))
  })
});

// 3. observe() - 观察页面状态
const observation = await page.observe();
```

**混合模式示例**：

```typescript
// 已知流程：用 Playwright 代码（快速、可靠）
await page.goto('https://weibo.com');
await page.fill('#username', 'myuser');
await page.fill('#password', 'mypass');
await page.click('button[type="submit"]');

// 未知页面：用 AI（灵活、适应性强）
await page.act("找到热搜榜单并点击第一个话题");
await page.act("滚动到评论区");

// 数据提取：用 extract（结构化输出）
const comments = await page.extract({
  instruction: "提取前10条评论的内容和点赞数",
  schema: commentSchema
});

// 继续已知操作：回到代码
await page.goBack();
await page.click('.home-button');
```

**优势对比**：

| 场景 | 传统 Playwright | Stagehand 混合模式 |
|------|----------------|-------------------|
| 登录表单（已知结构） | ✅ 快速、精确 | ✅ 代码模式，同样快 |
| 复杂页面（未知结构） | ❌ 需要分析 DOM | ✅ AI 自动识别 |
| 数据提取（结构化） | ❌ 需要写选择器 | ✅ 自然语言描述 |
| 生产稳定性 | ✅ 可控 | ✅ 代码+AI 结合，可控且灵活 |

**适用场景**：
- ✅ 多网站爬虫（每个网站结构不同）
- ✅ 动态变化的页面（需要适应性）
- ✅ 快速原型开发（减少选择器编写）

## 参考项目

### 1. Microsoft Playwright MCP ⭐（官方）
- **仓库**：https://github.com/microsoft/playwright-mcp
- **NPM**：@playwright/mcp
- **特点**：
  - 官方实现的 MCP + Playwright 集成
  - 使用浏览器的 **accessibility tree** 而非截图
  - 提供结构化的页面快照
  - 2025年3月发布，持续更新中

### 2. browser-use
- **仓库**：https://github.com/browser-use/browser-use
- **特点**：
  - 让 AI 代理能访问和操作网站
  - 支持多种 LLM（OpenAI GPT-4、Anthropic Claude、Meta Llama）
  - 提供云服务绕过 Cloudflare 和反爬虫
  - Python 实现：`pip install browser-use`

### 3. Stagehand（browserbase）
- **仓库**：https://github.com/browserbase/stagehand
- **特点**：
  - AI 浏览器自动化框架
  - 混合模式：熟悉的用代码，陌生的用 AI
  - 在 AI 和传统 Playwright 之间灵活切换

### 4. playwright-browser-agent
- **仓库**：https://github.com/leoch95/playwright-browser-agent
- **特点**：
  - 基于 LangGraph + LiteLLM
  - Playwright 浏览器控制
  - LLM 驱动的智能决策

### 5. Skyvern
- **仓库**：https://github.com/Skyvern-AI/skyvern
- **特点**：
  - LLM + 计算机视觉
  - 基于 Task-Driven autonomous agent 设计
  - 使用 Playwright 进行浏览器自动化

### 6. playwright-computer-use
- **仓库**：https://github.com/invariantlabs-ai/playwright-computer-use
- **特点**：
  - 让 Claude 直接控制浏览器
  - 连接 Playwright 到 Claude 的 computer use 能力

## 技术栈

- **MCP SDK**：@modelcontextprotocol/sdk
- **Playwright**：浏览器自动化
- **TypeScript**：类型安全
- **Zod**：参数验证

## 注意事项

1. **Cookie 安全**：Cookie 应该加密存储，不要硬编码
2. **频率限制**：避免过快操作触发反爬虫
3. **错误处理**：网络错误、元素找不到、操作失败都要妥善处理
4. **资源管理**：及时关闭浏览器实例，避免内存泄漏
5. **日志记录**：记录所有操作和决策过程，便于调试

## 待讨论问题

1. MCP Server 是独立服务还是集成到现有项目？
2. 浏览器实例是长期保持还是按需创建？
3. Cookie 存储方式和更新机制？
4. 如何定义"任务完成"的标准？
5. 需要支持多账号并发操作吗？
6. 是否需要验证码处理机制？

## 下一步

请确认：
1. 这个方案是否符合你的预期？
2. 有哪些需要调整或补充的地方？
3. 优先级最高的是哪个部分？
