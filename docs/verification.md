# 服务验证指南

本文档说明如何验证 docker-compose 环境中的核心服务是否已成功启动并可用。

## 前置条件

- 已安装 Docker 与 Docker Compose 插件。
- 已复制 `.env.example` 为 `.env` 并根据实际情况调整变量。

## 启动服务

```bash
docker compose up -d
```

确认所有容器状态正常：

```bash
docker compose ps
```

## PostgreSQL

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'vector');"
```

输出中若包含 `postgis` 与 `vector` 代表插件已安装。

## Redis

```bash
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
```

返回 `PONG` 表示 Redis 正常。

## RabbitMQ

浏览器访问 `http://localhost:${RABBITMQ_MANAGEMENT_PORT}`，使用 `.env` 中的账户登录。  
命令行检查健康状况：

```bash
docker compose exec rabbitmq rabbitmq-diagnostics -q status
```

## MongoDB

```bash
docker compose exec mongo mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "db.adminCommand('ping')"
```

返回 `{ ok: 1 }` 表示连接成功。

## MinIO

1. 使用浏览器访问 `http://localhost:${MINIO_CONSOLE_PORT}` 登录控制台。
2. 验证默认 Bucket 是否存在：  

```bash
docker compose run --rm --entrypoint mc minio-setup ls local/"$MINIO_BUCKET_NAME"
```

如需向 Bucket 上传文件，可覆盖 entrypoint 使用 `mc`：

```bash
docker compose run --rm --entrypoint mc \
  -v /path/to/file:/uploads/object \
  minio-setup cp /uploads/object local/"$MINIO_BUCKET_NAME"/
```

## Nginx

- 健康检查：浏览器访问 `http://localhost:${NGINX_HTTP_PORT}/healthz`，应返回 `ok`。
- MinIO API 代理：访问 `http://localhost:${NGINX_HTTP_PORT}/minio/`，应重定向至 MinIO 登录。

## 停止服务

```bash
docker compose down
```

若需要保留数据，可移除 `-v`；否则为完全清理可以执行：

```bash
docker compose down -v
```
