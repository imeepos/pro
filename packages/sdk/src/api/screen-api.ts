import { HttpClient } from '../client/http-client.js';
import { Observable } from 'rxjs';
import {
  ScreenPage,
  CreateScreenDto,
  UpdateScreenDto,
  ScreenListResponse,
  normalizeScreenPageData
} from '../types/screen.types.js';

/**
 * 屏幕管理 API 类
 * 提供屏幕的增删改查、发布、设为默认等功能
 */
export class ScreenApi {
  private readonly httpClient: HttpClient;

  constructor(baseUrl?: string, tokenKey?: string) {
    this.httpClient = new HttpClient(baseUrl || 'http://localhost:3000', tokenKey);
  }

  /**
   * 获取屏幕列表
   * @param page 页码，默认 1
   * @param limit 每页数量，默认 20
   * @returns 屏幕列表响应
   */
  async getScreens(page = 1, limit = 20): Promise<ScreenListResponse> {
    const response = await this.httpClient.get<ScreenListResponse>(
      '/api/screens',
      { page: page.toString(), limit: limit.toString() }
    );

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return {
      ...response,
      items: response.items.map(item => normalizeScreenPageData(item))
    };
  }

  /**
   * 获取已发布的屏幕列表
   * @param page 页码，默认 1
   * @param limit 每页数量，默认 20
   * @returns 已发布的屏幕列表响应
   */
  async getPublishedScreens(page = 1, limit = 20): Promise<ScreenListResponse> {
    const response = await this.httpClient.get<ScreenListResponse>(
      '/api/screens/published',
      { page: page.toString(), limit: limit.toString() }
    );

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return {
      ...response,
      items: response.items.map(item => normalizeScreenPageData(item))
    };
  }

  /**
   * 根据ID获取屏幕详情
   * @param id 屏幕ID
   * @returns 屏幕详情
   */
  async getScreen(id: string): Promise<ScreenPage> {
    const response = await this.httpClient.get<ScreenPage>(`/api/screens/${id}`);

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return normalizeScreenPageData(response);
  }

  /**
   * 创建新屏幕
   * @param dto 创建屏幕数据
   * @returns 创建的屏幕详情
   */
  async createScreen(dto: CreateScreenDto): Promise<ScreenPage> {
    const response = await this.httpClient.post<ScreenPage>('/api/screens', dto);

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return normalizeScreenPageData(response);
  }

  /**
   * 更新屏幕
   * @param id 屏幕ID
   * @param dto 更新数据
   * @returns 更新后的屏幕详情
   */
  async updateScreen(id: string, dto: UpdateScreenDto): Promise<ScreenPage> {
    const response = await this.httpClient.put<ScreenPage>(`/api/screens/${id}`, dto);

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return normalizeScreenPageData(response);
  }

  /**
   * 删除屏幕
   * @param id 屏幕ID
   */
  async deleteScreen(id: string): Promise<void> {
    await this.httpClient.delete<void>(`/api/screens/${id}`);
  }

  /**
   * 复制屏幕
   * @param id 屏幕ID
   * @returns 复制后的屏幕详情
   */
  async copyScreen(id: string): Promise<ScreenPage> {
    const response = await this.httpClient.post<ScreenPage>(`/api/screens/${id}/copy`, {});

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return normalizeScreenPageData(response);
  }

  /**
   * 发布屏幕
   * @param id 屏幕ID
   * @returns 发布后的屏幕详情
   */
  async publishScreen(id: string): Promise<ScreenPage> {
    const response = await this.httpClient.post<ScreenPage>(`/api/screens/${id}/publish`, {});

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return normalizeScreenPageData(response);
  }

  /**
   * 将屏幕状态改为草稿
   * @param id 屏幕ID
   * @returns 草稿状态的屏幕详情
   */
  async draftScreen(id: string): Promise<ScreenPage> {
    const response = await this.httpClient.post<ScreenPage>(`/api/screens/${id}/draft`, {});

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return normalizeScreenPageData(response);
  }

  /**
   * 设置默认屏幕
   * @param id 屏幕ID
   * @returns 设置为默认后的屏幕详情
   */
  async setDefaultScreen(id: string): Promise<ScreenPage> {
    const response = await this.httpClient.put<ScreenPage>(`/api/screens/default/${id}`, {});

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return normalizeScreenPageData(response);
  }

  /**
   * 获取默认屏幕
   * @returns 默认屏幕详情
   */
  async getDefaultScreen(): Promise<ScreenPage> {
    const response = await this.httpClient.get<ScreenPage>('/api/screens/default');

    if (!response) {
      throw new Error('API返回数据为空');
    }

    return normalizeScreenPageData(response);
  }

  // 以下为兼容 RxJS Observable 的方法，用于 Angular 项目
  private createObservable<T>(promise: Promise<T>): Observable<T> {
    return new Observable<T>(subscriber => {
      promise
        .then(result => {
          subscriber.next(result);
          subscriber.complete();
        })
        .catch(error => {
          subscriber.error(error);
        });
    });
  }

  /**
   * 获取屏幕列表 (Observable 版本)
   * @param page 页码，默认 1
   * @param limit 每页数量，默认 20
   * @returns 屏幕列表响应 Observable
   */
  getScreens$ = (page = 1, limit = 20): Observable<ScreenListResponse> => {
    return this.createObservable(this.getScreens(page, limit));
  };

  /**
   * 获取已发布的屏幕列表 (Observable 版本)
   * @param page 页码，默认 1
   * @param limit 每页数量，默认 20
   * @returns 已发布的屏幕列表响应 Observable
   */
  getPublishedScreens$ = (page = 1, limit = 20): Observable<ScreenListResponse> => {
    return this.createObservable(this.getPublishedScreens(page, limit));
  };

  /**
   * 根据ID获取屏幕详情 (Observable 版本)
   * @param id 屏幕ID
   * @returns 屏幕详情 Observable
   */
  getScreen$ = (id: string): Observable<ScreenPage> => {
    return this.createObservable(this.getScreen(id));
  };

  /**
   * 创建新屏幕 (Observable 版本)
   * @param dto 创建屏幕数据
   * @returns 创建的屏幕详情 Observable
   */
  createScreen$ = (dto: CreateScreenDto): Observable<ScreenPage> => {
    return this.createObservable(this.createScreen(dto));
  };

  /**
   * 更新屏幕 (Observable 版本)
   * @param id 屏幕ID
   * @param dto 更新数据
   * @returns 更新后的屏幕详情 Observable
   */
  updateScreen$ = (id: string, dto: UpdateScreenDto): Observable<ScreenPage> => {
    return this.createObservable(this.updateScreen(id, dto));
  };

  /**
   * 删除屏幕 (Observable 版本)
   * @param id 屏幕ID
   * @returns 删除操作 Observable
   */
  deleteScreen$ = (id: string): Observable<void> => {
    return this.createObservable(this.deleteScreen(id));
  };

  /**
   * 复制屏幕 (Observable 版本)
   * @param id 屏幕ID
   * @returns 复制后的屏幕详情 Observable
   */
  copyScreen$ = (id: string): Observable<ScreenPage> => {
    return this.createObservable(this.copyScreen(id));
  };

  /**
   * 发布屏幕 (Observable 版本)
   * @param id 屏幕ID
   * @returns 发布后的屏幕详情 Observable
   */
  publishScreen$ = (id: string): Observable<ScreenPage> => {
    return this.createObservable(this.publishScreen(id));
  };

  /**
   * 将屏幕状态改为草稿 (Observable 版本)
   * @param id 屏幕ID
   * @returns 草稿状态的屏幕详情 Observable
   */
  draftScreen$ = (id: string): Observable<ScreenPage> => {
    return this.createObservable(this.draftScreen(id));
  };

  /**
   * 设置默认屏幕 (Observable 版本)
   * @param id 屏幕ID
   * @returns 设置为默认后的屏幕详情 Observable
   */
  setDefaultScreen$ = (id: string): Observable<ScreenPage> => {
    return this.createObservable(this.setDefaultScreen(id));
  };

  /**
   * 获取默认屏幕 (Observable 版本)
   * @returns 默认屏幕详情 Observable
   */
  getDefaultScreen$ = (): Observable<ScreenPage> => {
    return this.createObservable(this.getDefaultScreen());
  };
}