# Playwright 基础镜像

## 概述

这是一个专门为 Pro 项目设计的 Playwright 基础镜像，遵循「存在即合理，优雅即简约」的设计理念，提供了包含 Playwright 浏览器和系统依赖的统一环境。

## 🎯 设计理念

### 核心原则
- **存在即合理**：每一个依赖包都有其存在的必要理由，无冗余安装
- **优雅即简约**：最小化依赖集合，代码自文档化，无需多余注释
- **性能即艺术**：分层缓存策略，最大化构建效率和运行性能
- **权限统一**：与项目基础镜像保持一致的权限配置

### 🏗️ 架构设计
```
imeepos/base:latest
        ↓ (统一权限配置)
imeepos/packages-builder:latest
        ↓ (预构建 packages)
imeepos/playwright:latest (本镜像)
        ↓ (Playwright 环境)
应用镜像 (API、Admin、Crawler)
```

## 使用方法

### 在应用 Dockerfile 中使用

```dockerfile
# ========================================
# 应用 Dockerfile 示例
# ========================================
# 基于 Playwright 基础镜像
FROM imeepos/playwright:latest AS base

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --chown=nestjs:nodejs package.json ./
RUN bun install
COPY . .
RUN bun run build

# 生产阶段
FROM base AS production
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
USER nestjs
CMD ["bun", "dist/main.js"]
```

### 环境变量配置

镜像预配置了以下环境变量，确保 Playwright 正常工作：

```bash
# Playwright 配置
PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
CHROME_BIN=/usr/bin/chromium-browser
CHROME_PATH=/usr/lib/chromium/

# 系统环境
NODE_ENV=production
BUN_INSTALL=/home/nestjs/.bun
PATH=${BUN_INSTALL}/bin:${PATH}
```

## 📦 技术规格

### 系统依赖分类

#### 1. 核心渲染库
Chromium 浏览器运行的基础图形界面库：
- `libc6-compat`: C 库兼容层，支持现代化二进制文件
- `glib`: GLib 库，提供数据结构和实用工具
- `nss` + `nspr`: 网络安全服务，支持 SSL/TLS
- `gtk+3.0` + `cairo`: 图形界面和 2D 渲染库
- X11 扩展库: `libx11`, `libxcomposite`, `libxcursor` 等

#### 2. 字体和文本支持
- `ttf-freefont`: 免费字体集合，确保网页内容正确显示
- `pango`: 文本渲染和布局库

#### 3. 网络和系统工具
- `ca-certificates`: CA 证书包，确保 HTTPS 连接正常
- `alsa-lib`: 音频系统库，支持网页音频处理
- `dbus` + `xdg-utils`: 系统工具，支持浏览器自动化

### 权限配置
- **运行用户**: `nestjs` (UID: 1001)
- **用户组**: `nodejs` (GID: 1001)
- **工作目录**: `/app`
- **缓存目录**: `/root/.cache/ms-playwright` (nestjs 用户可访问)

### 目录结构
```
/app                          # 应用工作目录 (nestjs:nodejs)
/home/nestjs/.bun            # Bun 包管理器 (nestjs:nodejs)
/root/.cache/ms-playwright   # Playwright 浏览器缓存 (nestjs:nodejs)
/usr/bin/chromium-browser    # Chromium 浏览器二进制
```

## 🚀 优势特点

### 构建效率
- **分层缓存**: 系统依赖与浏览器分离安装，最大化缓存复用
- **最小化变更**: 仅安装必要的系统包，减少构建时间
- **依赖优化**: 按变化频率排序，源码变更不影响依赖层

### 安全性
- **非 root 运行**: 使用 nestjs 用户执行应用，遵循最小权限原则
- **统一权限**: 与项目基础镜像保持一致的权限配置
- **安全基础**: 基于经过安全审计的 packages-builder 镜像

### 体积优化
- **单浏览器策略**: 仅安装 Chromium，减少镜像大小
- **依赖精简**: 每个包都有明确用途，无冗余安装
- **缓存清理**: 安装后自动清理临时文件和缓存

## 🎯 适用场景

### 推荐应用
- **API 应用**: 需要浏览器测试、截图或 PDF 生成功能
- **Admin 应用**: 需要生成报告、截图或浏览器自动化
- **Crawler 应用**: 网页爬取、数据抓取和内容分析

### 应用迁移指南

现有应用可以通过以下方式迁移到 Playwright 基础镜像：

#### 修改前的 Dockerfile:
```dockerfile
FROM imeepos/packages-builder:latest AS runtime-deps
USER root
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
USER nestjs
```

#### 修改后的 Dockerfile:
```dockerfile
FROM imeepos/playwright:latest AS base
# 无需再安装 Playwright 依赖，直接使用
```

## 🔧 构建和维护

### 构建镜像

```bash
# 构建本地镜像
docker build -t imeepos/playwright:latest ./docker/playwright/

# 推送到仓库
docker push imeepos/playwright:latest
```

### 依赖更新策略

1. **浏览器更新**: Playwright 发布新版本时重新构建
2. **系统依赖**: Alpine 包更新时评估是否需要更新
3. **安全补丁**: 发现安全问题时及时更新依赖

### 版本标签建议

```bash
# 稳定版本
imeepos/playwright:1.0.0

# Playwright 版本标签
imeepos/playwright:1.40.0

# 构建时间标签
imeepos/playwright:20241011
```

## 🐛 故障排除

### 常见问题诊断

#### Playwright 无法找到浏览器
```bash
# 检查环境变量
echo $PLAYWRIGHT_BROWSERS_PATH

# 验证浏览器路径
ls -la /usr/bin/chromium-browser

# 测试 Playwright 安装
npx playwright --version
```

#### 权限相关错误
```bash
# 检查当前用户
whoami

# 验证目录权限
ls -la /root/.cache/ms-playwright

# 修复权限问题
sudo chown -R nestjs:nodejs /root/.cache/ms-playwright
```

#### 字体显示异常
```bash
# 检查已安装字体
fc-list | grep -i freefont

# 测试字体渲染
node -e "console.log('Font test passed')"
```

### 调试命令集

```bash
# 完整的环境检查
node -e "
console.log('Node.js:', process.version);
console.log('Playwright:', require('playwright').version);
console.log('Environment:', process.env.PLAYWRIGHT_BROWSERS_PATH);
"

# 测试浏览器启动
node -e "
const { chromium } = require('playwright');
chromium().launch().then(browser => {
  console.log('✅ Browser started successfully');
  return browser.close();
}).catch(err => console.error('❌ Browser failed:', err));
"

# 验证所有依赖
npx playwright install --help
```

## 📈 性能优化建议

### 构建时优化
- 使用 `.dockerignore` 排除不必要的文件
- 利用 Docker BuildKit 的缓存挂载功能
- 合理安排 COPY 指令顺序，最大化缓存利用率

### 运行时优化
- 配置适当的内存限制
- 使用 Docker 资源约束避免资源竞争
- 定期清理 Playwright 缓存目录

### 监控指标
- 镜像大小变化趋势
- 构建时间统计
- 运行时内存使用情况
- 浏览器启动成功率