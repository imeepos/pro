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

## 微博场景技术选型建议

基于以上分析，针对微博自动化操作的最佳实践：

### 推荐方案：混合架构

```
Microsoft Playwright MCP (Accessibility Tree)
    +
Stagehand 混合模式 (代码 + AI)
    +
自建反爬虫策略（微博相对温和）
```

### 具体实现建议

#### 1. 页面分析层：使用 Accessibility Tree
```typescript
// 获取微博首页的可交互元素
const snapshot = await page.locator('body').ariaSnapshot();

// 输出示例（精简的 YAML 结构）：
// - navigation
//   - link "首页" [ref=1]
//   - link "热搜" [ref=2]
// - main
//   - article [ref=3]
//     - link "用户名" [ref=4]
//     - button "点赞" [ref=5]
//     - button "评论" [ref=6]
```

**优势**：
- 减少 90% 的数据传输（相比完整 HTML）
- AI 分析速度提升 5-10 倍
- 自动过滤广告、统计脚本等无关元素

#### 2. 操作执行层：使用混合模式

**场景一：登录（已知流程）→ 用代码**
```typescript
await page.goto('https://weibo.com/login');
await page.fill('input[name="username"]', username);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForNavigation();
```

**场景二：搜索热搜话题（动态变化）→ 用 AI**
```typescript
const snapshot = await page.locator('body').ariaSnapshot();
// 发送给 AI 分析
const action = await askAI({
  snapshot,
  task: "找到热搜榜单中关于'人工智能'的话题并点击"
});
// AI 返回：{ type: 'click', ref: 15 }
await page.click(`[aria-ref="${action.ref}"]`);
```

**场景三：数据采集（结构化提取）→ 用 extract**
```typescript
const posts = await page.extract({
  instruction: "提取当前页面所有微博的内容、作者、点赞数、评论数",
  schema: z.object({
    posts: z.array(z.object({
      author: z.string(),
      content: z.string(),
      likes: z.number(),
      comments: z.number(),
      publishTime: z.string()
    }))
  })
});
```

#### 3. 反爬虫层：自建方案（微博够用）

```typescript
// Cookie 管理
const context = await browser.newContext({
  storageState: 'weibo-cookies.json', // 持久化 Cookie
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
  viewport: { width: 1920, height: 1080 },
  locale: 'zh-CN'
});

// 行为模拟
async function humanClick(page, selector) {
  const element = await page.locator(selector);
  const box = await element.boundingBox();

  // 鼠标移动到元素
  await page.mouse.move(
    box.x + box.width / 2,
    box.y + box.height / 2,
    { steps: 10 }
  );

  // 随机延迟
  await page.waitForTimeout(Math.random() * 500 + 200);

  // 点击
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

// 频率控制
const delay = () => new Promise(r =>
  setTimeout(r, Math.random() * 3000 + 2000)
);
```

**微博反爬虫特点**：
- ✅ 主要依赖 Cookie 验证（已有 Cookie 可直接使用）
- ✅ 频率限制相对宽松（2-3秒间隔即可）
- ⚠️ 注意避免：短时间大量操作（如连续点赞100条）
- ⚠️ 需要处理：登录状态过期（定期刷新 Cookie）

### MCP Server 架构设计

```typescript
// packages/mcp-weibo/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { chromium } from 'playwright';

class WeiboMCPServer {
  private browser: Browser;
  private context: BrowserContext;

  async initialize() {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext({
      storageState: './weibo-cookies.json'
    });
  }

  // Tool 1: 获取页面状态（Accessibility Tree）
  async getPageState(url: string) {
    const page = await this.context.newPage();
    await page.goto(url);
    const snapshot = await page.locator('body').ariaSnapshot();
    return snapshot;
  }

  // Tool 2: 执行操作
  async performAction(action: { type: string, ref: string, value?: string }) {
    const page = this.context.pages()[0];

    switch (action.type) {
      case 'click':
        await page.click(`[aria-ref="${action.ref}"]`);
        break;
      case 'input':
        await page.fill(`[aria-ref="${action.ref}"]`, action.value);
        break;
      case 'scroll':
        await page.evaluate(() => window.scrollBy(0, 500));
        break;
    }

    return { success: true };
  }

  // Tool 3: 提取数据
  async extractData(instruction: string, schema: any) {
    // 使用 Stagehand 的 extract 或自定义实现
    const page = this.context.pages()[0];
    const html = await page.content();

    // 发送给 AI 分析并提取
    const result = await askAI({
      html,
      instruction,
      schema
    });

    return result;
  }
}
```

## 技术栈

- **MCP SDK**：@modelcontextprotocol/sdk
- **Playwright**：浏览器自动化
- **TypeScript**：类型安全
- **Zod**：参数验证
- **可选**：@browserbasehq/stagehand（混合模式支持）

## 注意事项

1. **Cookie 安全**：Cookie 应该加密存储，不要硬编码
2. **频率限制**：避免过快操作触发反爬虫
3. **错误处理**：网络错误、元素找不到、操作失败都要妥善处理
4. **资源管理**：及时关闭浏览器实例，避免内存泄漏
5. **日志记录**：记录所有操作和决策过程，便于调试

## 技术决策总结

基于以上研究，我们已经明确了以下技术选型：

| 决策点 | 选择 | 理由 |
|--------|------|------|
| MCP Server 位置 | ✅ 独立包（packages/mcp-weibo） | 便于独立部署和维护 |
| 页面分析方案 | ✅ Accessibility Tree（YAML） | 比 HTML 轻量 90%，速度快 5-10 倍 |
| AI 执行模式 | ✅ 混合模式（代码 + AI） | 已知流程用代码，未知流程用 AI |
| 反爬虫方案 | ✅ 自建（Cookie + 频率控制） | 微博反爬虫温和，无需付费服务 |
| 浏览器实例 | ✅ 长期保持 BrowserContext | 保持登录状态，减少重复登录 |
| Cookie 存储 | ✅ JSON 文件 + 加密 | 简单且支持持久化 |

## 待讨论问题

### 1. Cookie 更新机制 ⚠️
- **问题**：Cookie 过期后如何自动刷新？
- **选项**：
  - A. 定时任务自动访问微博刷新（推荐）
  - B. 失败后提示用户重新登录
  - C. 集成自动登录（需要处理验证码）

### 2. 多账号支持 🤔
- **问题**：是否需要支持多个微博账号同时操作？
- **影响**：
  - 单账号：简单，一个 BrowserContext
  - 多账号：复杂，需要管理多个 Context 和 Cookie

### 3. 验证码处理 🔐
- **问题**：登录时遇到验证码怎么办？
- **选项**：
  - A. 不处理（使用已有 Cookie，避免登录）
  - B. 人工介入（暂停等待用户输入）
  - C. 第三方验证码识别服务（成本高）

### 4. 任务完成标准 🎯
- **问题**：如何判断一个任务是否完成？
- **建议**：
  - 简单任务：操作成功即完成（如点赞）
  - 复杂任务：AI 观察页面状态判断（如"发布微博并确认成功"）

### 5. 错误恢复策略 🔄
- **问题**：操作失败后如何处理？
- **建议**：
  - 元素找不到：重试 3 次，间隔 1 秒
  - 网络错误：重试 3 次，指数退避
  - Cookie 过期：触发 Cookie 更新流程
  - 页面结构变化：切换到 AI 模式尝试

## 下一步行动

### 阶段一优先级（建议从这里开始）：

1. **创建基础 MCP Server 框架** ⭐⭐⭐
   - 初始化 packages/mcp-weibo 项目
   - 集成 Playwright + MCP SDK
   - 实现 Cookie 加载功能

2. **实现 Accessibility Tree 获取** ⭐⭐⭐
   - 测试 `ariaSnapshot()` API
   - 验证 YAML 输出格式
   - 确认对微博页面的支持程度

3. **验证反爬虫策略** ⭐⭐
   - 使用已有 Cookie 访问微博
   - 测试不同频率的操作
   - 确认是否触发风控

## ⭐ 针对你的项目的最佳方案

基于你现有的架构分析（NestJS + TypeORM + 微博账号管理系统），推荐：

### 方案：轻量级 MCP Server（集成现有系统）

**不使用 Stagehand**，原因：
- ❌ 你已有完整的微博业务逻辑（账号、Cookie、任务）
- ❌ Stagehand 是独立框架，无法复用你的数据库
- ❌ 引入额外复杂度

**使用**：
- ✅ 创建 `packages/mcp-weibo`（独立包）
- ✅ Playwright + Accessibility Tree（轻量）
- ✅ 调用 `apps/api` 的接口获取 Cookie
- ✅ 复用现有的 `WeiboAccountEntity` 和账号管理逻辑

### 核心架构

```
现有系统                        新增能力
────────────────────────────────────────
apps/api/weibo-account.service → 提供 Cookie
apps/api/weibo-search-task     → AI 执行任务

packages/mcp-weibo (新建)      → MCP Server
  ├─ 调用 API 获取账号          → GET /weibo/accounts/:id
  ├─ Playwright 加载 Cookie    → 复用数据库 Cookie
  ├─ Accessibility Tree         → 获取页面状态
  └─ 执行操作                   → 点击/输入/滚动
```

### 技术栈（最小化）

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "playwright": "^1.42.0",
    "axios": "^1.6.0"  // 调用你的 API
  }
}
```

**不需要**：Stagehand、browser-use、LangGraph

### 优势对比

| 对比项 | Stagehand | 轻量级 MCP ✅ |
|--------|-----------|--------------|
| Cookie 管理 | 需重新实现 | 读数据库 |
| 多账号支持 | 需额外配置 | 已有体系 |
| NestJS 集成 | 困难 | 无缝集成 |
| 部署 | 独立服务 | monorepo |

### 实施步骤（优先级排序）

1. **创建 packages/mcp-weibo 基础框架** ⭐⭐⭐
   - 初始化 TypeScript 项目
   - 集成 Playwright + MCP SDK
   - 实现 Cookie 加载（调用 API）

2. **实现核心 MCP Tools** ⭐⭐⭐
   - `tool_getPageState`：获取 Accessibility Tree
   - `tool_performAction`：执行操作（点击/输入）
   - `tool_extractData`：提取数据

3. **与 apps/api 集成** ⭐⭐
   - 新增 API：`GET /weibo/mcp/accounts/:id/cookies`
   - 权限验证（只能访问自己的账号）
   - Cookie 刷新机制

### 请确认：

1. **方案是否认可？** 轻量级 MCP + 复用现有系统
2. **是否立即开始？** 从步骤 1 开始创建 packages/mcp-weibo
3. **待讨论问题优先级？** Cookie 更新机制（A 方案：定时刷新）
