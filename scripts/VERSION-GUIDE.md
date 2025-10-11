# Docker 镜像版本管理指南

基于 Git Tag 的版本化镜像构建与回滚方案,实现精确的版本控制和快速回滚能力。

---

## 📚 目录

- [快速开始](#快速开始)
- [脚本说明](#脚本说明)
- [版本管理流程](#版本管理流程)
- [回滚操作](#回滚操作)
- [镜像清理](#镜像清理)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

---

## 🚀 快速开始

### 前置要求

- Docker 18.09+ (支持 BuildKit)
- Docker Compose 1.27+
- Git 2.0+
- Bash 4.0+

### 环境变量配置

```bash
# 设置镜像仓库地址 (必需)
export REGISTRY="your-registry.com/pro"

# 启用 Docker BuildKit (推荐)
export DOCKER_BUILDKIT=1
```

可以将以上配置添加到 `~/.bashrc` 或 `~/.zshrc`:

```bash
# 添加到 shell 配置文件
echo 'export REGISTRY="your-registry.com/pro"' >> ~/.bashrc
echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
source ~/.bashrc
```

---

## 📦 脚本说明

### 1. build-image.sh - 镜像构建脚本

**功能**: 基于 Git Tag 或 Commit Hash 构建版本化 Docker 镜像

**用法**:
```bash
./scripts/build-image.sh <service> [version]
```

**参数**:
- `service` (必需): 服务名称 (`api`, `web`, `admin`, `crawler`, `cleaner`, `broker`)
- `version` (可选): 版本标签,默认使用当前 commit hash

**示例**:
```bash
# 使用当前 commit hash 构建
./scripts/build-image.sh api

# 使用指定版本标签构建
./scripts/build-image.sh api v1.2.3

# 使用 git describe 构建
./scripts/build-image.sh web $(git describe --tags)

# 使用环境变量指定仓库
REGISTRY="my-registry.com/pro" ./scripts/build-image.sh api v1.0.0
```

**构建产物**:
- `{REGISTRY}/{service}:{version}` - 版本化镜像
- `{REGISTRY}/{service}:latest` - 最新版本镜像

---

### 2. rollback.sh - 镜像回滚脚本

**功能**: 快速回滚服务到指定版本

**用法**:
```bash
./scripts/rollback.sh <service> [target-version]
```

**参数**:
- `service` (必需): 服务名称
- `target-version` (可选): 目标版本,不指定则列出可用版本

**示例**:
```bash
# 列出可用版本
./scripts/rollback.sh api

# 显示当前运行版本
./scripts/rollback.sh api --show-current

# 回滚到指定版本
./scripts/rollback.sh api v1.2.2

# 使用不同的 docker-compose 文件
COMPOSE_FILE=docker-compose.prod.yml ./scripts/rollback.sh api v1.2.2
```

**回滚流程**:
1. 显示当前版本和目标版本
2. 确认回滚操作
3. 检查目标镜像是否存在
4. 停止当前服务
5. 启动新版本服务
6. 验证服务状态
7. 显示服务日志

---

### 3. clean-images.sh - 镜像清理脚本

**功能**: 清理旧版本镜像,释放磁盘空间

**用法**:
```bash
./scripts/clean-images.sh [service] [keep-count]
```

**参数**:
- `service` (可选): 服务名称,不指定则清理所有服务
- `keep-count` (可选): 保留版本数,默认 5 个

**示例**:
```bash
# 清理所有服务,保留最近 5 个版本
./scripts/clean-images.sh

# 清理 api 服务,保留最近 10 个版本
./scripts/clean-images.sh api 10

# 仅清理悬空镜像 (dangling images)
./scripts/clean-images.sh --dangling

# 清理所有未使用的镜像
./scripts/clean-images.sh --all
```

**安全特性**:
- 显示清理前后的磁盘使用情况
- 列出将要删除的镜像
- 需要用户确认才执行删除
- 跳过正在使用的镜像

---

## 🔄 版本管理流程

### 完整的版本发布流程

```bash
# 1. 开发完成后,确保所有改动已提交
git status
git add .
git commit -m "feat: 添加新功能"

# 2. 创建版本标签 (使用语义化版本)
git tag -a v1.2.3 -m "Release v1.2.3: 添加 XXX 功能"
git push origin v1.2.3

# 3. 构建镜像
./scripts/build-image.sh api v1.2.3

# 4. 推送镜像到仓库 (脚本会提示)
# 输入 'y' 确认推送

# 5. 部署到测试环境
docker-compose -f docker-compose.test.yml pull api
docker-compose -f docker-compose.test.yml up -d api

# 6. 测试通过后,部署到生产环境
docker-compose -f docker-compose.prod.yml pull api
docker-compose -f docker-compose.prod.yml up -d api

# 7. 验证部署
./scripts/rollback.sh api --show-current
docker logs -f pro-api
```

### 语义化版本规范

遵循 [Semantic Versioning 2.0.0](https://semver.org/lang/zh-CN/) 规范:

```
v{MAJOR}.{MINOR}.{PATCH}[-{PRERELEASE}][+{BUILD}]
```

**版本号递增规则**:
- **MAJOR**: 不兼容的 API 修改 (如 v1.0.0 → v2.0.0)
- **MINOR**: 向下兼容的功能新增 (如 v1.0.0 → v1.1.0)
- **PATCH**: 向下兼容的问题修正 (如 v1.0.0 → v1.0.1)
- **PRERELEASE**: 预发布版本 (如 v1.0.0-alpha.1, v1.0.0-rc.1)

**示例**:
```bash
# 主版本更新 (Breaking Changes)
git tag -a v2.0.0 -m "Release v2.0.0: 重构 API 接口"

# 次版本更新 (新功能)
git tag -a v1.3.0 -m "Release v1.3.0: 新增用户管理功能"

# 补丁版本 (Bug 修复)
git tag -a v1.2.1 -m "Release v1.2.1: 修复登录超时问题"

# 预发布版本
git tag -a v1.4.0-beta.1 -m "Release v1.4.0-beta.1: 测试新支付功能"
```

---

## ⏪ 回滚操作

### 场景 1: 紧急回滚

当生产环境出现严重问题时,快速回滚到上一个稳定版本:

```bash
# 1. 查看当前版本和可用版本
./scripts/rollback.sh api

# 2. 回滚到上一个版本
./scripts/rollback.sh api v1.2.2

# 3. 验证回滚结果
./scripts/rollback.sh api --show-current
docker logs -f pro-api

# 4. 检查服务健康状态
curl http://localhost:3000/health
```

### 场景 2: 灰度回滚

在多实例环境中逐步回滚:

```bash
# 1. 回滚部分实例 (使用 Docker Swarm)
docker service update \
  --image your-registry.com/pro/api:v1.2.2 \
  --update-parallelism 1 \
  --update-delay 30s \
  pro_api

# 2. 观察监控指标,确认稳定后继续

# 3. 回滚剩余实例
docker service update pro_api --force
```

### 场景 3: 回滚后重新构建

如果需要在旧版本基础上修复:

```bash
# 1. 回滚代码到旧版本
git checkout v1.2.2

# 2. 修复问题
# ... 编辑代码 ...

# 3. 创建补丁版本
git add .
git commit -m "fix: 修复 XXX 问题"
git tag -a v1.2.3 -m "Release v1.2.3: 修复 XXX 问题"

# 4. 构建新镜像
./scripts/build-image.sh api v1.2.3

# 5. 部署新版本
./scripts/rollback.sh api v1.2.3
```

---

## 🧹 镜像清理

### 定期清理策略

建议每周或每月执行一次镜像清理,释放磁盘空间:

```bash
# 1. 查看当前磁盘使用情况
docker system df

# 2. 清理所有服务的旧镜像 (保留最近 5 个版本)
./scripts/clean-images.sh

# 3. 清理悬空镜像
./scripts/clean-images.sh --dangling

# 4. 清理未使用的镜像、容器、网络、卷
docker system prune -a --volumes
```

### 自动化清理

使用 cron 定时任务自动清理:

```bash
# 编辑 crontab
crontab -e

# 添加定时任务 (每周日凌晨 2 点清理)
0 2 * * 0 cd /path/to/pro && ./scripts/clean-images.sh api 5 >> /var/log/docker-clean.log 2>&1
```

### 保留策略建议

| 环境 | 保留版本数 | 说明 |
|------|-----------|------|
| 生产环境 | 10-20 | 保留足够的历史版本用于回滚 |
| 测试环境 | 5-10 | 保留近期版本用于对比测试 |
| 开发环境 | 3-5 | 仅保留最新版本,节省空间 |

---

## ✅ 最佳实践

### 1. 版本命名规范

```bash
# ✅ 推荐
v1.2.3
v1.2.3-beta.1
v1.2.3-rc.2

# ❌ 不推荐
1.2.3 (缺少 v 前缀)
version-1.2.3 (格式不标准)
release_1.2.3 (使用下划线)
```

### 2. Git Tag 消息规范

```bash
# ✅ 推荐 - 包含详细的变更说明
git tag -a v1.2.3 -m "Release v1.2.3

新功能:
- 添加用户权限管理
- 支持批量导入数据

Bug 修复:
- 修复登录超时问题
- 解决文件上传失败问题

性能优化:
- 优化数据库查询性能
"

# ❌ 不推荐 - 消息过于简单
git tag -a v1.2.3 -m "update"
```

### 3. 构建前检查

```bash
# 确保工作目录干净
git status

# 确保所有测试通过
bun test

# 确保类型检查通过
bun run --filter=@pro/api typecheck

# 确保代码格式正确
bun run lint
```

### 4. 镜像标签策略

```bash
# 始终同时推送版本标签和 latest 标签
your-registry.com/pro/api:v1.2.3    # 精确版本
your-registry.com/pro/api:latest    # 最新版本
your-registry.com/pro/api:v1.2      # 次版本 (可选)
your-registry.com/pro/api:v1        # 主版本 (可选)
```

### 5. 版本文档记录

在仓库中维护 `CHANGELOG.md` 文件:

```markdown
# Changelog

## [v1.2.3] - 2025-01-15

### Added
- 用户权限管理功能
- 批量数据导入接口

### Fixed
- 修复登录超时问题
- 解决文件上传失败问题

### Changed
- 优化数据库查询性能
- 更新依赖包版本
```

### 6. 回滚测试

在非生产环境定期演练回滚流程:

```bash
# 每月执行一次回滚演练
# 1. 部署新版本
./scripts/build-image.sh api v1.3.0
./scripts/rollback.sh api v1.3.0

# 2. 模拟故障,执行回滚
./scripts/rollback.sh api v1.2.3

# 3. 验证回滚后功能正常
# 4. 记录回滚时间和问题
```


---

## 🔧 故障排查

### 问题 1: 镜像推送失败

**症状**:
```
Error: denied: requested access to the resource is denied
```

**解决方案**:
```bash
# 1. 检查 Docker 登录状态
docker login your-registry.com

# 2. 检查镜像仓库权限
# 确保当前用户有推送权限

# 3. 检查 REGISTRY 环境变量
echo $REGISTRY

# 4. 手动推送测试
docker push your-registry.com/pro/api:v1.2.3
```

### 问题 2: 回滚后服务无法启动

**症状**:
```
Error: container exited with code 1
```

**解决方案**:
```bash
# 1. 查看容器日志
docker logs pro-api

# 2. 检查环境变量配置
docker inspect pro-api | grep -A 20 "Env"

# 3. 检查依赖服务状态
docker-compose ps

# 4. 尝试手动启动容器调试
docker run -it --rm \
  --entrypoint /bin/sh \
  your-registry.com/pro/api:v1.2.3
```

### 问题 3: 构建缓存失效

**症状**:
构建速度慢,所有层都重新构建

**解决方案**:
```bash
# 1. 确保启用 BuildKit
export DOCKER_BUILDKIT=1

# 2. 显式指定缓存源
docker buildx build \
  --cache-from your-registry.com/pro/api:latest \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  ...

# 3. 清理损坏的缓存
docker builder prune
```

### 问题 4: 磁盘空间不足

**症状**:
```
Error: no space left on device
```

**解决方案**:
```bash
# 1. 查看磁盘使用情况
docker system df
df -h

# 2. 清理所有未使用资源
docker system prune -a --volumes

# 3. 清理旧版本镜像
./scripts/clean-images.sh api 3

# 4. 清理构建缓存
docker builder prune -a
```

### 问题 5: Git Tag 冲突

**症状**:
```
fatal: tag 'v1.2.3' already exists
```

**解决方案**:
```bash
# 1. 查看已存在的标签
git show v1.2.3

# 2. 如果需要覆盖 (慎用!)
git tag -f -a v1.2.3 -m "新的版本说明"
git push origin v1.2.3 --force

# 3. 推荐方式: 使用新的补丁版本
git tag -a v1.2.4 -m "版本说明"
```

---

## 📊 版本管理流程图

```
┌─────────────┐
│ 代码开发完成  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 运行测试     │
│ bun test    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 创建 Git Tag│
│ git tag -a  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 构建镜像     │
│ build-image │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 推送镜像     │
│ docker push │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 部署测试环境 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 测试验证     │
└──────┬──────┘
       │
       ├─[失败]─────┐
       │            ▼
       │     ┌─────────────┐
       │     │ 回滚版本     │
       │     │ rollback.sh │
       │     └─────────────┘
       │
       └─[成功]────┐
                   ▼
            ┌─────────────┐
            │ 部署生产环境 │
            └──────┬──────┘
                   │
                   ▼
            ┌─────────────┐
            │ 监控告警     │
            └─────────────┘
```

---

## 🔗 相关链接

- [Semantic Versioning 规范](https://semver.org/lang/zh-CN/)
- [Docker BuildKit 文档](https://docs.docker.com/build/buildkit/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Git Tag 文档](https://git-scm.com/book/zh/v2/Git-基础-打标签)

---

## 📝 维护日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-01-15 | v1.0.0 | 初始版本,创建版本管理脚本和文档 |

---

## 📞 支持

如有问题或建议,请联系:
- 技术支持: tech-support@example.com
- 项目仓库: https://github.com/your-org/pro

---

**Happy Versioning! 🎉**
