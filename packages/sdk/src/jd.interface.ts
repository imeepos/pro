/**
 * 京东账号信息
 */
export interface JdAccount {
  id: number;
  jdUid: string;
  jdNickname: string;
  jdAvatar: string;
  status: 'active' | 'expired' | 'restricted' | 'banned';
  lastCheckAt?: string;
  createdAt: string;
}

/**
 * 账号健康检查结果
 */
export interface JdAccountCheckResult {
  accountId: number;
  jdUid: string;
  oldStatus: string;
  newStatus: string;
  statusChanged: boolean;
  message: string;
  checkedAt: string;
}

/**
 * SSE 事件类型
 */
export type JdLoginEventType = 'qrcode' | 'scanned' | 'status' | 'success' | 'expired' | 'error';

/**
 * 京东登录事件
 */
export interface JdLoginEvent {
  type: JdLoginEventType;
  data: any;
}

/**
 * 二维码事件数据
 */
export interface JdQrcodeEventData {
  image: string;
}

/**
 * 成功事件数据
 */
export interface JdSuccessEventData {
  accountId: number;
  jdUid: string;
  jdNickname: string;
  jdAvatar: string;
}

/**
 * 错误事件数据
 */
export interface JdErrorEventData {
  message: string;
  attempt: number;
  canRetry: boolean;
}

/**
 * SSE 事件处理器
 */
export type JdLoginEventHandler = (event: JdLoginEvent) => void;

/**
 * 京东登录 SDK 接口
 */
export interface JdAuthSDK {
  /**
   * 启动京东登录（SSE）
   */
  startLogin(token: string, onEvent: JdLoginEventHandler): EventSource;

  /**
   * 获取账号列表
   */
  getAccounts(token: string): Promise<{ accounts: JdAccount[] }>;

  /**
   * 删除账号
   */
  deleteAccount(token: string, accountId: number): Promise<{ success: boolean }>;

  /**
   * 检查账号健康状态
   */
  checkAccount(token: string, accountId: number): Promise<JdAccountCheckResult>;
}