# @pro/utils

共享工具函数库，提供跨项目通用的纯函数工具集。

## 包信息

- **包名**: `@pro/utils`
- **版本**: 1.0.0
- **描述**: Shared utility functions
- **类型**: ESM (ES Module)
- **依赖**:
  - `@pro/types`: 共享类型定义
  - `jwt-decode`: JWT 令牌解码

## 目录结构

```
src/
├── index.ts                 # 导出入口
├── common.ts               # 通用工具函数
├── common.test.ts
├── password.ts             # 密码验证
├── password.test.ts
├── token.ts                # JWT 令牌处理
├── token.test.ts
├── validation.ts           # 输入验证
└── validation.test.ts
```

## 功能分类

### 通用工具 (common.ts)

#### formatDate
```typescript
function formatDate(date: Date, format?: string): string
```
格式化日期为字符串

**参数**:
- `date`: 待格式化的日期对象
- `format`: 格式字符串，默认 `'y-MM-dd HH:mm:ss'`

**支持的格式占位符**:
- `y`, `YYYY`: 年份
- `MM`: 月份 (补零)
- `dd`, `DD`: 日期 (补零)
- `HH`: 小时 (补零)
- `mm`: 分钟 (补零)
- `ss`: 秒数 (补零)

**示例**:
```typescript
formatDate(new Date('2024-03-15 14:30:25'))
// '2024-03-15 14:30:25'

formatDate(new Date('2024-03-15'), 'y-MM-dd')
// '2024-03-15'
```

#### debounce
```typescript
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void
```
防抖函数，延迟执行，适用于输入框搜索、窗口调整等场景

**参数**:
- `fn`: 待防抖的函数
- `delay`: 延迟毫秒数

**示例**:
```typescript
const handleSearch = debounce((query: string) => {
  console.log('Searching:', query);
}, 300);

handleSearch('hello'); // 仅在 300ms 无新调用后执行
```

#### sleep
```typescript
function sleep(ms: number): Promise<void>
```
异步延迟执行，返回 Promise

**参数**:
- `ms`: 延迟毫秒数

**示例**:
```typescript
await sleep(1000); // 等待 1 秒
console.log('1 second later');
```

### 密码验证 (password.ts)

#### validatePassword
```typescript
function validatePassword(password: string): ValidationResult
```
验证密码格式，返回验证结果

**规则**:
- 不能为空
- 长度至少 6 位

**返回**:
```typescript
{
  valid: boolean;
  errors: string[];
}
```

**示例**:
```typescript
validatePassword('abc')
// { valid: false, errors: ['密码长度必须至少为 6 位'] }

validatePassword('abc123')
// { valid: true, errors: [] }
```

### JWT 令牌处理 (token.ts)

#### decodeToken
```typescript
function decodeToken(token: string): JwtPayload | null
```
解码 JWT 令牌，返回 payload 或 null

**示例**:
```typescript
const payload = decodeToken(jwtToken);
if (payload) {
  console.log('User ID:', payload.sub);
}
```

#### isTokenExpired
```typescript
function isTokenExpired(token: string): boolean
```
检查令牌是否已过期

**示例**:
```typescript
if (isTokenExpired(token)) {
  // 令牌已过期，需要刷新
}
```

#### getTokenExpiry
```typescript
function getTokenExpiry(token: string): Date | null
```
获取令牌过期时间

**示例**:
```typescript
const expiry = getTokenExpiry(token);
if (expiry) {
  console.log('Token expires at:', expiry);
}
```

### 输入验证 (validation.ts)

#### validateEmail
```typescript
function validateEmail(email: string): boolean
```
验证电子邮件格式

**规则**: 基本邮箱格式 `xxx@xxx.xxx`

**示例**:
```typescript
validateEmail('user@example.com')  // true
validateEmail('invalid-email')      // false
```

#### validateUsername
```typescript
function validateUsername(username: string): boolean
```
验证用户名格式

**规则**:
- 长度 3-20 个字符
- 仅允许字母、数字、下划线、连字符

**示例**:
```typescript
validateUsername('john_doe')    // true
validateUsername('ab')          // false (太短)
validateUsername('user@123')    // false (非法字符)
```

## 快速查询索引

| 需求场景 | 使用函数 | 所在文件 |
|---------|---------|---------|
| 格式化日期 | `formatDate` | common.ts |
| 防抖处理 | `debounce` | common.ts |
| 延迟执行 | `sleep` | common.ts |
| 验证密码 | `validatePassword` | password.ts |
| 验证邮箱 | `validateEmail` | validation.ts |
| 验证用户名 | `validateUsername` | validation.ts |
| 解码 JWT | `decodeToken` | token.ts |
| 检查令牌过期 | `isTokenExpired` | token.ts |
| 获取令牌过期时间 | `getTokenExpiry` | token.ts |

## 使用指南

```typescript
import {
  formatDate,
  debounce,
  validateEmail,
  isTokenExpired
} from '@pro/utils';

// 日期格式化
const formatted = formatDate(new Date());

// 防抖搜索
const debouncedSearch = debounce((query: string) => {
  // 搜索逻辑
}, 300);

// 邮箱验证
if (!validateEmail(email)) {
  throw new Error('Invalid email');
}

// 令牌检查
if (isTokenExpired(token)) {
  // 刷新令牌
}
```

## 设计原则

- **纯函数**: 所有工具函数均为纯函数，无副作用
- **类型安全**: 完整的 TypeScript 类型定义
- **轻量依赖**: 仅依赖必要的第三方库
- **测试覆盖**: 每个函数均有对应的单元测试
- **按需引入**: 支持 Tree-shaking，按需打包
