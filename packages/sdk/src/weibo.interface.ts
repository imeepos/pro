/**
 * 微博账号信息
 */
export interface WeiboAccount {
  id: number;
  weiboUid: string;
  weiboNickname: string;
  weiboAvatar: string;
  status: string;
  lastCheckAt?: string;
  createdAt: string;
}

/**
 * SSE 事件类型
 */
export type WeiboLoginEventType = 'qrcode' | 'scanned' | 'status' | 'success' | 'expired' | 'error';

/**
 * 微博登录事件
 */
export interface WeiboLoginEvent {
  type: WeiboLoginEventType;
  data: any;
}

/**
 * 二维码事件数据
 */
export interface QrcodeEventData {
  qrid: string;
  image: string;
}

/**
 * 成功事件数据
 */
export interface SuccessEventData {
  accountId: number;
  weiboUid: string;
  weiboNickname: string;
  weiboAvatar: string;
}

/**
 * SSE 事件处理器
 */
export type WeiboLoginEventHandler = (event: WeiboLoginEvent) => void;

/**
 * 微博登录 SDK 接口
 */
export interface WeiboAuthSDK {
  /**
   * 启动微博登录（SSE）
   */
  startLogin(token: string, onEvent: WeiboLoginEventHandler): EventSource;

  /**
   * 获取账号列表
   */
  getAccounts(token: string): Promise<{ accounts: WeiboAccount[] }>;

  /**
   * 删除账号
   */
  deleteAccount(token: string, accountId: number): Promise<{ success: boolean }>;
}
