# 基于MediaCrawler增强的微博爬取系统 - 安全配置指南
# Weibo Crawler System Security Configuration Guide

## 目录

1. [安全架构概述](#安全架构概述)
2. [身份认证与授权](#身份认证与授权)
3. [网络安全配置](#网络安全配置)
4. [数据安全保护](#数据安全保护)
5. [容器安全配置](#容器安全配置)
6. [API安全防护](#api安全防护)
7. [反爬虫对策](#反爬虫对策)
8. [安全监控与审计](#安全监控与审计)
9. [合规性要求](#合规性要求)
10. [安全检查清单](#安全检查清单)

## 安全架构概述

### 安全防护体系

```
┌─────────────────────────────────────────────────────────┐
│                    安全防护体系                           │
├─────────────────────────────────────────────────────────┤
│  防火墙 │ WAF │ IDS/IPS │ 流量清洗 │ DDoS防护              │
├─────────────────────────────────────────────────────────┤
│    网络安全    │    应用安全    │    数据安全    │ 运维安全   │
│   VPN/TLS    │   认证授权     │   加密存储     │  访问控制    │
│  网络隔离    │   代码扫描     │   数据脱敏     │  审计日志    │
│  入侵检测    │   漏洞管理     │   备份恢复     │  应急响应    │
├─────────────────────────────────────────────────────────┤
│              基础设施安全 (K8s/Docker/主机)               │
└─────────────────────────────────────────────────────────┘
```

### 安全设计原则

1. **纵深防御**: 多层次安全防护
2. **最小权限**: 仅授予必要的权限
3. **零信任**: 不信任任何内部/外部请求
4. **数据保护**: 全生命周期数据安全
5. **持续监控**: 实时安全威胁检测

### 威胁模型

| 威胁类型 | 风险等级 | 防护措施 |
|----------|----------|----------|
| 反爬虫检测 | 高 | IP轮换、User-Agent伪装、请求间隔控制 |
| 数据泄露 | 高 | 数据加密、访问控制、审计日志 |
| API滥用 | 中 | 限流、认证、异常检测 |
| DDoS攻击 | 中 | 流量清洗、负载均衡 |
| 内部威胁 | 低 | 权限最小化、操作审计 |

## 身份认证与授权

### 1. JWT认证配置

```typescript
// JWT认证中间件
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
}

class JWTAuthMiddleware {
  private secretKey: string;
  private readonly algorithm = 'HS256';

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.secretKey, {
      algorithm: this.algorithm,
      expiresIn: '24h',
      issuer: 'weibo-crawler',
      audience: 'api-users'
    });
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secretKey, {
        algorithms: [this.algorithm],
        issuer: 'weibo-crawler',
        audience: 'api-users'
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const token = this.extractToken(req);

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        const payload = this.verifyToken(token);
        req.user = payload;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  // 角色权限检查
  requireRole(requiredRole: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || req.user.role !== requiredRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  }

  // 权限检查
  requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !req.user.permissions.includes(permission)) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      next();
    };
  }
}
```

### 2. RBAC权限控制

```typescript
// 基于角色的访问控制
interface Role {
  name: string;
  description: string;
  permissions: Permission[];
}

interface Permission {
  resource: string;
  actions: string[];
}

class RBACService {
  private roles: Map<string, Role> = new Map();

  constructor() {
    this.initializeRoles();
  }

  private initializeRoles(): void {
    const roles: Role[] = [
      {
        name: 'admin',
        description: '系统管理员',
        permissions: [
          { resource: '*', actions: ['*'] }
        ]
      },
      {
        name: 'operator',
        description: '操作员',
        permissions: [
          { resource: 'crawler', actions: ['read', 'create', 'update'] },
          { resource: 'tasks', actions: ['read', 'create', 'cancel'] },
          { resource: 'monitoring', actions: ['read'] }
        ]
      },
      {
        name: 'viewer',
        description: '查看者',
        permissions: [
          { resource: 'crawler', actions: ['read'] },
          { resource: 'tasks', actions: ['read'] },
          { resource: 'monitoring', actions: ['read'] }
        ]
      }
    ];

    roles.forEach(role => {
      this.roles.set(role.name, role);
    });
  }

  hasPermission(userRole: string, resource: string, action: string): boolean {
    const role = this.roles.get(userRole);
    if (!role) {
      return false;
    }

    return role.permissions.some(permission => {
      const matchesResource = permission.resource === '*' || permission.resource === resource;
      const matchesAction = permission.actions.includes('*') || permission.actions.includes(action);
      return matchesResource && matchesAction;
    });
  }

  createPermissionMiddleware(resource: string, action: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.user?.role;
      if (!userRole || !this.hasPermission(userRole, resource, action)) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      next();
    };
  }
}
```

### 3. API密钥管理

```typescript
// API密钥管理服务
import crypto from 'crypto';
import { createHash } from 'crypto';

class APIKeyService {
  private keys: Map<string, APIKey> = new Map();

  generateAPIKey(userId: string, permissions: string[]): string {
    const keyId = crypto.randomUUID();
    const keySecret = crypto.randomBytes(32).toString('hex');
    const apiKey = `wc_${keyId}_${keySecret}`;
    const hashedKey = createHash('sha256').update(apiKey).digest('hex');

    const keyInfo: APIKey = {
      id: keyId,
      hashedKey,
      userId,
      permissions,
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0,
      isActive: true
    };

    this.keys.set(hashedKey, keyInfo);
    return apiKey; // 只返回一次，之后用户需要安全保存
  }

  validateAPIKey(apiKey: string): APIKey | null {
    const hashedKey = createHash('sha256').update(apiKey).digest('hex');
    const keyInfo = this.keys.get(hashedKey);

    if (!keyInfo || !keyInfo.isActive) {
      return null;
    }

    // 更新使用记录
    keyInfo.lastUsed = new Date();
    keyInfo.usageCount++;

    return keyInfo;
  }

  revokeAPIKey(apiKeyId: string): boolean {
    for (const [hashedKey, keyInfo] of this.keys) {
      if (keyInfo.id === apiKeyId) {
        keyInfo.isActive = false;
        return true;
      }
    }
    return false;
  }

  // API密钥中间件
  apiKeyAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      const keyInfo = this.validateAPIKey(apiKey);
      if (!keyInfo) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      req.apiKey = keyInfo;
      next();
    };
  }
}

interface APIKey {
  id: string;
  hashedKey: string;
  userId: string;
  permissions: string[];
  createdAt: Date;
  lastUsed: Date | null;
  usageCount: number;
  isActive: boolean;
}
```

## 网络安全配置

### 1. Nginx安全配置

```nginx
# 安全配置增强
server {
    listen 443 ssl http2;
    server_name weibo-crawler.company.com;

    # SSL配置
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;

    # 隐藏版本信息
    server_tokens off;
    more_clear_headers Server;

    # 限制请求大小
    client_max_body_size 10M;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;

    # 限制请求频率
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # 连接限制
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    limit_conn conn_limit_per_ip 20;

    # IP白名单（管理接口）
    geo $admin_allowed {
        default 0;
        192.168.1.0/24 1;
        10.0.0.0/8 1;
    }

    location /api {
        # API限流
        limit_req zone=api burst=20 nodelay;
        limit_conn conn_limit_per_ip 10;

        # 代理配置
        proxy_pass http://crawler-backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 缓冲设置
        proxy_buffering off;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    location /api/admin {
        # 管理接口IP白名单
        allow 192.168.1.0/24;
        allow 10.0.0.0/8;
        deny all;

        if ($admin_allowed = 0) {
            return 403;
        }

        proxy_pass http://crawler-backend;
    }

    location /api/auth/login {
        # 登录接口特殊限流
        limit_req zone=login burst=5 nodelay;

        proxy_pass http://crawler-backend;
    }

    # 禁止访问敏感文件
    location ~ /\. {
        deny all;
    }

    location ~ \.(conf|log|sql|bak|backup|old)$ {
        deny all;
    }
}
```

### 2. 防火墙配置

```bash
#!/bin/bash
# 防火墙安全配置 - firewall-setup.sh

# 基本策略
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# 设置默认策略
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 允许本地回环
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# 允许已建立的连接
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# SSH访问（限制IP）
iptables -A INPUT -p tcp --dport 22 -s 192.168.1.0/24 -j ACCEPT

# HTTP/HTTPS访问
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 数据库访问（仅内部网络）
iptables -A INPUT -p tcp --dport 5432 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 27017 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 5672 -s 10.0.0.0/8 -j ACCEPT

# 监控端口（仅内部网络）
iptables -A INPUT -p tcp --dport 9090 -s 10.0.0.0/8 -j ACCEPT  # Prometheus
iptables -A INPUT -p tcp --dport 3001 -s 10.0.0.0/8 -j ACCEPT  # Grafana

# 防止DDoS攻击
iptables -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT

# 防止端口扫描
iptables -A INPUT -m recent --name portscan --rcheck --seconds 86400 -j DROP
iptables -A INPUT -m recent --name portscan --set -j LOG --log-prefix "Portscan:"
iptables -A INPUT -m recent --name portscan --set -j DROP

# 防止SYN攻击
iptables -A INPUT -p tcp ! --syn -m state --state NEW -j DROP
iptables -A INPUT -p tcp --syn -m limit --limit 1/s --limit-burst 3 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

# 防止Ping洪水攻击
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT
iptables -A INPUT -p icmp --icmp-type echo-request -j DROP

# 记录并拒绝无效包
iptables -A INPUT -m state --state INVALID -j LOG --log-prefix "Invalid packet: "
iptables -A INPUT -m state --state INVALID -j DROP

# 保存规则
iptables-save > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6

echo "防火墙配置完成"
```

### 3. VPN和隧道配置

```yaml
# WireGuard VPN配置
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.0.1/24
PrivateKey = <SERVER_PRIVATE_KEY>
ListenPort = 51820
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Client 1
PublicKey = <CLIENT1_PUBLIC_KEY>
AllowedIPs = 10.0.0.2/32

[Peer]
# Client 2
PublicKey = <CLIENT2_PUBLIC_KEY>
AllowedIPs = 10.0.0.3/32
```

## 数据安全保护

### 1. 数据加密配置

```typescript
// 数据加密服务
import crypto from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;

  // 生成加密密钥
  generateKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, this.keyLength);
  }

  // 加密数据
  encrypt(plaintext: string, key: Buffer): EncryptedData {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  // 解密数据
  decrypt(encryptedData: EncryptedData, key: Buffer): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // 哈希密码
  hashPassword(password: string): { hash: string; salt: string } {
    const salt = randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  // 验证密码
  verifyPassword(password: string, hash: string, salt: string): boolean {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
  }
}

interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

// 敏感数据脱敏
class DataMaskingService {
  maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.substring(0, 3)}***@${domain}`;
  }

  maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  maskIDCard(idCard: string): string {
    if (idCard.length <= 6) {
      return idCard.substring(0, 2) + '***';
    }
    return idCard.substring(0, 6) + '********' + idCard.substring(14);
  }

  maskBankCard(cardNumber: string): string {
    return cardNumber.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2');
  }
}
```

### 2. 数据库安全配置

```sql
-- PostgreSQL安全配置
-- 创建专用用户
CREATE USER crawler_app WITH PASSWORD 'strong_password_here';
CREATE USER crawler_readonly WITH PASSWORD 'readonly_password_here';

-- 授权最小权限
GRANT CONNECT ON DATABASE pro TO crawler_app;
GRANT USAGE ON SCHEMA public TO crawler_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crawler_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO crawler_app;

GRANT CONNECT ON DATABASE pro TO crawler_readonly;
GRANT USAGE ON SCHEMA public TO crawler_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO crawler_readonly;

-- 创建行级安全策略
ALTER TABLE weibo_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_accounts_policy ON weibo_accounts
FOR ALL TO crawler_app
USING (created_by = current_user);

-- 数据加密存储
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 敏感字段加密
ALTER TABLE weibo_accounts ADD COLUMN cookie_encrypted TEXT;
UPDATE weibo_accounts SET cookie_encrypted = encode(encrypt(decode(cookie, 'escape'), 'encryption_key', 'aes'), 'hex');
ALTER TABLE weibo_accounts DROP COLUMN cookie;

-- 审计日志
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    user_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- 创建审计触发器
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, user_id, old_values)
        VALUES (TG_TABLE_NAME, TG_OP, current_user, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, user_id, old_values, new_values)
        VALUES (TG_TABLE_NAME, TG_OP, current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, user_id, new_values)
        VALUES (TG_TABLE_NAME, TG_OP, current_user, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 为敏感表添加审计触发器
CREATE TRIGGER audit_weibo_accounts
AFTER INSERT OR UPDATE OR DELETE ON weibo_accounts
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 3. MongoDB安全配置

```yaml
# mongod.conf安全配置
security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile
  javascriptEnabled: false

net:
  bindIp: 127.0.0.1,10.0.0.0/8
  port: 27017
  ssl:
    mode: requireSSL
    PEMKeyFile: /etc/mongodb/ssl/mongodb.pem
    CAFile: /etc/mongodb/ssl/ca.pem
```

```javascript
// MongoDB用户权限配置
use admin

// 创建管理员用户
db.createUser({
  user: "admin",
  pwd: "strong_admin_password",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
});

// 创建应用用户
use pro
db.createUser({
  user: "crawler_app",
  pwd: "strong_app_password",
  roles: [
    { role: "readWrite", db: "pro" }
  ]
});

// 创建只读用户
db.createUser({
  user: "crawler_readonly",
  pwd: "strong_readonly_password",
  roles: [
    { role: "read", db: "pro" }
  ]
});

// 字段级加密
const { ClientEncryption } = require('mongodb-client-encryption');

const encryption = new ClientEncryption(client, {
  keyVaultNamespace: 'encryption.__keyVault',
  kmsProviders: {
    local: {
      key: Buffer.from('master_key_here', 'base64')
    }
  }
});

// 加密敏感字段
const encryptedCookie = await encryption.encrypt('raw_cookie_value', {
  keyId: '/encryption/key',
  algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
  contentType: 6
});
```

## 容器安全配置

### 1. Docker安全配置

```dockerfile
# 安全优化的Dockerfile
FROM node:20-alpine AS base

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 安装安全更新
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    dumb-init \
    ca-certificates && \
    rm -rf /var/cache/apk/*

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码
COPY --chown=nextjs:nodejs . .

# 切换到非root用户
USER nextjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 使用dumb-init作为PID 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
```

### 2. Kubernetes安全配置

```yaml
# Pod安全策略
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: crawler-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true

---
# 安全上下文
apiVersion: v1
kind: Pod
metadata:
  name: secure-crawler
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
  containers:
  - name: crawler
    image: weibo-crawler:latest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
      runAsNonRoot: true
      runAsUser: 1001
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: logs
      mountPath: /app/logs
  volumes:
  - name: tmp
    emptyDir: {}
  - name: logs
    persistentVolumeClaim:
      claimName: crawler-logs
```

### 3. 网络策略

```yaml
# 网络策略配置
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: crawler-network-policy
  namespace: weibo-crawler
spec:
  podSelector:
    matchLabels:
      app: crawler
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx
    ports:
    - protocol: TCP
      port: 3000
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    podSelector:
      matchLabels:
        app: prometheus
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: mongodb
    ports:
    - protocol: TCP
      port: 27017
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## API安全防护

### 1. 输入验证和清理

```typescript
// 输入验证中间件
import { body, param, query, validationResult } from 'express-validator';

class ValidationMiddleware {
  // 爬虫任务验证
  static validateCrawlTask() {
    return [
      body('keyword')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('关键词长度必须在1-100字符之间')
        .escape()
        .custom(value => {
          // 检查是否包含恶意字符
          const maliciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
          ];

          return !maliciousPatterns.some(pattern => pattern.test(value));
        }),

      body('maxPages')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('页数必须在1-1000之间')
        .toInt(),

      body('dataType')
        .isIn(['weibo', 'weibo_search', 'weibo_user'])
        .withMessage('数据类型必须是weibo, weibo_search或weibo_user'),

      // 验证结果处理
      (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }
        next();
      }
    ];
  }

  // SQL注入防护
  static sanitizeSQLInput(input: string): string {
    return input.replace(/['"\\]/g, '\\$&');
  }

  // XSS防护
  static sanitizeHTML(input: string): string {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return input.replace(/[&<>"'/]/g, match => escapeMap[match]);
  }
}

// 速率限制
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

class RateLimitMiddleware {
  // API通用限流
  static apiLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: new Redis(process.env.REDIS_URL),
        prefix: 'rl:api:'
      }),
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 每个IP最多1000请求
      message: {
        error: 'Too many requests',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // 登录限流
  static loginLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: new Redis(process.env.REDIS_URL),
        prefix: 'rl:login:'
      }),
      windowMs: 15 * 60 * 1000,
      max: 5, // 每个IP最多5次登录尝试
      skipSuccessfulRequests: true,
      message: {
        error: 'Too many login attempts',
        retryAfter: '15 minutes'
      }
    });
  }

  // 爬虫任务限流
  static crawlTaskLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: new Redis(process.env.REDIS_URL),
        prefix: 'rl:crawl:'
      }),
      windowMs: 60 * 1000, // 1分钟
      max: 10, // 每个用户最多10个任务/分钟
      keyGenerator: (req) => req.user?.userId || req.ip,
      message: {
        error: 'Crawl task rate limit exceeded',
        retryAfter: '1 minute'
      }
    });
  }
}
```

### 2. CORS安全配置

```typescript
// CORS安全配置
import cors from 'cors';

class CORSMiddleware {
  private static allowedOrigins = [
    'https://weibo-crawler.company.com',
    'https://admin.company.com',
    'http://localhost:3000' // 开发环境
  ];

  static secureCors() {
    return cors({
      origin: (origin, callback) => {
        // 允许没有origin的请求（如移动应用）
        if (!origin) return callback(null, true);

        if (this.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key'
      ],
      exposedHeaders: ['X-Total-Count'],
      maxAge: 86400 // 24小时
    });
  }
}
```

### 3. 安全头部中间件

```typescript
// 安全头部中间件
import helmet from 'helmet';

class SecurityHeadersMiddleware {
  static secureHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          childSrc: ["'none'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          upgradeInsecureRequests: []
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  // 自定义安全头部
  static customSecurityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // X-Content-Type-Options
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // X-Frame-Options
      res.setHeader('X-Frame-Options', 'DENY');

      // X-XSS-Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Referrer-Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // Permissions-Policy
      res.setHeader('Permissions-Policy',
        'geolocation=(), ' +
        'microphone=(), ' +
        'camera=(), ' +
        'magnetometer=(), ' +
        'gyroscope=(), ' +
        'speaker=(), ' +
        'fullscreen=(), ' +
        'payment=(), ' +
        'usb=()'
      );

      // 清除服务器信息
      res.removeHeader('Server');
      res.removeHeader('X-Powered-By');

      next();
    };
  }
}
```

## 反爬虫对策

### 1. IP轮换策略

```typescript
// IP代理管理器
class ProxyRotationService {
  private proxyPools: ProxyPool[] = [];
  private currentPoolIndex = 0;
  private proxyStats = new Map<string, ProxyStats>();

  constructor() {
    this.initializeProxyPools();
  }

  private initializeProxyPools(): void {
    // 初始化多个代理池
    this.proxyPools = [
      {
        name: 'residential',
        proxies: [],
        healthCheckUrl: 'http://httpbin.org/ip',
        maxFailures: 3,
        cooldownTime: 5 * 60 * 1000 // 5分钟
      },
      {
        name: 'datacenter',
        proxies: [],
        healthCheckUrl: 'http://httpbin.org/ip',
        maxFailures: 5,
        cooldownTime: 2 * 60 * 1000 // 2分钟
      }
    ];
  }

  async getOptimalProxy(targetDomain: string): Promise<ProxyInfo | null> {
    const availablePools = this.proxyPools.filter(pool =>
      pool.proxies.some(p => p.isHealthy && !p.isCooldown)
    );

    if (availablePools.length === 0) {
      return null;
    }

    // 根据目标域名的反爬虫强度选择代理池
    const selectedPool = this.selectPoolByDomain(targetDomain, availablePools);

    return this.selectBestProxyFromPool(selectedPool);
  }

  private selectPoolByDomain(domain: string, pools: ProxyPool[]): ProxyPool {
    // 高风险域名使用住宅IP代理
    const highRiskDomains = ['weibo.com', 'weibo.cn'];

    if (highRiskDomains.some(d => domain.includes(d))) {
      const residentialPool = pools.find(p => p.name === 'residential');
      return residentialPool || pools[0];
    }

    return pools[0];
  }

  private selectBestProxyFromPool(pool: ProxyPool): ProxyInfo | null {
    const healthyProxies = pool.proxies.filter(p =>
      p.isHealthy && !p.isCooldown
    );

    if (healthyProxies.length === 0) {
      return null;
    }

    // 根据代理性能评分选择最佳代理
    return healthyProxies
      .map(proxy => ({
        proxy,
        score: this.calculateProxyScore(proxy)
      }))
      .sort((a, b) => b.score - a.score)[0]?.proxy || null;
  }

  private calculateProxyScore(proxy: ProxyInfo): number {
    const stats = this.proxyStats.get(proxy.url) || {
      successRate: 1,
      avgResponseTime: 1000,
      lastUsed: 0,
      consecutiveFailures: 0
    };

    // 成功率权重40%
    const successScore = stats.successRate * 0.4;

    // 响应时间权重30%
    const responseScore = Math.max(0, (5000 - stats.avgResponseTime) / 5000) * 0.3;

    // 使用频率权重20%（避免过度使用）
    const timeSinceLastUse = Date.now() - stats.lastUsed;
    const frequencyScore = Math.min(1, timeSinceLastUse / (30 * 60 * 1000)) * 0.2;

    // 连续失败次数权重10%
    const failureScore = Math.max(0, (5 - stats.consecutiveFailures) / 5) * 0.1;

    return successScore + responseScore + frequencyScore + failureScore;
  }

  // 检测IP被封禁
  async detectBlock(response: any, proxy: ProxyInfo): Promise<boolean> {
    const blockIndicators = [
      response.status === 403,
      response.status === 429,
      response.headers.get('x-ratelimit-remaining') === '0',
      await this.containsBlockIndicator(response.data)
    ];

    const isBlocked = blockIndicators.some(Boolean);

    if (isBlocked) {
      this.handleBlockedProxy(proxy);
    }

    return isBlocked;
  }

  private async containsBlockIndicator(html: string): Promise<boolean> {
    const blockKeywords = [
      '访问过于频繁',
      '系统检测到异常',
      '请稍后再试',
      'verification required',
      'captcha',
      'robot check'
    ];

    return blockKeywords.some(keyword =>
      html.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private handleBlockedProxy(proxy: ProxyInfo): void {
    proxy.isHealthy = false;
    proxy.blockedAt = Date.now();

    // 设置冷却时间
    setTimeout(() => {
      proxy.isHealthy = true;
      proxy.blockedAt = null;
    }, 30 * 60 * 1000); // 30分钟冷却
  }
}

interface ProxyInfo {
  url: string;
  type: 'residential' | 'datacenter';
  location: string;
  isHealthy: boolean;
  isCooldown: boolean;
  blockedAt: Date | null;
}

interface ProxyPool {
  name: string;
  proxies: ProxyInfo[];
  healthCheckUrl: string;
  maxFailures: number;
  cooldownTime: number;
}

interface ProxyStats {
  successRate: number;
  avgResponseTime: number;
  lastUsed: number;
  consecutiveFailures: number;
}
```

### 2. 请求伪装策略

```typescript
// 请求伪装服务
class RequestDisguiseService {
  private userAgents: UserAgentProfile[] = [];
  private browserProfiles: BrowserProfile[] = [];

  constructor() {
    this.initializeUserAgents();
    this.initializeBrowserProfiles();
  }

  private initializeUserAgents(): void {
    this.userAgents = [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.',
        viewport: { width: 1920, height: 1080 },
        acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
        timezone: 'Asia/Shanghai'
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc.',
        viewport: { width: 1440, height: 900 },
        acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8',
        timezone: 'Asia/Shanghai'
      }
      // 可以添加更多User-Agent配置
    ];
  }

  private initializeBrowserProfiles(): void {
    this.browserProfiles = [
      {
        name: 'chrome_desktop',
        userAgent: this.userAgents[0].userAgent,
        viewport: this.userAgents[0].viewport,
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        permissions: ['geolocation', 'notifications'],
        extraHTTPHeaders: {
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    ];
  }

  async createStealthBrowser(): Promise<Browser> {
    const profile = this.getRandomBrowserProfile();

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        `--user-agent=${profile.userAgent}`,
        `--lang=${profile.locale}`,
        `--timezone=${profile.timezoneId}`
      ]
    });

    const page = await browser.newPage();

    // 应用浏览器配置
    await page.setUserAgent(profile.userAgent);
    await page.setViewport(profile.viewport);
    await page.setExtraHTTPHeaders(profile.extraHTTPHeaders as any);

    // 设置地理位置
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // 设置语言
    await page.evaluateOnNewDocument((locale) => {
      Object.defineProperty(navigator, 'language', {
        get: () => locale,
      });
    }, profile.locale.split('-')[0]);

    return browser;
  }

  async simulateHumanBehavior(page: Page): Promise<void> {
    // 随机滚动
    await this.randomScroll(page);

    // 随机鼠标移动
    await this.randomMouseMove(page);

    // 随机停留时间
    await this.randomDelay(1000, 3000);
  }

  private async randomScroll(page: Page): Promise<void> {
    const scrollCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < scrollCount; i++) {
      const scrollY = Math.floor(Math.random() * 1000);
      await page.evaluate((y) => {
        window.scrollTo(0, y);
      }, scrollY);

      await this.randomDelay(500, 1500);
    }
  }

  private async randomMouseMove(page: Page): Promise<void> {
    const viewport = page.viewport();
    if (!viewport) return;

    const moveCount = Math.floor(Math.random() * 5) + 2;

    for (let i = 0; i < moveCount; i++) {
      const x = Math.floor(Math.random() * viewport.width);
      const y = Math.floor(Math.random() * viewport.height);

      await page.mouse.move(x, y, { steps: 10 });
      await this.randomDelay(100, 500);
    }
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private getRandomBrowserProfile(): BrowserProfile {
    return this.browserProfiles[Math.floor(Math.random() * this.browserProfiles.length)];
  }
}

interface UserAgentProfile {
  userAgent: string;
  platform: string;
  vendor: string;
  viewport: { width: number; height: number };
  acceptLanguage: string;
  timezone: string;
}

interface BrowserProfile {
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezoneId: string;
  permissions: string[];
  extraHTTPHeaders: Record<string, string>;
}
```

### 3. 请求频率控制

```typescript
// 智能请求频率控制
class IntelligentRateLimiter {
  private domainConfigs = new Map<string, DomainRateConfig>();
  private requestHistory = new Map<string, RequestRecord[]>();

  constructor() {
    this.initializeDomainConfigs();
  }

  private initializeDomainConfigs(): void {
    // 为不同域名配置不同的限流策略
    this.domainConfigs.set('weibo.com', {
      baseInterval: 3000, // 基础间隔3秒
      maxInterval: 30000, // 最大间隔30秒
      minInterval: 1000,  // 最小间隔1秒
      burstLimit: 5,      // 突发限制5个请求
      backoffMultiplier: 2, // 退避倍数
      recoveryTime: 60000  // 恢复时间1分钟
    });

    this.domainConfigs.set('weibo.cn', {
      baseInterval: 5000,
      maxInterval: 60000,
      minInterval: 2000,
      burstLimit: 3,
      backoffMultiplier: 2.5,
      recoveryTime: 120000
    });
  }

  async getNextRequestDelay(domain: string, lastResponse?: any): Promise<number> {
    const config = this.domainConfigs.get(domain);
    if (!config) {
      return 2000; // 默认间隔
    }

    // 检查是否触发反爬虫
    if (lastResponse && await this.detectAntiBot(lastResponse)) {
      return this.calculateBackoffDelay(domain, config);
    }

    // 计算正常间隔
    return this.calculateNormalDelay(domain, config);
  }

  private calculateNormalDelay(domain: string, config: DomainRateConfig): number {
    const history = this.requestHistory.get(domain) || [];
    const now = Date.now();

    // 清理过期的请求记录
    const recentHistory = history.filter(record =>
      now - record.timestamp < config.recoveryTime
    );

    // 计算当前请求频率
    const requestRate = recentHistory.length / (config.recoveryTime / 1000);

    // 根据请求率调整间隔
    let interval = config.baseInterval;

    if (requestRate > 1) {
      // 请求过于频繁，增加间隔
      interval = Math.min(
        config.baseInterval * (1 + requestRate),
        config.maxInterval
      );
    } else if (requestRate < 0.5) {
      // 请求较少，可以减少间隔
      interval = Math.max(
        config.baseInterval * 0.8,
        config.minInterval
      );
    }

    // 添加随机因子
    const randomFactor = 0.2; // 20%的随机性
    const randomVariation = interval * randomFactor * (Math.random() - 0.5);

    return Math.max(config.minInterval, interval + randomVariation);
  }

  private calculateBackoffDelay(domain: string, config: DomainRateConfig): number {
    const history = this.requestHistory.get(domain) || [];
    const recentFailures = history.filter(record =>
      record.success === false &&
      (Date.now() - record.timestamp) < config.recoveryTime
    );

    const failureCount = recentFailures.length;
    const backoffTime = config.baseInterval * Math.pow(config.backoffMultiplier, failureCount);

    return Math.min(backoffTime, config.maxInterval);
  }

  private async detectAntiBot(response: any): Promise<boolean> {
    // 检测反爬虫指标
    const indicators = [
      response.status === 429,
      response.status === 403,
      response.headers.get('retry-after') !== null,
      await this.containsChallenge(response.data)
    ];

    return indicators.some(Boolean);
  }

  private async containsChallenge(html: string): Promise<boolean> {
    const challengeIndicators = [
      /captcha/i,
      /challenge/i,
      /verification/i,
      /robot/i,
      /请完成验证/i,
      /请输入验证码/i
    ];

    return challengeIndicators.some(pattern => pattern.test(html));
  }

  recordRequest(domain: string, success: boolean): void {
    const history = this.requestHistory.get(domain) || [];

    history.push({
      timestamp: Date.now(),
      success
    });

    // 限制历史记录数量
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    this.requestHistory.set(domain, history);
  }
}

interface DomainRateConfig {
  baseInterval: number;
  maxInterval: number;
  minInterval: number;
  burstLimit: number;
  backoffMultiplier: number;
  recoveryTime: number;
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
}
```

## 安全监控与审计

### 1. 安全事件监控

```typescript
// 安全事件监控服务
class SecurityMonitorService {
  private eventQueue: SecurityEvent[] = [];
  private alertRules: AlertRule[] = [];

  constructor() {
    this.initializeAlertRules();
    this.startEventProcessor();
  }

  private initializeAlertRules(): void {
    this.alertRules = [
      {
        name: 'Brute Force Attack',
        condition: (events) => {
          const recentLogins = events.filter(e =>
            e.type === 'LOGIN_FAILURE' &&
            (Date.now() - e.timestamp) < 300000 // 5分钟内
          );
          return recentLogins.length >= 10;
        },
        severity: 'HIGH',
        action: 'BLOCK_IP'
      },
      {
        name: 'Unusual Access Pattern',
        condition: (events) => {
          const recentRequests = events.filter(e =>
            e.type === 'API_ACCESS' &&
            (Date.now() - e.timestamp) < 60000 // 1分钟内
          );
          return recentRequests.length >= 1000;
        },
        severity: 'MEDIUM',
        action: 'RATE_LIMIT'
      },
      {
        name: 'Data Access Anomaly',
        condition: (events) => {
          return events.some(e =>
            e.type === 'SENSITIVE_DATA_ACCESS' &&
            e.details.volume > 1000 // 异常大量数据访问
          );
        },
        severity: 'HIGH',
        action: 'ALERT_ADMIN'
      }
    ];
  }

  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...event
    };

    this.eventQueue.push(securityEvent);
  }

  private startEventProcessor(): void {
    setInterval(() => {
      this.processEvents();
    }, 5000); // 每5秒处理一次事件
  }

  private async processEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // 检查告警规则
    for (const rule of this.alertRules) {
      if (rule.condition(events)) {
        await this.triggerAlert(rule, events);
      }
    }

    // 存储事件到数据库
    await this.storeSecurityEvents(events);
  }

  private async triggerAlert(rule: AlertRule, events: SecurityEvent[]): Promise<void> {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      ruleName: rule.name,
      severity: rule.severity,
      events: events.map(e => e.id),
      timestamp: Date.now(),
      status: 'ACTIVE'
    };

    // 执行相应的安全动作
    switch (rule.action) {
      case 'BLOCK_IP':
        await this.blockMaliciousIPs(events);
        break;
      case 'RATE_LIMIT':
        await this.applyRateLimit(events);
        break;
      case 'ALERT_ADMIN':
        await this.notifyAdministrators(alert);
        break;
    }

    // 记录告警
    await this.storeSecurityAlert(alert);
  }

  private async blockMaliciousIPs(events: SecurityEvent[]): Promise<void> {
    const maliciousIPs = new Set<string>();

    for (const event of events) {
      if (event.ipAddress) {
        maliciousIPs.add(event.ipAddress);
      }
    }

    // 更新防火墙规则
    for (const ip of maliciousIPs) {
      await this.updateFirewallRules(ip, 'BLOCK');
    }

    // 更新Redis黑名单
    const redis = new Redis(process.env.REDIS_URL);
    for (const ip of maliciousIPs) {
      await redis.setex(`blocked_ip:${ip}`, 3600, 'true'); // 阻止1小时
    }
  }

  private async notifyAdministrators(alert: SecurityAlert): Promise<void> {
    const message = `
🚨 安全告警: ${alert.ruleName}

严重程度: ${alert.severity}
时间: ${new Date(alert.timestamp).toLocaleString()}
影响事件数: ${alert.events.length}

请立即检查系统安全状态。
    `;

    // 发送Slack通知
    await this.sendSlackNotification(message);

    // 发送邮件通知
    await this.sendEmailNotification(message);

    // 记录到审计日志
    console.warn(`[SECURITY ALERT] ${message}`);
  }
}

interface SecurityEvent {
  id: string;
  timestamp: number;
  type: 'LOGIN_FAILURE' | 'API_ACCESS' | 'SENSITIVE_DATA_ACCESS' | 'PERMISSION_DENIED';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  details: any;
}

interface AlertRule {
  name: string;
  condition: (events: SecurityEvent[]) => boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'BLOCK_IP' | 'RATE_LIMIT' | 'ALERT_ADMIN';
}

interface SecurityAlert {
  id: string;
  ruleName: string;
  severity: string;
  events: string[];
  timestamp: number;
  status: 'ACTIVE' | 'RESOLVED';
}
```

### 2. 审计日志服务

```typescript
// 审计日志服务
class AuditLogService {
  private logQueue: AuditLogEntry[] = [];

  constructor() {
    this.startLogProcessor();
  }

  log(action: string, userId: string, resource: string, details: any = {}): void {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      userId,
      resource,
      details,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      result: details.result || 'SUCCESS'
    };

    this.logQueue.push(entry);
  }

  private startLogProcessor(): void {
    setInterval(() => {
      this.processLogs();
    }, 10000); // 每10秒处理一次日志
  }

  private async processLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logs = [...this.logQueue];
    this.logQueue = [];

    try {
      // 批量写入数据库
      await this.batchInsertLogs(logs);

      // 写入文件备份
      await this.writeToLogFile(logs);

      // 发送到SIEM系统（如果配置了）
      if (process.env.SIEM_ENDPOINT) {
        await this.sendToSIEM(logs);
      }
    } catch (error) {
      console.error('Failed to process audit logs:', error);
      // 重新加入队列
      this.logQueue.unshift(...logs);
    }
  }

  private async batchInsertLogs(logs: AuditLogEntry[]): Promise<void> {
    // 这里应该实现实际的数据库插入逻辑
    // 例如：PostgreSQL、MongoDB或Elasticsearch
    console.log(`Batch inserting ${logs.length} audit log entries`);
  }

  private async writeToLogFile(logs: AuditLogEntry[]): Promise<void> {
    const logContent = logs.map(log =>
      `${log.timestamp.toISOString()} [${log.action}] ${log.userId} ${log.resource} ${JSON.stringify(log.details)}`
    ).join('\n');

    // 写入到轮转的日志文件
    // 实际实现应该使用winston或bunyan等日志库
    console.log('Audit logs:', logContent);
  }

  // 查询审计日志
  async queryLogs(filters: LogQueryFilters): Promise<AuditLogEntry[]> {
    // 实现日志查询逻辑
    // 支持按时间范围、用户、操作类型等过滤
    return [];
  }

  // 生成合规报告
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    const logs = await this.queryLogs({
      startDate,
      endDate
    });

    return {
      period: { startDate, endDate },
      totalEvents: logs.length,
      eventsByAction: this.groupEventsByAction(logs),
      eventsByUser: this.groupEventsByUser(logs),
      failedEvents: logs.filter(l => l.result === 'FAILED').length,
      sensitiveDataAccess: logs.filter(l =>
        l.resource.includes('sensitive') ||
        l.action.includes('export') ||
        l.action.includes('download')
      )
    };
  }

  private groupEventsByAction(logs: AuditLogEntry[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupEventsByUser(logs: AuditLogEntry[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.userId] = (acc[log.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  userId: string;
  resource: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  result: 'SUCCESS' | 'FAILED';
}

interface LogQueryFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: string;
  resource?: string;
  result?: string;
}

interface ComplianceReport {
  period: { startDate: Date; endDate: Date };
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByUser: Record<string, number>;
  failedEvents: number;
  sensitiveDataAccess: AuditLogEntry[];
}
```

## 合规性要求

### 1. 数据保护合规

```typescript
// GDPR合规服务
class GDPRComplianceService {
  // 数据主体权利请求处理
  async handleDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    switch (request.type) {
      case 'ACCESS':
        await this.provideDataCopy(request.userId, request.contactInfo);
        break;
      case 'RECTIFICATION':
        await this.rectifyData(request.userId, request.corrections);
        break;
      case 'ERASURE':
        await this.eraseUserData(request.userId);
        break;
      case 'PORTABILITY':
        await this.exportUserData(request.userId, request.format);
        break;
      case 'RESTRICTION':
        await this.restrictProcessing(request.userId);
        break;
    }

    // 记录请求处理
    await this.logDSRProcessing(request);
  }

  // 数据删除（被遗忘权）
  async eraseUserData(userId: string): Promise<void> {
    // 匿名化而非删除，以保持数据完整性
    await this.anonymizeUserData(userId);

    // 删除可识别的个人数据
    await this.deletePersonalData(userId);

    // 通知第三方数据处理者
    await this.notifyDataProcessors(userId);
  }

  private async anonymizeUserData(userId: string): Promise<void> {
    // 将用户ID替换为匿名标识符
    const anonymousId = `anon_${crypto.randomBytes(16).toString('hex')}`;

    // 更新所有相关记录
    await this.updateUserReferences(userId, anonymousId);
  }

  // 数据保护影响评估（DPIA）
  async conductDPIA(processingActivity: ProcessingActivity): Promise<DPIAResult> {
    const riskAssessment = await this.assessRisks(processingActivity);
    const mitigationMeasures = await this.identifyMitigationMeasures(riskAssessment);

    return {
      processingActivity,
      riskAssessment,
      mitigationMeasures,
      recommendation: this.generateRecommendation(riskAssessment, mitigationMeasures),
      assessmentDate: new Date(),
      assessor: 'DPO',
      approved: riskAssessment.overallRiskLevel !== 'HIGH'
    };
  }
}

// 数据保留策略
class DataRetentionPolicyService {
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();

  constructor() {
    this.initializePolicies();
  }

  private initializePolicies(): void {
    this.retentionPolicies.set('user_activity_logs', {
      dataType: 'user_activity_logs',
      retentionPeriod: 365 * 2, // 2年
      anonymizeAfter: 365, // 1年后匿名化
      legalBasis: 'legitimate_interest',
      deletionMethod: 'secure_erase'
    });

    this.retentionPolicies.set('crawl_data', {
      dataType: 'crawl_data',
      retentionPeriod: 365 * 7, // 7年
      anonymizeAfter: 365 * 2, // 2年后匿名化
      legalBasis: 'contractual_necessity',
      deletionMethod: 'secure_erase'
    });
  }

  async applyRetentionPolicies(): Promise<void> {
    for (const [dataType, policy] of this.retentionPolicies) {
      await this.processRetentionPolicy(dataType, policy);
    }
  }

  private async processRetentionPolicy(dataType: string, policy: RetentionPolicy): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

    // 查找过期数据
    const expiredData = await this.findExpiredData(dataType, cutoffDate);

    // 应用删除策略
    for (const data of expiredData) {
      await this.deleteData(data.id, policy.deletionMethod);
    }

    // 处理需要匿名化的数据
    const anonymizationDate = new Date();
    anonymizationDate.setDate(anonymizationDate.getDate() - policy.anonymizeAfter);

    const dataToAnonymize = await this.findDataForAnonymization(dataType, anonymizationDate);
    for (const data of dataToAnonymize) {
      await this.anonymizeData(data.id);
    }
  }
}

interface DataSubjectRequest {
  id: string;
  type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION';
  userId: string;
  contactInfo: ContactInfo;
  corrections?: any;
  format?: 'JSON' | 'CSV' | 'XML';
  requestDate: Date;
}

interface RetentionPolicy {
  dataType: string;
  retentionPeriod: number; // 天数
  anonymizeAfter: number; // 天数
  legalBasis: string;
  deletionMethod: 'secure_erase' | 'anonymize' | 'archive';
}
```

### 2. 安全合规检查

```typescript
// 安全合规检查服务
class SecurityComplianceService {
  private complianceRules: ComplianceRule[] = [];

  constructor() {
    this.initializeComplianceRules();
  }

  private initializeComplianceRules(): void {
    this.complianceRules = [
      {
        name: 'Password Policy',
        description: '确保密码符合安全要求',
        check: async () => {
          const weakPasswords = await this.findWeakPasswords();
          return {
            passed: weakPasswords.length === 0,
            details: `Found ${weakPasswords.length} weak passwords`,
            recommendations: ['Enforce strong password policy', 'Implement password expiration']
          };
        },
        severity: 'HIGH',
        category: 'Authentication'
      },
      {
        name: 'SSL Certificate Validity',
        description: '检查SSL证书是否有效',
        check: async () => {
          const certInfo = await this.checkSSLCertificate();
          const daysUntilExpiry = this.getDaysUntilExpiry(certInfo.expiryDate);

          return {
            passed: daysUntilExpiry > 30,
            details: `Certificate expires in ${daysUntilExpiry} days`,
            recommendations: daysUntilExpiry <= 30 ? ['Renew SSL certificate'] : []
          };
        },
        severity: 'HIGH',
        category: 'Network'
      },
      {
        name: 'Data Encryption at Rest',
        description: '验证敏感数据是否加密存储',
        check: async () => {
          const unencryptedData = await this.findUnencryptedSensitiveData();
          return {
            passed: unencryptedData.length === 0,
            details: `Found ${unencryptedData.length} unencrypted sensitive records`,
            recommendations: ['Implement encryption for sensitive data']
          };
        },
        severity: 'CRITICAL',
        category: 'Data'
      }
    ];
  }

  async performComplianceCheck(): Promise<ComplianceReport> {
    const results: ComplianceCheckResult[] = [];

    for (const rule of this.complianceRules) {
      try {
        const result = await rule.check();
        results.push({
          rule: rule.name,
          category: rule.category,
          severity: rule.severity,
          ...result,
          checkedAt: new Date()
        });
      } catch (error) {
        results.push({
          rule: rule.name,
          category: rule.category,
          severity: rule.severity,
          passed: false,
          details: `Check failed: ${error.message}`,
          recommendations: ['Review rule configuration'],
          checkedAt: new Date()
        });
      }
    }

    const overallCompliance = this.calculateOverallCompliance(results);

    return {
      overallCompliance,
      results,
      checkedAt: new Date(),
      nextCheckDue: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后
    };
  }

  private calculateOverallCompliance(results: ComplianceCheckResult[]): number {
    if (results.length === 0) return 0;

    const passedCount = results.filter(r => r.passed).length;
    const weightedScore = results.reduce((score, result) => {
      const weight = this.getSeverityWeight(result.severity);
      return score + (result.passed ? weight : 0);
    }, 0);

    const totalWeight = results.reduce((score, result) =>
      score + this.getSeverityWeight(result.severity), 0
    );

    return Math.round((weightedScore / totalWeight) * 100);
  }

  private getSeverityWeight(severity: string): number {
    const weights = {
      'CRITICAL': 4,
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    };
    return weights[severity] || 1;
  }

  // 生成合规报告
  async generateComplianceReport(): Promise<ComplianceReportDocument> {
    const checkResults = await this.performComplianceCheck();

    return {
      executiveSummary: this.generateExecutiveSummary(checkResults),
      detailedResults: checkResults,
      riskAssessment: this.assessRisks(checkResults),
      actionItems: this.generateActionItems(checkResults),
      reportDate: new Date(),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后
    };
  }
}

interface ComplianceRule {
  name: string;
  description: string;
  check: () => Promise<ComplianceCheckResult>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
}

interface ComplianceCheckResult {
  rule: string;
  category: string;
  severity: string;
  passed: boolean;
  details: string;
  recommendations: string[];
  checkedAt: Date;
}

interface ComplianceReport {
  overallCompliance: number;
  results: ComplianceCheckResult[];
  checkedAt: Date;
  nextCheckDue: Date;
}
```

## 安全检查清单

### 部署前安全检查

```markdown
## 🔒 部署前安全检查清单

### 认证与授权
- [ ] 强密码策略已实施（最小8位，包含大小写字母、数字、特殊字符）
- [ ] 多因素认证（MFA）已启用
- [ ] JWT密钥足够复杂且定期轮换
- [ ] API密钥管理已配置
- [ ] 权限最小化原则已应用
- [ ] 会话超时已设置（建议30分钟）

### 网络安全
- [ ] HTTPS已强制启用
- [ ] SSL/TLS配置正确（TLS 1.2+）
- [ ] 防火墙规则已配置
- [ ] DDoS防护已启用
- [ ] VPN访问已配置
- [ ] 网络隔离已实施

### 数据保护
- [ ] 敏感数据已加密存储
- [ ] 传输加密已启用
- [ ] 数据备份策略已制定
- [ ] 数据保留政策已实施
- [ ] 个人数据脱敏已配置
- [ ] 审计日志已启用

### 应用安全
- [ ] 输入验证已实施
- [ ] SQL注入防护已配置
- [ ] XSS防护已启用
- [ ] CSRF保护已配置
- [ ] 文件上传安全已配置
- [ ] 错误处理不泄露敏感信息

### 容器安全
- [ ] 非root用户运行
- [ ] 安全镜像已使用
- [ ] 资源限制已配置
- [ ] 网络策略已配置
- [ ] Pod安全策略已启用
- [ ] 镜像漏洞扫描已通过

### 监控与审计
- [ ] 安全监控已配置
- [ ] 异常检测已启用
- [ ] 日志收集已配置
- [ ] 告警规则已设置
- [ ] 合规检查已配置
- [ ] 事件响应计划已制定
```

### 定期安全检查

```markdown
## 🔄 定期安全检查清单

### 每日检查
- [ ] 审查安全事件日志
- [ ] 检查异常登录活动
- [ ] 监控系统资源使用
- [ ] 验证备份完整性
- [ ] 检查SSL证书状态

### 每周检查
- [ ] 更新安全补丁
- [ ] 审查用户权限
- [ ] 检查防火墙日志
- [ ] 验证反病毒更新
- [ ] 测试应急响应流程

### 每月检查
- [ ] 进行漏洞扫描
- [ ] 更新密码策略
- [ ] 审查访问日志
- [ ] 测试灾难恢复
- [ ] 更新安全文档

### 每季度检查
- [ ] 进行渗透测试
- [ ] 审查合规状态
- [ ] 更新风险评估
- [ ] 培训安全意识
- [ ] 审查供应商安全
```

## 总结

本安全配置指南提供了基于MediaCrawler增强的微博爬取系统的全面安全框架，包括：

1. **身份认证与授权**: JWT认证、RBAC权限控制、API密钥管理
2. **网络安全**: 防火墙配置、VPN隧道、流量加密
3. **数据安全**: 加密存储、脱敏处理、访问控制
4. **容器安全**: 最小权限、安全镜像、网络隔离
5. **API安全**: 输入验证、速率限制、头部安全
6. **反爬虫对策**: IP轮换、请求伪装、频率控制
7. **安全监控**: 事件监控、审计日志、合规检查

通过实施这些安全措施，可以显著提升系统的安全性，保护数据资产，满足合规要求。