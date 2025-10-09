import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getApiUrl } from '@pro/config';

export interface LayoutConfig {
  width: number;
  height: number;
  background?: string;
  grid?: {
    size?: number;
    enabled?: boolean;
  };
}

// 兼容旧格式的 LayoutConfig 接口
interface LegacyLayoutConfig {
  cols?: number;
  rows?: number;
}

// 标准化布局数据
function normalizeLayoutData(layout: LayoutConfig | LegacyLayoutConfig): LayoutConfig {
  // 如果已经是新格式（width/height），直接返回
  if ('width' in layout && 'height' in layout) {
    return layout as LayoutConfig;
  }

  // 处理旧格式数据（cols/rows）
  const legacyLayout = layout as LegacyLayoutConfig;

  // 默认值
  const defaultWidth = 1920;
  const defaultHeight = 1080;

  // 如果有栅格数据，转换为像素
  if (legacyLayout.cols && legacyLayout.rows) {
    const gridPixelSize = 50; // 每个栅格50px

    return {
      width: legacyLayout.cols * gridPixelSize,
      height: legacyLayout.rows * gridPixelSize
    };
  }

  // 如果没有完整的尺寸信息，返回默认值
  return {
    width: defaultWidth,
    height: defaultHeight
  };
}

// 标准化页面数据
function normalizeScreenPageData(screen: any): ScreenPage {
  return {
    ...screen,
    layout: normalizeLayoutData(screen.layout)
  };
}

export interface Component {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
  config: any;
  dataSource?: {
    type: 'api' | 'static';
    url?: string;
    data?: any;
    refreshInterval?: number;
  };
}

export interface ScreenPage {
  id: string;
  name: string;
  description?: string;
  layout: LayoutConfig;
  components: Component[];
  status: 'draft' | 'published';
  isDefault?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenDto {
  name: string;
  description?: string;
  layout: LayoutConfig;
  components?: Component[];
}

export interface UpdateScreenDto {
  name?: string;
  description?: string;
  layout?: LayoutConfig;
  components?: Component[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ScreenListResponse {
  items: ScreenPage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScreenApiService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = `${getApiUrl()}/screens`;
  }

  getScreens(page = 1, limit = 20): Observable<ScreenListResponse> {
    return this.http.get<ApiResponse<ScreenListResponse>>(`${this.baseUrl}`, {
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }

        return {
          ...response.data,
          items: response.data.items.map(item => normalizeScreenPageData(item))
        };
      })
    );
  }

  getScreen(id: string): Observable<ScreenPage> {
    return this.http.get<ApiResponse<ScreenPage>>(`${this.baseUrl}/${id}`).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }
        return normalizeScreenPageData(response.data);
      })
    );
  }

  createScreen(dto: CreateScreenDto): Observable<ScreenPage> {
    return this.http.post<ApiResponse<ScreenPage>>(`${this.baseUrl}`, dto).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }
        return normalizeScreenPageData(response.data);
      })
    );
  }

  updateScreen(id: string, dto: UpdateScreenDto): Observable<ScreenPage> {
    return this.http.put<ApiResponse<ScreenPage>>(`${this.baseUrl}/${id}`, dto).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }
        return normalizeScreenPageData(response.data);
      })
    );
  }

  deleteScreen(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  copyScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ApiResponse<ScreenPage>>(`${this.baseUrl}/${id}/copy`, {}).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }
        return normalizeScreenPageData(response.data);
      })
    );
  }

  publishScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ApiResponse<ScreenPage>>(`${this.baseUrl}/${id}/publish`, {}).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }
        return normalizeScreenPageData(response.data);
      })
    );
  }

  draftScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ApiResponse<ScreenPage>>(`${this.baseUrl}/${id}/draft`, {}).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }
        return normalizeScreenPageData(response.data);
      })
    );
  }

  setDefaultScreen(id: string): Observable<ScreenPage> {
    return this.http.put<ApiResponse<ScreenPage>>(`${this.baseUrl}/default/${id}`, {}).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }
        return normalizeScreenPageData(response.data);
      })
    );
  }

  getDefaultScreen(): Observable<ScreenPage> {
    return this.http.get<ApiResponse<ScreenPage>>(`${this.baseUrl}/default`).pipe(
      // 处理API响应格式并标准化数据
      map(response => {
        if (!response.success || !response.data) {
          throw new Error('API返回数据格式错误');
        }
        return normalizeScreenPageData(response.data);
      })
    );
  }
}
