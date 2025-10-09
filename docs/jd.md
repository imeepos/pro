# 京东二维码扫码登录获取Cookie入库设计方案

## 一、需求概述

参考现有微博扫码登录功能，设计京东二维码扫码登录获取Cookie入库的完整解决方案，实现用户通过扫描京东二维码完成账号绑定和Cookie存储。

## 二、技术架构

### 2.1 整体架构
- **前端**：Angular组件 + 京东登录UI
- **后端**：NestJS服务 + Playwright自动化
- **通信**：SSE实时推送登录状态
- **存储**：TypeORM + MySQL数据库

### 2.2 核心流程
1. 用户在前端发起京东登录请求
2. 后端启动Playwright浏览器访问京东登录页
3. 监听二维码生成接口，提取二维码推送给前端
4. 前端展示二维码，用户使用京东App扫描
5. 后端轮询检查二维码状态，实时推送状态变化
6. 登录成功后提取Cookie和用户信息
7. 存储到数据库并推送成功事件

## 三、京东登录分析

### 3.1 登录页面
- **URL**: `https://passport.jd.com/new/login.aspx?ReturnUrl=https%3A%2F%2Fhk.jd.com%2F`
- **特点**: 京东统一认证页面，支持扫码和账号密码登录

### 3.2 二维码状态监控
京东采用**SSE推送**模式监控二维码状态，而非轮询：
- **接口**: `https://qr.m.jd.com/check`
- **方法**: 监听响应流，实时接收状态推送
- **参数**:
  - `callback`: jQuery回调函数名 (用于JSONP解析)
  - `appid`: 应用ID (固定值133)
  - `token`: 二维码token
  - `_`: 时间戳

**推送机制**：服务器会主动推送状态变化，无需客户端轮询

### 3.3 状态码解析
基于提供的响应格式：
```json
jQuery6648506({
  "code": 201,
  "msg": "二维码未扫描，请扫描二维码"
})
```

**状态码映射**：
- `201`: 二维码未扫描，等待扫码
- `202`: 已扫码，等待确认
- `203`: 二维码失效，需要刷新二维码
- `204`: 二维码过期
- `205`: 二维码已取消授权

## 四、数据结构设计

### 4.1 京东账号实体 (jd-account.entity.ts)

```typescript
@Entity('jd_accounts')
@Index(['userId', 'jdUid'], { unique: true })
export class JdAccountEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 50, name: 'jd_uid' })
  jdUid: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'jd_nickname' })
  jdNickname: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'jd_avatar' })
  jdAvatar: string;

  @Column({ type: 'text' })
  cookies: string;

  @Column({
    type: 'enum',
    enum: JdAccountStatus,
    default: JdAccountStatus.ACTIVE,
  })
  status: JdAccountStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'last_check_at' })
  lastCheckAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // 关联到用户表
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}

export enum JdAccountStatus {
  ACTIVE = 'active',       // 正常可用
  EXPIRED = 'expired',     // Cookie 已过期
  BANNED = 'banned',       // 账号被封禁
  RESTRICTED = 'restricted', // 风控受限
}
```

### 4.2 事件类型定义

```typescript
export type JdLoginEventType = 'qrcode' | 'status' | 'scanned' | 'success' | 'expired' | 'error';

export interface JdLoginEvent {
  type: JdLoginEventType;
  data: any;
}

interface JdUserInfo {
  uid: string;
  nickname: string;
  avatar: string;
}
```

## 五、后端实现设计

### 5.1 JD认证服务 (jd-auth.service.ts)

```typescript
@Injectable()
export class JdAuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JdAuthService.name);
  private browser: Browser;
  private loginSessions = new Map<string, LoginSession>();

  // 京东登录页面 URL
  private readonly JD_LOGIN_URL = 'https://passport.jd.com/new/login.aspx?ReturnUrl=https://hk.jd.com/';

  // 二维码检查接口
  private readonly JD_QR_CHECK_URL = 'https://qr.m.jd.com/check';

  // 会话超时时间 (5分钟)
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000;

  async startLogin(userId: string): Promise<Observable<JdLoginEvent>> {
    // 创建浏览器上下文和页面
    // 访问京东登录页面
    // 监听二维码生成
    // 启动状态监听
  }

  private setupQrCodeListener(page: Page, subject: Subject<JdLoginEvent>) {
    // 监听二维码生成接口
    // 提取二维码token和图片
  }

  private async monitorQrStatus(page: Page, token: string, subject: Subject<JdLoginEvent>, sessionId: string) {
    // 监听京东SSE推送的二维码状态变化
    // 服务器会主动推送状态更新
  }

  private async extractUserInfo(page: Page): Promise<JdUserInfo> {
    // 提取京东用户信息
    // 从页面脚本或接口获取
  }

  private async saveAccount(userId: string, cookies: Cookie[], userInfo: JdUserInfo) {
    // 保存京东账号到数据库
  }
}
```

### 5.2 状态监听逻辑 (SSE推送)

```typescript
private async monitorQrStatus(
  page: Page,
  token: string,
  subject: Subject<JdLoginEvent>,
  sessionId: string,
  context: BrowserContext
) {
  try {
    // 监听京东的状态检查接口响应
    page.on('response', async (response) => {
      const url = response.url();

      // 监听二维码状态检查接口
      if (url.includes('qr.m.jd.com/check')) {
        try {
          const text = await response.text();

          // 解析JSONP响应
          const jsonStr = text.replace(/^jQuery\d+\(/, '').replace(/\)$/, '');
          const statusData = JSON.parse(jsonStr);

          this.logger.log(`[京东状态] 响应数据: ${JSON.stringify(statusData)}, session: ${sessionId}`);

          switch (statusData.code) {
            case 201:
              // 未扫码，继续等待
              this.logger.debug(`等待扫码: ${sessionId}`);
              break;

            case 202:
              this.logger.log(`已扫码,等待确认: ${sessionId}`);
              subject.next({
                type: 'scanned',
                data: { message: '请手机客户端确认登录' }
              });
              break;

            case 203:
              this.logger.warn(`二维码失效: ${sessionId}`);
              subject.next({
                type: 'expired',
                data: { message: '二维码失效了，先刷新二维码再试试吧' }
              });
              subject.complete();
              await this.cleanupSession(sessionId);
              break;

            case 204:
              this.logger.warn(`二维码过期: ${sessionId}`);
              subject.next({
                type: 'expired',
                data: { message: '二维码已过期，请重新扫描' }
              });
              subject.complete();
              await this.cleanupSession(sessionId);
              break;

            case 205:
              this.logger.warn(`二维码取消授权: ${sessionId}`);
              subject.next({
                type: 'error',
                data: { message: '二维码已取消授权' }
              });
              subject.complete();
              await this.cleanupSession(sessionId);
              break;

            default:
              this.logger.warn(`未知状态码: ${statusData.code}, session: ${sessionId}`);
              subject.next({
                type: 'error',
                data: { message: statusData.msg || '未知错误' }
              });
              break;
          }
        } catch (e) {
          this.logger.debug(`状态检查接口响应解析失败: ${sessionId}`);
        }
      }
    });

    // 监听页面导航变化，检测登录成功
    page.on('framenavigated', async (frame) => {
      if (frame !== page.mainFrame()) return;

      const url = frame.url();
      this.logger.debug(`页面导航: ${url}, session: ${sessionId}`);

      // 检测登录成功：跳转到京东首页
      if (url.startsWith('https://www.jd.com/') || url.startsWith('https://hk.jd.com/')) {
        this.logger.log(`登录成功,正在提取 Cookie 和用户信息: ${sessionId}`);

        try {
          // 提取 Cookie
          const cookies = await context.cookies();

          // 提取用户信息
          const userInfo = await this.extractUserInfo(page);

          // 保存到数据库
          const account = await this.saveAccount(userId, cookies, userInfo);

          // 推送成功事件
          subject.next({
            type: 'success',
            data: {
              accountId: account.id,
              jdUid: account.jdUid,
              jdNickname: account.jdNickname,
              jdAvatar: account.jdAvatar,
            },
          });

          this.logger.log(`京东账号保存成功: ${sessionId}, accountId: ${account.id}`);

          subject.complete();
          await this.cleanupSession(sessionId);
        } catch (error) {
          this.logger.error(`处理登录成功失败: ${sessionId}`, error);
          subject.next({
            type: 'error',
            data: { message: '保存账号信息失败' },
          });
          subject.complete();
          await this.cleanupSession(sessionId);
        }
      }
    });

  } catch (error) {
    this.logger.error(`监听二维码状态失败: ${sessionId}`, error);
    subject.next({
      type: 'error',
      data: { message: '状态监听失败' }
    });
  }
}
```

### 5.3 控制器设计 (jd.controller.ts)

```typescript
@Controller('jd')
export class JdController {
  constructor(
    private readonly jdAccountService: JdAccountService,
    private readonly jdAuthService: JdAuthService,
    private readonly healthCheckService: JdHealthCheckService,
  ) {}

  @Get('login/start')
  @UseGuards(JwtSseAuthGuard)
  @Sse()
  async startLogin(@Request() req): Promise<Observable<JdLoginEvent>> {
    const userId = req.user.userId;
    return this.jdAuthService.startLogin(userId);
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async getAccounts(@Request() req) {
    const userId = req.user.userId;
    return this.jdAccountService.getAccounts(userId);
  }

  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return this.jdAccountService.deleteAccount(userId, id);
  }
}
```

## 六、前端实现设计

### 6.1 京东登录组件 (jd-login.component.ts)

```typescript
@Component({
  selector: 'app-jd-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jd-login.component.html',
  styleUrls: ['./jd-login.component.scss']
})
export class JdLoginComponent implements OnDestroy {
  qrcodeUrl = '';
  status = '';
  isLoading = false;
  showSuccess = false;
  accountInfo: any = null;

  private jdSDK: JdAuthSDK;
  private eventSource?: EventSource;

  constructor(
    private tokenStorage: TokenStorageService,
    private ngZone: NgZone
  ) {
    this.jdSDK = createJdAuthSDK(this.getBaseUrl());
  }

  startJdLogin(): void {
    this.isLoading = true;
    this.showSuccess = false;
    this.qrcodeUrl = '';
    this.status = '正在初始化...';

    const token = this.tokenStorage.getToken();
    if (!token) {
      this.status = '未登录,请先登录系统';
      this.isLoading = false;
      return;
    }

    this.eventSource = this.jdSDK.startLogin(token, (event: JdLoginEvent) => {
      this.handleLoginEvent(event);
    });
  }

  private handleLoginEvent(event: JdLoginEvent): void {
    this.ngZone.run(() => {
      switch (event.type) {
        case 'qrcode':
          this.qrcodeUrl = event.data.image;
          this.status = '请使用京东扫描二维码';
          break;
        case 'scanned':
          this.status = '已扫码,请在手机上确认登录';
          break;
        case 'success':
          this.status = '登录成功!';
          this.showSuccess = true;
          this.accountInfo = event.data;
          this.isLoading = false;
          break;
        case 'expired':
          this.status = '二维码已过期,请重新获取';
          this.isLoading = false;
          break;
        case 'error':
          this.status = `错误: ${event.data.message}`;
          this.isLoading = false;
          break;
      }
    });
  }
}
```

### 6.2 模板设计 (jd-login.component.html)

```html
<div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
  <h2 class="text-2xl font-bold text-red-600 mb-6">京东账号登录</h2>

  <!-- 成功提示 -->
  <div *ngIf="showSuccess" class="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
    <div class="flex items-start space-x-3">
      <svg class="w-6 h-6 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="flex-1">
        <h3 class="text-sm font-medium text-success">绑定成功</h3>
        <p class="text-sm text-success mt-1">{{ accountInfo?.jdNickname || '京东账号' }} 已成功绑定</p>
      </div>
    </div>
  </div>

  <!-- 二维码区域 -->
  <div *ngIf="qrcodeUrl && !showSuccess" class="flex flex-col items-center space-y-4 mb-6">
    <div class="p-4 bg-red-50 rounded-lg border-2 border-red-200">
      <img [src]="qrcodeUrl"
           alt="京东登录二维码"
           class="w-48 h-48 object-contain">
    </div>

    <!-- 状态文字 -->
    <div class="flex items-center space-x-2">
      <div *ngIf="status.includes('已扫码')"
           class="w-2 h-2 bg-success rounded-full animate-pulse"></div>
      <div *ngIf="!status.includes('已扫码') && !status.includes('过期') && !status.includes('错误')"
           class="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
      <div *ngIf="status.includes('过期') || status.includes('错误')"
           class="w-2 h-2 bg-error rounded-full"></div>
      <p class="text-sm font-medium"
         [ngClass]="{
           'text-success': status.includes('已扫码'),
           'text-red-600': !status.includes('已扫码') && !status.includes('过期') && !status.includes('错误'),
           'text-error': status.includes('过期') || status.includes('错误')
         }">
        {{ status }}
      </p>
    </div>

    <!-- 二维码说明 -->
    <div class="text-center space-y-1">
      <p class="text-xs text-gray-500">打开京东 App</p>
      <p class="text-xs text-gray-500">扫描二维码完成登录</p>
    </div>
  </div>

  <!-- 操作按钮 -->
  <div class="space-y-3">
    <button
      *ngIf="!isLoading && !qrcodeUrl"
      (click)="startJdLogin()"
      class="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium
             hover:bg-red-700 active:bg-red-800
             transition-colors duration-200 shadow-sm hover:shadow">
      开始京东登录
    </button>

    <button
      *ngIf="qrcodeUrl && !isLoading && (status.includes('过期') || status.includes('错误'))"
      (click)="resetAndStartNew()"
      class="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium
             hover:bg-red-700 active:bg-red-800
             transition-colors duration-200 shadow-sm hover:shadow">
      重新获取二维码
    </button>
  </div>
</div>
```

## 七、SDK设计

### 7.1 京东认证SDK (jd-auth.sdk.ts)

```typescript
export interface JdAuthSDK {
  startLogin(token: string, onEvent: JdLoginEventHandler): EventSource;
  getAccounts(token: string): Promise<{ accounts: JdAccount[] }>;
  deleteAccount(token: string, accountId: number): Promise<{ success: boolean }>;
  checkAccount(token: string, accountId: number): Promise<JdAccountCheckResult>;
}

export class JdAuthSDKImpl implements JdAuthSDK {
  constructor(private baseUrl: string) {}

  startLogin(token: string, onEvent: JdLoginEventHandler): EventSource {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/jd/login/start?token=${encodeURIComponent(token)}`
    );

    eventSource.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        onEvent(message);

        if (['success', 'expired', 'error'].includes(message.type)) {
          eventSource.close();
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
      onEvent({ type: 'error', data: { message: '连接失败' } });
    };

    return eventSource;
  }
}

export function createJdAuthSDK(baseUrl: string): JdAuthSDK {
  return new JdAuthSDKImpl(baseUrl);
}
```

## 八、实施计划

### 8.1 依赖关系分析
- **数据库实体** → **认证服务** → **控制器** → **SDK** → **前端组件**

### 8.2 实施步骤

1. **第一阶段：数据层**
   - 创建 `JdAccountEntity` 实体
   - 生成数据库迁移文件
   - 创建 `JdAccountService` 服务

2. **第二阶段：认证服务**
   - 实现 `JdAuthService` 核心逻辑
   - 实现二维码监听和状态轮询
   - 实现用户信息提取和账号保存

3. **第三阶段：接口层**
   - 创建 `JdController` 控制器
   - 实现SSE登录接口
   - 实现账号管理接口

4. **第四阶段：SDK开发**
   - 实现 `JdAuthSDK`
   - 更新主SDK导出

5. **第五阶段：前端组件**
   - 创建 `JdLoginComponent` 组件
   - 实现UI界面和事件处理
   - 集成到管理后台

6. **第六阶段：健康检查**
   - 实现Cookie有效性检查
   - 定时任务监控账号状态

### 8.3 技术要点

1. **反爬虫策略**
   - 使用真实User-Agent
   - 模拟正常浏览器行为
   - 合理的请求间隔

2. **错误处理**
   - 网络异常重试机制
   - 登录状态准确判断
   - 资源及时清理

3. **安全考虑**
   - JWT Token验证
   - 用户数据隔离
   - Cookie安全存储

## 九、预期效果

实现完整的京东扫码登录功能，用户可以：
- 通过扫描京东二维码绑定账号
- 实时查看登录状态和进度
- 管理已绑定的京东账号
- 系统自动监控账号有效性

整体流程与微博登录保持一致的用户体验和技术架构。