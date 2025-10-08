# 前端构建与部署说明

## 架构调整

前端应用（web 和 admin）已改为 **volume 挂载模式**，构建在宿主机进行，容器仅提供 nginx 静态服务。

## 构建流程

### 1. 构建前端产物

在宿主机上执行构建：

```bash
# 构建 web 应用
cd apps/web
pnpm build

# 构建 admin 应用
cd apps/admin
pnpm build
```

构建产物位置：
- **web**: `apps/web/dist/web/browser/`
- **admin**: `apps/admin/dist/admin/browser/`

### 2. 启动容器

构建产物准备好后，启动 Docker 容器：

```bash
# 首次启动或 Dockerfile 变更时，需要 --build
docker-compose up -d --build web admin

# 后续启动
docker-compose up -d web admin
```

### 3. 访问应用

- **web**: http://localhost:8080
- **admin**: http://localhost:8081

（端口可通过 .env 文件的 WEB_PORT 和 ADMIN_PORT 配置）

## 配置详情

### Dockerfile 简化

两个前端应用的 Dockerfile 都简化为：

```dockerfile
FROM nginx:alpine

COPY apps/{web|admin}/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml 配置

```yaml
web:
  build:
    context: .
    dockerfile: apps/web/Dockerfile
  ports:
    - "${WEB_PORT:-8080}:80"
  volumes:
    - ./apps/web/dist/web/browser:/usr/share/nginx/html:ro
  # ...

admin:
  build:
    context: .
    dockerfile: apps/admin/Dockerfile
  ports:
    - "${ADMIN_PORT:-8081}:80"
  volumes:
    - ./apps/admin/dist/admin/browser:/usr/share/nginx/html:ro
  # ...
```

## 优势

1. **构建与运行分离**：构建在宿主机进行，容器仅负责服务
2. **镜像更小**：镜像只包含 nginx 和配置，不含 node_modules 等构建依赖
3. **更新更快**：修改代码后只需重新构建前端，无需重建镜像
4. **开发友好**：可以在宿主机使用熟悉的工具进行构建和调试

## 注意事项

1. **首次启动前必须构建**：容器启动前，必须确保构建产物存在
2. **代码更新流程**：
   - 修改代码
   - 在宿主机执行 `pnpm build`
   - 重启容器：`docker-compose restart web` 或 `docker-compose restart admin`
3. **volume 挂载为只读**：使用 `:ro` 标记，防止容器修改宿主机文件

## 开发模式

如需开发模式（热重载），可以使用之前的 Dockerfile.dev 配置：

```bash
docker-compose -f docker-compose.dev.yml up web admin
```
