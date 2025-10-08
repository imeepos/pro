import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getApiUrl } from '@pro/config';

export interface LayoutConfig {
  cols: number;
  rows: number;
}

// 兼容旧格式的 LayoutConfig 接口
interface LegacyLayoutConfig {
  width?: number;
  height?: number;
  background?: string;
  grid?: {
    size?: number;
    enabled?: boolean;
  };
}

// 标准化布局数据
function normalizeLayoutData(layout: LayoutConfig | LegacyLayoutConfig): LayoutConfig {
  // 如果已经是新格式，直接返回
  if ('cols' in layout && 'rows' in layout) {
    return layout as LayoutConfig;
  }

  // 处理旧格式数据
  const legacyLayout = layout as LegacyLayoutConfig;

  // 默认值
  const defaultCols = 24;
  const defaultRows = 12;

  // 如果有 width 和 height，按比例转换为 cols 和 rows
  // 1920x1080 是常见的 16:9 比例，对应 24:12 的栅格
  if (legacyLayout.width && legacyLayout.height) {
    const aspectRatio = legacyLayout.width / legacyLayout.height;
    const targetCols = Math.round(defaultCols);
    const targetRows = Math.round(targetCols / aspectRatio);

    return {
      cols: targetCols,
      rows: Math.max(6, Math.min(48, targetRows)) // 限制在 6-48 范围内
    };
  }

  // 如果没有完整的尺寸信息，返回默认值
  return {
    cols: defaultCols,
    rows: defaultRows
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

export interface ScreenListResponse {
  items: ScreenPage[];
  total: number;
  page: number;
  limit: number;
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
    return this.http.get<ScreenListResponse>(`${this.baseUrl}`, {
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      // 标准化返回的数据
      map(response => ({
        ...response,
        items: response.items.map(item => normalizeScreenPageData(item))
      }))
    );
  }

  getScreen(id: string): Observable<ScreenPage> {
    return this.http.get<ScreenPage>(`${this.baseUrl}/${id}`).pipe(
      // 标准化返回的数据
      map(screen => normalizeScreenPageData(screen))
    );
  }

  createScreen(dto: CreateScreenDto): Observable<ScreenPage> {
    return this.http.post<ScreenPage>(`${this.baseUrl}`, dto).pipe(
      // 标准化返回的数据
      map(screen => normalizeScreenPageData(screen))
    );
  }

  updateScreen(id: string, dto: UpdateScreenDto): Observable<ScreenPage> {
    return this.http.put<ScreenPage>(`${this.baseUrl}/${id}`, dto).pipe(
      // 标准化返回的数据
      map(screen => normalizeScreenPageData(screen))
    );
  }

  deleteScreen(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  copyScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ScreenPage>(`${this.baseUrl}/${id}/copy`, {}).pipe(
      // 标准化返回的数据
      map(screen => normalizeScreenPageData(screen))
    );
  }

  publishScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ScreenPage>(`${this.baseUrl}/${id}/publish`, {}).pipe(
      // 标准化返回的数据
      map(screen => normalizeScreenPageData(screen))
    );
  }

  draftScreen(id: string): Observable<ScreenPage> {
    return this.http.post<ScreenPage>(`${this.baseUrl}/${id}/draft`, {}).pipe(
      // 标准化返回的数据
      map(screen => normalizeScreenPageData(screen))
    );
  }

  setDefaultScreen(id: string): Observable<ScreenPage> {
    return this.http.put<ScreenPage>(`${this.baseUrl}/default/${id}`, {}).pipe(
      // 标准化返回的数据
      map(screen => normalizeScreenPageData(screen))
    );
  }

  getDefaultScreen(): Observable<ScreenPage> {
    return this.http.get<ScreenPage>(`${this.baseUrl}/default`).pipe(
      // 标准化返回的数据
      map(screen => normalizeScreenPageData(screen))
    );
  }
}
