# WeiboSearchTaskEntity 重构计划

## 🎯 重构目标

将 WeiboSearchTaskEntity 从 22 个字段简化为 7 个核心字段，新增 WeiboSubTaskEntity 作为执行单元，实现配置与执行的彻底分离。

## 📋 实体设计

### 1. 简化后的 WeiboSearchTaskEntity（7个字段）

#### 保留字段
```typescript
interface WeiboSearchTaskEntity {
  id: number;                    // 主键
  keyword: string;               // 搜索关键词
  startDate: Date;              // 监控起始时间
  latestCrawlTime?: Date;       // 最新数据时间游标
  crawlInterval: string;        // 抓取间隔
  nextRunAt?: Date;             // 下次执行时间
  enabled: boolean;             // 是否启用
}
```

#### 移除字段（15个）
- **时间管理**: `currentCrawlTime`
- **状态管理**: `status`, `progress`, `totalSegments`
- **智能控制**: `noDataCount`, `noDataThreshold`, `retryCount`, `maxRetries`, `errorMessage`
- **账号管理**: `enableAccountRotation`, `weiboAccount`
- **地理位置**: `longitude`, `latitude`, `locationAddress`, `locationName`

### 2. 新增 WeiboSubTaskEntity

#### 实体结构
```typescript
interface WeiboSubTaskEntity {
  id: number;                    // 主键
  taskId: number;               // 关联主任务ID
  metadata: object;             // JSON元数据
  type: WeiboSubTaskType;       // 子任务类型
  status: WeiboSubTaskStatus;   // 执行状态
  errorMessage?: string;        // 错误信息
  createdAt: Date;              // 创建时间
  updatedAt: Date;              // 更新时间
}
```

#### metadata 设计
```typescript
// 通用元数据
interface WeiboKeywordSearchMetadata {
  startTime: Date;              // 开始时间
  endTime: Date;                // 结束时间
  keyword: string;              // 搜索关键词
}
```

#### 枚举定义
```typescript
enum WeiboSubTaskType {
  WEIBO_KEYWORD_SEARCH = 'WEIBO_KEYWORD_SEARCH',    // 微博关键字检索任务
}

enum WeiboSubTaskStatus {
  PENDING = 'PENDING',          // 等待执行
  RUNNING = 'RUNNING',          // 正在执行
  COMPLETED = 'COMPLETED',      // 执行完成
  FAILED = 'FAILED',            // 执行失败
  TIMEOUT = 'TIMEOUT'           // 执行超时
}
```

## 🏗️ 服务重构

### 3. Broker 服务重构

#### 职责简化
**从**: 状态管理者 + 调度器
**到**: 纯调度器

#### 核心逻辑
```typescript
class TaskScannerSchedulerService {
  async scanAndSchedule(): Promise<void> {
    // 1. 扫描到期的任务
    const tasks = await this.findDueTasks();

    // 2. 为每个任务生成子任务
    for (const task of tasks) {
      const nowDate = new Date()
      const subTasks = this.generateSubTasks(task, nowDate);

      // 3. 保存子任务到数据库
      await this.subTaskRepository.save(subTasks);

      // 4. 发送子任务消息到队列
      for (const subTask of subTasks) {
        await this.rabbitmqClient.publish(
          'weibo.crawl.subtask',
          { subTaskId: subTask.id }
        );
      }
      // 5. 更新主任务的下次执行时间
      // TODO: 更新主任务的 latestCrawlTime 为当前时间
      await this.updateNextRunTime(task, nowDate);
    }

  }

  private generateSubTasks(task: WeiboSearchTaskEntity, nowDate: Date): WeiboSubTaskEntity[] {
    const subTasks: WeiboSubTaskEntity[] = [];
    subTasks.push({
      taskId: task.id,
      type: WeiboSubTaskType.WEIBO_KEYWORD_SEARCH,
      status: WeiboSubTaskStatus.PENDING,
      metadata: {
        startTime: task.latestCrawlTime || task.startDate,
        endTime: nowDate,
        keyword: task.keyword
      }
    });
    return subTasks;
  }
}
```

#### 移除功能
- ❌ 状态管理 (`status`, `progress`, `retryCount`)
- ❌ 错误处理 (`errorMessage`, `maxRetries`)
- ❌ 智能暂停 (`noDataCount`, `noDataThreshold`)
- ❌ 账号轮换 (`enableAccountRotation`)

### 4. Crawler 服务重构

#### 职责增强
**从**: 纯执行器
**到**: 执行器 + 状态管理器

#### 核心逻辑
```typescript
class CrawlQueueConsumer {
  async onMessage(data: { subTaskId: number }): Promise<void> {
    const subTask = await this.subTaskRepository.findOne({
      where: { id: data.subTaskId },
      relations: ['task']
    });

    if (!subTask) return;

    try {
      // 1. 更新子任务状态为执行中
      subTask.status = WeiboSubTaskStatus.RUNNING;
      await this.subTaskRepository.save(subTask);

      // 2. 执行抓取任务
      const result = await this.executeCrawl(subTask);

      // 3. 更新子任务状态为完成
      subTask.status = WeiboSubTaskStatus.COMPLETED;
      subTask.errorMessage = null;
      await this.subTaskRepository.save(subTask);

      // 4. 更新主任务的最新抓取时间
      await this.updateMainTaskLatestCrawlTime(subTask.task, subTask);

    } catch (error) {
      // 5. 错误处理和重试逻辑
      // 进入死信队列，更新任务失败
      await this.handleError(subTask, error);
    }
  }

  private async handleError(subTask: WeiboSubTaskEntity, error: Error): Promise<void> {
    subTask.status = WeiboSubTaskStatus.FAILED;
    subTask.errorMessage = error.message;
    await this.subTaskRepository.save(subTask);
  }

  private async updateMainTaskLatestCrawlTime(
    task: WeiboSearchTaskEntity,
    subTask: WeiboSubTaskEntity
  ): Promise<void> {
    const metadata = subTask.metadata as any;
    const newLatestTime = metadata.endTime;

    if (!task.latestCrawlTime || newLatestTime > task.latestCrawlTime) {
      task.latestCrawlTime = newLatestTime;
      await this.taskRepository.save(task);
    }
  }
}
```

### 5. API 服务调整

#### 应该由typescript代码生成，GraphQL Schema 自动更新
```graphql
# 简化的主任务查询
type WeiboSearchTask {
  id: ID!
  keyword: String!
  startDate: DateTime!
  latestCrawlTime: DateTime
  crawlInterval: String!
  nextRunAt: DateTime
  enabled: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!

  # 关联的子任务
  subTasks(
    status: WeiboSubTaskStatus
    type: WeiboSubTaskType
    limit: Int = 10
  ): [WeiboSubTask!]!
}

# 新增子任务类型
type WeiboSubTask {
  id: ID!
  taskId: ID!
  metadata: JSON!
  type: WeiboSubTaskType!
  status: WeiboSubTaskStatus!
  errorMessage: String
  createdAt: DateTime!
  updatedAt: DateTime!

  # 关联的主任务
  task: WeiboSearchTask!
}

enum WeiboSubTaskType {
  HISTORICAL
  LATEST
  DETAIL
}

enum WeiboSubTaskStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  TIMEOUT
}
```

#### DTO 更新
```typescript
// 简化的任务创建DTO
export class CreateWeiboSearchTaskDto {
  @IsString()
  @MaxLength(100)
  keyword: string;

  @IsDate()
  startDate: Date;

  @IsString()
  @IsOptional()
  @Matches(/^\d+[smhd]$/)
  crawlInterval?: string = '1h';

  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;
}

// 子任务查询DTO
export class QueryWeiboSubTasksDto {
  @IsOptional()
  @IsEnum(WeiboSubTaskStatus)
  status?: WeiboSubTaskStatus;

  @IsOptional()
  @IsEnum(WeiboSubTaskType)
  type?: WeiboSubTaskType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
```

### 6. 前端界面重构

#### 任务列表组件
```typescript
// 移除状态显示，专注配置信息
@Component({
  template: `
    <div class="task-list">
      <div *ngFor="let task of tasks" class="task-item">
        <h3>{{ task.keyword }}</h3>
        <p>开始时间: {{ task.startDate | date }}</p>
        <p>抓取间隔: {{ task.crawlInterval }}</p>
        <p>下次执行: {{ task.nextRunAt | date }}</p>
        <p>最新数据: {{ task.latestCrawlTime | date }}</p>

        <button (click)="viewSubTasks(task.id)">
          查看子任务 ({{ task.subTasksCount }})
        </button>

        <mat-slide-toggle [(ngModel)]="task.enabled" (change)="toggleTask(task)">
          启用
        </mat-slide-toggle>
      </div>
    </div>
  `
})
export class WeiboSearchTasksListComponent {
  tasks: WeiboSearchTask[];

  async viewSubTasks(taskId: number) {
    // 导航到子任务详情页
    this.router.navigate(['/tasks', taskId, 'subtasks']);
  }
}
```

#### 子任务监控组件
```typescript
@Component({
  template: `
    <div class="subtask-monitor">
      <h2>子任务执行状态</h2>

      <div class="filter-bar">
        <mat-select [(ngModel)]="filterStatus" placeholder="状态筛选">
          <mat-option value="">全部</mat-option>
          <mat-option value="PENDING">等待执行</mat-option>
          <mat-option value="RUNNING">正在执行</mat-option>
          <mat-option value="COMPLETED">执行完成</mat-option>
          <mat-option value="FAILED">执行失败</mat-option>
        </mat-select>

        <mat-select [(ngModel)]="filterType" placeholder="类型筛选">
          <mat-option value="">全部</mat-option>
          <mat-option value="HISTORICAL">历史回溯</mat-option>
          <mat-option value="LATEST">最新抓取</mat-option>
          <mat-option value="DETAIL">详情抓取</mat-option>
        </mat-select>
      </div>

      <div class="subtask-list">
        <div *ngFor="let subTask of filteredSubTasks" class="subtask-item">
          <div class="subtask-header">
            <span class="type">{{ subTask.type }}</span>
            <span class="status" [ngClass]="subTask.status.toLowerCase()">
              {{ getStatusText(subTask.status) }}
            </span>
            <span class="time">{{ subTask.createdAt | date }}</span>
          </div>

          <div class="subtask-details">
            <p>关键词: {{ subTask.metadata.keyword }}</p>
            <p>时间段: {{ subTask.metadata.startTime | date }} - {{ subTask.metadata.endTime | date }}</p>
            <p *ngIf="subTask.errorMessage" class="error">
              错误: {{ subTask.errorMessage }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WeiboSubTasksMonitorComponent {
  subTasks: WeiboSubTask[];
  filterStatus: string = '';
  filterType: string = '';

  get filteredSubTasks(): WeiboSubTask[] {
    return this.subTasks.filter(task => {
      if (this.filterStatus && task.status !== this.filterStatus) return false;
      if (this.filterType && task.type !== this.filterType) return false;
      return true;
    });
  }

  getStatusText(status: WeiboSubTaskStatus): string {
    const statusMap = {
      PENDING: '等待执行',
      RUNNING: '正在执行',
      COMPLETED: '执行完成',
      FAILED: '执行失败',
      TIMEOUT: '执行超时'
    };
    return statusMap[status] || status;
  }
}
```

## 📊 实施步骤

### Phase 1: 实体层重构
1. **创建枚举定义**
   - 在 `packages/types/src/enums/weibo.ts` 中新增 `WeiboSubTaskType` 和 `WeiboSubTaskStatus`
   - 更新枚举验证工具

2. **创建 WeiboSubTaskEntity**
   - 在 `packages/entities/src/` 中创建 `weibo-sub-task.entity.ts`
   - 定义完整的实体结构和关联关系

3. **简化 WeiboSearchTaskEntity**
   - 移除 15 个冗余字段
   - 保留核心配置字段
   - 保留计算属性

4. **更新 TypeORM 配置**
   - 确保实体关系正确配置
   - 更新数据库索引

### Phase 2: 服务层重构
5. **重构 Broker 服务**
   - 简化 `TaskScannerSchedulerService`
   - 移除状态管理相关代码
   - 实现子任务生成逻辑

6. **增强 Crawler 服务**
   - 修改 `CrawlQueueConsumer` 处理子任务
   - 实现子任务状态管理
   - 添加重试和错误处理逻辑

7. **更新 API 服务**
   - 修改 GraphQL schema
   - 更新 DTO 定义
   - 新增子任务查询接口

### Phase 3: 数据迁移
8. **创建迁移脚本**
   - 创建 `weibo_sub_tasks` 表
   - 修改 `weibo_search_tasks` 表结构

9. **数据清理和迁移**
   - 清空现有任务状态数据
   - 保留核心配置信息
   - 建立主任务与子任务关联关系

### Phase 4: 前端调整
10. **更新 GraphQL 查询**
    - 修改任务列表查询
    - 新增子任务查询

11. **调整任务管理界面**
    - 简化任务列表显示
    - 新增子任务监控页面
    - 移除复杂的任务创建选项

12. **测试界面功能**
    - 验证任务创建和编辑
    - 测试子任务状态监控
    - 确保界面响应性

### Phase 5: 测试验证
13. **单元测试**
    - 实体关系测试
    - 服务逻辑测试
    - API 接口测试

14. **集成测试**
    - Broker 与 Crawler 协调测试
    - 端到端任务执行测试
    - 数据一致性测试

15. **性能测试**
    - 数据库查询性能测试
    - 消息队列处理性能测试
    - 前端界面响应性测试

## 📈 预期收益

### 代码质量提升
- **字段减少 68%**: 从 22 个字段减少到 7 个
- **代码复杂度降低**: 移除冗余的状态管理逻辑
- **职责分离清晰**: Broker 专注调度，Crawler 专注执行

### 系统架构优化
- **扩展性增强**: 通过子任务类型支持多种抓取模式
- **可维护性提升**: 简化的实体结构更易理解和修改
- **性能优化**: 减少数据库字段大小，提升查询效率

### 开发效率提升
- **接口简化**: 任务管理 API 更加简洁
- **调试方便**: 问题定位更加精确
- **测试覆盖**: 更容易编写全面的测试用例

## ⚠️ 风险控制

### 技术风险
- **多服务协调**: 需要确保 Broker、Crawler、API 同步更新
- **数据迁移**: 现有数据的平滑过渡需要谨慎处理
- **API 兼容性**: 前端需要同步调整 GraphQL 查询

### 缓解措施
- **分阶段实施**: 逐步推进，每个阶段都有明确的验证点
- **全面测试**: 确保每个修改都有对应的测试覆盖
- **回滚方案**: 准备快速回滚到原有实现的能力

## 🎉 总结

这个重构方案遵循了"存在即合理"的极简主义设计哲学：

1. **简化核心实体**: 移除冗余字段，保留核心配置
2. **分离职责**: 通过子任务实现配置与执行的分离
3. **提升扩展性**: 灵活的 metadata 设计支持未来扩展
4. **优化性能**: 减少数据冗余，提升查询效率

重构完成后，系统将具有更清晰的架构、更简洁的代码和更强的可维护性，为未来的功能扩展奠定坚实的基础。