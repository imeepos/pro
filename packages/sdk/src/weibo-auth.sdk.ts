import { WeiboAuthSDK, WeiboLoginEventHandler, WeiboAccount, WeiboAccountCheckResult } from './weibo.interface.js';

type Envelope<T> = {
  success?: boolean;
  data?: T;
};

const unwrapEnvelope = <T>(payload: unknown): T => {
  if (typeof payload === 'object' && payload !== null) {
    const envelope = payload as Envelope<T>;
    if (envelope.data !== undefined) {
      return envelope.data;
    }
  }
  return payload as T;
};

/**
 * 微博认证 SDK 实现
 * @deprecated 使用 GraphQL Subscription 代替。参考 apps/admin/src/app/core/services/weibo-login.service.ts
 */
export class WeiboAuthSDKImpl implements WeiboAuthSDK {
  constructor(private baseUrl: string) {}

  /**
   * 启动微博登录（SSE）
   * 注意: EventSource 不支持自定义 headers，所以通过 URL 参数传递 token
   */
  startLogin(token: string, onEvent: WeiboLoginEventHandler): EventSource {
    // EventSource 不支持自定义 headers，通过 URL 参数传递 token
    const eventSource = new EventSource(
      `${this.baseUrl}/api/weibo/login/start?token=${encodeURIComponent(token)}`
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

  /**
   * 获取账号列表
   */
  async getAccounts(token: string): Promise<{ accounts: WeiboAccount[] }> {
    const response = await fetch(`${this.baseUrl}/api/weibo/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }

    const result = await response.json() as unknown;
    // 后端返回 {success: true, data: {accounts: []}} 格式，需要解包
    return unwrapEnvelope<{ accounts: WeiboAccount[] }>(result);
  }

  /**
   * 删除账号
   */
  async deleteAccount(token: string, accountId: number): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/weibo/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete account');
    }

    return response.json() as Promise<{ success: boolean }>;
  }

  /**
   * 检查账号健康状态
   */
  async checkAccount(token: string, accountId: number): Promise<WeiboAccountCheckResult> {
    const response = await fetch(`${this.baseUrl}/api/weibo/accounts/${accountId}/check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('检查账号失败');
    }

    const result = await response.json() as unknown;
    // 后端返回 {success: true, data: {...}} 格式，需要解包
    return unwrapEnvelope<WeiboAccountCheckResult>(result);
  }
}

/**
 * 创建微博认证 SDK 实例
 * @deprecated 使用 GraphQL Subscription 代替。参考 apps/admin/src/app/core/services/weibo-login.service.ts
 */
export function createWeiboAuthSDK(baseUrl: string, _tokenKey?: string): WeiboAuthSDK {
  return new WeiboAuthSDKImpl(baseUrl);
}
