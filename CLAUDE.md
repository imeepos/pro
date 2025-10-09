# Claude Code 项目配置指南

## 基础配置

**使用中文进行所有交流和文档**
**项目使用 pnpm workspace 管理**
**任务能并行就并行，这样执行时间短**


## 任务复杂度判断和执行策略

### 简单任务 - 直接执行
当任务满足以下条件时，直接使用 code-artisan 提示词规则执行，**不需要启动 sub agent**：

#### 简单任务特征
- 单一操作或修改
- 不涉及多个文件的复杂协调
- 不需要多步骤依赖处理
- 可以一次性完成的任务

#### 简单任务示例
- 修复单个文件的语法错误
- 添加单个函数或方法
- 更新配置项
- 修改样式或文本
- 简单的重构操作

#### 简单任务执行原则
```
直接操作 → 立即验证 → 提交代码
```

### 复杂任务 - 系统化处理
当任务具有以下特征时，使用完整的任务管理流程：

#### 复杂任务特征
- 涉及多个文件或模块
- 需要协调不同的组件
- 有明确的依赖关系
- 需要多个步骤才能完成

#### 复杂任务示例
- 实现新的功能模块
- 大规模重构
- 系统性 BUG 修复
- 多服务协调更新

## 任务执行策略

### 1. 依赖管理和执行顺序

#### 依赖链处理 (仅复杂任务)
- 严格按照依赖关系执行：A依赖B → 先执行B，完成后执行A
- 使用 TodoWrite 工具规划和跟踪依赖链
- 每个依赖完成后立即标记为 completed

#### 并行执行策略 (仅复杂任务)
```
依赖关系：B → A → (C, D)
执行方式：
1. 执行B任务 (标记为 in_progress)
2. B完成后，执行A任务
3. A完成后，并行执行C和D (使用多个Task工具调用)
```

**实现方式**：
- 单个消息中发送多个 Task 工具调用实现真正并行
- 每个独立任务分配给不同的 agent
- 使用 `subagent_type: "general-purpose"` 处理复杂多步骤任务

### 2. 代码提交和版本控制

#### 增量提交策略
- **每个任务完成后立即提交** (无论简单或复杂)
- 提交信息要清晰描述变更内容
- 便于工作记录和代码回滚

#### 提交流程
```bash
# 简单任务提交
git add .
git commit -m "具体的变更描述"

# 复杂任务提交 (并行检查状态)
git status
git diff
git log --oneline -5
git add .
git commit -m "具体的变更描述"
```

## Docker 开发流程

### 源码修改后的重启流程

#### 强制重建镜像
```bash
# 修改源码后必须重建
docker compose up -d <service_name> --build
```

#### 示例场景
- 修改 API 代码 → `docker compose up -d api --build`
- 修改前端代码 → `docker compose up -d frontend --build`

### 服务管理最佳实践
```bash
# 重建特定服务
docker compose build <service_name>
docker compose up -d <service_name>

# 查看服务状态
docker compose ps
docker compose logs <service_name>
```

## BUG 修复流程

### 简单 BUG 修复
```
错误定位 → 直接修复 → 语法检查 → 重启验证 → 提交
```

### 复杂 BUG 修复
```
错误定位 → 根因分析 → 解决方案设计 → 实施修复 → 验证测试
```

#### 关键原则
- **全局视角**：避免"头痛医头，脚痛医脚"
- **影响评估**：修复一个问题不能引入新问题
- **彻底验证**：确保修复的完整性

### 代码质量检查

#### TypeScript 项目检查
```bash
# 基本检查 (简单任务)
pnpm run --filter=@sker/<package_name> typecheck

# 全面检查 (复杂任务或修复后)
pnpm run --filter=@sker/<package_name> typecheck
pnpm run --filter=@sker/<package_name> lint
```

### 重建和重启流程
```bash
# 修复后的标准重启流程
docker compose build <service_name>
docker compose up -d <service_name>

# 验证服务状态
docker compose ps <service_name>
docker compose logs <service_name> --tail=50
```

## WSL2 Docker 环境特殊处理

### 网络访问和测试

#### 内部网络测试
由于 WSL2 的网络限制，优先使用 Docker 内部网络进行测试：

```bash
# API 接口验证
curl http://gateway:port/api/endpoint

# 健康检查
curl http://service_name:port/health
```

#### 验证策略
- **API 接口**：自动验证并报告结果
- **用户界面**：等待用户验证反馈
- **服务状态**：使用 Docker 命令检查

## Claude Code 工具使用决策树

### 任务判断流程
```
任务评估
├── 简单任务 (单一操作)
│   ├── 直接使用 code-artisan 规则
│   ├── 不启动 sub agent
│   ├── 不使用 TodoWrite (除非用户要求)
│   └── 直接执行 → 验证 → 提交
│
└── 复杂任务 (多步骤/协调)
    ├── 使用 TodoWrite 规划
    ├── 考虑 Task 工具并行
    ├── 启动适当的 sub agent
    └── 系统化执行流程
```

### 工具使用原则

#### TodoWrite 使用场景
- **必须使用**：复杂任务 (3步以上)
- **可选使用**：用户明确要求跟踪进度
- **不需要使用**：简单的单步操作

#### Task 工具使用场景
- **必须使用**：需要专业化处理或并行执行
- **不需要使用**：可以直接完成的简单任务

#### Bash 工具使用
```bash
# 简单操作
docker compose up -d api --build

# 复杂操作 (批量)
git status; docker compose ps; pnpm run typecheck
```

## 最佳实践总结

### 简单任务工作流
1. **直接评估** → 确定为简单任务
2. **直接执行** → 使用 code-artisan 规则
3. **立即验证** → 检查语法和功能
4. **快速提交** → 记录变更

### 复杂任务工作流
1. 使用 TodoWrite 规划任务
2. 识别依赖关系和并行机会
3. 执行任务并实时更新状态
4. 每个任务完成后立即提交代码
5. 修改源码后重建 Docker 镜像
6. 进行全面的质量检查和验证

### 核心原则

#### 效率优先
- **简单任务不过度工程化**
- **复杂任务系统化处理**
- **根据任务复杂度选择合适的工具**

#### 质量保证
- 无论简单或复杂任务都要验证
- 修改源码必须重建 Docker 镜像
- 保持代码质量和测试覆盖

#### 记录和跟踪
- 及时提交和记录工作进展
- 复杂任务使用工具跟踪进度
- 简单任务快速完成并记录

---

**重要提醒**：
- **简单任务直接干活，不启动 sub agent**
- **复杂任务才使用完整的协调机制**
- **根据任务特征选择合适的执行策略**
- **始终保持效率和质量的平衡**