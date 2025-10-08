# Volume 挂载方案总结

## 修改文件清单

### 1. Dockerfile 简化

#### apps/admin/Dockerfile
- **移除**：多阶段构建（builder 阶段）
- **移除**：node、pnpm 安装
- **移除**：依赖安装和构建步骤
- **保留**：仅保留 nginx 基础镜像和配置文件复制

#### apps/web/Dockerfile
- **移除**：多阶段构建（builder 阶段）
- **移除**：node、pnpm 安装
- **移除**：依赖安装和构建步骤
- **保留**：仅保留 nginx 基础镜像和配置文件复制

### 2. docker-compose.yml 配置调整

#### web 服务
```yaml
web:
  build:
    context: .
    dockerfile: apps/web/Dockerfile  # 改用生产 Dockerfile
  ports:
    - "${WEB_PORT:-8080}:80"  # 端口改为 8080
  volumes:
    - ./apps/web/dist/web/browser:/usr/share/nginx/html:ro  # 新增：挂载构建产物
  # 移除了开发模式的 volume 挂载（源码、node_modules）
  # 移除了 NODE_ENV=development
```

#### admin 服务
```yaml
admin:
  build:
    context: .
    dockerfile: apps/admin/Dockerfile  # 改用生产 Dockerfile
  ports:
    - "${ADMIN_PORT:-8081}:80"  # 端口改为 8081
  volumes:
    - ./apps/admin/dist/admin/browser:/usr/share/nginx/html:ro  # 新增：挂载构建产物
  # 移除了开发模式的 volume 挂载（源码、node_modules）
  # 移除了 NODE_ENV=development
```

## 使用流程

### 首次启动

```bash
# 1. 构建前端应用（在宿主机）
./build-frontend.sh

# 2. 启动 Docker 容器
docker-compose up -d --build web admin
```

### 代码更新后

```bash
# 1. 重新构建前端
./build-frontend.sh

# 2. 重启容器（无需重建镜像）
docker-compose restart web admin
```

### Dockerfile 或 nginx.conf 更新后

```bash
# 需要重建镜像
docker-compose up -d --build web admin
```

## 关键配置说明

### Volume 挂载
- **路径映射**：`./apps/{app}/dist/{app}/browser` → `/usr/share/nginx/html`
- **只读模式**：使用 `:ro` 标记，防止容器修改宿主机文件
- **Angular 输出**：Angular 的 browser 产物直接映射到 nginx 根目录

### 端口配置
- **web**: 8080 (可通过 WEB_PORT 环境变量配置)
- **admin**: 8081 (可通过 ADMIN_PORT 环境变量配置)

### 健康检查
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --spider --quiet http://localhost/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## 优势对比

| 特性 | 旧方案（容器内构建） | 新方案（Volume 挂载） |
|------|---------------------|---------------------|
| 镜像大小 | ~500MB+ | ~20MB |
| 构建时间 | 5-10分钟 | <1分钟（仅镜像） |
| 代码更新 | 需重建镜像 | 只需重启容器 |
| 开发体验 | 较慢 | 快速 |
| 依赖管理 | 在容器内 | 在宿主机 |

## 注意事项

1. **构建产物必须存在**：启动容器前，确保已执行 `./build-frontend.sh`
2. **路径一致性**：确保 angular.json 的 outputPath 与 volume 挂载路径匹配
3. **权限问题**：如遇权限问题，检查构建产物目录的读取权限
4. **开发模式**：如需热重载开发，使用 Dockerfile.dev（如果存在）

## 文件引用

- 构建脚本：`build-frontend.sh`
- 使用文档：`FRONTEND_BUILD.md`
- 配置文件：
  - `apps/web/Dockerfile`
  - `apps/admin/Dockerfile`
  - `docker-compose.yml`
  - `apps/web/nginx.conf`
  - `apps/admin/nginx.conf`
