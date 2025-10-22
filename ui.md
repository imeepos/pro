# @pro/web UI 升级重构优化方案

> 基于 bigscreen 项目的设计系统，为 @pro/web 项目提供全面的 UI 升级方案
>
> **版本：** v1.0
> **创建日期：** 2025-10-22
> **预计工作量：** 4-6 小时（4个并行任务）
> **风险等级：** 低（纯样式升级，不涉及逻辑变更）

---

## 📑 目录

1. [现状分析](#一现状分析)
2. [升级目标](#二升级目标)
3. [详细实施方案](#三详细实施方案)
   - [阶段一：CSS 变量系统迁移](#阶段一css-变量系统迁移)
   - [阶段二：Tailwind 配置升级](#阶段二tailwind-配置升级)
   - [阶段三：home.component 布局重构](#阶段三homecomponent-布局重构)
   - [阶段四：home.component.scss 增强](#阶段四homecomponentscss-增强)
4. [实施流程](#四实施流程)
5. [验收标准](#五验收标准)
6. [回滚方案](#六回滚方案)
7. [后续优化建议](#七后续优化建议)
8. [参考资料](#八参考资料)

---

## 一、现状分析

### 1.1 当前架构问题

#### 布局层面

❌ **问题清单：**

1. `home.component.html` (112行) 结构过于扁平，缺少清晰的层次
2. header 部分内联样式过多（行3-48），占据模板近一半内容
3. `screen-viewport` 和 `screen-stage` 缺少响应式适配
4. 没有统一的布局容器组件，每个页面各自实现

**具体表现：**
```html
<!-- 当前：header 占据 45 行，样式混杂在模板中 -->
<header class="relative bg-black/90 backdrop-blur-xl border-b border-white/10 px-6 lg:px-10 py-4 z-[1000]">
  <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/90"></div>
  <!-- ...大量内联样式和结构... -->
</header>
```

#### 样式层面

❌ **问题清单：**

1. `styles.scss` 仅 60 行，缺少设计系统基础设施
2. `home.component.scss` 仅 100 行，样式定义过于简单
3. 缺少 CSS 变量系统，大量硬编码颜色值
4. 没有主题切换支持（亮/暗模式）
5. 缺少玻璃态、毛玻璃等现代视觉效果
6. 动画定义零散，未形成统一系统

**具体表现：**
```scss
// 当前：硬编码颜色，无法主题化
background: radial-gradient(circle at center,
  #0f172a 0%,
  rgba(15, 23, 42, 0.95) 50%,
  rgba(0, 0, 0, 1) 100%
);

// 缺少变量：
// ❌ 无 --color-background
// ❌ 无 --sentiment-positive-primary
// ❌ 无 --pro-radius-xl
```

#### Tailwind 配置

❌ **问题清单：**

1. `tailwind.config.js` 使用硬编码颜色，不支持动态主题
2. 缺少舆情专用配色系统（positive/negative/neutral）
3. 没有自定义动画和过渡效果配置
4. 缺少字体系统配置（sans/mono）
5. 未利用 Tailwind 的 CSS 变量绑定能力

**具体表现：**
```javascript
// 当前：硬编码，无法动态切换主题
colors: {
  primary: {
    DEFAULT: '#3B82F6',  // ❌ 硬编码
    hover: '#2563EB',    // ❌ 硬编码
  }
}

// 缺少：
// ❌ 无 sentiment 色彩系统
// ❌ 无 alert 预警色彩
// ❌ 无 CSS 变量绑定
```

#### 组件层面

❌ **问题清单：**

1. `screen-header` 样式独立，未复用设计系统
2. 缺少布局相关的抽象组件（Layout、Grid、Card 等）
3. 没有统一的卡片、按钮等基础组件样式类
4. 各组件各自实现相似功能，代码重复

**影响范围：**
- 开发效率：新页面需要重复编写样式
- 一致性：不同页面视觉风格不统一
- 维护成本：样式分散，难以批量更新
- 性能：重复的样式定义增加包体积

---

### 1.2 bigscreen 项目优势

> bigscreen 项目展示了成熟的设计系统实践，值得借鉴

#### 设计系统优势

✅ **完整的 CSS 变量系统**

- **文件：** `apps/bigscreen/src/styles/index.css` (531行)
- **亮色主题：** 行 6-41，定义 40+ 个变量
- **暗色主题：** 行 44-78，完整的暗色变量集
- **舆情配色：** 正面/负面/中性 各 3 个层级
- **预警系统：** normal/attention/warning/critical 4 个等级

**代码示例：**
```css
:root {
  /* 基础色彩 */
  --color-primary: 59 130 246;
  --color-background: 249 250 251;

  /* 舆情专用（关键！） */
  --sentiment-positive-primary: 46 213 115;  /* 翠绿 */
  --sentiment-negative-primary: 255 71 87;   /* 热情红 */
  --sentiment-neutral-primary: 59 130 246;   /* 科技蓝 */

  /* 预警系统 */
  --alert-warning: 255 165 2;
  --alert-danger: 255 99 72;
  --alert-critical: 255 184 184;
}
```

✅ **玻璃态效果系统**

- **glass-card：** 行 98-112，提供统一的卡片样式
- **backdrop-blur：** 支持毛玻璃效果
- **渐变边框：** gradient-border 实现高级视觉效果
- **hover 状态：** 统一的交互反馈

**代码示例：**
```css
.glass-card {
  @apply bg-card/80 backdrop-blur-sm border border-border rounded-lg;
  transition: all 300ms;
}

.glass-card:hover {
  @apply bg-card/90 shadow-lg;
}
```

✅ **布局系统**

- **三层架构：** Header + Sidebar + Content (清晰分离)
- **Layout 组件：** `Layout.tsx` (90行) 统一容器
- **响应式网格：** dashboard-grid 支持 24 列布局
- **无滚动布局：** dashboard-no-scroll 全屏方案

**架构对比：**
```
bigscreen:
  Layout (容器)
    ├── Header (固定高度)
    ├── Sidebar (可折叠)
    └── Content (flex-1)

@pro/web (当前):
  home.component
    ├── header (内联)
    ├── main (混合)
    └── screen-header (浮动)
```

✅ **动画系统**

- **预定义动画：** fade-in, slide-up, pulse-slow 等
- **预警动画：** critical-pulse, alert-blink 等
- **数据更新：** data-update-fade 平滑过渡
- **性能优化：** 使用 will-change 和 GPU 加速

**代码示例：**
```css
@keyframes critical-pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(var(--sentiment-negative-primary) / 0.7);
    transform: scale(1);
  }
  70% {
    box-shadow: 0 0 0 10px rgb(var(--sentiment-negative-primary) / 0);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0 0 rgb(var(--sentiment-negative-primary) / 0);
    transform: scale(1);
  }
}
```

✅ **Tailwind 集成**

- **CSS 变量绑定：** 所有颜色使用 `rgb(var(...) / <alpha-value>)` 格式
- **透明度支持：** 如 `bg-primary/50` 自动计算透明度
- **舆情色彩：** `text-sentiment-positive` 等语义化类名
- **字体系统：** Inter（无衬线）+ JetBrains Mono（等宽）

**配置示例：**
```javascript
colors: {
  primary: {
    DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
    foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
  },
  sentiment: {
    positive: {
      DEFAULT: 'rgb(var(--sentiment-positive-primary) / <alpha-value>)',
      dark: 'rgb(var(--sentiment-positive-dark) / <alpha-value>)',
      light: 'rgb(var(--sentiment-positive-light) / <alpha-value>)',
    }
  }
}
```

✅ **页面设计**

- **DataOverview.tsx：** 展示优秀的网格布局（165行）
- **左中右结构：** 4-5-3 列黄金比例
- **响应式断点：** sm/md/lg/xl 完整适配
- **高度约束：** 使用 `overflow-hidden` 防止溢出

**布局示例：**
```tsx
<div className="grid grid-cols-12 gap-2 flex-1 min-h-0">
  {/* 左侧：4列 */}
  <div className="col-span-12 md:col-span-6 lg:col-span-4">
    <StatsOverview />
    <HotEventsList />
  </div>

  {/* 中间：5列 */}
  <div className="col-span-12 md:col-span-6 lg:col-span-5">
    <LocationHeatMap />
  </div>

  {/* 右侧：3列 */}
  <div className="col-span-12 md:col-span-6 lg:col-span-3">
    <SentimentOverview />
  </div>
</div>
```

---

### 1.3 差距总结

| 维度 | @pro/web 当前 | bigscreen 标准 | 差距 |
|------|--------------|----------------|------|
| CSS 变量 | 0 个 | 60+ 个 | 巨大 |
| 主题支持 | ❌ 无 | ✅ 亮/暗主题 | 完全缺失 |
| 玻璃态效果 | ❌ 无 | ✅ 完整系统 | 完全缺失 |
| 舆情配色 | ❌ 无 | ✅ 9 个变量 | 完全缺失 |
| 动画系统 | 4 个基础 | 12+ 个专业 | 较大 |
| 响应式 | 部分支持 | 完整支持 | 中等 |
| 代码行数 | 160 行 | 800+ 行 | 5 倍 |

---

## 二、升级目标

### 2.1 核心目标

#### 目标 1：建立完整的设计系统

**具体内容：**
- 统一的 CSS 变量系统（60+ 个变量）
- 亮/暗主题无缝切换
- 舆情专用配色体系（positive/negative/neutral）
- 预警状态样式系统（4个等级）

**成功标准：**
- ✅ 所有颜色使用 CSS 变量
- ✅ 一键切换亮/暗主题无样式错乱
- ✅ 新组件可直接复用设计系统

#### 目标 2：优化布局架构

**具体内容：**
- 清晰的三层结构（Header + Viewport + Components）
- 响应式网格系统（支持 sm/md/lg/xl 断点）
- 组件化的布局容器
- 无滚动条全屏适配

**成功标准：**
- ✅ 布局代码减少 30%
- ✅ 在 1920x1080、1366x768、移动端均正常显示
- ✅ 全屏模式下无滚动条

#### 目标 3：提升视觉体验

**具体内容：**
- 现代化的玻璃态效果（backdrop-blur）
- 流畅的动画过渡（12+ 预定义动画）
- 精致的交互反馈（hover/focus/active）
- 统一的阴影和圆角系统

**成功标准：**
- ✅ 动画帧率保持 60fps
- ✅ 卡片具有玻璃态效果
- ✅ 所有交互有视觉反馈

#### 目标 4：增强可维护性

**具体内容：**
- 样式复用和抽象（glass-card, data-card 等）
- 配置化的主题系统（通过变量控制）
- 组件化的设计模式
- 完善的代码注释和文档

**成功标准：**
- ✅ 新增页面样式编写时间减少 50%
- ✅ 主题调整只需修改 CSS 变量
- ✅ 代码可读性显著提升

### 2.2 兼容性要求

**必须满足：**
- ✅ 保持现有功能完全不变
- ✅ 不破坏现有组件接口
- ✅ 向后兼容现有样式类名
- ✅ 渐进式升级，支持快速回滚

**浏览器支持：**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 三、详细实施方案

### 阶段一：CSS 变量系统迁移

**文件：** `apps/web/src/styles.scss`

**目标：** 从 60行 扩展到 ~350行，建立完整的设计系统基础

**改动范围：** 新增约 290 行代码

#### 步骤 1：添加 CSS 变量定义（行 1-150）

```scss
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* ================================================
     亮色主题变量 (Light Theme)
     ================================================ */
  :root {
    /* === 基础色彩系统 === */
    --color-primary: 59 130 246;              /* blue-500 #3B82F6 */
    --color-primary-foreground: 255 255 255;  /* white */
    --color-secondary: 156 163 175;           /* gray-400 #9CA3AF */
    --color-secondary-foreground: 17 24 39;   /* gray-900 #111827 */
    
    /* === 背景和前景 === */
    --color-background: 249 250 251;          /* gray-50 #F9FAFB */
    --color-foreground: 17 24 39;             /* gray-900 #111827 */
    
    /* === 卡片系统 === */
    --color-card: 255 255 255;                /* white */
    --color-card-foreground: 17 24 39;        /* gray-900 */
    
    /* === 边框和输入 === */
    --color-border: 229 231 235;              /* gray-200 #E5E7EB */
    --color-input: 255 255 255;               /* white */
    --color-ring: 59 130 246;                 /* blue-500 */
    
    /* === 静音和强调 === */
    --color-muted: 243 244 246;               /* gray-100 #F3F4F6 */
    --color-muted-foreground: 107 114 128;    /* gray-500 #6B7280 */
    --color-accent: 243 244 246;              /* gray-100 */
    --color-accent-foreground: 17 24 39;      /* gray-900 */
    
    /* === 语义色彩 === */
    --color-destructive: 239 68 68;           /* red-500 #EF4444 */
    --color-destructive-foreground: 255 255 255;
    --color-success: 34 197 94;               /* green-500 #22C55E */
    --color-warning: 245 158 11;              /* amber-500 #F59E0B */
    
    /* ================================================
       舆情专用色彩（核心业务配色）
       ================================================ */
    
    /* 负面情感 - 红色系 */
    --sentiment-negative-primary: 255 71 87;  /* #FF4757 热情红 */
    --sentiment-negative-dark: 255 56 56;     /* #FF3838 深红 */
    --sentiment-negative-light: 255 107 122;  /* #FF6B7A 浅红 */
    
    /* 正面情感 - 绿色系 */
    --sentiment-positive-primary: 46 213 115; /* #2ED573 翠绿 */
    --sentiment-positive-dark: 32 191 107;    /* #20BF6B 深绿 */
    --sentiment-positive-light: 85 230 165;   /* #55E6A5 浅绿 */
    
    /* 中性情感 - 蓝色系 */
    --sentiment-neutral-primary: 59 130 246;  /* #3742FA 科技蓝 */
    --sentiment-neutral-dark: 47 53 66;       /* #2F3542 深灰 */
    --sentiment-neutral-light: 112 161 255;   /* #70A1FF 浅蓝 */
    
    /* 预警系统 */
    --alert-warning: 255 165 2;               /* #FFA502 警告橙 */
    --alert-danger: 255 99 72;                /* #FF6348 危险橙红 */
    --alert-critical: 255 184 184;            /* #FFB8B8 严重粉红 */
    
    /* ================================================
       Pro 设计系统变量
       ================================================ */
    --pro-primary-500: #3B82F6;
    --pro-primary-600: #2563EB;
    --pro-primary-700: #1D4ED8;
    --pro-slate-800: #1E293B;
    
    /* === 间距系统 === */
    --pro-space-2: 0.5rem;      /* 8px */
    --pro-space-3: 0.75rem;     /* 12px */
    --pro-space-4: 1rem;        /* 16px */
    --pro-space-5: 1.25rem;     /* 20px */
    --pro-space-6: 1.5rem;      /* 24px */
    
    /* === 字体系统 === */
    --pro-font-size-xs: 0.75rem;     /* 12px */
    --pro-font-size-sm: 0.875rem;    /* 14px */
    --pro-font-size-base: 1rem;      /* 16px */
    --pro-font-size-lg: 1.125rem;    /* 18px */
    --pro-font-size-xl: 1.25rem;     /* 20px */
    
    --pro-font-weight-normal: 400;
    --pro-font-weight-medium: 500;
    --pro-font-weight-semibold: 600;
    --pro-font-weight-bold: 700;
    
    /* === 圆角系统 === */
    --pro-radius-lg: 0.5rem;     /* 8px */
    --pro-radius-xl: 0.75rem;    /* 12px */
    --pro-radius-2xl: 1rem;      /* 16px */
    
    /* === 阴影系统 === */
    --pro-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
                     0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --pro-shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    
    /* === 透明度系统 === */
    --pro-opacity-glass-light: 0.08;
    --pro-opacity-glass-medium: 0.12;
    --pro-opacity-glass-heavy: 0.16;
    
    /* === 过渡系统 === */
    --pro-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --pro-transition-base: 300ms cubic-bezier(0.4, 0, 0.2, 1);
    --pro-transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ================================================
     暗色主题变量 (Dark Theme)
     ================================================ */
  .dark {
    /* 基础色彩 - 暗色适配 */
    --color-primary: 59 130 246;              /* 保持蓝色 */
    --color-primary-foreground: 255 255 255;  /* 保持白色 */
    --color-secondary: 75 85 99;              /* gray-600 */
    --color-secondary-foreground: 243 244 246; /* gray-100 */
    
    /* 背景和前景 - 反转 */
    --color-background: 17 24 39;             /* gray-900 #111827 */
    --color-foreground: 243 244 246;          /* gray-100 #F3F4F6 */
    
    /* 卡片系统 - 深色背景 */
    --color-card: 31 41 55;                   /* gray-800 #1F2937 */
    --color-card-foreground: 243 244 246;     /* gray-100 */
    
    /* 边框和输入 - 深色 */
    --color-border: 55 65 81;                 /* gray-700 #374151 */
    --color-input: 31 41 55;                  /* gray-800 */
    --color-ring: 59 130 246;                 /* 保持蓝色 */
    
    /* 静音和强调 - 深色 */
    --color-muted: 55 65 81;                  /* gray-700 */
    --color-muted-foreground: 156 163 175;    /* gray-400 */
    --color-accent: 55 65 81;                 /* gray-700 */
    --color-accent-foreground: 243 244 246;   /* gray-100 */
    
    /* 语义色彩 - 保持 */
    --color-destructive: 239 68 68;
    --color-destructive-foreground: 255 255 255;
    --color-success: 34 197 94;
    --color-warning: 245 158 11;
    
    /* 舆情色彩 - 暗色主题下保持不变（确保对比度） */
    /* 所有 sentiment 和 alert 变量与亮色主题相同 */
  }

  /* ================================================
     全局基础样式
     ================================================ */
  
  * {
    border-color: rgb(var(--color-border));
  }

  body {
    background: rgb(var(--color-background));
    color: rgb(var(--color-foreground));
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                 'Helvetica Neue', Arial, sans-serif;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  html, body, app-root {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  html, body {
    overflow: hidden;
  }
}
```


#### 步骤 2：添加组件样式类（行 151-250）

```scss
@layer components {
  /* ================================================
     玻璃态卡片 - 核心组件样式
     ================================================ */
  .glass-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgb(var(--color-border));
    border-radius: var(--pro-radius-lg);
    transition: all var(--pro-transition-base);
  }

  .glass-card:hover {
    background: rgba(255, 255, 255, 0.9);
    box-shadow: var(--pro-shadow-2xl);
  }

  .dark .glass-card {
    background: rgba(31, 41, 55, 0.5);
  }

  .dark .glass-card:hover {
    background: rgba(31, 41, 55, 0.7);
  }

  /* ================================================
     渐变边框效果
     ================================================ */
  .gradient-border {
    position: relative;
  }

  .gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--pro-radius-lg);
    padding: 1px;
    background: linear-gradient(135deg, 
      rgb(var(--color-primary)), 
      rgb(138, 43, 226) /* purple-600 */
    );
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: xor;
    -webkit-mask-composite: xor;
  }

  /* ================================================
     数据卡片
     ================================================ */
  .data-card {
    @apply glass-card p-6;
  }

  /* ================================================
     指标数值
     ================================================ */
  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, 
      rgb(var(--color-primary)), 
      rgb(147, 51, 234) /* purple-600 */
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* ================================================
     图表容器
     ================================================ */
  .chart-container {
    width: 100%;
    height: 100%;
    min-height: 300px;
  }

  /* ================================================
     状态指示器
     ================================================ */
  .status-indicator {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 9999px;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .status-online {
    background: rgb(var(--color-success));
  }

  .status-offline {
    background: rgb(var(--color-destructive));
  }

  .status-warning {
    background: rgb(var(--color-warning));
  }

  /* ================================================
     舆情总览卡片 - 专用样式
     ================================================ */
  .sentiment-overview-card {
    background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.85) 100%
    );
    backdrop-filter: blur(20px);
    border: 1px solid rgba(var(--color-border), 0.5);
    box-shadow:
      0 8px 32px rgba(var(--color-foreground), 0.1),
      inset 0 1px 0 rgba(var(--color-foreground), 0.1);
  }

  .dark .sentiment-overview-card {
    background: linear-gradient(135deg,
      rgba(31, 41, 55, 0.8) 0%,
      rgba(31, 41, 55, 0.6) 100%
    );
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  /* ================================================
     数据摘要卡片
     ================================================ */
  .data-summary-card {
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .data-summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(var(--color-foreground), 0.15);
  }
}
```

#### 步骤 3：添加工具类和舆情样式（行 251-350）

```scss
@layer utilities {
  /* 文字阴影 */
  .text-shadow {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* 隐藏滚动条 */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* 浮动动画 */
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  /* 状态指示器发光 */
  .status-indicator-glow {
    filter: drop-shadow(0 0 8px currentColor);
  }
}

/* ================================================
   舆情专用样式
   ================================================ */

/* 舆情状态指示器 */
.sentiment-positive {
  color: rgb(var(--sentiment-positive-primary));
  background-color: rgba(var(--sentiment-positive-primary), 0.1);
}

.sentiment-negative {
  color: rgb(var(--sentiment-negative-primary));
  background-color: rgba(var(--sentiment-negative-primary), 0.1);
}

.sentiment-neutral {
  color: rgb(var(--sentiment-neutral-primary));
  background-color: rgba(var(--sentiment-neutral-primary), 0.1);
}

/* 预警状态样式 */
.alert-normal {
  background-color: rgba(var(--sentiment-positive-primary), 0.2);
  border-left: 4px solid rgb(var(--sentiment-positive-primary));
}

.alert-attention {
  background-color: rgba(var(--alert-warning), 0.2);
  border-left: 4px solid rgb(var(--alert-warning));
  animation: pulse-slow 3s infinite;
}

.alert-warning {
  background-color: rgba(var(--alert-danger), 0.2);
  border-left: 4px solid rgb(var(--alert-danger));
  animation: bounce-slow 2s infinite;
}

.alert-critical {
  background-color: rgba(var(--sentiment-negative-primary), 0.2);
  border-left: 4px solid rgb(var(--sentiment-negative-primary));
  animation: critical-pulse 1s infinite;
}

/* 预警动画 */
@keyframes critical-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--sentiment-negative-primary), 0.7);
    transform: scale(1);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--sentiment-negative-primary), 0);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--sentiment-negative-primary), 0);
    transform: scale(1);
  }
}

/* ================================================
   保留现有动画（向后兼容）
   ================================================ */

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-30px) scale(1.1);
  }
}

@keyframes cardEntrance {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**说明：**
- ✅ 新增约 290 行代码
- ✅ 完全向后兼容现有样式
- ✅ CSS 变量采用 RGB 格式，支持透明度
- ✅ 所有动画保留，避免破坏现有效果


---

### 阶段二：Tailwind 配置升级

**文件：** `apps/web/tailwind.config.js`

**目标：** 绑定 CSS 变量，支持动态主题切换

**改动范围：** 扩展 colors 配置，新增 animation、fontFamily 等

**完整配置：**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 保持不变
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        // ================================================
        // 使用 CSS 变量的主题颜色（核心升级）
        // ================================================
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
          // 保留原有数字等级以兼容现有代码
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
        },
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--color-card) / <alpha-value>)',
          foreground: 'rgb(var(--color-card-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--color-border) / <alpha-value>)',
        input: 'rgb(var(--color-input) / <alpha-value>)',
        ring: 'rgb(var(--color-ring) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--color-muted) / <alpha-value>)',
          foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--color-destructive) / <alpha-value>)',
          foreground: 'rgb(var(--color-destructive-foreground) / <alpha-value>)',
        },
        
        // ================================================
        // 保留原有颜色以兼容现有代码
        // ================================================
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        
        // ================================================
        // 舆情专用色彩系统（新增 - 核心业务功能）
        // ================================================
        sentiment: {
          positive: {
            DEFAULT: 'rgb(var(--sentiment-positive-primary) / <alpha-value>)',
            dark: 'rgb(var(--sentiment-positive-dark) / <alpha-value>)',
            light: 'rgb(var(--sentiment-positive-light) / <alpha-value>)',
          },
          negative: {
            DEFAULT: 'rgb(var(--sentiment-negative-primary) / <alpha-value>)',
            dark: 'rgb(var(--sentiment-negative-dark) / <alpha-value>)',
            light: 'rgb(var(--sentiment-negative-light) / <alpha-value>)',
          },
          neutral: {
            DEFAULT: 'rgb(var(--sentiment-neutral-primary) / <alpha-value>)',
            dark: 'rgb(var(--sentiment-neutral-dark) / <alpha-value>)',
            light: 'rgb(var(--sentiment-neutral-light) / <alpha-value>)',
          }
        },
        alert: {
          warning: 'rgb(var(--alert-warning) / <alpha-value>)',
          danger: 'rgb(var(--alert-danger) / <alpha-value>)',
          critical: 'rgb(var(--alert-critical) / <alpha-value>)',
        },
      },
      
      // ================================================
      // 动画系统（新增）
      // ================================================
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      
      // ================================================
      // 字体系统（新增）
      // ================================================
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      
      // ================================================
      // 毛玻璃效果（新增）
      // ================================================
      backdropBlur: {
        xs: '2px',
      },
      
      // ================================================
      // 间距扩展（新增）
      // ================================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      }
    },
  },
  plugins: [
    require('flowbite/plugin')
  ],
}
```

**使用示例：**

```html
<!-- 基础颜色 - 支持透明度 -->
<div class="bg-primary/50 text-foreground">...</div>

<!-- 舆情色彩 -->
<span class="text-sentiment-positive">正面</span>
<span class="text-sentiment-negative">负面</span>
<span class="bg-sentiment-neutral/10">中性背景</span>

<!-- 预警状态 -->
<div class="bg-alert-warning/20 border-l-4 border-alert-warning">
  警告信息
</div>

<!-- 动画 -->
<div class="animate-fade-in">淡入动画</div>
<div class="animate-slide-up">上滑动画</div>
```

**预期效果：**
- ✅ 所有 Tailwind 颜色类支持 CSS 变量
- ✅ 透明度修饰符自动生效（如 `bg-primary/50`）
- ✅ 主题切换时颜色自动更新
- ✅ 向后兼容现有 `primary-500` 等类名

---

### 阶段三：home.component 布局重构

**文件：** `apps/web/src/app/features/home/home.component.html`

**目标：** 简化结构，使用设计系统类名，减少内联样式

**改动范围：** Header 简化（45行 → 10行），视口优化

#### 重构策略

**原则：**
1. 移除所有硬编码颜色值
2. 使用设计系统类名（glass-card, text-foreground 等）
3. 简化 DOM 结构，减少嵌套
4. 增加语义化标签和可访问性属性

#### 重构前后对比

**Header 部分（行3-48）：**

```html
<!-- ❌ 重构前：45行，大量内联样式 -->
<header *ngIf="currentUser$ | async as user" 
        class="relative bg-black/90 backdrop-blur-xl border-b border-white/10 px-6 lg:px-10 py-4 z-[1000]">
  <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/90"></div>
  <div class="relative flex justify-between items-center w-full">
    <!-- ...大量嵌套... -->
  </div>
</header>

<!-- ✅ 重构后：精简版，使用设计系统 -->
<header *ngIf="currentUser$ | async as user" 
        class="glass-card border-b px-6 lg:px-10 py-4 z-[1000] relative">
  <div class="flex justify-between items-center w-full">
    <!-- 左侧：Logo + 标题 -->
    <div class="flex items-center gap-4">
      <div class="relative">
        <div class="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-600/20 
                    rounded-xl blur-md"></div>
        <div class="relative bg-gradient-to-r from-primary to-primary-600 rounded-xl p-2">
          <pro-svg-icon icon="chart" [size]="24" className="text-white" />
        </div>
      </div>
      <div class="flex flex-col">
        <h1 class="text-foreground text-xl lg:text-2xl font-bold m-0 tracking-tight">
          数据大屏
        </h1>
        <p class="text-muted-foreground text-xs lg:text-sm hidden md:block">
          实时数据监控平台
        </p>
      </div>
    </div>

    <!-- 右侧：用户信息 + 退出 -->
    <div class="flex items-center gap-4">
      <!-- 用户状态 -->
      <div class="flex items-center gap-3 px-4 py-2 glass-card">
        <div class="status-online status-indicator"></div>
        <span class="text-foreground text-sm font-medium">
          {{ user.username || user.id }}
        </span>
      </div>
      
      <!-- 退出按钮 -->
      <button
        (click)="logout()"
        class="px-5 py-2.5 glass-card text-foreground rounded-2xl border border-border 
               cursor-pointer text-sm font-medium transition-all duration-300 
               hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary">
        <span class="flex items-center gap-2">
          <pro-svg-icon icon="close" [size]="16" className="text-muted-foreground" />
          退出登录
        </span>
      </button>
    </div>
  </div>
</header>
```

**主要改进：**
- ✅ 使用 `glass-card` 替代硬编码背景
- ✅ 使用 `text-foreground` 替代 `text-white`
- ✅ 使用 `text-muted-foreground` 替代 `text-white/60`
- ✅ 使用 `border-border` 替代 `border-white/10`
- ✅ 使用 `hover:bg-accent` 统一交互反馈
- ✅ 移除冗余的背景装饰层

**Viewport 部分（行51-95）：**

```html
<!-- ✅ 优化后：使用设计系统，增加动画 -->
<main class="screen-viewport" #screenWrapper>
  <div class="screen-stage glass-card"
       [style.width.px]="screenConfig?.layout?.width"
       [style.height.px]="screenConfig?.layout?.height"
       [style.transform]="getScaleTransform()"
       [style.left.px]="scaleOffsetX"
       [style.top.px]="scaleOffsetY">
    
    <!-- 加载状态 - 增加动画 -->
    @if (loading) {
      <div class="loading-container animate-fade-in" role="status" aria-live="polite">
        <div class="flex flex-col items-center gap-6">
          <pro-svg-icon icon="refresh" [size]="48" 
                        className="text-primary animate-spin" />
          <div class="text-center">
            <p class="text-foreground text-lg font-medium">正在加载屏幕配置...</p>
            <p class="text-muted-foreground text-sm mt-2">请稍候，正在获取最新数据</p>
          </div>
        </div>
      </div>
    }
    
    <!-- 错误状态 - 增加动画 -->
    @else if (error) {
      <div class="error-container animate-slide-up" role="alert">
        <app-empty-state
          [config]="{
            icon: 'warning',
            title: error,
            description: '请检查网络连接或联系管理员',
            actionLabel: '刷新页面',
            actionHandler: reloadPage.bind(this)
          }" />
      </div>
    }
    
    <!-- 空状态 -->
    @else if (!screenConfig || !availableScreens.length) {
      <div class="error-container animate-fade-in">
        <app-empty-state
          [config]="{
            icon: 'screen',
            title: '暂无可用的屏幕',
            description: '请在管理后台创建并发布屏幕后刷新页面',
            actionLabel: '前往管理后台',
            actionHandler: goToAdmin.bind(this)
          }" />
      </div>
    }
    
    <!-- 正常显示 -->
    @else if (screenConfig) {
      <div [style.background]="screenConfig.layout.background" class="screen-canvas">
        <div #componentsContainer class="components-container"></div>
      </div>
    }
  </div>

  <!-- Screen Header - 保持不变 -->
  @if (!loading && !error && screenConfig) {
    <app-screen-header
      [screen]="screenConfig"
      [isFullscreen]="isFullscreen"
      [hasMultipleScreens]="hasMultipleScreens"
      [isAutoPlay]="isAutoPlay"
      [currentScreenIndex]="currentScreenIndex"
      [availableScreens]="availableScreens"
      (autoPlayToggle)="toggleAutoPlay()"
      (previous)="previousScreen()"
      (next)="nextScreen()"
      (screenSelect)="switchToScreen($event)"
      (fullscreenToggle)="toggleFullscreen()"
    />
  }
</main>
```

**主要改进：**
- ✅ `.screen-stage` 使用 `glass-card`
- ✅ 加载状态增加 `animate-fade-in`
- ✅ 错误状态增加 `animate-slide-up`
- ✅ 使用 `text-primary` 替代硬编码颜色
- ✅ 统一使用设计系统类名

**预期效果：**
- ✅ 代码行数减少约 30%
- ✅ 主题切换时自动适配颜色
- ✅ 动画过渡更流畅
- ✅ 可维护性显著提升


---

### 阶段四：home.component.scss 增强

**文件：** `apps/web/src/app/features/home/home.component.scss`

**目标：** 从 100行 扩展到 ~250行，增加响应式、暗色主题、性能优化

**改动范围：** 新增约 150 行代码

**完整样式代码：**

```scss
/* ================================================
   屏幕显示组件样式
   ================================================ */

/* 视口容器 - 增强版 */
.screen-viewport {
  position: relative;
  width: 100vw;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(
    circle at center,
    rgb(var(--color-background)) 0%,
    rgba(var(--color-background), 0.95) 50%,
    rgba(0, 0, 0, 1) 100%
  );
}

/* 屏幕舞台 - 优化变换性能 */
.screen-stage {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: top left;
  transition: transform var(--pro-transition-base);
  border-radius: var(--pro-radius-xl);
  box-shadow: var(--pro-shadow-2xl);
  will-change: transform, left, top;
  contain: layout style paint;
}

/* 加载容器 - 使用设计系统 */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: rgb(var(--color-background));
  color: rgb(var(--color-foreground));
}

/* 加载动画 - 优化性能 */
.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(var(--color-muted), 0.3);
  border-top-color: rgb(var(--color-primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
  will-change: transform;
}

/* 错误消息 */
.error-message {
  color: rgb(var(--color-destructive));
  font-size: 1.125rem;
  font-weight: 500;
}

/* 组件容器 - 优化布局 */
.screen-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: var(--pro-radius-xl);
  overflow: hidden;
  background: transparent;
}

.components-container {
  width: 100%;
  height: 100%;
  position: relative;
  contain: layout style paint;
}

/* 组件包装器 - 增强交互 */
.component-wrapper {
  position: absolute;
  box-sizing: border-box;
  background: rgba(var(--color-primary), 0.1);
  border: 1px solid rgba(var(--color-border), 0.3);
  transition: all var(--pro-transition-base);
  border-radius: var(--pro-radius-lg);
  overflow: hidden;
  animation: componentEnter 0.5s ease-out;
  contain: layout style paint;
  will-change: transform, border-color, background;
}

.component-wrapper:hover {
  border-color: rgba(var(--color-primary), 0.5);
  background: rgba(var(--color-primary), 0.16);
  box-shadow: 0 0 0 1px rgba(var(--color-primary), 0.2);
  transform: translateZ(0);
}

/* 组件进入动画 */
@keyframes componentEnter {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ================================================
   响应式适配
   ================================================ */

/* 平板设备 (max-width: 1024px) */
@media (max-width: 1024px) {
  .screen-viewport {
    height: calc(100vh - 80px);
  }
  
  .component-wrapper {
    font-size: 0.9em;
  }
}

/* 移动设备 (max-width: 768px) */
@media (max-width: 768px) {
  .screen-viewport {
    height: calc(100vh - 60px);
  }
  
  .screen-stage {
    border-radius: var(--pro-radius-lg);
  }
  
  .component-wrapper {
    font-size: 0.85em;
    border-radius: 0.375rem;
  }
}

/* 小屏幕设备 (max-width: 480px) */
@media (max-width: 480px) {
  .loading-container,
  .error-container {
    padding: var(--pro-space-4);
  }
  
  .component-wrapper {
    font-size: 0.8em;
  }
}

/* ================================================
   暗色主题适配
   ================================================ */

:host-context(.dark) {
  .screen-viewport {
    background: radial-gradient(
      circle at center,
      rgb(var(--color-background)) 0%,
      rgba(var(--color-background), 0.98) 50%,
      rgba(0, 0, 0, 1) 100%
    );
  }
  
  .component-wrapper {
    background: rgba(var(--color-primary), 0.08);
    border-color: rgba(var(--color-border), 0.2);
  }
  
  .component-wrapper:hover {
    background: rgba(var(--color-primary), 0.12);
    border-color: rgba(var(--color-primary), 0.4);
  }
}

/* ================================================
   性能优化
   ================================================ */

/* 强制 GPU 加速 */
.screen-stage,
.component-wrapper,
.loading-spinner {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

/* 减少重绘 */
.components-container > * {
  will-change: auto;
}

/* ================================================
   打印样式
   ================================================ */

@media print {
  .screen-viewport {
    background: white;
    height: auto;
    overflow: visible;
  }
  
  .component-wrapper {
    page-break-inside: avoid;
  }
  
  .loading-container,
  .error-container {
    display: none;
  }
}

/* ================================================
   高对比度模式
   ================================================ */

@media (prefers-contrast: high) {
  .component-wrapper {
    border-width: 2px;
  }
  
  .component-wrapper:hover {
    border-width: 3px;
  }
}

/* ================================================
   减少动画模式（无障碍）
   ================================================ */

@media (prefers-reduced-motion: reduce) {
  .component-wrapper,
  .screen-stage,
  .loading-spinner {
    animation: none;
    transition: none;
  }
}
```

**预期效果：**
- ✅ 完整的响应式支持（1920px → 480px）
- ✅ 暗色主题完美适配
- ✅ GPU 加速优化性能
- ✅ 打印样式支持
- ✅ 无障碍访问增强

---

## 四、实施流程

### 4.1 准备阶段

**时间：** 15 分钟

**步骤：**

```bash
# 1. 创建功能分支
git checkout -b feature/ui-upgrade-design-system

# 2. 备份关键文件
mkdir -p .backup
cp apps/web/src/styles.scss .backup/styles.scss.backup
cp apps/web/tailwind.config.js .backup/tailwind.config.js.backup
cp apps/web/src/app/features/home/home.component.html .backup/home.component.html.backup
cp apps/web/src/app/features/home/home.component.scss .backup/home.component.scss.backup

# 3. 确认当前工作目录
pwd  # 应该在 /home/ubuntu/worktrees/pro

# 4. 查看当前 git 状态
git status
```

### 4.2 执行阶段（并行任务）

**时间：** 3-4 小时

#### 任务 1：CSS 变量系统迁移

**负责：** 前端开发者 A  
**时间：** 60 分钟

```bash
# 编辑 apps/web/src/styles.scss
# 按照"阶段一"的代码示例，添加：
# - CSS 变量定义（行 1-150）
# - 组件样式类（行 151-250）
# - 工具类和舆情样式（行 251-350）
```

**验证：**
```bash
cd apps/web
pnpm run typecheck
```

#### 任务 2：Tailwind 配置升级

**负责：** 前端开发者 A  
**时间：** 30 分钟

```bash
# 编辑 apps/web/tailwind.config.js
# 按照"阶段二"的配置示例，更新 colors、animation 等
```

**验证：**
```bash
# 重启开发服务器查看 Tailwind 类是否生效
pnpm run start
```

#### 任务 3：Home 组件布局重构

**负责：** 前端开发者 B  
**时间：** 90 分钟

```bash
# 编辑 apps/web/src/app/features/home/home.component.html
# 按照"阶段三"的示例：
# 1. 简化 header 部分（行 3-48 → 10 行）
# 2. 优化 viewport 部分（增加动画）
```

**验证：**
```bash
# 检查模板语法
pnpm run typecheck

# 启动开发服务器测试
pnpm run start
```

#### 任务 4：Home 样式增强

**负责：** 前端开发者 B  
**时间：** 60 分钟

```bash
# 编辑 apps/web/src/app/features/home/home.component.scss
# 按照"阶段四"的代码示例，添加：
# - 响应式断点
# - 暗色主题适配
# - 性能优化
# - 打印样式
```

**验证：**
```bash
# 构建测试
pnpm run build
```

### 4.3 验证阶段

**时间：** 1 小时

#### 功能测试

```bash
# 1. 类型检查
cd apps/web && pnpm run typecheck

# 2. 构建测试（需要等待）
cd apps/web && pnpm run build

# 3. 启动开发服务器
cd apps/web && pnpm run start
```

#### 视觉测试（手动）

**测试清单：**

- [ ] **首页加载** - 确认样式正常，无闪烁
- [ ] **Header 展示** - Logo、标题、用户信息正常显示
- [ ] **玻璃态效果** - 卡片背景有毛玻璃模糊
- [ ] **主题切换** - 切换到暗色模式，颜色自动适配
- [ ] **响应式测试**：
  - [ ] 1920x1080 - 正常显示
  - [ ] 1366x768 - 正常显示
  - [ ] 768px（平板）- 布局正常
  - [ ] 480px（手机）- 布局正常
- [ ] **动画效果** - 加载、错误状态有过渡动画
- [ ] **交互反馈** - hover、focus 状态正常
- [ ] **屏幕切换** - 切换不同屏幕无异常
- [ ] **全屏功能** - 进入/退出全屏正常

#### 性能测试

```bash
# 1. 检查构建产物大小
ls -lh apps/web/dist/

# 2. Chrome DevTools 性能分析
# - 打开 Chrome DevTools
# - Performance 标签录制
# - 检查 FPS 是否保持 60fps
# - 检查 Layout Shift 是否最小
```

#### 兼容性测试

**浏览器清单：**
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+


---

## 五、验收标准

### 5.1 功能完整性

**必须通过的功能测试：**

- [ ] **页面加载** - 首页正常加载，无 console 错误
- [ ] **用户认证** - 登录/登出功能正常
- [ ] **屏幕列表** - 可用屏幕列表正确显示
- [ ] **屏幕切换** - 上一页/下一页/下拉选择正常
- [ ] **屏幕轮播** - 自动轮播开关正常
- [ ] **全屏功能** - 进入/退出全屏正常
- [ ] **组件渲染** - 所有配置的组件正确显示
- [ ] **WebSocket** - WebSocket 连接正常，实时更新生效
- [ ] **数据加载** - 大屏数据正常加载和刷新
- [ ] **错误处理** - 加载失败、网络错误有友好提示

**测试命令：**
```bash
# TypeScript 类型检查必须通过
cd apps/web && pnpm run typecheck

# 构建必须成功
cd apps/web && pnpm run build
```

### 5.2 视觉效果

**玻璃态效果：**
- [ ] Header 有毛玻璃背景（backdrop-blur）
- [ ] screen-stage 有玻璃态边框和阴影
- [ ] 卡片组件有半透明背景
- [ ] Hover 状态背景透明度增加

**渐变和阴影：**
- [ ] Logo 有渐变背景和模糊光晕
- [ ] metric-value 有渐变文字效果
- [ ] 卡片有适当的阴影（shadow-2xl）
- [ ] 状态指示器有脉冲动画

**动画过渡：**
- [ ] 加载状态：淡入动画（animate-fade-in）
- [ ] 错误状态：上滑动画（animate-slide-up）
- [ ] 组件进入：componentEnter 动画
- [ ] Hover 交互：平滑的 transition

**响应式布局：**
- [ ] **1920x1080** - 完美显示，所有元素清晰
- [ ] **1366x768** - 布局正常，无溢出
- [ ] **1024x768** - 平板布局，文字缩小
- [ ] **768px** - 移动端布局调整
- [ ] **480px** - 小屏幕正常显示

**主题切换：**
- [ ] 亮色主题：白色背景，黑色文字
- [ ] 暗色主题：深色背景，浅色文字
- [ ] 切换无闪烁，过渡平滑
- [ ] 所有组件自动适配主题

### 5.3 性能指标

**构建性能：**
- [ ] 构建时间 < 3 分钟（从 `pnpm run build` 开始）
- [ ] 构建产物大小增长 < 10%
- [ ] 无构建警告或错误

**运行时性能：**
- [ ] **首屏加载** - LCP < 2.5s
- [ ] **动画帧率** - FPS ≥ 58（接近 60fps）
- [ ] **内存占用** - 无内存泄漏，稳定在合理范围
- [ ] **布局抖动** - CLS < 0.1

**网络性能：**
- [ ] CSS 文件大小增长 < 30KB（gzip）
- [ ] JS 文件大小无明显增长
- [ ] 首次加载资源数量无明显增加

**测试方法：**
```bash
# 1. 查看构建产物大小
ls -lh apps/web/dist/browser/*.css
ls -lh apps/web/dist/browser/*.js

# 2. Chrome DevTools Lighthouse 测试
# - 打开页面
# - F12 → Lighthouse
# - Performance 模式
# - 生成报告
# - Performance 评分应 ≥ 85
```

### 5.4 代码质量

**TypeScript：**
- [ ] 无类型错误
- [ ] 无 `@ts-ignore` 或 `any` 新增
- [ ] 类型推断正确

**代码规范：**
- [ ] 无 ESLint 错误
- [ ] 代码格式符合项目规范
- [ ] 变量命名语义化

**向后兼容：**
- [ ] 现有组件接口未改变
- [ ] 现有样式类名仍然可用
- [ ] 现有功能未受影响

**可维护性：**
- [ ] CSS 变量命名清晰
- [ ] 代码注释充分
- [ ] 样式复用性好

---

## 六、回滚方案

### 6.1 快速回滚（文件级）

**适用场景：** 发现样式问题，需要立即回滚

**操作步骤：**

```bash
# 方案 1：从备份恢复
cp .backup/styles.scss.backup apps/web/src/styles.scss
cp .backup/tailwind.config.js.backup apps/web/tailwind.config.js
cp .backup/home.component.html.backup apps/web/src/app/features/home/home.component.html
cp .backup/home.component.scss.backup apps/web/src/app/features/home/home.component.scss

# 重启开发服务器
cd apps/web && pnpm run start

# 验证
curl http://localhost:4201
```

**时间：** < 2 分钟

### 6.2 分支级回滚

**适用场景：** 整个升级有问题，需要完全回滚

**操作步骤：**

```bash
# 方案 2A：切换回 master 分支
git checkout master

# 删除功能分支（可选）
git branch -D feature/ui-upgrade-design-system

# 清理构建产物
cd apps/web && rm -rf dist/ .angular/

# 重新构建
pnpm run build
```

**时间：** < 5 分钟

### 6.3 提交级回滚

**适用场景：** 已经合并到主分支，需要撤销

**操作步骤：**

```bash
# 方案 3：Revert 提交
# 查看最近的提交
git log --oneline -10

# 假设最近 4 次提交都是本次升级
git revert HEAD~3..HEAD

# 或者单独 revert 每个提交
git revert <commit-hash>

# 推送到远程
git push origin master
```

**时间：** < 10 分钟

### 6.4 部分回滚

**适用场景：** 只有部分文件有问题

**操作步骤：**

```bash
# 只回滚 styles.scss
git checkout HEAD~1 -- apps/web/src/styles.scss

# 或者只回滚 home.component.html
git checkout HEAD~1 -- apps/web/src/app/features/home/home.component.html

# 提交部分回滚
git commit -m "部分回滚：恢复 styles.scss"
```

**时间：** < 3 分钟

---

## 七、后续优化建议

### 7.1 短期优化（1-2周）

#### 1. 创建布局组件库

**目标：** 抽象可复用的布局组件

**新增组件：**

```typescript
// apps/web/src/app/shared/components/layout/screen-layout.component.ts
@Component({
  selector: 'pro-screen-layout',
  template: `
    <div class="glass-card h-full flex flex-col">
      <header *ngIf="title" class="border-b border-border p-4">
        <h2 class="text-foreground font-semibold">{{ title }}</h2>
      </header>
      <main class="flex-1 overflow-auto p-4">
        <ng-content></ng-content>
      </main>
    </div>
  `
})
export class ScreenLayoutComponent {
  @Input() title?: string;
}

// apps/web/src/app/shared/components/layout/glass-card.component.ts
@Component({
  selector: 'pro-glass-card',
  template: `
    <div class="glass-card p-6" [class]="className">
      <ng-content></ng-content>
    </div>
  `
})
export class GlassCardComponent {
  @Input() className?: string;
}
```

**预期收益：**
- 减少重复代码 50%
- 统一视觉风格
- 提升开发效率

#### 2. 主题切换功能

**实现步骤：**

```typescript
// apps/web/src/app/core/services/theme.service.ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isDark = signal(false);
  
  toggleTheme() {
    this.isDark.update(v => !v);
    this.applyTheme();
  }
  
  private applyTheme() {
    const html = document.documentElement;
    if (this.isDark()) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
  
  initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDark.set(saved === 'dark' || (!saved && prefersDark));
    this.applyTheme();
  }
}
```

**UI 集成：**

```html
<!-- Header 添加主题切换按钮 -->
<button (click)="themeService.toggleTheme()" class="glass-card p-2 rounded-lg">
  <pro-svg-icon [icon]="themeService.isDark() ? 'sun' : 'moon'" [size]="20" />
</button>
```

**预期收益：**
- 用户体验提升
- 主题偏好持久化
- 自动跟随系统主题

#### 3. 动画库扩展

**新增动画：**

```scss
// apps/web/src/styles.scss
@layer utilities {
  /* 渐进式显示 */
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* 缩放进入 */
  .animate-scale-in {
    animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  /* 从右侧滑入 */
  .animate-slide-in-right {
    animation: slideInRight 0.5s ease-out;
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
}
```

**预期收益：**
- 页面切换更流畅
- 数据加载更生动
- 用户体验提升

### 7.2 中期优化（1-2月）

#### 1. 设计系统文档

**创建 Storybook：**

```bash
# 安装 Storybook
cd apps/web
npx storybook@latest init

# 创建组件故事
# apps/web/.storybook/stories/GlassCard.stories.ts
export default {
  title: 'Components/GlassCard',
  component: GlassCardComponent,
  tags: ['autodocs'],
};

export const Default = {
  render: () => ({
    template: `
      <pro-glass-card>
        <h3>玻璃态卡片</h3>
        <p>这是一个带有毛玻璃效果的卡片组件</p>
      </pro-glass-card>
    `,
  }),
};

export const WithHover = {
  render: () => ({
    template: `
      <pro-glass-card class="hover:scale-105 transition-transform">
        <h3>悬停效果</h3>
        <p>鼠标悬停时会放大</p>
      </pro-glass-card>
    `,
  }),
};
```

**编写使用指南：**

```markdown
# 设计系统使用指南

## 色彩系统

### 主色调
- `primary` - 主要品牌色 (#3B82F6)
- `secondary` - 次要色 (#9CA3AF)

### 舆情色彩
- `sentiment-positive` - 正面情感 (#2ED573)
- `sentiment-negative` - 负面情感 (#FF4757)
- `sentiment-neutral` - 中性情感 (#3742FA)

### 使用示例
```html
<div class="bg-primary text-white">主色背景</div>
<span class="text-sentiment-positive">正面</span>
```

## 间距系统

使用 `pro-space-*` 变量：
- `var(--pro-space-2)` - 8px
- `var(--pro-space-4)` - 16px
- `var(--pro-space-6)` - 24px
```

**预期收益：**
- 新人快速上手
- 减少设计偏差
- 提升团队协作

#### 2. 性能监控

**集成 Web Vitals：**

```typescript
// apps/web/src/app/core/services/performance.service.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  init() {
    onCLS(console.log);
    onFID(console.log);
    onLCP(console.log);
  }
}
```

**预期收益：**
- 实时性能监控
- 性能问题早发现
- 数据驱动优化

#### 3. 可访问性增强

**ARIA 标签完善：**

```html
<!-- 改进前 -->
<div class="status-indicator status-online"></div>

<!-- 改进后 -->
<div 
  class="status-indicator status-online" 
  role="status" 
  aria-label="在线状态：已连接"
  aria-live="polite">
</div>
```

**键盘导航支持：**

```typescript
@HostListener('keydown', ['$event'])
handleKeyboard(event: KeyboardEvent) {
  switch(event.key) {
    case 'ArrowLeft':
      this.previousScreen();
      break;
    case 'ArrowRight':
      this.nextScreen();
      break;
    case 'f':
      this.toggleFullscreen();
      break;
  }
}
```

**预期收益：**
- 符合 WCAG 2.1 AA 标准
- 支持屏幕阅读器
- 键盘完全可操作

---

## 八、参考资料

### 8.1 设计系统

**官方文档：**
- [Tailwind CSS 官方文档](https://tailwindcss.com/docs) - 完整的 Tailwind 使用指南
- [CSS 变量（自定义属性）](https://developer.mozilla.org/zh-CN/docs/Web/CSS/Using_CSS_custom_properties) - MDN 权威教程
- [玻璃态设计趋势](https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9) - Glassmorphism 设计理念

**设计资源：**
- [shadcn/ui](https://ui.shadcn.com/) - 基于 Tailwind 的组件库（设计灵感）
- [Radix Colors](https://www.radix-ui.com/colors) - 专业的色彩系统
- [Open Props](https://open-props.style/) - CSS 变量设计系统

### 8.2 Angular 最佳实践

**官方指南：**
- [Angular 样式指南](https://angular.dev/style-guide) - 官方代码规范
- [OnPush 变更检测](https://angular.dev/guide/change-detection) - 性能优化核心
- [Angular 性能优化](https://angular.dev/guide/performance) - 官方性能指南

**社区资源：**
- [Angular Performance Checklist](https://github.com/mgechev/angular-performance-checklist) - 性能检查清单
- [Angular in Depth](https://blog.angular-university.io/) - 深度技术博客

### 8.3 响应式设计

**基础理论：**
- [移动优先设计](https://web.dev/mobile-first/) - Google Web.dev 教程
- [CSS Grid 完全指南](https://css-tricks.com/snippets/css/complete-guide-grid/) - CSS Tricks
- [Flexbox 完全指南](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) - CSS Tricks

**实战技巧：**
- [Responsive Design Patterns](https://responsivedesign.is/patterns/) - 响应式模式库
- [Every Layout](https://every-layout.dev/) - 现代布局技巧

### 8.4 性能优化

**权威指南：**
- [Web Vitals](https://web.dev/vitals/) - Google 核心性能指标
- [Performance Budget](https://web.dev/performance-budgets-101/) - 性能预算设置
- [JavaScript Performance](https://developer.chrome.com/docs/devtools/performance/) - Chrome DevTools 使用

**工具推荐：**
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) - 性能审计工具
- [WebPageTest](https://www.webpagetest.org/) - 深度性能分析
- [Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) - 包体积分析

### 8.5 无障碍访问

**标准规范：**
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Web 内容无障碍指南
- [ARIA 规范](https://www.w3.org/TR/wai-aria-1.2/) - 可访问富互联网应用
- [MDN 无障碍](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility) - 无障碍开发指南

**测试工具：**
- [axe DevTools](https://www.deque.com/axe/devtools/) - Chrome 无障碍检测插件
- [WAVE](https://wave.webaim.org/) - 在线无障碍评估工具

---

## 总结

本升级方案将 @pro/web 的 UI 系统全面提升到现代化水平，核心改进包括：

### 核心成果

1. **完整的设计系统** - 60+ CSS 变量，支持亮/暗主题切换
2. **现代化视觉效果** - 玻璃态、渐变、阴影、流畅动画
3. **响应式布局** - 完整的移动端、平板、桌面适配
4. **性能优化** - GPU 加速、contain 优化、will-change 策略
5. **可维护性** - 组件化、变量化、文档化的设计模式

### 关键指标

| 维度 | 升级前 | 升级后 | 提升 |
|------|--------|--------|------|
| CSS 变量 | 0 个 | 60+ 个 | ∞ |
| 代码行数 | 160 行 | 600+ 行 | 275% |
| 主题支持 | ❌ | ✅ | 新增 |
| 响应式断点 | 部分 | 完整 | 100% |
| 动画数量 | 4 个 | 12+ 个 | 200% |
| 性能优化 | 基础 | 专业 | 显著 |

### 风险评估

- **技术风险：** ⭐⭐☆☆☆ 低（纯样式升级，逻辑不变）
- **时间风险：** ⭐⭐⭐☆☆ 中（预计 4-6 小时）
- **回滚难度：** ⭐☆☆☆☆ 极低（文件级快速回滚）
- **收益评估：** ⭐⭐⭐⭐⭐ 极高（用户体验 + 开发效率）

### 下一步行动

1. **立即执行** - 按照"四、实施流程"开始升级
2. **全程验证** - 每个阶段完成后进行测试
3. **记录问题** - 遇到问题及时记录和解决
4. **总结经验** - 升级完成后总结最佳实践

---

**文档版本：** v1.0  
**最后更新：** 2025-10-22  
**维护者：** @pro/web 前端团队

