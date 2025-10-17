# Bugger 应用故障诊断与解决方案

## 问题描述
Bugger 应用在创建 Bug 时失败，前端显示错误："BugError: 创建 Bug 失败，请稍后重试"，且**浏览器网络面板中看不到任何 HTTP 请求**。

## 关键症状
- ✅ `me` 查询正常工作
- ❌ `GetBugs` 和 `CreateBug` 操作失败
- ❌ 浏览器网络面板无 HTTP 请求
- ❌ 仅在前端控制台看到错误，无网络请求发出

## 根本原因分析

### 1. Token Key 不一致问题
**问题**: Bugger 应用使用了不同的 token key
- Bugger: `bugger_access_token`
- 其他应用 (web/admin): `access_token`

**影响**: 由于 token key 不匹配，Apollo Client 无法获取正确的认证令牌，导致所有需要认证的 GraphQL 请求失败。

### 2. Apollo Client 配置问题
**问题**: Apollo Link 配置中的 header 设置方式不正确
- 错误方式: 直接设置 headers
- 正确方式: 使用 `setContext` 回调函数

### 3. 环境配置不一致
**问题**: 环境变量属性名称不统一
- Bugger: `graphqlEndpoint`
- 其他应用: `graphqlUrl`

## 解决方案

### 1. 统一 Token Key
```typescript
// TokenStorageService.ts
private readonly tokenKey = 'access_token';  // 统一使用 access_token
private readonly refreshTokenKey = 'refresh_token';
```

### 2. 修复 Apollo Client 配置
```typescript
// app.config.ts
const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    operation.setContext(({ headers: existingHeaders = new HttpHeaders() }) => ({
      headers: existingHeaders.set('Authorization', `Bearer ${token}`)
    }));
  }
  return forward(operation);
});
```

### 3. 统一环境配置
```typescript
// environment.ts
export const environment = {
  graphqlUrl: 'http://localhost:3000/graphql',  // 统一使用 graphqlUrl
  // ... 其他配置
};
```

## 调试技巧

### 1. 对比工作应用
当某个应用出现问题时，对比其他正常工作的应用配置：
- 检查认证机制
- 检查 GraphQL 客户端配置
- 检查环境变量
- 检查 token 存储方式

### 2. 网络请求诊断
- 使用 Apollo Debug Link 查看请求详情
- 检查浏览器网络面板
- 验证认证头是否正确设置

### 3. 配置一致性检查清单
- [ ] Token key 是否一致
- [ ] GraphQL 端点配置是否一致
- [ ] Apollo Client 配置模式是否一致
- [ ] 认证中间件实现是否一致
- [ ] 环境变量命名是否一致

## 预防措施

1. **建立配置标准**: 为所有应用定义统一的配置标准
2. **代码复用**: 共享认证和 GraphQL 配置代码
3. **配置验证**: 在应用启动时验证关键配置
4. **文档维护**: 保持配置文档的同步更新

## 经验总结

1. **配置一致性是微服务架构的关键** - 即使代码逻辑相同，配置差异也会导致功能失败
2. **认证问题通常表现为"无网络请求"** - 当认证失败时，请求可能根本不会发出
3. **对比调试法** - 当某个应用出现问题时，对比其他正常工作的应用是最高效的调试方法
4. **关注细节** - 看似微小的配置差异（如 token key 名称）可能导致整个功能失效

## 验证结果
✅ 修复后 Bug 创建功能正常工作
✅ 浏览器网络面板可见 HTTP 请求
✅ 所有 GraphQL 操作正常执行
✅ 应用配置与其他应用保持一致