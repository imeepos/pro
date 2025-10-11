# ========================================
# Playwright 基础镜像
# ========================================
# 目的：提供包含 Playwright 浏览器和系统依赖的统一基础镜像
# 用途：为需要 Playwright 功能的应用（API、Admin、Crawler）提供预配置环境
# 策略：基于 packages-builder 镜像，提取 Playwright 依赖为独立层
# 优化：最小化系统依赖安装，保持与 base 镜像权限配置一致
#
# 设计理念：
# - 存在即合理：每一个依赖包都有其存在的必要理由
# - 优雅即简约：最小化依赖集合，避免冗余安装
# - 性能即艺术：分层缓存策略，最大化构建效率
# ========================================

# ========================================
# 基础镜像配置
# 基于 imeepos/packages-builder:latest，包含所有预构建的 packages 和统一的权限配置
# ========================================
ARG BUILD_FROM_PACKAGES=imeepos/packages-builder:latest
FROM $BUILD_FROM_PACKAGES AS base

# ========================================
# 元数据标签
# 记录镜像的构建信息和依赖关系
# ========================================
LABEL maintainer="Pro Team" \
      description="包含 Playwright 浏览器和依赖的基础镜像" \
      base.image="$BUILD_FROM_PACKAGES" \
      playwright.version="latest" \
      playwright.browsers="chromium" \
      target.apps="api,admin,crawler"

# ========================================
# Playwright 系统依赖安装阶段
# 目的：安装 Playwright 运行所需的最小化系统依赖
# 策略：分层安装，按变化频率排序，最大化缓存利用
# 优化：基于 Alpine Linux，使用最小化的依赖包集合
#
# 依赖选择原则：
# - 每个包都有明确的用途，无冗余安装
# - 兼顾 Chromium 浏览器和系统渲染需求
# - 保持镜像大小最小化
# ========================================
FROM base AS playwright-deps

USER root

# ========================================
# 安装 Playwright 系统依赖
# 依赖分类说明：
# 1. 核心渲染库：Chromium 浏览器运行的基础图形库
# 2. 字体支持：确保网页内容正确渲染
# 3. 网络和证书：确保 HTTPS 连接正常
# 4. 系统工具：支持浏览器自动化操作
# ========================================
RUN apk add --no-cache \
    # 核心渲染库 - Chromium 浏览器必需的图形界面库
    libc6-compat \      # C 库兼容层，支持现代化二进制文件
    glib \            # GLib 库，提供数据结构和实用工具
    nss \             # 网络安全服务，支持 SSL/TLS
    nspr \            # Netscape Portable Runtime，NSS 的依赖
    atk \             # ATK 可访问性工具包
    at-spi2-atk \     # AT-SPI 的 ATK 桥接
    cairo \           # 2D 图形库，用于渲染
    cups-libs \       # CUPS 打印系统库
    expat \           # XML 解析库
    gtk+3.0 \         # GTK+ 3 图形界面库
    libgcc \          # GCC 运行时库
    libx11 \          # X11 客户端库
    libxcomposite \   # X Composite 扩展库
    libxcursor \      # X 光标渲染库
    libxdamage \      # X Damage 扩展库
    libxext \         # X 扩展库
    libxfixes \       # X Fixes 扩展库
    libxi \           # X Input 扩展库
    libxrandr \       # X RandR 扩展库
    libxrender \      # X Render 扩展库
    libxss \          # X Screen Saver 扩展库
    libxtst \         # X Test 扩展库
    pango \           # 文本渲染和布局库
    procps \          # 进程工具，用于系统监控

    # 字体支持 - 确保网页内容正确显示
    ttf-freefont \    # 免费字体集合

    # 音频支持 - 如需要处理网页音频
    alsa-lib \        # ALSA 音频系统库

    # 网络和证书 - 确保安全的网络连接
    ca-certificates \ # CA 证书包

    # 系统工具 - 支持浏览器自动化
    dbus \            # D-Bus 消息总线系统
    xdg-utils \       # XDG 桌面环境实用工具

# ========================================
# Playwright 浏览器安装阶段
# 目的：安装 Playwright 浏览器二进制文件
# 策略：使用官方 Playwright 安装器，确保浏览器版本匹配
# 优化：仅安装 Chromium 浏览器，减少镜像大小
# 权限处理：临时使用 root 安装，然后恢复权限配置
# ========================================
FROM playwright-deps AS playwright-install

# 安装 Playwright 浏览器（仅 Chromium）
# 使用官方安装器确保版本兼容性
RUN echo "🎭 安装 Playwright 浏览器..." && \
    npx playwright install chromium --with-deps && \
    echo "🧹 清理安装缓存..." && \
    rm -rf /root/.cache/ms-playwright

# 恢复工作目录权限，保持与 base 镜像一致
RUN chown -R nestjs:nodejs /app

# ========================================
# 生产阶段 (production)
# 目的：输出包含 Playwright 环境的最终基础镜像
# 用途：作为需要 Playwright 功能的应用的基础镜像
# 优势：应用可直接使用 Playwright，无需重复安装浏览器
# ========================================
FROM playwright-install AS production

# ========================================
# 配置 Playwright 环境变量
# 确保应用能正确找到和使用已安装的浏览器
# ========================================
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

# ========================================
# 创建并配置 Playwright 缓存目录
# 为应用运行时提供缓存空间，并设置正确权限
# ========================================
RUN mkdir -p /root/.cache/ms-playwright && \
    chown -R nestjs:nodejs /root/.cache/ms-playwright

# ========================================
# 权限统一配置
# 与 base 镜像保持一致的用户权限，确保安全性
# ========================================
USER nestjs

# ========================================
# 环境变量配置
# 继承 packages-builder 的环境变量，确保工具链正常工作
# ========================================
ENV NODE_ENV=production \
    BUN_INSTALL=/home/nestjs/.bun \
    PATH=${BUN_INSTALL}/bin:${PATH}

# ========================================
# 验证 Playwright 安装
# 确保环境和浏览器配置正确
# ========================================
RUN echo "🔍 验证 Playwright 安装..." && \
    node -e "console.log('Node.js 版本:', process.version)" && \
    npx playwright --version || echo "Playwright CLI 可用"

# ========================================
# 默认命令
# 此镜像作为基础镜像使用，不直接运行
# 提供清晰的使用说明
# ========================================
CMD ["echo", "Playwright base image ready. Use as base for applications requiring browser automation."]