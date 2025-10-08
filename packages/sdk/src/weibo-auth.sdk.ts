import { WeiboAuthSDK, WeiboLoginEventHandler, WeiboAccount } from './weibo.interface';

/**
 * 微博认证 SDK 实现
 */
export class WeiboAuthSDKImpl implements WeiboAuthSDK {
  constructor(private baseUrl: string) {}

  /**
   * 启动微博登录（SSE）
   */
  startLogin(token: string, onEvent: WeiboLoginEventHandler): EventSource {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/weibo/login/start`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      } as any
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

    return response.json() as Promise<{ accounts: WeiboAccount[] }>;
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
}

/**
 * 创建微博认证 SDK 实例
 */
export function createWeiboAuthSDK(baseUrl: string): WeiboAuthSDK {
  return new WeiboAuthSDKImpl(baseUrl);
}
